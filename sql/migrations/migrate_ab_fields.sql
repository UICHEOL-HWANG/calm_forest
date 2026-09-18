-- =============================================================
--  calm forest · game_logs A/B·세그먼트 필드 마이그레이션
--  ------------------------------------------------------------
--  기존 DB에 client_id / is_guest / variant 컬럼을 추가하고,
--  가능한 범위에서 기존 데이터를 백필한다.
--  사용법: Supabase 대시보드 > SQL Editor 에 붙여넣고 Run (한 번만).
--
--  ★ 소급 가능 범위(정직하게):
--     - variant   → 기존 전 행을 'control'로 백필(실험 이전 데이터라 의미도 맞음)
--     - is_guest  → auth.users 에 아직 남아있는 유저만 판별 가능.
--                   (이미 정리된 익명 계정의 옛 로그는 NULL=unknown)
--     - client_id → 과거엔 수집 안 했으므로 백필 불가 → 과거 행은 NULL,
--                   오늘 배포 이후 로그부터 값이 채워짐.
-- =============================================================

-- 1) 컬럼 추가(이미 있으면 무시)
alter table public.game_logs add column if not exists client_id text;
alter table public.game_logs add column if not exists is_guest  boolean;
alter table public.game_logs add column if not exists variant   text;

-- 2) 백필: variant — 기존 전 행을 control 로
update public.game_logs
   set variant = 'control'
 where variant is null;

-- 3) 백필: is_guest — auth.users 에 남아있는 유저만 익명 여부로 채움
--    (조인 안 되는 옛 익명 계정 로그는 NULL 유지)
update public.game_logs g
   set is_guest = u.is_anonymous
  from auth.users u
 where g.user_id = u.id
   and g.is_guest is null;

-- 4) 인덱스(분석 가속) — 없으면 생성
create index if not exists idx_game_logs_client  on public.game_logs (client_id);
create index if not exists idx_game_logs_variant on public.game_logs (variant);

-- 확인용(선택): 백필 결과 요약
-- select variant, is_guest, count(*) from public.game_logs group by 1,2 order by 1,2;
