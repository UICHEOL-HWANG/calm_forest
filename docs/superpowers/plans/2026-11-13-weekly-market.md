# Weekly Market Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 주중에 주간 의뢰 5개로 장터 표를 모으고, 금~일에 열리는 주말 장터에서 그 표로 6주 순환 한정 꾸미기를 사는 한 주짜리 흐름을 만든다.

**Architecture:** 순수 규칙 모듈(`js/weekly/rules.js`)이 주차 계산·의뢰 뽑기·표 지급·구매 판정을 전부 맡고, 상태는 세이브(`gameState.weekly`)에만 둔다. 새 서버 RPC는 없다. game.js에는 연결 줄만 넣고, 조형·창·트래킹은 각자 파일로 나눈다.

**Tech Stack:** 바닐라 ES 모듈, Three.js, `node --test`(tests/*.test.mjs), GA4 `trackEvent`(js/analytics.js).

**Spec:** `docs/superpowers/specs/2026-11-13-weekly-market-design.md`

## Global Constraints

- 새 코드·CSS·테스트에 주석을 쓰지 않는다.
- 새 로직은 game.js에 넣지 않는다. game.js에는 `weekly` 연결 줄만 둔다(상한 14줄, Task 6 테스트가 잠근다).
- 상태 갱신은 불변으로 한다. 규칙 함수는 새 객체를 돌려준다.
- 모든 시각 판정은 한국 시간(UTC+9) 기준이다.
- UI 문구에 엠대시(—)와 "놀다" 계열 낱말을 쓰지 않는다. 새 버튼·라벨 문구는 구현 전에 후보를 사용자에게 검수받는다.
- 머리 위 말풍선은 이모지만 쓴다. 길 안내 표식은 CSS·3D로 그린 금색 화살표만 쓴다(화살표 이모지 금지).
- 새 GA4 이벤트는 5개, 이벤트당 파라미터는 스펙 9절 그대로.
- 조형은 주제마다 시안 3개 이상을 렌더해 PC·모바일로 나란히 비교한 뒤 사용자가 고른다.
- 한국어 문구를 추가하면 `js/i18n-en.js`에 영어 값을 같이 넣는다.
- 커밋 메시지는 영어, `<type>: <description>` 형식.
- 작업은 워크트리 `feat/weekly-market`에서 한다. 워크트리에는 `.env`가 없어 로컬 서버의 API 호출은 실패한다(이 기능은 서버를 쓰지 않으므로 영향 없음).
- 새 꾸미기 id가 들어가므로 배포는 5곳(웹, 토스, Play, iOS, itch) 동시에 한다. 배포는 이 계획의 범위 밖이고 사용자 지시가 있을 때만 한다.

## 스펙에서 달라진 점 (계획 단계에서 확정)

- 주차 키는 ISO 문자열 대신 정수 `weekIndex`(1970-01-05 월요일 00:00 KST부터 센 주 번호)를 쓴다. 순환(`mod 6`)과 시드에 그대로 쓸 수 있다.
- "갯벌 줍기"는 "숲 채집"으로 바꾼다. 조회에 쓴 `forage_pick`은 갯벌이 아니라 채집 숲 이벤트였다(`js/spaces/forest.js:173`).
- 팔기 의뢰는 "물건 30개 팔기"로 한다. 기존 `questEvent('sell', qty)`가 개수를 넘기므로 새 발화 지점이 필요 없다. 참고 수치: 주 2일 이상 접속자의 주간 판매 금액 중앙값 304코인, 하위 25%는 50코인(작물 30개는 약 150코인).
- `questEvent`가 없는 행동 7종(카페 대접, 깎기, 동굴 층, 썰매 완주, 별자리, 이웃 구경, 일일 의뢰 완료)은 각 공간 파일에 `weeklyNote` 호출을 한 줄씩 추가한다.
- 장터 자리는 수확제 좌판이 있던 `PLAZA_STALL_POS`(25.4, -1.0), 의뢰판은 (24.2, -0.4)로 한다. 시즌이 끝나 좌판 충돌체가 빠진 자리다. 저녁 경매 무대(10.5, -18)와는 떨어져 있다.
- 스펙 7절의 `state.js`는 만들지 않고 `index.js`에 합친다. 세이브 읽기·쓰기가 `deps.getState/setState` 두 줄뿐이다.

## File Structure

| 파일 | 역할 |
|---|---|
| Create `js/data/weekly.js` | 의뢰 풀, 표 수치, 6주 품목 표, 좌표. 값만 |
| Create `js/weekly/rules.js` | 순수 규칙 전부 |
| Create `js/weekly/track.js` | GA4 이벤트 5개 |
| Create `js/weekly/copy.js` | 화면 문구 |
| Create `js/weekly/ui.js` | 의뢰판 창, 장터 창 |
| Create `js/weekly/bridge.js` | 게임 상태와 규칙 사이 어댑터(해금 판정, 보유 판정, 지급) |
| Create `js/weekly/guide.js` | 첫 접속 안내 판정 |
| Create `js/weekly/index.js` | game.js가 부르는 진입점. 근접 판정, 창 열기, 안내 |
| Create `js/spaces/weekly-market-art.js` | 수레, 의뢰판, 상인 조형 |
| Create `js/weekly/items.js` | 꾸미기 18종 조형 빌더 |
| Modify `js/data/catalog.js` | DECOR 12종, OUTDOOR 6종 등록 |
| Modify `js/game.js` | 연결 줄 |
| Modify `js/spaces/doors.js` | 근접 프롬프트 |
| Modify `js/spaces/cafe.js`, `js/spaces/delve.js`, `js/mountain/sled-run.js`, `js/observatory/star-run.js`, 깎기·이웃 구경 파일 | `weeklyNote` 한 줄씩 |
| Modify `js/i18n-en.js` | 영어 값 |
| Create `tests/weekly-*.test.mjs` | 테스트 |

---

### Task 1: 데이터 표

**Files:**
- Create: `js/data/weekly.js`
- Test: `tests/weekly-data.test.mjs`

**Interfaces:**
- Produces: `WEEKLY_GROUPS: string[]`, `WEEKLY_POOL: {id,group,type,target}[]`, `WEEKLY_FALLBACK: {id,group,type,target}[]`, `TICKETS_PER_QUEST=2`, `TICKET_CAP=15`, `MARKET_THEMES: {id, hero:{id,cost,kind}, props:{id,cost,kind}[]}[]`, `MARKET_ITEM_IDS: string[]`, `MARKET_POS={x:25.4,z:-1.0}`, `BOARD_POS={x:24.2,z:-0.4}`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WEEKLY_GROUPS, WEEKLY_POOL, WEEKLY_FALLBACK, TICKETS_PER_QUEST, TICKET_CAP, MARKET_THEMES, MARKET_ITEM_IDS } from '../js/data/weekly.js';

test('every group has at least two candidates', () => {
  for (const g of WEEKLY_GROUPS) assert.ok(WEEKLY_POOL.filter(q => q.group === g).length >= 2, g);
});

test('pool ids are unique and targets are positive integers', () => {
  const ids = [...WEEKLY_POOL, ...WEEKLY_FALLBACK].map(q => q.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const q of [...WEEKLY_POOL, ...WEEKLY_FALLBACK]) assert.ok(Number.isInteger(q.target) && q.target > 0, q.id);
});

test('fallback covers five distinct types', () => {
  assert.equal(new Set(WEEKLY_FALLBACK.map(q => q.type)).size, 5);
});

test('six themes with one hero at 6 tickets and two props at 2 tickets', () => {
  assert.equal(MARKET_THEMES.length, 6);
  for (const t of MARKET_THEMES) {
    assert.equal(t.hero.cost, 6);
    assert.equal(t.hero.kind, 'outdoor');
    assert.equal(t.props.length, 2);
    for (const p of t.props) { assert.equal(p.cost, 2); assert.equal(p.kind, 'indoor'); }
  }
  assert.equal(new Set(MARKET_ITEM_IDS).size, 18);
});

test('a full week of quests buys the whole stall', () => {
  assert.equal(TICKETS_PER_QUEST * WEEKLY_GROUPS.length, 10);
  assert.ok(TICKET_CAP >= 10);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/weekly-data.test.mjs`
Expected: FAIL, `Cannot find module '../js/data/weekly.js'`

- [ ] **Step 3: 구현**

```js
export const WEEKLY_GROUPS = Object.freeze(['field', 'water', 'craft', 'explore', 'village']);

const q = (id, group, type, target) => Object.freeze({ id, group, type, target });

export const WEEKLY_POOL = Object.freeze([
  q('w_harvest', 'field', 'harvest', 25),
  q('w_water', 'field', 'water', 40),
  q('w_forage', 'field', 'forage', 15),
  q('w_fish', 'water', 'fish', 15),
  q('w_fish_rare', 'water', 'fish_rare', 2),
  q('w_cook', 'craft', 'cook', 8),
  q('w_serve', 'craft', 'serve', 6),
  q('w_carve', 'craft', 'carve', 2),
  q('w_delve', 'explore', 'delve', 5),
  q('w_sled', 'explore', 'sled', 2),
  q('w_star', 'explore', 'star', 1),
  q('w_gift', 'village', 'gift', 3),
  q('w_neighbor', 'village', 'neighbor', 3),
  q('w_daily', 'village', 'daily', 10),
  q('w_sell', 'village', 'sell', 30),
]);

export const WEEKLY_FALLBACK = Object.freeze([
  q('f_harvest', 'any', 'harvest', 25),
  q('f_fish', 'any', 'fish', 15),
  q('f_chop', 'any', 'chop', 30),
  q('f_sell', 'any', 'sell', 30),
  q('f_daily', 'any', 'daily', 10),
]);

export const TICKETS_PER_QUEST = 2;
export const TICKET_CAP = 15;

const hero = (id) => Object.freeze({ id, cost: 6, kind: 'outdoor' });
const prop = (id) => Object.freeze({ id, cost: 2, kind: 'indoor' });
const theme = (id, h, a, b) => Object.freeze({ id, hero: hero(h), props: Object.freeze([prop(a), prop(b)]) });

export const MARKET_THEMES = Object.freeze([
  theme('tea', 'teadeck', 'teacups', 'bojagi'),
  theme('flower', 'flowercart', 'flowerpail', 'driedflowers'),
  theme('seaside', 'shellshade', 'glassbuoy', 'conchpot'),
  theme('books', 'bookstall', 'globe', 'inkquill'),
  theme('bakery', 'breadcart', 'baguettes', 'jamshelf'),
  theme('busker', 'buskerstage', 'guitarstand', 'gramophone'),
]);

export const MARKET_ITEM_IDS = Object.freeze(MARKET_THEMES.flatMap(t => [t.hero.id, ...t.props.map(p => p.id)]));

export const MARKET_POS = Object.freeze({ x: 25.4, z: -1.0 });
export const BOARD_POS = Object.freeze({ x: 24.2, z: -0.4 });
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/weekly-data.test.mjs`
Expected: PASS 5건

- [ ] **Step 5: 커밋**

```bash
git add js/data/weekly.js tests/weekly-data.test.mjs
git commit -m "feat(weekly): add quest pool and market theme tables"
```

---

### Task 2: 주차·장터 시각 규칙

**Files:**
- Create: `js/weekly/rules.js`
- Test: `tests/weekly-rules.test.mjs`

**Interfaces:**
- Produces: `weekIndex(ms: number): number`, `marketOpen(ms: number): boolean`, `themeFor(index: number): theme`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weekIndex, marketOpen, themeFor } from '../js/weekly/rules.js';
import { MARKET_THEMES } from '../js/data/weekly.js';

const kst = (y, m, d, h = 0, min = 0) => Date.UTC(y, m - 1, d, h - 9, min);

test('week rolls over at Monday 00:00 KST', () => {
  assert.equal(weekIndex(kst(2026, 11, 8, 23, 59)) + 1, weekIndex(kst(2026, 11, 9, 0, 0)));
  assert.equal(weekIndex(kst(2026, 11, 9, 0, 0)), weekIndex(kst(2026, 11, 15, 23, 59)));
});

test('market opens Friday 00:00 and closes Monday 00:00 KST', () => {
  assert.equal(marketOpen(kst(2026, 11, 12, 23, 59)), false);
  assert.equal(marketOpen(kst(2026, 11, 13, 0, 0)), true);
  assert.equal(marketOpen(kst(2026, 11, 14, 12, 0)), true);
  assert.equal(marketOpen(kst(2026, 11, 15, 23, 59)), true);
  assert.equal(marketOpen(kst(2026, 11, 16, 0, 0)), false);
});

test('themes rotate every six weeks', () => {
  const w = weekIndex(kst(2026, 11, 13));
  assert.equal(themeFor(w).id, themeFor(w + 6).id);
  assert.equal(new Set([0, 1, 2, 3, 4, 5].map(i => themeFor(w + i).id)).size, 6);
  assert.ok(MARKET_THEMES.includes(themeFor(w)));
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/weekly-rules.test.mjs`
Expected: FAIL, 모듈 없음

- [ ] **Step 3: 구현**

```js
import { MARKET_THEMES } from '../data/weekly.js';

const DAY = 86400000;
const KST = 9 * 3600000;
const kstDays = (ms) => Math.floor((ms + KST) / DAY);

export function weekIndex(ms) {
  return Math.floor((kstDays(ms) - 4) / 7);
}

export function marketOpen(ms) {
  const dow = ((kstDays(ms) + 4) % 7 + 7) % 7;
  return dow === 5 || dow === 6 || dow === 0;
}

export function themeFor(index) {
  const n = MARKET_THEMES.length;
  return MARKET_THEMES[((index % n) + n) % n];
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/weekly-rules.test.mjs`
Expected: PASS 3건

- [ ] **Step 5: 커밋**

```bash
git add js/weekly/rules.js tests/weekly-rules.test.mjs
git commit -m "feat(weekly): add KST week index and market open rules"
```

---

### Task 3: 의뢰 뽑기

**Files:**
- Modify: `js/weekly/rules.js`
- Test: `tests/weekly-rules.test.mjs` (추가)

**Interfaces:**
- Consumes: `WEEKLY_GROUPS`, `WEEKLY_POOL`, `WEEKLY_FALLBACK`
- Produces: `pickWeekly(index: number, canDo: (type: string) => boolean, prevIds: string[]): string[]` (의뢰 id 5개), `questById(id: string): quest | null`

- [ ] **Step 1: 실패하는 테스트 추가**

```js
import { pickWeekly, questById } from '../js/weekly/rules.js';
import { WEEKLY_GROUPS } from '../js/data/weekly.js';

const all = () => true;

test('picks one quest per group', () => {
  const ids = pickWeekly(2970, all, []);
  assert.equal(ids.length, 5);
  assert.deepEqual(ids.map(id => questById(id).group), WEEKLY_GROUPS);
});

test('same week gives the same picks', () => {
  assert.deepEqual(pickWeekly(2970, all, []), pickWeekly(2970, all, []));
});

test('locked types are never picked', () => {
  const open = new Set(['harvest', 'water', 'fish', 'cook', 'gift', 'sell', 'chop', 'daily']);
  for (let w = 2970; w < 2990; w++) {
    for (const id of pickWeekly(w, t => open.has(t), [])) assert.ok(open.has(questById(id).type), id);
  }
});

test('an empty group is filled from the fallback without duplicate types', () => {
  const open = new Set(['harvest', 'fish', 'chop', 'sell', 'daily']);
  const ids = pickWeekly(2970, t => open.has(t), []);
  assert.equal(ids.length, 5);
  assert.equal(new Set(ids.map(id => questById(id).type)).size, 5);
});

test('last week picks are avoided when the group has another candidate', () => {
  for (let w = 2970; w < 2990; w++) {
    const prev = pickWeekly(w, all, []);
    const next = pickWeekly(w + 1, all, prev);
    for (const id of next) assert.ok(!prev.includes(id), `${w}: ${id}`);
  }
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/weekly-rules.test.mjs`
Expected: FAIL, `pickWeekly is not a function`

- [ ] **Step 3: 구현 (rules.js에 추가, import 줄도 넓힌다)**

```js
import { MARKET_THEMES, WEEKLY_GROUPS, WEEKLY_POOL, WEEKLY_FALLBACK } from '../data/weekly.js';

const BY_ID = new Map([...WEEKLY_POOL, ...WEEKLY_FALLBACK].map(q => [q.id, q]));

export function questById(id) {
  return BY_ID.get(id) || null;
}

function seeded(seed) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickWeekly(index, canDo, prevIds = []) {
  const rand = seeded(index);
  const picked = [];
  const usedTypes = new Set();
  for (const group of WEEKLY_GROUPS) {
    const roll = rand();
    const open = WEEKLY_POOL.filter(q => q.group === group && canDo(q.type) && !usedTypes.has(q.type));
    const fresh = open.filter(q => !prevIds.includes(q.id));
    const pool = fresh.length ? fresh : open;
    const choice = pool.length
      ? pool[Math.floor(roll * pool.length)]
      : WEEKLY_FALLBACK.find(q => canDo(q.type) && !usedTypes.has(q.type)) || null;
    if (!choice) continue;
    picked.push(choice.id);
    usedTypes.add(choice.type);
  }
  return picked;
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/weekly-rules.test.mjs`
Expected: PASS 8건

- [ ] **Step 5: 커밋**

```bash
git add js/weekly/rules.js tests/weekly-rules.test.mjs
git commit -m "feat(weekly): pick five weekly quests by seeded group draw"
```

---

### Task 4: 상태 규칙 (주 넘김, 누적, 받기, 구매)

**Files:**
- Modify: `js/weekly/rules.js`
- Test: `tests/weekly-rules.test.mjs` (추가)

**Interfaces:**
- Produces:
  - `weeklyDefault(): {week:number, quests:string[], prev:string[], counts:Object<string,number>, claimed:string[], tickets:number, seenBoard:number, seenMarket:number}`
  - `restoreWeekly(saved: any): state`
  - `rollover(state, index: number, canDo): state` (주가 같으면 같은 객체를 그대로 돌려준다)
  - `note(state, type: string, n?: number): state`
  - `progressOf(state, questId: string): {have:number, target:number, done:boolean, claimed:boolean}`
  - `claim(state, questId: string): {ok:boolean, reason?:'not_done'|'claimed'|'unknown', state, gained:number}`
  - `buyPlan(state, item: {id,cost,kind}, ctx: {isGuest:boolean, owned:boolean, open:boolean}): {ok:boolean, reason?:'closed'|'guest'|'owned'|'short', short?:number}`
  - `spend(state, cost: number): state`

- [ ] **Step 1: 실패하는 테스트 추가**

```js
import { weeklyDefault, restoreWeekly, rollover, note, progressOf, claim, buyPlan, spend } from '../js/weekly/rules.js';

const fresh = (w = 2970) => rollover(weeklyDefault(), w, () => true);

test('rollover draws quests and keeps tickets', () => {
  const a = { ...fresh(2970), tickets: 7, counts: { harvest: 9 }, claimed: ['w_harvest'] };
  const b = rollover(a, 2971, () => true);
  assert.equal(b.week, 2971);
  assert.equal(b.tickets, 7);
  assert.deepEqual(b.counts, {});
  assert.deepEqual(b.claimed, []);
  assert.deepEqual(b.prev, a.quests);
  assert.equal(b.quests.length, 5);
});

test('rollover within the same week returns the same object', () => {
  const a = fresh(2970);
  assert.equal(rollover(a, 2970, () => true), a);
});

test('note accumulates without mutating', () => {
  const a = fresh();
  const b = note(note(a, 'harvest', 3), 'harvest');
  assert.equal(b.counts.harvest, 4);
  assert.equal(a.counts.harvest, undefined);
});

test('note ignores bad amounts', () => {
  const a = fresh();
  assert.equal(note(a, 'harvest', -2), a);
  assert.equal(note(a, 'harvest', NaN), a);
});

test('claim pays two tickets once', () => {
  const a = { ...fresh(), quests: ['w_harvest'], counts: { harvest: 25 } };
  const r = claim(a, 'w_harvest');
  assert.equal(r.ok, true);
  assert.equal(r.gained, 2);
  assert.equal(r.state.tickets, 2);
  assert.equal(claim(r.state, 'w_harvest').reason, 'claimed');
});

test('claim refuses unfinished and unknown quests', () => {
  const a = { ...fresh(), quests: ['w_harvest'], counts: { harvest: 24 } };
  assert.equal(claim(a, 'w_harvest').reason, 'not_done');
  assert.equal(claim(a, 'w_water').reason, 'unknown');
});

test('tickets stop at the cap', () => {
  const a = { ...fresh(), quests: ['w_harvest'], counts: { harvest: 25 }, tickets: 14 };
  const r = claim(a, 'w_harvest');
  assert.equal(r.state.tickets, 15);
  assert.equal(r.gained, 1);
});

test('progress reports have, target, done, claimed', () => {
  const a = { ...fresh(), quests: ['w_harvest'], counts: { harvest: 40 } };
  assert.deepEqual(progressOf(a, 'w_harvest'), { have: 25, target: 25, done: true, claimed: false });
});

test('buy plan checks open, guest, owned, tickets in that order', () => {
  const item = { id: 'teadeck', cost: 6, kind: 'outdoor' };
  const s = { ...fresh(), tickets: 4 };
  assert.equal(buyPlan(s, item, { isGuest: false, owned: false, open: false }).reason, 'closed');
  assert.equal(buyPlan(s, item, { isGuest: true, owned: false, open: true }).reason, 'guest');
  assert.equal(buyPlan(s, item, { isGuest: false, owned: true, open: true }).reason, 'owned');
  assert.deepEqual(buyPlan(s, item, { isGuest: false, owned: false, open: true }), { ok: false, reason: 'short', short: 2 });
  assert.deepEqual(buyPlan({ ...s, tickets: 6 }, item, { isGuest: false, owned: false, open: true }), { ok: true });
});

test('spend never goes below zero', () => {
  assert.equal(spend({ ...fresh(), tickets: 6 }, 6).tickets, 0);
  assert.equal(spend({ ...fresh(), tickets: 1 }, 6).tickets, 0);
});

test('restore tolerates missing and malformed saves', () => {
  assert.deepEqual(restoreWeekly(undefined), weeklyDefault());
  const r = restoreWeekly({ week: 2970, quests: ['w_harvest', 'gone'], tickets: 99, counts: { harvest: 'x', fish: 3 }, claimed: 'nope' });
  assert.deepEqual(r.quests, ['w_harvest']);
  assert.equal(r.tickets, 15);
  assert.deepEqual(r.counts, { fish: 3 });
  assert.deepEqual(r.claimed, []);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/weekly-rules.test.mjs`
Expected: FAIL, `weeklyDefault is not a function`

- [ ] **Step 3: 구현 (rules.js에 추가, import에 `TICKETS_PER_QUEST`, `TICKET_CAP` 추가)**

```js
export function weeklyDefault() {
  return { week: -1, quests: [], prev: [], counts: {}, claimed: [], tickets: 0, seenBoard: -1, seenMarket: -1 };
}

const int = (v, d = 0) => (Number.isInteger(v) ? v : d);
const ids = (v) => (Array.isArray(v) ? v.filter(id => BY_ID.has(id)) : []);

export function restoreWeekly(saved) {
  const base = weeklyDefault();
  if (!saved || typeof saved !== 'object') return base;
  const counts = {};
  for (const [k, v] of Object.entries(saved.counts || {})) if (Number.isInteger(v) && v > 0) counts[k] = v;
  return {
    week: int(saved.week, -1),
    quests: ids(saved.quests),
    prev: ids(saved.prev),
    counts,
    claimed: ids(saved.claimed),
    tickets: Math.max(0, Math.min(TICKET_CAP, int(saved.tickets))),
    seenBoard: int(saved.seenBoard, -1),
    seenMarket: int(saved.seenMarket, -1),
  };
}

export function rollover(state, index, canDo) {
  if (state.week === index) return state;
  return { ...state, week: index, prev: state.quests, quests: pickWeekly(index, canDo, state.quests), counts: {}, claimed: [] };
}

export function note(state, type, n = 1) {
  if (!Number.isFinite(n) || n <= 0) return state;
  return { ...state, counts: { ...state.counts, [type]: (state.counts[type] || 0) + Math.floor(n) } };
}

export function progressOf(state, questId) {
  const q = questById(questId);
  if (!q) return { have: 0, target: 0, done: false, claimed: false };
  const have = Math.min(q.target, state.counts[q.type] || 0);
  return { have, target: q.target, done: have >= q.target, claimed: state.claimed.includes(questId) };
}

export function claim(state, questId) {
  if (!state.quests.includes(questId)) return { ok: false, reason: 'unknown', state, gained: 0 };
  const p = progressOf(state, questId);
  if (p.claimed) return { ok: false, reason: 'claimed', state, gained: 0 };
  if (!p.done) return { ok: false, reason: 'not_done', state, gained: 0 };
  const tickets = Math.min(TICKET_CAP, state.tickets + TICKETS_PER_QUEST);
  return { ok: true, state: { ...state, claimed: [...state.claimed, questId], tickets }, gained: tickets - state.tickets };
}

export function buyPlan(state, item, ctx) {
  if (!ctx.open) return { ok: false, reason: 'closed' };
  if (ctx.isGuest) return { ok: false, reason: 'guest' };
  if (ctx.owned) return { ok: false, reason: 'owned' };
  if (state.tickets < item.cost) return { ok: false, reason: 'short', short: item.cost - state.tickets };
  return { ok: true };
}

export function spend(state, cost) {
  return { ...state, tickets: Math.max(0, state.tickets - cost) };
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/weekly-rules.test.mjs`
Expected: PASS 19건

- [ ] **Step 5: 커밋**

```bash
git add js/weekly/rules.js tests/weekly-rules.test.mjs
git commit -m "feat(weekly): add rollover, progress, claim and purchase rules"
```

---

### Task 5: 문구 검수 (사용자 게이트)

**Files:**
- Create: `sims/weekly-market-copy.html`

코드를 쓰기 전에 화면 문구 후보를 사용자에게 보여 주고 고르게 한다. 이 태스크의 산출물은 확정 문구 표다.

- [ ] **Step 1: 후보 작성.** 아래 자리마다 후보 3개씩을 `sims/weekly-market-copy.html`에 실제 창 폭(모바일 세로 360px, 가로 폰 740x360)으로 넣는다.

| 자리 | 예시 후보 (셋 중 하나) |
|---|---|
| 의뢰판 제목 | 이번 주 의뢰 |
| 의뢰 15종 이름 | 작물 25개 수확하기 · 물 40번 주기 · 숲에서 15개 채집하기 · 물고기 15마리 낚기 · 희귀 물고기 2마리 낚기 · 요리 8번 하기 · 카페 손님 6명 대접하기 · 나무 조각 2개 완성하기 · 동굴 5층 내려가기 · 썰매 2번 완주하기 · 별자리 1개 잇기 · 주민에게 선물 3번 하기 · 이웃 마을 3곳 구경하기 · 일일 의뢰 10건 끝내기 · 물건 30개 팔기 |
| 보상 받기 버튼 | 표 2장 받기 |
| 표 상한 안내 | 표는 15장까지 모을 수 있어요 |
| 장터 닫힘 안내 | 장터는 금요일에 열려요 |
| 장터 제목 | 주말 장터 |
| 구매 버튼 | 표 6장으로 사기 |
| 표 부족 | 표가 2장 모자라요 |
| 보유 표시 | 보유 중 |
| 게스트 안내 | 로그인하면 장터에서 살 수 있어요. 모은 표는 그대로 남아요 |
| 금요일 배너와 푸시 | 주말 장터가 열렸어요 |
| 근접 프롬프트 2종 | 의뢰판 보기 · 장터 둘러보기 |
| 꾸미기 18종 이름·설명 | 스펙 6.2 표의 가칭 |
| 표 이름과 아이콘 | 장터 표 🎟️ |

- [ ] **Step 2: 금지어 확인**

Run: `grep -nE "—|놀" sims/weekly-market-copy.html`
Expected: 출력 없음

- [ ] **Step 3: 캡처해서 사용자에게 보내고 확정 문구를 받는다.** 확정 문구를 `dev/active/weekly-market/weekly-market-context.md`의 "확정 문구" 절에 적는다. 이후 태스크는 그 절의 문구만 쓴다.

- [ ] **Step 4: 커밋**

```bash
git add sims/weekly-market-copy.html dev/active/weekly-market/weekly-market-context.md
git commit -m "docs(weekly): record approved weekly market copy"
```

---

### Task 6: 진입점과 game.js 연결

**Files:**
- Create: `js/weekly/index.js`, `js/weekly/track.js`, `js/weekly/bridge.js`
- Modify: `js/game.js` (import 줄 82~85 근처, 기본 상태 1154 근처, 복원 3235 근처, `questEvent` 8485, 상호작용 7768 근처, 프롬프트 가드 7927, 갱신 루프 6569 근처)
- Modify: `js/spaces/doors.js:422` 근처
- Test: `tests/weekly-wiring.test.mjs`, `tests/weekly-bridge.test.mjs`

**Interfaces:**
- Consumes: Task 4의 규칙 함수 전부, `MARKET_POS`, `BOARD_POS`
- Produces (`js/weekly/index.js`):
  - `weeklyDefault()`, `restoreWeekly(saved)` 재수출
  - `initWeekly(deps: {getState, setState, canDo, isGuest, ownsDecor, grantDecorItem, now, requestSave})`
  - `updateWeekly(dt: number, inVillage: boolean, pos: {x,z})`
  - `weeklyNote(type: string, n?: number)`
  - `weeklySpotNow(): 'board' | 'market' | null`
  - `weeklyPrompt(): string`
  - `openWeekly()`
- Produces (`js/weekly/bridge.js`): `makeWeeklyBridge(env: {gameState: () => object, patch: (partial: object) => void, questAvailable, questCtx, isOpen}): {canDo, owns, grant}`
- Produces (`js/weekly/track.js`): `trackBoardOpen(week, done)`, `trackQuestClaim(week, questId, tickets)`, `trackMarketOpen(week, tickets, isGuest)`, `trackMarketBuy(week, itemId, cost)`, `trackLoginPrompt(week, tickets)`

- [ ] **Step 1: 실패하는 연결 테스트 작성 (`tests/weekly-wiring.test.mjs`)**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('game.js only wires the weekly module', () => {
  const game = read('js/game.js');
  const lines = game.split('\n').filter(l => /weekly/i.test(l));
  assert.ok(lines.length <= 14, `${lines.length} weekly lines:\n${lines.join('\n')}`);
  assert.ok(!/function\s+\w*weekly/i.test(game));
  for (const k of ["from './weekly/index.js'", 'initWeekly(', 'updateWeekly(', 'weeklySpotNow()', 'openWeekly()', 'weekly: weeklyDefault()', 'restoreWeekly(saved.weekly)', 'weeklyNote(type, amount)']) {
    assert.ok(game.includes(k), k);
  }
});

test('doors shows the weekly prompt', () => {
  const doors = read('js/spaces/doors.js');
  assert.match(doors, /weeklySpotNow\(\)/);
  assert.match(doors, /weeklyPrompt\(\)/);
});

test('weekly modules stay out of game.js internals', () => {
  for (const f of ['index', 'rules', 'track', 'bridge']) assert.doesNotMatch(read(`js/weekly/${f}.js`), /from '\.\.\/game\.js'/, f);
});

test('actions without quest events call weeklyNote', () => {
  assert.match(read('js/spaces/cafe.js'), /weeklyNote\('serve'\)/);
  assert.match(read('js/spaces/delve.js'), /weeklyNote\('delve'\)/);
  assert.match(read('js/mountain/sled-run.js'), /weeklyNote\('sled'\)/);
  assert.match(read('js/observatory/star-run.js'), /weeklyNote\('star'\)/);
});

test('only five weekly events are tracked', () => {
  const names = [...read('js/weekly/track.js').matchAll(/trackEvent\('([a-z_]+)'/g)].map(m => m[1]);
  assert.deepEqual(names.sort(), ['market_buy', 'market_login_prompt', 'market_open', 'weekly_board_open', 'weekly_quest_claim']);
});
```

- [ ] **Step 2: 실패하는 어댑터 테스트 작성 (`tests/weekly-bridge.test.mjs`)**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeWeeklyBridge } from '../js/weekly/bridge.js';

function env(initial, open = () => true) {
  let g = initial;
  return {
    api: { gameState: () => g, patch: (p) => { g = { ...g, ...p }; }, questAvailable: () => true, questCtx: () => ({}), isOpen: open },
    get: () => g,
  };
}

const empty = () => ({ house: { stored: {}, placed: [] }, outdoorStored: {}, outdoor: [] });

test('grant adds an indoor item to house storage without mutating', () => {
  const start = empty();
  const e = env(start);
  assert.equal(makeWeeklyBridge(e.api).grant({ id: 'teacups', kind: 'indoor' }), true);
  assert.equal(e.get().house.stored.teacups, 1);
  assert.deepEqual(start.house.stored, {});
});

test('grant adds an outdoor item to outdoor storage', () => {
  const e = env(empty());
  makeWeeklyBridge(e.api).grant({ id: 'teadeck', kind: 'outdoor' });
  assert.equal(e.get().outdoorStored.teadeck, 1);
});

test('owns sees stored and placed items', () => {
  const b1 = makeWeeklyBridge(env({ ...empty(), house: { stored: { teacups: 1 }, placed: [] } }).api);
  assert.equal(b1.owns('teacups'), true);
  assert.equal(b1.owns('bojagi'), false);
  const b2 = makeWeeklyBridge(env({ ...empty(), outdoor: [{ id: 'teadeck' }] }).api);
  assert.equal(b2.owns('teadeck'), true);
});

test('canDo blocks types whose space is closed', () => {
  const b = makeWeeklyBridge(env(empty(), (space) => space !== 'mountain').api);
  assert.equal(b.canDo('sled'), false);
  assert.equal(b.canDo('harvest'), true);
});
```

- [ ] **Step 3: 실패 확인**

Run: `node --test tests/weekly-wiring.test.mjs tests/weekly-bridge.test.mjs`
Expected: FAIL

- [ ] **Step 4: `js/weekly/track.js` 구현**

```js
import { trackEvent } from '../analytics.js';

export const trackBoardOpen = (week, done) => trackEvent('weekly_board_open', { week, done });
export const trackQuestClaim = (week, questId, tickets) => trackEvent('weekly_quest_claim', { week, quest_id: questId, tickets });
export const trackMarketOpen = (week, tickets, isGuest) => trackEvent('market_open', { week, tickets, is_guest: isGuest ? 1 : 0 });
export const trackMarketBuy = (week, itemId, cost) => trackEvent('market_buy', { week, item_id: itemId, cost });
export const trackLoginPrompt = (week, tickets) => trackEvent('market_login_prompt', { week, tickets });
```

- [ ] **Step 5: `js/weekly/bridge.js` 구현.** 먼저 실제 필드 이름을 확인한다: `grep -n "house.placed\|outdoorPlaced\|gameState.outdoor\b" js/game.js | head`, 공간 해금 키는 `js/world/unlocks.js`. 이름이 아래와 다르면 `owns`와 `SPACE`를 실제 이름에 맞추고 Step 2 테스트의 가짜 상태도 같이 고친다.

```js
const SPACE = Object.freeze({ delve: 'mine', sled: 'mountain', star: 'observatory', neighbor: 'neighbor', serve: 'cafe', carve: 'bench' });

export function makeWeeklyBridge(env) {
  const canDo = (type) => env.questAvailable(type, env.questCtx()) && (!SPACE[type] || env.isOpen(SPACE[type]));
  const owns = (id) => {
    const g = env.gameState();
    return (g.house?.stored?.[id] || 0) > 0
      || (g.outdoorStored?.[id] || 0) > 0
      || (g.house?.placed || []).some(p => p.id === id)
      || (g.outdoor || []).some(p => p.id === id);
  };
  const grant = (item) => {
    const g = env.gameState();
    if (item.kind === 'indoor') {
      env.patch({ house: { ...g.house, stored: { ...(g.house?.stored || {}), [item.id]: (g.house?.stored?.[item.id] || 0) + 1 } } });
    } else {
      env.patch({ outdoorStored: { ...(g.outdoorStored || {}), [item.id]: (g.outdoorStored?.[item.id] || 0) + 1 } });
    }
    return true;
  };
  return { canDo, owns, grant };
}
```

- [ ] **Step 6: `js/weekly/index.js` 구현.** 창은 Task 7에서 만들므로 이 태스크에서는 `js/weekly/ui.js`와 `js/weekly/copy.js`를 최소 형태로 먼저 만든다: `ui.js`는 `export function showBoard() {}`와 `export function showMarket() {}`, `copy.js`는 `export const WEEKLY_COPY = Object.freeze({ prompt: Object.freeze({ board: '의뢰판 보기', market: '장터 둘러보기' }) });`. Task 7이 둘을 채운다.

```js
import { weekIndex, marketOpen, themeFor, weeklyDefault, restoreWeekly, rollover, note, claim, buyPlan, spend, progressOf } from './rules.js';
import { MARKET_POS, BOARD_POS } from '../data/weekly.js';
import { trackBoardOpen, trackQuestClaim, trackMarketOpen, trackMarketBuy, trackLoginPrompt } from './track.js';
import { showBoard, showMarket } from './ui.js';
import { WEEKLY_COPY } from './copy.js';

export { weeklyDefault, restoreWeekly };

const SPOT_R = 1.8;
let deps = null;
let spot = null;

const state = () => deps.getState();
const commit = (next) => { if (next !== state()) { deps.setState(next); deps.requestSave(); } };
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const current = () => rollover(state(), weekIndex(deps.now()), deps.canDo);

export function initWeekly(d) {
  deps = d;
  commit(current());
}

export function weeklyNote(type, n = 1) {
  if (!deps) return;
  commit(note(current(), type, n));
}

export function updateWeekly(dt, inVillage, pos) {
  if (!deps) return;
  commit(current());
  spot = !inVillage ? null : dist(pos, BOARD_POS) < SPOT_R ? 'board' : dist(pos, MARKET_POS) < SPOT_R ? 'market' : null;
}

export function weeklySpotNow() { return spot; }

export function weeklyPrompt() {
  return spot === 'market' ? WEEKLY_COPY.prompt.market : WEEKLY_COPY.prompt.board;
}

function onClaim(questId) {
  const r = claim(state(), questId);
  if (!r.ok) return r;
  commit(r.state);
  trackQuestClaim(r.state.week, questId, r.state.tickets);
  return r;
}

function onBuy(item) {
  const s = state();
  const plan = buyPlan(s, item, { isGuest: deps.isGuest(), owned: deps.ownsDecor(item.id), open: marketOpen(deps.now()) });
  if (plan.reason === 'guest') trackLoginPrompt(s.week, s.tickets);
  if (!plan.ok) return plan;
  if (!deps.grantDecorItem(item)) return { ok: false, reason: 'grant_failed' };
  commit(spend(state(), item.cost));
  trackMarketBuy(s.week, item.id, item.cost);
  return plan;
}

export function openWeekly() {
  const s = state();
  if (spot === 'market') {
    trackMarketOpen(s.week, s.tickets, deps.isGuest());
    commit({ ...s, seenMarket: s.week });
    return showMarket({ state, theme: themeFor(s.week), open: marketOpen(deps.now()), isGuest: deps.isGuest(), ownsDecor: deps.ownsDecor, onBuy });
  }
  trackBoardOpen(s.week, s.quests.filter(id => progressOf(s, id).done).length);
  commit({ ...s, seenBoard: s.week });
  return showBoard({ state, onClaim });
}
```

- [ ] **Step 7: game.js 연결.** 기존 경매 연결 줄(`initAuction`, `updateAuction`, `auctionSpotNow`, `auction: auctionDefault()`, `restoreAuction(saved.auction)`) 바로 옆에 같은 모양으로 넣는다.

import(85행 옆):

```js
import { initWeekly, updateWeekly, weeklyNote, weeklySpotNow, openWeekly, weeklyDefault, restoreWeekly } from './weekly/index.js';
import { makeWeeklyBridge } from './weekly/bridge.js';
```

기본 상태(1154행 `plaza: plazaDefault()` 옆):

```js
  weekly: weeklyDefault(),
```

복원(3235행 옆):

```js
  gameState.weekly = restoreWeekly(saved.weekly);
```

초기화(3576행 `initAuction();` 옆). 게스트 판정 함수는 기존 것을 쓴다(`grep -n "isGuest\|accountKind" js/game.js | head`로 game.js가 이미 쓰는 이름을 찾는다). 아래 `isGuestNow`는 그 이름으로 바꾼다. 공간 해금 판정 `isOpen`은 game.js 6344행에서 쓰는 것과 같은 함수다.

```js
  { const wb = makeWeeklyBridge({ gameState: () => gameState, patch: (p) => Object.assign(gameState, p), questAvailable, questCtx, isOpen });
    initWeekly({ getState: () => gameState.weekly, setState: (s) => { gameState.weekly = s; }, canDo: wb.canDo, isGuest: isGuestNow, ownsDecor: wb.owns, grantDecorItem: wb.grant, now: () => Date.now(), requestSave }); }
```

`questEvent`(8485행) 본문 첫 줄:

```js
  weeklyNote(type, amount);
```

상호작용(7769행 `if (auctionSpotNow()) return openAuction();` 다음 줄):

```js
  if (weeklySpotNow()) return openWeekly();
```

프롬프트 가드(7927행)의 조건 끝에 `|| !!weeklySpotNow()`를 붙인다.

갱신 루프(6569행 `updateAuction` 옆):

```js
  updateWeekly(dt, inVillage2(), player.position);
```

세이브 복원이 `initWeekly`보다 나중에 돌면 복원된 상태가 주 넘김을 거치지 않는다. `updateWeekly`가 매 프레임 `current()`를 확인하므로 다음 프레임에 맞춰진다. 순서를 따로 손대지 않는다.

- [ ] **Step 8: doors.js 프롬프트.** 422행 경매 분기 다음 줄에 추가하고 21행 옆에 import를 넣는다.

```js
import { weeklySpotNow, weeklyPrompt } from '../weekly/index.js';
```

```js
  else if (inVillage && weeklySpotNow()) prompt = weeklyPrompt();
```

- [ ] **Step 9: 나머지 발화 지점 7곳.** 아래 줄 바로 다음에 한 줄씩 추가한다. 각 파일이 node 테스트에서 직접 import되는지 먼저 확인한다(`grep -ln "spaces/cafe.js\|sled-run.js\|star-run.js\|spaces/delve.js" tests/*.mjs`). import되는 파일은 `weeklyNote`를 직접 import하지 말고, 그 파일이 `trackEvent`나 `questEvent`를 넘겨받는 방식(컨텍스트 인자)과 같은 방식으로 넘겨받는다. import되지 않는 파일은 맨 위에 `import { weeklyNote } from '../weekly/index.js';`(경로는 파일 위치에 맞춘다)를 넣는다.

| 파일:행 | 기준 줄 | 추가 |
|---|---|---|
| `js/spaces/cafe.js:1635` | `trackEvent('cafe_serve'` | `weeklyNote('serve');` |
| `js/spaces/delve.js:153` | `trackEvent('delve_floor'` | `weeklyNote('delve');` |
| `js/mountain/sled-run.js:121` | `trackEvent('sled_result'` (완주한 경우만. 결과 객체의 완주 필드를 읽어 조건을 건다) | `weeklyNote('sled');` |
| `js/observatory/star-run.js:85` | `trackEvent('star_result'` (별자리를 완성한 경우만) | `weeklyNote('star');` |
| 깎기 결과 | `grep -rn "'carve_result'" js --exclude-dir=b`로 찾은 줄 (완성한 경우만) | `weeklyNote('carve');` |
| 이웃 구경 | `grep -rn "neighbor_visit_start" js --exclude-dir=b`로 찾은 줄 | `weeklyNote('neighbor');` |
| `js/game.js:8466` | `trackEvent('quest_complete'` (일일 의뢰인 경우만. 같은 줄의 `quest_type` 값으로 구분) | `weeklyNote('daily');` |

- [ ] **Step 10: 통과 확인**

Run: `node --test tests/weekly-wiring.test.mjs tests/weekly-bridge.test.mjs && npm test 2>&1 | tail -5`
Expected: weekly 테스트 PASS, 전체 테스트 실패 0건

- [ ] **Step 11: 커밋**

```bash
git add js/weekly js/game.js js/spaces js/mountain/sled-run.js js/observatory/star-run.js tests/weekly-wiring.test.mjs tests/weekly-bridge.test.mjs
git commit -m "feat(weekly): wire weekly counters, spots and save state into the game"
```

---

### Task 7: 의뢰판 창과 장터 창

**Files:**
- Modify: `js/weekly/copy.js`, `js/weekly/ui.js` (Task 6의 최소 형태를 채운다)
- Modify: `index.html` (창 컨테이너와 CSS. 기존 `#daily-modal` 블록 옆), `js/i18n-en.js`
- Test: `tests/weekly-i18n.test.mjs`, `tests/weekly-ui.test.mjs`

**Interfaces:**
- Consumes: `progressOf`, `questById`, `TICKET_CAP`, Task 5의 확정 문구
- Produces: `WEEKLY_COPY` (키: `board.title`, `board.claim`, `board.cap`, `market.title`, `market.buy`, `market.short`, `market.owned`, `market.guest`, `market.closed`, `banner`, `prompt.board`, `prompt.market`, `quests[id]`, `items[id].name`, `items[id].desc`), `boardView(state): {rows:{id,label,have,target,done,claimed}[], tickets, capped}`, `marketView(state, theme, ctx: {open, isGuest, ownsDecor}): {open, tickets, rows:{id,name,desc,cost,status:'buy'|'short'|'owned'|'guest'|'closed', short}[]}`, `showBoard({state, onClaim})`, `showMarket({state, theme, open, isGuest, ownsDecor, onBuy})`

뷰 계산(`boardView`, `marketView`)은 DOM 없이 돌아가는 순수 함수로 두고, DOM 그리기는 그 결과만 쓴다. 기존 `js/daily-card.js`의 `dailyCardView` + `renderDailyCard` 구조를 그대로 따른다. 구현 전에 `js/daily-card.js`와 `tests/daily-card.test.mjs`를 읽는다.

- [ ] **Step 1: 실패하는 테스트 작성 (`tests/weekly-ui.test.mjs`)**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardView, marketView } from '../js/weekly/ui.js';
import { weeklyDefault } from '../js/weekly/rules.js';
import { MARKET_THEMES } from '../js/data/weekly.js';

const base = { ...weeklyDefault(), week: 2970, quests: ['w_harvest', 'w_fish'], counts: { harvest: 25, fish: 4 } };

test('board rows carry progress and claim state', () => {
  const v = boardView({ ...base, claimed: [] });
  assert.equal(v.rows.length, 2);
  assert.deepEqual([v.rows[0].have, v.rows[0].target, v.rows[0].done, v.rows[0].claimed], [25, 25, true, false]);
  assert.deepEqual([v.rows[1].have, v.rows[1].done], [4, false]);
  assert.equal(v.capped, false);
});

test('board flags the ticket cap', () => {
  assert.equal(boardView({ ...base, tickets: 15 }).capped, true);
});

test('market rows report one status each', () => {
  const theme = MARKET_THEMES[0];
  const owns = (id) => id === theme.props[0].id;
  const v = marketView({ ...base, tickets: 3 }, theme, { open: true, isGuest: false, ownsDecor: owns });
  assert.deepEqual(v.rows.map(r => r.status), ['short', 'owned', 'buy']);
  assert.equal(v.rows[0].short, 3);
});

test('guests and closed days override buy status', () => {
  const theme = MARKET_THEMES[0];
  const none = () => false;
  assert.ok(marketView({ ...base, tickets: 15 }, theme, { open: true, isGuest: true, ownsDecor: none }).rows.every(r => r.status === 'guest'));
  assert.ok(marketView({ ...base, tickets: 15 }, theme, { open: false, isGuest: false, ownsDecor: none }).rows.every(r => r.status === 'closed'));
});
```

- [ ] **Step 2: i18n 테스트 작성 (`tests/weekly-i18n.test.mjs`).** 먼저 `tests/daily-card.test.mjs`가 영어 사전을 읽는 방식을 확인하고, 사전 형식이 아래 가정(한 줄에 `'한국어': 'English',`)과 다르면 그 테스트의 읽기 방식을 그대로 가져온다.

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WEEKLY_COPY } from '../js/weekly/copy.js';

const en = readFileSync(new URL('../js/i18n-en.js', import.meta.url), 'utf8');
const leaves = (o) => Object.values(o).flatMap(v => (typeof v === 'string' ? [v] : leaves(v)));

test('every weekly string has an English entry without Hangul', () => {
  for (const ko of leaves(WEEKLY_COPY)) {
    const at = [`'${ko}'`, `"${ko}"`].map(k => en.indexOf(k)).find(i => i >= 0);
    assert.ok(at !== undefined, `missing: ${ko}`);
    const line = en.slice(at, en.indexOf('\n', at));
    assert.doesNotMatch(line.slice(line.indexOf(':', ko.length) + 1), /[가-힣]/, ko);
  }
});

test('weekly copy avoids banned characters', () => {
  for (const ko of leaves(WEEKLY_COPY)) assert.doesNotMatch(ko, /—|놀/, ko);
});
```

- [ ] **Step 3: 실패 확인**

Run: `node --test tests/weekly-ui.test.mjs tests/weekly-i18n.test.mjs`
Expected: FAIL

- [ ] **Step 4: `js/weekly/copy.js` 채우기.** Task 5에서 확정한 문구를 `Object.freeze`한 `WEEKLY_COPY`로 옮긴다. 숫자가 들어가는 문구는 `js/plaza/copy.js`의 `fill(template, n)`과 `{0}` 자리표시 방식을 쓴다. i18n 키와 값에 앞뒤 공백을 넣지 않는다.

- [ ] **Step 5: `js/weekly/ui.js`의 뷰 함수 구현**

```js
import { progressOf, questById } from './rules.js';
import { TICKET_CAP } from '../data/weekly.js';
import { WEEKLY_COPY } from './copy.js';

export function boardView(state) {
  const rows = state.quests.map((id) => ({ id, label: WEEKLY_COPY.quests?.[id] || questById(id)?.type || id, ...progressOf(state, id) }));
  return { rows, tickets: state.tickets, capped: state.tickets >= TICKET_CAP };
}

export function marketView(state, theme, ctx) {
  const rows = [theme.hero, ...theme.props].map((item) => {
    const copy = WEEKLY_COPY.items?.[item.id] || { name: item.id, desc: '' };
    const short = Math.max(0, item.cost - state.tickets);
    const status = !ctx.open ? 'closed' : ctx.isGuest ? 'guest' : ctx.ownsDecor(item.id) ? 'owned' : short > 0 ? 'short' : 'buy';
    return { id: item.id, name: copy.name, desc: copy.desc, cost: item.cost, status, short };
  });
  return { open: ctx.open, tickets: state.tickets, rows };
}
```

- [ ] **Step 6: DOM 그리기 구현.** `showBoard`, `showMarket`을 같은 파일에 채운다. `index.html`에 `#weekly-modal` 컨테이너를 `#daily-modal` 옆에 두고, `renderDailyCard`의 열기·닫기 처리 방식을 따른다. 통과 조건:
  - 받기·구매 버튼을 누르면 `onClaim(id)`/`onBuy(item)`을 부르고, `state()`로 뷰를 다시 계산해 그린다.
  - 게스트 상태의 구매 자리에는 `WEEKLY_COPY.market.guest`와 기존 로그인 안내 진입점을 연결한다(`grep -rn "premium_login_click" js --exclude-dir=b`로 찾은 유료 칩의 로그인 열기 함수를 재사용).
  - 창은 `max-height: calc(100dvh - 24px)`와 내부 스크롤로, 가로 폰(740x360)에서도 닫기 버튼이 화면 안에 남는다.
  - `tools/`의 캡처·QA 스크립트 DISMISS 목록에 새 창의 닫기 버튼 id를 추가한다(`grep -rn "daily-ok" tools`).

- [ ] **Step 7: 영어 값 추가.** `js/i18n-en.js`에 `WEEKLY_COPY`의 모든 문자열을 키로 넣는다.

- [ ] **Step 8: 통과 확인**

Run: `node --test tests/weekly-ui.test.mjs tests/weekly-i18n.test.mjs && npm test 2>&1 | tail -5`
Expected: PASS, 전체 실패 0건

- [ ] **Step 9: 브라우저 확인.** 시각을 고정하기 위해 game.js `initWeekly` 호출의 `now:`를 `() => WEEK_NOW ?? Date.now()`로 바꾸고, `WEEK_NOW`는 URL의 `?weeknow=<ms>`에서 읽는다. `weeknow`를 `js/config.js`의 `IS_DEV_SESSION` 파라미터 목록에 추가해 GA4 로깅을 막는다. preview로 워크트리 서버를 띄워 확인한다.
  - 수요일: 의뢰판에 5개, 장터 창은 닫힘 안내
  - 금요일: 장터 창에 3종, 표 부족·구매·보유 상태
  - 게스트: 구매 자리에 로그인 안내
  - 뷰포트 3종(PC, 모바일 세로 375x812, 가로 폰 740x360) 캡처를 사용자에게 보낸다

- [ ] **Step 10: 커밋**

```bash
git add js/weekly/copy.js js/weekly/ui.js index.html js/i18n-en.js js/config.js js/game.js tests/weekly-ui.test.mjs tests/weekly-i18n.test.mjs tools
git commit -m "feat(weekly): add quest board and weekend market dialogs"
```

---

### Task 8: 수레·의뢰판 조형 (사용자 게이트)

**Files:**
- Create: `sims/weekly-market-art.html`, `js/spaces/weekly-market-art.js`
- Modify: `js/weekly/index.js`, `js/game.js`(산포 제외 1줄, `initWeekly` 인자)
- Test: `tests/weekly-art.test.mjs`

**Interfaces:**
- Produces: `buildWeeklyMarket(THREE, { open: boolean }): Object3D`, `WEEKLY_SOLIDS: [x,z,r][]`, `weeklyScatterBlocks(x: number, z: number, pad?: number): boolean` (`js/weekly/index.js`)

- [ ] **Step 1: 시안 3개 이상을 `sims/weekly-market-art.html`에 렌더한다.** 주중 모습(천을 덮은 수레 + 의뢰판)과 주말 모습(열린 수레 + 상인 + 진열)을 각각. 부속을 꽂지 말고 형태로 승격하고, 겹친 면 줄무늬와 작은 소품 그림자를 피한다. 구현 전에 `js/spaces/promo-gift-art.js`와 `tests/promo-gift-art.test.mjs`를 읽고 같은 구조를 따른다.

- [ ] **Step 2: PC와 모바일 캡처를 나란히 사용자에게 보내고 하나를 고르게 한다.**

- [ ] **Step 3: 실패하는 테스트 작성**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WEEKLY_SOLIDS } from '../js/spaces/weekly-market-art.js';
import { MARKET_POS, BOARD_POS } from '../js/data/weekly.js';

test('cart and board each have a collider at their position', () => {
  const near = (p) => WEEKLY_SOLIDS.some(([x, z, r]) => Math.hypot(x - p.x, z - p.z) < 0.01 && r > 0);
  assert.ok(near(MARKET_POS));
  assert.ok(near(BOARD_POS));
});

test('colliders stay inside the interaction ring', () => {
  for (const [, , r] of WEEKLY_SOLIDS) assert.ok(r < 1.8);
});
```

- [ ] **Step 4: 고른 시안을 `js/spaces/weekly-market-art.js`로 옮긴다.** THREE는 인자로 받는다(node 테스트가 `three`를 해석하지 못한다).

```js
import { MARKET_POS, BOARD_POS } from '../data/weekly.js';

export const WEEKLY_SOLIDS = Object.freeze([
  Object.freeze([MARKET_POS.x, MARKET_POS.z, 0.9]),
  Object.freeze([BOARD_POS.x, BOARD_POS.z, 0.35]),
]);
```

- [ ] **Step 5: 장면 연결.** `initWeekly`의 `deps`에 `scene`, `solidCircle`, `THREE`를 추가로 받는다. `initWeekly`에서 `buildWeeklyMarket(THREE, { open: marketOpen(now) })`를 장면에 올리고 `WEEKLY_SOLIDS`마다 `solidCircle(x, z, r)`를 등록한다. `updateWeekly`에서 `marketOpen` 값이 바뀌면 이전 group을 장면에서 떼고 geometry·material을 dispose한 뒤 다시 만든다.

- [ ] **Step 6: 산포 제외.** `js/weekly/index.js`에 추가:

```js
export function weeklyScatterBlocks(x, z, pad = 1) {
  return WEEKLY_SOLIDS.some(([sx, sz, r]) => Math.hypot(x - sx, z - sz) < r + pad);
}
```

game.js 3563행 `|| plazaScatterBlocks(x, z)` 다음에 `|| weeklyScatterBlocks(x, z)`를 붙인다. Task 6 연결 테스트의 14줄 상한 안인지 확인한다.

- [ ] **Step 7: 통과 확인과 브라우저 확인.** `node --test tests/weekly-art.test.mjs tests/weekly-wiring.test.mjs`. 브라우저에서 캐릭터가 수레와 의뢰판을 통과하지 못하는지, 근접하면 프롬프트가 뜨는지, 광장 기존 기물(명판 21.4,-0.9, 벤치, 호박 더미)과 겹치지 않는지 캡처로 확인한다.

- [ ] **Step 8: 커밋**

```bash
git add sims/weekly-market-art.html js/spaces/weekly-market-art.js js/weekly/index.js js/game.js tests/weekly-art.test.mjs
git commit -m "feat(weekly): add market cart and quest board to the plaza"
```

---

### Task 9: 꾸미기 18종 (주제별 사용자 게이트 6회)

**Files:**
- Create: `js/weekly/items.js`, `sims/weekly-items-<theme>.html` 6개
- Modify: `js/data/catalog.js`, `js/game.js`(조형 조회, 충돌 목록)
- Test: `tests/weekly-items.test.mjs`

**Interfaces:**
- Consumes: `MARKET_THEMES`, `MARKET_ITEM_IDS`
- Produces: `weeklyDecorMesh(THREE, id: string): Object3D | null`, catalog 항목 18개

- [ ] **Step 1: 실패하는 테스트 작성**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MARKET_THEMES, MARKET_ITEM_IDS } from '../js/data/weekly.js';

const catalog = readFileSync(new URL('../js/data/catalog.js', import.meta.url), 'utf8');
const items = readFileSync(new URL('../js/weekly/items.js', import.meta.url), 'utf8');

test('all 18 items are registered once in the catalog', () => {
  for (const id of MARKET_ITEM_IDS) assert.equal(catalog.split(`id: '${id}'`).length - 1, 1, id);
});

test('market items are hidden from the regular shops', () => {
  for (const id of MARKET_ITEM_IDS) {
    const line = catalog.split('\n').find(l => l.includes(`id: '${id}'`));
    assert.match(line, /hidden: true/, id);
  }
});

test('every item has a mesh builder', () => {
  for (const id of MARKET_ITEM_IDS) assert.match(items, new RegExp(`\\b${id}\\(`), id);
});

test('heroes are outdoor and props are indoor', () => {
  const outdoorBlock = catalog.slice(catalog.indexOf('export const OUTDOOR'));
  const decorBlock = catalog.slice(catalog.indexOf('export const DECOR'), catalog.indexOf('export const FISH_KINDS'));
  for (const t of MARKET_THEMES) {
    assert.ok(outdoorBlock.includes(`id: '${t.hero.id}'`), t.hero.id);
    for (const p of t.props) assert.ok(decorBlock.includes(`id: '${p.id}'`), p.id);
  }
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/weekly-items.test.mjs`
Expected: FAIL

- [ ] **Step 3: 기존 등록 방식을 읽는다.** 야외 품목은 `js/auction/items.js`(빌더 표 + `auctionOutdoorMesh`)와 catalog 246행 `moonswing` 항목. 실내 품목은 catalog `DECOR` 항목의 `foot`/`h`/`top` 필드와 실내 조형을 만드는 곳(`grep -n "case 'sofa'\|sofa:" -r js --exclude-dir=b | head`). 실내 가구 높이는 좌표에서 파생시키고, 벽 높이 3을 넘지 않게 한다.

- [ ] **Step 4: 주제 하나씩 반복한다(tea → flower → seaside → books → bakery → busker).** 주제마다:
  1. `sims/weekly-items-<theme>.html`에 대표 1종과 소품 2종의 시안을 각 3개 이상 렌더한다.
  2. PC와 모바일 캡처를 나란히 사용자에게 보내고 고르게 한다.
  3. 고른 시안을 `js/weekly/items.js`의 빌더(함수 이름 = 품목 id)로 옮긴다.
  4. catalog에 등록한다. 야외: `{ id, name, ico, cost: { coins: 9999 }, desc, hidden: true }`. 실내: `{ id, name, ico, cost: 9999, pay: 'crop', foot: [w, d], h, hidden: true }`. 이름과 설명은 Task 5 확정 문구.
  5. 대표 품목이 걸어서 통과되면 안 되는 형태면 game.js 6044행의 충돌 목록에 id를 넣는다.
  6. 마당과 실내에 실제로 놓아 낮과 밤 캡처를 남긴다.
  7. 주제 단위로 커밋한다: `git commit -m "feat(weekly): add <theme> market items"`

- [ ] **Step 5: 조형 조회 연결.** game.js 5815행의 `plazaDecorMesh` 조회 옆에 `weeklyDecorMesh` 조회 한 줄을 넣는다. 실내 조형 조회 지점에도 같은 한 줄을 넣는다.

- [ ] **Step 6: `hidden: true` 실내 품목이 기존 가게 목록에서 빠지는지 확인한다.** `grep -n "DECOR.filter\|DECOR.map\|of DECOR" -r js --exclude-dir=b`로 `DECOR`를 나열하는 가게 UI를 찾는다. `hidden`을 거르지 않으면 그 목록에 `.filter(d => !d.hidden)`을 추가하고, `tests/weekly-items.test.mjs`에 그 파일이 `!d.hidden` 필터를 포함하는지 확인하는 테스트를 붙인다.

- [ ] **Step 7: 통과 확인**

Run: `node --test tests/weekly-items.test.mjs && npm test 2>&1 | tail -5`
Expected: PASS, 전체 실패 0건

---

### Task 10: 첫 접속 안내와 금요일 푸시

**Files:**
- Create: `js/weekly/guide.js`
- Modify: `js/weekly/index.js`, 푸시 cron 파일
- Test: `tests/weekly-guide.test.mjs`

**Interfaces:**
- Produces: `guideNeed(state, now: number): 'market' | 'board' | null`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guideNeed } from '../js/weekly/guide.js';
import { weeklyDefault, weekIndex } from '../js/weekly/rules.js';

const kst = (y, m, d, h = 0) => Date.UTC(y, m - 1, d, h - 9);
const fri = kst(2026, 11, 13, 10), wed = kst(2026, 11, 11, 10);
const at = (ms, over = {}) => ({ ...weeklyDefault(), week: weekIndex(ms), ...over });

test('first visit on a market day points to the market', () => {
  assert.equal(guideNeed(at(fri), fri), 'market');
});

test('market guidance shows once per week', () => {
  assert.equal(guideNeed(at(fri, { seenMarket: weekIndex(fri), seenBoard: weekIndex(fri) }), fri), null);
});

test('weekday first visit points to the board', () => {
  assert.equal(guideNeed(at(wed), wed), 'board');
  assert.equal(guideNeed(at(wed, { seenBoard: weekIndex(wed) }), wed), null);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/weekly-guide.test.mjs`
Expected: FAIL

- [ ] **Step 3: 구현**

```js
import { marketOpen } from './rules.js';

export function guideNeed(state, now) {
  if (marketOpen(now) && state.seenMarket !== state.week) return 'market';
  if (state.seenBoard !== state.week) return 'board';
  return null;
}
```

- [ ] **Step 4: 안내 표시 연결.** `updateWeekly`에서 `guideNeed`가 값을 돌려주면 금색 화살표를 띄우고, 장터일 때만 배너(`WEEKLY_COPY.banner`)를 한 번 띄운다. 화살표는 `js/auction/guide.js`의 경로 계획과 화면 가장자리 표시 함수(`planAround`, `edgePoint`, `nearBlockers`)를 재사용하고 목표 좌표만 `MARKET_POS`/`BOARD_POS`로 준다. 다른 안내가 켜져 있으면 띄우지 않는다: `deps.otherGuideActive()`를 받아 확인하고, game.js에서는 `auctionGuideActive()`와 온보딩 화살표 활성 판정을 묶어 넘긴다. 목표는 한 번에 하나만.

- [ ] **Step 5: 화살표 추종 확인.** 브라우저에서 스폰 지점부터 화살표만 따라가 장터에 도착하는지 자동 이동 스크립트로 확인하고 캡처한다. 경매 안내 검증 방식(`tests/auction-guide.test.mjs`, `dev/active/evening-auction/`의 봇 스크립트)을 따른다.

- [ ] **Step 6: 금요일 푸시.** 기존 FCM cron 분기를 찾는다(`grep -n "scheduled\|cron" worker/index.js | head`). 밤손님 예고 분기와 같은 대상 조회·발송 함수를 재사용해 금요일 19:00 KST 분기를 추가하고 `WEEKLY_COPY.banner` 문구를 보낸다. 그 분기의 기존 테스트 파일에 "금요일 19:00 KST에만 장터 푸시 대상이 생긴다"는 테스트를 추가한다(`weekIndex`/`marketOpen`과 같은 KST 계산을 쓰되 worker 쪽에 `js/weekly/rules.js`를 import할 수 있는지 먼저 확인하고, 안 되면 같은 식을 worker 테스트로 잠근다).

- [ ] **Step 7: 통과 확인 후 커밋**

```bash
node --test tests/weekly-guide.test.mjs && npm test 2>&1 | tail -5
git add js/weekly/guide.js js/weekly/index.js js/game.js worker tests
git commit -m "feat(weekly): guide players to the market and send a Friday push"
```

---

### Task 11: 마무리 검증

- [ ] **Step 1: 전체 테스트.** `npm test 2>&1 | tail -8`. 실패 0건.
- [ ] **Step 2: 번들 확인.** 시작 번들(`js/b/`)에 새 모듈이 빠지지 않았는지 `tests/bundle-boot.test.mjs`로 확인하고, 필요하면 번들을 다시 만든다.
- [ ] **Step 3: 한 주 흐름을 브라우저에서 처음부터 끝까지.** `?weeknow=`로 월요일에 시작해 수확 25개를 채우고 받기, 금요일로 옮겨 구매, 다음 월요일로 옮겨 의뢰가 바뀌고 표가 남는지 확인. 콘솔 오류 0건.
- [ ] **Step 4: GA4 확인.** `?dbg=1`로 이벤트 5종이 스펙 9절 파라미터대로 나가는지 네트워크 요청으로 확인.
- [ ] **Step 5: 코드 리뷰.** code-reviewer 에이전트에 브랜치 diff를 넘기고 CRITICAL·HIGH를 고친다.
- [ ] **Step 6: dev docs 갱신.** `dev/active/weekly-market/weekly-market-tasks.md` 체크, context의 Last Updated 갱신.
- [ ] **Step 7: 사용자에게 보고.** 병합·푸시·배포는 사용자 지시가 있을 때만 한다. 배포 시 5곳 동시, 배포 다음 날 BigQuery에서 이벤트 5종 적재 확인.

## Self-Review 결과

- 스펙 4절(주간 흐름) → Task 2·4. 5절(의뢰) → Task 1·3·4·6. 6절(장터) → Task 1·4·7·8·9. 7절(구성 단위) → File Structure. 8절(안내) → Task 10. 9절(트래킹) → Task 6. 10절(오류 처리) → Task 4 `restoreWeekly`, Task 6 `onBuy`의 지급 후 차감. 11절(테스트) → 각 태스크. 12절(배포) → 범위 밖, Task 11 Step 7에 조건만.
- 코드를 미리 쓰지 못한 단계: Task 7 Step 6(DOM 그리기), Task 8·9의 조형, Task 10 Step 4·6. 조형과 문구는 사용자 검수 뒤에야 내용이 정해지므로 절차와 통과 조건을 적었다. DOM 그리기와 푸시 분기는 따라야 할 기존 파일과 통과 조건을 지정했다.
- 실제 이름을 확인해야 하는 곳: `bridge.js`의 `house.placed`·`outdoor` 필드와 공간 해금 키, game.js의 게스트 판정 함수 이름, 깎기·이웃 구경의 발화 줄. 각 단계에 찾는 명령을 적었다.
- 이름 대조: `weeklyNote`, `weeklySpotNow`, `openWeekly`, `weeklyDefault`, `restoreWeekly`, `initWeekly`, `updateWeekly`가 Task 6 테스트·구현·game.js 연결에서 같다. `buyPlan`의 `ctx` 키(`isGuest`, `owned`, `open`)가 Task 4와 Task 6 `onBuy`에서 같다. `marketView`의 `ctx`는 `ownsDecor` 함수를 받고 Task 7 테스트와 `openWeekly` 호출이 같다.
