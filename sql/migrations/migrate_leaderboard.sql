-- =============================================================
--  🏆 리더보드 집계 RPC — 서버 기록 기반(클라 세이브 숫자는 신뢰하지 않음)
--  ------------------------------------------------------------
--  ▶ 보드 5종 (주간은 KST 월요일 00:00 리셋, 나룻배는 일간·전원 동일 코스)
--     boat  🛶 오늘의 뱃길   : boat_runs 오늘 최고 점수
--     rich  🪙 주간 부자     : econ_logs 이번 주 코인 수입 합(+amount)
--     quest 🏆 주간 퀘스트   : econ_logs 이번 주 quest_reward 건수
--     mine  ⛏️ 주간 광부왕   : session_logs counts->'mine_ore' 이번 주 합
--     cook  🍳 주간 요리왕   : session_logs counts->'cooking_result' 이번 주 합
--  ▶ 닉네임은 game_saves.state->>'nickname' 조인(없으면 '이름 없는 여행자')
--  ▶ security definer + anon 실행 허용: RLS(자기 행만)를 우회하되
--     노출은 닉네임·점수·순위뿐 — uid 등 식별자는 반환하지 않는다.
--  ▶ pgbouncer(트랜잭션 풀링) 안전: temp table 미사용, 순수 쿼리 조립.
--  적용: Supabase SQL Editor 또는 pooler 접속으로 1회 실행.
-- =============================================================

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
    from (select user_id, max(score)::bigint as s from boat_runs
          where run_date = kst_today and user_id is not null and score is not null
          group by user_id) x;
  elsif p_board = 'rich' then
    select jsonb_agg(jsonb_build_object('u', user_id, 's', s)) into sc
    from (select user_id, sum(amount)::bigint as s from econ_logs
          where created_at >= wk_start and amount > 0 and user_id is not null
          group by user_id) x;
  elsif p_board = 'quest' then
    select jsonb_agg(jsonb_build_object('u', user_id, 's', s)) into sc
    from (select user_id, count(*)::bigint as s from econ_logs
          where created_at >= wk_start and source = 'quest_reward' and user_id is not null
          group by user_id) x;
  elsif p_board = 'mine' then
    select jsonb_agg(jsonb_build_object('u', user_id, 's', s)) into sc
    from (select user_id, sum(coalesce((counts->>'mine_ore')::int, 0))::bigint as s
          from session_logs
          where updated_at >= wk_start and user_id is not null
          group by user_id
          having sum(coalesce((counts->>'mine_ore')::int, 0)) > 0) x;
  elsif p_board = 'cook' then
    select jsonb_agg(jsonb_build_object('u', user_id, 's', s)) into sc
    from (select user_id, sum(coalesce((counts->>'cooking_result')::int, 0))::bigint as s
          from session_logs
          where updated_at >= wk_start and user_id is not null
          group by user_id
          having sum(coalesce((counts->>'cooking_result')::int, 0)) > 0) x;
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
           coalesce(nullif(gs.state->>'nickname', ''), '이름 없는 여행자') as nick
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

-- anon(게스트 포함 클라이언트/Worker)에서 실행 가능 — 반환값에 식별자 없음
revoke all on function public.leaderboard(text, uuid) from public;
grant execute on function public.leaderboard(text, uuid) to anon, authenticated;

-- 집계 성능 보조 인덱스(주간 범위 스캔)
create index if not exists idx_econ_logs_created_amount on public.econ_logs (created_at) where amount > 0;
create index if not exists idx_boat_runs_date_user on public.boat_runs (run_date, user_id);
