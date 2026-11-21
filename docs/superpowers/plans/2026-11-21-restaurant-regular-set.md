# 식당 단골 세트 주문 Implementation Plan

**Goal:** 단골이 가끔 두 접시 세트를 시키고, 다 내면 코인 1.5배와 호감도 +2.

**Spec:** `docs/superpowers/specs/2026-11-21-restaurant-regular-set-design.md`

## 결정

- 주문표 시안 A(2026-11-21): 보통 주문표보다 넓은 한 장에 두 메뉴 아이콘을 나란히, 이미 낸 메뉴는 흐리게(회색). 단골 분홍 테두리 그대로. 새 문구 없음.
- 내부 구조: 세트 손님 `g.set = [fav, other]`. 앉을 때 주문표를 메뉴마다 하나씩 만든다(같은 `id`, `set: true`, `pat: SET_PATIENCE`). 접시 맞추기·직원·다음 단계 안내는 지금 주문표 단위 그대로 쓴다. 화면에서만 같은 손님 주문표를 한 장으로 합친다.
- 대접 대상 찾기는 `id`와 `menu`를 함께 본다(세트 두 메뉴는 서로 다름).

## Task 1: 세션 규칙 (`session.js`, `regulars.js`)

- `SET_ODDS 0.25`, `SET_PATIENCE 1.5`, `SET_COIN_MUL 1.5` (session.js), `SET_LOVE 2` (regulars.js).
- `createSession({ regulars })`, `S.setUsed` (Set). spawn: 단골·미사용·`rng() < SET_ODDS`·좋아하는 메뉴가 열림·다른 메뉴 하나(무작위)·두 메뉴 재고(같은 재료면 2) → `g.set`.
- `inStock` 은 기다리는 손님의 모든 접시(`g.set || [g.menu]`)를 센다.
- 앉기: 접시마다 주문표. serve: 별점 `S.dda.pat * tk.pat`, 남은 주문표 있으면 계속 기다림, 마지막이면 먹기 + `set: { stars: 평균 반올림, coins: 합×1.5 반올림 }`, 반환 `coins` 에 보너스 포함.
- 대접 찾기·직원: `id`와 `menu` 함께.

## Task 2: 화면·연결

- `hud.js` `ticketHtml`: `t.set` 이면 `tk set fav` 넓은 카드, 메뉴별 `<i>`, 낸 것은 `done`. 남은 시간 막대는 `pat * t.pat`.
- `runtime.js`: 세션에 `regulars: r.regulars`, 화면용 주문표를 손님별로 합친다.
- `spaces/restaurant.js` `onGuestServed`: `set` 이 있으면 별점 4 이상일 때 `SET_LOVE` 를 더하고 `trackEvent('restaurant_set', { npc, stars, coins })`.

## Task 3: 확인

- 테스트 전체, 미리보기(세트 주문표 PC·모바일, 한 접시 낸 뒤, 다 낸 뒤), 리뷰.
