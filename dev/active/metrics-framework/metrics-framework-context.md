# 지표 체계 설계 — Context

**Last Updated** 2026-10-08

## 작업 공간

| 누구 | 경로 | 브랜치 |
|---|---|---|
| Claude | `calm_forest` (메인 폴더) | `analytics/metrics-framework` (공유·최종 병합 단위) |
| Codex | `calm_forest-codex-metrics` | `analytics/codex` → 공유 브랜치로 merge |

폴더 소유: `docs/analysis/METRICS_FRAMEWORK.md` = Claude · `sql/analytics/metrics/` = Codex · `dev/active/metrics-framework/` = 공동

## 데이터 원천 (BigQuery 프로젝트 `calm-forest`, 리전 asia-northeast3)

| 데이터셋 | 테이블 | 메모 |
|---|---|---|
| `analytics_547127440` | `events_*` | GA4 행동 이벤트, 키 `user_pseudo_id` |
| `calm_forest_raw` | `game_logs` | 좌표·행동 샘플 (배치 INSERT 시각만) |
| | `econ_logs` | 코인 원장 (코인 전용) |
| | `session_logs` | upsert → `ROW_NUMBER() … updated_at DESC = 1` |
| | `game_saves` | 매일 덮어쓰는 스냅샷 (이력 없음) |
| | `session_platform`, `user_platform` | platform 백필 보조 |
| | `churn_events`, `retention_guidance_scores` | 이탈 파이프라인 산출 |

Supabase 쪽 별도 테이블(리더보드·star_runs·boat_runs·purchases·notices 등)은 BQ 에 없을 수 있음 → M4 에서 확인.

## 기존 자산 (재사용)

- `docs/analysis/ANALYSIS_PROTOCOL.md` — 게이트 규칙·함정 목록 (반드시 준수)
- `docs/analysis/ANALYSIS_GATES.md` — 과거 분석 원장 (리텐션·이벤트 밀도·토스 행동)
- `docs/analysis/GA4_GUIDE.md` — 이벤트 명세
- `sql/analytics/*.sql` — 기존 쿼리 (admin_analytics, bigquery_queries, quality_checks …)
- 과거 발견: 첫 10분 이벤트 밀도가 리텐션 예측력 있음 · 입구 이탈 59.4% (Tableau)

## 의사결정 로그

- 2026-10-08 공유 브랜치 1개 + Codex 하위 브랜치, 폴더 단위 소유로 충돌 회피
- 2026-10-08 기존 7게이트 프로토콜 위에 M0~M7 단계를 얹음 (M4 = G1, M7 → G0 로 이어짐)
- 2026-10-08 **NSM 정의 확정(사용자 판단)**: 하루 평균 가꾼 주민 수(7일 평균) · 결과물 16종 · 혼합 키 · KST · 공식(필터)+원본 병기 · 원천 SL 공식 + GA4 그림자
- 2026-10-08 검증은 선발전이 아니라 측정 가능성 확인용으로 한정. V1(AUC 비교)은 동어반복 설계라 판단 근거에서 제외. V2·계측 일치(98.4%)·V3·노이즈만 정의서 근거/한계로 사용
- 2026-10-08 **집계 플랫폼 = 웹·토스.** 안드로이드(SL 행 없음)·itch(결과물 0) 제외, 계측 수정 후 재편입

## M1 후보 (2026-10-08) — 전체 기간 표는 m1-candidates.md 가 정본. 아래는 첫 3후보 메모(9월 한정, 폐기)

| | 후보 | 원천·키 | 주간 값 | 강점 | 약점 |
|---|---|---|---|---|---|
| ① | 주간 정착 주민 (2일+ & 핵심 루프) | GA4 · user_pseudo_id | 14→8→4→4 | 습관+행동 | 숫자 작음·토스 누락 의심 |
| ② | 주간 가꾼 날 수 (사람×날, 핵심 루프) | GA4 · user_pseudo_id | 53→31→15→13 | 폭×빈도 한 숫자 | 열성 소수가 부풀림·토스 누락 의심 |
| ③ | 주간 재방문 주민 (이번 주 & 지난주) | session_logs · client_id | 6→14→7→6 | 전 플랫폼·가장 직접적 | 숫자 작음·격주 유저 누락 |

- 9/28 주 session_logs WAU 418 (평소 27~45) → 페르소나 시뮬 혼입 확정적. GA4 는 같은 주 45 — 페르소나가 GA4 엔 덜 찍힘
- `session_logs.counts` = 문자열 JSON, 세션별 행동 횟수 → 핵심 루프 조건을 GA4 없이 전 플랫폼에 적용 가능
- 토스 재방문은 매주 4명 고정

## 미해결

- 수익 지표 범위: Paddle(웹 현금)·토스 IAP·IAA 를 Revenue 에 넣을지 — M3 에서
- 플랫폼별 NSM 분리 여부 — M1 에서
