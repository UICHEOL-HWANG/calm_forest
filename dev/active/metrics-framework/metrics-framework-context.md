# 지표 체계 설계 — Context

**Last Updated** 2026-10-08

## 작업 공간

| 누구 | 경로 | 브랜치 |
|---|---|---|
| Claude | `calm_forest/.claude/worktrees/metrics-framework` | `analytics/metrics-framework` (공유·최종 병합 단위) |
| Codex | `calm_forest-codex-metrics` | `analytics/codex` → 공유 브랜치로 merge |
| main 루트 | `calm_forest` | 배포 전용 — 여기서 분석 작업 금지 |

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

## 미해결

- 수익 지표 범위: Paddle(웹 현금)·토스 IAP·IAA 를 Revenue 에 넣을지 — M3 에서
- 플랫폼별 NSM 분리 여부 — M1 에서
