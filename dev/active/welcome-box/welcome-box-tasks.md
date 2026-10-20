# 🎁 숲 환영 상자 — tasks (Last Updated: 2026-10-19)

## 0. 결정
- [x] 👤 코인 300 뺌(2026-10-19)
- [x] 👤 노출 자리 1차 = 꾸미기 가게 맨 위 카드
- [x] 👤 문구: 시안 C + 고르기 화면 A안(2026-10-19)

## 1. 순수 규칙 (테스트 먼저)
- [x] `js/shop/bundles.js`: BUNDLES 정의(welcome_box: 품목·선택지·won) · `bundleEligible(owned, platform, …)` · `choicesLeft(owned)`
- [x] `functions/api/_paddle.js`: 상자 price → 원장 줄 펼치기(`ledgerRows`) · choice 검증·폴백 · event_id `<txn>:<price>:<item>`
- [x] `js/shop/entitlements.js`: kind 'bundle' 줄은 kindOf 가 null 이라 자동으로 무시됨(변경 불필요)

## 2. DB
- [ ] migration: `purchases.kind` check 에 'bundle' 추가(`migrate_purchases_bundle_kind.sql`) · 🗄️ pg8000 풀러로 직접 실행
- [ ] 보안 가드 변경 없음 확인(sql/tests/security_hardening_selftest.py 로 상자 원장 줄 → 품목 유지 확인)

## 3. Paddle
- [x] `price-ids.js` 에 `welcome_box: null` 슬롯 · `tests/cash.test.mjs` 슬롯 수 갱신
- [ ] `scripts/lib/paddle-seed.mjs` buildPlan 에 번들 포함 → sandbox 시드 → 실결제 확인 → production 시드(키체인 calmforest-paddle-live)
- [ ] /shop 가격 안내 페이지에 상자 추가(도메인 심사 요건: 로그인 없이 가격이 보여야 함)

## 4. 화면
- [x] `js/spaces/cafe.js` drawCosMenu 맨 위 상자 카드(자격 있을 때만) · 화면은 js/shop/bundle-card.js
- [x] 세트 고르기 단계 → openCheckout({ priceId, itemId:'welcome_box', kind:'bundle', choice })
- [x] 결제 완료: 고른 세트 awaitGrant → 두 품목 장착 → 도구 세트 쇼케이스 + 반딧불 토스트
- [x] i18n 영어 문구 · 엠대시 금지 · 390 폭 캡처(가로 스크롤 0)

## 5. 트래킹
- [x] GA4 premium_row_view(kind bundle)·bundle_open·bundle_choice·cash_checkout_open(kind bundle)
- [x] Meta: premium_row_view→ViewContent · cash_checkout_open→InitiateCheckout · Purchase 는 Paddle 완료(content_category bundle)

## 6. 검증·배포
- [ ] npm test 전부 · 코드 리뷰 · sandbox 결제 E2E(지급·장착·환불 회수)
- [ ] 웹 배포(웹 전용 상품이라 웹만으로 판매 시작 가능. 단 옛 클라가 새 id 를 지우지 않는지 확인)

## 🚨 배포 순서(리뷰 HIGH)
1. `migrate_purchases_bundle_kind.sql` 운영 적용
2. 그 뒤에만 price-ids.js 에 welcome_box price id 커밋·배포
(거꾸로면 표식 줄이 CHECK 에 걸려 배치 insert 전체 실패 → 500 → 지급 안 됨)
- 분석: purchases 행 수는 count(distinct transaction_id) 로. cash_grant 는 상자에서 2건 나온다
