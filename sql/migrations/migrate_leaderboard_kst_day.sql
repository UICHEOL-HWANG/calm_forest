-- =============================================================
--  calm forest · 🕛 오늘의 대어·오늘의 뱃길 — '오늘'을 서버 시각(KST)으로 (2026-09-25)
--  ------------------------------------------------------------
--  사용법: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run (1회).
--  선행: sql/migrations/migrate_leaderboard_sea_species_icon.sql (운영 함수와 동일함을 2026-09-25 확인)
--
--  ▶ 무슨 사고였나 (2026-09-25 00:34 KST, 사용자 제보 "방금 방어 낚았는데 안 나온다")
--    클라가 run_date 를 new Date().toISOString().slice(0,10) — **UTC 날짜**로 보낸다.
--    보드는 kst_today 로 run_date 를 거른다 → KST 00:00~09:00 에 낚거나 달린 기록은 '어제' 로 저장돼
--    오늘 보드에서 빠진다. 지금까지 sea 2건 · boat 3건이 이렇게 샜다.
--
--  ▶ 무엇이 바뀌나
--    ① boat·sea 보드가 run_date 대신 created_at(서버가 찍는 시각)을 KST 하루 범위로 거른다
--       — 기기 시계·시간대가 틀려도 영향 없음. 나머지 보드(rich·quest·mine·cook)는 그대로
--    ② 이미 어긋난 run_date 를 created_at 의 KST 날짜로 바로잡는다(분석·BigQuery 용)
--    클라도 다음 배포부터 KST 날짜를 보낸다(js/kst-date.js).
-- =============================================================

create or replace function public.leaderboard(p_board text, p_uid uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  kst_now   timestamp := (now() at time zone 'Asia/Seoul');
  kst_today date      := (now() at time zone 'Asia/Seoul')::date;
  wk_start  timestamptz;
  day_start timestamptz := (now() at time zone 'Asia/Seoul')::date::timestamp at time zone 'Asia/Seoul';   -- 오늘 00:00 KST
  day_end   timestamptz := ((now() at time zone 'Asia/Seoul')::date + 1)::timestamp at time zone 'Asia/Seoul';
  sc        jsonb;   -- [{u:uuid, s:score}] 보드별 원시 점수
  rows_     jsonb;
  me_       jsonb;
begin
  wk_start := date_trunc('week', kst_now) at time zone 'Asia/Seoul';

  if p_board = 'boat' then
    select jsonb_agg(jsonb_build_object('u', user_id, 's', s)) into sc
    from (select user_id, least(max(score), 5000)::bigint as s from boat_runs
          where created_at >= day_start and created_at < day_end   -- 🕛 서버 시각(KST) 기준 — 기기가 보낸 run_date 는 UTC 라 새벽 기록이 어제로 샌다
            and user_id is not null and score is not null
          group by user_id) x;
  elsif p_board = 'sea' then
    -- 🌊 오늘의 대어 — 어종 무관, 오늘 낚은 최고 무게(kg)×10 정수. 상한 300kg
    --    🆕 그 무게를 낸 어종(sp)도 함께 — distinct on 으로 유저마다 가장 무거운 한 마리만 남긴다
    select jsonb_agg(jsonb_build_object('u', user_id, 's', s, 'sp', species)) into sc
    from (select distinct on (user_id) user_id, species, least(round(weight * 10), 3000)::bigint as s
          from sea_records
          where created_at >= day_start and created_at < day_end   -- 🕛 서버 시각(KST) 기준
            and user_id is not null and weight is not null and weight > 0
          order by user_id, weight desc) x;
  elsif p_board = 'rich' then
    select jsonb_agg(jsonb_build_object('u', user_id, 's', s)) into sc
    from (select user_id, least(sum(least(amount, 100000)), 10000000)::bigint as s from econ_logs
          where created_at >= wk_start and amount > 0 and user_id is not null
          group by user_id) x;
  elsif p_board = 'quest' then
    select jsonb_agg(jsonb_build_object('u', user_id, 's', s)) into sc
    from (select user_id, least(count(*), 1000)::bigint as s from econ_logs
          where created_at >= wk_start and source = 'quest_reward' and user_id is not null
          group by user_id) x;
  elsif p_board = 'mine' then
    select jsonb_agg(jsonb_build_object('u', user_id, 's', s)) into sc
    from (select user_id, least(sum(least(cf_num(counts, 'mine_ore'), 10000)), 100000)::bigint as s
          from session_logs
          where updated_at >= wk_start and user_id is not null
          group by user_id
          having sum(cf_num(counts, 'mine_ore')) > 0) x;
  elsif p_board = 'cook' then
    select jsonb_agg(jsonb_build_object('u', user_id, 's', s)) into sc
    from (select user_id, least(sum(least(cf_num(counts, 'cooking_result'), 10000)), 100000)::bigint as s
          from session_logs
          where updated_at >= wk_start and user_id is not null
          group by user_id
          having sum(cf_num(counts, 'cooking_result')) > 0) x;
  else
    return jsonb_build_object('error', 'unknown board');
  end if;

  sc := coalesce(sc, '[]'::jsonb);

  -- 랭킹 + 닉네임 조인(공동 순위는 rank()) — 상위 50명만 노출
  with s as (
    select (e->>'u')::uuid as user_id, (e->>'s')::bigint as score, e->>'sp' as sp
    from jsonb_array_elements(sc) e
  ), ranked as (
    select s.user_id, s.score, s.sp,
           rank() over (order by s.score desc) as rnk,
           left(coalesce(nullif(gs.state->>'nickname', ''), '이름 없는 여행자'), 16) as nick
    from s left join game_saves gs on gs.user_id = s.user_id
  )
  -- sp 는 바다 보드에서만 붙는다(다른 보드 응답은 이전과 글자 하나 다르지 않게)
  select jsonb_agg(jsonb_build_object('rank', rnk, 'nick', nick, 'score', score)
                   || case when sp is not null then jsonb_build_object('sp', sp) else '{}'::jsonb end
                   order by rnk, nick)
    into rows_
  from (select * from ranked order by rnk, nick limit 50) t;

  -- 내 순위(전체 기준 — 50위 밖이어도 계산)
  if p_uid is not null then
    with s as (
      select (e->>'u')::uuid as user_id, (e->>'s')::bigint as score, e->>'sp' as sp
      from jsonb_array_elements(sc) e
    ), ranked as (
      select s.user_id, s.score, s.sp, rank() over (order by s.score desc) as rnk
      from s
    )
    select jsonb_build_object('rank', rnk, 'score', score)
           || case when sp is not null then jsonb_build_object('sp', sp) else '{}'::jsonb end into me_
    from ranked where user_id = p_uid;
  end if;

  return jsonb_build_object(
    'board', p_board,
    'week',  to_char(kst_now, 'IYYY-"W"IW'),
    'date',  to_char(kst_today, 'YYYY-MM-DD'),
    'top',   coalesce(rows_, '[]'::jsonb),
    'me',    me_,
    'total', (select count(*) from jsonb_array_elements(sc))
  );
end $function$;

-- ② 어긋난 날짜 바로잡기(몇 건인지 먼저 본다 — 2026-09-25 기준 sea 2 · boat 3)
update public.sea_records set run_date = (created_at at time zone 'Asia/Seoul')::date
 where run_date <> (created_at at time zone 'Asia/Seoul')::date;
update public.boat_runs set run_date = (created_at at time zone 'Asia/Seoul')::date
 where run_date <> (created_at at time zone 'Asia/Seoul')::date;

-- 검증
-- select public.leaderboard('sea');   -- 방금(KST 오늘) 낚은 기록이 보여야 한다
-- select count(*) from sea_records where run_date <> (created_at at time zone 'Asia/Seoul')::date;   -- 0
