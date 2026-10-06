# halloween-premium — context
Last Updated: 2026-10-06
- 핵심 파일: js/cosmetics/catalog.js(RAW) · js/shop/premium-row.js(premiumRowMode) · js/shop/price-ids.js · js/shop/cash.js · scripts/paddle-seed.mjs · js/cosmetics/{skin,tool-skins}.js
- 결정(사용자 확정): 승인 후 오픈·4종 전부·내년 재판매·A안(날짜 창 + 종료일 Price Archive)
- ⚠️ js/config.js 는 이미 라이브 토큰·storeOpen:true — 막힌 건 Paddle 도메인 승인뿐. 기간 전엔 hidden 이라 승인 전 배포 안전
- 할로윈(10/31)은 계절상 겨울(10/23~) — 판매 창은 계절과 분리
- 웹훅은 기간을 검사하지 않는다(결제 완료분은 무조건 지급)
- 한계: 결제 웹 전용(토스·Play 못 삼) · 환불 문구 손질 필요 · 문구는 한국어 후보 선검수
