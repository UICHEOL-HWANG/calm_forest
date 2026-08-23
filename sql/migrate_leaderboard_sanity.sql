-- =============================================================
--  calm forest · 🏆 리더보드 방어 강화 (점수 상한 · 닉네임 길이 · 안전 캐스팅)
--  ------------------------------------------------------------
--  사용법: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run (1회).
--  선행: sql/migrate_leaderboard.sql
--
--  ▶ 왜 필요한가
--    점수 출처(boat_runs · econ_logs · session_logs)는 전부 클라이언트가 쓰는 테이블이다.
--    RLS 는 "본인 행만 쓴다" 만 보장할 뿐 값이 정직한지는 보지 않는다.
--    개조 클라이언트가 아무 숫자나 올릴 수 있고, counts 에 숫자가 아닌 값을 넣으면
--    ::int 캐스팅이 에러 나 리더보드 전체가 죽는다(가용성 문제).
--
--  ▶ 왜 check 제약이 아니라 집계에서 막는가
--    insert 를 막으면 정상 유저의 기록까지 거부돼 데이터가 유실된다.
--    기록은 그대로 남기고 "순위 계산에서만" 상한을 씌운다.
--
--  ⚠️ 이건 속도 방지턱이지 완전한 해결이 아니다. 값을 서버에서 검증하거나
--     파생시키지 않는 한 클라이언트 신뢰 구조 자체는 그대로다.
--     상한은 정상 플레이 최대치의 약 3배 이상으로 잡아 오탐을 피했다
--     (예: 나룻배는 코스 620 + 별·희귀 + 완주 200 → 정상 최대 ≈ 1,600 · 상한 5,000).
-- =============================================================

-- jsonb 값에서 숫자만 안전하게 꺼낸다 — 숫자가 아니면 0.
--   numeric 으로 받는 이유: 1e100 같은 값이 와도 int 오버플로로 터지지 않게.
create or replace function public.cf_num(j jsonb, k text)
returns numeric
language sql
immutable
as $fn$
  select case when jsonb_typeof(j -> k) = 'number'
              then greatest((j ->> k)::numeric, 0)
              else 0 end;
$fn$;

create or replace function public.leaderboard(p_board text, p_uid uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  kst_now   timestamp := (now() at time zone 'Asia/Seoul');
  kst_today date      := (now() at time zone 'Asia/Seoul')::date;
  wk_start  timestamptz;
  sc        jsonb;   -- [{u:uuid, s:score}] 보드별 원시 점수
  rows_     jsonb;
  me_       jsonb;
begin
  -- 이번 주 월요일 00:00 KST → UTC 경계
  wk_start := date_trunc('week', kst_now) at time zone 'Asia/Seoul';

  if p_board = 'boat' then
    select jsonb_agg(jsonb_build_object('u', user_id, 's', s)) into sc
    from (select user_id, least(max(score), 5000)::bigint as s from boat_runs
          where run_date = kst_today and user_id is not null and score is not null
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
end $$;

revoke all on function public.leaderboard(text, uuid) from public;
grant execute on function public.leaderboard(text, uuid) to anon, authenticated;
revoke all on function public.cf_num(jsonb, text) from public;
grant execute on function public.cf_num(jsonb, text) to anon, authenticated;
