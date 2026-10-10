# 관리자 대시보드 v2 — 컨텍스트

**Last Updated** 2026-10-10 14:20 KST

- 워크트리 `.claude/worktrees/admin-dashboard-v2` · 브랜치 `feat/admin-dashboard-v2` (main 37e7fcc 에서 분기) · `.env` 는 루트 심링크
- 핵심 파일: `dashboards/admin_analytics.html`, `dashboards/_dash.css`(토큰 유일 소스, s1~s5 검증값 수정 금지),
  `sql/analytics/admin_analytics.sql`(기존 RPC), `ml/scripts/export_to_bq.py`(prune), `.github/workflows/supabase-to-bq.yml`(03:00 KST)
- 맵 원점(`js/data/places.js`): 마을 (0,0) · 꿈의 숲 DREAM (0,-550) · 거울 마을 MIRROR (0,-700) r 22
- 원본 보존: Supabase 3종 = 최근 7일 · BQ `calm-forest.calm_forest_raw.{game_logs,session_logs,econ_logs}` = 7/27~ (session_logs 는 8/6~, counts 는 STRING JSON, 세션당 여러 행 → updated_at 최신)
- 페르소나: auth.users email `persona-%` 170명 (2026-10-10)
- DB 쓰기는 pg8000 풀러로 직접(메모리 sql-run-direct-pooler). MCP execute_sql 은 읽기 전용
- 캐릭터 PNG: 게임 `buildAnimalMesh(id).group` 을 정사영·투명으로 렌더(512 → 240px). `?weather=clear` dev 세션이라 로그 없음

## 결정
- 기간 7·30·60일 (90 제거)
- 유저 단위 = 기기(client_id, 없으면 user_id) — 기존 대시보드와 같음. 북극성 공식값(사람 키 통합)과는 다를 수 있음 → 화면에 "기기 기준" 명시
- 첫 주 퍼널 코호트 = 첫 접속이 [기간 시작−7, 오늘−7] 인 신규 (7일 관측 완료분만)
- 리텐션 곡선 분할 = 첫날(D0) 획득 여부 — 첫 주 기준이면 "D3 에 획득 = D3 에 접속" 이라 곡선이 부풀려짐(look-ahead)
- 재활성 = 전날 미접속이었다가 다시 온 기존 유저 / 이탈 = 전날 접속, 오늘 미접속
