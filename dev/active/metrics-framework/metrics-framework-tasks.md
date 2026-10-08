# 지표 체계 설계 — Tasks

## M0 셋업
- [x] 공유 브랜치·worktree (`analytics/metrics-framework`)
- [x] Codex 브랜치·worktree (`analytics/codex`, `../calm_forest-codex-metrics`)
- [x] dev docs 3종
- [x] Codex 브리핑 (`CODEX_BRIEF.md`)

## M1 북극성 지표
- [x] 후보 전수(53개)·보드 → 사용자 판단으로 정의 (Q1~Q6)
- [x] 측정 가능성 확인 (V2·계측 일치·V3·노이즈) — 선발전 아님
- [x] 정의서 docs/analysis/METRICS_FRAMEWORK.md

## M2 지표 계층
- [x] L1 폭·빈도·품질 (곱셈 분해) + 활성화
- [x] L2·견제 지표 3종
- [x] 별자리 시각화 (nsm-constellation.html)

## M3 AARRR
- [ ] 단계별 정의 (Acquisition·Activation·Retention·Referral·Revenue)
- [ ] 플랫폼 축 처리 방식

## M4 계측 감사
- [ ] 지표별 계산 가능 여부·함정·공백 표

## M5 SQL 구현 (Codex)
- [ ] 공통 필터 (개발자·페르소나·베타 제외)
- [ ] 지표 SQL
- [ ] 검증 쿼리 · Claude 리뷰

## M6 베이스라인
- [ ] 최근 4주·주간 추이·플랫폼 분해 Artifact

## M7 분석
- [ ] 가장 약한 단계 → 가설 → 게이트로 이관
