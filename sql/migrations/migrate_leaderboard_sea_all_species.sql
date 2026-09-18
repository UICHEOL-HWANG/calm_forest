-- =============================================================
--  calm forest · 🌊 '오늘의 대어' 보드를 전 어종으로 확대
--  ------------------------------------------------------------
--  사용법: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run (1회).
--  선행: sql/migrations/migrate_leaderboard.sql · sql/migrations/migrate_leaderboard_sanity.sql
--
--  ▶ 왜 필요한가 (2026-09-17 사고)
--    sea 분기가 `species = 'tuna'` 로 참치만 집계했다. 그런데 참치는
--    seaAction() 이 "가장 가까운 물고기"를 자동 조준하는 탓에 부두 한가운데서는
--    조준 확률이 0% 였다(실측 176 샘플). 결과: sea_records 52건 / 13일 동안
--    참치 0건 → 보드가 구조적으로 영구히 비어 있었다.
--    플레이어는 전갱이·방어·개복치를 낚아 정상 기록까지 남겼는데도 "집계가 안 된다"
--    는 경험을 했다. 기록은 멀쩡했고 집계 조건이 전부 버리고 있었다.
--
--  ▶ 무엇이 바뀌나
--    어종 필터를 걷어내고 "오늘 낚은 가장 무거운 물고기"로 센다.
--    낚기만 하면 매일 순위가 생긴다. 참치(최대 ≈113kg)가 여전히 최상위 티어라
--    '대어' 라는 이름과 노림수는 유지된다.
--
--  ▶ 상한은 그대로 300kg (3000 = kg×10)
--    정상 최대는 참치 ≈113kg · 개복치 ≈97kg → 약 3배 여유. 오탐 없이 조작만 막는다.
--
--  ▶ 함께 나간 변경
--    - js/sea-aim.js — 조준을 '가장 가까운' → '바라보는 방향' 으로(참치를 실제로 노릴 수 있게)
--    - 보드 문구 — '오늘 낚은 ⚔️참치 최고 무게…' → '오늘 낚은 가장 무거운 물고기 — 어종은 가리지 않아요'
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
    select jsonb_agg(jsonb_build_object('u', user_id, 's', s)) into sc
    from (select user_id, least(max(round(weight * 10)), 3000)::bigint as s from sea_records
          where run_date = kst_today
            and user_id is not null and weight is not null and weight > 0
          group by user_id) x;
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
    select (e->>'u')::uuid as user_id, (e->>'s')::bigint as score
    from jsonb_array_elements(sc) e
  ), ranked as (
    select s.user_id, s.score,
           rank() over (order by s.score desc) as rnk,
           left(coalesce(nullif(gs.state->>'nickname', ''), '이름 없는 여행자'), 16) as nick
    from s left join game_saves gs on gs.user_id = s.user_id
  )
  select jsonb_agg(jsonb_build_object('rank', rnk, 'nick', nick, 'score', score) order by rnk, nick)
    into rows_
  from (select * from ranked order by rnk, nick limit 50) t;

  -- 내 순위(전체 기준 — 50위 밖이어도 계산)
  if p_uid is not null then
    with s as (
      select (e->>'u')::uuid as user_id, (e->>'s')::bigint as score
      from jsonb_array_elements(sc) e
    ), ranked as (
      select s.user_id, s.score, rank() over (order by s.score desc) as rnk
      from s
    )
    select jsonb_build_object('rank', rnk, 'score', score) into me_
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

-- 검증 — 오늘 낚은 사람이 있으면 total > 0 이어야 한다
-- select public.leaderboard('sea');
