# 식당 단골 이웃 1단계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 식당 손님을 마을에 돌아온 이웃으로 바꾸고, 좋아하는 메뉴 대접으로 호감도가 오르고 단골 횟수가 쌓이게 한다.

**Architecture:** 순수 규칙은 새 파일 `js/restaurant/regulars.js`에 모은다. `session.js`는 지금 앉을 수 있는 이웃 id 목록만 옵션으로 받아 손님에 `npc`를 붙이고, 해금·호감도는 모른다. `js/spaces/restaurant.js`가 해금 목록을 넘기고, 서빙 이벤트를 받아 기존 `giftGain`(하루 상한 공유)·`gainAffinity`를 부르며, 영업 중 이웃을 `setNpcHidden`으로 마을에서 숨긴다.

**Tech Stack:** 바닐라 ES 모듈, three.js, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-20-restaurant-regulars-design.md`

## Global Constraints

- 코드·CSS·테스트에 주석 금지.
- 테스트 먼저(실패 확인 → 구현 → 통과).
- 불변 갱신(스프레드), 기존 패턴 유지.
- 새 UI 문구는 후보를 먼저 사용자 검수. 디자인은 시안 3개 이상을 PC·모바일로 비교 후 사용자 선택.
- 월드 말풍선은 이모지만. UI 문구에 엠대시(—)·"놀다" 금지.
- GA4: 이벤트당 새 파라미터 ≤5, 코드 키 ≤23.
- 커밋은 사용자가 요청할 때만, 푸시 금지.
- 테스트 명령: `node --test tests/restaurant-*.test.mjs` (워크트리 루트). 전체 `npm test`의 `@capacitor/app` 1건 실패는 node_modules 없는 환경 문제.

---

### Task 1: 단골 규칙 모듈

**Files:**
- Create: `js/restaurant/regulars.js`
- Test: `tests/restaurant-regulars.test.mjs`

**Interfaces:**
- Produces:
  - `GUEST_NPCS: string[]` 8명
  - `FAV: Record<string, 'grilled'|'riceball'|'soup'>`
  - `REGULAR_AT = 5`
  - `pickGuestNpc(free: string[], busy: Set<string>, rng): string|null` — busy 에 없는 free 중 하나, 없으면 null
  - `pickMenu(npc: string|null, menus: string[], rng): string` — npc 의 FAV 가 menus 에 있고 rng()<0.5 면 FAV, 아니면 menus 중 하나
  - `serveLove(npc, menu, stars): number` — npc 없거나 stars<4 면 0, FAV 면 2, 아니면 1
  - `recordRegular(regulars, npc, menu, stars): { regulars, became }` — FAV 를 별4↑로 냈을 때 fav+1, 5회 도달 순간 became=true
  - `sanitizeRegulars(raw): Record<string, { fav: number, done: boolean }>`

- [ ] **Step 1: 실패하는 테스트 작성** — `tests/restaurant-regulars.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GUEST_NPCS, FAV, REGULAR_AT, pickGuestNpc, pickMenu, serveLove, recordRegular, sanitizeRegulars } from '../js/restaurant/regulars.js';

const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };

test('손님 후보는 8명이고 모두 좋아하는 메뉴가 있다', () => {
  assert.deepEqual(GUEST_NPCS, ['farmer', 'builder', 'stargazer', 'angler', 'ferryman', 'forager', 'rancher', 'curator']);
  for (const id of GUEST_NPCS) assert.ok(['grilled', 'riceball', 'soup'].includes(FAV[id]));
  assert.equal(REGULAR_AT, 5);
});

test('이미 앉은 이웃은 다시 고르지 않고, 남은 이웃이 없으면 null', () => {
  assert.equal(pickGuestNpc(['farmer', 'angler'], new Set(['farmer']), seq(0)), 'angler');
  assert.equal(pickGuestNpc(['farmer'], new Set(['farmer']), seq(0)), null);
  assert.equal(pickGuestNpc([], new Set(), seq(0)), null);
});

test('좋아하는 메뉴가 있으면 절반 확률로 그 메뉴', () => {
  assert.equal(pickMenu('angler', ['grilled', 'riceball'], seq(0.1)), 'grilled');
  assert.equal(pickMenu('angler', ['grilled', 'riceball'], seq(0.9, 0.99)), 'riceball');
  assert.equal(pickMenu('forager', ['grilled', 'riceball'], seq(0)), 'grilled');
  assert.equal(pickMenu(null, ['grilled', 'riceball'], seq(0.99)), 'riceball');
});

test('호감도: 별4 이상만, 좋아하는 메뉴 2, 다른 메뉴 1, 나그네 0', () => {
  assert.equal(serveLove('angler', 'grilled', 5), 2);
  assert.equal(serveLove('angler', 'riceball', 4), 1);
  assert.equal(serveLove('angler', 'grilled', 3), 0);
  assert.equal(serveLove(null, 'grilled', 5), 0);
});

test('좋아하는 메뉴를 별4 이상으로 5번 내면 단골이 된다', () => {
  let r = {};
  let became = false;
  for (let i = 0; i < 5; i++) ({ regulars: r, became } = recordRegular(r, 'angler', 'grilled', 5));
  assert.equal(became, true);
  assert.deepEqual(r.angler, { fav: 5, done: true });
  assert.equal(recordRegular(r, 'angler', 'grilled', 5).became, false);
  assert.equal(recordRegular({}, 'angler', 'riceball', 5).regulars.angler, undefined);
  assert.equal(recordRegular({}, 'angler', 'grilled', 3).regulars.angler, undefined);
  assert.deepEqual(recordRegular({}, null, 'grilled', 5).regulars, {});
});

test('저장값 정리: 모르는 이웃·이상한 값은 버린다', () => {
  assert.deepEqual(sanitizeRegulars({ angler: { fav: 3, done: false }, ghost: { fav: 9 }, farmer: { fav: -2, done: 'y' } }), { farmer: { fav: 0, done: false }, angler: { fav: 3, done: false } });
  assert.deepEqual(sanitizeRegulars(null), {});
});
```

- [ ] **Step 2: 실패 확인** — `node --test tests/restaurant-regulars.test.mjs` → 모듈 없음으로 FAIL.

- [ ] **Step 3: 구현** — `js/restaurant/regulars.js`

```js
export const GUEST_NPCS = ['farmer', 'builder', 'stargazer', 'angler', 'ferryman', 'forager', 'rancher', 'curator'];
export const FAV = {
  farmer: 'riceball', builder: 'riceball', stargazer: 'riceball',
  angler: 'grilled', ferryman: 'grilled',
  forager: 'soup', rancher: 'soup', curator: 'soup',
};
export const REGULAR_AT = 5;
const FAV_ODDS = 0.5;
const nat = v => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
const pick = (list, rng) => list[Math.floor(rng() * list.length)];

export function pickGuestNpc(free, busy, rng) {
  const open = free.filter(id => !busy.has(id));
  return open.length ? pick(open, rng) : null;
}

export function pickMenu(npc, menus, rng) {
  const fav = npc && FAV[npc];
  if (fav && menus.includes(fav) && rng() < FAV_ODDS) return fav;
  return pick(menus, rng);
}

export function serveLove(npc, menu, stars) {
  if (!npc || stars < 4) return 0;
  return FAV[npc] === menu ? 2 : 1;
}

export function recordRegular(regulars, npc, menu, stars) {
  if (!npc || stars < 4 || FAV[npc] !== menu) return { regulars, became: false };
  const cur = regulars[npc] || { fav: 0, done: false };
  const fav = cur.fav + 1;
  const done = cur.done || fav >= REGULAR_AT;
  return { regulars: { ...regulars, [npc]: { fav, done } }, became: done && !cur.done };
}

export function sanitizeRegulars(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  for (const id of GUEST_NPCS) {
    const r = raw[id];
    if (!r || typeof r !== 'object') continue;
    out[id] = { fav: nat(r.fav), done: r.done === true };
  }
  return out;
}
```

- [ ] **Step 4: 통과 확인** — `node --test tests/restaurant-regulars.test.mjs` → PASS.

---

### Task 2: 저장 데이터에 단골 기록

**Files:**
- Modify: `js/restaurant/rules.js` (`defaultRestaurant`, `sanitizeRestaurant`)
- Test: `tests/restaurant-rules.test.mjs` (끝에 추가)

**Interfaces:**
- Consumes: `sanitizeRegulars` (Task 1)
- Produces: `gameState.restaurant.regulars` (항상 객체)

- [ ] **Step 1: 실패하는 테스트**

```js
test('식당 저장값에 단골 기록이 들어가고 정리된다', async () => {
  const { defaultRestaurant, sanitizeRestaurant } = await import('../js/restaurant/rules.js');
  assert.deepEqual(defaultRestaurant().regulars, {});
  assert.deepEqual(sanitizeRestaurant({ star: 2, regulars: { angler: { fav: 2, done: false }, ghost: {} } }).regulars, { angler: { fav: 2, done: false } });
  assert.deepEqual(sanitizeRestaurant({ star: 1 }).regulars, {});
});
```

- [ ] **Step 2: 실패 확인** — `node --test tests/restaurant-rules.test.mjs`

- [ ] **Step 3: 구현** — `rules.js` import 에 `import { sanitizeRegulars } from './regulars.js';` 추가. `defaultRestaurant()` 반환에 `regulars: {}` 추가. `sanitizeRestaurant` 반환의 `services: nat(raw.services),` 뒤에 `regulars: sanitizeRegulars(raw.regulars),` 추가.

- [ ] **Step 4: 통과 확인** — `node --test tests/restaurant-*.test.mjs`

---

### Task 3: 영업 세션의 손님에 이웃 붙이기

**Files:**
- Modify: `js/restaurant/session.js` (`createSession`, `spawn`, `serve`, `finishSession`, spawn 이벤트)
- Test: `tests/restaurant-session.test.mjs` (끝에 추가)

**Interfaces:**
- Consumes: `pickGuestNpc`, `pickMenu` (Task 1)
- Produces:
  - `createSession({ ..., neighbors = null })` — `neighbors: () => string[]`. null 이면 모든 손님이 나그네(`npc: null`).
  - 손님 `g.npc: string|null`. 이벤트 `spawn`·`served`·`staffServed` 에 `npc`.
  - `finishSession(S).regularN` — 이웃 손님에게 서빙한 수.

- [ ] **Step 1: 실패하는 테스트**

```js
test('손님은 돌아온 이웃 중에서 오고, 같은 이웃은 동시에 두 번 앉지 않으며, 남는 자리는 나그네', () => {
  const S = createSession({ star: 4, dda: one, rng: seq(0), neighbors: () => ['angler', 'farmer'] });
  const seen = [];
  for (let i = 0; i < 2000 && S.gid < 4; i++) {
    for (const e of tickSession(S, 0.05)) if (e.type === 'spawn') seen.push(e.npc);
  }
  const live = S.guests.filter(g => g.npc).map(g => g.npc);
  assert.equal(new Set(live).size, live.length);
  assert.ok(seen.includes('angler'));
  assert.ok(seen.includes('farmer'));
  assert.ok(seen.includes(null));
});

test('이웃 목록이 없으면 모두 나그네', () => {
  const S = createSession({ star: 1, dda: one, rng: seq(0) });
  for (let i = 0; i < 200 && !S.guests.length; i++) tickSession(S, 0.05);
  assert.equal(S.guests[0].npc, null);
});

test('서빙 이벤트에 손님 이웃이 실리고 결과에 이웃 손님 수가 남는다', () => {
  const S = createSession({ star: 1, dda: one, rng: seq(0), neighbors: () => ['angler'] });
  for (let i = 0; i < 400 && !S.tickets.length; i++) tickSession(S, 0.05);
  const tk = S.tickets[0];
  S.held = { kind: tk.menu, q: 1, plated: true };
  const tb = HALL.tables[tk.table];
  const ev = actAt(S, { x: tb[0], z: tb[1] + 1.0 }, { take: yes }).find(e => e.type === 'served');
  assert.equal(ev.npc, 'angler');
  assert.equal(finishSession(S).regularN, 1);
});
```

- [ ] **Step 2: 실패 확인** — `node --test tests/restaurant-session.test.mjs`

- [ ] **Step 3: 구현** (`session.js`)
  - 맨 위: `import { pickGuestNpc, pickMenu } from './regulars.js';`
  - `createSession` 인자에 `neighbors = null` 추가, 반환 객체에 `neighbors,` 추가, `stats` 에 `npcServed: 0` 추가.
  - `spawn(S)` 교체:

```js
function spawn(S) {
  const menus = S.first ? ['grilled'] : S.cfg.menus.filter(m => inStock(S, m));
  if (!menus.length) return null;
  const free = freeTables(S);
  if (!free.length) return null;
  const busy = new Set(S.guests.map(g => g.npc).filter(Boolean));
  const npc = S.neighbors ? pickGuestNpc(S.neighbors(), busy, S.rng) : null;
  const menu = S.first ? 'grilled' : pickMenu(npc, menus, S.rng);
  const table = free[Math.floor(S.rng() * free.length)];
  const g = { id: ++S.gid, table, menu, npc, state: 'walk', t: 0, walk: walkTime(table) };
  S.guests.push(g);
  return g;
}
```
  - `tickSession` 의 spawn 이벤트: `ev.push({ type: 'spawn', id: g.id, table: g.table, menu: g.menu, npc: g.npc });`
  - `serve()`: `S.stats.coins += coins;` 다음에 `if (g?.npc) S.stats.npcServed++;`, 반환을 `{ menu: tk.menu, stars, coins, table: tk.table, id: tk.id, npc: g?.npc ?? null }` 로.
  - `finishSession` 반환에 `regularN: st.npcServed,` 추가.

- [ ] **Step 4: 통과 확인** — `node --test tests/restaurant-*.test.mjs`. 기존 테스트가 rng 소비 순서 변경(메뉴 → 테이블 순서가 [이웃?, 메뉴, 테이블]로 바뀜)으로 깨지면 해당 테스트의 `seq` 값만 새 순서에 맞게 고친다. 기대 동작은 바꾸지 않는다.

---

### Task 4: 마을 연결 (손님 모형·숨김·호감도·단골·트래킹)

**Files:**
- Modify: `js/restaurant/runtime.js` (syncGuests, start, handle, finish)
- Modify: `js/spaces/restaurant.js` (import, takeGuest/releaseGuest, onGuestServed, env, exitRestaurant)
- Test: `tests/restaurant-wiring.test.mjs` (끝에 추가)

**Interfaces:**
- Consumes: `GUEST_NPCS`·`serveLove`·`recordRegular` (Task 1), `g.npc`·`regularN` (Task 3), `giftGain` (`js/affinity/stages.js`), `gainAffinity` (`js/affinity/index.js`), `setNpcHidden`·`buildNPCFigure` (`js/spaces/npc.js`), `isUnlocked` (`js/world/unlocks.js`), `buildCafeGuestCast` (`js/spaces/cafe.js`, `{ group }` 반환), `CAFE_GUESTS` (`js/data/places.js`), `npcObjs`·`todayStr` (`js/game.js`)
- Produces: env 콜백 `neighbors()`, `onGuestServed(e)`, `takeGuest(g)`(손님 객체), `releaseGuest(m)`

- [ ] **Step 1: 실패하는 테스트**

```js
test('식당 손님은 이웃 호감도·숨김·단골과 연결된다', () => {
  assert.match(STUB, /import \{ gainAffinity \} from '\.\.\/affinity\/index\.js'/);
  assert.match(STUB, /giftGain\(/);
  assert.match(STUB, /setNpcHidden\(o, true\)/);
  assert.match(STUB, /setNpcHidden\(o, false\)/);
  assert.match(STUB, /recordRegular\(/);
  assert.match(STUB, /trackEvent\('restaurant_regular', \{ npc \}\)/);
  assert.match(STUB, /neighbors: \(\) => GUEST_NPCS\.filter\(/);
  assert.match(STUB, /for \(const id of \[\.\.\.hiddenByRest\]\) showNeighbor\(id\)/);
});
```

- [ ] **Step 2: 실패 확인** — `node --test tests/restaurant-wiring.test.mjs`

- [ ] **Step 3: runtime.js**
  - `syncGuests`: `m = env.takeGuest(g.id)` → `m = env.takeGuest(g)`.
  - `start()`: `createSession({ star: r.star, dda: r.dda, neighbors: env.neighbors, stock: ..., ...})`.
  - `handle(events)`: `served`/`staffServed` 분기의 `env.popAt(...)` 다음 줄에 `env.onGuestServed?.(e);`.
  - `finish()`: `restaurant_service` 파라미터 객체에 `regular_n: r.regularN` 추가.

- [ ] **Step 4: spaces/restaurant.js**
  - 기존 `from '../game.js'` import 목록에 `npcObjs, todayStr` 추가. 기존 `import { buildNPCFigure } from './npc.js';` → `import { buildNPCFigure, setNpcHidden } from './npc.js';`. 새 import:

```js
import { gainAffinity } from '../affinity/index.js';
import { giftGain } from '../affinity/stages.js';
import { isUnlocked } from '../world/unlocks.js';
import { CAFE_GUESTS } from '../data/places.js';
import { buildCafeGuestCast } from './cafe.js';
import { GUEST_NPCS, serveLove, recordRegular } from '../restaurant/regulars.js';
```
  - `GUEST_POOL` 상수와 `guestDef` 삭제. `takeGuest`/`releaseGuest` 를 아래로 교체하고 `onGuestServed` 추가:

```js
const npcObj = id => npcObjs.find(o => o.def.id === id);
const hiddenByRest = new Set();
function hideNeighbor(id) {
  const o = npcObj(id);
  if (!o || o.hidden) return;
  setNpcHidden(o, true);
  hiddenByRest.add(id);
}
function showNeighbor(id) {
  if (!hiddenByRest.delete(id)) return;
  const o = npcObj(id);
  if (o) setNpcHidden(o, false);
}

function takeGuest(g) {
  const key = g.npc || CAFE_GUESTS[(g.id - 1) % CAFE_GUESTS.length].id;
  const fresh = () => (g.npc ? buildNPCFigure(NPCS.find(d => d.id === g.npc)).group : buildCafeGuestCast(CAFE_GUESTS.find(c => c.id === key)).group);
  const m = free.get(key)?.pop() || fresh();
  m.userData.restGuest = key;
  m.userData.restNpc = g.npc;
  if (g.npc) hideNeighbor(g.npc);
  setFogExempt(m, true);
  return m;
}

function releaseGuest(m) {
  const id = m.userData.restGuest;
  if (!id) return;
  if (m.userData.restNpc) showNeighbor(m.userData.restNpc);
  if (!free.has(id)) free.set(id, []);
  free.get(id).push(m);
}

function onGuestServed({ npc, menu, stars, table }) {
  if (!npc || runtime.session()?.first) return;
  const love = serveLove(npc, menu, stars);
  if (love > 0) {
    const { gain, state } = giftGain(gameState.hintsSeen?.affGift, todayStr(), npc, love);
    gameState.hintsSeen = { ...gameState.hintsSeen, affGift: state };
    if (gain > 0) {
      gainAffinity(npc, gain, 'restaurant');
      const [tx, tz] = HALL.tables[table];
      spawnFloatText(RESTAURANT.x + tx + 0.5, 2.0, RESTAURANT.z + tz, '❤️', '#ffffff', 1.1);
    }
  }
  const r = gameState.restaurant;
  const { regulars, became } = recordRegular(r.regulars || {}, npc, menu, stars);
  if (regulars !== r.regulars) gameState.restaurant = { ...gameState.restaurant, regulars };
  if (became) trackEvent('restaurant_regular', { npc });
}
```
  - `createRestaurantRuntime({...})` env 에 `neighbors: () => GUEST_NPCS.filter(id => isUnlocked(gameState, id)),` 와 `onGuestServed,` 추가.
  - `exitRestaurant()` 의 `runtime?.abort();` 다음 줄에 `for (const id of [...hiddenByRest]) showNeighbor(id);`.

- [ ] **Step 5: 통과 확인** — `node --test tests/restaurant-*.test.mjs` 후 `node --test tests/*.test.mjs` 로 순환 import·GA4 키 상한 테스트까지 확인. GA4 상한 테스트가 새 키 `regular_n`·이벤트 `restaurant_regular` 를 목록에 요구하면 그 테스트가 가리키는 목록 파일에 추가한다.

---

### Task 5: 주문표 이웃 얼굴 (시안 → 선택 → 구현)

**Files:**
- Create: `sims/restaurant-ticket-face/index.html`, `sims/restaurant-ticket-face/compare.html`, 캡처 PNG (커밋 안 함)
- Modify: `js/restaurant/hud.js` (`tickets()` 마크업·`.tk` CSS, `ticketHtml` export)
- Modify: `js/restaurant/runtime.js` (`drawHud` 의 `hud.tickets` 호출)
- Modify: `js/spaces/restaurant.js` (env `faceOf`)
- Test: `tests/restaurant-card.test.mjs`

**Interfaces:**
- Consumes: `FAV` (Task 1), `g.npc` (Task 3)
- Produces: `ticketHtml(t, now, pat, focus)` — `t` 에 `face: string`, `fav: boolean` 필드

- [ ] **Step 1: 시안 3개** — `mountHud(document)` → `hud.show(true)` 후 손님 3명 주문표를 그린 정적 페이지(`?v=A|B|C`). 좋아하는 메뉴 주문 1(낚시꾼 🎣 + 🐟), 다른 메뉴 1(농부 🧑‍🌾 + 🐟), 나그네 1(🦌 + 🍙).
  - A: 칸 맨 위 번호 자리에 이웃 얼굴, 번호는 얼굴 옆에 작게.
  - B: 칸 왼쪽 위 모서리에 둥근 얼굴 배지(칸 밖으로 반쯤 나옴).
  - C: 칸 아래에 얼굴 띠, 좋아하는 메뉴면 얼굴 옆 💗.
- [ ] **Step 2: 캡처** — 헤드리스 크롬: PC 1280×800, 모바일 390×844(390px iframe 3개 나란히), 가로 폰 844×390.
- [ ] **Step 3: 사용자에게 보내고 선택 받기.** 선택 전 Step 4 이후 진행 금지.
- [ ] **Step 4: 실패하는 테스트** — 고른 시안의 마크업을 `ticketHtml` 로 검사: 이웃 손님은 그 이웃 얼굴, 좋아하는 메뉴면 하트 표시, 나그네는 나그네 얼굴, 탁자 번호는 그대로 보임.
- [ ] **Step 5: 구현** — `tickets()` 안의 map 본문을 `ticketHtml` 로 빼고 고른 시안 마크업으로 바꾼다. runtime `drawHud` 에서 `hud.tickets(S.tickets.map(t => { const g = S.guests.find(x => x.id === t.id); return { ...t, face: env.faceOf?.(g) ?? '', fav: !!g?.npc && FAV[g.npc] === t.menu }; }), S.time, S.dda.pat, nx?.ticket ?? null)`. spaces 의 env 에 `faceOf: g => (g?.npc ? NPCS.find(d => d.id === g.npc)?.emoji : CAFE_GUESTS[(g.id - 1) % CAFE_GUESTS.length].emoji) ?? ''`.
- [ ] **Step 6: 통과 확인 + 미리보기 캡처(PC·모바일)**

---

### Task 6: 주민 수첩 한 줄 (문구 검수 → 구현)

**Files:**
- Modify: `js/affinity/copy.js` (`favLine`), `js/affinity/index.js` (수첩 데이터에 `fav`·`regular`), `js/affinity/book-ui.js` (한 줄)
- Test: `tests/restaurant-regulars.test.mjs` (끝에 추가)

- [ ] **Step 1: 문구 후보 제시** — 수첩 카드 모바일 폭에서 한 줄에 들어가는지 실측해 함께 보여 준다.
  - ① "🍽️ 좋아하는 메뉴 🍙 주먹밥" / 단골: "🍽️ 식당 단골 · 🍙 주먹밥"
  - ② "🍙 주먹밥을 좋아해요" / 단골: "🍙 주먹밥을 좋아하는 식당 단골"
  - ③ "식당에서 즐겨 먹는 메뉴 🍙" / 단골: "식당 단골 🍙"
- [ ] **Step 2: 사용자 선택 받기.** 선택 전 진행 금지.
- [ ] **Step 3: 실패하는 테스트** — 고른 문구로 `favLine({ menu: 'riceball', regular: false, lang: 'ko' })`, `regular: true`, `lang: 'en'` 세 경우의 반환 문자열을 검사.
- [ ] **Step 4: 구현** — `copy.js` 에 `favLine`. `index.js` 수첩 데이터 map 에 `fav: FAV[id] ?? null, regular: !!gameState.restaurant?.regulars?.[id]?.done` (import `FAV` from `../restaurant/regulars.js`). `book-ui.js` 의 `nbk-gift` 줄 바로 위에 `if (n.fav) d.appendChild(el('p', 'nbk-fav', favLine({ menu: n.fav, regular: n.regular, lang: getLang() })));`
- [ ] **Step 5: 통과 확인 + 미리보기에서 수첩 캡처(PC·모바일)**

---

### Task 7: 미리보기 확인·리뷰

- [ ] **Step 1:** 루트 `.claude/launch.json` 에 이 워크트리 항목(`rest-regulars`, 포트 8795) 추가 후 `?dbg=1` 게스트로 진입, 소리 끄기.
- [ ] **Step 2:** `tree.branches.kitchen.habitat=true` 만 켠 새 세이브(돌아온 이웃 적음)로 영업 → 나그네가 섞여 손님 수가 별1 7명 내외로 유지되는지.
- [ ] **Step 3:** 이웃 여러 명 해금 세이브로 영업 → 좋아하는 메뉴 서빙 시 ❤️·호감도 토스트, 같은 날 선물 2개 준 이웃은 안 오름, 영업 중 그 이웃이 마을에서 숨고 끝나면 돌아옴(`npcObjs` 의 `hidden`), 영업 중 나가기에도 돌아옴.
- [ ] **Step 4:** 좋아하는 메뉴 5회 → `restaurant.regulars[npc].done === true`, `restaurant_regular` 호출 확인.
- [ ] **Step 5:** code-reviewer 에이전트로 diff 리뷰, 지적 반영.
- [ ] **Step 6:** `dev/active/restaurant-regulars/restaurant-regulars-tasks.md` 갱신. 커밋은 사용자 요청 시.
