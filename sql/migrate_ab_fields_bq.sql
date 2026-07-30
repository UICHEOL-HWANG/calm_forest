-- =============================================================
--  calm forest · BigQuery game_logs 백필 (A/B·세그먼트 필드)
--  ------------------------------------------------------------
--  실행 시점: 파이프라인(export_to_bq.py)이 신규 스키마로 "한 번 이상"
--             돈 뒤에 실행. (그때 client_id/is_guest/variant 컬럼이
--             ALLOW_FIELD_ADDITION 로 BQ 테이블에 자동 생성됨)
--  실행 위치: BigQuery 콘솔 → SQL(아래 PROJECT/DATASET 치환).
--
--  ★ 소급 범위: BQ엔 auth.users가 없으므로 is_guest 는 못 채움(NULL 유지).
--     client_id 도 과거엔 없어 NULL. variant 만 기존 전 행을 control 로.
-- =============================================================

-- 기존(실험 이전) 행의 variant 를 control 로 백필
UPDATE `calm-forest.calm_forest.game_logs`   -- ← 프로젝트.데이터셋 확인 후 수정
SET variant = 'control'
WHERE variant IS NULL;

-- (참고) 세그먼트 확인 쿼리
-- SELECT variant, is_guest, COUNT(*) AS rows
-- FROM `calm-forest.calm_forest.game_logs`
-- GROUP BY variant, is_guest ORDER BY variant, is_guest;
