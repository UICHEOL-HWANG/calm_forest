-- =============================================================
--  calm forest · 🌊 바다터 대어 기록 (sea_records) + 리더보드 'sea' 보드
--  ------------------------------------------------------------
--  사용법: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run (1회).
--  멱등(if not exists / or replace)이라 여러 번 실행해도 안전합니다.
--  선행: sql/migrate_leaderboard.sql + migrate_leaderboard_sanity.sql
--
--  ▶ 어획 1회 = 1행. 참치(species='tuna')의 무게가 "오늘의 대어" 보드의 원천.
--    참치 급수는 클라이언트가 날짜 시드로 정하므로(전원 동일) 무게 차이는
--    "당기세요!!" 타이밍 정확도 = 실력 차이만 남습니다.
--  ▶ 다른 어종도 함께 기록 — 어종별 도전/성공률·난이도 튜닝 분석용.
--  ▶ 방어: 리더보드 집계에서 무게 상한 300kg(정상 최대 ≈ 121kg 의 2.5배).
--    기록 자체는 막지 않고 순위 계산에서만 상한(sanity 마이그레이션과 같은 원칙).
-- =============================================================

create table if not exists public.sea_records (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  session_id  text,
  client_id   text,                 -- 분석용 영구 기기 식별자
  is_guest    boolean,
  variant     text,                 -- A/B 변형

  run_date    date,                 -- 어획 날짜(YYYY-MM-DD, boat_runs 와 동일 규약)
  species     text,                 -- 'aji' | 'buri' | 'mola' | 'tuna'
  weight      real,                 -- 무게(kg, 소수 1자리)

  created_at  timestamptz not null default now()
);

create index if not exists idx_sea_records_user    on public.sea_records (user_id);
create index if not exists idx_sea_records_date    on public.sea_records (run_date);
create index if not exists idx_sea_records_species on public.sea_records (species);

alter table public.sea_records enable row level security;

drop policy if exists "own sea insert" on public.sea_records;
create policy "own sea insert" on public.sea_records
  for insert with check (auth.uid() = user_id);

drop policy if exists "own sea select" on public.sea_records;
create policy "own sea select" on public.sea_records
  for select using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
--  🏆 리더보드 RPC 에 'sea' 보드 추가 (migrate_leaderboard_sanity 전체 대체본)
--  score = 오늘 참치 최고 무게 × 10 (0.1kg 단위 정수 — 클라가 /10 해서 표시)
-- ─────────────────────────────────────────────────────────────
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
  wk_start := date_trunc('week', kst_now) at time zone 'Asia/Seoul';

  if p_board = 'boat' then
    select jsonb_agg(jsonb_build_object('u', user_id, 's', s)) into sc
    from (select user_id, least(max(score), 5000)::bigint as s from boat_runs
          where run_date = kst_today and user_id is not null and score is not null
          group by user_id) x;
  elsif p_board = 'sea' then
    -- 🌊 오늘의 대어 — 참치만, 무게(kg)×10 정수. 상한 300kg(정상 최대 ≈121kg)
    select jsonb_agg(jsonb_build_object('u', user_id, 's', s)) into sc
    from (select user_id, least(max(round(weight * 10)), 3000)::bigint as s from sea_records
          where run_date = kst_today and species = 'tuna'
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
end $$;

revoke all on function public.leaderboard(text, uuid) from public;
grant execute on function public.leaderboard(text, uuid) to anon, authenticated;
