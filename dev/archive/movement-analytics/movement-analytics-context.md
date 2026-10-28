# Context — Last Updated: 2026-10-18 (B' 화면까지)

- 워크트리 `.claude/worktrees/admin-inline-login` (feat/admin-inline-login), main 에 fast-forward 푸시 + `npx wrangler deploy` 로 웹 배포(관리자 페이지만이라 웹 전용).
- 롤업: `sql/migrations/migrate_admin_rollup.sql` 의 `cf_rollup` — 맵 판정 CTE `lab`→`pl` 을 writable CTE 로 여러 표에 동시 insert (ins_heat, ins_hour). 원본 game_logs 7일 보존.
- RPC: `sql/analytics/admin_dashboard.sql` `cf_admin_dashboard` — 결과 jsonb 에 키 추가.
- 화면: `dashboards/admin_analytics.html`, `dashboards/js/admin-analytics.js`(렌더), `dashboards/js/admin-metrics.js`(순수 함수, tests/admin-metrics.test.mjs).
- DB 적용: scratchpad `pg.py file <sql>` (pg8000 풀러). 적용 전 운영 함수 정의가 main 과 같은지 비교.
- 2026-10-18 완료: cf_map_hour(시간×맵) main 81fe19cd.
- 새 코드에 주석 금지.
