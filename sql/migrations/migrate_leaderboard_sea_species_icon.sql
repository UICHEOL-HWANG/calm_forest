-- =============================================================
--  calm forest · 🌊 오늘의 대어 — 순위 행에 어종을 함께 (2026-09-24)
--  ------------------------------------------------------------
--  사용법: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run (1회).
--  선행: sql/migrations/migrate_leaderboard_sea_all_species.sql (운영 함수와 동일함을 2026-09-24 확인)
--
--  ▶ 왜
--    보드는 어종 무관 최고 무게라, 누가 무엇을 낚았는지가 안 보였다.
--    보드를 늘리지 않고(사용자 결정) 행마다 그 무게를 낸 어종을 붙인다 — "⚔️ 참치 96.2kg".
--
--  ▶ 무엇이 바뀌나
--    'sea' 보드의 top[] · me 에 sp(어종 id: aji·buri·mola·tuna)가 붙는다. 순위 기준은 그대로.
--    다른 보드(boat·rich·quest·mine·cook)의 응답은 이전과 똑같다(sp 가 null 이면 키를 안 붙인다).
--    클라이언트는 sp 가 없어도 예전처럼 그린다 — SQL 실행 전후 어느 쪽이 먼저 나가도 안전하다.
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
  sc        jsonb;   -- [{u:uuid, s:score}] 보드별 원시 점수
  rows_     jsonb;
  me_       jsonb;
begin
  wk_start := date_trunc('week', kst_now) at time zone 'Asia/Seoul';

  if p_board = 'boat' then
    select jsonb_agg(jsonb_build_object('u', user_id, 's', s)) into sc
    from (select user_id, least(max(score), 5000)::bigint as s from boat_runs
          where run_date = kst_today and user_id is not null and score is not null
          group by user_id) x;
  elsif p_board = 'sea' then
    -- 🌊 오늘의 대어 — 어종 무관, 오늘 낚은 최고 무게(kg)×10 정수. 상한 300kg
    --    🆕 그 무게를 낸 어종(sp)도 함께 — distinct on 으로 유저마다 가장 무거운 한 마리만 남긴다
    select jsonb_agg(jsonb_build_object('u', user_id, 's', s, 'sp', species)) into sc
    from (select distinct on (user_id) user_id, species, least(round(weight * 10), 3000)::bigint as s
          from sea_records
          where run_date = kst_today
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

-- 검증
-- select public.leaderboard('sea');    -- top[].sp 가 보여야 한다(오늘 기록이 있으면)
-- select public.leaderboard('rich');   -- sp 키가 없어야 한다
