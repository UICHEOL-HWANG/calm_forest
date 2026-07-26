-- =============================================================
--  calm forest · Supabase 초기 설정 SQL
--  ------------------------------------------------------------
--  사용법:
--    Supabase 대시보드 > SQL Editor > New query 에 아래 전체를
--    붙여넣고 Run. (한 번만 실행하면 됩니다.)
--
--  ★ 추가로 대시보드에서 손으로 켜야 하는 것:
--    Authentication > Providers > "Anonymous sign-ins" 활성화
--    (익명 로그인을 쓰기 때문. Google 로그인 쓰려면 Google provider도)
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1) 게임 저장 테이블 (유저당 1행, jsonb 로 인벤토리/집/밭 통째 저장)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.game_saves (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  state      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 2) 센서/행동 로그 테이블 (분석용, append-only)
--    마우스 좌표 / 캐릭터 위치 / 카메라 각도를 배치로 저장
-- ─────────────────────────────────────────────────────────────
create table if not exists public.game_logs (
  id         bigint generated always as identity primary key,
  user_id    uuid references auth.users(id) on delete cascade,
  session_id text,
  mouse_x    real, mouse_y  real,          -- 마우스 이동 좌표(px)
  char_x     real, char_y   real, char_z real, -- 캐릭터 월드 좌표
  cam_yaw    real, cam_pitch real,         -- 카메라 각도(rad)
  created_at timestamptz not null default now()
);

-- 분석 쿼리 가속용 인덱스
create index if not exists idx_game_logs_user    on public.game_logs (user_id);
create index if not exists idx_game_logs_session on public.game_logs (session_id);
create index if not exists idx_game_logs_created on public.game_logs (created_at);

-- ─────────────────────────────────────────────────────────────
-- 3) RLS(행 수준 보안): 각 유저는 "자기 데이터"만 읽고 쓸 수 있음
-- ─────────────────────────────────────────────────────────────
alter table public.game_saves enable row level security;
alter table public.game_logs  enable row level security;

-- game_saves: 본인 행만 select/insert/update
drop policy if exists "own save select" on public.game_saves;
create policy "own save select" on public.game_saves
  for select using (auth.uid() = user_id);

drop policy if exists "own save upsert" on public.game_saves;
create policy "own save upsert" on public.game_saves
  for insert with check (auth.uid() = user_id);

drop policy if exists "own save update" on public.game_saves;
create policy "own save update" on public.game_saves
  for update using (auth.uid() = user_id);

-- game_logs: 본인 로그만 insert/select
drop policy if exists "own logs insert" on public.game_logs;
create policy "own logs insert" on public.game_logs
  for insert with check (auth.uid() = user_id);

drop policy if exists "own logs select" on public.game_logs;
create policy "own logs select" on public.game_logs
  for select using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 3-b) 개발자 피드백 테이블 (플레이어가 불편사항/제안 제출)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.feedback (
  id         bigint generated always as identity primary key,
  user_id    uuid references auth.users(id) on delete set null,
  category   text,                     -- 버그 / 제안 / 기타
  message    text not null,
  meta       jsonb,                    -- url, 진행도 등 컨텍스트
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;

-- 로그인한 유저는 본인 이름으로 피드백 남길 수 있음(읽기는 막음 → 관리자는 SQL Editor로 조회)
drop policy if exists "own feedback insert" on public.feedback;
create policy "own feedback insert" on public.feedback
  for insert with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 4) 분석용 뷰(선택) — 대시보드/SQL에서 바로 쓰기 좋게 집계
-- ─────────────────────────────────────────────────────────────

-- (a) 세션 요약: 세션별 지속시간·샘플수·이동거리
create or replace view public.v_session_summary as
select
  session_id,
  user_id,
  min(created_at)                                   as started_at,
  max(created_at)                                   as ended_at,
  extract(epoch from (max(created_at)-min(created_at))) as duration_sec,
  count(*)                                          as samples
from public.game_logs
group by session_id, user_id;

-- (b) 이동 히트맵 격자: 2 단위 셀로 캐릭터 체류 빈도 집계
create or replace view public.v_move_heatmap as
select
  round(char_x / 2.0) * 2 as gx,
  round(char_z / 2.0) * 2 as gz,
  count(*)                as hits
from public.game_logs
group by gx, gz;

-- ★ 뷰도 RLS가 걸린 game_logs를 참조하므로, 대시보드에서
--   로그인한 유저 본인 데이터만 보입니다. (전체 집계가 필요하면
--   Supabase Edge Function이나 service_role 로 별도 처리하세요.)
