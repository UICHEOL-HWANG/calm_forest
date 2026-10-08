# Codex 브리핑 — calm forest 지표 SQL 구현 (M5)

**갱신** 2026-10-08 · 지표 정의 확정 완료(M1~M4). 이 문서와 정의서만 보고 작업할 수 있게 썼다.

## 역할
- 정의 = `docs/analysis/METRICS_FRAMEWORK.md` (Claude 작성, **수정 금지**). Codex 는 그 정의를 **BigQuery SQL** 로 구현·검증한다.
- 정의서에 없는 지표는 만들지 않는다. 모호하면 추측하지 말고 `dev/active/metrics-framework/codex-questions.md` 에 질문으로 남긴다.
- **정답지가 있다:** 같은 정의를 Python 으로 계산한 `dev/active/metrics-framework/validation/hierarchy_baseline.py` 의 출력. SQL 결과가 아래 "검수 기준"과 같아야 완료다.

## 작업 공간
- worktree `~/calm_forest-codex-metrics` · 브랜치 `analytics/codex` (공유 브랜치 `analytics/metrics-framework` 최신으로 맞춰 둠)
- 내 폴더: `sql/analytics/metrics/` (지표 1개 = 파일 1개) · `sql/analytics/metrics/checks/`
- 건드리지 않는 곳: `js/`, `docs/analysis/METRICS_FRAMEWORK.md`, `dev/active/metrics-framework/validation/`, main 브랜치
- 진행 체크: `dev/active/metrics-framework/metrics-framework-tasks.md` 의 M5

## 데이터 (BigQuery `calm-forest`, 리전 `asia-northeast3`)
| 약칭 | 테이블 | 메모 |
|---|---|---|
| SL | `calm_forest_raw.session_logs` | 세션 요약 upsert → `ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY updated_at DESC) = 1`. `counts` = 문자열 JSON (이벤트별 횟수) |
| EC | `calm_forest_raw.econ_logs` | 코인 원장. `amount` ± |
| CE | `calm_forest_raw.churn_events` | 개발자 기기 판별에만 사용 (`origin`) |
| GA4 | `analytics_547127440.events_*` | 퍼널·그림자 값. 플랫폼 = user_properties `platform`, **비어 있으면 웹** |

## 공통 규칙 — `sql/analytics/metrics/_filters.sql` 하나로 모든 지표가 공유
1. **날짜** = KST: `DATE(started_at, 'Asia/Seoul')` / GA4 는 `DATE(TIMESTAMP_MICROS(event_timestamp), 'Asia/Seoul')`
2. **플랫폼** = `web`, `toss` 만
3. **페르소나 제외** = 계정 이메일이 `persona-…` 형식인 user_id. 이메일은 BQ 에 없으므로 **쿼리 파라미터 `@persona_user_ids` (ARRAY<STRING>)** 로 받는다. 목록은 저장소에 커밋하지 않는다(PUBLIC).
   - 검수 기간(9/7~10/4)에는 아래 대체 조건이 이메일 목록과 **결과가 같다** — 로컬 검증에 써도 된다: `user_id` 중 `COUNT(DISTINCT client_id) >= 4 AND MIN(KST 날짜) >= '2026-09-28'`
4. **개발자 기기 제외** = `churn_events.origin` 이 `http://localhost%` 또는 `http://127.0.0.1%` 인 적이 있는 `client_id` 의 **모든 세션**. GA4 쪽은 그 기기들에서 생긴 `user_id` 로 제외
5. **베타 제외** = `variant IN ('beta_A','beta_B')` 이면서 날짜가 2026-09-09~09-15 인 세션만
6. **사람 키 (혼합 + 통합)** — `validation/person_key.py` 와 동일하게:
   - 로그인 세션(`is_guest = FALSE AND user_id IS NOT NULL`) → `u:` + user_id
   - 게스트 세션 → 그 `client_id` 에 로그인 계정이 **정확히 1개**면 `u:` + 그 계정, 아니면 `c:` + client_id
   - `is_guest` 가 NULL 이면 게스트로 본다
7. **획득 행동 16종** (SL `counts` 키 = GA4 event_name):
   `harvest_crop coop_collect honey_collect fishing_catch sea_catch firefly_catch forage_pick mine_ore craft_item craft_claim cooking_result cafe_serve carve_result quest_complete star_result duel_result`
8. **주** = 월~일 (`DATE_TRUNC(d, WEEK(MONDAY))`). 곱셈 분해는 반드시 같은 달력 주로

## 출력 형식 (모든 지표 SQL 공통)
```sql
-- metric: <슬러그>
-- definition: <정의서 문장 그대로>
-- grain: <week|cohort_week> × <platform|all>
-- source: <SL|EC|GA4>
-- caveats: <정의서 §8 한계 중 해당 항목>
```
출력 컬럼: `period, platform, variant, value, numerator, denominator`
- `variant` = `official`(위 공통 규칙 전부) | `raw`(필터 없음, 키 규칙만) — 두 벌 다 낸다
- 비율 지표는 분자·분모를 반드시 함께
- 결과 CSV·유저 단위 행은 **커밋 금지**

## 만들 파일 (우선순위 순)
| # | 파일 | 지표 | 정의서 |
|---|---|---|---|
| 1 | `_filters.sql` | 공통 필터 + 사람 키 + 유저×날 테이블 | §2, §5-0 정의 1~6 |
| 2 | `nsm_daily_hcc_users.sql` | 북극성: 하루 평균 수확·포획·제작한 유저 수 = 획득한 (유저×날) ÷ 7 | §2 |
| 3 | `l1_decomposition.sql` | 주간 방문 유저 W · 1인당 방문일 F · 방문일 중 획득 비율 Q (+ W×F×Q 검산 열) | §5 |
| 4 | `l2_new_kept_back.sql` | 신규·유지·복귀 (복귀 = W − 신규 − 유지) | §5-0 정의 1 |
| 5 | `l2_habit_gap.sql` | 습관 유저(주 4일+) 비율 · 방문 간격 | 부록 A |
| 6 | `l2_quality_detail.sql` | 분야별 획득(농사·낚시채집·만들기·마을) · 빈손 방문 마지막 위치(`last_place`) | 부록 A |
| 7 | `funnel_activation.sql` | 코호트: 첫 방문 → 진입(`user_id` 생김) → `character_select` → 7일 내 획득 행동 | §5-0 정의 3·4 |
| 8 | `guardrails.sql` | 빈손 방문 비율 · 코인 순증가/기기 · 복구 안 된 세이브 실패 세션 | §5 견제 |
| 9 | `revenue_lead.sql` | 코인 소비 비율 (EC `amount < 0` 기기 / 경제 활동 기기) | §5-1 |
| 10 | `checks/shadow_ga4.sql` | 북극성 그림자(GA4) + 로그인 계정 SL↔GA4 일치율 (경보 기준 95%) | §4 |

## 검수 기준 — official, 2026-09-07 ~ 10-04 (정답지 `hierarchy_baseline.py`)
| 주 | W | F | Q | 획득한 유저×날 | 북극성 | 신규 | 유지 | 복귀 | 습관 |
|---|---|---|---|---|---|---|---|---|---|
| 9/7 | 26 | 1.69 | 47.7% | 21 | 3.00 | 20 | 5 | 1 | 3 |
| 9/14 | 25 | 1.52 | 52.6% | 20 | 2.86 | 20 | 4 | 1 | 2 |
| 9/21 | 22 | 1.55 | 58.8% | 20 | 2.86 | 16 | 5 | 1 | 2 |
| 9/28 | 15 | 1.60 | 54.2% | 13 | 1.86 | 8 | 5 | 2 | 1 |

- 퍼널 (첫 방문 8/6~9/27, 웹+토스): 방문 415 → 진입 182 → 캐릭터 선택 153 → 첫 획득 74 · 웹 333/109/94/49 · 토스 82/73/59/25
- 4주 합산: 방문 간격 중앙값 1일·다음 날 78% · 분야별 농사 80/채집 64/마을 53/만들기 42% · 빈손 방문 마지막 위치 마을 57/66
- 견제: 빈손 52/47/41/46% · 코인 순증가 384/228/210/96 · 복구 안 된 세이브 실패 0/0/0/0
- 통합 리포트: 통합 기기 6 · 통합된 게스트 세션 113 · 모호(계정 2개+) 기기 2

숫자가 다르면 SQL 을 정답지에 억지로 맞추지 말고, 어느 규칙에서 갈렸는지 `codex-questions.md` 에 적는다.

## 함정 (실제로 데인 것)
- `session_logs` 첫 기록은 게임 시작 60초 뒤 → 60초 미만 방문은 SL 에 없다. **진입은 GA4 기준**
- `user_id` 만으로 사람을 세면 게스트 익명 uid 재발급으로 과대 계수 — 반드시 공통 규칙 6
- 페르소나는 판마다 새 브라우저 프로필 → `client_id` 가 폭증 (9/28 주 원본 WAU 418)
- 천문대 실패·밤손님 패배도 `star_result`/`duel_result` 로 기록됨 — **16종 유지가 확정 결정**(최대 4.3% 과대, 정의서 §8). 빼지 말 것
- BQ 무료 티어 DML 불가 → 테이블은 `CREATE OR REPLACE TABLE … AS SELECT`
- `variant` 로 A/B 결론 금지 (과거 배정 무효)

## 커밋·병합
- 커밋: `feat(metrics): <슬러그>` / `test(metrics): …` (영어)
- 커밋 전 `git grep -nE 'AIza|GOCSPX-|service_role|sk_live'` 키 스캔
- 공유 브랜치로 merge 는 사용자 지시 때만
