-- =============================================================
--  calm forest · 합성(시뮬레이션) 데이터 테이블
--  ------------------------------------------------------------
--  용도: 이탈/퍼널/리텐션 분석 코드와 ML 파이프라인을 "개발·실험"하기 위한
--        샌드박스 데이터셋. 실제 유저 데이터와 물리적으로 분리합니다.
--
--  ★ 왜 실제 테이블에 섞지 않는가
--    1) 실제 DAU·리텐션이 오염되면 "어디서 유저가 이탈하는지"를 못 봅니다.
--    2) game_saves 는 auth.users FK 가 걸린 PK 라, 실제 테이블에 넣으려면
--       가짜 인증 계정을 만들어야 합니다(진짜 유저 목록 오염).
--    3) 파라미터를 바꿔 몇 번이든 통째로 지우고 다시 만들 수 있어야 합니다.
--
--  ⚠️ 이 데이터는 GA4 로 전송하지 말고, 트래픽 실적으로 제시하지 마세요.
--     (앱인토스 심사·IAA 광고 지표에 섞이면 부정 트래픽이 됩니다)
--
--  실행: Supabase SQL Editor 에 붙여넣고 Run (한 번).
--  생성: scripts/seed_synthetic.py  ·  분석: sql/synthetic_analysis.sql
-- =============================================================

-- ── 센서/행동 로그(실제 game_logs 와 동일 컬럼, FK 없음) ──
create table if not exists public.syn_game_logs (
  id         bigint generated always as identity primary key,
  user_id    uuid,                 -- 합성 데이터는 항상 null (auth.users 를 건드리지 않음)
  session_id text,
  client_id  text,                 -- 기기 단위 식별자 = 합성 유저의 정체성
  is_guest   boolean,
  variant    text,
  mouse_x    real, mouse_y  real,
  char_x     real, char_y   real, char_z real,
  cam_yaw    real, cam_pitch real,
  created_at timestamptz not null default now()
);
create index if not exists idx_syn_logs_client  on public.syn_game_logs (client_id);
create index if not exists idx_syn_logs_session on public.syn_game_logs (session_id);
create index if not exists idx_syn_logs_created on public.syn_game_logs (created_at);

-- ── 세션 요약(실제 session_logs 와 동일 컬럼) ──
create table if not exists public.syn_session_logs (
  session_id text primary key,
  user_id    uuid,
  client_id  text,
  is_guest   boolean,
  variant    text,
  play_sec   integer,
  counts     jsonb,                -- 이벤트별 발생 횟수 {"chop_tree":5,...}
  coins      integer,
  last_place text,
  last_x     real, last_z real,
  started_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists idx_syn_sess_client  on public.syn_session_logs (client_id);
create index if not exists idx_syn_sess_started on public.syn_session_logs (started_at);

-- ── 경제 원장(실제 econ_logs 와 동일 컬럼) ──
create table if not exists public.syn_econ_logs (
  id         bigint generated always as identity primary key,
  user_id    uuid,
  session_id text,
  client_id  text,
  is_guest   boolean,
  variant    text,
  source     text not null,
  item       text,
  currency   text not null default 'coins',
  amount     integer not null,
  balance    integer,
  created_at timestamptz not null default now()
);
create index if not exists idx_syn_econ_client  on public.syn_econ_logs (client_id);
create index if not exists idx_syn_econ_created on public.syn_econ_logs (created_at);
create index if not exists idx_syn_econ_source  on public.syn_econ_logs (source);

-- ── 진행도 스냅샷(실제 game_saves 와 같은 state jsonb, 키만 client_id) ──
create table if not exists public.syn_game_saves (
  client_id  text primary key,     -- FK 없음 — 가짜 auth 계정을 만들지 않기 위해
  state      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ── RLS: 정책을 두지 않아 anon/authenticated 는 읽을 수 없음 ──
--    (service_role · SQL Editor 만 접근. 예전 분석 뷰가 RLS 를 우회해
--     전체 유저 데이터가 공개됐던 사고를 반복하지 않기 위한 기본 차단)
alter table public.syn_game_logs    enable row level security;
alter table public.syn_session_logs enable row level security;
alter table public.syn_econ_logs    enable row level security;
alter table public.syn_game_saves   enable row level security;

-- ── 전체 초기화(파라미터 바꿔 재생성할 때) ──
-- truncate public.syn_game_logs, public.syn_session_logs, public.syn_econ_logs, public.syn_game_saves;
