-- =============================================================
--  calm forest · 🛶 나룻배 런 기록 테이블 (boat_runs)
--  ------------------------------------------------------------
--  사용법: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run (1회).
--  멱등(if not exists)이라 여러 번 실행해도 안전합니다.
--
--  ▶ 런(강 내려가기) 1회 = 1행. 좌표 로그(game_logs)만으론 "어디서 부딪혀
--    그만뒀는지"를 복원하기 어려워, 코스 시드·충돌 지점·수집물을 한 행에 남깁니다.
--  ▶ 코스는 "날짜 + 회차" 시드로 생성 — seed 가 같으면 완전히 같은 코스입니다.
--    즉 seed 로 묶으면 코스가 통제된 상태에서 유저 간 실력 비교가 가능합니다.
--    (난이도 튜닝·이탈 지점 분석·업그레이드 효과 검증의 전제)
-- =============================================================

create table if not exists public.boat_runs (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  session_id  text,
  client_id   text,                 -- 분석용 영구 기기 식별자(게스트 재방문 추적)
  is_guest    boolean,              -- 게스트(익명) 여부
  variant     text,                 -- A/B 변형(control/A/B)

  run_date    date,                 -- 플레이 날짜(YYYY-MM-DD)
  run_no      integer,              -- 그날 몇 번째 런인지 (1~3)
  seed        bigint,               -- 코스 시드 — 같은 값이면 같은 코스
  night       boolean,              -- 🌙 밤에 탔는지(밤 전용 수집물·등불 효과)
  weather     text,                 -- 그날 날씨(clear/rain/snow/fog)

  result      text,                 -- 'clear'(완주) | 'wreck'(램프 소진) | 'quit'(중도 이탈)
  dist_m      real,                 -- 내려간 거리(월드 단위) — 코스 전체는 620
  time_sec    real,                 -- 플레이 시간(초)
  score       integer,              -- 점수(거리 + 수집 + 완주 보너스)
  best        boolean,              -- 개인 최고 기록 갱신 여부
  hits        integer,              -- 충돌 횟수
  hit_points  jsonb,                -- 충돌 지점 [{"d":214,"kind":"rock","seg":2}]
  picks       jsonb,                -- 희귀 수집물 {"lotus":1,"shell":2}
  stars       integer,              -- 최종 지급된 ⭐별조각(보너스 포함)
  lamps_left  integer,              -- 남은 램프(0이면 난파)
  boost_used  integer,              -- 노 젓기(스퍼트) 사용 횟수
  upgrades    jsonb,                -- 런 시점의 배 강화 {"oar":1,"hull":0,"lamp":0}

  created_at  timestamptz not null default now()
);

create index if not exists idx_boat_runs_user    on public.boat_runs (user_id);
create index if not exists idx_boat_runs_date    on public.boat_runs (run_date);
create index if not exists idx_boat_runs_seed    on public.boat_runs (seed);
create index if not exists idx_boat_runs_result  on public.boat_runs (result);
create index if not exists idx_boat_runs_created on public.boat_runs (created_at);

alter table public.boat_runs enable row level security;

drop policy if exists "own boat insert" on public.boat_runs;
create policy "own boat insert" on public.boat_runs
  for insert with check (auth.uid() = user_id);

drop policy if exists "own boat select" on public.boat_runs;
create policy "own boat select" on public.boat_runs
  for select using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
--  분석 뷰 ① 코스 난이도 — "어디서 부딪히는가"
--    같은 seed(=같은 코스) 안에서 구간별 충돌 분포를 봅니다.
--    특정 지점(dist_bucket)에 충돌이 몰리면 그 자리 배치가 불공정하다는 뜻.
-- ─────────────────────────────────────────────────────────────
--    ⚠️ 뷰는 반드시 with (security_invoker = on) — 빼면 SECURITY DEFINER 로 RLS 가 우회됩니다(Supabase 보안 경고 2026-09-06).
--    이미 만든 뷰는: alter view public.boat_hit_points set (security_invoker = on);
create or replace view public.boat_hit_points
with (security_invoker = on) as
select
  r.run_date,
  r.seed,
  (h ->> 'kind')               as obstacle,
  (h ->> 'seg')::int           as seg,
  ((h ->> 'd')::int / 20) * 20 as dist_bucket,   -- 20단위 구간
  count(*)                     as hits,
  count(distinct r.user_id)    as users
from public.boat_runs r
cross join lateral jsonb_array_elements(coalesce(r.hit_points, '[]'::jsonb)) as h
group by 1, 2, 3, 4, 5;

-- ─────────────────────────────────────────────────────────────
--  분석 뷰 ② 일자별 런 요약 — 완주율·중도 이탈률·평균 도달 거리
--    "하루 3회"를 다 쓰는지(avg_run_no)가 리텐션 훅의 핵심 지표.
-- ─────────────────────────────────────────────────────────────
--    이미 만든 뷰는: alter view public.boat_daily set (security_invoker = on);
create or replace view public.boat_daily
with (security_invoker = on) as
select
  run_date,
  count(*)                                                               as runs,
  count(distinct user_id)                                                as users,
  avg(dist_m)                                                            as avg_dist,
  avg(time_sec)                                                          as avg_time,
  avg(hits)                                                              as avg_hits,
  count(*) filter (where result = 'clear')::numeric / nullif(count(*), 0) as clear_rate,
  count(*) filter (where result = 'quit')::numeric  / nullif(count(*), 0) as quit_rate,
  avg(run_no)                                                            as avg_run_no,
  sum(stars)                                                             as stars_granted
from public.boat_runs
group by 1
order by 1;
