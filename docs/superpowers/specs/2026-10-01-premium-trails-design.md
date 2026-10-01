# 💎 프리미엄 자국 1단계 — 현금 전용 아이템 + 반딧불·무지개 자국 + 획득 연출 A + 상점 열기

- 날짜: 2026-10-01
- 선행: [Paddle 결제 기반](2026-09-30-paddle-checkout-design.md) — main 7bc9a19 배포(상점 닫힘, `CONFIG.PADDLE.storeOpen=false`)
- 레퍼런스: `dev/active/premium-cosmetics/refs/README.md` · 시뮬 `sims/premium-reveal-sim.html`
- 2단계(별도 스펙): 🧥 스킨 칸 신설 + 숲의 정령·플러시 인형 + B+C 상자 폭발 연출

---

## 1. 목표와 범위

현금으로만 파는 아이템을 처음으로 두 개 내고, 결제 → 지급 → 획득 연출 → 장착까지 전 구간을 실제로 돌린다.
그 뒤 상점을 열고 Paddle 라이브 도메인 심사를 받는다.

| 들어가는 것 | 빠지는 것(2단계 이후) |
|---|---|
| 현금 전용 아이템 모양(카탈로그·가게·옷장·결제·서버) | 스킨 칸·전신 스킨 |
| 🌟 반딧불 자국 ₩4,000 · 🌈 무지개 자국 ₩3,000 | B·C·B+C 연출 |
| 획득 연출 A(스포트라이트) | 세트 할인·첫 구매 팩 |
| Paddle 샌드박스 결제 실검증 → `storeOpen=true` → 라이브 심사 | 기존 22개 현금화(결정: 코인 전용 유지) |

**결정 기록(2026-10-01, 사용자 위임):** 기존 꾸미기 18·펫 4 는 코인 전용. 현금은 새 프리미엄 아이템에만.
가격은 원화 직표기(코인 묶음 판매 없음). 확률형 없음.

---

## 2. 현금 전용 아이템 모양

### 2-1. 카탈로그 (`js/cosmetics/catalog.js`)
RAW 행에 `coins` 대신 **`won`** 을 둔다. 둘 중 정확히 하나만 있다.

```js
{ id: 'firefly', slot: 'trail', ico: '🌟', name: '반딧불', won: 4000, tier: '프리미엄' },
{ id: 'rainbow', slot: 'trail', ico: '🌈', name: '무지개', won: 3000, tier: '프리미엄' },
```

`ITEMS` 변환 결과:
- 코인 아이템: `price: { coins, cash: null }` (오늘과 같음 — PRICE_IDS 가 전부 null)
- 현금 전용: `price: { coins: null, won, cash: cashFor(id, null, won) }` → `cash = { priceId, label: '₩4,000' } | null`
- `premium: true` 플래그를 함께 둔다(가게 정렬·배지·연출 분기용). `won` 이 있으면 true.

### 2-2. 라벨 (`js/shop/cash.js`)
`cashFor(id, coins, won)` — `won` 이 있으면 `wonLabel(won)`(`₩4,000`, ko-KR 천 단위), 없으면 기존 규칙(코인 등급표 / 펫 고정).
펫의 "coins null = 펫" 의미는 `won` 유무로 구분되므로 깨지지 않는다.

### 2-3. 가게·옷장 로직 (`js/cosmetics/equip.js`, `wardrobe.js`)
- `canBuy` — `price.coins == null` 이면 `{ ok:false, why:'cash-only' }` (코인으로 못 산다).
- `shopButton` — 현금 전용이면 코인 버튼을 내지 않는다(`null` 반환 → 호출부가 건너뜀).
- 새 순수 함수 `premiumRowMode(item, { owned, platform, online, isGuest, tokenSet })`:

| 상황 | 결과 | 화면 |
|---|---|---|
| 이미 보유 | `'owned'` | "구매 완료"(오늘과 같음) |
| 웹 + 온라인 + 로그인 + 토큰 + priceId | `'buy'` | 현금 버튼 `₩4,000` |
| 웹 + 게스트 | `'login'` | 비활성 버튼 "로그인하면 살 수 있어요"(문구 검수 §8) |
| 웹 + 오프라인 / 토큰·priceId 없음 | `'unavailable'` | 행은 보이되 버튼 비활성 "지금은 살 수 없어요" |
| 토스·안드로이드·itch | `'hidden'` | **행 자체를 그리지 않는다**(외부 결제 안내 금지 — 플레이·토스 정책) |

- 옷장(`js/spaces/wardrobe.js`)은 보유품만 보이므로 모든 플랫폼에서 그대로 장착된다(웹에서 산 걸 앱·토스에서도 쓴다 — 기존 부팅 병합 경로).

### 2-4. 결제·서버
- `functions/api/_paddle.js` 는 이미 `ITEMS` 를 import 해 priceId → item 역조회한다 → 새 항목은 priceId 만 생기면 자동 인식.
- `scripts/paddle-seed.mjs` / `scripts/lib/paddle-seed.mjs` — `buildPlan` 이 코인 아이템 대신 **`premium` 아이템만** 등록하고 금액은 `won` 에서 읽는다. 기존 22개 샌드박스 상품은 건드리지 않는다.
- `js/shop/price-ids.js` 에 `firefly: null, rainbow: null` 칸 추가 → 시드가 채운다.

---

## 3. 자국 조형과 움직임

### 3-1. 바닥 자국 (`js/cosmetics/trail.js` 의 `TRAIL` 표에 두 빌더 추가)
- **firefly**: 짙은 풀색 잎 모양 자국(정점색 1색, 기존 문법). 단일 메시 규칙 유지.
- **rainbow**: 흰색 발바닥형 자국(🐾 paw 빌더를 재사용해 동물별 모양 유지) — 색은 재질 `color` 로 자국마다 입힌다.

### 3-2. 움직임 — 새 모듈 `js/cosmetics/trail-fx.js` (순수 계산 + THREE 렌더 분리)
`updateTrail` 은 자국을 찍을 때 `fx.onStamp(id, pos, ctx)`, 매 프레임 `fx.update(dt, ctx)` 를 부른다. ctx = `{ nightLevel }`.

| id | 찍을 때 | 매 프레임 |
|---|---|---|
| firefly | 밤이면(`nightLevel ≥ NIGHT_MIN`) 반딧불 2개, 낮이면 30% 확률로 1개(희미) | 위로 0.35~0.6/s 떠오르며 좌우로 흔들리고 깜빡임. 수명 3~4.5초 |
| rainbow | 자국 재질 색 = `hueAt(step)`(걸음마다 0.09 씩 색상환 회전, 채도 .85·명도 .6), 반짝이 3개 | 반짝이 0.9초 동안 떠오르며 사라짐 |

- **입자 전부를 `THREE.Points` 하나**(용량 64, 가산 혼합, 원형 글로우 텍스처)로 그린다 → 드로우콜 +1. 슬롯 순환 재사용.
- 순수 함수(테스트 대상): `fireflyCount(nightLevel, rnd)`, `hueAt(step)`, `particleStep(p, dt)` → 새 상태 반환.
- 실내·카페·박물관·광산에서 자국을 끄는 기존 조건이 입자에도 그대로 적용된다(`clearTrail` 이 `fx.clear()` 호출).
- 밤 판정은 `js/daynight.js` 의 `NIGHT_MIN`(0.45) — 반딧불은 밤 콘텐츠라는 기존 규칙을 그대로 따른다.
- 블룸 임계 0.85 규칙(boat-visual-legibility): 반딧불 색 밝기는 임계 아래로 잡아 번지지 않게 하고 실화면으로 확인.

### 3-3. 미리보기
가게·옷장의 자국 미리보기(`js/cosmetics/trail-walk.js`)는 같은 `trail-fx` 를 쓴다. 미리보기는 **항상 밤 값**(nightLevel 1)으로 그려 반딧불이 보이게 한다.

---

## 4. 획득 연출 A — 스포트라이트

새 모듈 `js/shop/purchase-reveal.js` + 오버레이 `#buy-reveal`(index.html). 보물상자 연출(`js/boat-chest-reveal.js`)의 구조(렌더러 1개 재사용, 시간축 함수)를 따르되 파일은 분리한다 — 상자 연출 배선 테스트를 건드리지 않기 위해.

- 시간축(시뮬 A 그대로): 0~0.25s 화면 어두워짐 → 0.25~0.95s 아이템이 easeOutBack 으로 커짐 → 회전 + 빛줄기 + 반짝이 → 1.1s 카드 등장.
- 진열물: 둥근 받침 위에 그 자국 3개(`buildTrailMark`) + 해당 `trail-fx` 입자(밤 값). 반딧불은 병 대신 **실제 자국 + 반딧불** 을 보여 준다(산 것 그대로).
- 카드: 태그 · 이름 · 한 줄 설명 · [바로 걸어보기](장착 후 닫기) · [닫기]. 문구 §8.
- 트리거: 가게에서 결제 직후 지급 확인(`onGranted`)일 때만. 부팅 때 늦게 도착한 지급은 기존 토스트 유지(가게 밖이라 맥락이 없다).
- 2단계에서 `mode: 'boxburst'` 를 같은 모듈에 추가한다(인터페이스: `playPurchaseReveal({ itemId, mode, onWalk, onClose })`).

---

## 5. 가게 화면

- 🎀 꾸미기 가게 발자국 탭 **맨 위**에 프리미엄 행 2개, 행 왼쪽에 작은 `💎` 배지. 아래는 기존 코인 자국.
- 현금 버튼 색은 기존 현금 버튼 스타일 재사용(새 색 도입 안 함).
- 모바일 폭 실측(mobile-hud-layout): 이름 + 배지 + 버튼이 한 줄에 들어가는지 375px 에서 확인.

---

## 6. 상점 열기(`storeOpen=true`) 조건

순서대로, 하나라도 안 되면 열지 않는다.
1. 사용자: Paddle 샌드박스 **클라이언트 토큰**(→ `CONFIG.PADDLE.token`) · **웹훅** 생성(`https://calmforest.cloud/api/paddle-webhook`, transaction.completed·adjustment.created·adjustment.updated) → 시크릿 `npx wrangler secret put PADDLE_WEBHOOK_SECRET`
2. 시드로 두 상품 등록 → price-ids 채움 → 배포 → **샌드박스 테스트 카드 결제** → purchases 행 → 게임 지급·연출·장착 확인 → 환불 시뮬 1회 → 회수 확인
3. 약관 `[법적 이름]`·시행일 채우기, 환불 정책 "미사용 14일" 문구를 "지급 즉시 장착되는 디지털 상품" 에 맞게 고치기(사용자 검수)
4. `storeOpen=true` + `/shop` 가격표는 **프리미엄 아이템만** 표시하도록 빌드 수정(코인 전용 항목은 현금가 열 없음)
5. Paddle 라이브: 도메인 심사 제출 → 승인 후 라이브 토큰·`env:'production'`·라이브 시크릿·`PADDLE_ENV=production` 시드로 라이브 priceId 교체

---

## 7. 트래킹(feature-tracking-checklist)

기존 `cash_checkout_open/close/done`, `cash_grant`, `cash_revoke`, `cosmetic_equip(via)` 를 그대로 쓴다. 추가:

| 이벤트 | 파라미터 | 시점 |
|---|---|---|
| `premium_row_view` | `item_id`, `mode`(buy/login/unavailable) | 발자국 탭을 열어 프리미엄 행이 그려질 때(탭 열림당 1회) |
| `premium_reveal_close` | `item_id`, `via`(walk/close), `ms` | 연출 카드에서 버튼을 누를 때 |

- 축은 키값(item_id). 금액은 GA4 에 보내지 않는다.
- 다음 날 BigQuery 로 `premium_row_view → cash_checkout_open → done → grant → premium_reveal_close` 깔때기 재검증.

---

## 8. 문구(구현 전 사용자 검수 — ui-copy-review-first)

| 자리 | 후보 |
|---|---|
| 반딧불 설명 | 밤이 되면 발자국마다 반딧불이 떠올라요 |
| 무지개 설명 | 걸음마다 일곱 빛깔이 차례로 남아요 |
| 연출 태그 | PREMIUM · 걷는 자국 |
| 연출 버튼 | 바로 걸어보기 / 닫기 |
| 게스트 버튼 | 로그인하면 살 수 있어요 |
| 구매 불가 버튼 | 지금은 살 수 없어요 |
| 영어 | Fireflies rise from your footprints at night · Each step leaves the next color of the rainbow · Walk now / Close · Log in to buy · Not available right now |

---

## 9. 테스트

- `tests/cosmetics-catalog.test.mjs` — `won`/`coins` 중 정확히 하나 · 현금 전용은 `premium:true`·`coins:null` · priceId 전체 유일
- `tests/cash.test.mjs` — `wonLabel` · `cashFor(id,null,won)`
- `tests/cosmetics-equip.test.mjs`(기존 파일 확장) — `canBuy` cash-only · `shopButton` null · `premiumRowMode` 표 전 칸
- `tests/trail-fx.test.mjs` — `fireflyCount` 밤/낮 · `hueAt` 순환 · `particleStep` 불변·수명 종료
- `tests/paddle-seed.test.mjs` — 계획이 프리미엄 2개만, 금액 `won`
- `tests/purchase-reveal-wiring.test.mjs` — index.html 오버레이 마크업·import·onGranted 배선
- 화면: 시뮬과 같은 각도로 PC + 375px 캡처, 밤/낮, 연출 A 전 구간. 드로우콜 측정(자국 착용 시 +1 이내)

## 10. 열린 결정
- 없음. 가격(₩4,000/₩3,000)과 연출·가게 배치는 사용자 위임으로 확정. 문구만 §8 검수를 받는다.
