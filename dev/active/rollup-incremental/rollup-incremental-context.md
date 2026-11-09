# rollup-incremental — 컨텍스트

Last Updated: 2026-11-09

## 핵심 파일
- `sql/migrations/migrate_admin_rollup.sql` — 기존 cf_rollup·집계표 정의
- `sql/migrations/migrate_rollup_cron.sql` — cf_rollup_recent(11/9 오늘만으로 축소, 운영 적용됨)
- `sql/migrations/migrate_rollup_incremental.sql` — 신규(중간표·공통 함수·cf_rollup 교체·cf_rollup_incremental)
- `ml/scripts/export_to_bq.py` `rollup_before_prune()` — 03:00 KST `cf_rollup(today-5, today)` RPC, 실패 시 prune 중단
- 소비처: `dashboards/js/admin-*.js` → cf_admin_* RPC → cf_* 표(형태 유지하면 수정 불필요)

## 사실
- game_logs.created_at = 서버 now() 기본값(클라 미전송). 200행 묶음이 같은 created_at 공유 → 순서는 (created_at, id). id 는 identity ALWAYS.
- session_id null 행 0건. session_logs.session_id not null.
- 원본 보관 7일, floor = 원본 최초일+1(KST).
- 세션 최장 74h, 최근 30일 3h 초과 53개.
- service_role statement_timeout 120s(migrate_service_role_timeout.sql).

## 결정
- 계산 로직 단일화: 야간 전체도 세션 목록 기반 공통 함수 사용.
- 세션 안 정렬은 (created_at, id) 로 통일(기존 heat 구간 계산은 created_at 만 → 동시각 묶음 순서 비결정적이었음).
- 검증·적용은 pg8000 풀러 직접(memory sql-run-direct-pooler).
