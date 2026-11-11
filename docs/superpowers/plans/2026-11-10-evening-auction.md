# 저녁 경매 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 마을 광장 동쪽에 상설 등불 무대를 세우고, 하루 한 번 게임 속 저녁에 희귀 장식 1점을 주민 3명과 실시간 호가로 겨뤄 코인으로 사는 경매를 넣는다.

**Architecture:** 규칙(`rules.js`)·진행(`engine.js`)·정산(`settle.js`)은 three·game.js 를 import 하지 않는 순수 모듈로 만들고 `node:test` 로 먼저 검증한다. 3D(`stage.js`·`items.js`·`actors.js`)와 진행 화면(`scene.js`·`ui.js`)은 `js/auction/` 아래에 두고, 진입점 `index.js` 가 광장(`js/plaza/index.js`)과 같은 모양의 함수 몇 개만 game.js 에 내놓는다. 경매 중에는 기존 미니게임 방식대로 `mgView = { type: 'auction' }` 로 플레이어 이동·상호작용을 멈추고 카메라를 넘겨받는다(game.js:6240·6247, kitchen-stage.js:452).

**Tech Stack:** Three.js 0.160(ES modules, importmap) · `node --test` · GA4 `trackEvent` · Supabase `econ_logs`(logEcon)

**Spec:** `docs/superpowers/specs/2026-11-10-evening-auction-design.md`

## Global Constraints

- 새 코드·CSS·테스트에 **주석 금지**(메모리 no-code-comments).
- 새 기능 코드는 `js/auction/` 와 `js/data/auction.js` 에. game.js 에는 **연결 줄만**(Task 9 의 줄 수 상한 테스트).
- 순수 모듈(`js/data/auction.js`·`js/auction/rules.js`·`engine.js`·`settle.js`·`scene.js`의 테스트 대상 부분)은 `three`·`../game.js` 를 import 하지 않는다.
- 불변 갱신(spread). 단 `gameState.inventory` 는 다른 모듈이 객체를 쥐고 있으므로 **필드 대입**(`gameState.inventory.coins = …`)만 한다(js/plaza/index.js:168 과 같은 이유).
- 무대 위 말풍선·월드 표시엔 글자 금지. 숫자·이름은 HUD 창에만.
- 발광 재질 `emissiveIntensity ≤ 0.6`, 영구 무대·경매품에 **PointLight·SpotLight 금지**(모바일 렌더 비용). 조명은 반투명 원뿔·바닥 빛 원판으로 흉내 낸다.
- 새 GA4 이벤트 파라미터 5개 이하, 이름에 `source`·`content` 금지.
- UI 문구는 Task 0 에서 사용자가 승인한 것만. 아래 코드의 한국어 문자열은 **승인 전 초안**이며 확정본으로 바꿔 쓴다(테스트와 구현 둘 다).
- 날짜 키는 `todayStr()`(로컬 YYYY-MM-DD, `dateHash` 와 같은 기준).
- 게임 시간 `timeOfDay`(gameState.timeOfDay) 는 0..1, 0.75 = 18시, 하루 ≈ 500초(`DAY_SPEED = 0.002`).
- 작업은 main 에서 딴 워크트리 브랜치 `feat/evening-auction`. 워크트리엔 `.env` 가 없다(메모리 worktree-pitfalls).
- 커밋 메시지 영어, `feat:`/`test:` 접두사, 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File Structure

| 파일 | 책임 |
|---|---|
| `js/data/auction.js` (새) | 무대 좌표·관객 자리·경매품 풀·주민 성격·시간 상수. 숫자만 |
| `js/auction/rules.js` (새) | 날짜→경매품·주민 최고가, 열림 판정, 참가 모드, 저장 기본값/복원 |
| `js/auction/engine.js` (새) | 한 판의 진행 상태 기계(입찰·0.1초 진행·낙찰). rng 주입 |
| `js/auction/settle.js` (새) | 낙찰 정산(코인·보관함)과 참가 기록 |
| `js/auction/items.js` (새) | 경매품 3종 3D 모델(마당 배치·무대 진열 공용). THREE 를 인자로 받음 |
| `js/auction/stage.js` (새) | 등불 무대 3D + 밤 밝기 + 가짜 조명. THREE 를 인자로 받음 |
| `js/auction/actors.js` (새) | 경매 중 무대 앞 주민 인형·팻말·곰 팔·금빛 고리·꽃가루 |
| `js/auction/scene.js` (새) | 한 판 진행 루프: 엔진 → 연출·창 갱신·정산·측정 |
| `js/auction/ui.js` (새) | `#auction-modal` 창(스스로 CSS 주입, js/mountain/cafe-ui.js 방식) |
| `js/auction/index.js` (새) | 진입점. game.js 의존은 여기에만 |
| `js/data/catalog.js` (수정) | OUTDOOR 에 hidden 경매품 3종 |
| `js/game.js` (수정) | import 1줄 + 연결 줄 |
| `js/spaces/doors.js` (수정) | 무대 앞 안내 문구 |
| `js/spaces/kitchen-stage.js` (수정) | `updateMgScene` 에 `'auction'` 분기 |
| `js/i18n-en.js` (수정) | 영어 사전 |
| `docs/analysis/event-taxonomy.csv` (수정) | 이벤트 3행 |
| `tests/auction-*.test.mjs` (새) | 규칙·엔진·정산·모델·무대·인형·화면·창·연결·영어 |

---

### Task 0: UI 문구 검수 (사용자 승인 게이트)

**Files:** 없음. 승인본을 `dev/active/evening-auction/evening-auction-context.md` 의 "확정 문구" 절에 붙인다.

- [ ] **Step 1: 후보 표를 사용자에게 보인다** (추천 = 후보 1)

| 자리 | 후보 1 | 후보 2 | 영어 |
|---|---|---|---|
| 무대 앞 안내(열림) | 🔨 저녁 경매 | 🔨 경매 참가 | 🔨 Evening Auction |
| 무대 앞 안내(닫힘) | 🔨 해가 지면 열려요 | 🔨 경매는 저녁에 | 🔨 Opens at sunset |
| 무대 앞 안내(오늘 끝) | 🔨 내일 저녁에 또 열려요 | 🔨 오늘 경매 끝 | 🔨 Back tomorrow evening |
| 창 제목 | 🔨 저녁 경매 | 🔨 오늘의 경매 | 🔨 Evening Auction |
| 대기 안내 | 방랑 상인이 경매를 열었어요 | 오늘의 경매품이 나왔어요 | The merchant opened the auction |
| 참가 버튼 | 🙋 참가하기 | 🔔 경매 참가하기 | 🙋 Join |
| 구경 버튼 | 👀 구경하기 | 👀 구경만 할게요 | 👀 Watch |
| 구경 이유 | 🪙{0}부터 부를 수 있어요 | 시작가 🪙{0} | Bids start at 🪙{0} |
| 첫 줄 | 먼저 불러 보세요 | 시작가예요 | Make the first bid |
| 1등(나) | 🙋 내가 제일 높아요 | 🙋 지금 1등 | 🙋 You're the highest |
| 1등(주민) | {0}가 제일 높아요 | {0} 1등 | {0} is the highest |
| 시간 연장 | ⏱️ 다시 4초! | ⏱️ 연장! | ⏱️ 4 more seconds! |
| 카운트 | 하나… / 하나… 둘… / 하나… 둘… 셋! | 3… / 2… / 1… | Going… / Going… twice… / Sold! |
| 낙찰 | 낙찰! {0}를 가져왔어요 | {0} 낙찰! | Sold to you! Got {0} |
| 낙찰 부가 | 🧺 보관함에 넣었어요 | 작업대에서 꺼내 놓아요 | Added to storage 🧺 |
| 패찰 | {0}가 가져갔어요 | {0}에게 낙찰 | {0} won it |
| 유찰 | 아무도 안 불렀어요 | 유찰됐어요 | No bids this time |
| 끝 버튼 | 닫기 | 내일 또 올게요 | Close |
| 내 기록 이름 | 🙋 나 | 🙋 내 입찰 | 🙋 Me |
| 경매품 이름 | 달빛 그네 · 등불 아치 · 별 풍향계 | (이름 제안 받음) | Moon Swing · Lantern Arch · Star Vane |
| 경매품 설명 | 저녁 경매에서 낙찰받은 {이름} | 경매에서 산 {이름} | Won at the evening auction |

  `{0}가` 는 주민 이름이 모두 모음으로 끝나서(큐레이터·아이·아저씨) 맞다. 주민을 바꾸면 조사를 다시 본다.

- [ ] **Step 2: 확정본을 context 파일에 적는다.** 이후 Task 의 문자열·테스트는 이 표를 쓴다. 표에 없는 문구가 필요해지면 다시 묻는다.

---

### Task 1: 데이터와 순수 규칙

**Files:**
- Create: `js/data/auction.js`
- Create: `js/auction/rules.js`
- Test: `tests/auction-rules.test.mjs`

**Interfaces:**
- Produces: `AUCTION_STAGE {x,z}`, `AUCTION_STAGE_R`, `AUCTION_SPOTS {merchant,curator,stargazer,builder,me}`(무대 기준 `[dx,dz]`), `AUCTION_POOL [{id,appraisal}]`, `AUCTION_BIDDERS [{id,style,inc}]`, `BID_INCS`, `OPEN_FROM`, `OPEN_TO`, `COUNT_START`, `COUNT_RESET`, `RUN_CAP`, `TICK`
- Produces: `hashStr(s)→uint32`, `lotFor(day)→{id,appraisal,start}`, `bidderMaxes(day, appraisal)→{curator,stargazer,builder}`, `auctionOpenAt(t)→bool`, `secondsUntilOpen(t, daySpeed)→number`, `joinMode({t,day,lastDate,coins,start})→'closed'|'done'|'bid'|'watch'`, `auctionDefault()→{lastDate,wins}`, `restoreAuction(saved)→{lastDate,wins}`

- [ ] **Step 1: 데이터 파일 `js/data/auction.js`**

```js
export const AUCTION_STAGE = { x: 32.5, z: -3.5 };
export const AUCTION_STAGE_R = 4.2;
export const AUCTION_SPOTS = {
  merchant: [1.75, -0.25],
  curator: [-2.9, 3.3],
  stargazer: [-1.6, 4.9],
  builder: [2.9, 3.5],
  me: [0.4, 5.9],
};
export const AUCTION_POOL = [
  { id: 'moonswing', appraisal: 400 },
  { id: 'lanternarch', appraisal: 300 },
  { id: 'starvane', appraisal: 220 },
];
export const AUCTION_BIDDERS = [
  { id: 'curator', style: 'big', inc: 50 },
  { id: 'stargazer', style: 'eager', inc: 10 },
  { id: 'builder', style: 'sniper', inc: 30 },
];
export const BID_INCS = [10, 30, 50];
export const OPEN_FROM = 0.72;
export const OPEN_TO = 0.96;
export const COUNT_START = 8;
export const COUNT_RESET = 4;
export const RUN_CAP = 45;
export const TICK = 0.1;
```

  무대 앞면 = +z(기본 카메라 쪽). `AUCTION_SPOTS` 는 3D 시안(`sims/auction-stage-3d.html`, 무대 중심 월드 z=-3.2)의 자리를 무대 기준으로 옮긴 값. 좌표 `AUCTION_STAGE` 는 Task 5 Step 5 에서 사용자와 확정한다.

- [ ] **Step 2: 실패하는 테스트 `tests/auction-rules.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AUCTION_POOL, AUCTION_BIDDERS, OPEN_FROM, OPEN_TO } from '../js/data/auction.js';
import { hashStr, lotFor, bidderMaxes, auctionOpenAt, secondsUntilOpen, joinMode, auctionDefault, restoreAuction } from '../js/auction/rules.js';

test('hashStr is stable and unsigned', () => {
  assert.equal(hashStr('abc'), hashStr('abc'));
  assert.notEqual(hashStr('2026-11-10'), hashStr('2026-11-11'));
  assert.ok(hashStr('x') >= 0);
});

test('lotFor picks a pool item with start = half appraisal rounded to 10', () => {
  const lot = lotFor('2026-11-10');
  const item = AUCTION_POOL.find(p => p.id === lot.id);
  assert.ok(item);
  assert.equal(lot.appraisal, item.appraisal);
  assert.equal(lot.start, Math.round(item.appraisal * 0.5 / 10) * 10);
  assert.deepEqual(lotFor('2026-11-10'), lot);
});

test('lotFor covers every pool item across 60 days', () => {
  const seen = new Set();
  for (let d = 0; d < 60; d++) seen.add(lotFor(new Date(Date.UTC(2026, 11, 1 + d)).toISOString().slice(0, 10)).id);
  assert.equal(seen.size, AUCTION_POOL.length);
});

test('bidderMaxes stay within 0.75..1.40 of appraisal, multiples of 10, same per day', () => {
  for (let d = 1; d <= 28; d++) {
    const day = `2027-02-${String(d).padStart(2, '0')}`;
    const m = bidderMaxes(day, 400);
    assert.deepEqual(Object.keys(m).sort(), AUCTION_BIDDERS.map(b => b.id).sort());
    for (const v of Object.values(m)) {
      assert.equal(v % 10, 0);
      assert.ok(v >= 300 && v <= 560, `${day} ${v}`);
    }
    assert.deepEqual(bidderMaxes(day, 400), m);
  }
});

test('auctionOpenAt is true only in the evening window', () => {
  assert.equal(auctionOpenAt(OPEN_FROM - 0.001), false);
  assert.equal(auctionOpenAt(OPEN_FROM), true);
  assert.equal(auctionOpenAt(0.8), true);
  assert.equal(auctionOpenAt(OPEN_TO), false);
  assert.equal(auctionOpenAt(0.3), false);
});

test('secondsUntilOpen wraps around midnight', () => {
  assert.equal(secondsUntilOpen(0.8, 0.002), 0);
  assert.ok(Math.abs(secondsUntilOpen(0.70, 0.002) - 10) < 1e-6);
  assert.ok(Math.abs(secondsUntilOpen(0.97, 0.002) - 375) < 1e-6);
});

test('joinMode', () => {
  const base = { t: 0.8, day: '2026-11-10', lastDate: '', coins: 500, start: 200 };
  assert.equal(joinMode({ ...base, t: 0.5 }), 'closed');
  assert.equal(joinMode({ ...base, lastDate: '2026-11-10' }), 'done');
  assert.equal(joinMode(base), 'bid');
  assert.equal(joinMode({ ...base, coins: 199 }), 'watch');
  assert.equal(joinMode({ ...base, lastDate: '2026-11-09' }), 'bid');
});

test('restoreAuction sanitizes', () => {
  assert.deepEqual(auctionDefault(), { lastDate: '', wins: 0 });
  assert.deepEqual(restoreAuction(undefined), { lastDate: '', wins: 0 });
  assert.deepEqual(restoreAuction({ lastDate: 3, wins: -2 }), { lastDate: '', wins: 0 });
  assert.deepEqual(restoreAuction({ lastDate: '2026-11-10', wins: 2.7, x: 1 }), { lastDate: '2026-11-10', wins: 2 });
});
```

- [ ] **Step 3: 실패 확인** — Run: `node --test tests/auction-rules.test.mjs` · Expected: FAIL (`Cannot find module … js/auction/rules.js`)

- [ ] **Step 4: 구현 `js/auction/rules.js`**

```js
import { AUCTION_POOL, AUCTION_BIDDERS, OPEN_FROM, OPEN_TO } from '../data/auction.js';

export function hashStr(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0; h ^= h >>> 13;
  return h >>> 0;
}

const r10 = n => Math.round(n / 10) * 10;

export function lotFor(day) {
  const item = AUCTION_POOL[hashStr(`auction:${day}`) % AUCTION_POOL.length];
  return { id: item.id, appraisal: item.appraisal, start: r10(item.appraisal * 0.5) };
}

export function bidderMaxes(day, appraisal) {
  return Object.fromEntries(AUCTION_BIDDERS.map(b => {
    const k = 0.75 + (hashStr(`auction:${day}:${b.id}`) % 66) / 100;
    return [b.id, r10(appraisal * k)];
  }));
}

export function auctionOpenAt(t) { return t >= OPEN_FROM && t < OPEN_TO; }

export function secondsUntilOpen(t, daySpeed) {
  if (auctionOpenAt(t)) return 0;
  return ((((OPEN_FROM - t) % 1) + 1) % 1) / daySpeed;
}

export function joinMode({ t, day, lastDate, coins, start }) {
  if (!auctionOpenAt(t)) return 'closed';
  if (lastDate === day) return 'done';
  return coins >= start ? 'bid' : 'watch';
}

export function auctionDefault() { return { lastDate: '', wins: 0 }; }

export function restoreAuction(saved) {
  const lastDate = typeof saved?.lastDate === 'string' ? saved.lastDate : '';
  const w = saved?.wins;
  const wins = Number.isFinite(w) && w >= 0 ? Math.floor(w) : 0;
  return { lastDate, wins };
}
```

- [ ] **Step 5: 통과 확인** — Run: `node --test tests/auction-rules.test.mjs` · Expected: PASS(8 tests)

- [ ] **Step 6: Commit**

```bash
git add js/data/auction.js js/auction/rules.js tests/auction-rules.test.mjs
git commit -m "feat: add evening auction daily rules"
```

---

### Task 2: 한 판 진행 엔진

**Files:**
- Create: `js/auction/engine.js`
- Test: `tests/auction-engine.test.mjs`

**Interfaces:**
- Consumes: `AUCTION_BIDDERS`, `COUNT_START`, `COUNT_RESET`, `RUN_CAP`, `TICK` (Task 1)
- Produces: `createRun({start, maxes, wallet, mode})→Run`, `canBid(run, inc)→bool`, `bid(run, who, inc)→Run`, `step(run, rng)→{run, events}`, `outcome(run)→'win'|'lose'|'none'|'watch'`
- `Run = { price, leader: null|'me'|npcId, t, total, wallet, mode:'bid'|'watch', over, extended, myBids, bidders:[{id,style,inc,max,cool}] }`
- `events` 원소: `{type:'bid', who, inc, price, extended}` 또는 `{type:'sold', who, price}`

- [ ] **Step 1: 실패하는 테스트 `tests/auction-engine.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, canBid, bid, step, outcome } from '../js/auction/engine.js';

const maxes = { curator: 400, stargazer: 300, builder: 350 };
const never = () => 0.999;
const always = () => 0;
const run0 = (o = {}) => createRun({ start: 200, maxes, wallet: 820, mode: 'bid', ...o });

test('createRun starts at start price with 8s and no leader', () => {
  const r = run0();
  assert.equal(r.price, 200);
  assert.equal(r.leader, null);
  assert.equal(r.t, 8);
  assert.equal(r.over, false);
  assert.equal(r.bidders.length, 3);
});

test('canBid rules', () => {
  const r = run0();
  assert.equal(canBid(r, 50), true);
  assert.equal(canBid(run0({ wallet: 240 }), 50), false);
  assert.equal(canBid(bid(r, 'me', 10), 10), false);
  assert.equal(canBid(run0({ mode: 'watch' }), 10), false);
});

test('bid raises price, sets leader, resets countdown to at least 4, flags extension under 3s', () => {
  const late = { ...run0(), t: 1.2 };
  const r = bid(late, 'me', 30);
  assert.equal(r.price, 230);
  assert.equal(r.leader, 'me');
  assert.equal(r.t, 4);
  assert.equal(r.extended, true);
  assert.equal(r.myBids, 1);
  assert.equal(late.price, 200);
});

test('no bids: sold to nobody after the countdown', () => {
  let r = run0(), ev = [];
  for (let i = 0; i < 100 && !r.over; i++) ({ run: r, events: ev } = step(r, never));
  assert.equal(r.over, true);
  assert.deepEqual(ev.at(-1), { type: 'sold', who: null, price: 200 });
  assert.equal(outcome(r), 'none');
});

test('npc bids never exceed their max and someone wins', () => {
  let r = run0(), seen = 0;
  for (let i = 0; i < 1000 && !r.over; i++) {
    const out = step(r, always);
    r = out.run;
    for (const e of out.events) if (e.type === 'bid') {
      seen++;
      assert.ok(e.price <= maxes[e.who], `${e.who} ${e.price}`);
    }
  }
  assert.ok(seen > 0);
  assert.equal(r.over, true);
  assert.notEqual(r.leader, null);
  assert.equal(outcome(r), 'lose');
});

test('player wins when npcs are out of budget', () => {
  let r = { ...bid(run0(), 'me', 50), price: 600 };
  for (let i = 0; i < 100 && !r.over; i++) r = step(r, always).run;
  assert.equal(r.leader, 'me');
  assert.equal(outcome(r), 'win');
});

test('run is capped at RUN_CAP seconds', () => {
  let r = createRun({ start: 10, maxes: { curator: 99999, stargazer: 99999, builder: 99999 }, wallet: 0, mode: 'watch' });
  let n = 0;
  while (!r.over && n < 2000) { r = step(r, always).run; n++; }
  assert.equal(r.over, true);
  assert.ok(r.total <= 45.0001);
  assert.equal(outcome(r), 'watch');
});

test('step does not mutate its input', () => {
  const r = run0();
  const snap = JSON.stringify(r);
  step(r, always);
  assert.equal(JSON.stringify(r), snap);
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/auction-engine.test.mjs` · Expected: FAIL(module not found)

- [ ] **Step 3: 구현 `js/auction/engine.js`**

```js
import { AUCTION_BIDDERS, COUNT_START, COUNT_RESET, RUN_CAP, TICK } from '../data/auction.js';

export function createRun({ start, maxes, wallet, mode }) {
  return {
    price: start, leader: null, t: COUNT_START, total: 0, wallet, mode,
    over: false, extended: false, myBids: 0,
    bidders: AUCTION_BIDDERS.map(b => ({ id: b.id, style: b.style, inc: b.inc, max: maxes[b.id], cool: 0 })),
  };
}

export function canBid(run, inc) {
  return !run.over && run.mode === 'bid' && run.leader !== 'me' && run.price + inc <= run.wallet;
}

export function bid(run, who, inc) {
  if (run.over) return run;
  return {
    ...run,
    price: run.price + inc,
    leader: who,
    t: Math.max(run.t, COUNT_RESET),
    extended: run.t < 3,
    myBids: run.myBids + (who === 'me' ? 1 : 0),
  };
}

function chance(style, t) {
  if (style === 'eager') return 0.05;
  if (style === 'big') return 0.025;
  return t < 2.2 ? 0.2 : 0.004;
}

export function step(run, rng) {
  if (run.over) return { run, events: [] };
  let r = {
    ...run,
    t: run.t - TICK,
    total: run.total + TICK,
    extended: false,
    bidders: run.bidders.map(b => ({ ...b, cool: Math.max(0, b.cool - TICK) })),
  };
  const events = [];
  for (const b of r.bidders) {
    if (r.leader === b.id || b.cool > 0 || r.price + b.inc > b.max) continue;
    if (rng() >= chance(b.style, r.t)) continue;
    const cool = 0.6 + rng() * 0.8;
    r = bid(r, b.id, b.inc);
    r = { ...r, bidders: r.bidders.map(x => (x.id === b.id ? { ...x, cool } : x)) };
    events.push({ type: 'bid', who: b.id, inc: b.inc, price: r.price, extended: r.extended });
    break;
  }
  if (r.t <= 0 || r.total >= RUN_CAP - 1e-9) {
    r = { ...r, over: true };
    events.push({ type: 'sold', who: r.leader, price: r.price });
  }
  return { run: r, events };
}

export function outcome(run) {
  if (run.mode === 'watch') return 'watch';
  if (!run.leader) return 'none';
  return run.leader === 'me' ? 'win' : 'lose';
}
```

- [ ] **Step 4: 통과 확인** — Run: `node --test tests/auction-engine.test.mjs` · Expected: PASS(8 tests)

- [ ] **Step 5: Commit**

```bash
git add js/auction/engine.js tests/auction-engine.test.mjs
git commit -m "feat: add auction bidding engine"
```

---

### Task 3: 정산과 참가 기록

**Files:**
- Create: `js/auction/settle.js`
- Test: `tests/auction-settle.test.mjs`

**Interfaces:**
- Produces: `settleWin({coins, outdoorStored}, itemId, price)→{ok:true, coins, outdoorStored}|{ok:false, why:'poor'}`, `markJoined(auction, day)→{lastDate, wins}`, `addWin(auction)→{lastDate, wins}`

- [ ] **Step 1: 실패하는 테스트 `tests/auction-settle.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settleWin, markJoined, addWin } from '../js/auction/settle.js';

test('settleWin deducts coins and adds one stored item immutably', () => {
  const stored = { fence: 2 };
  const r = settleWin({ coins: 820, outdoorStored: stored }, 'moonswing', 430);
  assert.deepEqual(r, { ok: true, coins: 390, outdoorStored: { fence: 2, moonswing: 1 } });
  assert.deepEqual(stored, { fence: 2 });
  assert.equal(settleWin({ coins: 390, outdoorStored: r.outdoorStored }, 'moonswing', 100).outdoorStored.moonswing, 2);
});

test('settleWin refuses when coins are short', () => {
  assert.deepEqual(settleWin({ coins: 100, outdoorStored: {} }, 'starvane', 110), { ok: false, why: 'poor' });
});

test('markJoined records the day, addWin counts wins, both immutable', () => {
  const a = { lastDate: '', wins: 1 };
  assert.deepEqual(markJoined(a, '2026-11-10'), { lastDate: '2026-11-10', wins: 1 });
  assert.deepEqual(addWin(markJoined(a, '2026-11-10')), { lastDate: '2026-11-10', wins: 2 });
  assert.deepEqual(a, { lastDate: '', wins: 1 });
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/auction-settle.test.mjs` · Expected: FAIL

- [ ] **Step 3: 구현 `js/auction/settle.js`**

```js
export function settleWin({ coins, outdoorStored }, itemId, price) {
  if (coins < price) return { ok: false, why: 'poor' };
  return { ok: true, coins: coins - price, outdoorStored: { ...outdoorStored, [itemId]: (outdoorStored[itemId] || 0) + 1 } };
}

export function markJoined(auction, day) { return { ...auction, lastDate: day }; }

export function addWin(auction) { return { ...auction, wins: auction.wins + 1 }; }
```

- [ ] **Step 4: 통과 확인** — Run: `node --test tests/auction-settle.test.mjs` · Expected: PASS(3 tests)

- [ ] **Step 5: Commit**

```bash
git add js/auction/settle.js tests/auction-settle.test.mjs
git commit -m "feat: add auction settlement rules"
```

---

### Task 4: 경매품 3종 모델과 카탈로그

**Files:**
- Create: `js/auction/items.js`
- Create: `sims/auction-items.html` (시각 검수용)
- Modify: `js/data/catalog.js` (OUTDOOR, `summitflag` 줄 :245 바로 아래)
- Test: `tests/auction-items.test.mjs`

**Interfaces:**
- Produces: `AUCTION_ITEM_IDS = ['moonswing','lanternarch','starvane']`, `auctionItemMesh(THREE, id)→THREE.Group|null` (원점 = 바닥 중심, 앞 = +z, 별 풍향계는 `userData.spin` 에 도는 그룹)

- [ ] **Step 1: 실패하는 테스트 `tests/auction-items.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { AUCTION_ITEM_IDS, auctionItemMesh } from '../js/auction/items.js';
import { AUCTION_POOL } from '../js/data/auction.js';

const meshes = g => { let n = 0; g.traverse(o => { if (o.isMesh) n++; }); return n; };

test('item ids match the pool', () => {
  assert.deepEqual(AUCTION_ITEM_IDS, AUCTION_POOL.map(p => p.id));
});

test('each item builds a grounded, small mesh group', () => {
  for (const id of AUCTION_ITEM_IDS) {
    const g = auctionItemMesh(THREE, id);
    assert.ok(g, id);
    assert.ok(meshes(g) <= 16, `${id} ${meshes(g)}`);
    const box = new THREE.Box3().setFromObject(g);
    assert.ok(Math.abs(box.min.y) < 0.05, `${id} min.y ${box.min.y}`);
    assert.ok(box.max.y < 2.6, `${id} max.y ${box.max.y}`);
  }
  assert.equal(auctionItemMesh(THREE, 'fence'), null);
  assert.ok(auctionItemMesh(THREE, 'starvane').userData.spin);
});

test('glow parts stay under the bloom budget', () => {
  for (const id of AUCTION_ITEM_IDS) auctionItemMesh(THREE, id).traverse(o => {
    if (o.isMesh && o.material.emissive && o.material.emissive.getHex() !== 0) assert.ok(o.material.emissiveIntensity <= 0.6, id);
  });
});

test('no lights inside items', () => {
  assert.doesNotMatch(readFileSync('js/auction/items.js', 'utf8'), /PointLight|SpotLight/);
});

test('catalog lists the three hidden auction items', () => {
  const cat = readFileSync('js/data/catalog.js', 'utf8');
  for (const id of AUCTION_ITEM_IDS) assert.match(cat, new RegExp(`id: '${id}'[^\\n]*hidden: true`));
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/auction-items.test.mjs` · Expected: FAIL

- [ ] **Step 3: 구현 `js/auction/items.js`** (달빛 그네 = 시안 `sims/auction-stage/models.js` `buildMoonSwing`)

```js
export const AUCTION_ITEM_IDS = ['moonswing', 'lanternarch', 'starvane'];

function kit(THREE) {
  const mats = new Map();
  const clay = c => {
    if (!mats.has(c)) mats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, metalness: 0 }));
    return mats.get(c);
  };
  const glow = (c, k) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: k, roughness: 0.6 });
  const up = new THREE.Vector3(0, 1, 0);
  const put = (g, geo, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m;
  };
  const beam = (g, a, b, r, mat) => {
    const pa = new THREE.Vector3(...a), pb = new THREE.Vector3(...b), d = pb.clone().sub(pa);
    const m = put(g, new THREE.CylinderGeometry(r, r, d.length(), 8), mat);
    m.position.copy(pa.add(pb).multiplyScalar(0.5));
    m.quaternion.setFromUnitVectors(up, d.normalize());
    return m;
  };
  return { clay, glow, put, beam };
}

function moonswing(THREE) {
  const { clay, glow, put, beam } = kit(THREE);
  const g = new THREE.Group(), wood = clay(0xc79a63), rope = clay(0xe8dcc0);
  for (const sx of [-0.78, 0.78]) {
    beam(g, [sx, 0, 0.36], [sx, 1.78, 0], 0.05, wood);
    beam(g, [sx, 0, -0.36], [sx, 1.78, 0], 0.05, wood);
  }
  beam(g, [-0.9, 1.78, 0], [0.9, 1.78, 0], 0.055, wood);
  for (const sx of [-0.3, 0.3]) beam(g, [sx, 1.76, 0], [sx, 0.56, 0], 0.014, rope);
  put(g, new THREE.BoxGeometry(0.78, 0.06, 0.32), wood, 0, 0.54, 0);
  put(g, new THREE.TorusGeometry(0.17, 0.055, 8, 22, Math.PI * 1.25), glow(0xfff0b0, 0.45), 0, 2.02, 0).rotation.z = 0.95;
  for (const [x, y] of [[-0.55, 1.6], [0.55, 1.62], [0, 1.58]]) put(g, new THREE.OctahedronGeometry(0.055, 0), glow(0xfff4c8, 0.5), x, y, 0);
  return g;
}

function lanternarch(THREE) {
  const { clay, glow, put } = kit(THREE);
  const g = new THREE.Group(), wood = clay(0x8f633f);
  for (const sx of [-0.85, 0.85]) put(g, new THREE.CylinderGeometry(0.07, 0.08, 1.6, 8), wood, sx, 0.8, 0);
  put(g, new THREE.TorusGeometry(0.85, 0.06, 8, 24, Math.PI), wood, 0, 1.6, 0);
  [0xff9a4c, 0xffcf5a, 0xff6f6f, 0xffcf5a, 0xff9a4c].forEach((c, i) => {
    const a = Math.PI * (0.12 + i * 0.19);
    put(g, new THREE.SphereGeometry(0.11, 10, 8), glow(c, 0.5), Math.cos(a) * 0.85, 1.6 + Math.sin(a) * 0.85 - 0.2, 0).scale.y = 1.2;
  });
  return g;
}

function starvane(THREE) {
  const { clay, glow, put } = kit(THREE);
  const g = new THREE.Group();
  put(g, new THREE.CylinderGeometry(0.22, 0.26, 0.12, 10), clay(0x9aa3a8), 0, 0.06, 0);
  put(g, new THREE.CylinderGeometry(0.035, 0.035, 1.7, 6), clay(0x5e3d27), 0, 0.9, 0);
  const arrow = new THREE.Group(); arrow.position.y = 1.55; g.add(arrow);
  put(arrow, new THREE.BoxGeometry(0.9, 0.04, 0.04), clay(0x5e3d27), 0, 0, 0);
  put(arrow, new THREE.ConeGeometry(0.08, 0.18, 6), clay(0x5e3d27), 0.48, 0, 0).rotation.z = -Math.PI / 2;
  put(arrow, new THREE.OctahedronGeometry(0.17, 0), glow(0xffd86b, 0.45), -0.45, 0, 0).scale.set(1, 1, 0.4);
  put(g, new THREE.SphereGeometry(0.06, 8, 6), clay(0xe0b04a), 0, 1.78, 0);
  g.userData.spin = arrow;
  return g;
}

const BUILD = { moonswing, lanternarch, starvane };

export function auctionItemMesh(THREE, id) {
  return BUILD[id] ? BUILD[id](THREE) : null;
}
```

- [ ] **Step 4: 카탈로그 3줄** (`js/data/catalog.js`, `summitflag` 줄 아래. 이름·설명은 Task 0 확정본)

```js
  { id: 'moonswing',   name: '달빛 그네', ico: '🌙', cost: { coins: 9999 }, desc: '저녁 경매에서 낙찰받은 달빛 그네', hidden: true },
  { id: 'lanternarch', name: '등불 아치', ico: '🏮', cost: { coins: 9999 }, desc: '저녁 경매에서 낙찰받은 등불 아치', hidden: true },
  { id: 'starvane',    name: '별 풍향계', ico: '⭐', cost: { coins: 9999 }, desc: '저녁 경매에서 낙찰받은 별 풍향계', hidden: true },
```

- [ ] **Step 5: 통과 확인** — Run: `node --test tests/auction-items.test.mjs && npm test` · Expected: 전부 PASS

- [ ] **Step 6: 시각 검수(사용자 게이트)** — `sims/auction-items.html`: `sims/auction-stage-3d.html` 의 렌더러·조명 설정을 그대로 쓰고 `../js/auction/items.js` 를 import 해 세 모델을 같은 각도로 나란히, 낮(`hemi 1.0`)·밤(`hemi 0.55`) 두 줄로 그린다. PC·모바일 캡처를 사용자에게 보이고, 등불 아치·별 풍향계가 마음에 안 들면 이 Task 안에서 고친다.

- [ ] **Step 7: Commit**

```bash
git add js/auction/items.js js/data/catalog.js tests/auction-items.test.mjs sims/auction-items.html
git commit -m "feat: add auction decor items"
```

---

### Task 5: 등불 무대 3D와 자리 잡기

**Files:**
- Create: `js/auction/stage.js`
- Test: `tests/auction-stage.test.mjs`
- Modify(Step 5 결과): `js/data/auction.js`

**Interfaces:**
- Consumes: `auctionItemMesh`(Task 4)
- Produces: `buildAuctionStage(THREE)→{ group, lanterns, gavel, bell, pedestal, cone, pool, focus(x,z), setItem(id), setNight(level), setTension(on,t) }` — 무대 기준 좌표, 앞=+z. `gavel`·`bell` 은 피벗 Group(Task 7 이 `rotation.z` 를 돌림)

- [ ] **Step 1: 실패하는 테스트 `tests/auction-stage.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { buildAuctionStage } from '../js/auction/stage.js';

test('stage builds with lanterns, gavel, bell and swaps the item', () => {
  const s = buildAuctionStage(THREE);
  assert.ok(s.lanterns.length >= 20);
  assert.ok(s.gavel.isGroup && s.bell.isGroup);
  s.setItem('starvane');
  assert.equal(s.pedestal.children.length, 1);
  s.setItem('moonswing');
  assert.equal(s.pedestal.children.length, 1);
});

test('night level drives lantern glow within budget', () => {
  const s = buildAuctionStage(THREE);
  s.setNight(0);
  assert.ok(s.lanterns.every(m => m.material.emissiveIntensity <= 0.15));
  s.setNight(1);
  assert.ok(s.lanterns.every(m => m.material.emissiveIntensity > 0.3 && m.material.emissiveIntensity <= 0.6));
});

test('focus moves the light pool to the ground off stage', () => {
  const s = buildAuctionStage(THREE);
  assert.ok(s.pool.position.y > 0.5);
  s.focus(0.4, 5.9);
  assert.ok(s.pool.position.y < 0.1);
  assert.ok(Math.abs(s.pool.position.x - 0.4) < 1e-9);
});

test('no real lights on the permanent stage', () => {
  assert.doesNotMatch(readFileSync('js/auction/stage.js', 'utf8'), /PointLight|SpotLight/);
});

test('mesh budget', () => {
  let n = 0;
  buildAuctionStage(THREE).group.traverse(o => { if (o.isMesh) n++; });
  assert.ok(n <= 140, String(n));
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/auction-stage.test.mjs` · Expected: FAIL

- [ ] **Step 3: 구현 `js/auction/stage.js`** — 시안 `buildStage` 에서 잔디·광장 바닥·돌·나무·화분·통은 빼고(마을이 이미 가짐), 좌표를 무대 중심(시안 월드 `(0, -3.2)`) 기준으로 옮겼다.

```js
import { auctionItemMesh } from './items.js';

export function buildAuctionStage(THREE) {
  const mats = new Map();
  const clay = c => {
    if (!mats.has(c)) mats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, metalness: 0 }));
    return mats.get(c);
  };
  const put = (p, geo, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; p.add(m); return m;
  };
  const g = new THREE.Group(), lanterns = [];
  const wood = clay(0xc9935f), woodD = clay(0x8f633f), woodDD = clay(0x6d4a2e);
  put(g, new THREE.BoxGeometry(6.4, 0.5, 3.2), wood, 0, 0.25, 0);
  put(g, new THREE.BoxGeometry(6.44, 0.46, 0.05), woodD, 0, 0.24, 1.62);
  for (let i = 0; i < 16; i++) {
    const tri = put(g, new THREE.ConeGeometry(0.19, 0.32, 3), clay(i % 2 ? 0xfff2e0 : 0xff8f8f), -3.0 + i * 0.4, 0.33, 1.66);
    tri.rotation.set(Math.PI, Math.PI / 6, 0); tri.scale.z = 0.25;
  }
  put(g, new THREE.BoxGeometry(1.3, 0.25, 0.45), woodD, 0, 0.125, 1.85);
  for (const sx of [-3.15, 3.15]) put(g, new THREE.CylinderGeometry(0.1, 0.12, 4.1, 8), woodDD, sx, 2.05, -1.4);
  for (let i = 0; i < 14; i++) put(g, new THREE.BoxGeometry(0.45, 3.1, 0.12), clay(i % 2 ? 0x9c3533 : 0xb8433f), -2.93 + i * 0.45, 2.05, -1.42 + (i % 2) * 0.07);
  put(g, new THREE.BoxGeometry(6.6, 0.16, 0.22), woodDD, 0, 4.0, -1.35);
  put(g, new THREE.BoxGeometry(6.4, 0.34, 0.16), clay(0xe0b04a), 0, 3.74, -1.26);
  for (let i = 0; i < 14; i++) put(g, new THREE.SphereGeometry(0.23, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), clay(0xe0b04a), -2.93 + i * 0.45, 3.58, -1.22);
  put(g, new THREE.CylinderGeometry(1.05, 1.05, 0.04, 28), clay(0xefe3c8), -1.25, 0.52, -0.05).castShadow = false;
  const pedestal = new THREE.Group(); pedestal.position.set(-1.25, 0.54, -0.05); g.add(pedestal);
  put(g, new THREE.BoxGeometry(0.9, 1.0, 0.62), woodDD, 1.75, 1.0, 0.5);
  put(g, new THREE.BoxGeometry(1.06, 0.08, 0.74), clay(0xa0703f), 1.75, 1.54, 0.5).rotation.x = -0.12;
  put(g, new THREE.BoxGeometry(0.5, 0.36, 0.02), clay(0xe0b04a), 1.75, 1.05, 0.82);
  const gavel = new THREE.Group(); gavel.position.set(1.52, 1.62, 0.6); g.add(gavel);
  put(gavel, new THREE.CylinderGeometry(0.028, 0.028, 0.46, 6), clay(0x7a5232), 0.23, 0, 0).rotation.z = Math.PI / 2;
  put(gavel, new THREE.CylinderGeometry(0.075, 0.075, 0.26, 10), clay(0x5e3d27), 0.47, 0, 0).rotation.x = Math.PI / 2;
  put(g, new THREE.BoxGeometry(0.5, 0.06, 0.06), woodDD, -3.4, 3.65, -1.2).castShadow = false;
  const bell = new THREE.Group(); bell.position.set(-3.6, 3.62, -1.2); g.add(bell);
  put(bell, new THREE.CylinderGeometry(0.07, 0.19, 0.26, 14), clay(0xd9a93a), 0, -0.25, 0);
  put(bell, new THREE.SphereGeometry(0.06, 8, 6), clay(0x8a6a2a), 0, -0.4, 0);
  for (const x of [-6.4, 6.4]) put(g, new THREE.CylinderGeometry(0.09, 0.11, 4.6, 8), woodDD, x, 2.3, 4.0);
  const warm = [0xff9a4c, 0xffcf5a, 0xff6f6f, 0xffb35c];
  const string = (a, b, sag, n, cols) => {
    const pa = new THREE.Vector3(...a), pb = new THREE.Vector3(...b), pts = [];
    for (let i = 0; i <= 24; i++) { const t = i / 24, p = pa.clone().lerp(pb, t); p.y -= Math.sin(Math.PI * t) * sag; pts.push(p); }
    const curve = new THREE.CatmullRomCurve3(pts);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.014, 4), clay(0x3a2a20)));
    for (let i = 0; i < n; i++) {
      const p = curve.getPoint((i + 0.5) / n), c = cols[i % cols.length];
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.05, roughness: 0.6 }));
      m.position.set(p.x, p.y - 0.24, p.z); m.scale.y = 1.2; g.add(m); lanterns.push(m);
    }
  };
  string([-6.4, 4.45, 4.0], [6.4, 4.45, 4.0], 0.9, 11, warm);
  string([-3.15, 4.05, -1.3], [6.4, 4.45, 4.0], 0.8, 9, warm.slice(1));
  string([3.15, 4.05, -1.3], [-6.4, 4.45, 4.0], 0.8, 9, warm.slice(2).concat(warm.slice(0, 2)));
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff3c6, transparent: true, opacity: 0.04, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 28, 1, true), beamMat); g.add(cone);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1.1, 32), beamMat.clone()); pool.rotation.x = -Math.PI / 2; pool.material.opacity = 0.18; g.add(pool);
  const top = new THREE.Vector3(-1.25, 7.4, 2.2), aim = new THREE.Vector3(), dir = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const focus = (x, z) => {
    const onStage = Math.abs(x + 1.25) < 0.01 && Math.abs(z + 0.05) < 0.01;
    const y = onStage ? 0.53 : 0.03;
    aim.set(x, y, z);
    dir.copy(top).sub(aim);
    const len = dir.length(), r = Math.tan(0.36) * len * 0.8;
    cone.scale.set(r, len, r);
    cone.position.copy(top).add(aim).multiplyScalar(0.5);
    cone.quaternion.setFromUnitVectors(up, dir.normalize());
    pool.position.set(x, y, z);
  };
  focus(-1.25, -0.05);
  return {
    group: g, lanterns, gavel, bell, pedestal, cone, pool, focus,
    setItem(id) {
      pedestal.clear();
      const m = auctionItemMesh(THREE, id);
      if (m) { m.rotation.y = 0.25; pedestal.add(m); }
    },
    setNight(level) {
      const k = 0.05 + 0.5 * Math.max(0, Math.min(1, level));
      for (const m of lanterns) m.material.emissiveIntensity = k;
    },
    setTension(on, t) { cone.material.opacity = on ? 0.035 + 0.03 * (0.5 + 0.5 * Math.sin(t * 14)) : 0.04; },
  };
}
```

- [ ] **Step 4: 통과 확인** — Run: `node --test tests/auction-stage.test.mjs` · Expected: PASS(5 tests)

- [ ] **Step 5: 자리 잡기(사용자 게이트)** — 후보 두 곳을 실제 게임에 띄워 캡처한다(Task 9 연결 뒤에 해도 되지만, 좌표가 바뀌면 관객 자리·나무 제외도 바뀌므로 **Task 9 Step 6 직후 반드시** 한다).
  - A `{x: 32.5, z: -3.5}`: 광장(23,-4, r5) 동쪽. 바다 후미(중심 24,-21.5 r12)까지 17.8, 과수원 입구(33,7)까지 10.5
  - B `{x: 30.5, z: 1.5}`: 광장 동남. 관객석이 과수원 입구 잔디(`orchardGateBlocks`, game.js:3605)에 닿지 않는지 확인 필요
  - 확인: ① 무대(±3.2, ±1.6)·관객 자리(`AUCTION_SPOTS`, 앞쪽 6m)가 물·과수원 입구 잔디·광장 원·`maxR 42` 를 침범하지 않음 ② 기본 카메라(높이 14·뒤 16)로 걸어올 때 무대 앞면이 보임 ③ 모바일 세로에서 등불 줄이 화면에 들어옴
  - 방법: 워크트리 서버에 `?time=0.8&dbg=1`(dev 세션 → GA4 미기록), 좌표만 바꿔 PC·모바일 캡처(메모리 game-capture-pitfall: `body.playing`·고정 시계·숨긴 탭 rAF). 사용자가 고른 좌표를 `js/data/auction.js` 에 확정.

- [ ] **Step 6: Commit**

```bash
git add js/auction/stage.js tests/auction-stage.test.mjs js/data/auction.js
git commit -m "feat: add lantern auction stage"
```

---

### Task 6: 무대 앞 주민·팻말·곰 팔

**Files:**
- Create: `js/auction/actors.js`
- Test: `tests/auction-actors.test.mjs`

**Interfaces:**
- Consumes: `buildNPCFigure(def)→{group, body, look}` (js/spaces/npc.js:287 — 실제 주민과 같은 몸·외형), `NPCS` (js/data/npcs.js), `AUCTION_SPOTS`, `AUCTION_BIDDERS`
- Produces:
  - 순수: `paddlePose(r, side, scale)→{x,y,z,rx,rz}`, `hopHeight(t)→number`, `faceStage(dx, dz)→rotationY`
  - 3D: `createActors(THREE, { buildFigure, npcDefs, parent })→{ raise(id, until), hop(id, twice), lead(id|null), burst(id), update(dt, now, t), attachPlayer(arms), detachPlayer(), spotOf(id)→[dx,dz], dispose() }`
    - `id ∈ 'curator'|'stargazer'|'builder'|'merchant'|'me'`. `'me'` 는 인형이 아니라 실제 플레이어: `attachPlayer({R:{pivot,hand}})` 로 팔을 넘겨받는다.

- [ ] **Step 1: 실패하는 테스트 `tests/auction-actors.test.mjs`** (three 없이 순수 부분만)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paddlePose, hopHeight, faceStage } from '../js/auction/actors.js';

test('paddlePose lowers at 0 and lifts beside the head at 1, mirrored by side', () => {
  const lo = paddlePose(0, 1, 1), hi = paddlePose(1, 1, 1), hiL = paddlePose(1, -1, 1);
  assert.ok(Math.abs(lo.y - 0.05) < 1e-9 && Math.abs(hi.y - 1.0) < 1e-9);
  assert.ok(Math.abs(hi.x - 0.8) < 1e-9 && Math.abs(hiL.x + 0.8) < 1e-9);
  assert.ok(Math.abs(hi.rz + hiL.rz) < 1e-9);
  assert.ok(Math.abs(paddlePose(1, 1, 0.84).x - 0.8 * 0.84) < 1e-9);
});

test('hopHeight is a 0.42s arc of 0.26', () => {
  assert.equal(hopHeight(0), 0);
  assert.ok(Math.abs(hopHeight(0.21) - 0.26) < 1e-9);
  assert.equal(hopHeight(0.5), 0);
});

test('faceStage turns a figure toward the stage centre', () => {
  const ry = faceStage(0, 5);
  assert.ok(Math.abs(Math.abs(ry) - Math.PI) < 0.1);
  assert.ok(faceStage(-3, 3) > 0);
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/auction-actors.test.mjs` · Expected: FAIL

- [ ] **Step 3: 순수 부분 구현**

```js
const LO = { y: 0.05, x: 0.62, rz: -0.45, rx: 0.25 };
const HI = { y: 1.0, x: 0.8, rz: -0.1, rx: 0 };

export function paddlePose(r, side, scale) {
  return {
    x: side * scale * (LO.x + (HI.x - LO.x) * r),
    y: LO.y + (HI.y - LO.y) * r,
    z: 0.16,
    rx: LO.rx * (1 - r),
    rz: side * (LO.rz + (HI.rz - LO.rz) * r),
  };
}

export function hopHeight(t) { return t < 0.42 ? Math.sin(Math.PI * t / 0.42) * 0.26 : 0; }

export function faceStage(dx, dz) { return Math.atan2(-0.2 - dx, 0.2 - dz); }
```

- [ ] **Step 4: 3D 부분 구현** — 시안 `sims/auction-stage-3d.html` 의 `place()`·`animateActor()`, `sims/auction-stage/models.js` 의 `buildPaddle()`·`makeConfetti()`, 금빛 고리를 옮긴다. 규칙:
  - 인형: `const fig = buildFigure(npcDefs.find(n => n.id === id))` → `root(자리·방향) > lift(들썩임) > fig.group`. 방향 `root.rotation.y = faceStage(dx, dz)`. 팻말 쪽 `side = dx < 0 ? -1 : 1`. 별 보는 아이 `scale = fig.group.scale.x`(0.84).
  - 팻말: 손잡이 `CylinderGeometry(0.035, 0.042, 0.55, 6)` 0x9b7247 · 판 `CylinderGeometry(0.21, 0.21, 0.05, 18)` 0xf6efe0(rotation.x π/2, y 0.7) · 테두리 `TorusGeometry(0.21, 0.035, 6, 20)` 와 가운데 점 `CylinderGeometry(0.085, 0.085, 0.065, 14)` = `def.color`. 주민 크기 1.25, 곰 0.95(테두리 0x6fae7f, `rotation.x = π` 로 손에 거꾸로 붙임).
  - `update(dt, now, t)`: 각 인형 `raise += (want - raise) * (1 - exp(-dt*14))`(`want = now < raiseUntil ? 1 : 0`), `paddlePose` 적용, `lift.position.y = hopHeight(hopT)`(두 번 뛰기는 끝나면 hopT=0 한 번 더), 숨쉬기 `lift.scale.y = 1 + sin(t*2.2 + phase)*0.012`. 플레이어 팔 `arms.R.pivot.rotation.x = -0.9 - 2.0 * raise`.
  - 금빛 고리: `TorusGeometry(0.72, 0.05, 8, 36)`, `emissiveIntensity 0.35`, 1등 자리로 `dt*10` lerp, `rotation.z += dt*0.8`.
  - 꽃가루: 46장 `PlaneGeometry(0.09, 0.14)`, 5색, 수명 1.8초, 중력 6.5, 끝나면 재질 dispose.
  - `dispose()`: 인형·팻말·고리·꽃가루를 parent 에서 떼고 **이 모듈이 만든 지오메트리·재질만** dispose(주민 몸 재질은 game.js `clayMat` 공유라 건드리지 않는다).

- [ ] **Step 5: 통과 확인** — Run: `node --test tests/auction-actors.test.mjs` · Expected: PASS(3 tests)

- [ ] **Step 6: Commit**

```bash
git add js/auction/actors.js tests/auction-actors.test.mjs
git commit -m "feat: add auction bidder figures and paddles"
```

---

### Task 7: 한 판 진행 화면

**Files:**
- Create: `js/auction/scene.js`
- Test: `tests/auction-scene.test.mjs`

**Interfaces:**
- Consumes: Task 1~3, stage(Task 5)·actors(Task 6) 의 메서드 이름
- Produces: `callText(t, extended)→string`, `createAuctionScene(deps)→{ begin(mode), playerBid(inc)→bool, update(dt, t), active()→bool, end() }`
  - `deps = { stage, actors, now, rng, day, getCoins, setCoins, getStored, setStored, getAuction, setAuction, onUi, onDone, track, econ, save }`
  - `onUi(state)`: `{ phase:'run'|'done', price, leader, t, call, feed:[{who,inc,price}], canBid:{10:bool,30:bool,50:bool}, result, itemId }`
  - `onDone(result)`: `{ outcome, price, itemId, runId, leader }`

- [ ] **Step 1: 실패하는 테스트 `tests/auction-scene.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAuctionScene, callText } from '../js/auction/scene.js';

function fakes(over = {}) {
  const log = { ui: [], done: null, track: [], econ: [], saved: 0 };
  let coins = 820, stored = {}, auction = { lastDate: '', wins: 0 };
  const noop = () => {};
  const stage = { setItem: noop, setTension: noop, focus: noop, gavel: { rotation: { z: 0 } }, bell: { rotation: { z: 0 } } };
  const actors = { raise: noop, hop: noop, lead: noop, update: noop, burst: noop, spotOf: () => [0, 5.9] };
  const deps = {
    stage, actors, now: () => 0, rng: () => 0.999, day: () => '2026-11-10',
    getCoins: () => coins, setCoins: c => { coins = c; }, getStored: () => stored, setStored: s => { stored = s; },
    getAuction: () => auction, setAuction: a => { auction = a; },
    onUi: s => log.ui.push(s), onDone: r => { log.done = r; }, track: (n, p) => log.track.push([n, p]),
    econ: (...a) => log.econ.push(a), save: () => { log.saved++; }, ...over,
  };
  return { deps, log, get: () => ({ coins, stored, auction }) };
}

test('callText', () => {
  assert.equal(callText(5, false), '');
  assert.equal(callText(2.5, false), '하나…');
  assert.equal(callText(1.5, false), '하나… 둘…');
  assert.equal(callText(0.5, false), '하나… 둘… 셋!');
  assert.equal(callText(4, true), '⏱️ 다시 4초!');
});

test('begin records the day and saves before the run', () => {
  const f = fakes();
  createAuctionScene(f.deps).begin('bid');
  assert.equal(f.get().auction.lastDate, '2026-11-10');
  assert.ok(f.log.saved >= 1);
  assert.equal(f.log.track[0][0], 'auction_join');
  assert.equal(f.log.track[0][1].mode, 'bid');
});

test('player wins when npcs never bid', () => {
  const f = fakes();
  const s = createAuctionScene(f.deps);
  s.begin('bid');
  assert.equal(s.playerBid(50), true);
  for (let i = 0; i < 200 && s.active(); i++) s.update(0.1, i * 0.1);
  assert.equal(f.log.done.outcome, 'win');
  const price = f.log.done.price;
  assert.equal(f.get().coins, 820 - price);
  assert.equal(Object.values(f.get().stored).reduce((a, b) => a + b, 0), 1);
  assert.equal(f.get().auction.wins, 1);
  assert.ok(f.log.econ.some(e => e[0] === 'auction_win' && e[2] === -price));
  assert.ok(f.log.track.some(([n, p]) => n === 'auction_result' && p.outcome === 'win' && p.my_bids === 1));
});

test('watch mode cannot bid and never charges', () => {
  const f = fakes({ rng: () => 0 });
  const s = createAuctionScene(f.deps);
  s.begin('watch');
  assert.equal(s.playerBid(10), false);
  for (let i = 0; i < 600 && s.active(); i++) s.update(0.1, i * 0.1);
  assert.equal(f.log.done.outcome, 'watch');
  assert.equal(f.get().coins, 820);
  assert.equal(f.log.econ.length, 0);
});

test('a big frame advances several fixed ticks', () => {
  const f = fakes();
  const s = createAuctionScene(f.deps);
  s.begin('bid');
  s.update(0.35, 0.35);
  assert.ok(Math.abs(f.log.ui.at(-1).t - 7.7) < 1e-6, String(f.log.ui.at(-1).t));
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/auction-scene.test.mjs` · Expected: FAIL

- [ ] **Step 3: 구현 `js/auction/scene.js`**

```js
import { createRun, step, bid, canBid, outcome } from './engine.js';
import { settleWin, markJoined, addWin } from './settle.js';
import { lotFor, bidderMaxes } from './rules.js';
import { BID_INCS, TICK } from '../data/auction.js';

export function callText(t, extended) {
  if (extended) return '⏱️ 다시 4초!';
  if (t >= 3) return '';
  if (t >= 2) return '하나…';
  if (t >= 1) return '하나… 둘…';
  return '하나… 둘… 셋!';
}

export function createAuctionScene(d) {
  let run = null, lot = null, acc = 0, feed = [], flashUntil = 0, runId = '', done = null, slamT = 9, bellT = 9;
  const emit = () => d.onUi({
    phase: done ? 'done' : 'run', price: run.price, leader: run.leader, t: run.t,
    call: callText(run.t, run.total < flashUntil), feed,
    canBid: Object.fromEntries(BID_INCS.map(n => [n, canBid(run, n)])), result: done, itemId: lot.id,
  });
  const onBid = (who, inc, extended) => {
    feed = [{ who, inc, price: run.price }, ...feed].slice(0, 3);
    if (extended) flashUntil = run.total + 0.8;
    d.actors.raise(who, d.now() + 1.0);
    d.actors.hop(who, false);
    d.actors.lead(who);
  };
  const finish = () => {
    const out = outcome(run), price = run.price;
    if (out === 'win') {
      const r = settleWin({ coins: d.getCoins(), outdoorStored: d.getStored() }, lot.id, price);
      if (r.ok) {
        d.setCoins(r.coins);
        d.setStored(r.outdoorStored);
        d.setAuction(addWin(d.getAuction()));
        d.econ('auction_win', lot.id, -price, r.coins);
      }
    }
    if (run.leader) {
      d.actors.hop(run.leader, true);
      d.actors.burst(run.leader);
      const [x, z] = d.actors.spotOf(run.leader);
      d.stage.focus(x, z);
    }
    slamT = 0; bellT = 0;
    done = { outcome: out, price, itemId: lot.id, runId, leader: run.leader };
    d.track('auction_result', { item_id: lot.id, outcome: out, price, my_bids: run.myBids, run_id: runId });
    d.save();
    emit();
    d.onDone(done);
  };
  return {
    begin(mode) {
      const day = d.day();
      lot = lotFor(day);
      run = createRun({ start: lot.start, maxes: bidderMaxes(day, lot.appraisal), wallet: d.getCoins(), mode });
      acc = 0; feed = []; flashUntil = 0; done = null; slamT = 0; bellT = 0;
      runId = `${day}:${Math.floor(d.rng() * 1e6)}`;
      d.setAuction(markJoined(d.getAuction(), day));
      d.save();
      d.stage.setItem(lot.id);
      d.stage.focus(-1.25, -0.05);
      d.track('auction_join', { item_id: lot.id, mode, coins: d.getCoins() });
      emit();
    },
    playerBid(inc) {
      if (!run || done || !canBid(run, inc)) return false;
      run = bid(run, 'me', inc);
      onBid('me', inc, run.extended);
      emit();
      return true;
    },
    update(dt, t) {
      if (!run) return;
      slamT += dt; bellT += dt;
      if (!done) {
        acc += dt;
        while (acc >= TICK - 1e-9 && !done) {
          acc -= TICK;
          const out = step(run, d.rng);
          run = out.run;
          for (const e of out.events) {
            if (e.type === 'bid') onBid(e.who, e.inc, e.extended);
            if (e.type === 'sold') finish();
          }
        }
        if (!done) { d.stage.setTension(run.t < 3, t); emit(); }
      }
      const tense = !done && run.t < 3;
      d.stage.gavel.rotation.z = slamT < 0.14 ? 1.3 - 1.4 * (slamT / 0.14)
        : slamT < 0.4 ? -0.1 + 0.1 * ((slamT - 0.14) / 0.26)
        : tense ? 1.05 + Math.sin(t * 6) * 0.05 : 0;
      d.stage.bell.rotation.z = bellT < 2 ? Math.sin(bellT * 22) * 0.5 * Math.exp(-bellT * 3) : 0;
      d.actors.update(dt, d.now(), t);
    },
    active() { return !!run && !done; },
    end() { run = null; done = null; },
  };
}
```

- [ ] **Step 4: 통과 확인** — Run: `node --test tests/auction-scene.test.mjs` · Expected: PASS(5 tests)

- [ ] **Step 5: Commit**

```bash
git add js/auction/scene.js tests/auction-scene.test.mjs
git commit -m "feat: add auction run scene controller"
```

---

### Task 8: 경매 창 UI

**Files:**
- Create: `js/auction/ui.js`
- Test: `tests/auction-ui.test.mjs`

**Interfaces:**
- Consumes: `onUi(state)`(Task 7), Task 0 확정 문구
- Produces:
  - 순수: `whoLine(leader, names, t)`, `feedLine(f, names, t)`, `resultLine(r, itemName, names, t)→{title, sub}`, `barColor(t)`
  - DOM: `createAuctionUi({ t, names, itemName(id), itemThumb(id), onJoin(mode), onBid(inc), onClose() })→{ open(view), render(state), close(), isOpen() }`
    - `view = { mode:'bid'|'watch'|'closed'|'done', itemId, appraisal, start, coins, secondsToOpen }`
    - 창 id `auction-modal`(`ui.anyModalOpen` 이 `[id$="-modal"].show` 로 잡음). 열 때 `body.menu-open mg-open` 추가, 닫을 때 제거(index.html:7127·7145 조각 공방과 같음).
    - CSS 는 `<style id="auction-style">` 한 번 주입(js/mountain/cafe-ui.js 방식). 값은 시안 `sims/auction-stage-3d.html` 의 `.au`·`.item`·`.big`·`.tbar`·`.call`·`.feed`·`.btn`·`.res` 규칙. PC(`@media (min-width: 768px)`) `right:14px; top: calc(14px + var(--top-inset)); bottom:14px; width:300px`, 모바일 `left:10px; right:10px; bottom: calc(12px + env(safe-area-inset-bottom))`.

- [ ] **Step 1: 실패하는 테스트 `tests/auction-ui.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { whoLine, resultLine, feedLine, barColor } from '../js/auction/ui.js';

const names = { curator: '큐레이터', stargazer: '별 보는 아이', builder: '목수 아저씨' };
const t = s => s;

test('whoLine', () => {
  assert.equal(whoLine(null, names, t), '먼저 불러 보세요');
  assert.equal(whoLine('me', names, t), '🙋 내가 제일 높아요');
  assert.equal(whoLine('builder', names, t), '목수 아저씨가 제일 높아요');
});

test('feedLine', () => {
  assert.equal(feedLine({ who: 'me', inc: 30, price: 260 }, names, t), '🙋 나 +30 → 🪙260');
  assert.equal(feedLine({ who: 'stargazer', inc: 10, price: 270 }, names, t), '별 보는 아이 +10 → 🪙270');
});

test('resultLine', () => {
  assert.equal(resultLine({ outcome: 'win', price: 430, leader: 'me' }, '달빛 그네', names, t).title, '낙찰! 달빛 그네를 가져왔어요');
  assert.equal(resultLine({ outcome: 'lose', price: 450, leader: 'curator' }, '달빛 그네', names, t).title, '큐레이터가 가져갔어요');
  assert.equal(resultLine({ outcome: 'none', price: 200, leader: null }, '달빛 그네', names, t).title, '아무도 안 불렀어요');
  assert.equal(resultLine({ outcome: 'watch', price: 380, leader: 'stargazer' }, '달빛 그네', names, t).title, '별 보는 아이가 가져갔어요');
  assert.equal(resultLine({ outcome: 'watch', price: 200, leader: null }, '달빛 그네', names, t).title, '아무도 안 불렀어요');
});

test('barColor', () => {
  assert.equal(barColor(6), '#8fd3a0');
  assert.equal(barColor(3), '#f2c14e');
  assert.equal(barColor(1), '#e8774a');
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/auction-ui.test.mjs` · Expected: FAIL

- [ ] **Step 3: 순수 부분 구현**

```js
export function whoLine(leader, names, t) {
  if (!leader) return t('먼저 불러 보세요');
  if (leader === 'me') return t('🙋 내가 제일 높아요');
  return t('{0}가 제일 높아요').replace('{0}', t(names[leader]));
}

export function feedLine(f, names, t) {
  const who = f.who === 'me' ? t('🙋 나') : t(names[f.who]);
  return `${who} +${f.inc} → 🪙${f.price}`;
}

export function resultLine(r, itemName, names, t) {
  if (r.outcome === 'win') return { title: t('낙찰! {0}를 가져왔어요').replace('{0}', t(itemName)), sub: t('🧺 보관함에 넣었어요') };
  if (r.outcome === 'none' || !r.leader) return { title: t('아무도 안 불렀어요'), sub: '' };
  return { title: t('{0}가 가져갔어요').replace('{0}', t(names[r.leader])), sub: `🪙${r.price}` };
}

export function barColor(t) { return t > 4 ? '#8fd3a0' : t > 2 ? '#f2c14e' : '#e8774a'; }
```

- [ ] **Step 4: DOM 부분 구현** — 시안의 `drawIdle`·`drawRun`·`syncRun`·`pushFeed`·`tickUI`·`drawResult` 를 옮긴다.
  - `open(view)`: 머리(창 제목) + 경매품 카드(썸네일·이름·감정가) + 본문. 본문은 mode 별:
    - `'bid'`: 대기 안내 + [🙋 참가하기] [👀 구경하기] → `onJoin('bid'|'watch')`
    - `'watch'`: 대기 안내 + "🪙{start}부터 부를 수 있어요" + [👀 구경하기] → `onJoin('watch')`
    - `'closed'`: "🔨 해가 지면 열려요" + 남은 시간 `약 ${Math.ceil(secondsToOpen / 60)}분 뒤` + [닫기]
    - `'done'`: "🔨 내일 저녁에 또 열려요" + [닫기]
  - `render(state)`: run 이면 가격(바뀔 때만 `bump` 애니메이션), `whoLine`, 시간 막대(`width = t/8`, `barColor`), `state.call`, 기록 줄(새 항목만 `prepend`, 3줄 유지, 모바일 CSS 로 3번째 숨김), 입찰 버튼 `disabled = !state.canBid[n]`. 구경 모드면 입찰 버튼 줄 자체를 그리지 않는다. done 이면 `resultLine` + [닫기] → `onClose()`.
  - 버튼은 이벤트 위임(창 루트 하나에 `click`), `data-act`·`data-inc` 로 구분.
  - 모든 문자열은 `t()` 를 거친다(영어 모드의 MutationObserver 에 기대지 않음).

- [ ] **Step 5: 통과 확인** — Run: `node --test tests/auction-ui.test.mjs` · Expected: PASS(4 tests)

- [ ] **Step 6: Commit**

```bash
git add js/auction/ui.js tests/auction-ui.test.mjs
git commit -m "feat: add auction panel ui"
```

---

### Task 9: 게임에 연결

**Files:**
- Create: `js/auction/index.js`
- Modify: `js/game.js` — import(광장 import :69 근처), `$w` 게터(:315 블록), gameState 기본값(`plaza: plazaDefault(),` :1103 다음), applySave(`restorePlaza` :3025 다음), buildWorld(`initPlaza();` :3353 다음), 나무 흩뿌리기(`|| plazaScatterBlocks(x, z)` :3343 다음), outdoorMesh(:5610 첫 줄 다음), 매 프레임(`updatePlaza(` :6349 다음), handleAction(`plazaSpotNow()` :7520 다음), 상호작용 가드(:7679)
- Modify: `js/spaces/doors.js` — 안내 사슬(광장 분기 앞, ~:395-470)
- Modify: `js/spaces/kitchen-stage.js:454` — `updateMgScene` 분기
- Modify: `.claude/launch.json` — 워크트리 서버 항목
- Test: `tests/auction-wiring.test.mjs`

**Interfaces:**
- Consumes: Task 1~8, game.js 내보내기 `scene, camera, gameState, player, $w, ui, IS_MOBILE, requestSave, refreshInventoryUI, refreshHeldTool, todayStr, nightLevel, solidCircle, obstacles, snapCamera, npcObjs`, js/spaces/npc.js `buildNPCFigure, setNpcHidden`, js/spaces/doors.js `inVillage2`, `NPCS`, `trackEvent`(js/analytics.js), `logEcon`(js/metrics.js), `t`(js/i18n.js), `DAY_SPEED`(js/data/world.js)
- Produces(game.js 가 부름): `initAuction()`, `updateAuction(dt, inVillage)`, `auctionSpotNow()→bool`, `auctionPrompt()→string`, `openAuction()`, `auctionScatterBlocks(x,z)→bool`, `updateAuctionScene(dt,t)`, `auctionOutdoorMesh(id)→Group|null`, 재수출 `auctionDefault`, `restoreAuction`

- [ ] **Step 1: 실패하는 연결 테스트 `tests/auction-wiring.test.mjs`** (`tests/plaza-wiring.test.mjs` 방식)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const game = readFileSync('js/game.js', 'utf8');
const doors = readFileSync('js/spaces/doors.js', 'utf8');
const ks = readFileSync('js/spaces/kitchen-stage.js', 'utf8');

test('game.js only wires the auction module', () => {
  const lines = game.split('\n').filter(l => /auction|Auction/.test(l));
  assert.ok(lines.length <= 12, lines.join('\n'));
  assert.doesNotMatch(game, /function \w*[Aa]uction\w*\s*\(/);
  for (const k of ['initAuction()', 'updateAuction(', 'auctionSpotNow()', 'openAuction()', 'auctionScatterBlocks(', 'auctionOutdoorMesh(', 'restoreAuction(saved.auction)', 'auction: auctionDefault()']) assert.ok(game.includes(k), k);
  assert.match(game, /get playerArms\(\)/);
});

test('doors shows the auction prompt and the minigame loop dispatches the auction', () => {
  assert.match(doors, /auctionSpotNow\(\)/);
  assert.match(doors, /auctionPrompt\(\)/);
  assert.match(ks, /mgView\.type === 'auction'/);
});

test('auction modules stay out of game.js internals', () => {
  for (const f of ['rules', 'engine', 'settle', 'scene', 'items', 'stage', 'actors', 'ui']) {
    assert.doesNotMatch(readFileSync(`js/auction/${f}.js`, 'utf8'), /from '\.\.\/game\.js'/, f);
  }
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/auction-wiring.test.mjs` · Expected: FAIL

- [ ] **Step 3: `js/auction/index.js` 구현** — game.js 의존은 이 파일에만 둔다(순환 import, 값은 함수 안에서만 읽음 — js/spaces/light-workshop.js:3 과 같은 규칙).
  - `initAuction()`: `stage = buildAuctionStage(THREE)`, `stage.group.position.set(AUCTION_STAGE.x, 0, AUCTION_STAGE.z)`, `scene.add`. 충돌: 무대 앞면 따라 `solidCircle(X + dx, Z, 0.95)` 를 `dx ∈ {-2.4, -0.8, 0.8, 2.4}`, 연단 `solidCircle(X + 1.75, Z + 0.5, 0.6)`, 등불 기둥 `solidCircle(X ± 6.4, Z + 4.0, 0.25)`. `obstacles.push({ x: X, z: Z, r: AUCTION_STAGE_R })`. 오늘 경매품 `stage.setItem(lotFor(todayStr()).id)`.
  - `updateAuction(dt, inVillage)`: `stage.group.visible = inVillage`, `stage.setNight(nightLevel)`, 받침대 경매품의 `userData.spin` 이 있으면 `rotation.y += dt * 0.8`. 날짜가 바뀌면(`todayStr()` 비교) 받침대 경매품 교체.
  - `auctionSpotNow()`: `inVillage2() && !$w.mgView && Math.hypot(player.position.x - X, player.position.z - (Z + 3.2)) < 2.4`.
  - `auctionPrompt()`: `joinMode({ t: gameState.timeOfDay, day: todayStr(), lastDate: gameState.auction.lastDate, coins: gameState.inventory.coins || 0, start: lotFor(todayStr()).start })` → closed `'🔨 해가 지면 열려요'`, done `'🔨 내일 저녁에 또 열려요'`, 그 밖 `'🔨 저녁 경매'`(Task 0 확정본).
  - `openAuction()`: `lot = lotFor(day)`, `mode = joinMode(...)`, `trackEvent('auction_open', { item_id: lot.id, coins })`, `panel.open({ mode, itemId: lot.id, appraisal: lot.appraisal, start: lot.start, coins, secondsToOpen: secondsUntilOpen(gameState.timeOfDay, DAY_SPEED) })`.
  - `onJoin(mode)`:
    1. 플레이어를 무대 기준 `AUCTION_SPOTS.me` 로 옮기고 `player.rotation.y = faceStage(...)`.
    2. 든 도구 숨김: `$w.playerArms.R.hand.children.forEach(c => { c.visible = false; })`. `actors.attachPlayer($w.playerArms)`.
    3. 실제 주민 숨김: `npcObjs` 중 id ∈ {merchant, curator, stargazer, builder} 를 `{ o, was: !!o.hidden }` 로 기억하고 `setNpcHidden(o, true)`.
    4. `actors = createActors(THREE, { buildFigure: buildNPCFigure, npcDefs: NPCS, parent: stage.group })`.
    5. `$w.mgView = { type: 'auction' }`(메인 루프가 `updatePlayer`·`handleAction` 을 멈춤, game.js:6240·6247).
    6. `run = createAuctionScene(deps)` → `run.begin(mode)`.
    - deps: `getCoins: () => gameState.inventory.coins || 0`, `setCoins: c => { gameState.inventory.coins = c; }`, `getStored: () => gameState.outdoorStored || {}`, `setStored: s => { gameState.outdoorStored = s; }`, `getAuction/setAuction` → `gameState.auction`, `day: todayStr`, `now: () => performance.now() / 1000`, `rng: Math.random`, `onUi: s => panel.render(s)`, `onDone: () => refreshInventoryUI()`, `track: trackEvent`, `econ: logEcon`, `save: requestSave`.
  - `onClose()`: `$w.mgView = null` → `actors.detachPlayer()` → 손 자식 `visible = true` → `refreshHeldTool()` → 주민 `setNpcHidden(o, was)` 로 되돌림 → `actors.dispose()` → `stage.focus(-1.25, -0.05)` → `snapCamera()` → `panel.close()`.
  - `updateAuctionScene(dt, t)`: `run.update(dt, t)` + 카메라. 목표(무대 기준): PC 위치 `(0.2, 6.6, 9.2)`·보는 곳 `(0, 1.1, 1.8)`, 모바일(`IS_MOBILE`) 위치 `(0.1, 9.8, 14.3)`·보는 곳 `(0, 0.9, 2.0)`. 현재 카메라에서 `k = 1 - Math.exp(-dt * 2.6)` 로 lerp, `camera.lookAt`. (시안 AUC 값을 무대 기준으로 옮긴 것.)
  - `auctionScatterBlocks(x, z)`: `Math.hypot(x - X, z - (Z + 2)) < AUCTION_STAGE_R + 3.5`.
  - `auctionOutdoorMesh(id)`: `auctionItemMesh(THREE, id)`.
  - 썸네일 `itemThumb(id)`: 첫 요청 때 128px `new THREE.WebGLRenderer({ alpha: true, preserveDrawingBuffer: true })` 로 한 번 그려 dataURL 캐시 후 `dispose(); forceContextLoss()`.
  - 이름표 `names`: `{ curator: '큐레이터', stargazer: '별 보는 아이', builder: '목수 아저씨' }`(Task 0 확정본, 실제 NPC 이름 `큐레이터 할아버지` 와 다르게 짧게 쓸지 Task 0 에서 함께 묻는다).

- [ ] **Step 4: game.js 연결** (모두 한 줄씩)

```js
import { initAuction, updateAuction, auctionSpotNow, openAuction, auctionScatterBlocks, updateAuctionScene, auctionOutdoorMesh, auctionDefault, restoreAuction } from './auction/index.js';
```
  - `$w` 블록: `get playerArms() { return playerArms; },`
  - gameState: `auction: auctionDefault(),`
  - applySave: `gameState.auction = restoreAuction(saved.auction);`
  - buildWorld: `initAuction();`
  - 나무 조건: `|| auctionScatterBlocks(x, z)`
  - outdoorMesh: `{ const m = auctionOutdoorMesh(id); if (m) return m; }`
  - 매 프레임: `updateAuction(dt, inVillage2());`
  - handleAction: `if (auctionSpotNow()) return openAuction();`
  - 가드(:7679 `|| !!plazaSpotNow()` 옆): `|| auctionSpotNow()`

  `updateAuctionScene` 은 game.js 가 아니라 kitchen-stage.js 가 import 한다. game.js import 줄에서 빼도 된다(줄 수 상한 안).

  `js/spaces/kitchen-stage.js` `updateMgScene` 첫 분기 바로 아래: `if (mgView.type === 'auction') { updateAuctionScene(dt, t); return; }` + 상단 `import { updateAuctionScene } from '../auction/index.js';`

  `js/spaces/doors.js` 안내 사슬, 광장 분기 바로 앞: `else if (auctionSpotNow()) prompt = auctionPrompt();` + 상단 import.

- [ ] **Step 5: 통과 확인** — Run: `node --test tests/auction-wiring.test.mjs && npm test` · Expected: 전부 PASS. `tests/plaza-wiring.test.mjs`(광장 줄 상한 14) 도 그대로 통과해야 한다.

- [ ] **Step 6: 실행 확인** — `.claude/launch.json` 에 `{"name": "evening-auction", "runtimeExecutable": "python3", "runtimeArgs": ["/Users/uicheol_hwang/calm_forest/.claude/worktrees/evening-auction/scripts/serve.py", "8863"], "port": 8863}`(워크트리를 `.claude/worktrees/evening-auction` 에 만든다는 전제) 추가 → `preview_start({name:'evening-auction'})` → `?time=0.8` 접속:
  1. 무대가 광장 동쪽에 보이고 등불이 켜짐
  2. 무대 앞 안내 → 창 → 참가 → 카메라 이동 → 주민 팻말·망치·종 → 낙찰 → 보관함 1개 → 작업대 야외 탭에서 꺼내 마당에 놓임
  3. 다시 무대 앞: "내일 저녁에 또" 안내, 창은 done
  4. 낮(`?time=0.4`): "해가 지면 열려요", 창에 남은 분
  5. 코인 100 계정(dev 콘솔로 `gameState.inventory.coins = 100`): 구경하기만
  6. `read_console_messages` 오류 0
  7. 이어서 Task 5 Step 5(자리 잡기 사용자 게이트)

- [ ] **Step 7: Commit**

```bash
git add js/auction/index.js js/game.js js/spaces/doors.js js/spaces/kitchen-stage.js tests/auction-wiring.test.mjs .claude/launch.json
git commit -m "feat: wire evening auction into the village"
```

---

### Task 10: 측정·영어·실측·리뷰

**Files:**
- Modify: `docs/analysis/event-taxonomy.csv`
- Modify: `js/i18n-en.js`
- Test: `tests/auction-i18n.test.mjs`

- [ ] **Step 1: 이벤트 3행** — `docs/analysis/event-taxonomy.csv` 끝에

```csv
auction_open,economy,evening_auction,2,N,not_fired,0,0,,,item_id|coins,js/auction/index.js,경매 무대 창을 열었을 때,
auction_join,economy,evening_auction,2,N,not_fired,0,0,,,item_id|mode|coins,js/auction/scene.js,참가하기·구경하기를 눌렀을 때,
auction_result,economy,evening_auction,2,N,not_fired,0,0,,,item_id|outcome|price|my_bids|run_id,js/auction/scene.js,한 판이 끝났을 때(낙찰·패찰·유찰·구경),
```

  Run: `node --test tests/event-taxonomy.test.mjs` · Expected: PASS

- [ ] **Step 2: 영어 실패 테스트 `tests/auction-i18n.test.mjs`** (`tests/aura-i18n.test.mjs` 방식, STRINGS 는 Task 0 확정본)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.location = { search: '?lang=en', hostname: 'localhost', pathname: '/' };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { t, setLang } = await import('../js/i18n.js');
setLang('en');

const STRINGS = [
  '🔨 저녁 경매', '🔨 해가 지면 열려요', '🔨 내일 저녁에 또 열려요', '방랑 상인이 경매를 열었어요',
  '🙋 참가하기', '👀 구경하기', '먼저 불러 보세요', '🙋 내가 제일 높아요', '⏱️ 다시 4초!',
  '하나…', '하나… 둘…', '하나… 둘… 셋!', '🧺 보관함에 넣었어요', '아무도 안 불렀어요', '닫기', '🙋 나',
  '달빛 그네', '등불 아치', '별 풍향계', '큐레이터', '별 보는 아이', '목수 아저씨',
  '{0}가 제일 높아요', '{0}가 가져갔어요', '낙찰! {0}를 가져왔어요', '🪙{0}부터 부를 수 있어요',
  '저녁 경매에서 낙찰받은 달빛 그네', '저녁 경매에서 낙찰받은 등불 아치', '저녁 경매에서 낙찰받은 별 풍향계',
];

test('every auction string has an English translation', () => {
  for (const s of STRINGS) assert.doesNotMatch(t(s), /[가-힣]/, s);
});
```

  Run → FAIL → `js/i18n-en.js` 의 `EN` 객체에 키 추가(Task 0 표 영어 열, 주석 없이) → Run → PASS.

- [ ] **Step 3: 전체 테스트** — Run: `npm test` · Expected: 전부 PASS

- [ ] **Step 4: 실측(사용자에게 캡처로 보고)** — 메모리 mobile-hud-layout·game-capture-pitfall 절차
  - 375×812·320×568 세로: 아래 창이 무대·주민·팻말을 가리지 않음, 가장 긴 문구 한 줄, `mg-open` 으로 조이스틱·도구바 숨김 확인
  - 가로 폰: 창이 화면을 다 덮지 않음
  - PC 1280×800: 오른쪽 창과 무대가 안 겹침
  - 밤(`?time=0.9`): 등불이 하얗게 날아가지 않음 — 블룸 켬, 그리고 `applyQualityStep(2)`(블룸 끔) 둘 다
  - 드로우콜: 무대 앞/광장 서쪽에서 `renderer.info.render.calls` 비교 보고. 무대 때문에 +60 이상이면 등불을 `InstancedMesh` 로 합치는 수정을 이 Task 안에서 한다
  - 카메라 목표값(Task 9 Step 3)을 이 실측으로 조정

- [ ] **Step 5: 코드 리뷰** — `code-reviewer` 에이전트로 `git diff main...HEAD` 리뷰 → CRITICAL·HIGH 수정 → `npm test`

- [ ] **Step 6: Commit**

```bash
git add docs/analysis/event-taxonomy.csv js/i18n-en.js tests/auction-i18n.test.mjs
git commit -m "feat: add auction tracking rows and english strings"
```

---

### Task 11: 병합·배포 (사용자 승인 후에만)

- [ ] **Step 1:** 사용자에게 병합·배포 여부를 묻는다. "커밋만"이면 여기서 멈춘다(메모리 commit-only-means-no-push).
- [ ] **Step 2:** main 병합 → 푸시 전 키 스캔(메모리 push-secret-scan) → main + `feat/capacitor-app` 푸시.
- [ ] **Step 3:** 메모리 deploy-checklist 순서: 웹(`npx wrangler deploy`) · 토스(`bundle_upload` memo 필수) · itch(`npm run build:itch`) · Play(internal 후 alpha+production 한 edit) · iOS. 결과를 그대로 보고.
- [ ] **Step 4:** 다음 날 BigQuery 에서 `auction_open/join/result` 행, Supabase `econ_logs` 에 `source='auction_win'` 행 확인(메모리 feature-tracking-checklist).

---

## 알려진 위험과 대응

| 위험 | 대응 |
|---|---|
| 코인은 서버 검증이 없다(클라 권위, 산장 카페·광장과 같음) | 이번 범위에서 서버 가드는 만들지 않는다. 경매품은 프리미엄·추천 보상이 아니라 `_reward_decor_ids` 대상 아님. 참가 기록을 판 시작 전에 저장해 새로고침 재도전을 막는다 |
| 게임 하루가 약 8.3분이라 "저녁"이 자주 온다 | 참가는 **실제 날짜** 하루 한 번(`lastDate = todayStr()`). 저녁 창(0.72~0.96, 약 2분)은 분위기와 "저녁에 열린다"는 약속용 |
| 큐레이터는 박물관 섬, 별 보는 아이·목수는 마을 다른 곳에 산다 | 경매 중에만 무대 앞에 같은 모양 인형(`buildNPCFigure`)을 세우고 실제 주민은 숨긴다. 끝나면 원래 숨김 상태로 되돌린다(잠금 해제 전 주민 포함) |
| 든 도구·팔 자세 꼬임 | 경매 중엔 `updatePlayer` 가 안 돌아 팔을 경매가 쥔다. 끝날 때 `refreshHeldTool()`. 스윙 모션 코드는 건드리지 않는다(메모리 no-swing-motion-change) |
| 등불 블룸 번짐 | 발광 0.6 상한 테스트 + Task 10 밤 실측(블룸 켬/끔) |
| 모바일 드로우콜 | 메시 상한 테스트(무대 ≤140, 경매품 ≤16) + Task 10 실측. 넘치면 등불 InstancedMesh |
| 시안의 PointLight·SpotLight 분위기가 게임에선 안 난다 | 영구 조명 없이 발광·원뿔·바닥 원판으로 대신한다. Task 10 밤 캡처를 시안 캡처와 나란히 보여 차이를 사용자가 판단 |
