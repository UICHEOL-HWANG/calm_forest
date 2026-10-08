# 📐 지표 체계 설계 — 북극성 · 지표 계층 · AARRR

**시작** 2026-10-08 · **브랜치** `analytics/metrics-framework` (공유) ← `analytics/codex` (Codex)

## 목표

"이번 주 calm forest 가 나아졌나?"에 숫자 하나와 그 숫자를 움직이는 레버 몇 개로 답할 수 있게 한다.
지금은 기능마다 이벤트·대시보드가 따로 있고, 무엇이 핵심인지 합의된 정의가 없다.

## 산출물

| | 파일 | 담당 |
|---|---|---|
| 지표 정의서 | `docs/analysis/METRICS_FRAMEWORK.md` — NSM·계층·AARRR·용어 | Claude |
| 지표 SQL | `sql/analytics/metrics/*.sql` — 지표 하나당 파일 하나, BQ 기준 | Codex |
| 검증 쿼리 | `sql/analytics/metrics/checks/*.sql` — 정의 ↔ 숫자 대조 | Codex |
| 베이스라인 리포트 | Artifact (단계마다 1장) | Claude |

## 단계

기존 `docs/analysis/ANALYSIS_PROTOCOL.md` 규칙을 그대로 따른다:
후보는 한 번에 하나씩 · 한 턴에 단계 하나 · 기준은 결과 전에 · 단계 끝에서 멈춤.

| | 단계 | 하는 일 | 끝났다는 뜻 |
|---|---|---|---|
| **M0** | 셋업 | 브랜치·worktree·dev docs·Codex 브리핑 | ✅ |
| **M1** | 북극성 지표 | 후보를 하나씩 제시 → 채택/기각. 정의·단위·주기·반례까지 | 사용자 서명 |
| **M2** | 지표 계층 | NSM → L1 입력 지표(3~5) → L2 드라이버 → 계측 이벤트 | 트리 1장 합의 |
| **M3** | AARRR | 단계별 정의를 실제 이벤트/테이블로 매핑, 플랫폼(web·toss·itch·android) 축 | 단계별 SQL 정의 가능 |
| **M4** | 계측 감사 (=G1) | 각 지표가 BQ 로 계산되는지·함정·공백 목록 | 전부 초록 또는 한계 문서화 |
| **M5** | SQL 구현 | Codex 가 지표 SQL·검증 쿼리 작성, Claude 가 정의 대조 리뷰 | 재실행 시 동일 숫자 |
| **M6** | 베이스라인 | 최근 4주 값·주간 추이·플랫폼별 분해 | Artifact 발행 |
| **M7** | 분석 | 가장 약한 AARRR 단계 → 가설 → 기존 게이트(G0~) 로 넘김 | 다음 분석 과제 1개 확정 |

## 원칙

- **사람 단위 키는 `client_id` / `user_pseudo_id`.** `user_id` 금지 (익명 uid 재발급).
- **원천은 BigQuery.** Supabase 는 7일 보관이라 추이 지표에 못 쓴다.
- **PUBLIC 저장소.** 결과 CSV·유저 단위 행은 커밋하지 않는다. 집계 숫자만 문서에.
- 개발자·페르소나·베타 계정 제외 규칙을 지표 공통 필터로 한 곳에 둔다.
- 게임 코드(js/)는 이 브랜치에서 건드리지 않는다. 계측 공백은 목록으로 남기고 별도 브랜치에서 처리.
