-- =============================================================
--  calm forest · 🔭 천문대 별 잇기 판 기록 (star_runs)
--  ------------------------------------------------------------
--  사용법: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run (1회). 멱등.
--  ⚠️ 클라이언트(sendStarRun)보다 **먼저** 적용한다 — insert 가 고정 컬럼이라
--     테이블이 없거나 컬럼이 빠지면 그 판 행이 통째로 버려진다.
--
--  ▶ 판 1회 = 1행. 성공·실패·중도 포기(abandon) 모두 남긴다 — 포기도 난이도 학습의 표본이다.
--  ▶ GA4 star_start / star_result / minigame_abandon 과 run_id 로 1:1 조인된다.
--  ▶ DDA probe: arm(처치) · ease(실제 적용 배율) · dda(공변량) · probe_v. 별자리마다 노트 수가
--    달라 점수는 score/max_score 로 비교한다(constellation 은 공변량).
-- =============================================================

create table if not exists public.star_runs (
  id              bigint generated always as identity primary key,
  user_id         uuid references auth.users(id) on delete cascade,
  session_id      text,
  client_id       text,
  is_guest        boolean,
  variant         text,
  platform        text,
  run_date        date,                 -- KST

  run_id          uuid not null,        -- 렌즈를 연 판의 id (GA4 와 같은 값)
  constellation   text not null,        -- big_dipper | cassiopeia | pegasus | leo | orion | scorpius
  notes           smallint not null,    -- 이 별자리의 노트 수
  tempo           real,                 -- 별자리 이동 배율(작을수록 빠름)
  attempt_n       integer,              -- 이 별자리를 몇 번째 시작했나(1부터)
  unlocked_n      smallint,             -- 판 시작 시점에 열려 있던 별자리 수

  outcome         text not null,        -- success | fail | abandon
  abandon_reason  text,                 -- close | esc | hidden | replace | api (outcome=abandon 일 때)
  perfect         smallint,
  good            smallint,
  miss            smallint,
  early_taps      smallint,             -- 판정창보다 일찍 눌러 무시된 탭
  max_combo       smallint,
  score           smallint,
  max_score       smallint,             -- notes × 2
  judges          jsonb,                -- 노트 순서대로 ["perfect","good","miss",...] (포기면 진행한 데까지)
  offsets         jsonb,                -- 노트 순서대로 탭 오차 ms, 시간 초과 miss 는 null
  duration_ms     integer,

  coins           integer,              -- 실제 지급(하루 1회 + 첫 클리어 보너스)
  already_today   boolean,
  first_clear     boolean,              -- 이 판으로 이 별자리를 처음 깼나
  unlocked_next   text,                 -- 이 판으로 새로 열린 별자리 id

  ease            real,                 -- 🎚️ 적용된 난이도 배율(클수록 쉬움)
  arm             smallint,             -- probe 팔 번호
  dda             real,                 -- DDA 누적 배율(공변량)
  probe_v         smallint,

  created_at      timestamptz not null default now(),
  constraint star_runs_run_id_key unique (run_id),
  constraint star_runs_outcome_chk check (outcome in ('success', 'fail', 'abandon')),
  constraint star_runs_platform_chk check (platform is null or platform in ('web', 'toss', 'itch', 'android'))
);

create index if not exists idx_star_runs_user     on public.star_runs (user_id);
create index if not exists idx_star_runs_date     on public.star_runs (run_date);
create index if not exists idx_star_runs_const    on public.star_runs (constellation, outcome);
create index if not exists idx_star_runs_created  on public.star_runs (created_at);

alter table public.star_runs enable row level security;

drop policy if exists star_runs_select_own on public.star_runs;
create policy star_runs_select_own on public.star_runs
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists star_runs_insert_own on public.star_runs;
create policy star_runs_insert_own on public.star_runs
  for insert to authenticated with check ((select auth.uid()) = user_id);
