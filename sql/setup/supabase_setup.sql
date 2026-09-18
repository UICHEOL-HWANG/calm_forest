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
  client_id  text,                          -- 분석용 영구 기기 식별자(게스트 재방문 추적)
  is_guest   boolean,                        -- 게스트(익명) 여부 — 세그먼트 분석용
  variant    text,                           -- A/B 변형(control/A/B)
  mouse_x    real, mouse_y  real,          -- 마우스 이동 좌표(px)
  char_x     real, char_y   real, char_z real, -- 캐릭터 월드 좌표
  cam_yaw    real, cam_pitch real,         -- 카메라 각도(rad)
  created_at timestamptz not null default now()
);

-- 분석 쿼리 가속용 인덱스
create index if not exists idx_game_logs_user    on public.game_logs (user_id);
create index if not exists idx_game_logs_session on public.game_logs (session_id);
create index if not exists idx_game_logs_created on public.game_logs (created_at);
create index if not exists idx_game_logs_client  on public.game_logs (client_id);
create index if not exists idx_game_logs_variant on public.game_logs (variant);

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
--
--    ⚠️ 뷰에는 반드시 `with (security_invoker = on)` 을 붙이세요.
--    Postgres 뷰는 기본이 "정의자(definer) 권한" 실행입니다. SQL Editor 에서
--    만들면 소유자가 postgres 가 되는데, 테이블 소유자는 자기 RLS 를 우회하므로
--    (FORCE ROW LEVEL SECURITY 미설정 시) RLS 걸린 테이블을 감싼 뷰가 오히려
--    RLS 를 뚫는 통로가 됩니다. 게다가 Supabase 는 public 스키마 객체에
--    anon/authenticated SELECT 를 기본 부여하므로, 클라이언트에 박힌 공개 키만
--    있으면 전체 유저 데이터가 읽힙니다.
--    (2026-08-10 실제로 이 상태였음 — 익명 요청으로 178명분 세션이 조회됨)
--
--    security_invoker = on 이면 "조회자 권한"으로 실행되어 RLS 가 정상 적용됩니다.
--    → 로그인 유저는 본인 데이터만, service_role 은 전체를 봅니다.
-- ─────────────────────────────────────────────────────────────

-- (a) 세션 요약: 세션별 지속시간·샘플수·이동거리
create or replace view public.v_session_summary
with (security_invoker = on) as
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
create or replace view public.v_move_heatmap
with (security_invoker = on) as
select
  round(char_x / 2.0) * 2 as gx,
  round(char_z / 2.0) * 2 as gz,
  count(*)                as hits
from public.game_logs
group by gx, gz;

-- ★ 위 두 뷰는 security_invoker = on 덕분에 조회자 권한으로 실행되므로,
--   game_logs 의 RLS 가 그대로 적용되어 로그인한 유저 본인 데이터만 보입니다.
--   (security_invoker 없이 만들면 RLS 가 우회되니 절대 빼지 마세요 — 위 ⚠️ 참고)
--   전체 집계가 필요하면 service_role 이나 Supabase Edge Function 으로 처리하세요.
--
--   이미 만들어진 뷰에 적용하려면:
--     alter view public.v_session_summary set (security_invoker = on);
--     alter view public.v_move_heatmap   set (security_invoker = on);
--   확인:
--     select relname, reloptions from pg_class c
--     join pg_namespace n on n.oid = c.relnamespace
--     where n.nspname = 'public' and c.relkind = 'v';

-- ─────────────────────────────────────────────────────────────
-- 5) 계측 테이블 (경제 원장 econ_logs + 세션 요약 session_logs)
--    ★ 이 파일 실행 후 sql/migrate_metrics_tables.sql 도 이어서 실행하세요.
--      (테이블 정의·RLS·인덱스·뷰가 그 파일에 있음 — 멱등이라 재실행 안전)
-- ─────────────────────────────────────────────────────────────
