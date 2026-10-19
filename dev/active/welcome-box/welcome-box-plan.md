# 🎁 숲 환영 상자 (스타터 키트 C안) — 구현 계획

2026-10-19 사용자 결정: 시안 C "숲 환영 상자"로 간다. 기존 프리미엄을 묶어 판다(새 그림 없음).
시안: `sims/starter-kit-sim.html`

## 상품
- 이름: 숲 환영 상자 · ₩4,900 · 웹 전용(Paddle) · 계정당 1번
- 구성: 도구 세트 1종(🍄 tools_shroom · 🌙 tools_moon · 🌸 tools_bloom 중 선택, 정가 ₩5,000) + 🌟 반딧불 발자국(firefly, 정가 ₩4,000)
- 따로 사면 ₩9,000 → 표시 "첫 구매 45%↓"(정가가 실제 판매가라 표시 가능)
- 🪙 코인 300: **결정 필요** (아래 §결정 1)

## 핵심 설계
1. **상자는 Paddle 가격 1개, 원장은 품목별 줄.**
   - 웹훅이 상자 price_id 를 받으면 `purchases` 에 품목마다 한 줄씩 쓴다: 고른 도구 세트, firefly, 그리고 상자 표식 줄(item_id `welcome_box`, kind `bundle`).
   - event_id 는 `<txn>:<price_id>:<item_id>`. 기존 단품 형식(`<txn>:<price_id>`)은 그대로 둔다.
   - 보안 가드(`_premium_cosmetic_ids`)는 고칠 필요가 없다. 품목 id 가 이미 목록에 있고, 원장 줄이 그 item_id 로 생기기 때문이다.
   - 환불·차지백은 `transaction_id` 로 전부 회수하는 기존 동작이 상자에도 그대로 맞는다.
2. **세트 고르기는 결제 전에 한다.**
   - 고른 값은 `customData.choice` 로 보낸다.
   - 서버는 choice 가 허용된 3종 안에 있는지만 검사한다. 밖의 값이면 첫 번째 세트(tools_shroom)로 지급하고 raw 에 남긴다. 결제는 이미 끝난 상태라 거절하지 않는다.
3. **자격(보여 줄지):**
   - 웹이고, 로그인했고(게스트 결제 불가), 상점이 열려 있어야 한다.
   - 상자 표식 줄이 없어야 한다.
   - firefly 를 갖고 있지 않고, 도구 세트 3종 중 하나 이상을 아직 갖고 있지 않아야 한다.
   - 고르는 화면에는 아직 없는 세트만 나온다.
4. **카탈로그 분리:**
   - 상자는 `js/shop/bundles.js` 에 따로 둔다.
   - `cosmetics/catalog.js` 에 won 품목으로 넣으면 보안 테스트(catalog won 목록 = SQL 목록)와 슬롯 수 테스트가 깨진다.
5. **노출 자리(1차):**
   - 꾸미기 가게(`js/spaces/cafe.js` `drawCosMenu`) 맨 위 카드 하나.
   - 넛지 자리는 게스트용(결제 불가)이라 쓰지 않는다.
6. **결제 후 연출:**
   - 두 품목 지급을 기다린 뒤 도구 세트 쇼케이스 → 반딧불 순서로 `playPurchaseReveal` 을 이어 붙인다.
   - 두 품목 모두 장착한다.
7. **트래킹:**
   - GA4 이벤트: `bundle_view`, `cash_checkout_open{item_id:'welcome_box', kind:'bundle', choice}`, `bundle_choice`.
   - Meta: `ViewContent` / `InitiateCheckout` / `Purchase`(content_category 'bundle').
   - Paddle customData.attr 은 그대로 싣는다.

## 결정 필요
1. 🪙 코인 300 — 서버가 코인을 줄 경로가 지금 없다(코인은 클라 세이브에만 있다).
   - **권장 (a) 빼기:** 상자는 품목 2개로만. 가치 표시는 그대로 ₩9,000 → ₩4,900.
   - (b) 원장 표식 줄을 처음 본 클라가 한 번 넣기(세이브에 `welcomeCoins` 플래그). 환불 때 코인은 못 회수하고, 경제 경로가 하나 새로 생긴다.
2. 노출 자리 — 1차는 꾸미기 가게 맨 위 카드만으로 시작할지.

## 하지 않는 것
- 토스·안드로이드·iOS·itch 판매(외부 결제 안내 금지 정책)
- 새 조형·새 프리미엄 품목
- 서버 쪽 "계정당 1번" 강제. 동시 결제가 겹치면 둘 다 지급한다(돈을 받았으니). UI 가 표식 줄로 막는다.
