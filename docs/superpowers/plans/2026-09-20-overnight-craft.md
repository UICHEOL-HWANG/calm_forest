# 🔥 밤사이 가공 — 마을 화덕 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 재료를 화덕에 걸어두고 나가면, 날짜가 바뀐 뒤 첫 접속에 가공물이 되어 있다.

**Architecture:** 규칙·수치는 `js/craft/` 의 순수 모듈(`recipes.js`·`slots.js`·`mill.js`)에 두고 `node --test` 로 검증한다. 3D 조형과 UI 는 확정된 시안 파일에서 이식한다. 시설은 기존 `OUTDOOR` 배치 파이프라인에, 정산은 기존 일꾼 `catchUp` 자리에, 미니게임은 기존 `mgView.type` 분기에 얹는다 — 새 시스템을 만들지 않는다.

**Tech Stack:** Three.js r160 · ES modules · `node:test` + `node:assert/strict` · GA4 이벤트 · i18n 한국어 원문 키 사전

**Spec:** [docs/superpowers/specs/2026-09-20-overnight-craft-design.md](../specs/2026-09-20-overnight-craft-design.md)

## Global Constraints

모든 태스크의 요구사항에 아래가 암묵적으로 포함된다.

- **손실 압박 금지.** 기한·만료·부패를 넣지 않는다. 걸어둔 것은 언제 와도 그대로다.
- **요리 미니게임을 대체하지 않는다.** 화덕은 밀가루까지. 빵은 부엌에서 굽는다.
- **판매는 출구 중 가장 나쁜 선택이어야 한다.** 밀가루 판매는 본전 수준으로 둔다.
- **`js/game.js` 에 규칙을 몰지 않는다.** 표·수치·판정은 `js/craft/` 모듈로.
- **미니게임 난이도는 오직 판정창 배율로만 조절한다.** 속도·단계 수를 같이 흔들면 지표로 가를 수 없다.
- **슬롯 칩의 상태는 글자가 아니라 기호**(`✓` `🔥`). 칸 3개에서 이미 두 줄로 깨졌다.
- **모바일은 340px·320px 두 폭 모두 실측**한다. 캡처로 남긴다.
- **드로우콜은 병합 구조로 짠다.** `js/game.js:2779 mergeGeos` 사용. 화덕 한 채 5~6 유지.
- **트래킹 축은 키값**(`item: 'flour'`). 표시 라벨을 파라미터에 넣지 않는다.
- **날짜 키는 `todayStr()`** (`js/game.js:152`). 새 시계를 만들지 않는다.

## 확정 수치 (스펙 §3·§4)

| 품목 | key | 투입 | 산출(등급 0~3) | 판매가 | 미니게임 |
|---|---|---|---|---|---|
| ⚫ 숯 | `charcoal` | `wood: 8` | 2 / 3 / 4 / 5 | 9 | `grill` 재사용 |
| 🌾 밀가루 | `flour` | `wheat: 4` | 2 / 3 / 4 / 5 | 18 | **`mill` 신규** |
| 🧱 벽돌 | `brick` | `stone: 6, coal: 2` | 2 / 3 / 4 / 5 | 12 | `season` 재사용 |

- 화덕 1채 = 슬롯 **2칸**, 최대 **3채**(6칸). 추가 제작비 `stone: 20, wood: 15, coins: 150`.
- **첫 화덕은 스토리 보상이 아니라 시작 시 기본 배치.** 근거: `story_chapter_complete` 의 1장(`home`)이 25명뿐 — 시작한 121명의 21%, 진입 유저 109명의 23%. 성공 기준(40% 도달)에 못 미친다. 마이그레이션으로 기존 유저에게도 한 채를 놓는다.
- 🥐 빵: `{ id:'bread', cost:{ flour: 2 }, stages:['pot','grill'], buff:'speed', dur:150 }` · `CAFE_PAY.bread = 56` · `SELL_PRICE.bread = 26`.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `js/craft/recipes.js` **(신규)** | 레시피 표·수율·재료 검사. 순수 함수만 |
| `js/craft/slots.js` **(신규)** | 슬롯 배열 조작·완성 판정·정산. 순수 함수만 |
| `js/craft/mill.js` **(신규)** | 맷돌 판정. 순수 함수만 |
| `tests/craft-recipes.test.mjs` **(신규)** | 표·수율 검증 |
| `tests/craft-slots.test.mjs` **(신규)** | 걸기·완성·수령·정산 검증 |
| `tests/craft-mill.test.mjs` **(신규)** | 맷돌 점수·등급 경계 검증 |
| `js/save-migrate.js` | `craft` 기본값 + 첫 화덕 배치 |
| `js/game.js` | `OUTDOOR` 등록 · 3D 조형 · 미니게임 분기 · 정산 호출 · 빵 레시피 |
| `index.html` | 가공 창 마크업·CSS |
| `js/i18n-en.js` | 영어 문구 |

`js/game.js` 는 11,000줄이 넘는다. **규칙은 한 줄도 넣지 않는다** — 표와 판정은 전부 `js/craft/` 에서 import 한다.

---

## Task 1: 레시피 표와 수율 (순수 모듈)

**Files:**
- Create: `js/craft/recipes.js`
- Test: `tests/craft-recipes.test.mjs`

**Interfaces:**
- Consumes: 없음 (최초 태스크)
- Produces:
  - `CRAFT_RECIPES: Array<{ id, ico, name, cost: Record<string,number>, yields: [number,number,number,number], sell: number, mg: 'grill'|'mill'|'season' }>`
  - `recipeOf(id: string) => recipe | undefined`
  - `yieldOf(id: string, grade: number) => number`
  - `canAfford(id: string, inv: Record<string,number>) => boolean`
  - `lackOf(id: string, inv: Record<string,number>) => string[]` — 모자란 재료 키 배열(UI 가 빨갛게 짚는 데 쓴다)

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`tests/craft-recipes.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CRAFT_RECIPES, recipeOf, yieldOf, canAfford, lackOf } from '../js/craft/recipes.js';

test('표: 품목 3종 — 스펙 §3 수치 그대로', () => {
  assert.deepEqual(CRAFT_RECIPES.map(r => r.id), ['charcoal', 'flour', 'brick']);
  assert.deepEqual(recipeOf('charcoal').cost, { wood: 8 });
  assert.deepEqual(recipeOf('flour').cost, { wheat: 4 });
  assert.deepEqual(recipeOf('brick').cost, { stone: 6, coal: 2 });
  assert.deepEqual(CRAFT_RECIPES.map(r => r.sell), [9, 18, 12]);
  assert.deepEqual(CRAFT_RECIPES.map(r => r.mg), ['grill', 'mill', 'season']);
});

test('yieldOf: 등급 0~3 → 2·3·4·5', () => {
  assert.deepEqual([0, 1, 2, 3].map(g => yieldOf('charcoal', g)), [2, 3, 4, 5]);
  assert.equal(yieldOf('flour', 0), 2, '아쉬워도 최소 2개는 나온다 — 완성 여부는 등급과 무관');
  assert.equal(yieldOf('brick', 3), 5);
});

test('yieldOf: 등급이 범위 밖이면 양끝으로 물린다', () => {
  assert.equal(yieldOf('charcoal', -1), 2);
  assert.equal(yieldOf('charcoal', 9), 5);
  assert.equal(yieldOf('charcoal', undefined), 2, '세이브에 등급이 없으면 최소');
});

test('canAfford / lackOf: 재료가 모자란 키를 짚는다', () => {
  assert.equal(canAfford('brick', { stone: 6, coal: 2 }), true);
  assert.equal(canAfford('brick', { stone: 6, coal: 1 }), false);
  assert.deepEqual(lackOf('brick', { stone: 2, coal: 2 }), ['stone']);
  assert.deepEqual(lackOf('brick', { stone: 2 }), ['stone', 'coal']);
  assert.deepEqual(lackOf('brick', { stone: 6, coal: 2 }), []);
  assert.deepEqual(lackOf('charcoal', {}), ['wood'], '빈 인벤토리도 터지지 않는다');
});

test('recipeOf: 없는 id 는 undefined', () => {
  assert.equal(recipeOf('bread'), undefined, '빵은 화덕이 아니라 부엌 소관이다');
});
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인한다**

Run: `node --test tests/craft-recipes.test.mjs`
Expected: FAIL — `Cannot find module '../js/craft/recipes.js'`

- [ ] **Step 3: 최소 구현을 쓴다**

`js/craft/recipes.js`:

```javascript
// 🔥 화덕 레시피 — 표와 판정만. 렌더·DOM·전역 상태를 참조하지 않는다(테스트 가능해야 한다).
//    수치 출처는 docs/superpowers/specs/2026-09-20-overnight-craft-design.md §3

/** 산출량은 미니게임 등급(0~3)이 정한다. 완성 여부는 등급과 무관 — 아쉬워도 최소 2개는 나온다. */
export const CRAFT_RECIPES = [
  { id: 'charcoal', ico: '⚫', name: '숯',     cost: { wood: 8 },            yields: [2, 3, 4, 5], sell: 9,  mg: 'grill'  },
  { id: 'flour',    ico: '🌾', name: '밀가루', cost: { wheat: 4 },           yields: [2, 3, 4, 5], sell: 18, mg: 'mill'   },
  { id: 'brick',    ico: '🧱', name: '벽돌',   cost: { stone: 6, coal: 2 },  yields: [2, 3, 4, 5], sell: 12, mg: 'season' },
];

export function recipeOf(id) { return CRAFT_RECIPES.find(r => r.id === id); }

export function yieldOf(id, grade) {
  const r = recipeOf(id); if (!r) return 0;
  const g = Math.max(0, Math.min(r.yields.length - 1, grade | 0));
  return r.yields[g];
}

/** 모자란 재료 키 — UI 가 그 재료만 빨갛게 짚는다(문장으로 붙이면 320px 에서 줄이 깨진다) */
export function lackOf(id, inv = {}) {
  const r = recipeOf(id); if (!r) return [];
  return Object.keys(r.cost).filter(k => (inv[k] || 0) < r.cost[k]);
}

export function canAfford(id, inv = {}) { return lackOf(id, inv).length === 0; }
```

- [ ] **Step 4: 테스트를 돌려 통과를 확인한다**

Run: `node --test tests/craft-recipes.test.mjs`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋한다**

```bash
git add js/craft/recipes.js tests/craft-recipes.test.mjs
git commit -m "feat: 🔥 화덕 레시피 표를 만든다 — 숯·밀가루·벽돌 3종

수치는 스펙 §3 그대로. 산출량은 미니게임 등급(0~3)이 정하고 완성 여부는
등급과 무관하다 — 아쉬워도 최소 2개는 나온다.

lackOf 가 모자란 재료 키만 돌려준다. UI 는 그 재료만 색으로 짚는다 —
'돌이 모자라요' 같은 문장을 붙이면 320px 에서 마지막 글자가 떨어진다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: 슬롯 상태와 정산 (순수 모듈)

**Files:**
- Create: `js/craft/slots.js`
- Test: `tests/craft-slots.test.mjs`

**Interfaces:**
- Consumes: `yieldOf` (Task 1)
- Produces:
  - `SLOTS_PER_KILN = 2` · `MAX_KILNS = 3`
  - `capacityOf(kilnCount: number) => number` — 전체 칸 수. 로그인 요약·디버그 표시에 쓴다(한 채 창은 `SLOTS_PER_KILN` 만 본다)
  - `isReady(slot: { day: string }, today: string) => boolean`
  - `setSlot(slots, { st, item, grade, day }) => newSlots` — 새 배열을 반환(원본 불변)
  - `readySlots(slots, today) => slot[]`
  - `claimAll(slots, today) => { rest: slot[], gained: Record<string,number>, claimed: Array<{ item, qty, grade, waitedDays }> }`
  - `waitedDays(day: string, today: string) => number`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`tests/craft-slots.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SLOTS_PER_KILN, MAX_KILNS, capacityOf, isReady, setSlot, readySlots, claimAll, waitedDays,
} from '../js/craft/slots.js';

test('용량: 화덕 1채 2칸 · 최대 3채 6칸', () => {
  assert.equal(SLOTS_PER_KILN, 2);
  assert.equal(MAX_KILNS, 3);
  assert.deepEqual([0, 1, 2, 3, 4].map(capacityOf), [0, 2, 4, 6, 6], '3채를 넘겨도 6칸에서 멈춘다');
});

test('isReady: 날짜가 바뀌어야 완성 — 같은 날은 아직', () => {
  assert.equal(isReady({ day: '20260920' }, '20260920'), false);
  assert.equal(isReady({ day: '20260920' }, '20260921'), true);
  assert.equal(isReady({ day: '20260920' }, '20261115'), true, '며칠이 지나도 그대로 기다린다');
  assert.equal(isReady({ day: '20260921' }, '20260920'), false, '시계가 거꾸로여도 완성 처리하지 않는다');
  assert.equal(isReady({}, '20260921'), false, 'day 가 없으면 완성이 아니다');
});

test('setSlot: 새 배열을 돌려주고 원본을 건드리지 않는다', () => {
  const before = [];
  const after = setSlot(before, { st: 'kiln_1', item: 'charcoal', grade: 2, day: '20260920' });
  assert.equal(before.length, 0, '원본 불변');
  assert.equal(after.length, 1);
  assert.deepEqual(after[0], { st: 'kiln_1', item: 'charcoal', qty: 4, grade: 2, day: '20260920' });
});

test('setSlot: 등급이 수량으로 굳는다 — 나중에 표가 바뀌어도 받는 양은 그대로', () => {
  const s = setSlot([], { st: 'kiln_1', item: 'flour', grade: 0, day: '20260920' });
  assert.equal(s[0].qty, 2);
});

test('readySlots / claimAll: 다 된 것만 거두고 나머지는 남긴다', () => {
  const slots = [
    { st: 'kiln_1', item: 'charcoal', qty: 4, grade: 2, day: '20260920' },
    { st: 'kiln_1', item: 'flour',    qty: 3, grade: 1, day: '20260920' },
    { st: 'kiln_2', item: 'brick',    qty: 2, grade: 0, day: '20260921' },   // 오늘 건 것
  ];
  assert.equal(readySlots(slots, '20260921').length, 2);

  const { rest, gained, claimed } = claimAll(slots, '20260921');
  assert.equal(rest.length, 1);
  assert.equal(rest[0].item, 'brick', '오늘 건 것은 남는다');
  assert.deepEqual(gained, { charcoal: 4, flour: 3 });
  assert.deepEqual(claimed.map(c => c.item), ['charcoal', 'flour']);
  assert.equal(claimed[0].waitedDays, 1);
});

test('claimAll: 같은 품목이 여러 칸이면 합산한다', () => {
  const slots = [
    { st: 'kiln_1', item: 'charcoal', qty: 4, grade: 2, day: '20260920' },
    { st: 'kiln_2', item: 'charcoal', qty: 2, grade: 0, day: '20260919' },
  ];
  const { gained } = claimAll(slots, '20260921');
  assert.deepEqual(gained, { charcoal: 6 });
});

test('claimAll: 받을 게 없으면 원본을 그대로 돌려준다', () => {
  const slots = [{ st: 'kiln_1', item: 'brick', qty: 2, grade: 0, day: '20260921' }];
  const { rest, gained, claimed } = claimAll(slots, '20260921');
  assert.deepEqual(rest, slots);
  assert.deepEqual(gained, {});
  assert.equal(claimed.length, 0);
});

test('waitedDays: 며칠 만에 받으러 왔는가 — 핵심 지표', () => {
  assert.equal(waitedDays('20260920', '20260921'), 1);
  assert.equal(waitedDays('20260920', '20260927'), 7);
  assert.equal(waitedDays('20260228', '20260301'), 1, '달을 넘어도 하루다(2026년은 평년)');
  assert.equal(waitedDays('20261231', '20270101'), 1, '해를 넘어도 하루다');
});
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인한다**

Run: `node --test tests/craft-slots.test.mjs`
Expected: FAIL — `Cannot find module '../js/craft/slots.js'`

- [ ] **Step 3: 최소 구현을 쓴다**

`js/craft/slots.js`:

```javascript
// 🔥 화덕 슬롯 — 걸기·완성 판정·수령. 순수 함수만.
//    날짜 키는 게임의 todayStr()(js/game.js:152)가 주는 'YYYYMMDD' 문자열을 그대로 받는다.
import { yieldOf } from './recipes.js';

export const SLOTS_PER_KILN = 2;
export const MAX_KILNS = 3;

export function capacityOf(kilnCount = 0) {
  return Math.max(0, Math.min(MAX_KILNS, kilnCount | 0)) * SLOTS_PER_KILN;
}

/** 날짜가 바뀌면 완성. 같은 날은 아직이고, 시계가 거꾸로 가도 완성 처리하지 않는다. */
export function isReady(slot, today) {
  if (!slot?.day || !today) return false;
  return slot.day < today;
}

/** 걸기 — 등급이 그 자리에서 수량으로 굳는다(나중에 표가 바뀌어도 약속한 양을 준다) */
export function setSlot(slots = [], { st, item, grade, day }) {
  return [...slots, { st, item, qty: yieldOf(item, grade), grade: grade | 0, day }];
}

export function readySlots(slots = [], today) {
  return slots.filter(s => isReady(s, today));
}

/** 'YYYYMMDD' 두 개의 날짜 차 — UTC 자정 기준이라 월·해를 넘어도 맞는다 */
export function waitedDays(day, today) {
  const at = s => Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8));
  return Math.round((at(today) - at(day)) / 86400000);
}

export function claimAll(slots = [], today) {
  const gained = {}, claimed = [], rest = [];
  for (const s of slots) {
    if (!isReady(s, today)) { rest.push(s); continue; }
    gained[s.item] = (gained[s.item] || 0) + s.qty;
    claimed.push({ item: s.item, qty: s.qty, grade: s.grade, waitedDays: waitedDays(s.day, today) });
  }
  return { rest, gained, claimed };
}
```

- [ ] **Step 4: 테스트를 돌려 통과를 확인한다**

Run: `node --test tests/craft-slots.test.mjs`
Expected: PASS (8 tests)

- [ ] **Step 5: 전체 테스트가 깨지지 않았는지 본다**

Run: `npm test`
Expected: 기존 전량 + 신규 13 PASS

- [ ] **Step 6: 커밋한다**

```bash
git add js/craft/slots.js tests/craft-slots.test.mjs
git commit -m "feat: 🔥 화덕 슬롯 상태와 정산을 만든다

날짜가 바뀌면 완성(slot.day < today). 같은 날은 아직이고, 시계가 거꾸로
가도 완성 처리하지 않는다 — 기기 시각을 되돌려 수확하는 길을 막는다.

걸 때 등급이 수량으로 굳는다. 나중에 표를 조정해도 이미 약속한 양을 준다.

claimAll 이 waitedDays 를 함께 돌려준다. '며칠 만에 받으러 왔는가' 가
이 기능의 핵심 지표라 정산 경로에서 바로 나와야 한다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: 세이브 필드와 첫 화덕 배치

**Files:**
- Modify: `js/save-migrate.js`
- Test: `tests/save-migrate.test.mjs` (없으면 생성)

**Interfaces:**
- Consumes: 없음 (세이브 형태만 다룬다)
- Produces: 세이브에 `craft: { slots: [] }` 보장 · `gameState.outdoor` 에 `{ id: 'kiln', x, z, rot }` 1채 보장

**첫 화덕을 기본 배치하는 이유** — 스토리 1장 완료가 25명(진입 109명의 23%)뿐이라 보상으로 주면 대부분이 못 받는다. 마이그레이션으로 놓으면 신규·기존 유저 모두 100% 도달한다. 배치형이므로 플레이어가 원하면 옮길 수 있다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrate } from '../js/save-migrate.js';

test('craft: 필드가 없는 옛 세이브에 빈 슬롯을 만들어 준다', () => {
  const out = migrate({ inventory: { wood: 3 }, outdoor: [] });
  assert.deepEqual(out.craft, { slots: [] });
});

test('craft: 이미 있는 슬롯은 건드리지 않는다', () => {
  const slots = [{ st: 'kiln_1', item: 'flour', qty: 3, grade: 1, day: '20260920' }];
  const out = migrate({ inventory: {}, outdoor: [], craft: { slots } });
  assert.deepEqual(out.craft.slots, slots);
});

test('첫 화덕: 한 채도 없으면 마을에 하나 놓아 준다', () => {
  const out = migrate({ inventory: {}, outdoor: [] });
  const kilns = out.outdoor.filter(r => r.id === 'kiln');
  assert.equal(kilns.length, 1, '스토리 1장 완료가 23% 뿐이라 보상으로 주면 못 받는다');
  assert.equal(typeof kilns[0].x, 'number');
  assert.equal(typeof kilns[0].z, 'number');
});

test('첫 화덕: 이미 지어 둔 게 있으면 더 놓지 않는다', () => {
  const mine = { id: 'kiln', x: 2, z: -3, rot: 1 };
  const out = migrate({ inventory: {}, outdoor: [mine] });
  assert.deepEqual(out.outdoor.filter(r => r.id === 'kiln'), [mine], '옮겨 둔 자리를 되돌리지 않는다');
});

test('첫 화덕: 세 채를 지은 사람에게 네 번째를 얹지 않는다', () => {
  const three = [{ id: 'kiln', x: 0, z: 0 }, { id: 'kiln', x: 1, z: 0 }, { id: 'kiln', x: 2, z: 0 }];
  const out = migrate({ inventory: {}, outdoor: three });
  assert.equal(out.outdoor.filter(r => r.id === 'kiln').length, 3);
});
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인한다**

Run: `node --test tests/save-migrate.test.mjs`
Expected: FAIL — `out.craft` 가 `undefined`

- [ ] **Step 3: 마이그레이션을 구현한다**

`js/save-migrate.js` 파일 위쪽 상수 구간에:

```javascript
// 첫 화덕 자리 — 집과 밭 사이 빈터. 마을 동선 위라 처음 나갈 때 눈에 들어온다
const KILN_HOME = [-6, 4];
```

`migrate` 안, 기존 기본값 채우기 구간 옆에:

```javascript
  // 🔥 화덕 — 가공 슬롯. 필드가 없는 옛 세이브를 신규로 오인하지 않게 기본값을 채운다
  if (!s.craft || !Array.isArray(s.craft.slots)) s.craft = { slots: [] };

  // 첫 화덕은 스토리 보상이 아니라 기본 배치다.
  // story_chapter_complete 의 1장이 25명(진입 109명의 23%)뿐이라 보상으로 주면 대부분이 못 받는다.
  // 배치형이므로 마음에 안 들면 플레이어가 옮긴다.
  s.outdoor = Array.isArray(s.outdoor) ? s.outdoor : [];
  if (!s.outdoor.some(r => r.id === 'kiln')) {
    s.outdoor = [...s.outdoor, { id: 'kiln', x: KILN_HOME[0], z: KILN_HOME[1], rot: 0 }];
  }
```

- [ ] **Step 4: 테스트를 돌려 통과를 확인한다**

Run: `node --test tests/save-migrate.test.mjs`
Expected: PASS (5 tests)

- [ ] **Step 5: 좌표가 다른 시설과 겹치지 않는지 실측한다**

Run: 브라우저에서 `http://localhost:8000/?dbg` 로 새 세이브를 만들고 `(-6, 4)` 자리를 본다.
Expected: 집·밭·기존 야외 장식과 겹치지 않음. 겹치면 `KILN_HOME` 을 옮기고 다시 확인.

- [ ] **Step 6: 커밋한다**

```bash
git add js/save-migrate.js tests/save-migrate.test.mjs
git commit -m "feat: 🔥 첫 화덕을 시작부터 마을에 놓는다

스펙은 스토리 보상으로 주려 했지만 데이터가 반대였다 —
story_chapter_complete 의 1장(home)이 25명으로, 시작한 121명의 21% ·
진입 유저 109명의 23% 다. 성공 기준(40% 도달)에 애초에 못 미친다.

마이그레이션으로 한 채를 놓으면 신규·기존 모두 100% 도달한다.
배치형이라 마음에 안 들면 옮길 수 있고, 이미 지어 둔 사람의 자리는
건드리지 않는다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: 3D 조형 이식

**Files:**
- Modify: `js/game.js` — `OUTDOOR` 배열(`:658` 부근) · 야외 메시 `id` 분기(`:10049` 부근)
- Reference: `sims/kiln-sim.html` (확정 시안)

**Interfaces:**
- Consumes: `recipeOf` (Task 1) · `isReady`, `MAX_KILNS` (Task 2)
- Produces: `OUTDOOR` 에 `{ id: 'kiln', … }` 등록 · `kilnCount()` · `canBuildKiln()` · 메시가 `'empty' | 'firing' | 'done'` 세 상태를 그린다

- [ ] **Step 1: `OUTDOOR` 에 화덕을 등록한다**

`js/game.js:658` 의 `OUTDOOR` 배열, `spiritlamp` 다음 줄에 추가:

```javascript
  { id: 'kiln', name: '화덕', ico: '🔥', cost: { stone: 20, wood: 15, coins: 150 }, desc: '재료를 걸어두면 다음 날 구워져 있어요 · 한 채에 2칸' },
```

`farm: true` 를 **달지 않는다** — 텃밭 제약 없이 마을 야외에 놓여야 한다.

- [ ] **Step 2: 3채 상한을 건다**

`MAX_KILNS` 를 넘겨 짓지 못하게 막는다. 제작 목록에서 화덕이 흐려지고, 눌러도 놓이지 않는다.

```javascript
// 🔥 화덕은 3채까지 — 마을이 화덕으로 뒤덮이지 않게. 슬롯 상한 6칸도 여기서 나온다
function kilnCount() { return gameState.outdoor.filter(r => r.id === 'kiln').length; }
function canBuildKiln() { return kilnCount() < MAX_KILNS; }
```

야외 제작 목록을 그리는 곳에서 `id === 'kiln' && !canBuildKiln()` 이면 버튼을 `disabled` 로 두고
`🔥 화덕은 3채까지 지을 수 있어요` 를 안내한다. `placeOutdoor` 의 `kiln` 분기에서도 한 번 더 막는다
(목록을 거치지 않는 경로가 있다).

- [ ] **Step 3: 조형을 이식한다**

`sims/kiln-sim.html` 의 `kilnHearth(state)` 와 `topLoad()` 를 야외 메시 분기로 옮긴다. 시안의 헬퍼는 게임에 이미 있는 것으로 바꾼다:

| 시안 | 게임에서 쓸 것 |
|---|---|
| `clayMat(c, flat)` | 그대로 (`js/game.js:2759`) |
| `merged(geos, mat)` | `new THREE.Mesh(mergeGeos(geos), mat)` (`js/game.js:2779`) |
| `emissives.push(m)` | `houseWindows.push(m)` — 밤 점등 배열 |
| `fireLights` (점광) | 쓰지 않는다 — 게임은 블룸으로 번진다 |
| `ni` (non-indexed 통일) | 불필요 — `mergeGeos` 가 이미 한다 |

색은 시안에서 확정한 값을 그대로 쓴다 — 몸통 `0x9a7358`, 장작단 `0x7d5c46`, 상판 `0xcfc7b0`, 입구 `0x4a4844`, 숯 `0x2f2b28`, 포대 `0xf2ead6`.

- [ ] **Step 4: 상태를 세이브에서 읽어 그린다**

```javascript
// 🔥 화덕의 겉모습은 그 화덕의 슬롯 상태에서 나온다.
//    굽는 중이면 불, 다 됐으면 상판에 산출물 — 가까이 가지 않아도 읽힌다(조형 C안을 고른 이유).
function kilnStateOf(recId) {
  const mine = (gameState.craft?.slots || []).filter(s => s.st === recId);
  if (!mine.length) return 'empty';
  return mine.some(s => isReady(s, todayStr())) ? 'done' : 'firing';
}
```

- [ ] **Step 5: 드로우콜을 실측한다**

Run: 브라우저 콘솔에서 `renderer.info.render.calls` 를 화덕 0채·1채·3채로 비교.
Expected: 채당 **5~6 증가**. 7 이상이면 병합이 빠진 곳을 찾는다(숯 3덩이·포대 2개·장작 2개가 각각 1이어야 한다).

- [ ] **Step 6: 낮·밤 실측 캡처를 남긴다**

Run:
```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --use-angle=swiftshader --virtual-time-budget=7000 --window-size=1280,720 \
  --screenshot=/tmp/kiln-ingame.png "http://localhost:8000/?dbg&weather=clear"
```
Expected: 화덕이 마을에 서 있고, 밤에 불이 보이고, 상판 산출물이 읽힌다.
**주의:** `body.playing` 을 손으로 씌우면 미니맵이 빈 채로 찍힌다 — 실제로 게임에 진입한 뒤 찍는다.

- [ ] **Step 7: 커밋한다**

```bash
git add js/game.js
git commit -m "feat: 🔥 화덕 조형을 이식한다 — 상판이 완성 신호가 된다

sims/kiln-sim.html 에서 확정한 C안(낮은 아궁이). 상판에 산출물이 쌓여
가까이 가지 않아도 '다 구워졌다' 가 읽힌다 — 이 기능은 돌아왔을 때 받을 게
있다는 게 전부라 그 신호가 멀리서 보이는 값이 크다.

겉모습은 그 화덕의 슬롯 상태에서 파생한다(empty/firing/done).

드로우콜은 mergeGeos 로 묶어 채당 5~6. 숯 3덩이·포대 2개·장작 2개가
각각 1 드로우콜이다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: 가공 창 UI

**Files:**
- Modify: `index.html` — 모달 마크업 + CSS
- Modify: `js/game.js` — 화덕 상호작용 시 창 열기
- Reference: `sims/craft-ui-sim.html` (확정 시안 B안)

**Interfaces:**
- Consumes: `CRAFT_RECIPES`, `recipeOf`, `lackOf` (Task 1) · `SLOTS_PER_KILN`, `isReady`, `claimAll` (Task 2) · 기존 `SELL_ICO_G`(`js/game.js:325`)·`RES_LABEL` 재료 표기 테이블
- Produces: `openCraftWindow(recId: string)` · `renderCraftWindow(recId: string)` · `startCraftMinigame(recId, itemId)` 호출(구현은 Task 6)

- [ ] **Step 1: 마크업과 CSS 를 이식한다**

`sims/craft-ui-sim.html` 의 B안 블록과 `.slot-strip` / `.chip` / `.recipe` 스타일을 `index.html` 로 옮긴다. 창 껍데기는 기존 모달 규약을 따른다:

```css
#craft-menu {
  display: none; bottom: calc(90px + env(safe-area-inset-bottom));
  left: 50%; transform: translateX(-50%); width: min(460px, 92vw);
  flex-direction: column; gap: 10px;
  max-height: calc(100dvh - 24px - var(--top-inset)); overflow-y: auto;
}
#craft-menu.show { display: flex; }
```

`#craft-menu` 를 `index.html` 의 스크롤 허용 목록(`#bag-content, #shop-menu, …`)에 **추가한다** — 빠뜨리면 모바일에서 창 안 스크롤이 막힌다.

- [ ] **Step 2: 시안에서 확정한 모바일 값을 그대로 넣는다**

```css
  .slot-strip { display: flex; gap: 8px; flex-wrap: wrap; }
  /* 96px 이면 320px 에서 3칸이 2+1 로 흘러 빈 칸이 혼자 한 줄을 먹었다.
     88px 면 3칸이 한 줄(88×3+16=280 < 288)이고 6칸은 3×2 로 떨어진다 */
  .slot-strip .chip { min-width: 88px; white-space: nowrap; }
  /* 부족 안내를 문장으로 붙이면 320px 에서 마지막 글자가 다음 줄로 떨어진다.
     모자란 재료만 색으로 짚는다 — 버튼이 이미 disabled 라 신호는 둘로 충분하다 */
  .recipe .cost { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .recipe .cost .short { color: #d05a4a; font-weight: 700; }
```

- [ ] **Step 3: 렌더 함수를 쓴다**

```javascript
// 🔥 가공 창 — 슬롯 띠(상태) + 레시피 목록(걸기). 걸기가 한 번에 끝나야 한다(B안을 고른 이유).
let curKiln = null;

function renderCraftWindow(recId) {
  curKiln = recId;
  const today = todayStr();
  const mine = (gameState.craft.slots || []).filter(s => s.st === recId);

  // ── 슬롯 띠 ──
  const strip = document.getElementById('craft-slots');
  strip.innerHTML = '';
  for (let i = 0; i < SLOTS_PER_KILN; i++) {
    const s = mine[i], el = document.createElement('div');
    if (!s) { el.className = 'chip empty'; el.textContent = '비어 있음'; }
    else {
      const r = recipeOf(s.item), ready = isReady(s, today);
      el.className = 'chip';
      // 상태는 글자가 아니라 기호로 — 칸 3개만 되어도 문구가 두 줄로 깨졌다
      el.innerHTML = `<span class="mini">${r.ico}</span> ${r.name}${ready ? ` ×${s.qty}` : ''} ` +
        (ready ? `<span class="ready mark">✓</span>` : `<span class="mark" style="opacity:.55">🔥</span>`);
    }
    strip.appendChild(el);
  }

  // ── 받기 버튼: 다 된 게 있을 때만 ──
  const ready = mine.filter(s => isReady(s, today));
  const claimBtn = document.getElementById('craft-claim');
  claimBtn.style.display = ready.length ? '' : 'none';
  claimBtn.textContent = ready.length === 1
    ? `${recipeOf(ready[0].item).ico} ${recipeOf(ready[0].item).name} 받기`
    : `다 구워진 것 모두 받기 (${ready.length})`;

  // ── 레시피 목록 ──
  const list = document.getElementById('craft-recipes');
  list.innerHTML = '';
  const full = mine.length >= SLOTS_PER_KILN;
  for (const r of CRAFT_RECIPES) {
    const lack = lackOf(r.id, gameState.inventory);
    const row = document.createElement('div');
    row.className = 'recipe' + (lack.length || full ? ' lack' : '');
    // 재료 표기는 기존 제작 UI 와 같은 문법 — SELL_ICO_G(:325) + RES_LABEL, '보유/필요'.
    // 모자란 재료만 .short 로 짚는다(문장을 붙이면 320px 에서 마지막 글자가 떨어진다)
    const cost = Object.entries(r.cost)
      .map(([k, v]) => `<span class="${lack.includes(k) ? 'short' : ''}">` +
        `${SELL_ICO_G[k] || '📦'}${RES_LABEL[k] || k} ${gameState.inventory[k] || 0}/${v}</span>`)
      .join(' · ');
    row.innerHTML = `<span class="ico">${r.ico}</span>` +
      `<span class="txt"><span class="nm">${r.name}</span><span class="cost">${cost} → 2~5개</span></span>`;
    const b = document.createElement('button');
    b.className = 'btn'; b.textContent = '걸기';
    b.disabled = lack.length > 0 || full;
    b.onclick = () => startCraftMinigame(recId, r.id);
    if (b.disabled) b.onclick = () => trackEvent('craft_blocked', { reason: full ? 'full' : 'no_material', item: r.id });
    row.appendChild(b); list.appendChild(row);
  }
}

function openCraftWindow(recId) {
  renderCraftWindow(recId);
  document.getElementById('craft-menu').classList.add('show');
}
```

- [ ] **Step 4: 받기를 연결한다**

```javascript
document.getElementById('craft-claim').onclick = () => {
  const today = todayStr();
  const mine = gameState.craft.slots.filter(s => s.st === curKiln);
  const { gained, claimed } = claimAll(mine, today);
  gameState.craft.slots = gameState.craft.slots.filter(s => !(s.st === curKiln && isReady(s, today)));
  for (const [k, v] of Object.entries(gained)) addItem(k, v);
  for (const c of claimed) {
    trackEvent('craft_claim', { item: c.item, qty: c.qty, grade: c.grade, waited_days: c.waitedDays });
  }
  requestSave(); rebuildOutdoor(); renderCraftWindow(curKiln);
  ui.toast?.(`🔥 ${claimed.map(c => `${recipeOf(c.item).ico}${recipeOf(c.item).name} ${c.qty}`).join(' · ')}`);
};
```

- [ ] **Step 5: 340px·320px 에서 실측한다**

Run:
```bash
for w in 340 320; do
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
    --virtual-time-budget=4000 --window-size=$w,760 \
    --screenshot=/tmp/craft-$w.png "http://localhost:8000/?dbg"
done
```
Expected: 칩이 두 줄로 깨지지 않고, 재료 줄의 마지막 글자가 떨어지지 않고, 창이 화면 밖으로 넘치지 않는다. 슬롯 0칸·2칸, 재료 부족 유무를 모두 본다.

- [ ] **Step 6: 커밋한다**

```bash
git add index.html js/game.js
git commit -m "feat: 🔥 가공 창을 붙인다 — 걸기가 한 번에 끝난다

sims/craft-ui-sim.html 에서 확정한 B안. 슬롯 띠로 상태를 보이고 레시피
줄에서 바로 건다. A·C안은 슬롯의 [걸기] → 레시피 창이 또 떠서 2단계였다 —
하루를 마무리하며 거는 반복 행동이라 마찰을 한 번이라도 줄여야 한다.

모바일에서 깨진 값을 주석으로 남겼다. 칩 폭 하한 88px(96px 이면 320px 에서
3칸이 2+1 로 흐른다), 부족 안내는 문장 대신 색(문장이면 마지막 글자가
다음 줄로 떨어진다).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: 미니게임 3종

**Files:**
- Create: `js/craft/mill.js`
- Test: `tests/craft-mill.test.mjs`
- Modify: `js/game.js` — `mgView.type` 분기(`:9004` 부근)에 `'mill'` 추가, `grill`·`season` 재사용 연결

**Interfaces:**
- Consumes: `CRAFT_RECIPES[].mg`, `yieldOf` (Task 1) · `setSlot` (Task 2) · `renderCraftWindow` (Task 5)
- Produces: `millScore(samples: Array<{t:number,a:number}>) => number` (0~1) · `gradeOfScore(score: number) => 0|1|2|3` · `startCraftMinigame(recId, itemId)` · `finishCraftMinigame(recId, itemId, grade, score)`

**난이도는 판정창 배율로만 조절한다.** 기존 `COURSE_MULT` 와 같은 규칙이다.

- [ ] **Step 1: 맷돌 판정 테스트를 쓴다**

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { millScore, gradeOfScore } from '../js/craft/mill.js';

test('millScore: 일정한 속도로 돌리면 만점에 가깝다', () => {
  const even = Array.from({ length: 30 }, (_, i) => ({ t: i * 100, a: i * 0.4 }));
  assert.ok(millScore(even) > 0.9, `고른 회전은 높은 점수 — 실제 ${millScore(even)}`);
});

test('millScore: 속도가 들쭉날쭉하면 깎인다', () => {
  const jerky = Array.from({ length: 30 }, (_, i) => ({ t: i * 100, a: i % 2 ? i * 0.1 : i * 0.9 }));
  assert.ok(millScore(jerky) < 0.6, `불규칙한 회전은 낮은 점수 — 실제 ${millScore(jerky)}`);
});

test('millScore: 표본이 모자라면 0', () => {
  assert.equal(millScore([]), 0);
  assert.equal(millScore([{ t: 0, a: 0 }]), 0);
});

test('gradeOfScore: 0~3 등급 — 경계값', () => {
  assert.equal(gradeOfScore(0.0), 0);
  assert.equal(gradeOfScore(0.49), 0);
  assert.equal(gradeOfScore(0.5), 1);
  assert.equal(gradeOfScore(0.74), 1);
  assert.equal(gradeOfScore(0.75), 2);
  assert.equal(gradeOfScore(0.9), 3);
  assert.equal(gradeOfScore(1.0), 3);
});
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인한다**

Run: `node --test tests/craft-mill.test.mjs`
Expected: FAIL — `Cannot find module '../js/craft/mill.js'`

- [ ] **Step 3: 구현한다**

`js/craft/mill.js`:

```javascript
// 🌾 맷돌 — 원을 따라 일정한 속도로 돌린다. 점수는 '고르기'다(빠르기가 아니라).
//    기존 넷(pot·chop·grill·season) 중 회전 드래그가 없어 이것만 신규로 만든다.

/** samples: [{ t: ms, a: 라디안 누적각 }] — 각속도의 변동계수가 작을수록 높은 점수 */
export function millScore(samples = []) {
  if (samples.length < 3) return 0;
  const v = [];
  for (let i = 1; i < samples.length; i++) {
    const dt = samples[i].t - samples[i - 1].t;
    if (dt > 0) v.push(Math.abs(samples[i].a - samples[i - 1].a) / dt);
  }
  if (v.length < 2) return 0;
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  if (mean <= 0) return 0;
  const sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length);
  return Math.max(0, Math.min(1, 1 - sd / mean));      // 변동계수 0 → 1점
}

/** 요리와 같은 4단(😅🙂😋💫). 경계는 판정창 배율로만 조절한다 */
export function gradeOfScore(score) {
  if (score >= 0.9) return 3;
  if (score >= 0.75) return 2;
  if (score >= 0.5) return 1;
  return 0;
}
```

- [ ] **Step 4: 테스트를 돌려 통과를 확인한다**

Run: `node --test tests/craft-mill.test.mjs`
Expected: PASS (4 tests)

- [ ] **Step 5: 무대를 `mgView.type` 분기에 얹는다**

`js/game.js` 의 미니게임 루프(`:9004`)에 `mill` 분기를 추가하고, `grill`·`season` 은 기존 판정을 그대로 쓰되 무대 소품만 바꾼다(숯 = 공기구멍, 벽돌 = 반죽 판). 끝나면:

```javascript
function finishCraftMinigame(recId, itemId, grade, score) {
  gameState.craft.slots = setSlot(gameState.craft.slots, { st: recId, item: itemId, grade, day: todayStr() });
  trackEvent('craft_set', {
    item: itemId, grade, score: Math.round(score * 100), qty: yieldOf(itemId, grade),
    slot_idx: gameState.craft.slots.filter(s => s.st === recId).length - 1,
    station_seq: gameState.outdoor.filter(r => r.id === 'kiln').length,
  });
  requestSave(); rebuildOutdoor(); renderCraftWindow(recId);
}
```

- [ ] **Step 6: 세 미니게임을 실제로 쳐 본다**

Run: 브라우저에서 숯·밀가루·벽돌을 각각 걸어 본다.
Expected: 세 개가 서로 다른 조작으로 읽히고, 등급이 수율로 이어지고(💫이면 5개), 슬롯이 「굽는 중」으로 바뀐다.

- [ ] **Step 7: 커밋한다**

```bash
git add js/craft/mill.js tests/craft-mill.test.mjs js/game.js
git commit -m "feat: 🔥 화덕 미니게임 3종을 붙인다 — 걸 때 치르고 수율이 갈린다

밀가루는 맷돌(신규 mill) — 원을 따라 '고르게' 돌리는 게 점수다. 각속도의
변동계수를 쓴다. 빠르기가 아니라 고르기라 서두른다고 유리하지 않다.

숯은 grill, 벽돌은 season 판정을 재사용하고 무대·연출만 바꾼다. 신규 판정
로직은 맷돌 하나뿐이다.

조작은 걸 때만 치른다. 완성은 여전히 다음 날이라 기다림이 사라지지 않는다 —
그 자리에서 결과가 나오면 리텐션 레버가 아니라 다섯 번째 미니게임이 된다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 7: 로그인 정산과 요약

**Files:**
- Modify: `js/game.js` — `catchUpWorkers()` 호출부(`:2517`) 옆

**Interfaces:**
- Consumes: `isReady`, `waitedDays` (Task 2) · `recipeOf` (Task 1)
- Produces: `catchUpCraft() => slot[] | null`

**자동으로 받아 주지 않는다.** 받는 행동 자체가 "돌아온 보람"이라 요약은 **알려만 주고** 수령은 화덕에서 한다.

- [ ] **Step 1: 정산을 연결한다**

```javascript
// 🔥 화덕 — 자고 일어난 사이에 다 된 것을 알린다. 받는 건 화덕에서(받는 행동이 돌아온 보람이다)
function catchUpCraft() {
  const today = todayStr();
  const ready = (gameState.craft?.slots || []).filter(s => isReady(s, today));
  if (!ready.length) return null;
  trackEvent('craft_ready_notice', {
    n: ready.length,
    max_waited: Math.max(...ready.map(s => waitedDays(s.day, today))),
  });
  return ready;
}
```

`js/game.js:2517` 의 `catchUpWorkers();` 바로 아래에 `const craftReady = catchUpCraft();` 를 두고, 일꾼 요약 모달에 한 줄을 더한다:

```javascript
if (craftReady?.length) {
  bits.push(`🔥 화덕에 ${craftReady.map(s => recipeOf(s.item).ico + recipeOf(s.item).name).join(' · ')}이(가) 다 구워졌어요`);
}
```

- [ ] **Step 2: 날짜를 넘겨 실측한다**

Run: 재료를 걸고, 세이브의 `craft.slots[].day` 를 어제 날짜로 바꾼 뒤 새로고침.
Expected: 로그인 요약에 「🔥 화덕에 ⚫숯이(가) 다 구워졌어요」가 뜨고, 화덕 상판에 산출물이 올라와 있다.

- [ ] **Step 3: 커밋한다**

```bash
git add js/game.js
git commit -m "feat: 🔥 다 구워진 것을 로그인 요약에 알린다

일꾼 정산과 같은 자리에 한 줄을 더한다. 자동으로 받아 주지는 않는다 —
받으러 가는 행동 자체가 '돌아온 보람' 이라 그것까지 없애면 알림만 남는다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 8: 빵 — 밀가루의 출구

**Files:**
- Modify: `js/game.js` — `RECIPES`(`:280`) · `CAFE_PAY`(`:293` 부근) · `SELL_PRICE`(`:603`) · `GIFTS`(`:745`) · `DEX`(`:1219`)

**Interfaces:**
- Consumes: `flour` 인벤토리 키 (Task 5 의 수령 경로가 채운다)
- Produces: `RECIPES` 에 `bread` · 도감 cook 카테고리 +1

**벽돌의 "제작비 절감" 적용 범위를 이 태스크 착수 전에 정한다.** 집 증축까지 할지 야외 시설만 할지에 따라 경제 영향이 달라진다. 정하지 못하면 이번엔 판매·도구 강화만 잇고 건축 적용은 2단계로 미룬다.

- [ ] **Step 1: 레시피를 넣는다**

`RECIPES` 배열 ★2 구간에:

```javascript
  { id: 'bread', name: '갓 구운 빵', ico: '🥐', cost: { flour: 2 }, buff: 'speed', dur: 150, desc: '150초 이동속도 +40%', stages: ['pot', 'grill'] },   // 🌾 화덕 밀가루가 있어야 만든다
```

★2 인데 지속이 150초(★3급)인 것은 **가공 재료를 쓴 보상**이다 — 하룻밤 기다린 값을 여기서 돌려준다.

- [ ] **Step 2: 단가·판매가·선물·도감을 잇는다**

```javascript
const CAFE_PAY = { …, bread: 56 };                                          // ★2 46~48 보다 높고 ★3 74 보다 낮게
const SELL_PRICE = { …, flour: 18, charcoal: 9, brick: 12, bread: 26 };
const GIFTS = [ …, { id: 'bread', name: '갓 구운 빵', ico: '🥐', cost: { bread: 1 } } ];
```

도감 `DEX` 의 cook 카테고리에 `bread` 를 추가한다. `DEX_TOTAL` 은 파생 계산이므로 따로 고치지 않는다.

- [ ] **Step 3: 체인을 끝까지 쳐 본다**

Run: 밀 → 화덕에 걸기 → (날짜 넘기기) → 밀가루 받기 → 부엌에서 빵 → 카페 서빙.
Expected: 카페에서 56 코인을 받고 도감에 빵이 오른다. 밀가루가 없으면 부엌에서 빵이 흐리게 나온다.

- [ ] **Step 4: 커밋한다**

```bash
git add js/game.js
git commit -m "feat: 🥐 빵을 넣는다 — 밀가루가 카페 매출로 이어진다

화덕이 밀가루까지만 만들고 빵은 부엌에서 굽는다. 화덕에서 빵이 바로 나오면
하룻밤 기다리는 편이 썰기·굽기보다 쉬워서 요리 미니게임 4종이 죽는다 —
화덕은 요리를 대체하지 않고 입구가 된다.

★2 인데 지속이 150초인 건 가공 재료를 쓴 보상이다.

RECIPES 9종의 재료가 전부 원재료라 밀·옥수수·포도가 판매 전용이었다.
밀이 드디어 요리로 간다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 9: 트래킹 마무리와 i18n

**Files:**
- Modify: `js/game.js` — 남은 이벤트
- Modify: `js/i18n-en.js`
- Modify: `scripts/i18n_check.mjs` — 검사 대상에 `js/craft/` 추가

**Interfaces:**
- Consumes: Task 5·6·7 의 이벤트 호출부
- Produces: GA4 이벤트 5종(`craft_set`·`craft_claim`·`craft_blocked`·`craft_station_build`·`craft_ready_notice`) · 영어 문구 전량

- [ ] **Step 1: 남은 이벤트를 넣는다**

화덕을 새로 지을 때(`placeOutdoor` 의 `kiln` 분기):

```javascript
trackEvent('craft_station_build', { seq: gameState.outdoor.filter(x => x.id === 'kiln').length });
```

`craft_blocked` 는 Task 5 Step 3 에서 이미 연결했다. **축은 전부 키값**이어야 한다 — `item: '숯'` 이 아니라 `item: 'charcoal'`.

- [ ] **Step 2: 영어 문구를 등재한다**

`js/i18n-en.js` 에 한국어 원문을 키로:

```javascript
  '화덕': 'Kiln',
  '재료를 걸어두면 다음 날 구워져 있어요 · 한 채에 2칸': 'Leave materials overnight · 2 slots each',
  '비어 있음': 'Empty',
  '재료를 걸어두세요': 'Leave materials here',
  '다 구워졌어요': 'Ready',
  '굽는 중': 'Firing',
  '무엇을 구울까요': 'What to fire',
  '걸어둔 것은 다음 날 찾아가면 다 구워져 있어요': 'Come back tomorrow — it will be ready',
  '서두르지 않아도 돼요 — 언제 와도 그대로예요': 'No rush — it waits for you',
  '숯': 'Charcoal', '밀가루': 'Flour', '벽돌': 'Brick', '갓 구운 빵': 'Fresh Bread',
```

**통문장으로 등재한다.** 조합 프롬프트의 글루(` · `)를 문장 안에 넣으면 치환이 깨진다.

- [ ] **Step 3: 검사를 돌린다**

Run: `node scripts/i18n_check.mjs`
Expected: 신규 문구 전량 커버. 빠진 게 나오면 채운다.

- [ ] **Step 4: 영어로 전 과정을 본다**

Run: 브라우저에서 언어를 영어로 바꾸고 화덕을 연다.
Expected: 한국어가 남아 있지 않다. 슬롯 칩·레시피·버튼·토스트 전부 확인.

- [ ] **Step 5: 커밋한다**

```bash
git add js/game.js js/i18n-en.js scripts/i18n_check.mjs
git commit -m "feat: 🔥 화덕 트래킹과 영어 문구를 채운다

craft_claim 의 waited_days 가 이 기능의 핵심 지표다 — 걸어둔 걸 며칠 만에
받으러 오는가. 이게 낮으면 D1 이 올라도 화덕 덕분이 아니다.

축은 전부 키값(item: 'charcoal')이다. quest_id 가 빠져 퀘스트 분석이
막혔던 전례가 있다.

i18n_check 대상에 js/craft/ 를 넣었다 — 목록에 없으면 이 도구가 누락을
못 잡는다(리텐션 배너에서 겪었다).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 10: 실측과 배포

**Files:** 없음 (검증·배포만)

- [ ] **Step 1: 전체 테스트**

Run: `npm test`
Expected: 기존 전량 + 신규 17 PASS

- [ ] **Step 2: 모바일 실측 — 4조합**

340px·320px × 슬롯 0칸·2칸 × 재료 부족 유무를 캡처로 남긴다. 토스 웹뷰(`--toss-reserve 52px`)도 본다.
Expected: 겹침 0 · 줄 깨짐 0 · 창이 화면 안.

- [ ] **Step 3: 드로우콜 재측정**

Run: 화덕 3채를 지은 상태에서 `renderer.info.render.calls`
Expected: 화덕이 없을 때 대비 **+18 이내**.

- [ ] **Step 4: 세이브 왕복**

Run: 재료를 걸고 → 저장 → 새로고침 → 복원 → 날짜를 넘겨 수령.
Expected: 슬롯이 그대로 살아 있고 수량·등급이 보존된다. **읽기 실패를 신규로 오인해 마을을 덮어쓴 사고가 있었으므로** 기존 세이브로도 반드시 확인한다.

- [ ] **Step 5: 배포**

```bash
npm test && npm run build:itch
```
웹 → 토스 번들 → itch zip 순서. 코드가 바뀌면 **세 곳 전부** 올린다.

- [ ] **Step 6: 다음 날 BigQuery 재검증**

Run:
```sql
select event_name,
  (select value.string_value from unnest(event_params) where key='item') item,
  (select value.int_value from unnest(event_params) where key='waited_days') waited,
  count(*) n
from `calm-forest.analytics_547127440.events_intraday_*`
where event_name like 'craft%'
group by 1, 2, 3 order by n desc
```
Expected: `craft_set` · `craft_claim` 이 파라미터와 함께 적재된다. `waited_days` 가 비어 있으면 이 기능의 성패를 못 잰다.

---

## 성공 기준 (스펙 §6)

1. D1 재방문율 22% → **30% 이상** (4주)
2. `craft_set` 대비 `craft_claim` **70% 이상** — 걸어둔 걸 받으러 돌아오는가
3. `craft_set` 도달 인원이 진입 유저의 **40% 이상** — 첫 화덕 기본 배치가 작동하는가

2번이 핵심이다. 이것이 낮으면 D1 이 올라도 화덕 덕분이 아니다.

## 이번 범위 밖

- **숯의 "고급 요리 화력" 용도.** 지금은 판매·도구 강화만 잇는다. 숯을 쓰는 요리는 2단계(농장 발효장)와 함께 정한다.
- **벽돌의 건축비 절감 적용 대상.** Task 8 착수 전에 정하고, 못 정하면 2단계로 미룬다.
