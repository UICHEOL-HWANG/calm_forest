# 대시보드 개편 3차 — 컨텍스트

**Last Updated: 2026-11-20 22:05**

## 위치
- 워크트리 `.claude/worktrees/dash-redesign` · 브랜치 `feat/dashboard-redesign` (main bb82945b 분기)
- 미리보기: 루트 `.claude/launch.json` 의 `dash-redesign` (포트 8931)
- 시안: `dev/active/dashboard-redesign/mockup/` (`index.html?v=a|b|c&p=exp|au`). `fixture.js` 는 운영 실제 지표라 커밋 금지

## 확정된 방향 (2026-11-20 사용자)
- 일반 창 = A안(위쪽 가로 메뉴·큰 글자·카드). 애널리틱스 기존 섹션은 전부 남긴다
- 실험 창 = 위 타임라인(C) + 카드 목록(B) + 카드 클릭 시 C안 리포트 화면으로 전환
- 활성 유저 창 = A안(지표 카드 4 + 세 칸 차트 + 플랫폼별 표 + 일별 표)

## 핵심 파일
- 공통: `dashboards/_admin.css`, `dashboards/js/admin-nav.js`(신규, 메뉴와 메뉴 스타일을 스스로 주입), `dashboards/js/admin-common.js`
- 활성 유저: `dashboards/active.html`, `dashboards/js/admin-active.js`, `sql/analytics/admin_active.sql` (RPC `cf_admin_active`)
- 실험: `dashboards/experiments.html`, `dashboards/js/admin-experiments.js`
- 계산: `dashboards/js/admin-metrics.js` (`activeKpis`·`activeDailyRows`·`experimentSpan` 추가)
- 테스트: `tests/admin-active.test.mjs`, `tests/admin-experiments.test.mjs`, `tests/admin-metrics.test.mjs`

## 결정·근거
- `_dash.css`·`analytics.html` 은 토스 번들에 실리는 플레이어 화면(`scripts/build-ait.mjs:32-34`)이라 손대지 않는다. 관리자 전용 스타일은 `_admin.css`
- 메뉴는 `position: fixed` + `--nav-h` 변수. 소식함·베타 관제는 `_admin.css` 를 안 쓰고 인라인 스타일이 많아, 메뉴 스타일을 `admin-nav.js` 가 직접 넣어야 충돌이 없다
- 차트는 기존 패턴(Chart.js)을 따른다. 타임라인·구간 그림은 실험 창의 기존 방식(손으로 그린 SVG)
- WAU·MAU 는 그날까지 7일·30일 굴림 창. 오늘은 진행 중이라 화면 지표는 어제까지만
- 판정 로직 `analyzeExperiment` 는 그대로

## 의존성
- 운영 DB: `cf_sessions` 읽기, `cf_is_admin()`, `cf_share_links`. SQL 은 pg8000 풀러로 직접 실행
- 관리자 화면 로컬 확인: 가짜 세션 + RPC 응답 픽스처로 fetch 대역

## 구현하며 바뀐 점 (계획 대비)
- `cf_admin_active(token)` 는 기간 인자 없이 150일을 한 번에 돌려준다. 30·60·90일 전환은 화면에서 자르기만 해 다시 부르지 않는다
- 실험 창은 `location.hash` 가 유일한 상태. 카드·타임라인 줄·목록이 전부 `<a href="#id">`, "전체 보기"는 `#`
- 실험 상세의 줄별 포리스트 그림은 큰 차이 값 + 구간 그림 + 보조 지표 표로 대체. 전체 포리스트는 위 카드의 "효과" 보기로 남김
- 메뉴 높이는 `--nav-h` 변수. 고정되는 것(`.loader`·`.toc`·`.fl`)은 이 값을 기준으로 내려 둔다
