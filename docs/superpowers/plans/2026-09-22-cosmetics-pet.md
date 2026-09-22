# 🎀🐾 꾸미기 아이템 · 판매처 · 지시형 펫 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 캐릭터 꾸미기 18종(머리·목·가방·발자국)과 지시형 펫을 만들고, 둘을 파는 가게를 마을에 세운다.

**Architecture:** `buildAnimalMesh()` 가 빈 앵커 Group 을 반환하게 고치고, 꾸미기 모듈이 그 앵커에 장식을 꽂는다. 장착 변경은 앵커의 자식만 교체한다. 순수 규칙(카탈로그·장착·앵커 계산·펫 행동)은 THREE 의존 없는 모듈로 빼서 `node --test` 가 잠그고, 조형만 THREE 에 의존한다. `game.js` 는 연결만 한다.

**Tech Stack:** Vanilla ES modules · three.js 0.160 · `node --test` (외부 테스트 프레임워크 없음)

**Spec:** [docs/superpowers/specs/2026-09-21-cosmetics-pet-design.md](../specs/2026-09-21-cosmetics-pet-design.md)

## Global Constraints

- **테스트 러너는 `npm test` = `node --test tests/*.test.mjs`** 다. 다른 프레임워크를 들이지 않는다.
- **순수 모듈에만 테스트를 붙인다.** THREE 를 import 하는 파일(`art.js`·`render.js`·`trail.js`·`building.js`)은 node 에서 못 돌린다 — 검수는 `sims/*.html` 이 한다.
- **`js/game.js` 는 15,901줄이다. 새 로직을 여기 쓰지 않는다.** 연결(앵커 반환·패널 열기·프롬프트)만 한다.
- **블룸 임계 `0.85`** — `UnrealBloomPass(res, 0.55, 0.9, 0.85)`. 넓은 면에 쓰는 색은 이 아래로. 검산식은 Rec.709 `(0.2126R + 0.7152G + 0.0722B)/255`.
- **한국어 UI 문자열은 `js/i18n-en.js` 의 `EN` 에 등재한다.** 키는 화면에 보이는 원문 그대로(이모지·공백 포함). 조합 문장의 글루(`" · "`)와 `{0}` 플레이스홀더를 통문장으로 넣지 않는다. 점검: `node scripts/i18n_check.mjs`
- **마을 카메라는 고정이다** — `camOffset = (0, 14, 16)`, 내려보는 각 `41.2°`, 시선은 늘 −Z.
- **안내 문구는 컨텍스트 슬롯이나 프롬프트 줄에만 넣는다.** 월드 라벨로 띄우면 다른 라벨을 가린다(모바일 3단 레이아웃 규칙).
- 새 세이브 필드는 `gameState` 선언부에 기본값을 두고, 로드 시 `if (saved.X) ...` 로 **선택 병합**한다(기존 패턴).
- **알림은 두 갈래다** — 패널 안에서는 `ui.toast?.(문구, ms)`, 월드에서는
  `spawnFloatText(x, y, z, 문구)`(3D 스프라이트라 패널에 가린다). 둘 다 `js/game.js` 에 이미 있다.
- 커밋 메시지는 `<type>: <설명>` (feat/fix/refactor/test/docs).

---

## 파일 구조

### 새로 만드는 파일

| 파일 | 책임 | 테스트 |
|---|---|---|
| `js/cosmetics/catalog.js` | 순수 데이터 — 품목 18종·슬롯·가격·`earSafe`·`anchor` | ✅ |
| `js/cosmetics/equip.js` | 순수 규칙 — 구매 판정·장착/해제·세이브 정화 | ✅ |
| `js/cosmetics/anchors.js` | 순수 계산 — 타원체 표면점·머리 둘레·`DOME_BOT` | ✅ |
| `js/cosmetics/art.js` | 조형 — 앵커에 꽂을 메시 (THREE) | 시뮬 |
| `js/cosmetics/trail.js` | 👣 발자국 조형 + 상수 (THREE) | 시뮬 |
| `js/shop/building.js` | 🏪 가게 건물 + 주인 NPC (THREE) | 시뮬 |
| `js/pet/rules.js` | 순수 규칙 — 할 일 선택·반경·쿨다운·성장 단계 | ✅ |
| `js/pet/render.js` | 따라다니기·이동·맡기기 (THREE) | 시뮬 |
| `js/pet/art.js` | 펫 조형 + 팔레트 (THREE) | 시뮬 |
| `tests/cosmetics-catalog.test.mjs` · `tests/cosmetics-equip.test.mjs` · `tests/cosmetics-anchors.test.mjs` · `tests/pet-rules.test.mjs` | | |

### 고치는 파일

| 파일 | 무엇을 |
|---|---|
| `js/game.js` | `buildAnimalMesh` 앵커 반환 · `applyCosmetics` · 세이브 필드 · 발자국 · 가게 배치 · 상점 패널 · `🐾 맡기기` |
| `index.html` | 꾸미기 상점 패널 마크업 |
| `js/i18n-en.js` | 새 UI 문자열 영어 등재 |
| `sims/cosmetic-sim.html` · `sims/shop-sim.html` · `sims/pet-sim.html` | 복제된 조형을 지우고 모듈 import |

---

## Task 1: 꾸미기 카탈로그

**Files:**
- Create: `js/cosmetics/catalog.js`
- Test: `tests/cosmetics-catalog.test.mjs`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `SLOTS: readonly ['head','neck','back','trail']`
  - `ITEMS: Array<{id, slot, name, ico, price:{coins:number, cash:null}, anchor?:'side'|'back', earSafe?:'low'|'dome', tier?:'기본'|'고급'|'특별'}>`
  - `itemsOf(slot: string): Item[]`
  - `findItem(id: string): Item | null`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```js
// tests/cosmetics-catalog.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SLOTS, ITEMS, itemsOf, findItem } from '../js/cosmetics/catalog.js';

test('슬롯 4개 · 품목 18종 — 스펙 §4 수치 그대로', () => {
  assert.deepEqual([...SLOTS], ['head', 'neck', 'back', 'trail']);
  assert.equal(ITEMS.length, 18);
  assert.equal(itemsOf('head').length, 7);
  assert.equal(itemsOf('neck').length, 3);
  assert.equal(itemsOf('back').length, 3);
  assert.equal(itemsOf('trail').length, 5);
});

test('id 는 중복되지 않는다 — 세이브 키이자 트래킹 축이다', () => {
  const ids = ITEMS.map(i => i.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('현금 칸은 전부 null — 이번엔 결제를 안 붙인다(스펙 §0)', () => {
  for (const it of ITEMS) {
    assert.equal(it.price.cash, null, `${it.id} 의 cash 가 null 이 아니다`);
    assert.ok(Number.isInteger(it.price.coins) && it.price.coins > 0, `${it.id} 코인 가격`);
  }
});

test('꾸미기 최저가가 일꾼 초빙료(120🪙)보다 훨씬 비싸다 — 집 증축을 밀어내면 안 된다(§2-2)', () => {
  assert.ok(Math.min(...ITEMS.map(i => i.price.coins)) >= 600);
});

test('머리 장식은 earSafe 를 반드시 갖는다 — 귀 처리 규칙(§3-3)', () => {
  for (const it of itemsOf('head')) assert.ok(['low', 'dome'].includes(it.earSafe), it.id);
  assert.equal(itemsOf('head').filter(i => i.earSafe === 'dome').length, 4);
});

test('가방류는 side 앵커, 망토만 back — 🦊여우 꼬리 회피(§3-3)', () => {
  assert.equal(findItem('pack').anchor, 'side');
  assert.equal(findItem('basket').anchor, 'side');
  assert.equal(findItem('cape').anchor, 'back');
});

test('발자국은 등급이 오를수록 비싸다(§4-4)', () => {
  const t = itemsOf('trail');
  assert.deepEqual(t.map(i => i.id), ['paw', 'drop', 'flower', 'star', 'sparkle']);
  assert.deepEqual(t.map(i => i.tier), ['기본', '기본', '고급', '특별', '특별']);
  for (let i = 1; i < t.length; i++) assert.ok(t[i].price.coins > t[i - 1].price.coins);
});

test('findItem: 없는 id 는 null', () => {
  assert.equal(findItem('nope'), null);
  assert.equal(findItem('hat_straw'), null, '있지도 않은 옛 id');
  assert.equal(findItem('straw_hat').slot, 'head');
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npm test`
Expected: FAIL — `Cannot find module '../js/cosmetics/catalog.js'`

- [ ] **Step 3: 카탈로그를 쓴다**

```js
// js/cosmetics/catalog.js
// =============================================================
//  calm forest · 🎀 꾸미기 카탈로그 (순수 데이터 — THREE/DOM 의존 없음)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-21-cosmetics-pet-design.md §4
//  ▶ price.cash 는 **전부 null** 이다. 결제는 이번에 안 붙인다(§0).
//    채널이 열리면 이 줄만 { krw, sku } 로 채운다 — UI 는 cash 가 null 이면 버튼을 안 그린다.
//  ▶ earSafe: 머리 장식이 귀를 어떻게 다루는가(§3-3)
//      'low'  위가 트여 귀가 지나간다 · 'dome' 머리를 덮되 테두리가 귀 밑동보다 위
//  ▶ anchor: 슬롯 안에서 **붙을 면**을 아이템이 고른다. 가방류는 옆구리(side),
//    망토만 등(back) — 등 한가운데는 🦊여우 꼬리 자리다.
//  ▶ 테스트: npm test (tests/cosmetics-catalog.test.mjs) — 가격·수량을 여기 못박는다.
// =============================================================

export const SLOTS = Object.freeze(['head', 'neck', 'back', 'trail']);

const P = coins => ({ coins, cash: null });

export const ITEMS = Object.freeze([
  // 🎩 머리 — dome 4 · low 3
  { id: 'beanie',       slot: 'head', ico: '🧶', name: '털모자',        price: P(1600), earSafe: 'dome' },
  { id: 'cap',          slot: 'head', ico: '🧢', name: '캡',            price: P(1500), earSafe: 'dome' },
  { id: 'mushroom',     slot: 'head', ico: '🍄', name: '버섯 모자',     price: P(1800), earSafe: 'dome' },
  { id: 'straw_hat',    slot: 'head', ico: '👒', name: '밀짚모자',      price: P(1200), earSafe: 'dome' },
  { id: 'flower_crown', slot: 'head', ico: '💐', name: '화관',          price: P(1400), earSafe: 'low'  },
  { id: 'leaf_band',    slot: 'head', ico: '🍃', name: '나뭇잎 머리띠', price: P(800),  earSafe: 'low'  },
  { id: 'star_pin',     slot: 'head', ico: '⭐', name: '별 머리핀',     price: P(600),  earSafe: 'low'  },
  // 🧣 목
  { id: 'scarf',  slot: 'neck', ico: '🧣', name: '목도리',      price: P(900) },
  { id: 'bell',   slot: 'neck', ico: '🔔', name: '방울 목걸이', price: P(700) },
  { id: 'bowtie', slot: 'neck', ico: '🎀', name: '나비 넥타이', price: P(850) },
  // 🎒 가방 — 가방류는 옆구리, 망토만 등
  { id: 'pack',   slot: 'back', ico: '🎒', name: '메신저 가방', price: P(1500), anchor: 'side' },
  { id: 'basket', slot: 'back', ico: '🧺', name: '바구니',      price: P(1200), anchor: 'side' },
  { id: 'cape',   slot: 'back', ico: '🦸', name: '망토',        price: P(1800), anchor: 'back' },
  // 👣 발자국 — 값이 오를수록 바닥에 있던 게 공중으로 올라온다
  { id: 'paw',     slot: 'trail', ico: '🐾', name: '발바닥', price: P(700),  tier: '기본' },
  { id: 'drop',    slot: 'trail', ico: '💧', name: '물방울', price: P(900),  tier: '기본' },
  { id: 'flower',  slot: 'trail', ico: '🌸', name: '꽃',     price: P(1500), tier: '고급' },
  { id: 'star',    slot: 'trail', ico: '⭐', name: '별',     price: P(2200), tier: '특별' },
  { id: 'sparkle', slot: 'trail', ico: '✨', name: '반짝이', price: P(2600), tier: '특별' },
]);

/** 그 슬롯의 품목 — 카탈로그 순서 그대로(UI 정렬의 단일 출처) */
export function itemsOf(slot) {
  return ITEMS.filter(i => i.slot === slot);
}

/** id → 품목. 없으면 null(세이브에 낯선 id 가 들어와도 터지지 않게) */
export function findItem(id) {
  return ITEMS.find(i => i.id === id) || null;
}
```

- [ ] **Step 4: 테스트가 통과하는지 본다**

Run: `npm test`
Expected: PASS — 8 tests

- [ ] **Step 5: 커밋**

```bash
git add js/cosmetics/catalog.js tests/cosmetics-catalog.test.mjs
git commit -m "feat: 🎀 꾸미기 카탈로그 18종 — 슬롯·가격·earSafe·anchor"
```

---

## Task 2: 장착 규칙

**Files:**
- Create: `js/cosmetics/equip.js`
- Test: `tests/cosmetics-equip.test.mjs`

**Interfaces:**
- Consumes: `catalog.js` 의 `SLOTS`, `findItem`
- Produces:
  - `emptyCosmetics(): { owned: string[], equipped: Record<slot, string|null> }`
  - `canBuy(cos, coins, id): { ok: boolean, why: ''|'unknown'|'owned'|'poor' }`
  - `buy(cos, coins, id): { cos, coins, bought: boolean }` — **새 객체를 돌려준다(불변)**
  - `equip(cos, id): cos` · `unequip(cos, slot): cos`
  - `equippedItems(cos): Item[]`
  - `sanitize(raw): cos`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```js
// tests/cosmetics-equip.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyCosmetics, canBuy, buy, equip, unequip, equippedItems, sanitize } from '../js/cosmetics/equip.js';

test('emptyCosmetics: 아무것도 없고 네 슬롯이 비어 있다', () => {
  const c = emptyCosmetics();
  assert.deepEqual(c.owned, []);
  assert.deepEqual(c.equipped, { head: null, neck: null, back: null, trail: null });
});

test('canBuy: 모르는 id · 이미 보유 · 코인 부족', () => {
  const c = emptyCosmetics();
  assert.deepEqual(canBuy(c, 99999, 'nope'), { ok: false, why: 'unknown' });
  assert.deepEqual(canBuy(c, 599, 'star_pin'), { ok: false, why: 'poor' });
  assert.deepEqual(canBuy(c, 600, 'star_pin'), { ok: true, why: '' });
  const owned = buy(c, 600, 'star_pin').cos;
  assert.deepEqual(canBuy(owned, 99999, 'star_pin'), { ok: false, why: 'owned' });
});

test('buy: 코인을 깎고 보유에 넣는다 — 원본을 건드리지 않는다(불변)', () => {
  const c = emptyCosmetics();
  const r = buy(c, 1000, 'star_pin');
  assert.equal(r.bought, true);
  assert.equal(r.coins, 400);
  assert.deepEqual(r.cos.owned, ['star_pin']);
  assert.deepEqual(c.owned, [], '원본이 바뀌면 안 된다');
});

test('buy: 못 사면 코인도 보유도 그대로', () => {
  const c = emptyCosmetics();
  const r = buy(c, 100, 'star_pin');
  assert.equal(r.bought, false);
  assert.equal(r.coins, 100);
  assert.deepEqual(r.cos.owned, []);
});

test('equip: 보유한 것만 · 같은 슬롯은 갈아끼운다', () => {
  let c = buy(emptyCosmetics(), 9999, 'star_pin').cos;
  c = buy(c, 9999, 'flower_crown').cos;
  c = equip(c, 'star_pin');
  assert.equal(c.equipped.head, 'star_pin');
  c = equip(c, 'flower_crown');
  assert.equal(c.equipped.head, 'flower_crown', '같은 슬롯이면 교체된다');
  const before = { ...c.equipped };
  c = equip(c, 'beanie');
  assert.deepEqual(c.equipped, before, '안 산 것은 장착되지 않는다');
});

test('unequip: 그 슬롯만 비운다', () => {
  let c = equip(buy(emptyCosmetics(), 9999, 'scarf').cos, 'scarf');
  c = unequip(c, 'neck');
  assert.equal(c.equipped.neck, null);
});

test('equippedItems: 장착한 품목 객체들 — 렌더가 이걸 받아 그린다', () => {
  let c = buy(emptyCosmetics(), 9999, 'scarf').cos;
  c = equip(c, 'scarf');
  assert.deepEqual(equippedItems(c).map(i => i.id), ['scarf']);
  assert.deepEqual(equippedItems(emptyCosmetics()), []);
});

test('sanitize: 세이브의 낯선 id·중복·잘못된 슬롯을 걸러 낸다', () => {
  const c = sanitize({
    owned: ['scarf', 'scarf', 'ghost_item', 42],
    equipped: { head: 'scarf', neck: 'scarf', back: 'nope', trail: null, wing: 'x' },
  });
  assert.deepEqual(c.owned, ['scarf'], '중복·미등록·비문자열 제거');
  assert.equal(c.equipped.head, null, 'scarf 는 neck 이라 head 에 못 온다');
  assert.equal(c.equipped.neck, 'scarf');
  assert.equal(c.equipped.back, null, '카탈로그에 없는 id');
  assert.equal(c.equipped.wing, undefined, '없는 슬롯은 만들지 않는다');
});

test('sanitize: 안 산 것은 장착에서 뺀다 — 세이브 조작 방어', () => {
  const c = sanitize({ owned: [], equipped: { head: 'beanie', neck: null, back: null, trail: null } });
  assert.equal(c.equipped.head, null);
});

test('sanitize: null·잘못된 타입이면 빈 상태', () => {
  assert.deepEqual(sanitize(null), emptyCosmetics());
  assert.deepEqual(sanitize('x'), emptyCosmetics());
  assert.deepEqual(sanitize(undefined), emptyCosmetics());
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npm test`
Expected: FAIL — `Cannot find module '../js/cosmetics/equip.js'`

- [ ] **Step 3: 규칙을 쓴다**

```js
// js/cosmetics/equip.js
// =============================================================
//  calm forest · 🎀 꾸미기 장착 규칙 (순수 함수 — THREE/DOM 의존 없음)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-21-cosmetics-pet-design.md §2·§12
//  ▶ 전부 **새 객체를 돌려준다**. 세이브 객체를 제자리에서 바꾸면 구매 실패·중복 저장을
//    되돌릴 수 없어 사고를 잡기 어렵다.
//  ▶ sanitize 가 있는 이유: 세이브는 클라이언트 권위다(§12-3). 낯선 id 가 들어와도
//    터지지 않아야 하고, **안 산 것이 장착돼 있으면 벗긴다**.
//  ▶ 테스트: npm test (tests/cosmetics-equip.test.mjs)
// =============================================================

import { SLOTS, findItem } from './catalog.js';

/** 빈 상태 — 신규 유저이자 sanitize 의 실패 기본값 */
export function emptyCosmetics() {
  return { owned: [], equipped: Object.fromEntries(SLOTS.map(s => [s, null])) };
}

/** { ok, why } — why 는 UI 가 문구를 고르는 데 쓴다 */
export function canBuy(cos, coins, id) {
  const it = findItem(id);
  if (!it) return { ok: false, why: 'unknown' };
  if (cos.owned.includes(id)) return { ok: false, why: 'owned' };
  if ((coins | 0) < it.price.coins) return { ok: false, why: 'poor' };
  return { ok: true, why: '' };
}

/** { cos, coins, bought } — 못 사면 입력을 그대로 돌려준다 */
export function buy(cos, coins, id) {
  if (!canBuy(cos, coins, id).ok) return { cos, coins, bought: false };
  const it = findItem(id);
  return {
    cos: { owned: [...cos.owned, id], equipped: { ...cos.equipped } },
    coins: coins - it.price.coins,
    bought: true,
  };
}

/** 보유한 것만 장착된다. 같은 슬롯이면 갈아끼운다 */
export function equip(cos, id) {
  const it = findItem(id);
  if (!it || !cos.owned.includes(id)) return cos;
  return { owned: [...cos.owned], equipped: { ...cos.equipped, [it.slot]: id } };
}

export function unequip(cos, slot) {
  if (!SLOTS.includes(slot)) return cos;
  return { owned: [...cos.owned], equipped: { ...cos.equipped, [slot]: null } };
}

/** 장착한 품목 객체들 — 렌더가 이걸 받아 그린다 */
export function equippedItems(cos) {
  return SLOTS.map(s => findItem(cos?.equipped?.[s])).filter(Boolean);
}

/** 세이브에서 읽은 값 → 믿을 수 있는 상태 */
export function sanitize(raw) {
  const out = emptyCosmetics();
  if (!raw || typeof raw !== 'object') return out;
  const owned = Array.isArray(raw.owned) ? raw.owned : [];
  out.owned = [...new Set(owned.filter(id => typeof id === 'string' && findItem(id)))];
  const eq = (raw.equipped && typeof raw.equipped === 'object') ? raw.equipped : {};
  for (const s of SLOTS) {
    const it = findItem(eq[s]);
    out.equipped[s] = (it && it.slot === s && out.owned.includes(it.id)) ? it.id : null;
  }
  return out;
}
```

- [ ] **Step 4: 테스트가 통과하는지 본다**

Run: `npm test`
Expected: PASS — 누적 18개

- [ ] **Step 5: 커밋**

```bash
git add js/cosmetics/equip.js tests/cosmetics-equip.test.mjs
git commit -m "feat: 🎀 꾸미기 장착 규칙 — 구매·장착·세이브 정화"
```

---

## Task 3: 앵커 계산

**Files:**
- Create: `js/cosmetics/anchors.js`
- Test: `tests/cosmetics-anchors.test.mjs`

**Interfaces:**
- Consumes: 없음 (THREE 를 import 하지 않는다 — 숫자 계산만)
- Produces:
  - `SURF = 1.06` · `DOME_BOT = 0.50` · `BAG_DIR: {x,y,z}` (정규화 완료)
  - `onSurf(bs, R, bodyY, x, y, z, out=SURF): {x,y,z}`
  - `ringR(HR, h): number` · `domeTheta(HR, rk): number`
  - `sideAnchor(bs, R, bodyY)` · `backAnchor(bs, R, bodyY)` · `headAnchor(HY)` · `neckAnchor(HR, HY)` · `neckR(HR)`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```js
// tests/cosmetics-anchors.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SURF, DOME_BOT, BAG_DIR, onSurf, ringR, domeTheta,
  sideAnchor, backAnchor, headAnchor, neckAnchor, neckR,
} from '../js/cosmetics/anchors.js';

// 🦊여우 체형 — js/game.js ANIMALS
const FOX = { bs: [0.90, 1.08, 0.90], R: 0.52, HR: 0.37, HY: 1.26 };
const bodyY = FOX.R * FOX.bs[1] + 0.02;
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
const surfQ = (p, bs, R, by) =>
  Math.sqrt((p.x / (bs[0] * R)) ** 2 + ((p.y - by) / (bs[1] * R)) ** 2 + (p.z / (bs[2] * R)) ** 2);

test('상수 — 스펙 §3 확정 수치', () => {
  near(SURF, 1.06); near(DOME_BOT, 0.50);
  near(Math.hypot(BAG_DIR.x, BAG_DIR.y, BAG_DIR.z), 1, 1e-9);
  assert.ok(BAG_DIR.x < 0, '왼쪽이어야 한다 — 도구 든 손이 오른쪽이다');
  assert.ok(BAG_DIR.z > 0, '앞옆구리여야 끈 끝이 몸 뒤로 안 돌아간다');
});

test('onSurf: 몸 표면 **밖**에 놓인다 — 타원 방정식을 풀어야 한다', () => {
  const p = onSurf(FOX.bs, FOX.R, bodyY, -0.8, -0.2, 0.5);
  near(surfQ(p, FOX.bs, FOX.R, bodyY), SURF, 1e-9);
  assert.ok(surfQ(p, FOX.bs, FOX.R, bodyY) > 1, '표면(1.0)보다 밖');
});

test('onSurf: 방향만 쓰고 길이는 무시한다 — 같은 방향이면 같은 점', () => {
  const a = onSurf(FOX.bs, FOX.R, bodyY, -0.8, -0.2, 0.5);
  const b = onSurf(FOX.bs, FOX.R, bodyY, -8, -2, 5);
  near(a.x, b.x); near(a.y, b.y); near(a.z, b.z);
});

test('ringR: 머리 구의 그 높이 단면 — √(HR²−h²)', () => {
  near(ringR(FOX.HR, 0), FOX.HR);
  near(ringR(FOX.HR, 0.6), Math.sqrt(1 - 0.36) * FOX.HR);
  assert.ok(ringR(FOX.HR, 1.5) > 0, '범위를 벗어나도 0 이나 NaN 을 내지 않는다');
});

test('domeTheta: 캡 아래 테두리가 DOME_BOT·HR 에 온다', () => {
  const rk = 1.06, th = domeTheta(FOX.HR, rk);
  near(FOX.HR * rk * Math.cos(th), DOME_BOT * FOX.HR, 1e-9);
});

test('DOME_BOT 은 🐱고양이 귀 밑동(0.46·HR)보다 위다 — 귀가 빠져나온다(§3-3)', () => {
  assert.ok(DOME_BOT > 0.46);
});

test('sideAnchor: 왼쪽 앞, 몸 표면 밖', () => {
  const p = sideAnchor(FOX.bs, FOX.R, bodyY);
  assert.ok(p.x < 0 && p.z > 0);
  near(surfQ(p, FOX.bs, FOX.R, bodyY), SURF, 1e-9);
});

test('backAnchor: 등 표면 — 0.98 이다. 옛 값 0.55 는 몸 속이었다', () => {
  const p = backAnchor(FOX.bs, FOX.R, bodyY);
  near(p.z, -FOX.R * FOX.bs[2] * 0.98);
  assert.ok(Math.abs(p.z) > FOX.R * FOX.bs[2] * 0.9, '몸 속이면 안 된다');
});

test('headAnchor 는 머리 중심 · neck 은 🐶목줄 좌표', () => {
  assert.deepEqual(headAnchor(FOX.HY), { x: 0, y: FOX.HY, z: 0 });
  near(neckAnchor(FOX.HR, FOX.HY).y, FOX.HY - FOX.HR * 0.55);
  near(neckR(FOX.HR), FOX.HR * 0.92);
});

test('체형 7종 전부에서 옆구리 앵커가 몸 밖이다', () => {
  const ANIMALS = [
    [0.90, 1.08, 0.90, 0.52], [1.03, 0.99, 1.00, 0.56], [1.00, 0.96, 1.00, 0.46],
    [0.88, 1.10, 0.88, 0.50], [1.08, 1.00, 1.06, 0.63], [1.08, 1.00, 1.06, 0.63],
    [1.02, 0.94, 1.02, 0.50],
  ];
  for (const [a, b, c, R] of ANIMALS) {
    const bs = [a, b, c], by = R * b + 0.02;
    assert.ok(surfQ(sideAnchor(bs, R, by), bs, R, by) > 1, `체형 ${bs} 에서 앵커가 몸 속`);
  }
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npm test`
Expected: FAIL — `Cannot find module '../js/cosmetics/anchors.js'`

- [ ] **Step 3: 계산을 쓴다**

```js
// js/cosmetics/anchors.js
// =============================================================
//  calm forest · 🎀 꾸미기 앵커 계산 (순수 함수 — THREE 의존 없음)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-21-cosmetics-pet-design.md §3
//
//  ⚠️ 여기서 네 번 틀렸고 원인이 전부 같았다 — **몸은 타원체인데 원으로 계산했다.**
//     ① 원형 링으로 어깨끈 → 배 앞뒤로 튀어나온 훌라후프
//     ② 방향벡터를 그대로 좌표로 → 길이가 1 미만이라 끈이 몸 속에 묻힘
//     ③ 방향벡터 × 체형 배율 → 그래도 표면 안쪽
//     ④ 정옆(z=0)에 매달기 → 끈 끝이 몸 뒤로 돌아가 가방 직전에 잘림
//     타원체 표면까지의 거리는 t = 1/‖(x/a, y/b, z/c)‖ 로 **풀어야** 한다.
//
//  ▶ 끈의 경유점과 가방 앵커를 onSurf() 하나로 잡는다. 좌표를 두 군데서 정하면 또 어긋난다.
//  ▶ 테스트: npm test (tests/cosmetics-anchors.test.mjs)
// =============================================================

/** 몸 표면보다 얼마나 밖에 띄울지 */
export const SURF = 1.06;

/** 모자 아래 테두리 높이(× HR). 🐱고양이 귀 밑동 0.46 보다 위라 귀가 빠져나온다 */
export const DOME_BOT = 0.50;

/** 가방 방향 — 왼쪽 **앞**옆구리. 정옆이면 끈 끝이 몸 뒤로 돌아가 가려진다 */
export const BAG_DIR = (() => {
  const x = -0.80, y = -0.22, z = 0.48, n = Math.hypot(x, y, z);
  return Object.freeze({ x: x / n, y: y / n, z: z / n });
})();

/** 몸(타원체) 표면 **밖**의 점. 방향만 주면 길이를 풀어 준다. bs = bodyScale [a,b,c] */
export function onSurf(bs, R, bodyY, x, y, z, out = SURF) {
  const t = 1 / Math.hypot(x / bs[0], y / bs[1], z / bs[2]);
  return { x: x * t * out * R, y: bodyY + y * t * out * R, z: z * t * out * R };
}

/** 머리 구에서 높이 h(× HR)의 둘레 반지름 — 안 쓰면 띠가 뜨거나 묻힌다 */
export function ringR(HR, h) {
  return Math.sqrt(Math.max(0.04, 1 - h * h)) * HR;
}

/** 캡의 thetaLength — 아래 테두리를 DOME_BOT·HR 에 맞춘다. rk 는 HR 배수(>1 이어야 머리가 안 뚫는다) */
export function domeTheta(HR, rk) {
  return Math.acos(Math.min(0.995, DOME_BOT / rk));
}

export function sideAnchor(bs, R, bodyY) {
  return onSurf(bs, R, bodyY, BAG_DIR.x, BAG_DIR.y, BAG_DIR.z);
}

/** 등 — 몸 **표면**. 아이템이 자기 두께의 절반만큼 바깥(−z)으로 밀어낸다 */
export function backAnchor(bs, R, bodyY) {
  return { x: 0, y: bodyY + R * 0.30, z: -R * bs[2] * 0.98 };
}

/** 머리 **중심**. 높이는 아이템이 저마다 정한다(모자는 위, 머리띠는 이마) */
export function headAnchor(HY) { return { x: 0, y: HY, z: 0 }; }

/** 🐶 목줄이 이미 쓰는 좌표 */
export function neckAnchor(HR, HY) { return { x: 0, y: HY - HR * 0.55, z: 0 }; }
export function neckR(HR) { return HR * 0.92; }
```

- [ ] **Step 4: 테스트가 통과하는지 본다**

Run: `npm test`
Expected: PASS — 누적 28개

- [ ] **Step 5: 커밋**

```bash
git add js/cosmetics/anchors.js tests/cosmetics-anchors.test.mjs
git commit -m "feat: 🎀 앵커 계산 — 타원체 표면점·머리 둘레·dome 테두리"
```

---

## Task 4: 꾸미기 조형을 시뮬에서 모듈로 옮긴다

**Files:**
- Create: `js/cosmetics/art.js`, `js/cosmetics/trail.js`
- Modify: `sims/cosmetic-sim.html`

**Interfaces:**
- Consumes: `anchors.js` 의 `ringR`·`domeTheta`·`DOME_BOT`·`onSurf`·`SURF`
- Produces:
  - `art.js`: `PALETTE: Record<string, number>` · `buildCosmetic(THREE, itemId, k): THREE.Group | null`
    - `k = { R, HR, HY, bs, bodyY, side: {x,y,z}, neckR: number }`
  - `trail.js`: `TRAIL_S = 0.10` · `TRAIL_CAP = 12` · `TRAIL_STEP = 0.6` · `TRAIL_FADE = 1.2` · `TRAIL_SIDE = 0.075` · `buildTrailMark(THREE, itemId, opacity, animalId): THREE.Group`

**왜 `THREE` 를 인자로 받는가:** 이 모듈은 `sims/*.html`(CDN import map)과 게임 번들 양쪽에서 쓰인다. 각자 자기 THREE 를 넘기면 번들이 갈리지 않는다.

- [ ] **Step 1: `js/cosmetics/art.js` 를 만든다**

`sims/cosmetic-sim.html` 의 `P`(팔레트) · `clay`/`soft`/`film` · `petalMesh` · `domeCap`/`domeRim` · `HEAD`/`NECK`/`BACK` 블록을 옮긴다. **시뮬은 검수를 통과한 값이므로 수치를 바꾸지 않는다.**

```js
// js/cosmetics/art.js
// =============================================================
//  calm forest · 🎀 꾸미기 조형
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-21-cosmetics-pet-design.md §4·§11
//  ▶ 검수: sims/cosmetic-sim.html — **이 파일을 import 한다.** 복제본을 두지 않는다
//    (tool-tier-sim 에서 낚싯대 0단계 값이 갈려 역이식된 사고가 있었다).
//  ▶ THREE 를 인자로 받는다 — 시뮬(CDN)과 게임 번들이 각자 자기 THREE 를 넘긴다.
//  ▶ ⚠️ 블룸 임계 0.85 — PALETTE 전 색이 그 아래다. 색을 고치면 luma 를 다시 재라.
// =============================================================

import { ringR, domeTheta, DOME_BOT } from './anchors.js';

export const PALETTE = Object.freeze({
  straw: 0xd9bd7e, strawDark: 0xb99a5c,
  petal: 0xf0b8c8, petalB: 0xc9d4ee, pollen: 0xe8c85e,
  leaf: 0x7fb857, leafLit: 0xa8d478, stem: 0x6e9b4a,
  wool: 0xd97b6c, woolDark: 0xb85f52,
  rope: 0xb08a5e,
  bell: 0xc9a227, bellLit: 0xd9bc5c, bellDark: 0x9c7a1c,   // 놋쇠 — tool-tiers 2단계 금색
  bow: 0xa8505f, bowDark: 0x7e3a48,
  canvas: 0xc2a882, canvasDark: 0x9c8462,
  cape: 0x7a8fc0, capeLine: 0xdcd0bc,
  star: 0xe8d06a, starLit: 0xe6ce78,
  spark: 0xd8c4f0, sparkLit: 0xdcccee,
  drop: 0x9fd0e0, dropLit: 0xb4d8e6,
  paw: 0xb5895f,
  wood: 0xbf9a68,
  shroomCap: 0xc4634f, shroomDot: 0xdccfb8,
});

/** itemId → 앵커에 꽂을 Group. 모르는 id 면 null */
export function buildCosmetic(THREE, itemId, k) {
  // sims/cosmetic-sim.html 의 HEAD/NECK/BACK 조형을 그대로 옮겨 온다.
  // 헬퍼(clay·soft·film·petalMesh·domeCap·domeRim·strapOf)도 같이 옮기고 THREE 를 인자로 받게 한다.
}
```

- [ ] **Step 2: `js/cosmetics/trail.js` 를 만든다 — 자국 하나를 **단일 메시로 병합** 한다**

⚠️ 스펙 §14: 자국 하나가 메시 여러 개면 12개 상한에서 **최대 84 드로우콜**이 된다(반짝이 7개 × 12). 마을 기준선 567에서 15%가 늘어난다. `BufferGeometryUtils.mergeGeometries` 로 굽고, 2색 이상(꽃잎 2색·별 2색)은 **정점색**으로 처리한다 — 🦊여우 꼬리가 쓰는 방식.

```js
// js/cosmetics/trail.js
export const TRAIL_S = 0.10;      // 자국 하나의 기준 반지름(월드) — 1차엔 0.34 로 캐릭터 몸통만 했다
export const TRAIL_CAP = 12;      // 동시 표시 상한
export const TRAIL_STEP = 0.6;    // 이만큼 이동할 때마다 하나
export const TRAIL_FADE = 1.2;    // 초
export const TRAIL_SIDE = 0.075;  // 좌우 번갈아 — 한 줄이면 자국이 아니라 점선이다

/**
 * 자국 하나 → **단일 메시**. 색이 두 가지 이상이면 정점색으로 굽는다.
 * animalId 는 🐾발바닥에만 쓴다(🐰길쭉 · 🐻🐼크게 · 🐤세 갈래).
 */
export function buildTrailMark(THREE, itemId, opacity, animalId) { /* 옮긴 조형 + 병합 */ }
```

- [ ] **Step 3: 시뮬이 모듈을 import 하게 바꾼다**

`sims/cosmetic-sim.html` 상단에 추가하고, 파일 안의 `P`·`HEAD`·`NECK`·`BACK`·`TRAIL` 정의와 `domeCap`/`domeRim`/`strapOf` 헬퍼를 지운다:

```js
import { PALETTE as P, buildCosmetic } from '../js/cosmetics/art.js';
import { buildTrailMark, TRAIL_S, TRAIL_CAP } from '../js/cosmetics/trail.js';
```

- [ ] **Step 4: 시뮬을 열어 눈으로 확인한다**

```bash
open http://localhost:8000/sims/cosmetic-sim.html
```

확인: 머리 7 · 목 3 · 가방 3 · 발자국 5가 **옮기기 전과 똑같이** 보이고, HUD 블룸 검산이 "전 색 통과" 이며, 「동물 호환」에서 7종 전부 귀·꼬리가 멀쩡하다.

- [ ] **Step 5: 커밋**

```bash
git add js/cosmetics/art.js js/cosmetics/trail.js sims/cosmetic-sim.html
git commit -m "refactor: 🎀 꾸미기 조형을 시뮬에서 js/cosmetics 로 — 단일 소스"
```

---

## Task 5: `buildAnimalMesh` 가 앵커를 반환한다

**Files:**
- Modify: `js/game.js` — `buildAnimalMesh`(`return { group: g, tail, armR, armL }` 줄), `applyCharacter`, `buildCharacterMesh`

**Interfaces:**
- Consumes: `anchors.js` 전부, `art.js` 의 `buildCosmetic`, `equip.js` 의 `equippedItems`
- Produces:
  - `buildAnimalMesh(id)` 반환에 `anchors: { head, neck, back, side }`(전부 `THREE.Group`)와 `k: { R, HR, HY, bs, bodyY, side, neckR }` 추가
  - `applyCosmetics(cos): void` — 앵커의 자식만 교체한다

- [ ] **Step 1: import 를 넣는다**

```js
import { headAnchor, neckAnchor, neckR, sideAnchor, backAnchor } from './cosmetics/anchors.js';
import { buildCosmetic } from './cosmetics/art.js';
import { equippedItems, sanitize as sanitizeCosmetics } from './cosmetics/equip.js';
```

- [ ] **Step 2: `buildAnimalMesh` 끝에 앵커를 단다**

`return { group: g, tail, armR, armL };` **직전**에 넣는다. 기존 키는 그대로 두고 추가만 한다 — `applyCharacter`·`buildCharacterMesh`·선택 프리뷰가 이미 쓰고 있다.

```js
  // ── 🎀 꾸미기 앵커 ── (스펙 §3)
  //  ⚠️ 장식을 여기서 만들지 않는다. **빈 Group 만** 달아 두고 js/cosmetics 가 자식을 갈아끼운다.
  //     그래야 장착을 바꿀 때 캐릭터를 통째로 다시 만들지 않는다.
  const kk = { R, HR, HY, bs, bodyY, side: sideAnchor(bs, R, bodyY), neckR: neckR(HR) };
  const anchors = {};
  for (const [name, p] of Object.entries({
    head: headAnchor(HY), neck: neckAnchor(HR, HY),
    back: backAnchor(bs, R, bodyY), side: kk.side,
  })) {
    const a = new THREE.Group();
    a.position.set(p.x, p.y, p.z);
    g.add(a); anchors[name] = a;
  }
  return { group: g, tail, armR, armL, anchors, k: kk };
```

- [ ] **Step 3: 브라우저에서 앵커가 달렸는지 본다**

`applyCharacter` 안에 임시로 `window.__dbgAnchors = built.anchors;` 를 넣고 게임을 띄운 뒤 콘솔에서:

```js
Object.keys(window.__dbgAnchors)   // Expected: ['head','neck','back','side']
```

확인 후 임시 줄을 지운다.

- [ ] **Step 4: `applyCosmetics` 를 쓴다**

`applyCharacter` 바로 아래에 둔다.

```js
// ── 🎀 장착 반영 — 앵커의 **자식만** 교체한다 ──
//   ⚠️ 공유 재질/지오메트리를 dispose 하지 않는다. 다른 곳에서 쓰던 것까지 검게 만든다(§14).
//      인스턴스만 버린다.
let charAnchors = null, charK = null;
function applyCosmetics(cos) {
  if (!charAnchors) return;
  for (const a of Object.values(charAnchors)) a.clear();
  for (const it of equippedItems(cos)) {
    if (it.slot === 'trail') continue;                 // 발자국은 월드 이펙트라 앵커가 아니다
    const m = buildCosmetic(THREE, it.id, charK);
    if (m) charAnchors[it.anchor || it.slot].add(m);   // 아이템이 붙을 면을 고른다
  }
}
```

`applyCharacter` 안 `playerAnchor.add(charGroup);` 다음 줄에:

```js
  charAnchors = built.anchors; charK = built.k;
  applyCosmetics(gameState.cosmetics);
```

- [ ] **Step 5: 콘솔로 장착을 눈으로 확인한다**

```js
gameState.cosmetics.owned.push('straw_hat');
gameState.cosmetics.equipped.head = 'straw_hat';
applyCosmetics(gameState.cosmetics);
```

확인: 모자가 머리에 나타난다. 캐릭터를 🐰토끼·🐤병아리로 바꿔도 **귀·볏이 모자 밖으로 빠져나온다.**

- [ ] **Step 6: 캐릭터 선택 프리뷰에도 반영한다**

`buildCharacterMesh` 는 `.group` 만 쓴다. 프리뷰에도 장착이 보이게 고친다:

```js
function buildCharacterMesh(id) {
  const built = buildAnimalMesh(id);
  for (const it of equippedItems(gameState.cosmetics)) {
    if (it.slot === 'trail') continue;
    const m = buildCosmetic(THREE, it.id, built.k);
    if (m) built.anchors[it.anchor || it.slot].add(m);
  }
  return built.group;
}
```

- [ ] **Step 7: 커밋**

```bash
git add js/game.js
git commit -m "feat: 🎀 buildAnimalMesh 가 꾸미기 앵커를 반환 — 장착은 자식만 교체"
```

---

## Task 6: 세이브 필드

**Files:**
- Modify: `js/game.js` — `gameState` 선언부, 세이브 로드 병합부

**Interfaces:**
- Consumes: `equip.js` 의 `sanitize`(Task 5 에서 `sanitizeCosmetics` 로 import 완료)
- Produces: `gameState.cosmetics` · `gameState.pet`

- [ ] **Step 1: 기본값을 넣는다**

`gameState` 선언부의 `badges: {},` 다음 줄에:

```js
  // 🎀 꾸미기 — 산 것(영구) + 슬롯별 장착. 규칙은 js/cosmetics/equip.js
  cosmetics: { owned: [], equipped: { head: null, neck: null, back: null, trail: null } },
  // 🐾 펫 — null 이면 아직 안 샀다. 규칙은 js/pet/rules.js
  //    works 누적 작업 횟수(→ 성장 단계) · restUntil 쿨다운 종료(epoch ms)
  pet: null,
```

- [ ] **Step 2: 로드 시 병합을 넣는다**

세이브 로드부, `if (saved.inventory) Object.assign(...)` 근처에. **기존 선택 병합 패턴을 따른다.**

```js
  // 🎀 꾸미기 — 낯선 id·안 산 것의 장착을 걸러 낸다(세이브는 클라이언트 권위다)
  if (saved.cosmetics) gameState.cosmetics = sanitizeCosmetics(saved.cosmetics);
  // 🐾 펫 — saved 가 왔다는 것 자체가 읽기 성공이라는 뜻이므로, 필드가 없으면 신규가 맞다.
  //    (읽기 실패를 신규로 오인해 마을을 덮어쓴 사고는 js/save-guard.js 가 앞단에서 막는다)
  if (saved.pet && typeof saved.pet === 'object' && typeof saved.pet.kind === 'string') {
    gameState.pet = {
      kind: saved.pet.kind,
      name: typeof saved.pet.name === 'string' ? saved.pet.name : '',
      works: Number.isFinite(saved.pet.works) ? Math.max(0, Math.floor(saved.pet.works)) : 0,
      restUntil: Number.isFinite(saved.pet.restUntil) ? saved.pet.restUntil : 0,
    };
  }
```

- [ ] **Step 3: 기존 세이브가 멀쩡한지 확인한다**

게임을 새로고침해 **기존 마을이 그대로 뜨는지** 본다. 그리고 콘솔에서:

```js
// Expected: 안 산 것이 벗겨져 head 가 null
sanitizeCosmetics({ owned: [], equipped: { head: 'beanie' } }).equipped.head
```

- [ ] **Step 4: 커밋**

```bash
git add js/game.js
git commit -m "feat: 🎀🐾 세이브 필드 추가 — 기존 세이브 무해 병합"
```

---

## Task 7: 발자국 이펙트

**Files:**
- Modify: `js/game.js`

**Interfaces:**
- Consumes: `trail.js` 의 `buildTrailMark`·`TRAIL_CAP`·`TRAIL_STEP`·`TRAIL_FADE`·`TRAIL_SIDE`
  (`TRAIL_S` 는 조형 안에서만 쓴다)

- [ ] **Step 1: 풀을 만든다**

```js
// ── 👣 발자국 ── (스펙 §4-4)
//  ⚠️ 매번 생성·파괴하면 드로우콜과 GC 가 튄다. 풀에서 재사용한다.
//  ⚠️ 실내·클로즈업·미니게임에서는 끈다 — 바닥이 없거나 카메라가 붙는다.
const trailPool = [], trailLive = [];
const trailLastPos = new THREE.Vector3();
let trailItem = null, trailSide = 1;

function clearTrail() {
  for (const e of trailLive) { scene.remove(e.mesh); trailPool.push(e.mesh); }
  trailLive.length = 0;
}

function updateTrail(dt) {
  const id = gameState.cosmetics.equipped.trail;
  if (id !== trailItem) { clearTrail(); trailPool.length = 0; trailItem = id; }
  const off = indoor || atCafe || atMuseum || atMine;
  if (!id || off) { if (trailLive.length) clearTrail(); return; }

  if (player.position.distanceTo(trailLastPos) >= TRAIL_STEP) {
    trailLastPos.copy(player.position);
    trailSide = -trailSide;                               // 좌우 번갈아 — 한 줄이면 점선이다
    const m = trailPool.pop() || buildTrailMark(THREE, id, 1, gameState.character);
    m.position.set(player.position.x + trailSide * TRAIL_SIDE, 0, player.position.z);
    m.rotation.y = trailSide * 0.2;
    scene.add(m); trailLive.push({ mesh: m, t: 0 });
    while (trailLive.length > TRAIL_CAP) {
      const old = trailLive.shift(); scene.remove(old.mesh); trailPool.push(old.mesh);
    }
  }
  for (let i = trailLive.length - 1; i >= 0; i--) {
    const e = trailLive[i]; e.t += dt;
    const k = Math.max(0, 1 - e.t / TRAIL_FADE);
    e.mesh.traverse(o => { if (o.material) o.material.opacity = k; });
    if (k <= 0) { scene.remove(e.mesh); trailPool.push(e.mesh); trailLive.splice(i, 1); }
  }
}
```

프레임 루프에서 `updateTrail(dt)` 를 부른다.

- [ ] **Step 2: 눈으로 확인한다**

```js
gameState.cosmetics.owned.push('paw');
gameState.cosmetics.equipped.trail = 'paw';
```

확인: 걸을 때 자국이 **좌우 번갈아** 남고 1.2초 뒤 사라지며, 동시에 12개를 안 넘는다. 집에 들어가면 꺼진다. 캐릭터를 🐤병아리로 바꾸면 **세 갈래 새발자국**이 된다.

- [ ] **Step 3: 드로우콜을 잰다**

```js
renderer.info.render.calls
```
Expected: 자국이 최대로 깔렸을 때도 **+12 안쪽** — 자국 하나가 단일 메시로 병합돼 있어야 한다

- [ ] **Step 4: 커밋**

```bash
git add js/game.js
git commit -m "feat: 👣 발자국 이펙트 — 풀 재사용·12개 상한·실내 차단"
```

---

## Task 8: 🏪 가게 건물과 주인

**Files:**
- Create: `js/shop/building.js`
- Modify: `sims/shop-sim.html`, `js/game.js`

**Interfaces:**
- Consumes: `js/animal-faces.js` 의 `buildAnimalHead`(인자로 받는다)
- Produces: `SHOP_W`·`SHOP_H`·`SHOP_D`·`SHOP_T` · `buildShop(THREE, buildAnimalHead): { group, owner, lamp }` · `updateShopOwner(shop, t): void`

- [ ] **Step 1: 조형을 `sims/shop-sim.html` 에서 모듈로 옮긴다**

시뮬은 41.2° 검수를 통과했다. **수치를 바꾸지 않는다.** 확정된 것:

| 항목 | 값 | 이유 |
|---|---|---|
| 지붕 | **B안** — 뒤 60%만 | A·C 는 지붕이 내부를 덮는다(§5-2) |
| 주인 크기 | 몸 R `0.50`(y 0.55) · 머리 R `0.38`(y 1.15) | 게임 주민과 같은 크기. 작으면 카운터(1.05)에 가린다(§5-3) |
| 차양 | **창 위에만**, 정점색 한 덩어리 | 정면 전체면 문 베이까지 덮는다 |
| 주인 배회 | `x −1.67 ~ −1.03` | 창 허리벽을 넘으면 몸통이 잘린다 |
| 간판 | 건물 **옆으로** 돌출 | 벽에 붙이면 뜨고, 앞으로 내면 묻힌다 |
| 문짝 높이 | `2.05` | `2.6` 은 간판을 스친다 |
| 벽 두께 | `0.09` | |
| 벽 색 | `0xf2e4cf` | 카페 회벽(0.973)에 노란기를 더해 따뜻하게 |

- [ ] **Step 2: 시뮬이 모듈을 import 하게 바꾼다**

```js
import { buildShop, updateShopOwner } from '../js/shop/building.js';
```

- [ ] **Step 3: 시뮬로 확인한다 — 41.2° 에서 주인이 보이는가**

```bash
open http://localhost:8000/sims/shop-sim.html
```

확인: `📐 마을 41°` 를 누른 상태에서 **주인이 문 베이에서 몸 전체로 보이고**, 배회해도 가게를 안 벗어난다. 밤 조명에서도 등불로 보인다.

- [ ] **Step 4: 마을에 세운다**

`js/game.js` 에서 다른 건물과 같은 방식으로 배치한다. ⚠️ **정면을 +Z 로** 둔다 — 카메라 시선이 늘 −Z 라 그래야 안이 보인다.

```js
// 🏪 꾸미기 가게 — 정면은 반드시 +Z (camOffset 고정, 시선이 늘 −Z)
const shopObj = buildShop(THREE, buildAnimalHead);
shopObj.group.position.set(SHOP_POS.x, 0, SHOP_POS.z);
scene.add(shopObj.group);
solidCircle(SHOP_POS.x, SHOP_POS.z, 2.4);   // 통과 못 함
```

프레임 루프에서 `updateShopOwner(shopObj, clock.getElapsedTime())`.

- [ ] **Step 5: 인게임에서 확인한다**

확인: 마을을 걸어 가게 앞에 섰을 때 **주인이 안에서 움직이는 게 보이고**, 벽이 블룸으로 하얗게 뜨지 않는다.

```js
renderer.info.render.calls   // Expected: 카페(병합 후 24)와 비슷한 수준
```

- [ ] **Step 6: 커밋**

```bash
git add js/shop/building.js sims/shop-sim.html js/game.js
git commit -m "feat: 🏪 꾸미기 가게 — 41.2°에서 안이 보이는 디오라마 + 주인 배회"
```

---

## Task 9: 꾸미기 상점 패널

**Files:**
- Modify: `index.html`, `js/game.js`, `js/i18n-en.js`

⚠️ 스펙 §5-7 — 풍성한 미리보기 UI 는 **열린 결정**이다. 이 태스크는 **바닥**만 만든다: 기존 `.panel`/`dm-head`/`ck-tabs` 를 재사용한 슬롯 탭 + 목록 + 구매/장착. 미리보기는 "사면 바로 입혀진다"로 대신한다(월드의 내 캐릭터가 곧 미리보기다).

- [ ] **Step 1: 마크업을 넣는다**

`index.html` 의 `#shop-menu` 블록 다음에:

```html
  <!-- 🎀 꾸미기 상점 — shop-menu 스타일 재사용 -->
  <div id="cos-menu" class="panel">
    <div class="dm-head">🎀 꾸미기 <span id="cos-coin" class="ck-inv"></span></div>
    <div class="ck-tabs" id="cos-tabs"></div>
    <div id="cos-items"></div>
    <div class="dm-actions"><button id="cos-close">닫기</button></div>
  </div>
```

- [ ] **Step 2: 탭과 목록을 그린다**

```js
// 🎀 꾸미기 상점 — 목록은 카탈로그 순서 그대로(정렬의 단일 출처)
const COS_TABS = [['head', '🎩 머리'], ['neck', '🧣 목'], ['back', '🎒 가방'], ['trail', '👣 발자국']];
let cosTab = 'head';

function drawCosMenu() {
  document.getElementById('cos-coin').textContent = `🪙 ${gameState.inventory.coins.toLocaleString()}`;
  const tabs = document.getElementById('cos-tabs');
  tabs.innerHTML = '';
  for (const [id, label] of COS_TABS) {
    const b = document.createElement('button');
    b.className = 'sh-tab' + (cosTab === id ? ' active' : '');
    b.textContent = label;
    b.onclick = () => { cosTab = id; drawCosMenu(); };
    tabs.appendChild(b);
  }
  const box = document.getElementById('cos-items');
  box.innerHTML = '';
  for (const it of itemsOf(cosTab)) {
    const owned = gameState.cosmetics.owned.includes(it.id);
    const on = gameState.cosmetics.equipped[it.slot] === it.id;
    const row = document.createElement('div');
    row.className = 'sh-row';
    row.innerHTML = `<span>${it.ico} ${it.name}</span>`;
    const btn = document.createElement('button');
    btn.textContent = on ? '벗기' : owned ? '착용' : `${it.price.coins.toLocaleString()}🪙`;
    btn.onclick = () => {
      if (on) gameState.cosmetics = unequipCos(gameState.cosmetics, it.slot);
      else if (owned) gameState.cosmetics = equipCos(gameState.cosmetics, it.id);
      else {
        const r = buyCos(gameState.cosmetics, gameState.inventory.coins, it.id);
        if (!r.bought) { ui.toast?.('코인이 모자라요', 2000); return; }
        gameState.cosmetics = equipCos(r.cos, it.id);      // 사면 바로 입힌다
        gameState.inventory.coins = r.coins;
        trackEvent('cosmetic_buy', { item_id: it.id, slot: it.slot, price_coins: it.price.coins, coins_after: r.coins });
      }
      trackEvent('cosmetic_equip', { item_id: it.id, slot: it.slot, action: on ? 'off' : 'on' });
      applyCosmetics(gameState.cosmetics);
      drawCosMenu();
      saveGame(gameState);
    };
    row.appendChild(btn);
    box.appendChild(row);
  }
}
```

import 에 추가:

```js
import { itemsOf } from './cosmetics/catalog.js';
import { buy as buyCos, equip as equipCos, unequip as unequipCos } from './cosmetics/equip.js';
```

- [ ] **Step 3: 가게 앞에서 열리게 한다**

가게 근처에 서면 프롬프트 줄에 안내를 띄우고, 누르면 `#cos-menu` 에 `show` 를 건다. ⚠️ 안내는 **프롬프트 줄에만** — 월드 라벨로 띄우면 다른 라벨을 가린다.

```js
trackEvent('shop_enter', { from: 'walk' });
trackEvent('shop_open', { tab: 'cosmetics' });
```

- [ ] **Step 4: i18n 을 등재한다**

`js/i18n-en.js` 의 `EN` 에 추가한다. ⚠️ 조합 문장의 글루와 `{0}` 를 통문장으로 넣지 않는다.

```js
  // ── 🎀 꾸미기 상점 ─────────────────────────────────────────
  '🎀 꾸미기': '🎀 Dress Up',
  '착용': 'Wear', '벗기': 'Take off',
  '코인이 모자라요': 'Not enough coins',
  '🎩 머리': '🎩 Head', '🧣 목': '🧣 Neck', '🎒 가방': '🎒 Bag', '👣 발자국': '👣 Trail',
  '털모자': 'Wool Hat', '캡': 'Cap', '버섯 모자': 'Mushroom Hat', '밀짚모자': 'Straw Hat',
  '화관': 'Flower Crown', '나뭇잎 머리띠': 'Leaf Band', '별 머리핀': 'Star Pin',
  '목도리': 'Scarf', '방울 목걸이': 'Bell Collar', '나비 넥타이': 'Bow Tie',
  '메신저 가방': 'Messenger Bag', '바구니': 'Basket', '망토': 'Cape',
  '발바닥': 'Paw Print', '물방울': 'Droplet', '반짝이': 'Sparkle',
```

- [ ] **Step 5: 커버리지를 점검한다**

Run: `node scripts/i18n_check.mjs`
Expected: 새로 넣은 한국어 문자열이 미등재 목록에 없다

- [ ] **Step 6: 인게임에서 사 보고 모바일 폭을 잰다**

확인: 사면 바로 입혀지고 새로고침해도 유지된다. **모바일 폭(375px)에서 버튼이 안 넘친다.**

- [ ] **Step 7: 커밋**

```bash
git add index.html js/game.js js/i18n-en.js
git commit -m "feat: 🎀 꾸미기 상점 패널 — 슬롯 탭·구매·즉시 착용"
```

---

## Task 10: 펫 규칙

**Files:**
- Create: `js/pet/rules.js`
- Test: `tests/pet-rules.test.mjs`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `PET_PRICE = 3000` · `PET_RADIUS = 4.5` · `PET_TASKS` · `GROW_NEED = [0, 40, 140]` · `WORK_SEC = 2.5` · `REST_SEC = 20` · `CHAIN_MAX = 5`
  - `emptyPet(kind)` · `stageOf(works)` · `toNextStage(works)` · `canCommand(pet, now)` · `pickPetTask(plots, center, radius)` · `afterWork(pet, done, now)`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```js
// tests/pet-rules.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PET_PRICE, PET_RADIUS, PET_TASKS, GROW_NEED, REST_SEC, CHAIN_MAX,
  emptyPet, stageOf, toNextStage, canCommand, pickPetTask, afterWork,
} from '../js/pet/rules.js';

test('표: 펫은 잡일만 한다 — 수확·파종은 없다(스펙 §7-1)', () => {
  assert.deepEqual([...PET_TASKS], ['water', 'weed', 'pest']);
  assert.ok(!PET_TASKS.includes('harvest'), '수확은 보상이라 뺏으면 안 된다');
  assert.ok(!PET_TASKS.includes('plant'));
});

test('표: 성장 문턱은 일꾼(120/400)보다 낮다 — 펫은 일을 덜 한다(§8-1)', () => {
  assert.deepEqual([...GROW_NEED], [0, 40, 140]);
  assert.ok(GROW_NEED[1] < 120 && GROW_NEED[2] < 400);
});

test('stageOf / toNextStage: 40 · 140 경계', () => {
  assert.equal(stageOf(0), 0); assert.equal(stageOf(39), 0); assert.equal(stageOf(40), 1);
  assert.equal(stageOf(139), 1); assert.equal(stageOf(140), 2); assert.equal(stageOf(99999), 2);
  assert.equal(stageOf(undefined), 0, '세이브에 없으면 1단계');
  assert.equal(toNextStage(0), 40); assert.equal(toNextStage(40), 100); assert.equal(toNextStage(140), null);
});

test('canCommand: 쿨다운이 끝나야 시킬 수 있다 — 일급 대신 브레이크(§7-4)', () => {
  const p = emptyPet('spirit');
  assert.equal(canCommand(p, 1000), true);
  assert.equal(canCommand({ ...p, restUntil: 5000 }, 4999), false);
  assert.equal(canCommand({ ...p, restUntil: 5000 }, 5000), true);
  assert.equal(canCommand(null, 1), false, '펫이 없으면 못 시킨다');
});

test('pickPetTask: 반경 밖은 안 건드린다 — 밭 전체는 일꾼의 몫(§6-2)', () => {
  const far = [{ i: 0, x: 99, z: 0, state: 'growing', wet: false, weed: false, pest: false }];
  assert.equal(pickPetTask(far, { x: 0, z: 0 }, PET_RADIUS), null);
});

test('pickPetTask: 물 > 잡초 > 해충 순 — 시들기 임박한 것부터', () => {
  const plots = [
    { i: 1, x: 1, z: 0, state: 'growing', wet: true,  weed: true,  pest: false },
    { i: 2, x: 2, z: 0, state: 'growing', wet: false, weed: false, pest: false, wiltAt: 50 },
    { i: 3, x: 1, z: 1, state: 'growing', wet: false, weed: false, pest: false, wiltAt: 10 },
  ];
  assert.deepEqual(pickPetTask(plots, { x: 0, z: 0 }, PET_RADIUS), { type: 'water', i: 3 });
});

test('pickPetTask: 잡초가 덮인 밭에는 물을 주지 않는다 — 자라지 않는다', () => {
  const plots = [{ i: 1, x: 1, z: 0, state: 'growing', wet: false, weed: true, pest: false }];
  assert.deepEqual(pickPetTask(plots, { x: 0, z: 0 }, PET_RADIUS), { type: 'weed', i: 1 });
});

test('pickPetTask: 익은 밭이 있어도 수확하지 않는다', () => {
  const plots = [{ i: 1, x: 1, z: 0, state: 'mature', wet: true, weed: false, pest: false }];
  assert.equal(pickPetTask(plots, { x: 0, z: 0 }, PET_RADIUS), null);
});

test('afterWork: 한 일만큼 works 가 늘고 쿨다운이 걸린다 — 원본 불변', () => {
  const p = emptyPet('bird');
  const r = afterWork(p, 3, 10_000);
  assert.equal(r.works, 3);
  assert.equal(r.restUntil, 10_000 + REST_SEC * 1000);
  assert.equal(p.works, 0, '원본이 바뀌면 안 된다');
});

test('afterWork: 한 번에 CHAIN_MAX 를 넘겨 세지 않는다', () => {
  assert.equal(afterWork(emptyPet('bird'), 99, 0).works, CHAIN_MAX);
});

test('PET_PRICE 는 꾸미기 최고가(2,600)보다 비싸다 — 펫이 가장 큰 상품이다', () => {
  assert.ok(PET_PRICE > 2600);
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `npm test`
Expected: FAIL — `Cannot find module '../js/pet/rules.js'`

- [ ] **Step 3: 규칙을 쓴다**

```js
// js/pet/rules.js
// =============================================================
//  calm forest · 🐾 지시형 펫 규칙 (순수 함수 — THREE/DOM 의존 없음)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-21-cosmetics-pet-design.md §6·§7·§8
//
//  ⚠️ 이 모듈이 지켜야 할 **하나**: 펫은 🧑‍🌾일꾼을 죽이면 안 된다.
//     일꾼의 값어치는 "접속을 끊어도 12시간 알아서 일한다"(MAX_CATCHUP_H)이다.
//     그래서 펫은 — 지시받아야 움직이고 · 플레이어 반경 안만 · 오프라인엔 아무것도 안 한다.
//     **여기에 오프라인 정산을 넣지 마라.** 넣는 순간 일꾼 경제가 무너진다.
//
//  ▶ 수확·파종을 하지 않는다. 수확은 보상이라 대신하면 제일 기분 좋은 순간을 파는 게 된다.
//  ▶ 성장은 **외형만** 바꾼다. 능력이 같이 자라면 위 경계가 다시 흐려진다.
//  ▶ 테스트: npm test (tests/pet-rules.test.mjs) — 밸런스 수치를 여기 못박는다.
// =============================================================

export const PET_PRICE = 3000;      // 🪙 — 꾸미기 최고가(2,600)보다 비싸다
export const PET_RADIUS = 4.5;      // 플레이어 기준 반경. 밭 전체는 일꾼의 몫
export const PET_TASKS = Object.freeze(['water', 'weed', 'pest']);
export const GROW_NEED = Object.freeze([0, 40, 140]);   // 일꾼(0/120/400)보다 낮다
export const WORK_SEC = 2.5;        // 한 칸 처리 시간
export const REST_SEC = 20;         // 쿨다운 — 일급이 없는 대신 이게 브레이크다
export const CHAIN_MAX = 5;         // 한 번 시키면 최대 몇 칸

export function emptyPet(kind) {
  return { kind, name: '', works: 0, restUntil: 0 };
}

export function stageOf(works) {
  let s = 0;
  for (let i = 0; i < GROW_NEED.length; i++) if ((works || 0) >= GROW_NEED[i]) s = i;
  return s;
}

export function toNextStage(works) {
  const next = GROW_NEED[stageOf(works) + 1];
  return next === undefined ? null : Math.max(0, next - (works || 0));
}

export function canCommand(pet, now) {
  return !!pet && now >= (pet.restUntil || 0);
}

/** 반경 안에서 가장 급한 잡일 하나. 없으면 null */
export function pickPetTask(plots, center, radius) {
  const r2 = radius * radius;
  const near = (plots || []).filter(p => {
    const dx = p.x - center.x, dz = p.z - center.z;
    return dx * dx + dz * dz <= r2;
  });
  // 1. 💧 목마른 밭 — 잡초가 덮인 밭은 물을 줘도 안 자란다
  const thirsty = near.filter(p => p.state === 'growing' && !p.wet && !p.weed)
    .sort((a, b) => (a.wiltAt ?? Infinity) - (b.wiltAt ?? Infinity));
  if (thirsty.length) return { type: 'water', i: thirsty[0].i };
  // 2. 🌿 잡초
  const weed = near.find(p => p.weed);
  if (weed) return { type: 'weed', i: weed.i };
  // 3. 🐛 해충
  const pest = near.find(p => p.pest);
  if (pest) return { type: 'pest', i: pest.i };
  return null;   // 🌾수확·🌰파종은 여기 없다 — 일부러다
}

export function afterWork(pet, done, now) {
  const n = Math.max(0, Math.min(CHAIN_MAX, done | 0));
  return { ...pet, works: (pet.works || 0) + n, restUntil: now + REST_SEC * 1000 };
}
```

- [ ] **Step 4: 테스트가 통과하는지 본다**

Run: `npm test`
Expected: PASS — 누적 39개

- [ ] **Step 5: 커밋**

```bash
git add js/pet/rules.js tests/pet-rules.test.mjs
git commit -m "feat: 🐾 펫 규칙 — 잡일만·반경 제한·쿨다운·성장 문턱"
```

---

## Task 11: 펫 렌더와 `🐾 맡기기`

**Files:**
- Create: `js/pet/render.js`
- Modify: `js/game.js`, `js/i18n-en.js`

**Interfaces:**
- Consumes:
  - `rules.js` 전부
  - `js/game.js` 의 **실재하는** 것들 — `plots[]`(원소에 `x`·`z`·`state`·`weed`·`pest`·`wetUntil`·`needSince`·`cropType` 이 있다),
    `workerWorld(cellCache)`(밭 스냅샷 — 참고용), `workerApply(rec, task, tally)`(물주기 본문을 여기서 옮긴다),
    `farmBuildingRecs()` · `inRadiusOf()` · `refreshCropStage()` · `syncFarmSoil()` · `syncFarmCrops()` ·
    상수 `WET_TIME` · `WILT_TIME` · `HIVE_GROWTH_MUL` · `WELL_WET_MUL` · `MATURE`
  - `js/farm-crops.js` 의 `wiltTimeFor` · `growthPerWater` · `weedRoll` (이미 `game.js` 가 import 하고 있다)
- Produces: `spawnPet(THREE, kind, stage): THREE.Group` · `followPlayer(pet3d, target, dt): void` · `walkTo(pet3d, x, z, dt): boolean` · `petWorld(): Plot[]` · `petApply(task): boolean`

⚠️ **밭 접근 함수를 새로 지어내지 않는다.** 일꾼이 쓰는 것을 그대로 재사용하되 두 가지만 맞춘다:
1. `workerWorld()` 의 스냅샷에는 **좌표가 없다**(일꾼은 밭 전체를 보니까). 펫은 반경 판정이 필요하므로 `x`·`z` 를 얹은 `petWorld()` 를 만든다.
2. `workerApply(rec, task, tally)` 는 일꾼 레코드를 받는다. 펫이 하는 `weed`·`pest` 분기는 `rec` 을 안 쓰지만 `water` 는 쓸 수 있으므로, **물·잡초·해충 셋만** 처리하는 `petApply(task)` 를 따로 둔다.

⚠️ **조형은 아직 없다.** Task 12 까지 `spawnPet` 은 **자리표시 구(球)** 를 돌려준다. 종이 안 정해져도 이 태스크가 끝난다 — 그게 이 순서를 고른 이유다.

- [ ] **Step 1: 움직임을 만든다**

```js
// js/pet/render.js
// =============================================================
//  calm forest · 🐾 펫 렌더 — 따라다니기·이동
//  ------------------------------------------------------------
//  ▶ 이 파일은 **움직임만** 안다. 조형은 js/pet/art.js 가 준다 —
//    종이 바뀌어도 여기는 안 바뀐다.
//  ▶ Task 12 전까지 spawnPet 은 자리표시 구를 돌려준다.
// =============================================================

const FOLLOW_DIST = 1.3, FOLLOW_SPD = 3.2, WALK_SPD = 3.6, ARRIVE = 0.35;

/** Task 12 에서 buildPet 으로 갈아끼운다 */
export function spawnPet(THREE, kind, stage) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.22 + stage * 0.04, 12, 9),
    new THREE.MeshStandardMaterial({ color: 0x8fe0d0, roughness: 0.9 }));
  m.position.y = 0.30; m.castShadow = true; g.add(m);
  return g;
}

export function followPlayer(pet3d, target, dt) {
  const dx = target.x - pet3d.position.x, dz = target.z - pet3d.position.z;
  const d = Math.hypot(dx, dz);
  if (d <= FOLLOW_DIST) return;
  const k = Math.min(1, (FOLLOW_SPD * dt) / d);
  pet3d.position.x += dx * k; pet3d.position.z += dz * k;
  pet3d.rotation.y = Math.atan2(dx, dz);
}

/** 도착하면 true */
export function walkTo(pet3d, x, z, dt) {
  const dx = x - pet3d.position.x, dz = z - pet3d.position.z;
  const d = Math.hypot(dx, dz);
  if (d <= ARRIVE) return true;
  const k = Math.min(1, (WALK_SPD * dt) / d);
  pet3d.position.x += dx * k; pet3d.position.z += dz * k;
  pet3d.rotation.y = Math.atan2(dx, dz);
  return false;
}
```

- [ ] **Step 2: 맡기기 한 번의 흐름을 잇는다**

```js
// 🐾 맡기기 — 반경 안 잡일을 최대 CHAIN_MAX 칸. 끝나면 따라오기로 돌아간다
let pet3d = null, petJob = null;

function respawnPet() {
  if (pet3d) { scene.remove(pet3d); pet3d = null; }
  if (!gameState.pet) return;
  pet3d = spawnPet(THREE, gameState.pet.kind, stageOf(gameState.pet.works));
  pet3d.position.set(player.position.x, 0, player.position.z);
  scene.add(pet3d);
}

function commandPet() {
  if (!canCommand(gameState.pet, Date.now())) {
    spawnFloatText(player.position.x, 1.6, player.position.z, '조금 쉬고 있어요');
    return;
  }
  petJob = { done: 0, task: null, before: stageOf(gameState.pet.works) };
}

function finishPetJob() {
  gameState.pet = afterWork(gameState.pet, petJob.done, Date.now());
  trackEvent('pet_command', {
    pet_kind: gameState.pet.kind, stage: stageOf(gameState.pet.works),
    task: 'chores', plots_done: petJob.done,
  });
  const after = stageOf(gameState.pet.works);
  if (after > petJob.before) {
    trackEvent('pet_stage_up', { pet_kind: gameState.pet.kind, stage: after, works: gameState.pet.works });
    respawnPet();                      // 실루엣이 바뀐다
  }
  petJob = null;
  saveGame(gameState);
}

function updatePet(dt) {
  if (!pet3d) return;
  if (!petJob) { followPlayer(pet3d, player.position, dt); return; }
  if (!petJob.task) {
    if (petJob.done >= CHAIN_MAX) return finishPetJob();
    petJob.task = pickPetTask(petWorld(), player.position, PET_RADIUS);
    if (!petJob.task) return finishPetJob();
  }
  const p = plots[petJob.task.i];
  if (!p) { petJob.task = null; return; }              // 밭이 사라졌으면 다시 고른다
  if (walkTo(pet3d, p.x, p.z, dt)) {
    if (petApply(petJob.task)) petJob.done++;
    petJob.task = null;
  }
}

// 🐾 펫이 보는 밭 — workerWorld 는 좌표를 안 담는다(일꾼은 밭 전체를 보니까).
//    펫은 반경 판정이 필요하므로 x·z 를 얹는다.
function petWorld() {
  const now = clock.elapsedTime;
  return plots.map((p, i) => ({
    i, x: p.x, z: p.z,
    state: p.state === 'growing' ? 'growing' : p.state === 'mature' ? 'mature' : 'tilled',
    weed: !!p.weed, pest: !!p.pest,
    wet: now < (p.wetUntil || 0),
    wiltAt: (p.needSince || now) + wiltTimeFor(p.cropType, WILT_TIME),
  }));
}

// 🐾 펫의 작업 적용 — **물·잡초·해충 셋만**. 수확·파종은 일부러 없다(스펙 §7-1).
//    ⚠️ workerApply(rec, task, tally) 를 그대로 못 쓴다 — 일꾼 레코드를 받고 수확·운반까지 안다.
//       물주기 본문은 workerApply 의 case 'water' 를 **그대로 옮긴다**(벌통·우물 보정 포함).
//       그래야 펫이 준 물과 일꾼이 준 물이 다르게 자라는 일이 없다.
function petApply(task) {
  const p = plots[task.i];
  if (!p) return false;
  switch (task.type) {
    case 'water': {
      if (p.state !== 'growing') return false;
      const recs = farmBuildingRecs();
      const hive = inRadiusOf(recs, 'beehive', p.x, p.z), well = inRadiusOf(recs, 'well', p.x, p.z);
      p.growth = Math.min(1, p.growth + growthPerWater(p.cropType, !!gameState.upgrades.water, !!p.fert) * (hive ? HIVE_GROWTH_MUL : 1));
      p.wetUntil = clock.elapsedTime + WET_TIME * (well ? WELL_WET_MUL : 1);
      p.watered = true; p.needSince = 0;
      if (p.growth < MATURE && weedRoll(p.cropType, Math.random())) p.weed = true;
      refreshCropStage(p);
      return true;
    }
    case 'weed': if (!p.weed) return false; p.weed = false; syncFarmSoil(true); return true;
    case 'pest': if (!p.pest) return false; p.pest = false; syncFarmCrops(true); return true;
    default: return false;
  }
}
```

프레임 루프에서 `updatePet(dt)`.

- [ ] **Step 3: 프롬프트를 건다**

밭 근처 + `canCommand` 일 때만 `🐾 맡기기` 를 띄운다. ⚠️ **프롬프트 줄에만** 넣는다.

- [ ] **Step 4: i18n**

```js
  // ── 🐾 펫 ──────────────────────────────────────────────────
  '🐾 맡기기': '🐾 Ask for help',
  '조금 쉬고 있어요': 'Resting for a bit',
```

- [ ] **Step 5: 인게임에서 확인한다**

```js
gameState.pet = { kind: 'spirit', name: '', works: 0, restUntil: 0 };
respawnPet();
```

확인:
- 따라다닌다
- 밭 근처에서 `🐾 맡기기` 가 뜬다
- 누르면 **물·잡초·해충만** 처리하고 **익은 밭은 건드리지 않는다**
- 5칸을 넘기지 않고 끝나면 쿨다운이 걸린다
- **접속을 끊었다 켜도 아무 일도 안 일어난다**(오프라인 정산 없음)

- [ ] **Step 6: 커밋**

```bash
git add js/pet/render.js js/game.js js/i18n-en.js
git commit -m "feat: 🐾 펫 따라다니기·맡기기 — 잡일 연쇄와 쿨다운"
```

---

## Task 12: 펫 조형 — **여기서 종을 정한다**

**Files:**
- Create: `js/pet/art.js`
- Modify: `sims/pet-sim.html`, `js/pet/render.js`

⚠️ **이 태스크를 시작하기 전에 펫 종을 정한다** (스펙 §15 열린 결정). 시뮬에 네 종이 다 서 있다:

| 후보 | 1 → 2 → 3단계 |
|---|---|
| ✨ 정령 | 공전 파편 0 → 3 → 6 + 후광 |
| 🐦 새 | 꽁지깃 1 → 3 → 5장 + 볏 |
| 🫘 흙꼬마 | 민둥돌 → 이끼 → 꽃·버섯 |
| 🍃 잎사귀 정령 | 잎 1 → 3 → 5장 + 겉껍질 망토 |

**Interfaces:**
- Produces:
  - `PET_KIND: 'spirit'|'bird'|'golem'|'leaf'` — **고른 종 하나.** Task 13 의 구매가 이 값을 쓴다
  - `PET_PALETTE: Record<string, number>` · `buildPet(THREE, kind, stage): THREE.Group` · `updatePetAnim(pet3d, t): void`

- [ ] **Step 1: 고른 종의 조형을 `sims/pet-sim.html` 에서 옮긴다**

시뮬은 2차 수정까지 검수를 통과했다. **수치를 바꾸지 않는다.** 조형 규칙(스펙 §10):
- 부속을 꽂지 말고 **형태로 승격**한다
- 눈은 **작고 어둡게**
- 면이 겹치면 줄무늬가 인다
- 파편·깃털·꽃잎은 **6을 넘기지 않는다**
- ⚠️ **블룸 임계 0.85** — 빛나는 종(정령·별)이 특히 걸린다. `starLit`·`sparkLit` 이 실제로 두 번 초과했다

- [ ] **Step 2: 시뮬이 모듈을 import 하게 바꾼다**

```js
import { PET_KIND, PET_PALETTE, buildPet, updatePetAnim } from '../js/pet/art.js';
```

- [ ] **Step 3: 시뮬로 성장 3단계를 확인한다**

```bash
open http://localhost:8000/sims/pet-sim.html
```

확인: 1→3단계가 **멀리서도 실루엣으로** 구분되고, HUD 블룸 검산이 "전 색 통과" 이며, 「캐릭터 대비」 실루엣 기준으로 **무릎 높이** 다.

- [ ] **Step 4: 게임에 연결한다**

`js/pet/render.js` 의 자리표시 구를 진짜 조형으로 바꾼다:

```js
import { buildPet, updatePetAnim } from './art.js';

export function spawnPet(THREE, kind, stage) {
  return buildPet(THREE, kind, stage);
}
```

`updatePet` 에 `updatePetAnim(pet3d, clock.getElapsedTime())` 를 더한다(정령 계열은 공전·맥동이 없으면 구슬로 보인다).

- [ ] **Step 5: 인게임에서 성장을 확인한다**

```js
gameState.pet.works = 40; respawnPet();    // 2단계
gameState.pet.works = 140; respawnPet();   // 3단계
```

확인: 실루엣이 단계마다 바뀌고, 드로우콜 증가가 **+12 안쪽**이다.

- [ ] **Step 6: 커밋**

```bash
git add js/pet/art.js sims/pet-sim.html js/pet/render.js
git commit -m "feat: 🐾 펫 조형 — 성장 3단계 실루엣"
```

---

## Task 13: 펫 판매를 상점에 붙인다

**Files:**
- Modify: `js/game.js`, `js/i18n-en.js`

- [ ] **Step 1: 펫 탭을 붙인다**

`COS_TABS` 에 `['pet', '🐾 펫']` 을 더하고, `drawCosMenu` 에서 `cosTab === 'pet'` 이면 목록 대신 펫 칸을 그린다.

```js
function drawPetTab(box) {
  if (!gameState.pet) {
    const row = document.createElement('div');
    row.className = 'sh-row';
    row.innerHTML = `<span>🐾 함께 다녀요</span>`;
    const btn = document.createElement('button');
    btn.textContent = `${PET_PRICE.toLocaleString()}🪙`;
    btn.onclick = () => {
      if (gameState.inventory.coins < PET_PRICE) { ui.toast?.('코인이 모자라요', 2000); return; }
      gameState.inventory.coins -= PET_PRICE;
      gameState.pet = emptyPet(PET_KIND);          // js/pet/art.js 가 내보내는 확정 종
      trackEvent('pet_buy', { pet_kind: PET_KIND, price_coins: PET_PRICE });
      respawnPet(); drawCosMenu(); saveGame(gameState);
    };
    row.appendChild(btn); box.appendChild(row);
    return;
  }
  const left = toNextStage(gameState.pet.works);
  const row = document.createElement('div');
  row.className = 'sh-row';
  row.innerHTML = `<span>🐾 ${stageOf(gameState.pet.works) + 1}단계</span>`
    + `<span>${left === null ? '다 자랐어요' : `다음까지 ${left}번`}</span>`;
  box.appendChild(row);
}
```

- [ ] **Step 2: i18n**

⚠️ `다음까지 {0}번` 은 숫자가 끼어드는 **패턴 슬롯**이다. 통문장으로 넣지 않는다.

```js
  '🐾 펫': '🐾 Pet',
  '🐾 함께 다녀요': '🐾 Comes along with you',
  '다 자랐어요': 'Fully grown',
  '다음까지 {0}번': '{0} more to grow',
  '🐾 {0}단계': '🐾 Stage {0}',
```

- [ ] **Step 3: 커버리지를 점검한다**

Run: `node scripts/i18n_check.mjs`

- [ ] **Step 4: 인게임에서 사 보고 저장을 확인한다**

확인: 3,000🪙 로 사면 펫이 따라오기 시작하고, 새로고침해도 유지된다. 코인이 모자라면 안 사진다.

- [ ] **Step 5: 커밋**

```bash
git add js/game.js js/i18n-en.js
git commit -m "feat: 🐾 펫 판매 — 상점에 펫 탭과 성장 진행"
```

---

## Task 14: 마무리 검증

- [ ] **Step 1: 테스트 전부**

Run: `npm test`
Expected: 전부 PASS (누적 39개 + 기존)

- [ ] **Step 2: i18n 커버리지**

Run: `node scripts/i18n_check.mjs`
Expected: 이번에 넣은 한국어 문자열이 미등재 목록에 없다

- [ ] **Step 3: 스펙 부록 A 를 손으로 훑는다**

[스펙 부록 A. 검증 항목](../specs/2026-09-21-cosmetics-pet-design.md) 을 열어 한 줄씩 확인한다. 특히:

- 꾸미기가 **동물 7종 전부**에서 비율이 맞는가 (🐰토끼 귀 · 🐤병아리 볏 · 🐼판다 어깨 무늬)
- dome 모자를 씌워도 **7종 전부 귀가 빠져나오는가**
- 🧣목 장식이 그 높이의 **머리** 단면보다 앞에 있는가
- 🎒가방이 **🦊여우 꼬리**와 겹치지 않는가 · 가방과 어깨끈이 **이어져 보이는가**
- 캐릭터 선택 프리뷰에도 장착이 반영되는가
- 👣발자국이 실내·클로즈업·미니게임에서 꺼지는가 · **동물마다 다른가**
- 👣자국 하나가 **단일 메시로 병합**됐는가
- 🏪가게 안 주인이 **41.2°에서 보이는가** · **가게를 안 벗어나는가**
- 펫이 **수확을 하지 않는가** · **오프라인에서 일하지 않는가**
- 펫 성장 3단계가 **멀리서도** 구분되는가
- 팔레트 전 색이 블룸 임계 0.85 아래인가
- **기존 세이브(꾸미기·펫 필드 없음)를 열어도 멀쩡한가**

- [ ] **Step 4: 드로우콜을 잰다**

```js
renderer.info.render.calls
```
Expected: 마을 기준선(567 근처) 대비 **+35 안쪽** — 꾸미기 ≤9 · 발자국 12 · 펫 ≤12 · 가게는 카페(24) 수준

- [ ] **Step 5: 모바일 실측**

375px 폭에서 꾸미기 상점 패널이 안 넘치는지, `🐾 맡기기` 가 프롬프트 줄에서 잘리지 않는지 **실제로 잰다**.

- [ ] **Step 6: 커밋**

```bash
git commit --allow-empty -m "docs: 🎀🐾 꾸미기·펫·판매처 검증 완료"
```

- [ ] **Step 7: 다음 날 트래킹을 재검증한다**

⚠️ 보내는 것과 쌓이는 것은 다르다. 배포 다음 날 BigQuery 에서 확인한다:
`cosmetic_buy` · `cosmetic_equip` · `pet_buy` · `pet_command` · `pet_stage_up` · `shop_enter` · `shop_open`

`item_id` 가 `'밀짚모자'` 가 아니라 `'straw_hat'` 인지 본다 — **축은 키값**이다.

---

## 배포

⚠️ 코드가 바뀌면 **웹 · 토스 · itch 세 곳 전부**다. 공지는 토스 출시 후.
