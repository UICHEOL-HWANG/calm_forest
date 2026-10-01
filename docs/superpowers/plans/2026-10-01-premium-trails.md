# 💎 프리미엄 자국 1단계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현금 전용 아이템 모양을 만들고 🌟반딧불·🌈무지개 자국 2종을 현금으로 팔며, 결제 직후 스포트라이트 연출을 띄운다.

**Architecture:** 카탈로그 행에 `won` 을 두면 현금 전용(`premium`)이 된다. 자국의 바닥 조형은 기존 `trail.js` 빌더에, 움직임(반딧불·반짝이·무지개 색)은 새 `trail-fx.js` 에(순수 계산 + `THREE.Points` 하나) 둔다. 연출은 새 `purchase-reveal.js`(+ 순수 `reveal-pose.js`)가 가게의 `onGranted` 에서 뜬다. 현금 버튼은 `storeOpen` 또는 개발 세션에서만 보인다(토큰을 넣어도 실유저는 못 본다).

**Tech Stack:** Vanilla ES modules · Three.js 0.160(브라우저 importmap — **node 테스트에서는 import 불가**) · node:test · Paddle Billing v1 · Cloudflare Workers

**Spec:** `docs/superpowers/specs/2026-10-01-premium-trails-design.md`

## Global Constraints

- 새 게임 코드는 `js/game.js` 에 몰지 않는다 — game.js 는 배선 몇 줄만(split-files-not-gamejs).
- **node 테스트는 `three` 를 import 할 수 없다.** THREE 가 필요한 모듈은 THREE 를 인자로 받거나(trail.js·trail-fx.js 방식), 순수 부분을 별도 파일로 뺀다. game.js 배선은 `tests/helpers/game-source.mjs` 의 `gameSource()` 로 소스 텍스트를 검사한다.
- 자국 하나 = 단일 메시(trail.js 헤더 규칙). 입자 전체 = `THREE.Points` 1개 → 자국 착용 시 드로우콜 +1 이내.
- 불변: 상태를 바꾸는 순수 함수는 새 객체를 돌려준다.
- 문구는 스펙 §8 후보 그대로 넣고, 사용자 검수 후 바뀌면 문자열만 교체. 모든 새 한국어 문구는 `js/i18n-en.js` 에 영어를 같이 넣는다(키 = 화면 한국어 그대로).
- 가격: `firefly` ₩4,000(`won: 4000`) · `rainbow` ₩3,000(`won: 3000`).
- 토스·안드로이드·itch 에서는 프리미엄 행 자체를 그리지 않는다.
- 테스트: `npm test` (node --test tests/*.test.mjs) 전부 통과가 각 Task 완료 조건.
- 커밋 메시지 끝: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

---

## File Structure

| 파일 | 역할 | 신규/수정 |
|---|---|---|
| `js/shop/cash.js` | `wonLabel`, `cashFor(id, coins, won)` | 수정 |
| `js/shop/price-ids.js` | `firefly`, `rainbow` 칸 | 수정 |
| `js/cosmetics/catalog.js` | `won`·`premium` 행 2개 | 수정 |
| `js/cosmetics/equip.js` | `canBuy` cash-only | 수정 |
| `js/cosmetics/wardrobe.js` | `shopButton` → 현금 전용이면 null | 수정 |
| `js/shop/premium-row.js` | `premiumRowMode` 순수 함수 | 신규 |
| `js/shop/paddle.js` | `cashAvailable` 에 storeOpen/개발 세션 조건 | 수정 |
| `js/cosmetics/trail.js` | `firefly`·`rainbow` 빌더, `tintTrailMark` | 수정 |
| `js/cosmetics/trail-fx.js` | 순수 계산 + `createTrailFx(THREE)` | 신규 |
| `js/cosmetics/trail-walk.js` | 미리보기에 fx(밤 값) | 수정 |
| `js/game.js` | `updateTrail`/`clearTrail` 에 fx 배선 | 수정(몇 줄) |
| `js/spaces/cafe.js` | 프리미엄 행·코인 버튼 생략·연출 호출 | 수정 |
| `js/shop/reveal-pose.js` | 연출 시간축·문구(순수) | 신규 |
| `js/shop/purchase-reveal.js` | 연출 A 렌더 | 신규 |
| `index.html` | `#buy-reveal` 마크업·CSS | 수정 |
| `js/i18n-en.js` | 새 문구 영어 | 수정 |
| `scripts/lib/paddle-seed.mjs`, `scripts/paddle-seed.mjs` | 프리미엄만·`won` 금액 | 수정 |

---

### Task 1: 현금 전용 가격 모양 (cash.js · price-ids.js · catalog.js)

**Files:**
- Modify: `js/shop/cash.js`, `js/shop/price-ids.js`, `js/cosmetics/catalog.js`
- Test: `tests/cash.test.mjs`, `tests/cosmetics-catalog.test.mjs`

**Interfaces:**
- Produces: `wonLabel(won:number) → string` · `cashFor(id, coins, won = null) → {priceId,label}|null` · 카탈로그 아이템 `{ ..., premium?: true, price: { coins: number|null, won?: number, cash } }`

- [ ] **Step 1: 실패 테스트 — tests/cash.test.mjs**

상단 import 줄에 `wonLabel` 을 더한다(`import { cashLabel, cashFor, PET_CASH_LABEL, wonLabel } from '../js/shop/cash.js';`). 끝에 추가:
```js
test('wonLabel — 원화 천 단위', () => {
  assert.equal(wonLabel(4000), '₩4,000');
  assert.equal(wonLabel(3000), '₩3,000');
  assert.equal(wonLabel(12500), '₩12,500');
});

test('cashFor — priceId 없으면 won 이 있어도 null', () => {
  assert.equal(cashFor('nope', null, 4000), null);
});
```
`'PRICE_IDS 는 꾸미기 18 + 펫 4 = 22칸…'` 테스트를 교체:
```js
test('PRICE_IDS 는 꾸미기 20(코인 18 + 프리미엄 2) + 펫 4 = 24칸, 값은 null 이거나 pri_ 로 시작', () => {
  const keys = Object.keys(PRICE_IDS);
  assert.equal(keys.length, 24);
  for (const it of ITEMS) assert.ok(keys.includes(it.id), it.id);
  for (const k of PET_KINDS) assert.ok(keys.includes(k.id), k.id);
  for (const [k, v] of Object.entries(PRICE_IDS)) assert.ok(v === null || /^pri_[a-z0-9]+$/.test(v), `${k}: ${v}`);
  const ids = Object.values(PRICE_IDS).filter(Boolean);
  assert.equal(new Set(ids).size, ids.length, 'priceId 는 항목마다 하나 — 공유하면 역조회가 안 된다');
});
```
`'카탈로그 cash 칸 …'` 테스트의 꾸미기 루프 기대값 줄을 교체:
```js
    assert.deepEqual(it.price.cash, { priceId: pid, label: it.premium ? wonLabel(it.price.won) : cashLabel(it.price.coins) }, it.id);
```

- [ ] **Step 2: 실패 테스트 — tests/cosmetics-catalog.test.mjs**

`'슬롯 4개 · 품목 18종…'`, `'현금 칸 — …'`, `'꾸미기 최저가가…'`, `'발자국은 등급이…'` 네 테스트를 아래로 교체하고 마지막 테스트를 추가:
```js
test('슬롯 4개 · 품목 20종(코인 18 + 프리미엄 2)', () => {
  assert.deepEqual([...SLOTS], ['head', 'neck', 'back', 'trail']);
  assert.equal(ITEMS.length, 20);
  assert.equal(itemsOf('head').length, 7);
  assert.equal(itemsOf('neck').length, 3);
  assert.equal(itemsOf('back').length, 3);
  assert.equal(itemsOf('trail').length, 7);
});

test('가격 — coins 와 won 중 정확히 하나. 현금 칸은 null 이거나 {priceId,label}', () => {
  for (const it of ITEMS) {
    const c = it.price.cash;
    assert.ok(c === null || (typeof c.priceId === 'string' && typeof c.label === 'string'), `${it.id} 의 cash 형태`);
    const hasCoins = Number.isInteger(it.price.coins) && it.price.coins > 0;
    const hasWon = Number.isInteger(it.price.won) && it.price.won > 0;
    assert.ok(hasCoins !== hasWon, `${it.id}: coins/won 중 하나만`);
    assert.equal(!!it.premium, hasWon, `${it.id}: premium ⇔ won`);
  }
});

test('꾸미기 최저가가 일꾼 초빙료(120🪙)보다 훨씬 비싸다 — 집 증축을 밀어내면 안 된다(§2-2)', () => {
  assert.ok(Math.min(...ITEMS.filter(i => !i.premium).map(i => i.price.coins)) >= 600);
});

test('발자국 — 프리미엄 2개가 맨 앞, 코인 자국은 등급이 오를수록 비싸다(§4-4)', () => {
  const t = itemsOf('trail');
  assert.deepEqual(t.map(i => i.id), ['firefly', 'rainbow', 'paw', 'drop', 'flower', 'star', 'sparkle']);
  const coin = t.filter(i => !i.premium);
  assert.deepEqual(coin.map(i => i.tier), ['기본', '기본', '고급', '특별', '특별']);
  for (let i = 1; i < coin.length; i++) assert.ok(coin[i].price.coins > coin[i - 1].price.coins);
});

test('프리미엄 자국 — 원화 가격, 코인 없음(2026-10-01 스펙 §2-1)', () => {
  assert.deepEqual([findItem('firefly').price.won, findItem('rainbow').price.won], [4000, 3000]);
  assert.equal(findItem('firefly').price.coins, null);
  assert.equal(findItem('firefly').tier, '프리미엄');
});
```

- [ ] **Step 3: 실패 확인**

Run: `npm test 2>&1 | grep -E "^# (pass|fail)|^not ok"`
Expected: FAIL — `wonLabel` export 없음, ITEMS 18

- [ ] **Step 4: 구현**

`js/shop/cash.js` — `cashFor` 를 교체하고 `wonLabel` 추가:
```js
/** 원화 표시가 — 현금 전용 아이템(won)의 라벨 */
export function wonLabel(won) {
  return `₩${won.toLocaleString('ko-KR')}`;
}

/** id 의 현금 칸. won 이 있으면 현금 전용(그 금액), 아니면 coins 등급표 / coins 도 null 이면 펫(고정 라벨) */
export function cashFor(id, coins, won = null) {
  const priceId = PRICE_IDS[id];
  if (!priceId) return null;
  if (won != null) return { priceId, label: wonLabel(won) };
  return { priceId, label: coins == null ? PET_CASH_LABEL : cashLabel(coins) };
}
```
`js/shop/price-ids.js` — `// 👣 발자국` 줄 위에:
```js
  // 💎 프리미엄(현금 전용, 2026-10-01 스펙) — scripts/paddle-seed.mjs 가 채운다
  firefly: null, rainbow: null,
```
`js/cosmetics/catalog.js` — `// 👣 발자국` 섹션의 `paw` 행 바로 위에 두 행:
```js
  // 💎 프리미엄 — 현금 전용(won). 코인으로 못 산다(2026-10-01 스펙 §2)
  { id: 'firefly', slot: 'trail', ico: '🌟', name: '반딧불', won: 4000, tier: '프리미엄' },
  { id: 'rainbow', slot: 'trail', ico: '🌈', name: '무지개', won: 3000, tier: '프리미엄' },
```
`ITEMS` 정의 교체:
```js
export const ITEMS = Object.freeze(RAW.map(({ coins = null, won = null, ...it }) => Object.freeze(won != null
  ? { ...it, premium: true, price: { coins: null, won, cash: cashFor(it.id, null, won) } }
  : { ...it, price: { coins, cash: cashFor(it.id, coins) } })));
```
헤더 주석 `▶ price.cash …` 두 줄 아래에: `//  ▶ won 이 있으면 💎 프리미엄(현금 전용) — price.coins 는 null, 라벨은 won 그대로(₩4,000).`

- [ ] **Step 5: 통과 확인**

Run: `npm test 2>&1 | grep -E "^# (pass|fail)|^not ok"`
Expected: 두 파일 통과. 다른 파일이 `price.coins.toLocaleString` 같은 null 접근으로 실패하면(예: `tests/cosmetics-wardrobe.test.mjs`) Task 2 Step 3 의 `shopButton` 변경을 이 Task 에 함께 넣어 전부 통과시킨다.

- [ ] **Step 6: Commit**
```bash
git add js/shop/cash.js js/shop/price-ids.js js/cosmetics/catalog.js tests/cash.test.mjs tests/cosmetics-catalog.test.mjs
git commit -m "feat: 💎 cash-only catalog shape (won/premium) + firefly/rainbow rows"
```

---

### Task 2: 가게 판정 — 코인 구매 차단 · 프리미엄 행 모드 · 현금 버튼 게이트

**Files:**
- Modify: `js/cosmetics/equip.js` (`canBuy`), `js/cosmetics/wardrobe.js` (`shopButton`), `js/shop/paddle.js` (`cashAvailable`, CONFIG import)
- Create: `js/shop/premium-row.js`
- Test: `tests/cosmetics-equip.test.mjs`, `tests/cosmetics-wardrobe.test.mjs`, `tests/premium-row.test.mjs`

**Interfaces:**
- Consumes: Task 1 아이템 모양
- Produces: `canBuy → {ok:false, why:'cash-only'}` · `shopButton(it, cos) → {label,disabled} | null` · `premiumRowMode(item, ctx) → 'owned'|'buy'|'login'|'unavailable'|'hidden'` (ctx = `{ owned, platform, online, isGuest, tokenSet, storeOpen }` 모두 boolean/문자열) · `cashAvailable(state)` 은 추가로 `CONFIG.PADDLE.storeOpen || IS_DEV_SESSION` 를 요구

- [ ] **Step 1: 실패 테스트**

`tests/cosmetics-equip.test.mjs` 끝:
```js
test('canBuy: 현금 전용은 코인으로 못 산다', () => {
  assert.deepEqual(canBuy(emptyCosmetics(), 1e9, 'firefly'), { ok: false, why: 'cash-only' });
});
```
`tests/cosmetics-wardrobe.test.mjs` 끝:
```js
test('shopButton: 현금 전용이면 코인 버튼이 없다(null)', () => {
  assert.equal(shopButton({ id: 'firefly', premium: true, price: { coins: null, won: 4000 } }, own()), null);
});
```
`tests/premium-row.test.mjs` (신규):
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { premiumRowMode } from '../js/shop/premium-row.js';

const it = { id: 'firefly', premium: true, price: { coins: null, won: 4000, cash: { priceId: 'pri_x', label: '₩4,000' } } };
const base = { owned: false, platform: 'web', online: true, isGuest: false, tokenSet: true, storeOpen: true };

test('보유 — 어느 플랫폼이든 owned', () => {
  assert.equal(premiumRowMode(it, { ...base, owned: true }), 'owned');
  assert.equal(premiumRowMode(it, { ...base, owned: true, platform: 'toss' }), 'owned');
});
test('웹 + 로그인 + 토큰 + priceId + 상점 열림 → buy', () => {
  assert.equal(premiumRowMode(it, base), 'buy');
});
test('웹 게스트 → login', () => {
  assert.equal(premiumRowMode(it, { ...base, isGuest: true }), 'login');
});
test('오프라인 · 토큰 없음 · priceId 없음 · 상점 닫힘 → unavailable', () => {
  assert.equal(premiumRowMode(it, { ...base, online: false }), 'unavailable');
  assert.equal(premiumRowMode(it, { ...base, tokenSet: false }), 'unavailable');
  assert.equal(premiumRowMode({ ...it, price: { ...it.price, cash: null } }, base), 'unavailable');
  assert.equal(premiumRowMode(it, { ...base, storeOpen: false }), 'unavailable');
});
test('토스 · 안드로이드 · itch → hidden(외부 결제 안내 금지)', () => {
  for (const platform of ['toss', 'android', 'itch']) assert.equal(premiumRowMode(it, { ...base, platform }), 'hidden', platform);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/premium-row.test.mjs tests/cosmetics-equip.test.mjs tests/cosmetics-wardrobe.test.mjs 2>&1 | grep -E "^# (pass|fail)"`
Expected: FAIL

- [ ] **Step 3: 구현**

`js/cosmetics/equip.js` `canBuy` — `if (cos.owned.includes(id)) …` 줄 다음에:
```js
  if (it.price.coins == null) return { ok: false, why: 'cash-only' };   // 💎 현금 전용 — 코인 경로로는 못 산다
```
`js/cosmetics/wardrobe.js` `shopButton` 교체:
```js
/** 🎀 가게 줄 끝 버튼 — 산 건 다시 못 산다. 입기·벗기는 옷장에서. 💎 현금 전용이면 코인 버튼이 없다(null) */
export function shopButton(it, cos) {
  if (it.price.coins == null) return null;
  if (cos.owned.includes(it.id)) return { label: '구매 완료', disabled: true };
  return { label: `${it.price.coins.toLocaleString()}🪙`, disabled: false };
}
```
`js/shop/premium-row.js` (신규):
```js
// js/shop/premium-row.js
// =============================================================
//  calm forest · 💎 프리미엄(현금 전용) 행을 어떻게 그릴지 — 순수 함수
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-01-premium-trails-design.md §2-3
//  ▶ 토스·안드로이드·itch 는 행 자체를 숨긴다 — 외부 결제 안내 금지(플레이·토스 정책).
//    웹에서 산 건 옷장(보유품만 보임)에서 모든 플랫폼이 장착한다.
// =============================================================

/** @returns {'owned'|'buy'|'login'|'unavailable'|'hidden'} */
export function premiumRowMode(item, { owned, platform, online, isGuest, tokenSet, storeOpen }) {
  if (owned) return 'owned';
  if (platform !== 'web') return 'hidden';
  if (isGuest) return 'login';
  if (!online || !tokenSet || !storeOpen || !item.price.cash) return 'unavailable';
  return 'buy';
}
```
`js/shop/paddle.js` — CONFIG import 줄을 `import { CONFIG, IS_DEV_SESSION } from '../config.js';` 로(기존 import 형태 확인: `grep -n "config.js" js/shop/paddle.js`), `cashAvailable` 교체:
```js
//  현금 버튼이 보이는 조건: 웹 + 온라인 + 로그인 계정 + Paddle 클라이언트 토큰 + **상점이 열렸거나 개발 세션**
//  (샌드박스 토큰으로 검증하는 동안 실유저에게 버튼이 보이면 안 된다 — 개발 세션(?dbg 등)에서만 결제한다).
export function cashAvailable(state) {
  return PLATFORM === 'web' && !!state?.online && !state?.isGuest && !!CONFIG.PADDLE.token
    && (!!CONFIG.PADDLE.storeOpen || IS_DEV_SESSION);
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test 2>&1 | grep -E "^# (pass|fail)|^not ok"`
Expected: 전부 PASS

- [ ] **Step 5: Commit**
```bash
git add js/cosmetics/equip.js js/cosmetics/wardrobe.js js/shop/premium-row.js js/shop/paddle.js tests/cosmetics-equip.test.mjs tests/cosmetics-wardrobe.test.mjs tests/premium-row.test.mjs
git commit -m "feat: 💎 premium row mode + cash-only buy guard; cash buttons need storeOpen or dev session"
```

---

### Task 3: 자국 조형 — firefly·rainbow 빌더 + 색 입히기

**Files:**
- Modify: `js/cosmetics/trail.js` (`TRAIL` 표에 두 항목, 파일 끝에 `tintTrailMark`)
- Test: `tests/trail-marks.test.mjs` (신규 — THREE 없이: 가짜 객체 + 소스 검사)

**Interfaces:**
- Produces: `buildTrailMark(THREE, 'firefly'|'rainbow', opacity, animalId)` → 단일 메시(bake) Group · `tintTrailMark(mark, hex:number) → void`

- [ ] **Step 1: 실패 테스트**
```js
// tests/trail-marks.test.mjs — trail.js 는 THREE 를 인자로 받아 node 에서 import 된다(three 자체는 못 불러온다)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tintTrailMark } from '../js/cosmetics/trail.js';

const src = readFileSync(new URL('../js/cosmetics/trail.js', import.meta.url), 'utf8');

test('TRAIL 표에 firefly·rainbow 빌더가 있다', () => {
  assert.match(src, /\n\s+firefly: \(g, s, o\) =>/);
  assert.match(src, /\n\s+rainbow: \(g, s, o, id\) =>/);
});

test('tintTrailMark — 그 자국 메시들의 재질 color 만 바꾼다', () => {
  const hexes = [];
  const mesh = { isMesh: true, material: { color: { setHex: (h) => hexes.push(h) } } };
  const other = { isMesh: false };
  const mark = { traverse: (fn) => [mesh, other].forEach(fn) };
  tintTrailMark(mark, 0xff0000);
  assert.deepEqual(hexes, [0xff0000]);
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/trail-marks.test.mjs` · Expected: FAIL

- [ ] **Step 3: 구현** — `TRAIL` 표 안 `paw:` 항목이 끝난 뒤에 추가:
```js
    //  💎 반딧불 — 바닥엔 짙은 풀잎 하나(작게). 주인공은 위로 떠오르는 반딧불(trail-fx.js)이다.
    firefly: (g, s, o) => {
      const leaf = petalMesh(s * 1.1, s * 0.55, film(0x5f8f4a, o * 0.8));
      leaf.rotation.x = -Math.PI / 2; leaf.position.y = 0.006;
      g.add(leaf);
    },
    //  💎 무지개 — 🐾 발바닥 모양을 그대로 쓰고(동물마다 다르다) 흰색으로 굽는다.
    //     색은 자국마다 tintTrailMark 로 입힌다 — 정점색 흰색 × 재질 color = 그 색.
    rainbow: (g, s, o, id) => {
      TRAIL.paw(g, s, o, id);
      g.traverse(m => { if (m.isMesh) m.material = film(0xffffff, o); });
    },
```
파일 끝에:
```js
/** 💎 무지개 자국 — 재질 color 로 색을 입힌다. buildTrailMark 는 자국마다 재질을 새로 굽는다(공유 아님) */
export function tintTrailMark(mark, hex) {
  mark.traverse(o => { if (o.isMesh) o.material.color.setHex(hex); });
}
```
⚠️ `petalOf(THREE, len, wide, mat)`(js/cosmetics/art.js) 가 돌려주는 잎의 기본 방향을 확인하고 바닥에 눕도록 `rotation.x` 를 맞춘다. `bake()` 가 정점색을 굽는 방식(재질 color 를 정점색으로 옮기는지)을 `bake` 함수에서 확인 — 정점색이 흰색이 되도록 rainbow 의 film 색을 흰색으로 둔 것이므로, bake 가 원 재질 color 를 정점색으로 옮긴다면 그대로 맞다. 화면 확인은 Task 9.

- [ ] **Step 4: 통과 확인** — Run: `npm test 2>&1 | grep -E "^# (pass|fail)|^not ok"` · Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add js/cosmetics/trail.js tests/trail-marks.test.mjs
git commit -m "feat: 💎 firefly/rainbow trail marks (single mesh) + tintTrailMark"
```

---

### Task 4: 자국 움직임 모듈 `trail-fx.js`

**Files:**
- Create: `js/cosmetics/trail-fx.js`
- Test: `tests/trail-fx.test.mjs`

**Interfaces:**
- Produces:
  - 순수: `FX_IDS` · `fireflyCount(nightLevel, rnd) → 0|1|2` · `hueAt(step) → [0,1)` · `rainbowHex(step) → 0xRRGGBB` · `spawnFirefly(pos, rnd:()=>number) → Particle` · `spawnSpark(pos, hex, rnd) → Particle` · `particleStep(p, dt) → Particle|null`
  - Particle = `{ kind:'fly'|'spark', x, y, z, bx, bz, vy, age, life, phase, hex, size }`
  - 렌더: `createTrailFx(THREE, { cap = 64, rnd = Math.random } = {}) → { points, onStamp(id, pos, {nightLevel}) → {tint:number|null}, update(dt, {nightLevel}), clear() }`

- [ ] **Step 1: 실패 테스트**
```js
// tests/trail-fx.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fireflyCount, hueAt, rainbowHex, spawnFirefly, spawnSpark, particleStep } from '../js/cosmetics/trail-fx.js';
import { NIGHT_MIN } from '../js/daynight.js';

test('fireflyCount — 밤엔 2개, 낮엔 30% 확률로 1개', () => {
  assert.equal(fireflyCount(NIGHT_MIN, 0.99), 2);
  assert.equal(fireflyCount(1, 0), 2);
  assert.equal(fireflyCount(0, 0.29), 1);
  assert.equal(fireflyCount(0, 0.3), 0);
});

test('hueAt — 걸음마다 0.09 씩 돌고 [0,1) 로 감긴다', () => {
  assert.equal(hueAt(0), 0);
  assert.ok(Math.abs(hueAt(1) - 0.09) < 1e-9);
  for (let s = 0; s < 50; s++) { const h = hueAt(s); assert.ok(h >= 0 && h < 1, `${s}: ${h}`); }
  assert.notEqual(rainbowHex(0), rainbowHex(1));
  assert.ok(rainbowHex(0) >= 0 && rainbowHex(0) <= 0xffffff);
});

test('particleStep — 위로 오르고, 입력을 바꾸지 않고, 수명이 끝나면 null', () => {
  const p = spawnFirefly({ x: 0, y: 0, z: 0 }, () => 0.5);
  const q = particleStep(p, 0.1);
  assert.ok(q.y > p.y, '떠오른다');
  assert.equal(p.age, 0, '원본 불변');
  assert.equal(particleStep({ ...p, age: p.life - 0.01 }, 0.1), null);
  const s = spawnSpark({ x: 0, y: 0, z: 0 }, 0xff0000, () => 0.5);
  assert.equal(s.kind, 'spark');
  assert.ok(s.life < 1.5);
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/trail-fx.test.mjs` · Expected: FAIL(모듈 없음)

- [ ] **Step 3: 구현** `js/cosmetics/trail-fx.js` (THREE 는 인자 — 모듈 최상단에서 three 를 import 하지 않는다):
```js
// js/cosmetics/trail-fx.js
// =============================================================
//  calm forest · 💎 자국 움직임 — 반딧불(밤에 떠오름) · 무지개(걸음마다 색 + 반짝이)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-01-premium-trails-design.md §3-2 · 시안 sims/premium-reveal-sim.html
//  ▶ 계산은 순수 함수(테스트), 그리기는 THREE.Points **하나**(드로우콜 +1). THREE 는 인자로 받는다.
//  ▶ 반딧불은 밤 콘텐츠 — 판정은 js/daynight.js 의 NIGHT_MIN(단일 출처).
//  ▶ 블룸 임계 0.85: 반딧불 색은 밝기를 임계 아래로 둔다(번지면 형광 덩어리가 된다).
// =============================================================
import { NIGHT_MIN } from '../daynight.js';

export const FX_IDS = Object.freeze(['firefly', 'rainbow']);
const FLY_HEX = 0xc8e65a;          // 연두빛 — 블룸 임계 아래
const HUE_STEP = 0.09;

export function fireflyCount(nightLevel, rnd) {
  if (nightLevel >= NIGHT_MIN) return 2;
  return rnd < 0.3 ? 1 : 0;
}

export function hueAt(step) {
  const h = (step * HUE_STEP) % 1;
  return h < 0 ? h + 1 : h;
}

/** HSL(h, .85, .6) → 0xRRGGBB */
export function rainbowHex(step) {
  const h = hueAt(step), s = 0.85, l = 0.6;
  const k = (n) => (n + h * 12) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x) => Math.round(x * 255);
  return (to(f(0)) << 16) | (to(f(8)) << 8) | to(f(4));
}

export function spawnFirefly(pos, rnd) {
  return { kind: 'fly', x: pos.x, y: pos.y + 0.12, z: pos.z,
    bx: pos.x + (rnd() - 0.5) * 0.3, bz: pos.z + (rnd() - 0.5) * 0.3,
    vy: 0.35 + rnd() * 0.25, age: 0, life: 3 + rnd() * 1.5, phase: rnd() * 6.28, hex: FLY_HEX, size: 0.22 };
}

export function spawnSpark(pos, hex, rnd) {
  return { kind: 'spark', x: pos.x, y: pos.y + 0.08, z: pos.z,
    bx: pos.x + (rnd() - 0.5) * 0.35, bz: pos.z + (rnd() - 0.5) * 0.35,
    vy: 0.6, age: 0, life: 0.9, phase: rnd() * 6.28, hex, size: 0.12 };
}

/** 한 프레임 진행 — 새 객체. 수명이 다하면 null */
export function particleStep(p, dt) {
  const age = p.age + dt;
  if (age >= p.life) return null;
  const sway = p.kind === 'fly' ? 0.35 : 0;
  return { ...p, age,
    x: p.bx + Math.sin(age * 1.7 + p.phase) * sway,
    z: p.bz + Math.cos(age * 1.3 + p.phase) * sway,
    y: p.y + p.vy * dt };
}

/** 입자 하나의 현재 밝기(0..1) — 반딧불은 깜빡이고 낮엔 희미 */
function alphaOf(p, nightLevel) {
  const fade = 1 - p.age / p.life;
  if (p.kind === 'spark') return fade;
  const blink = 0.5 + 0.5 * Math.sin(p.age * 5 + p.phase);
  return blink * Math.min(1, p.age * 3) * fade * (nightLevel >= NIGHT_MIN ? 1 : 0.35);
}

function glowTexture(THREE) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function createTrailFx(THREE, { cap = 64, rnd = Math.random } = {}) {
  const pos = new Float32Array(cap * 3), col = new Float32Array(cap * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setDrawRange(0, 0);
  const mat = new THREE.PointsMaterial({ size: 0.22, map: glowTexture(THREE), vertexColors: true, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  let live = [], step = 0;
  const tmp = new THREE.Color();

  const push = (p) => { live = [...live, p].slice(-cap); };

  /** 자국을 찍을 때 — rainbow 면 그 자국에 입힐 색을 돌려준다 */
  function onStamp(id, at, { nightLevel }) {
    if (id === 'firefly') {
      for (let i = fireflyCount(nightLevel, rnd()); i > 0; i--) push(spawnFirefly(at, rnd));
      return { tint: null };
    }
    if (id === 'rainbow') {
      const hex = rainbowHex(step++);
      for (let i = 0; i < 3; i++) push(spawnSpark(at, hex, rnd));
      return { tint: hex };
    }
    return { tint: null };
  }

  function update(dt, { nightLevel }) {
    live = live.map(p => particleStep(p, dt)).filter(Boolean);
    live.forEach((p, i) => {
      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
      tmp.setHex(p.hex).multiplyScalar(alphaOf(p, nightLevel));   // 가산 혼합 — 색 × 밝기 = 투명도처럼 보인다
      col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
    });
    geo.setDrawRange(0, live.length);
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }

  function clear() { live = []; geo.setDrawRange(0, 0); }

  return { points, onStamp, update, clear };
}
```

- [ ] **Step 4: 통과 확인** — Run: `npm test 2>&1 | grep -E "^# (pass|fail)|^not ok"` · Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add js/cosmetics/trail-fx.js tests/trail-fx.test.mjs
git commit -m "feat: 💎 trail-fx — firefly/rainbow particles (pure step + single Points)"
```

---

### Task 5: 게임·미리보기 배선

**Files:**
- Modify: `js/game.js` (88행 import · 3357~3390 trail 블록), `js/cosmetics/trail-walk.js`
- Test: `tests/trail-fx-wiring.test.mjs` (신규)

**Interfaces:**
- Consumes: Task 3 `tintTrailMark` · Task 4 `createTrailFx`
- Produces: 없음(배선)

- [ ] **Step 1: 실패 테스트**
```js
// tests/trail-fx-wiring.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';

test('updateTrail 이 fx 를 찍고·흘리고·지운다', () => {
  const src = gameSource();
  assert.match(src, /createTrailFx\(THREE\)/);
  assert.match(src, /trailFx\.onStamp\(id, m\.position, \{ nightLevel \}\)/);
  assert.match(src, /trailFx\.update\(dt, \{ nightLevel \}\)/);
  assert.match(src, /trailFx\.clear\(\)/);
});

test('미리보기도 같은 fx 를 밤 값으로 쓴다', () => {
  const src = readFileSync(new URL('../js/cosmetics/trail-walk.js', import.meta.url), 'utf8');
  assert.match(src, /createTrailFx\(THREE/);
  assert.match(src, /nightLevel: 1/);
});
```
(⚠️ `gameSource()` 의 export 이름·인자를 `tests/helpers/game-source.mjs` 에서 확인하고 맞춘다.)

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/trail-fx-wiring.test.mjs` · Expected: FAIL

- [ ] **Step 3: 구현**

`js/game.js` 88행 import 교체·추가:
```js
import { buildTrailMark, tintTrailMark, TRAIL_CAP, TRAIL_STEP, TRAIL_FADE, TRAIL_SIDE } from './cosmetics/trail.js';   // 👣 발자국 자취(월드 이펙트)
import { createTrailFx } from './cosmetics/trail-fx.js';   // 💎 반딧불·무지개 입자(Points 하나)
```
3359행(`let trailItem = null, trailSide = 1;`) 다음:
```js
const trailFx = createTrailFx(THREE);   // 💎 입자 — 장면에 한 번만 올린다(드로우콜 +1). 첫 updateTrail 때 scene 에 붙인다
```
`clearTrail()` 끝(`trailLive.length = 0;` 다음)에 `trailFx.clear();`
`updateTrail(dt)` 맨 앞 줄에:
```js
  if (!trailFx.points.parent) scene.add(trailFx.points);
```
자국 생성 블록의 `scene.add(m); trailLive.push({ mesh: m, t: 0 });` 다음:
```js
    const { tint } = trailFx.onStamp(id, m.position, { nightLevel });   // 💎 반딧불·무지개
    if (tint != null) tintTrailMark(m, tint);
```
페이드 루프(`for (let i = trailLive.length - 1 …) { … }`) 뒤, 함수 끝:
```js
  trailFx.update(dt, { nightLevel });
```
⚠️ `if (!id || off) { … return; }` 에서 일찍 돌아가므로 입자는 clearTrail 로 지워진다(OK).

`js/cosmetics/trail-walk.js`:
```js
import { createTrailFx } from './trail-fx.js';
```
`makeTrailWalk` 안 `const meshes = [];` 다음:
```js
  const fx = createTrailFx(THREE, { cap: 32 });   // 💎 미리보기는 늘 밤 값 — 반딧불이 보여야 무엇을 사는지 안다
  group.add(fx.points);
```
`update(dt)` 의 `meshes.forEach((m, i) => { … m.position.set(...) … })` 안, `m.position.set` 다음 줄:
```js
      if (k.age <= dt + 1e-6) {                       // 이번 프레임에 새로 나타난 자국
        const { tint } = fx.onStamp(itemId, m.position, { nightLevel: 1 });
        if (tint != null) m.traverse(o => { if (o.isMesh) o.material.color.setHex(tint); });
      }
```
`update` 끝에 `fx.update(dt, { nightLevel: 1 });`
`dispose()` 끝에:
```js
    fx.points.geometry.dispose(); fx.points.material.map.dispose(); fx.points.material.dispose();
```
⚠️ `update(0)` 첫 호출에서 `t = WALK_FADE` 로 시작해 이미 깔린 자국들은 age>0 이라 onStamp 가 안 불린다 → 첫 몇 걸음은 무지개 색이 흰색일 수 있다. 무지개는 `onStamp` 를 못 받은 메시에 `m.userData.tinted` 가 없으면 한 번 칠하는 방식으로 보완한다:
```js
      if (!m.userData.tinted || k.age <= dt + 1e-6) {
        m.userData.tinted = true;
        const { tint } = fx.onStamp(itemId, m.position, { nightLevel: 1 });
        if (tint != null) m.traverse(o => { if (o.isMesh) o.material.color.setHex(tint); });
      }
```
(이 형태를 최종으로 쓴다 — 위 단순형 대신. 메시가 재사용되면 새 자국으로 나타날 때(age≈0) 다시 칠한다.)

- [ ] **Step 4: 통과 확인** — Run: `npm test 2>&1 | grep -E "^# (pass|fail)|^not ok"` · Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add js/game.js js/cosmetics/trail-walk.js tests/trail-fx-wiring.test.mjs
git commit -m "feat: 💎 wire trail-fx into world trail and shop preview"
```

---

### Task 6: 가게 프리미엄 행

**Files:**
- Modify: `js/spaces/cafe.js` (`drawCosMenu`, `closeCosPreview`, import), `js/i18n-en.js`
- Test: `tests/premium-shop-wiring.test.mjs` (신규)

**Interfaces:**
- Consumes: Task 2 `premiumRowMode`, `shopButton → null`, `cashAvailable`
- Produces: 모드별 버튼 · `premium_row_view` 트래킹

- [ ] **Step 1: 실패 테스트**
```js
// tests/premium-shop-wiring.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const cafe = readFileSync(new URL('../js/spaces/cafe.js', import.meta.url), 'utf8');
const en = readFileSync(new URL('../js/i18n-en.js', import.meta.url), 'utf8');

test('가게가 premiumRowMode 로 행을 고르고 hidden 이면 그리지 않는다', () => {
  assert.match(cafe, /import \{ premiumRowMode \} from '\.\.\/shop\/premium-row\.js'/);
  assert.match(cafe, /mode === 'hidden'\) continue/);
  assert.match(cafe, /trackEvent\('premium_row_view'/);
  assert.match(cafe, /const sb = shopButton\(it, gameState\.cosmetics\);\s*\n\s*if \(sb\)/);
});

test('새 문구는 영어 사전에 있다', () => {
  for (const k of ['로그인하면 살 수 있어요', '지금은 살 수 없어요']) assert.ok(en.includes(`'${k}'`), k);
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/premium-shop-wiring.test.mjs` · Expected: FAIL

- [ ] **Step 3: 구현**

cafe.js import 추가(이미 있는 건 중복하지 않는다 — `grep -n "platform.js\|config.js" js/spaces/cafe.js`):
```js
import { premiumRowMode } from '../shop/premium-row.js';
import { PLATFORM } from '../platform.js';
import { CONFIG } from '../config.js';
```
`export function drawCosMenu()` 위에:
```js
//  💎 프리미엄(현금 전용) 행 — 문구는 스펙 2026-10-01 §8 검수 문구
const PREMIUM_LOGIN_MSG = '로그인하면 살 수 있어요';
const PREMIUM_NA_MSG = '지금은 살 수 없어요';
let premiumViewed = new Set();   // 가게를 연 동안 premium_row_view 는 항목당 한 번(닫으면 비운다)
```
`closeCosPreview()` 끝에 `premiumViewed = new Set();`
`drawCosMenu` 의 꾸미기 루프를 다음으로 교체(`for (const it of itemsOf(cosTab)) {` 부터 루프 끝 `}` 까지):
```js
  for (const it of itemsOf(cosTab)) {
    let mode = null;
    if (it.premium) {
      mode = premiumRowMode(it, { owned: gameState.cosmetics.owned.includes(it.id), platform: PLATFORM,
        online: !!authState.online, isGuest: !!authState.isGuest, tokenSet: !!CONFIG.PADDLE.token,
        storeOpen: cashAvailable(authState) });   // cashAvailable = 상점 열림 또는 개발 세션(+웹·로그인·토큰)
      if (mode === 'hidden') continue;
      if (!premiumViewed.has(it.id)) { premiumViewed = new Set([...premiumViewed, it.id]); trackEvent('premium_row_view', { item_id: it.id, mode }); }
    }
    const row = document.createElement('div');
    row.className = 'sh-row' + (cosView().equipped[it.slot] === it.id ? ' try' : '');
    row.innerHTML = `<span>${it.premium ? '💎 ' : ''}${it.ico} ${it.name}</span>`;
    row.onclick = () => tryOnCos(it);                  // 🪞 줄 = 입어보기(구매 아님)
    const buys = document.createElement('div');
    buys.className = 'sh-buys';
    const sb = shopButton(it, gameState.cosmetics);
    if (sb) {
      const btn = document.createElement('button');
      btn.textContent = sb.label;
      const blocked = sb.disabled || pendingCash.has(it.id);   // 💳 결제 확인 대기 중이면 코인 구매도 막는다
      btn.disabled = blocked;
      btn.onclick = (ev) => {
        ev.stopPropagation();                            // 버튼은 사고, 줄은 입어보기 — 겹치지 않게
        if (blocked) return;
        const r = buyCos(gameState.cosmetics, gameState.inventory.coins, it.id);
        if (!r.bought) { ui.toast?.('코인이 모자라요', 2000); return; }
        gameState.cosmetics = equipCos(r.cos, it.id);      // 사면 바로 입힌다
        gameState.inventory.coins = r.coins;
        trackEvent('cosmetic_buy', { item_id: it.id, slot: it.slot, price_coins: it.price.coins, coins_after: r.coins });
        trackEvent('cosmetic_equip', { item_id: it.id, slot: it.slot, action: 'on', via: 'shop' });
        applyCosmetics(gameState.cosmetics);
        cosTryOn = null;                                 // 실제 장착이 바뀌었으니 입어보기는 버린다
        cosPreview?.refresh(null);
        drawCosMenu();
        requestSave();
      };
      buys.appendChild(btn);
    }
    if (it.premium) {
      if (mode === 'buy' || mode === 'owned') buys.appendChild(cashButton(it.price.cash || { label: '', priceId: '' }, it.id, 'cosmetic', mode === 'owned'));
      else {
        const off = document.createElement('button');
        off.className = 'sh-cash'; off.disabled = true;
        off.textContent = mode === 'login' ? PREMIUM_LOGIN_MSG : PREMIUM_NA_MSG;
        buys.appendChild(off);
      }
    } else if (cashAvailable(authState) && it.price.cash) {
      buys.appendChild(cashButton(it.price.cash, it.id, 'cosmetic', gameState.cosmetics.owned.includes(it.id)));
    }
    row.appendChild(buys);
    box.appendChild(row);
  }
```
⚠️ `authState.online` 필드 이름을 `js/supabase-client.js` 의 `state` 에서 확인(`cashAvailable` 이 `state.online` 을 쓰므로 같다).

`js/i18n-en.js` — `'결제를 지금은 열 수 없어요'` 줄 아래:
```js
  '로그인하면 살 수 있어요': 'Log in to buy',
  '지금은 살 수 없어요': 'Not available right now',
```
`'반딧불'`·`'무지개'` 키가 없으면 함께(`grep -n "'반딧불'\|'무지개'" js/i18n-en.js`):
```js
  '반딧불': 'Fireflies',
  '무지개': 'Rainbow',
```

- [ ] **Step 4: 통과 확인** — Run: `npm test 2>&1 | grep -E "^# (pass|fail)|^not ok"`; `node scripts/i18n_check.mjs 2>&1 | tail -3` · Expected: PASS, 새 누락 없음

- [ ] **Step 5: Commit**
```bash
git add js/spaces/cafe.js js/i18n-en.js tests/premium-shop-wiring.test.mjs
git commit -m "feat: 💎 premium rows in cosmetics shop (mode-driven buttons, hidden off-web)"
```

---

### Task 7: 획득 연출 A

**Files:**
- Create: `js/shop/reveal-pose.js` (순수), `js/shop/purchase-reveal.js` (렌더)
- Modify: `index.html` (CSS · 마크업), `js/spaces/cafe.js` (`onGranted`, import), `js/i18n-en.js`
- Test: `tests/reveal-pose.test.mjs`, `tests/purchase-reveal-wiring.test.mjs`

**Interfaces:**
- Consumes: Task 3 `buildTrailMark`, `tintTrailMark` · Task 4 `createTrailFx`
- Produces: `revealPose(t) → { dim, scale, rays, card }` · `REVEAL_COPY[itemId] = { name, desc }` · `playPurchaseReveal({ itemId, animalId, onWalk(ms), onClose(ms) })` · `stopPurchaseReveal()`

- [ ] **Step 1: 실패 테스트**
```js
// tests/reveal-pose.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revealPose, REVEAL_COPY } from '../js/shop/reveal-pose.js';

test('revealPose — 어두워짐 → 커짐(오버슈트) → 카드(1.1s)', () => {
  assert.equal(revealPose(0).scale, 0);
  assert.ok(revealPose(0.25).dim > 0.99);
  const peak = Math.max(...[0.6, 0.7, 0.8, 0.9].map(t => revealPose(t).scale));
  assert.ok(peak > 1.0, 'easeOutBack 오버슈트');
  assert.ok(Math.abs(revealPose(2).scale - 1) < 1e-6);
  assert.equal(revealPose(1.0).card, false);
  assert.equal(revealPose(1.1).card, true);
});

test('문구 — 스펙 §8', () => {
  assert.deepEqual(REVEAL_COPY.firefly, { name: '반딧불 자국', desc: '밤이 되면 발자국마다 반딧불이 떠올라요' });
  assert.deepEqual(REVEAL_COPY.rainbow, { name: '무지개 자국', desc: '걸음마다 일곱 빛깔이 차례로 남아요' });
});
```
```js
// tests/purchase-reveal-wiring.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const cafe = readFileSync(new URL('../js/spaces/cafe.js', import.meta.url), 'utf8');
const rev = readFileSync(new URL('../js/shop/purchase-reveal.js', import.meta.url), 'utf8');

test('오버레이 마크업과 버튼', () => {
  for (const id of ['buy-reveal', 'br-canvas', 'br-name', 'br-desc', 'br-walk', 'br-close']) assert.match(html, new RegExp(`id="${id}"`), id);
});
test('연출은 reveal-pose 의 시간축·문구를 쓴다', () => {
  assert.match(rev, /from '\.\/reveal-pose\.js'/);
});
test('가게 onGranted 가 프리미엄 현금 구매에 연출을 띄운다', () => {
  assert.match(cafe, /playPurchaseReveal\(\{ itemId: c\.itemId/);
  assert.match(cafe, /trackEvent\('premium_reveal_close'/);
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/reveal-pose.test.mjs tests/purchase-reveal-wiring.test.mjs` · Expected: FAIL

- [ ] **Step 3: 구현**

`js/shop/reveal-pose.js`:
```js
// js/shop/reveal-pose.js
// =============================================================
//  calm forest · 💎 획득 연출의 시간축·문구 — 순수(THREE 없음, node 테스트 대상)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-01-premium-trails-design.md §4·§8 · 시안 sims/premium-reveal-sim.html (A)
// =============================================================

export const REVEAL_COPY = Object.freeze({
  firefly: Object.freeze({ name: '반딧불 자국', desc: '밤이 되면 발자국마다 반딧불이 떠올라요' }),
  rainbow: Object.freeze({ name: '무지개 자국', desc: '걸음마다 일곱 빛깔이 차례로 남아요' }),
});

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const easeOutBack = (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

/** 경과 t 초의 모습 — 0~0.25 어두워짐 · 0.25~0.95 커짐(오버슈트) · 1.1 카드 */
export function revealPose(t) {
  const k = clamp01((t - 0.25) / 0.7);
  return { dim: clamp01(t / 0.25), scale: k === 0 ? 0 : easeOutBack(k), rays: k, card: t >= 1.1 };
}
```
`js/shop/purchase-reveal.js`:
```js
// js/shop/purchase-reveal.js
// =============================================================
//  calm forest · 💎 획득 연출 A(스포트라이트) — 현금 구매 직후 "짠"
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-01-premium-trails-design.md §4 · 시안 sims/premium-reveal-sim.html (A)
//  ▶ 보물상자 연출(js/boat-chest-reveal.js)과 같은 틀: 작은 WebGLRenderer 하나를 재사용, 움직임은 시간의 순수 함수(reveal-pose.js).
//  ▶ 진열물 = 받침 위 실제 자국 3개 + 같은 입자(밤 값) — 산 것 그대로를 보여 준다.
//  ▶ 2단계: mode 'boxburst'(B+C) 를 여기에 더한다.
// =============================================================
import * as THREE from 'three';
import { buildTrailMark, tintTrailMark } from '../cosmetics/trail.js';
import { createTrailFx } from '../cosmetics/trail-fx.js';
import { revealPose, REVEAL_COPY } from './reveal-pose.js';

let renderer = null, scene = null, camera = null, raf = 0, rig = null;

function ensure(canvas) {
  if (renderer && renderer.domElement === canvas) return;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.0));
  const sun = new THREE.DirectionalLight(0xffffff, 0.9); sun.position.set(2, 4, 3); scene.add(sun);
  camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(0, 1.1, 1.9); camera.lookAt(0, 0.15, 0);
}

function raysMesh() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'); g.translate(128, 128);
  for (let i = 0; i < 14; i++) {
    g.rotate(Math.PI * 2 / 14);
    const gr = g.createLinearGradient(0, 0, 0, -128);
    gr.addColorStop(0, 'rgba(255,230,160,.5)'); gr.addColorStop(1, 'rgba(255,230,160,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.lineTo(-11, -128); g.lineTo(11, -128); g.closePath(); g.fill();
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.position.set(0, 0.35, -0.6);
  return m;
}

const SPOTS = [[-0.08, 0.16], [0.08, 0], [-0.08, -0.16]];

function showcase(itemId, animalId) {
  const root = new THREE.Group();
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.06, 32), new THREE.MeshStandardMaterial({ color: 0x3e5a46, roughness: 0.8 }));
  plinth.position.y = -0.03; root.add(plinth);
  const fx = createTrailFx(THREE, { cap: 24 });
  root.add(fx.points);
  SPOTS.forEach(([x, z], i) => {
    const m = buildTrailMark(THREE, itemId, 1, animalId);
    m.scale.setScalar(1.6); m.position.set(x, 0.005, z); m.rotation.y = i % 2 ? 0.2 : -0.2;
    const { tint } = fx.onStamp(itemId, m.position, { nightLevel: 1 });
    if (tint != null) tintTrailMark(m, tint);
    root.add(m);
  });
  return { root, fx };
}

function disposeTree(o) {
  o.traverse(m => {
    if (!m.isMesh && !m.isPoints) return;
    m.geometry.dispose();
    if (m.material.map) m.material.map.dispose();
    m.material.dispose();
  });
}

export function stopPurchaseReveal() {
  cancelAnimationFrame(raf); raf = 0;
  if (rig) { scene.remove(rig.root); disposeTree(rig.root); rig = null; }
  document.getElementById('buy-reveal')?.classList.remove('show', 'card');
}

/** onWalk: [바로 걸어보기] · onClose: [닫기] — 연출을 닫은 뒤 부른다. 인자 = 열려 있던 ms */
export function playPurchaseReveal({ itemId, animalId = null, onWalk = () => {}, onClose = () => {} }) {
  const wrap = document.getElementById('buy-reveal');
  const canvas = document.getElementById('br-canvas');
  if (!wrap || !canvas) return;
  stopPurchaseReveal();
  ensure(canvas);
  const copy = REVEAL_COPY[itemId] || { name: itemId, desc: '' };
  document.getElementById('br-name').textContent = copy.name;
  document.getElementById('br-desc').textContent = copy.desc;
  wrap.classList.add('show');
  const w = canvas.clientWidth || 360, h = canvas.clientHeight || 280;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  const { root, fx } = showcase(itemId, animalId);
  const rays = raysMesh(); root.add(rays);
  scene.add(root);
  const t0 = performance.now();
  rig = { root, lastPuff: 0 };
  let last = t0;
  const frame = (now) => {
    if (!rig) return;
    const t = (now - t0) / 1000, dt = Math.min(0.05, (now - last) / 1000); last = now;
    const p = revealPose(t);
    wrap.style.setProperty('--br-dim', String(p.dim));
    root.scale.setScalar(Math.max(0.001, p.scale));
    root.rotation.y = t * 0.6;
    rays.material.opacity = p.rays * 0.9; rays.rotation.set(0, -root.rotation.y, t * 0.15);   // 빛줄기는 늘 카메라를 본다
    if (t - rig.lastPuff > 0.8) {                     // 진열물에선 입자가 계속 피어오르게 — 무지개 색은 처음 칠한 그대로
      rig.lastPuff = t;
      const [x, z] = SPOTS[Math.floor(t) % SPOTS.length];
      fx.onStamp(itemId, { x, y: 0, z }, { nightLevel: 1 });
    }
    fx.update(dt, { nightLevel: 1 });
    if (p.card) wrap.classList.add('card');
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  const done = (cb) => () => { const ms = Math.round(performance.now() - t0); stopPurchaseReveal(); cb(ms); };
  document.getElementById('br-walk').onclick = done(onWalk);
  document.getElementById('br-close').onclick = done(onClose);
}
```
index.html CSS — `#chest-reveal button { … }` 줄 바로 아래:
```css
  #buy-reveal { position: fixed; inset: 0; z-index: 34; display: none; place-items: center; background: rgba(8,6,20, calc(0.85 * var(--br-dim, 0))); }
  #buy-reveal.show { display: grid; }
  #buy-reveal .br-wrap { width: min(420px, 92vw); display: flex; flex-direction: column; align-items: center; }
  #buy-reveal canvas { width: 100%; height: min(320px, 46dvh); display: block; }
  #buy-reveal .br-card { text-align: center; color: #fff; opacity: 0; transform: translateY(14px); transition: opacity .4s, transform .4s; }
  #buy-reveal.card .br-card { opacity: 1; transform: none; }
  #buy-reveal .br-tag { display: inline-block; font-size: 12px; letter-spacing: .08em; padding: 3px 10px; border-radius: 99px; background: rgba(255,215,120,.18); color: #ffd98a; margin-bottom: 8px; }
  #buy-reveal h2 { margin: 0 0 4px; font-size: 22px; }
  #buy-reveal p { margin: 0 0 14px; color: #ddd6ee; font-size: 14px; }
  #buy-reveal .br-row { display: flex; gap: 8px; justify-content: center; }
  #buy-reveal button { border: none; border-radius: 12px; padding: 10px 18px; font-weight: 700; font-size: 14px; cursor: pointer; font-family: inherit; }
  #br-walk { background: #e9a23b; color: #fff; }
  #br-close { background: rgba(255,255,255,.16); color: #fff; }
```
마크업 — `<div id="chest-reveal">…</div>` 블록이 닫힌 직후:
```html
  <!-- 💎 획득 연출 A(스포트라이트) — js/shop/purchase-reveal.js -->
  <div id="buy-reveal">
    <div class="br-wrap">
      <canvas id="br-canvas"></canvas>
      <div class="br-card">
        <div class="br-tag">PREMIUM · 걷는 자국</div>
        <h2 id="br-name"></h2>
        <p id="br-desc"></p>
        <div class="br-row"><button id="br-walk">바로 걸어보기</button><button id="br-close">닫기</button></div>
      </div>
    </div>
  </div>
```
cafe.js import: `import { playPurchaseReveal } from '../shop/purchase-reveal.js';`
cafe.js `onGranted` — `trackEvent('cosmetic_equip', { … via: 'cash' });` 다음 줄:
```js
    if (findItem(c.itemId)?.premium) {
      playPurchaseReveal({ itemId: c.itemId, animalId: gameState.character,
        onWalk: (ms) => { trackEvent('premium_reveal_close', { item_id: c.itemId, via: 'walk', ms }); closeCosShopForWalk(); },
        onClose: (ms) => trackEvent('premium_reveal_close', { item_id: c.itemId, via: 'close', ms }) });
    }
```
`closeCosShopForWalk` 를 cafe.js 에 정의한다 — 가게 패널을 닫는 기존 경로를 찾아(`grep -n "cos-menu\|closeCosPreview()" index.html js/spaces/cafe.js js/game.js | head`) 그것을 부르는 한 줄 함수로:
```js
//  💎 [바로 걸어보기] — 이미 장착됐으니 가게 패널만 닫고 마을로 돌려보낸다
function closeCosShopForWalk() { /* 찾은 닫기 경로 호출 — 예: document.getElementById('cos-close')?.click() */ }
```
(찾은 닫기 버튼 id 로 주석 자리를 실제 코드 한 줄로 바꾼다. 닫기 버튼 클릭이 closeCosPreview 와 트래킹을 함께 처리하는 기존 경로라 그대로 재사용한다.)

i18n-en.js:
```js
  '반딧불 자국': 'Firefly Trail',
  '무지개 자국': 'Rainbow Trail',
  '밤이 되면 발자국마다 반딧불이 떠올라요': 'Fireflies rise from your footprints at night',
  '걸음마다 일곱 빛깔이 차례로 남아요': 'Each step leaves the next color of the rainbow',
  'PREMIUM · 걷는 자국': 'PREMIUM · Trail',
  '바로 걸어보기': 'Walk now',
```
(`'닫기'` 가 없으면 `'닫기': 'Close'` 도.) `br-name`·`br-desc` 는 textContent 로 한국어를 넣는다 — i18n 옵저버가 DOM 텍스트 변화를 번역하는지 `js/i18n.js` 에서 확인하고(MutationObserver 면 OK), 아니면 번역 함수를 import 해 감싼다.

- [ ] **Step 4: 통과 확인** — Run: `npm test 2>&1 | grep -E "^# (pass|fail)|^not ok"` · Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add js/shop/reveal-pose.js js/shop/purchase-reveal.js index.html js/spaces/cafe.js js/i18n-en.js tests/reveal-pose.test.mjs tests/purchase-reveal-wiring.test.mjs
git commit -m "feat: 💎 purchase reveal A (spotlight) on premium cash grant"
```

---

### Task 8: 시드 스크립트 — 프리미엄만, won 금액

**Files:**
- Modify: `scripts/lib/paddle-seed.mjs` (`buildPlan`, 안 쓰는 import 정리), `scripts/paddle-seed.mjs` (`buildPlan(ITEMS)`, PET_KINDS import 삭제, 주석)
- Test: `tests/paddle-seed.test.mjs`

**Interfaces:**
- Consumes: Task 1 `premium`, `price.won`
- Produces: `buildPlan(items) → [{ itemId, kind:'cosmetic', name, description, amount:string, currency:'KRW' }]`

- [ ] **Step 1: 실패 테스트** — `tests/paddle-seed.test.mjs` 의 `'buildPlan — 카탈로그 18 + 펫 4 = 22…'` 와 `'buildPlan — 금액은 cash.js 등급표…'` 를 교체(파일 상단 `PET_KINDS` import 는 쓰지 않으면 삭제):
```js
test('buildPlan — 프리미엄(현금 전용)만, PRICE_IDS 에 칸이 있다', () => {
  const plan = buildPlan(ITEMS);
  assert.deepEqual(plan.map(p => p.itemId), ['firefly', 'rainbow']);
  for (const p of plan) assert.ok(p.itemId in PRICE_IDS, p.itemId);
});

test('buildPlan — 금액은 won, 이름은 "○○ 자국"', () => {
  const by = Object.fromEntries(buildPlan(ITEMS).map(p => [p.itemId, p]));
  assert.equal(by.firefly.amount, '4000');
  assert.equal(by.rainbow.amount, '3000');
  assert.equal(by.firefly.name, '반딧불 자국');
  assert.equal(by.firefly.kind, 'cosmetic');
  assert.equal(by.firefly.currency, 'KRW');
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/paddle-seed.test.mjs` · Expected: FAIL

- [ ] **Step 3: 구현** — `scripts/lib/paddle-seed.mjs` `buildPlan` 교체:
```js
/** 등록할 상품 — 💎 프리미엄(현금 전용, won)만. 기존 코인 아이템·펫은 코인 전용(2026-10-01 결정) */
export function buildPlan(items) {
  return items.filter(it => it.premium).map(it => ({
    itemId: it.id,
    kind: 'cosmetic',
    name: it.slot === 'trail' ? `${it.name} 자국` : it.name,
    description: `calm forest ${SLOT_DESC[it.slot] ?? '꾸미기'} 아이템 (프리미엄)`,
    amount: String(it.price.won),
    currency: CURRENCY,
  }));
}
```
안 쓰게 된 `cashLabel`, `PET_CASH_LABEL` import 삭제(`labelToAmount` 는 남긴다 — 테스트가 쓴다). 헤더 주석의 "아이템을 카탈로그에 추가하고…" 문단 끝에 `프리미엄(won)만 등록한다.` 한 문장.
`scripts/paddle-seed.mjs`: `buildPlan(ITEMS, PET_KINDS)` → `buildPlan(ITEMS)`, `import { PET_KINDS } …` 줄 삭제.

- [ ] **Step 4: 통과 확인** — Run: `npm test 2>&1 | grep -E "^# (pass|fail)|^not ok"`; `node scripts/paddle-seed.mjs --dry-run 2>/dev/null` · Expected: PASS, 표 두 줄(firefly 4000 KRW · rainbow 3000 KRW)

- [ ] **Step 5: Commit**
```bash
git add scripts/lib/paddle-seed.mjs scripts/paddle-seed.mjs tests/paddle-seed.test.mjs
git commit -m "feat: 💎 paddle-seed registers premium items only (won amounts)"
```

---

### Task 9: 화면 검증 · 성능 · 리뷰

**Files:** 코드 변경 없음(발견 시 해당 Task 파일 수정 후 커밋)

- [ ] **Step 1:** `python3 scripts/serve.py 8020`(워크트리면 그 루트에서 — preview_start 는 저장소 루트를 띄운다) → 브라우저 `http://localhost:8020/?dbg` 게스트 진입.
- [ ] **Step 2:** 보유·장착을 개발용으로 넣는다 — `?dbg` 세션의 기존 치트/콘솔 경로를 찾아 쓴다(`grep -n "__dbg\|window.__" js/game.js index.html | head`). 없으면 콘솔에서 게임 모듈의 `gameState` 접근 경로(export)를 찾아 `cosmetics.owned`·`equipped.trail` 을 설정하고 `applyCosmetics` 호출.
- [ ] **Step 3:** 밤·낮 각각 마을을 걸으며 PC + 375px 캡처(game-capture-pitfall: 패널이 가려지면 rAF 가 멈춘다 → 탭을 앞에 둔다 · body.playing). 확인: 반딧불이 밤에 걸음당 2개·낮엔 드묾 · 무지개 색이 걸음마다 바뀜 · 잎 자국이 바닥에 누워 있음.
- [ ] **Step 4:** 드로우콜 — 콘솔에서 `renderer.info.render.calls` 를 자국 미착용/착용 비교(draw-call-optimization 측정법). 기대: 착용 시 +1(Points) 외 증가는 기존 자국과 같음.
- [ ] **Step 5:** 가게 이펙트 탭 — 게스트: 💎 행 2개 맨 위, "로그인하면 살 수 있어요" 비활성, 375px 한 줄에 들어감. 미리보기에서 반딧불·무지개가 보임.
- [ ] **Step 6:** 연출 단독 — 콘솔 `import('/js/shop/purchase-reveal.js').then(m => m.playPurchaseReveal({ itemId: 'firefly' }))` → 0.3·0.7·1.2초 캡처, 두 버튼 동작. rainbow 도.
- [ ] **Step 7:** 토스 확인 — `premiumRowMode` 테스트로 갈음하되, `node scripts/build-ait.mjs` 산출물에 프리미엄 행 숨김 분기(`mode === 'hidden'`)가 포함됐는지 grep.
- [ ] **Step 8:** code-reviewer 에이전트 → CRITICAL/HIGH 수정 → `npm test` → 커밋. dev docs(`dev/active/premium-cosmetics/*-tasks.md`) 체크 갱신.

---

### Task 10: 샌드박스 결제 실검증 (사용자 준비물 필요)

- [ ] **Step 1 (사용자):** Paddle 샌드박스 → Developer Tools → Authentication → Client-side token 발급 → 값 전달(`test_…` 공개값) / Notifications → New destination `https://calmforest.cloud/api/paddle-webhook` (transaction.completed · adjustment.created · adjustment.updated) → 시크릿은 **사용자가 터미널에서** `npx wrangler secret put PADDLE_WEBHOOK_SECRET`
- [ ] **Step 2:** `js/config.js` `PADDLE.token` 에 토큰. `storeOpen` 은 **false 유지**(개발 세션에서만 현금 버튼 — Task 2 게이트).
- [ ] **Step 3 (사용자 터미널):** `export PADDLE_API_KEY=…` → `node scripts/paddle-seed.mjs` → `js/shop/price-ids.js` 의 firefly·rainbow 채워짐 확인 → `npm test` → 커밋
- [ ] **Step 4:** 키 스캔 → main 병합·푸시 → 웹 배포(`npx wrangler deploy`) → `curl -s -o /dev/null -w "%{http_code}" -X POST https://calmforest.cloud/api/paddle-webhook` 이 **401**(서명 없음)인지 — 503 이면 시크릿 미등록
- [ ] **Step 5 (사용자):** 실계정으로 `https://calmforest.cloud/?dbg` 로그인 → 가게 → 반딧불 현금 버튼 → Paddle 샌드박스 테스트 카드(대시보드 문서의 공개 테스트 카드)로 결제 — **카드 입력은 사용자가 직접**
- [ ] **Step 6:** Supabase `select item_id, kind, revoked_at, created_at from purchases order by id desc limit 3` → 행 확인 · 게임에 연출 A · 장착 확인 · Workers 로그 `paddle_webhook` 1줄
- [ ] **Step 7 (사용자):** Paddle 대시보드에서 그 거래 환불 → 다음 부팅에 회수(해제) 확인
- [ ] **Step 8:** 결과를 `dev/active/premium-cosmetics/premium-cosmetics-context.md` 에 기록 → 커밋

---

### Task 11: 상점 열기 + 4곳 배포 + 라이브 심사

- [ ] **Step 1 (사용자 검수):** `pages/terms.html` `[법적 이름]`·시행일, `pages/refund.html` 의 "미사용 14일" 을 "지급 즉시 장착되는 디지털 상품" 기준으로 고친 문안을 보여 주고 승인받는다.
- [ ] **Step 2:** `/shop` 빌드(`scripts/build-web.mjs` 의 `/shop` 블록) — 프리미엄만:
```js
  const { wonLabel } = await import('../js/shop/cash.js');
  const row = (grp, name, won) => `    <tr><td>${grp}</td><td>${name}</td><td>${wonLabel(won)}</td></tr>`;
  const rows = ITEMS.filter(it => it.premium).map(it => row(SLOT_KO[it.slot], `${it.ico} ${it.name}`, it.price.won)).join('\n');
```
(펫·코인 행 제거, `PET_*`·`cashLabel` import 정리) `pages/shop.template.html` 표 머리를 `분류 · 아이템 · 가격` 3칸으로. `grep -rn "shop.template\|/shop" tests/` 로 관련 테스트가 있으면 같이 고친다.
- [ ] **Step 3:** `CONFIG.PADDLE.storeOpen = true` → `npm test` → `node scripts/build-web.mjs` 후 `ls dist | grep -E "terms|refund|shop"` 3개 → 로컬에서 로그인 카드 링크 보임 확인
- [ ] **Step 4:** 배포 체크리스트 4곳: 웹 · 토스(bundle_upload **memo**) · itch zip · 안드로이드 internal+alpha. 키 스캔 후 main + feat/capacitor-app 푸시.
- [ ] **Step 5 (사용자):** Paddle 라이브 대시보드 → 도메인 심사 제출(`calmforest.cloud`)
- [ ] **Step 6 (승인 후):** 라이브 클라이언트 토큰 · `env:'production'` · 라이브 웹훅 시크릿 · `PADDLE_ENV=production node scripts/paddle-seed.mjs`(라이브 API 키)로 priceId 교체 → 배포
- [ ] **Step 7:** 공지(notices_admin.html) — 토스 출시 뒤. 문구는 사용자 검수.
- [ ] **Step 8:** 다음 날 BigQuery 깔때기 재검증(스펙 §7)
