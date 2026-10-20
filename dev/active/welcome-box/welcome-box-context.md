# 🎁 숲 환영 상자 — context
Last Updated: 2026-10-19

## 핵심 파일
- 결제창: `js/shop/paddle.js` openCheckout(100-117, customData {user_id,item_id,kind,attr})
- 가게 화면: `js/spaces/cafe.js` drawCosMenu(1037-1110) · cashButton(945-967) · onCompleted(975-984) · onGranted(992-1016)
- 행 규칙: `js/shop/premium-row.js` premiumRowMode
- 지급: `js/shop/entitlements.js` applyPurchases(26-76, kindOf 22) · `js/shop/purchases.js` awaitGrant
- 웹훅: `functions/api/paddle-webhook.js` · `functions/api/_paddle.js` (서명 46 · priceIndex 57-63 · ledgerRows 66-96 · revokeTarget 99-105)
- 원장: `public.purchases` (`sql/migrations/migrate_purchases.sql`, kind check `migrate_purchases_sled_kind.sql`)
- 보안 가드: `_premium_cosmetic_ids()` (`migrate_referrals.sql:219` 가 최신) · 트리거 trg_game_saves_guard_premium
- 가격 id: `js/shop/price-ids.js` (production) · 시드 `scripts/paddle-seed.mjs` + `scripts/lib/paddle-seed.mjs`
- 카탈로그: `js/cosmetics/catalog.js` (tools_shroom/moon/bloom ₩5,000 · firefly ₩4,000)

## 결정
- C안 확정(2026-10-19). 새 그림 없음.
- 상자는 별도 모듈(bundles.js). cosmetics 카탈로그에 won 품목으로 넣지 않는다(보안·슬롯 수 테스트).
- 원장은 품목별 줄 + 상자 표식 줄. 보안 가드 SQL 은 그대로.

## 의존성·함정
- 코인은 서버 지급 경로가 없다(세이브 state.inventory.coins, 클라만 씀).
- 환불은 transaction_id 단위 전부 회수(상자에 맞음).
- 같은 품목을 단품으로 이미 산 사람은 자격에서 뺀다(중복 지급 방지가 아니라 가치 보호).
- 토스·스토어 앱은 행 자체 숨김(외부 결제 안내 금지).
- 🚨 루트 js/config.js 에 test_ 토큰 로컬 수정이 있을 수 있다. 루트에서 wrangler deploy 전 확인.
