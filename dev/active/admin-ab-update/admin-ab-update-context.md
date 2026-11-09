# admin A/B 대시보드 갱신 — 컨텍스트

**Last Updated: 2026-11-09 18:30**

## 핵심 파일
- `dashboards/experiments.html`, `dashboards/js/admin-experiments.js`, `dashboards/js/admin-metrics.js`
- `ml/scripts/experiment_summary.py`, `ml/calm_ml/experiments.py`
- `sql/migrations/migrate_experiments.sql`, `migrate_experiments_2026_10_26.sql`, 신규 `migrate_experiments_2026_11_09.sql`
- 사전등록: `dev/active/metrics-framework/login-guest-first-prereg.md`, `dev/active/meta-ads-launch/parts/02-goals-hypotheses.md`

## 결정
- 밭/메인 = E1(기존, 갱신만) + houseGuide(`hguide`, 신규)
- `ads_w1` 삭제, `ads_h1`·`ads_h6`·`ads_h7` 주차별 카드로 대체. 광고 숫자는 source=manual
- 가설 범위: 판정 H1·H6·H7 + 탐색 H2~H5 (S·P 제외)
- 깔때기 카드(`gift_path`)는 kind=policy, res.funnel 로 표시
- 새 코드에는 주석을 달지 않는다(사용자 규칙)

## 의존성
- Supabase 쓰기는 pg8000 풀러 직접, BQ 는 GA4 `analytics_547127440.events_*`
