-- =============================================================
--  calm forest · BigQuery game_logs 백필 (A/B·세그먼트 필드)
--  ------------------------------------------------------------
--  실행 위치: BigQuery 콘솔 → SQL (아래 PROJECT.DATASET 확인 후 수정)
--  이 스크립트는 컬럼을 직접 추가하므로 파이프라인 실행을 기다릴 필요 없음.
--
--  ★ 소급 범위: BQ엔 auth.users가 없어 is_guest 는 못 채움(NULL 유지).
--     client_id 도 과거엔 없어 NULL. variant 만 기존 전 행을 control 로.
-- =============================================================

-- 0) 신규 컬럼 추가(없을 때만) — "Unrecognized name: variant" 방지
ALTER TABLE `calm-forest.calm_forest_raw.game_logs`
  ADD COLUMN IF NOT EXISTS client_id STRING,
  ADD COLUMN IF NOT EXISTS is_guest  BOOL,
  ADD COLUMN IF NOT EXISTS variant   STRING;

-- 1) 기존(실험 이전) 행의 variant 를 control 로 백필
UPDATE `calm-forest.calm_forest_raw.game_logs`
SET variant = 'control'
WHERE variant IS NULL;

-- (참고) 세그먼트 확인 쿼리
-- SELECT variant, is_guest, COUNT(*) AS rows
-- FROM `calm-forest.calm_forest_raw.game_logs`
-- GROUP BY variant, is_guest ORDER BY variant, is_guest;
