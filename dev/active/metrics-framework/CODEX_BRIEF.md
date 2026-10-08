# Codex 브리핑 — calm forest 지표 체계 (SQL 담당)

## 역할
Claude 가 지표 **정의**(`docs/analysis/METRICS_FRAMEWORK.md`)를 쓰고, Codex 는 그 정의를 **BigQuery SQL** 로 구현·검증한다.
정의서에 없는 지표는 만들지 않는다. 정의가 모호하면 SQL 을 추측해서 쓰지 말고 질문 목록으로 남긴다.

## 작업 공간
- worktree: `~/calm_forest-codex-metrics` · 브랜치 `analytics/codex`
- 내 폴더: `sql/analytics/metrics/` (지표 1개 = 파일 1개), `sql/analytics/metrics/checks/`
- 건드리지 않는 곳: `js/`, `docs/analysis/METRICS_FRAMEWORK.md`, main 브랜치
- 진행 상황은 `dev/active/metrics-framework/metrics-framework-tasks.md` 의 M5 항목에 체크

## 데이터
BigQuery 프로젝트 `calm-forest`, 리전 `asia-northeast3`.
- GA4: `analytics_547127440.events_*` (키 `user_pseudo_id`)
- 게임: `calm_forest_raw.{game_logs, econ_logs, session_logs, game_saves, session_platform, user_platform}`

## 반드시 지킬 함정 (docs/analysis/ANALYSIS_PROTOCOL.md 요약)
1. 사람 단위 키는 `client_id` / `user_pseudo_id`. **`user_id` 로 사람을 세지 말 것** (익명 uid 재발급으로 과대 계수).
2. `session_logs` 는 upsert → `ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY updated_at DESC) = 1`.
3. `play_sec` 은 벽시계 시간. 플레이 시간은 `game_logs.span_sec` 기준.
4. 개발자 기기·페르소나·베타 계정은 공통 필터 하나(`_filters.sql`)로 제외하고 모든 지표가 그걸 쓴다.
5. BQ 무료 티어 → DML 불가. 테이블 재생성은 `CREATE OR REPLACE TABLE … AS SELECT`.
6. A/B variant 컬럼으로 결론 내지 말 것 (과거 배정 무효).

## SQL 파일 형식
```sql
-- metric: <영문 슬러그>         (정의서의 지표 ID 와 같게)
-- definition: <정의서 한 줄 그대로>
-- grain: <day|week> × <platform>
-- source: <테이블>
-- caveats: <알려진 한계>
```
- 출력 컬럼은 `period, platform, value, numerator, denominator` 로 통일 (비율 지표는 분자·분모 둘 다 내보낸다).
- 결과 CSV·유저 단위 행은 **커밋 금지** (PUBLIC 저장소). 숫자 확인은 쿼리 실행으로만.

## 커밋·병합
- 커밋 메시지: `feat(metrics): <지표 슬러그>` / `test(metrics): …` (영어)
- 커밋 전 `git grep -nE 'AIza|GOCSPX-|service_role|sk_live'` 로 키 노출 확인
- 공유 브랜치로의 merge 는 사용자가 지시할 때만

## 지금 할 일 (M1~M3 정의가 나오기 전)
정의서가 아직 없으니 **조사만** 한다. 아래 3개를 `dev/active/metrics-framework/codex-inventory.md` 에 표로 정리:
1. `calm_forest_raw` 각 테이블의 컬럼·행 수·기간(최소~최대 날짜)
2. GA4 `events_*` 의 event_name 상위 50개와 최근 28일 건수
3. 개발자·페르소나·베타 계정을 식별할 수 있는 근거(어떤 컬럼·값으로 거를 수 있는지) — 유저 ID 원문은 쓰지 말고 개수만
