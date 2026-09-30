# paddle-checkout · context
Last Updated: 2026-09-30

## 핵심 파일
- 스펙: docs/superpowers/specs/2026-09-30-paddle-checkout-design.md
- 계획: docs/superpowers/plans/2026-09-30-paddle-checkout.md
- 가격표 단일 출처: js/cosmetics/catalog.js + js/pet/rules.js (cash 칸) · priceId 는 js/shop/price-ids.js
- 원장: sql/migrations/migrate_purchases.sql · 웹훅: functions/api/paddle-webhook.js

## 의사결정
- 웹만 · 로그인 유저만 · 서버 원장(A안) — 스펙 §0
- item 은 price_id 역조회, custom_data 는 user_id 만 — §4-2
- cashOwned 세이브 필드로 코인/현금 구분 — §6-1
- 원장에서 흔적 없이 사라진 항목은 회수하지 않는다(revoked_at 만 회수)
- 별도 홈페이지 없음 — 입구 화면 링크 줄로 심사 요건 충족

## 외부 의존(사용자)
- Paddle 샌드박스 토큰·웹훅 시크릿·priceId 22개 — 받기 전엔 price-ids.js 전부 null(현금 버튼 안 뜸)
