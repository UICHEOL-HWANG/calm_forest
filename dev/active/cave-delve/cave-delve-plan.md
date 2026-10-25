# ⛏️ 동굴 탐험(지하 20층) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 지금 동굴을 0층으로 두고 지하 1~20층 탐험, 순한 방해꾼 4종, ⛏️ 광부 아저씨 별도 퀘스트 트랙을 붙인다.

**Architecture:** 규칙은 DOM·Three 의존 없는 순수 모듈(`js/delve/rules.js`, `js/delve/pests.js`)에 두고 노드 테스트로 잠근다. 3D·입력·HUD 연결은 `js/spaces/delve.js` 한 곳에 모으고, `js/game.js`·`index.html`·`js/spaces/doors.js`에는 몇 줄짜리 연결만 넣는다. 지하 층은 0층과 같은 "동굴 안"(`atMine === true`)으로 취급해 날씨·비·흔적 같은 기존 실내 분기를 그대로 탄다.

**Tech Stack:** 바닐라 ES 모듈, Three.js 0.160(importmap), `node --test`(tests/*.test.mjs), GA4 `trackEvent`(js/analytics.js).

**Spec:** `docs/superpowers/specs/2026-10-25-cave-delve-design.md`

## Global Constraints

- 새 코드는 `js/game.js`에 몰지 않는다. 새 파일: `js/data/delve.js`, `js/delve/*.js`, `js/spaces/delve.js`.
- 새 코드·CSS·테스트에 주석을 넣지 않는다(사용자 규칙). 설명은 커밋 메시지·dev docs로.
- 게임 화면 문구에 엠대시(—) 금지. 끊을 땐 마침표, 제목 구분은 "·".
- 월드 머리 위 말풍선은 이모지만. 글자 안내는 배너(컨텍스트 슬롯)·프롬프트 줄에만.
- 첫 만남 배너 한 줄은 16자 이내(폰 375px 한 줄), 프롬프트는 8자 이내.
- 광부 라인은 `story.q`를 올리지 않고, 광부 목표에 기존 퀘스트 타입을 쓰지 않는다(광석 획득 시 `questEvent('mine')`은 일일 의뢰용으로 그대로).
- 가방(`inventory`)은 방해꾼이 절대 건드리지 않는다.
- GA4 이벤트당 파라미터 ≤ 5.
- 지하 층 광맥 2개, 광맥당 광석 1개 고정, 광석은 그날 처음 간 층에서만. 보석 1~10층 4→8%(안개 날만), 11~20층 10→18%(날씨 무관). 수정 11층+ 10%, 판매가 25.
- 🚨 저장 칸·새 꾸미기 id 추가 → 웹·토스·Play·itch 4곳 동시 배포(+iOS 같은 날 심사). 이 계획은 배포를 하지 않는다.
- 브랜치: `analytics/metrics-framework`가 아니라 `origin/main`에서 `feat/cave-delve` 워크트리(Task 0).

## File Structure

| 파일 | 책임 | 새로/수정 |
|---|---|---|
| `js/data/delve.js` | 값 표: 층 수·정류장·방 크기·광맥 수·광석 확률·방해꾼 4종·광부 8단계·문구 | 새로 |
| `js/delve/rules.js` | 순수: 시드·RNG, 층 테마, 층 배치, 사다리 보장, 광석 굴리기, 하루 첫 방문, 정류장, 저장 정리, 광부 단계, 하루 일감 | 새로 |
| `js/delve/pests.js` | 순수: 방해꾼 상태 기계, 대응 판정 | 새로 |
| `js/delve/pest-art.js` | 방해꾼 조형(`sims/cave-pest-art.mjs` 이전) + 굴·웅덩이·빛자국·노란 원·갱도·사다리·바위·승강기 | 새로 |
| `js/delve/miner.js` | 광부 조형·퀘스트 카드 뷰·시작 조건 | 새로 |
| `js/spaces/delve.js` | 3D 방 생성·정리, 승강기·사다리, 층 이동, 채굴, 조각 줍기, 방해꾼 갱신, 안내, 상자, 트래킹 | 새로 |
| `js/data/places.js` | `DELVE` 좌표 | 수정 |
| `js/data/dex.js` · `js/data/catalog.js` | 수정(광물)·판매가 | 수정 |
| `js/game.js` | 인벤 기본값·`gameState.delve`·복원·이동 제한·문 동작·괭이 분기·갱신 루프·공간 표시·`RES_LABEL`·export | 수정(연결만) |
| `js/spaces/mine.js` · `js/spaces/doors.js` · `js/spaces/npc.js` | 0층 광맥 표시·승강기/광부 배치·자동 시작 · 프롬프트 · 패널 카드 | 수정 |
| `index.html` | 액션 아이콘(❗⛏️🍄🛗🪜) | 수정 |
| `js/i18n-en.js` | 새 문구 영어 | 수정 |
| `tests/delve-rules.test.mjs` · `tests/delve-pests.test.mjs` · `tests/delve-wiring.test.mjs` | 테스트 | 새로 |

---

### Task 0: 작업 공간

**Files:** 없음(브랜치·워크트리)

- [ ] **Step 1: main 최신화 후 워크트리 생성**

```bash
cd "$REPO_ROOT"
git fetch origin
git worktree add -b feat/cave-delve .claude/worktrees/cave-delve origin/main
cd .claude/worktrees/cave-delve && npm ci
```

- [ ] **Step 2: 설계 산출물 복사(루트 체크아웃에만 있는 미추적 파일)**

```bash
SRC="$REPO_ROOT"
mkdir -p dev/active/cave-delve docs/superpowers/specs
cp -R $SRC/dev/active/cave-delve/. dev/active/cave-delve/
cp $SRC/docs/superpowers/specs/2026-10-25-cave-delve-design.md docs/superpowers/specs/
cp $SRC/sims/cave-pest-art.mjs $SRC/sims/cave-pest-compare.html $SRC/sims/cave-pest-compare-v2.html $SRC/sims/miner-npc-compare.html sims/
```

- [ ] **Step 3: 기준선 테스트**

Run: `npm test 2>&1 | tail -5`
Expected: 실패 0. 실패가 있으면 수와 이름을 `dev/active/cave-delve/cave-delve-context.md`에 기준선으로 적고 계속.

- [ ] **Step 4: 커밋**

```bash
git add dev/active/cave-delve docs/superpowers/specs/2026-10-25-cave-delve-design.md sims/cave-pest-art.mjs sims/cave-pest-compare.html sims/cave-pest-compare-v2.html sims/miner-npc-compare.html
git commit -m "docs: cave delve spec, mockups and sims"
```

---

### Task 1: 값 표 `js/data/delve.js`

**Files:**
- Create: `js/data/delve.js`
- Test: `tests/delve-rules.test.mjs`(이 태스크에서 생성)

**Interfaces:**
- Produces: `DELVE_FLOORS`, `DELVE_STOPS`, `DELVE_CHEST_FLOORS`, `DELVE_HALF`, `VEINS_PER_FLOOR`, `PLAIN_ROCKS`, `LADDER_PITY`, `LADDER_MIN_FRAC`, `BURROW_MIN_FROM_ARRIVAL`, `CRYSTAL_PRICE`, `ORE_ODDS`, `THEMES`, `PESTS`, `PEST_COPY`, `MINER_STEPS`

- [ ] **Step 1: 실패하는 테스트**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DELVE_FLOORS, DELVE_STOPS, DELVE_CHEST_FLOORS, THEMES, PESTS, MINER_STEPS, PEST_COPY, VEINS_PER_FLOOR } from '../js/data/delve.js';

test('층은 20층, 정류장은 5·10·15·20, 상자는 10·20', () => {
  assert.equal(DELVE_FLOORS, 20);
  assert.deepEqual(DELVE_STOPS, [5, 10, 15, 20]);
  assert.deepEqual(DELVE_CHEST_FLOORS, [10, 20]);
});

test('테마 두 개가 1~20층을 빈틈없이 덮는다', () => {
  const covered = [];
  for (const th of THEMES) for (let f = th.from; f <= th.to; f++) covered.push(f);
  assert.deepEqual(covered, Array.from({ length: 20 }, (_, i) => i + 1));
});

test('방해꾼 4종은 각자 대응이 하나씩이고 테마에 소속된다', () => {
  assert.deepEqual(Object.keys(PESTS).sort(), ['axolotl', 'bat', 'crab', 'grub']);
  assert.deepEqual(Object.values(PESTS).map(p => p.counter).sort(), ['bait', 'grab', 'reclaim', 'tap']);
  for (const th of THEMES) for (const id of th.pests) assert.ok(PESTS[id], id);
});

test('첫 만남 배너 한 줄은 16자 이내, 프롬프트 8자 이내, 엠대시 없음', () => {
  for (const [id, c] of Object.entries(PEST_COPY)) {
    assert.ok([...c.line].length <= 16, `${id}: ${c.line}`);
    assert.ok(!c.line.includes('—') && !c.title.includes('—'), id);
    if (c.prompt) assert.ok([...c.prompt].length <= 8, `${id} prompt`);
  }
});

test('광부 8단계, 판정 종류는 상태형만', () => {
  assert.equal(MINER_STEPS.length, 8);
  for (const s of MINER_STEPS) assert.ok(['inv', 'count', 'floor', 'chest'].includes(s.check.kind), s.id);
});

test('광맥은 층당 2개', () => {
  assert.equal(VEINS_PER_FLOOR, 2);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/delve-rules.test.mjs`
Expected: FAIL `Cannot find module '../js/data/delve.js'`

- [ ] **Step 3: 구현**

```js
export const DELVE_FLOORS = 20;
export const DELVE_STOPS = [5, 10, 15, 20];
export const DELVE_CHEST_FLOORS = [10, 20];
export const DELVE_HALF = 8;
export const VEINS_PER_FLOOR = 2;
export const PLAIN_ROCKS = [4, 6];
export const LADDER_PITY = 5;
export const LADDER_MIN_FRAC = 0.6;
export const BURROW_MIN_FROM_ARRIVAL = 5;
export const CRYSTAL_PRICE = 25;

export const ORE_ODDS = {
  shallowGem: [0.04, 0.08],
  deepGem: [0.10, 0.18],
  crystal: 0.10,
  coalShare: { shallow: 0.45, deep: 0.6 },
};

export const THEMES = [
  { id: 'earth', from: 1, to: 10, pests: ['axolotl', 'crab'], floor: 0x3a3a40, rock: 0x565b66 },
  { id: 'crystal', from: 11, to: 20, pests: ['bat', 'grub'], floor: 0x2c2a3a, rock: 0x4a4660 },
];

export const PESTS = {
  axolotl: { ico: '🦎', name: '동굴 도롱뇽', counter: 'tap', speed: 1.6 },
  crab: { ico: '💎', name: '수정집게', counter: 'bait', speed: 0.9 },
  bat: { ico: '🦇', name: '잎귀박쥐', counter: 'grab', speed: 3.0 },
  grub: { ico: '🐛', name: '등불벌레', counter: 'reclaim', speed: 1.2 },
};

export const PEST_COPY = {
  common: { ico: '⛏️', title: '조각 도둑', line: '가방은 안전해요. 조각만 노려요', prompt: null },
  axolotl: { ico: '🦎', title: '동굴 도롱뇽', line: '웅덩이 아가미를 톡 치면 뱉어요', prompt: '❗ 톡 치기' },
  crab: { ico: '💎', title: '수정집게', line: '먹보예요. 🍄 미끼를 던져요', prompt: '🍄 미끼 던지기' },
  bat: { ico: '🦇', title: '잎귀박쥐', line: '반짝이면 툭! 조각은 바로 주워요', prompt: null },
  grub: { ico: '🐛', title: '등불벌레', line: '놓쳐도 OK. 빛 자국 끝 굴로', prompt: '⛏️ 굴 파기' },
};

export const MINER_STEPS = [
  { id: 'reopen', title: '갱도 다시 열기', desc: '⚫ 석탄 3개 가져다주기', check: { kind: 'inv', key: 'coal', n: 3, take: true }, reward: { unlock: 1 } },
  { id: 'tap', title: '웅덩이 속 도둑', desc: '🦎 웅덩이 아가미 톡 치기', check: { kind: 'count', key: 'tap', n: 1 }, reward: { gem: 1 } },
  { id: 'stop5', title: '첫 정류장', desc: '🪜 지하 5층까지 내려가기', check: { kind: 'floor', n: 5 }, reward: {} },
  { id: 'bait', title: '먹보 달래기', desc: '🍄 수정집게에게 미끼 던지기', check: { kind: 'count', key: 'bait', n: 1 }, reward: { forage: 3 } },
  { id: 'chest10', title: '10층 보물상자', desc: '🧰 지하 10층 상자 열기', check: { kind: 'chest', n: 10 }, reward: { cosmetic: 'miner_lamp' } },
  { id: 'grab', title: '반짝이 사수', desc: '🦇 박쥐 앞에서 조각 바로 줍기 3번', check: { kind: 'count', key: 'grab', n: 3 }, reward: { crystal: 2 } },
  { id: 'reclaim', title: '빛을 따라', desc: '🐛 굴에서 조각 되찾기', check: { kind: 'count', key: 'reclaim', n: 1 }, reward: {} },
  { id: 'bottom', title: '바닥까지', desc: '🪜 지하 20층까지 내려가기', check: { kind: 'floor', n: 20 }, reward: { decor: 'mine_cart' } },
];
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/delve-rules.test.mjs`
Expected: PASS 6

- [ ] **Step 5: 커밋**

```bash
git add js/data/delve.js tests/delve-rules.test.mjs
git commit -m "feat(delve): data tables for floors, pests, miner steps"
```

---

### Task 2: 순수 규칙 1 · 시드·테마·광석 `js/delve/rules.js`

**Files:**
- Create: `js/delve/rules.js`
- Test: `tests/delve-rules.test.mjs`(추가)

**Interfaces:**
- Consumes: Task 1 값 표
- Produces:
  - `hashSeed(str: string): number`(uint32)
  - `makeRng(seed: number): () => number`(0 이상 1 미만)
  - `floorSeed(date: string, floor: number, visit: number): number`
  - `themeOf(floor: number): {id, from, to, pests, floor, rock}`
  - `oreOdds(floor: number, weather: string): Array<[id, p]>`(id: 'gem'|'crystal'|'coal'|'stone')
  - `rollOre(rng, odds): string`

- [ ] **Step 1: 실패하는 테스트(파일 끝에 추가)**

```js
import { hashSeed, makeRng, floorSeed, themeOf, oreOdds, rollOre } from '../js/delve/rules.js';

test('같은 날짜·층·입장 횟수면 같은 시드, 하나라도 다르면 다른 시드', () => {
  assert.equal(floorSeed('2026-10-25', 3, 0), floorSeed('2026-10-25', 3, 0));
  assert.notEqual(floorSeed('2026-10-25', 3, 0), floorSeed('2026-10-25', 4, 0));
  assert.notEqual(floorSeed('2026-10-25', 3, 0), floorSeed('2026-10-25', 3, 1));
  assert.notEqual(floorSeed('2026-10-25', 3, 0), floorSeed('2026-10-26', 3, 0));
});

test('RNG 는 0 이상 1 미만, 같은 시드면 같은 수열', () => {
  const a = makeRng(42), b = makeRng(42);
  for (let i = 0; i < 100; i++) { const x = a(); assert.ok(x >= 0 && x < 1); assert.equal(x, b()); }
});

test('테마: 1·10층은 흙, 11·20층은 수정', () => {
  assert.equal(themeOf(1).id, 'earth');
  assert.equal(themeOf(10).id, 'earth');
  assert.equal(themeOf(11).id, 'crystal');
  assert.equal(themeOf(20).id, 'crystal');
});

const pOf = (odds, id) => odds.find(([k]) => k === id)[1];

test('광석 확률 합은 1', () => {
  for (const f of [1, 5, 10, 11, 15, 20]) for (const w of ['clear', 'fog', 'rain']) {
    const sum = oreOdds(f, w).reduce((s, [, p]) => s + p, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9, `${f} ${w} ${sum}`);
  }
});

test('1~10층 보석은 안개 날에만, 4%→8%, 수정 없음', () => {
  assert.equal(pOf(oreOdds(1, 'clear'), 'gem'), 0);
  assert.ok(Math.abs(pOf(oreOdds(1, 'fog'), 'gem') - 0.04) < 1e-9);
  assert.ok(Math.abs(pOf(oreOdds(10, 'fog'), 'gem') - 0.08) < 1e-9);
  assert.equal(pOf(oreOdds(5, 'fog'), 'crystal'), 0);
});

test('11~20층 보석은 날씨 무관 10%→18%, 수정 10%', () => {
  assert.ok(Math.abs(pOf(oreOdds(11, 'clear'), 'gem') - 0.10) < 1e-9);
  assert.ok(Math.abs(pOf(oreOdds(20, 'rain'), 'gem') - 0.18) < 1e-9);
  assert.ok(Math.abs(pOf(oreOdds(15, 'clear'), 'crystal') - 0.10) < 1e-9);
});

test('rollOre 는 확률표의 키만 돌려준다', () => {
  const rng = makeRng(7), odds = oreOdds(15, 'clear'), seen = new Set();
  for (let i = 0; i < 2000; i++) seen.add(rollOre(rng, odds));
  assert.deepEqual([...seen].sort(), ['coal', 'crystal', 'gem', 'stone']);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/delve-rules.test.mjs`
Expected: FAIL `Cannot find module '../js/delve/rules.js'`

- [ ] **Step 3: 구현**

```js
import { THEMES, ORE_ODDS } from '../data/delve.js';

export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

export function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function floorSeed(date, floor, visit) {
  return hashSeed(`delve:${date}:${floor}:${visit}`);
}

export function themeOf(floor) {
  return THEMES.find(t => floor >= t.from && floor <= t.to) || THEMES[0];
}

export function oreOdds(floor, weather) {
  const deep = floor > 10;
  const k = deep ? (floor - 11) / 9 : (floor - 1) / 9;
  const [g0, g1] = deep ? ORE_ODDS.deepGem : ORE_ODDS.shallowGem;
  const gem = deep || weather === 'fog' ? g0 + (g1 - g0) * k : 0;
  const crystal = deep ? ORE_ODDS.crystal : 0;
  const rest = 1 - gem - crystal;
  const coal = rest * (deep ? ORE_ODDS.coalShare.deep : ORE_ODDS.coalShare.shallow);
  return [['gem', gem], ['crystal', crystal], ['coal', coal], ['stone', rest - coal]];
}

export function rollOre(rng, odds) {
  let x = rng();
  for (const [id, p] of odds) { if ((x -= p) < 0) return id; }
  return 'stone';
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/delve-rules.test.mjs`
Expected: PASS 13

- [ ] **Step 5: 커밋**

```bash
git add js/delve/rules.js tests/delve-rules.test.mjs
git commit -m "feat(delve): seeded rng, floor themes and ore odds"
```

---

### Task 3: 순수 규칙 2 · 층 배치와 사다리 보장

**Files:**
- Modify: `js/delve/rules.js`
- Test: `tests/delve-rules.test.mjs`(추가)

**Interfaces:**
- Consumes: `makeRng`, `themeOf`, 값 표
- Produces:
  - `dist(a: {x,z}, b: {x,z}): number`
  - `layoutFloor({ seed, floor, half? }): { arrival, rocks: Array<{x,z,vein}>, ladderAt, ladderRock: number, burrows: Array<{x,z}>, puddles: Array<{x,z}>, pests: string[] }`(좌표는 방 중심 기준 로컬)
  - `ladderRevealed({ broken: number, hitLadderRock: boolean }): boolean`

- [ ] **Step 1: 실패하는 테스트**

```js
import { layoutFloor, ladderRevealed, dist } from '../js/delve/rules.js';
import { DELVE_HALF, PLAIN_ROCKS, LADDER_MIN_FRAC, BURROW_MIN_FROM_ARRIVAL, LADDER_PITY } from '../js/data/delve.js';

const SEEDS = Array.from({ length: 300 }, (_, i) => 1000 + i * 7919);
const DIAG = DELVE_HALF * 2 * Math.SQRT2;

test('도착점은 남쪽 가장자리', () => {
  for (const seed of SEEDS) assert.ok(layoutFloor({ seed, floor: 3 }).arrival.z < -DELVE_HALF + 2.5, `${seed}`);
});

test('내려가는 곳은 도착점 반대편 절반, 대각선의 60% 이상 떨어진다', () => {
  for (const seed of SEEDS) for (const floor of [1, 12]) {
    const L = layoutFloor({ seed, floor });
    assert.ok(L.ladderAt.z > 0, `${seed} z=${L.ladderAt.z}`);
    assert.ok(dist(L.arrival, L.ladderAt) >= DIAG * LADDER_MIN_FRAC - 1e-9, `${seed} d=${dist(L.arrival, L.ladderAt)}`);
  }
});

test('광맥 2개 + 빈 바위 4~6개, 사다리는 빈 바위 하나 밑', () => {
  for (const seed of SEEDS) {
    const L = layoutFloor({ seed, floor: 5 });
    const veins = L.rocks.filter(r => r.vein).length, plain = L.rocks.length - veins;
    assert.equal(veins, 2);
    assert.ok(plain >= PLAIN_ROCKS[0] && plain <= PLAIN_ROCKS[1], `${seed} plain=${plain}`);
    assert.equal(L.rocks[L.ladderRock].vein, false);
    assert.deepEqual({ x: L.rocks[L.ladderRock].x, z: L.rocks[L.ladderRock].z }, L.ladderAt);
  }
});

test('바위끼리 1.4 이상 떨어지고 방 안에 있다', () => {
  for (const seed of SEEDS) {
    const L = layoutFloor({ seed, floor: 8 });
    for (const r of L.rocks) assert.ok(Math.abs(r.x) <= DELVE_HALF - 1 && Math.abs(r.z) <= DELVE_HALF - 1);
    for (let i = 0; i < L.rocks.length; i++) for (let j = i + 1; j < L.rocks.length; j++) assert.ok(dist(L.rocks[i], L.rocks[j]) >= 1.4 - 1e-9);
  }
});

test('방해꾼 굴은 도착점 근처에 없다', () => {
  for (const seed of SEEDS) {
    const L = layoutFloor({ seed, floor: 14 });
    for (const b of L.burrows) assert.ok(dist(b, L.arrival) >= BURROW_MIN_FROM_ARRIVAL, `${seed}`);
  }
});

test('방해꾼은 그 층 테마 소속, 도롱뇽이 있으면 웅덩이가 있다, 방해꾼마다 굴', () => {
  for (const seed of SEEDS.slice(0, 50)) {
    const a = layoutFloor({ seed, floor: 4 }), b = layoutFloor({ seed, floor: 16 });
    for (const p of a.pests) assert.ok(['axolotl', 'crab'].includes(p));
    for (const p of b.pests) assert.ok(['bat', 'grub'].includes(p));
    if (a.pests.includes('axolotl')) assert.ok(a.puddles.length >= 1, `${seed}`);
    assert.equal(a.burrows.length, a.pests.length, `${seed}`);
  }
});

test('같은 시드면 같은 배치', () => {
  assert.deepEqual(layoutFloor({ seed: 99, floor: 7 }), layoutFloor({ seed: 99, floor: 7 }));
});

test('사다리: 그 바위를 깨면 바로, 아니어도 5번째에는 반드시', () => {
  assert.equal(ladderRevealed({ broken: 1, hitLadderRock: true }), true);
  assert.equal(ladderRevealed({ broken: LADDER_PITY - 1, hitLadderRock: false }), false);
  assert.equal(ladderRevealed({ broken: LADDER_PITY, hitLadderRock: false }), true);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/delve-rules.test.mjs`
Expected: FAIL(`layoutFloor` import 오류)

- [ ] **Step 3: 구현(`js/delve/rules.js`; 맨 위 import를 아래로 교체하고 함수 추가)**

```js
import { THEMES, ORE_ODDS, DELVE_HALF, VEINS_PER_FLOOR, PLAIN_ROCKS, LADDER_PITY, LADDER_MIN_FRAC, BURROW_MIN_FROM_ARRIVAL } from '../data/delve.js';
```

```js
export function dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }

const pick = (rng, lo, hi) => lo + rng() * (hi - lo);

function placeFree(rng, taken, ok, half, gap = 1.4, tries = 400) {
  const lim = half - 1;
  for (let i = 0; i < tries; i++) {
    const p = { x: +pick(rng, -lim, lim).toFixed(2), z: +pick(rng, -lim, lim).toFixed(2) };
    if (taken.every(t => dist(t, p) >= gap) && ok(p)) return p;
  }
  return null;
}

export function layoutFloor({ seed, floor, half = DELVE_HALF }) {
  const rng = makeRng(seed);
  const lim = half - 1;
  const arrival = { x: +pick(rng, -half / 2, half / 2).toFixed(2), z: -half + 1.5 };
  const minLadder = half * 2 * Math.SQRT2 * LADDER_MIN_FRAC;
  const ladderAt = placeFree(rng, [arrival], p => p.z > 0 && dist(p, arrival) >= minLadder, half) || { x: arrival.x <= 0 ? lim : -lim, z: lim };
  const rocks = [{ ...ladderAt, vein: false }];
  const away = p => dist(p, arrival) >= 2.5;
  for (let v = 0; v < VEINS_PER_FLOOR; v++) {
    const p = placeFree(rng, [arrival, ...rocks], away, half);
    if (p) rocks.push({ ...p, vein: true });
  }
  const plainN = PLAIN_ROCKS[0] + Math.floor(rng() * (PLAIN_ROCKS[1] - PLAIN_ROCKS[0] + 1));
  for (let i = 1; i < plainN; i++) {
    const p = placeFree(rng, [arrival, ...rocks], away, half);
    if (p) rocks.push({ ...p, vein: false });
  }
  const shuffled = rocks.map(r => ({ r, k: rng() })).sort((a, b) => a.k - b.k).map(o => o.r);
  const ladderRock = shuffled.findIndex(r => !r.vein && r.x === ladderAt.x && r.z === ladderAt.z);
  const theme = themeOf(floor);
  const pests = Array.from({ length: 1 + (rng() < 0.5 ? 1 : 0) }, () => theme.pests[Math.floor(rng() * theme.pests.length)]);
  const burrows = [], puddles = [];
  for (const p of pests) {
    const taken = [arrival, ...shuffled, ...burrows, ...puddles];
    if (p === 'axolotl') { const q = placeFree(rng, taken, () => true, half, 2.0); if (q) puddles.push(q); }
    const b = placeFree(rng, [...taken, ...puddles], q => dist(q, arrival) >= BURROW_MIN_FROM_ARRIVAL, half, 1.6) || { x: -ladderAt.x * 0.5, z: lim };
    burrows.push(b);
  }
  return { arrival, rocks: shuffled, ladderAt, ladderRock, burrows, puddles, pests };
}

export function ladderRevealed({ broken, hitLadderRock }) {
  return hitLadderRock || broken >= LADDER_PITY;
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/delve-rules.test.mjs`
Expected: PASS 21. 거리 규칙이 실패하면 대체값(먼 모서리)부터 계산해 본다: `half=8`, 도착점 x ≤ ±4, z = -6.5 → 모서리 (∓7, 7)까지 ≥ 16.6 > 13.58.

- [ ] **Step 5: 커밋**

```bash
git add js/delve/rules.js tests/delve-rules.test.mjs
git commit -m "feat(delve): floor layout with far ladder and pity rule"
```

---

### Task 4: 순수 규칙 3 · 저장·정류장·하루 첫 방문·광부 단계·하루 일감

**Files:**
- Modify: `js/delve/rules.js`
- Test: `tests/delve-rules.test.mjs`(추가)

**Interfaces:**
- Produces:
  - `Delve = { maxFloor, stops, stage, counts: {tap,bait,grab,reclaim}, chests, visited: {date, floors}, jobDate, started }`
  - `defaultDelve(): Delve` · `sanitizeDelve(raw): Delve`
  - `noteReach(d, floor): Delve` · `stopsOpen(d): number[]`
  - `oreAllowed(d, date, floor): boolean` · `markOreFloor(d, date, floor): Delve`
  - `bumpCount(d, key, n = 1): Delve` · `noteChest(d, floor): Delve`
  - `canDescendFrom0(d): boolean`
  - `stepView(d, inv): null | { index, id, title, desc, progress, target, ready }`
  - `claimStep(d, inv): null | { delve, inv, reward, stepId }`
  - `jobFor(date): { kind: 'ore'|'reclaim', n: number, floorMin: number }`

- [ ] **Step 1: 실패하는 테스트**

```js
import { defaultDelve, sanitizeDelve, noteReach, stopsOpen, oreAllowed, markOreFloor, bumpCount, noteChest, stepView, claimStep, canDescendFrom0, jobFor } from '../js/delve/rules.js';

test('기본값', () => {
  assert.deepEqual(defaultDelve(), { maxFloor: 0, stops: [], stage: 0, counts: { tap: 0, bait: 0, grab: 0, reclaim: 0 }, chests: {}, visited: { date: null, floors: [] }, jobDate: null, started: false });
});

test('저장값 정리: 이상한 값은 걸러내고 정류장은 도달한 층까지만', () => {
  const d = sanitizeDelve({ maxFloor: 12.7, stops: [5, 10, 15, 99, 'x'], stage: -3, counts: { tap: -1, bait: '2', grab: 3 }, chests: { 10: true, 7: true }, visited: { date: '2026-10-25', floors: [1, 2, 'z'] }, started: 1 });
  assert.equal(d.maxFloor, 12);
  assert.deepEqual(d.stops, [5, 10]);
  assert.equal(d.stage, 0);
  assert.deepEqual(d.counts, { tap: 0, bait: 0, grab: 3, reclaim: 0 });
  assert.deepEqual(d.chests, { 10: true });
  assert.deepEqual(d.visited, { date: '2026-10-25', floors: [1, 2] });
  assert.equal(d.started, true);
  assert.deepEqual(sanitizeDelve(undefined), defaultDelve());
  assert.equal(sanitizeDelve({ maxFloor: 40 }).maxFloor, 20);
});

test('도달하면 최고 층과 정류장이 갱신되고 원본은 그대로', () => {
  const a = defaultDelve(), b = noteReach(a, 6);
  assert.equal(a.maxFloor, 0);
  assert.equal(b.maxFloor, 6);
  assert.deepEqual(stopsOpen(b), [5]);
  assert.equal(noteReach(b, 3).maxFloor, 6);
});

test('광석은 그날 처음 간 층에서만', () => {
  let d = defaultDelve();
  assert.equal(oreAllowed(d, '2026-10-25', 3), true);
  d = markOreFloor(d, '2026-10-25', 3);
  assert.equal(oreAllowed(d, '2026-10-25', 3), false);
  assert.equal(oreAllowed(d, '2026-10-25', 4), true);
  assert.equal(oreAllowed(d, '2026-10-26', 3), true);
  d = markOreFloor(d, '2026-10-26', 5);
  assert.deepEqual(d.visited, { date: '2026-10-26', floors: [5] });
});

test('광부 1단계: 석탄 3개가 있으면 준비, 받으면 차감·승강기 개방', () => {
  const d = { ...defaultDelve(), started: true };
  assert.equal(canDescendFrom0(d), false);
  assert.equal(stepView(d, { coal: 2 }).ready, false);
  assert.equal(stepView(d, { coal: 3 }).ready, true);
  assert.equal(claimStep(d, { coal: 2 }), null);
  const c = claimStep(d, { coal: 5, gem: 0 });
  assert.equal(c.delve.stage, 1);
  assert.equal(c.inv.coal, 2);
  assert.equal(canDescendFrom0(c.delve), true);
});

test('상태형: 의뢰 단계 전에 한 행동도 인정된다', () => {
  let d = bumpCount({ ...defaultDelve(), started: true }, 'tap');
  d = claimStep(d, { coal: 3 }).delve;
  const v = stepView(d, {});
  assert.equal(v.id, 'tap');
  assert.equal(v.ready, true);
});

test('보상 지급: 보석·채집물·수정은 가방에 더한다', () => {
  const d = bumpCount({ ...defaultDelve(), started: true, stage: 1 }, 'tap');
  const c = claimStep(d, { gem: 1 });
  assert.equal(c.inv.gem, 2);
  assert.deepEqual(c.reward, { gem: 1 });
});

test('10층 상자·20층 도달 판정, 마지막 뒤에는 null', () => {
  let d = { ...defaultDelve(), started: true, stage: 4 };
  assert.equal(stepView(d, {}).ready, false);
  d = noteChest(d, 10);
  assert.equal(stepView(d, {}).ready, true);
  d = { ...d, stage: 7, maxFloor: 20 };
  assert.equal(stepView(d, {}).ready, true);
  d = claimStep(d, {}).delve;
  assert.equal(d.stage, 8);
  assert.equal(stepView(d, {}), null);
});

test('아직 시작 안 했으면 카드 없음', () => {
  assert.equal(stepView(defaultDelve(), { coal: 9 }), null);
});

test('완주 후 일감: 날짜로 정해지고 같은 날은 같다', () => {
  assert.deepEqual(jobFor('2026-10-25'), jobFor('2026-10-25'));
  const j = jobFor('2026-10-26');
  assert.ok(['ore', 'reclaim'].includes(j.kind));
  assert.ok(j.n >= 1 && j.n <= 6);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/delve-rules.test.mjs`
Expected: FAIL(import 오류)

- [ ] **Step 3: 구현(`js/delve/rules.js`; import 줄에 `DELVE_FLOORS, DELVE_STOPS, MINER_STEPS` 추가)**

```js
const COUNT_KEYS = ['tap', 'bait', 'grab', 'reclaim'];
const int = (v, lo, hi) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo; };

export function defaultDelve() {
  return { maxFloor: 0, stops: [], stage: 0, counts: { tap: 0, bait: 0, grab: 0, reclaim: 0 }, chests: {}, visited: { date: null, floors: [] }, jobDate: null, started: false };
}

export function sanitizeDelve(raw) {
  const d = defaultDelve();
  if (!raw || typeof raw !== 'object') return d;
  d.maxFloor = int(raw.maxFloor, 0, DELVE_FLOORS);
  d.stops = DELVE_STOPS.filter(s => s <= d.maxFloor && Array.isArray(raw.stops) && raw.stops.includes(s));
  d.stage = int(raw.stage, 0, MINER_STEPS.length);
  for (const k of COUNT_KEYS) d.counts[k] = typeof raw.counts?.[k] === 'number' ? int(raw.counts[k], 0, 9999) : 0;
  for (const f of [10, 20]) if (raw.chests?.[f] === true) d.chests[f] = true;
  if (typeof raw.visited?.date === 'string') d.visited = { date: raw.visited.date, floors: (raw.visited.floors || []).filter(f => Number.isInteger(f) && f >= 1 && f <= DELVE_FLOORS) };
  d.jobDate = typeof raw.jobDate === 'string' ? raw.jobDate : null;
  d.started = !!raw.started;
  return d;
}

export function noteReach(d, floor) {
  const maxFloor = Math.max(d.maxFloor, floor);
  return { ...d, maxFloor, stops: DELVE_STOPS.filter(s => s <= maxFloor) };
}

export function stopsOpen(d) { return DELVE_STOPS.filter(s => s <= d.maxFloor); }

export function oreAllowed(d, date, floor) {
  return d.visited.date !== date || !d.visited.floors.includes(floor);
}

export function markOreFloor(d, date, floor) {
  const floors = d.visited.date === date ? d.visited.floors : [];
  return floors.includes(floor) ? d : { ...d, visited: { date, floors: [...floors, floor] } };
}

export function bumpCount(d, key, n = 1) {
  return { ...d, counts: { ...d.counts, [key]: d.counts[key] + n } };
}

export function noteChest(d, floor) { return { ...d, chests: { ...d.chests, [floor]: true } }; }

export function canDescendFrom0(d) { return d.stage >= 1; }

function progressOf(step, d, inv) {
  const c = step.check;
  if (c.kind === 'inv') return Math.min(c.n, inv[c.key] || 0);
  if (c.kind === 'count') return Math.min(c.n, d.counts[c.key]);
  if (c.kind === 'floor') return Math.min(c.n, d.maxFloor);
  return d.chests[c.n] ? 1 : 0;
}

const targetOf = step => (step.check.kind === 'chest' ? 1 : step.check.n);

export function stepView(d, inv) {
  if (!d.started || d.stage >= MINER_STEPS.length) return null;
  const step = MINER_STEPS[d.stage];
  const progress = progressOf(step, d, inv), target = targetOf(step);
  return { index: d.stage, id: step.id, title: step.title, desc: step.desc, progress, target, ready: progress >= target };
}

export function claimStep(d, inv) {
  const v = stepView(d, inv);
  if (!v || !v.ready) return null;
  const step = MINER_STEPS[d.stage];
  const next = { ...inv };
  if (step.check.kind === 'inv' && step.check.take) next[step.check.key] = (next[step.check.key] || 0) - step.check.n;
  for (const k of ['gem', 'forage', 'crystal']) if (step.reward[k]) next[k] = (next[k] || 0) + step.reward[k];
  return { delve: { ...d, stage: d.stage + 1 }, inv: next, reward: step.reward, stepId: step.id };
}

export function jobFor(date) {
  const r = makeRng(hashSeed(`delvejob:${date}`));
  return r() < 0.7 ? { kind: 'ore', n: 3 + Math.floor(r() * 4), floorMin: 5 + Math.floor(r() * 3) * 5 } : { kind: 'reclaim', n: 2, floorMin: 11 };
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/delve-rules.test.mjs`
Expected: PASS 31

- [ ] **Step 5: 커밋**

```bash
git add js/delve/rules.js tests/delve-rules.test.mjs
git commit -m "feat(delve): save sanitize, stops, daily ore floors, miner steps, daily job"
```

---

### Task 5: 방해꾼 상태 기계 `js/delve/pests.js`

**Files:**
- Create: `js/delve/pests.js`
- Test: `tests/delve-pests.test.mjs`

**Interfaces:**
- Consumes: `PESTS`
- Produces:
  - 상수 `RING_SEC = 3`, `GRAB_R = 0.45`, `TAP_R = 1.8`, `BAIT_R = 3.5`, `BAIT_EAT_SEC = 6`, `NOTICE_R = 9`, `PICK_R = 0.8`
  - `Pest = { kind, state: 'idle'|'hide'|'approach'|'carry'|'flee'|'eat'|'gone', x, z, home: {x,z}, spawn: {x,z}, targetId, carryId, t }`
  - `createPest(kind, at, home): Pest`
  - `stepPest(p, dt, w: { chunks: Array<{id,x,z,age}>, burrowAt: {x,z} }): { pest, events: Array<{type: 'grab'|'stash', chunkId}> }`
  - `tapPest(p, player): null | { pest, events: Array<{type: 'spit', chunkId, x, z}> }`
  - `baitPest(p, at): null | Pest`
  - `pickableBeforeBat(chunk): boolean` · `canPick(chunk, player): boolean`

- [ ] **Step 1: 실패하는 테스트**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPest, stepPest, tapPest, baitPest, pickableBeforeBat, canPick, RING_SEC, BAIT_EAT_SEC } from '../js/delve/pests.js';

const W = (chunks, extra = {}) => ({ chunks, burrowAt: { x: 5, z: 5 }, ...extra });
const run = (p, w, sec, dt = 0.1) => {
  const ev = [];
  for (let t = 0; t < sec; t += dt) {
    const r = stepPest(p, dt, w);
    p = r.pest; ev.push(...r.events);
    for (const e of r.events) if (e.type === 'grab') w.chunks = w.chunks.filter(c => c.id !== e.chunkId);
  }
  return { p, ev };
};

test('조각이 없으면 가만히 있다', () => {
  const { p, ev } = run(createPest('crab', { x: 0, z: 0 }, { x: 5, z: 5 }), W([]), 3);
  assert.equal(p.state, 'idle');
  assert.equal(ev.length, 0);
});

test('수정집게는 조각에 다가가 물고 굴로 가져간다', () => {
  const { ev } = run(createPest('crab', { x: 0, z: 0 }, { x: 5, z: 5 }), W([{ id: 'a', x: 2, z: 0, age: 0 }]), 20);
  assert.deepEqual(ev.map(e => e.type), ['grab', 'stash']);
});

test('박쥐는 노란 원(3초)이 끝나기 전엔 조각을 노리지 않는다', () => {
  const w = W([{ id: 'a', x: 1, z: 0, age: 0 }]);
  let p = createPest('bat', { x: 0, z: 0 }, { x: 5, z: 5 });
  for (let t = 0; t < RING_SEC - 0.2; t += 0.1) { w.chunks[0].age += 0.1; const r = stepPest(p, 0.1, w); p = r.pest; assert.equal(r.events.length, 0); }
  assert.equal(pickableBeforeBat({ age: RING_SEC - 0.1 }), true);
  assert.equal(pickableBeforeBat({ age: RING_SEC }), false);
});

test('도롱뇽은 숨어 있다 조각이 생기면 문다. 물고 갈 때 톡 치면 뱉는다', () => {
  let p = createPest('axolotl', { x: 0, z: 0 }, { x: 5, z: 5 });
  assert.equal(p.state, 'hide');
  const w = W([{ id: 'a', x: 1, z: 0, age: 0 }]);
  let grabbed = false;
  for (let t = 0; t < 5 && !grabbed; t += 0.1) { const r = stepPest(p, 0.1, w); p = r.pest; grabbed = r.events.some(e => e.type === 'grab'); }
  assert.ok(grabbed);
  assert.equal(p.state, 'carry');
  assert.equal(tapPest(p, { x: p.x + 5, z: p.z }), null);
  const hit = tapPest(p, { x: p.x + 1, z: p.z });
  assert.equal(hit.events[0].type, 'spit');
  assert.equal(hit.events[0].chunkId, 'a');
  assert.equal(hit.pest.state, 'flee');
  assert.equal(hit.pest.carryId, null);
});

test('숨은 도롱뇽도 톡 치면 놀라 달아난다(뱉을 게 없으면 이벤트 없음)', () => {
  const hit = tapPest(createPest('axolotl', { x: 0, z: 0 }, { x: 5, z: 5 }), { x: 1, z: 0 });
  assert.equal(hit.pest.state, 'flee');
  assert.equal(hit.events.length, 0);
});

test('수정집게에게 미끼를 던지면 6초 먹고 조각을 안 노린다', () => {
  assert.equal(baitPest(createPest('bat', { x: 0, z: 0 }, { x: 5, z: 5 }), { x: 1, z: 0 }), null);
  const p = baitPest(createPest('crab', { x: 0, z: 0 }, { x: 5, z: 5 }), { x: 1, z: 0 });
  assert.equal(p.state, 'eat');
  const { ev, p: after } = run(p, W([{ id: 'a', x: 0.3, z: 0, age: 0 }]), BAIT_EAT_SEC - 0.5);
  assert.equal(ev.filter(e => e.type === 'grab').length, 0);
  assert.equal(after.state, 'eat');
});

test('등불벌레가 굴에 넣으면 stash 이벤트(되찾기 대상)', () => {
  const { ev } = run(createPest('grub', { x: 0, z: 0 }, { x: 3, z: 0 }), W([{ id: 'a', x: 1, z: 0, age: 0 }], { burrowAt: { x: 3, z: 0 } }), 15);
  assert.ok(ev.some(e => e.type === 'stash' && e.chunkId === 'a'));
});

test('줍기 반경', () => {
  assert.equal(canPick({ x: 0, z: 0 }, { x: 0.5, z: 0 }), true);
  assert.equal(canPick({ x: 0, z: 0 }, { x: 1.2, z: 0 }), false);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/delve-pests.test.mjs`
Expected: FAIL `Cannot find module '../js/delve/pests.js'`

- [ ] **Step 3: 구현**

```js
import { PESTS } from '../data/delve.js';

export const RING_SEC = 3;
export const GRAB_R = 0.45;
export const TAP_R = 1.8;
export const BAIT_R = 3.5;
export const BAIT_EAT_SEC = 6;
export const NOTICE_R = 9;
export const PICK_R = 0.8;

const d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export function createPest(kind, at, home) {
  return { kind, state: kind === 'axolotl' ? 'hide' : 'idle', x: at.x, z: at.z, home: { ...home }, spawn: { x: at.x, z: at.z }, targetId: null, carryId: null, t: 0 };
}

function moveToward(p, to, speed, dt) {
  const dx = to.x - p.x, dz = to.z - p.z, len = Math.hypot(dx, dz);
  if (len < 1e-6) return { ...p };
  const s = Math.min(len, speed * dt);
  return { ...p, x: p.x + (dx / len) * s, z: p.z + (dz / len) * s };
}

const wanted = (p, c) => !(p.kind === 'bat' && c.age < RING_SEC) && d2(p, c) <= NOTICE_R;

export function stepPest(p, dt, w) {
  const speed = PESTS[p.kind].speed;
  const events = [];
  if (p.state === 'gone') return { pest: p, events };
  if (p.state === 'eat') {
    const t = p.t - dt;
    return { pest: t <= 0 ? { ...p, state: 'idle', t: 0 } : { ...p, t }, events };
  }
  if (p.state === 'flee') {
    const q = moveToward(p, p.home, speed * 1.5, dt);
    return { pest: d2(q, p.home) < 0.3 ? { ...q, state: 'gone' } : q, events };
  }
  if (p.state === 'carry') {
    const q = moveToward(p, w.burrowAt, speed, dt);
    if (d2(q, w.burrowAt) < 0.3) { events.push({ type: 'stash', chunkId: p.carryId }); return { pest: { ...q, state: 'gone', carryId: null }, events }; }
    return { pest: q, events };
  }
  const target = w.chunks.filter(c => wanted(p, c)).sort((a, b) => d2(p, a) - d2(p, b))[0];
  if (!target) return { pest: p.state === 'approach' ? { ...p, state: p.kind === 'axolotl' ? 'hide' : 'idle', targetId: null } : p, events };
  const q = moveToward({ ...p, state: 'approach', targetId: target.id }, target, speed, dt);
  if (d2(q, target) <= GRAB_R) { events.push({ type: 'grab', chunkId: target.id }); return { pest: { ...q, state: 'carry', carryId: target.id, targetId: null }, events }; }
  return { pest: q, events };
}

export function tapPest(p, player) {
  if (p.kind !== 'axolotl' || p.state === 'gone' || d2(p, player) > TAP_R) return null;
  const events = p.carryId ? [{ type: 'spit', chunkId: p.carryId, x: p.x, z: p.z }] : [];
  return { pest: { ...p, state: 'flee', carryId: null, targetId: null }, events };
}

export function baitPest(p, at) {
  if (p.kind !== 'crab' || p.state === 'gone' || p.state === 'carry' || d2(p, at) > BAIT_R) return null;
  return { ...p, state: 'eat', t: BAIT_EAT_SEC, targetId: null };
}

export function pickableBeforeBat(chunk) { return chunk.age < RING_SEC; }

export function canPick(chunk, player) { return d2(chunk, player) <= PICK_R; }
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/delve-pests.test.mjs`
Expected: PASS 8

- [ ] **Step 5: 커밋**

```bash
git add js/delve/pests.js tests/delve-pests.test.mjs
git commit -m "feat(delve): pest state machine and counters"
```

---

### Task 6: 저장·인벤·도감·판매가 연결

**Files:**
- Modify: `js/game.js:963-967`(인벤 기본값), `js/game.js:1024`(gameState 기본값), `js/game.js:2495`(복원), `js/game.js:7193`(`RES_LABEL`)
- Modify: `js/data/dex.js:34-38`, `js/data/catalog.js:144`, `tests/dex-gates.test.mjs:130`
- Test: `tests/delve-wiring.test.mjs`(생성)

**Interfaces:**
- Consumes: `defaultDelve`, `sanitizeDelve`, `CRYSTAL_PRICE`
- Produces: `gameState.delve`(항상 정리된 값), 인벤 키 `crystal`

- [ ] **Step 1: 실패하는 테스트**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';
import { DEX } from '../js/data/dex.js';
import { SELL_PRICE } from '../js/data/catalog.js';
import { CRYSTAL_PRICE } from '../js/data/delve.js';

const src = gameSource();

test('gameState 에 delve 기본값, 로드 때 sanitizeDelve 로 복원', () => {
  assert.match(src, /delve:\s*defaultDelve\(\)/);
  assert.match(src, /gameState\.delve\s*=\s*sanitizeDelve\(saved\.delve\)/);
});

test('수정: 인벤 기본값·라벨·판매가·도감', () => {
  assert.match(src, /gotgam: 0, crystal: 0 \}/);
  assert.match(src, /crystal: '🔮수정'/);
  assert.equal(SELL_PRICE.crystal, CRYSTAL_PRICE);
  assert.ok(DEX.ore.some(o => o.id === 'crystal'));
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/delve-wiring.test.mjs`
Expected: FAIL(정규식 불일치)

- [ ] **Step 3: 구현**

`js/game.js` import 묶음에 추가:

```js
import { defaultDelve, sanitizeDelve } from './delve/rules.js';
```

`js/game.js:967` 인벤 마지막 줄의 `gotgam: 0 },`를 `gotgam: 0, crystal: 0 },`로 바꾼다(뒤 주석은 그대로).

`js/game.js:1024` `progress: { advHarvest: 0 },` 다음 줄:

```js
  delve: defaultDelve(),
```

`js/game.js:2495` `gameState.progress.orchardRefill = ...` 다음 줄:

```js
  gameState.delve = sanitizeDelve(saved.delve);
```

`js/game.js:7193` `RES_LABEL`의 `gem: '보석',` 바로 뒤에 `crystal: '🔮수정',` 추가.

`js/data/dex.js:37` `gem` 줄 다음:

```js
    { id: 'crystal', name: '수정', ico: '🔮' },
```

`js/data/catalog.js:144` `SELL_PRICE`의 `gem: 40,` 바로 뒤에 `crystal: 25,` 추가.

`tests/dex-gates.test.mjs:130`을 바꾼다:

```js
    ore:    ['stone', 'coal', 'gem', 'crystal'],
```

- [ ] **Step 4: 전체 테스트**

Run: `npm test 2>&1 | tail -8`
Expected: 새 테스트 PASS, 실패 수 = Task 0 기준선. 도감 총계(`DEX_TOTAL`)가 1 늘어 숫자를 박아 둔 테스트가 깨지면 그 기대값을 +1(수정 추가는 의도된 변경). `GALLERY_MAX`(33)는 그대로(광물 4칸).

- [ ] **Step 5: 커밋**

```bash
git add js/game.js js/data/dex.js js/data/catalog.js tests/dex-gates.test.mjs tests/delve-wiring.test.mjs
git commit -m "feat(delve): save slot, crystal item, dex and price"
```

---

### Task 7: 조형 모듈 `js/delve/pest-art.js`

**Files:**
- Create: `js/delve/pest-art.js`(← `sims/cave-pest-art.mjs` + 아래 추가분)
- Modify: `sims/cave-pest-art.mjs`(재수출 한 줄)

**Interfaces:**
- Produces(원점 = 바닥):
  - `makePest(id: 'crab'|'bat'|'axolotl'|'grub', opts?: {submerged?: boolean}): { g: Group, holdAt: Vector3, hover?: number }`(스케일 1.6 적용)
  - `makeOreChunk()`, `makePuddle(r?)`, `makeBurrow()`, `makeTrail(points: Array<[x, z]>)`, `makeRing(r?)`, `makeBait()`, `emojiBubble(txt, size?)`
  - `makeShaft()`, `makeLadderUp()`, `makeRock(vein: boolean, theme: {rock})`, `makeLift()`

- [ ] **Step 1: 파일 이전**

```bash
cp sims/cave-pest-art.mjs js/delve/pest-art.js
printf "export * from '../js/delve/pest-art.js';\n" > sims/cave-pest-art.mjs
```

- [ ] **Step 2: 새 조형 추가(`js/delve/pest-art.js` 끝)**

```js
export function makeShaft() {
  const g = new THREE.Group();
  const wood = mat(0x7a5232, { flatShading: true });
  const hole = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.02, 1.3), new THREE.MeshBasicMaterial({ color: 0x050608 }));
  hole.position.y = 0.02; g.add(hole);
  for (const [x, z, w, d] of [[0, 0.7, 1.6, 0.14], [0, -0.7, 1.6, 0.14], [0.7, 0, 0.14, 1.6], [-0.7, 0, 0.14, 1.6]]) M(new THREE.BoxGeometry(w, 0.16, d), wood, g, [x, 0.08, z]);
  for (const x of [-0.6, 0.6]) M(new THREE.BoxGeometry(0.12, 1.3, 0.12), wood, g, [x, 0.65, -0.7]);
  M(new THREE.BoxGeometry(1.4, 0.12, 0.12), wood, g, [0, 1.3, -0.7]);
  const rail = mat(0x9a7a52, { flatShading: true });
  for (const x of [-0.25, 0.25]) M(new THREE.BoxGeometry(0.06, 0.06, 1.0), rail, g, [x, 0.1, 0], [-0.35, 0, 0]);
  for (let i = 0; i < 4; i++) M(new THREE.BoxGeometry(0.56, 0.05, 0.06), rail, g, [0, 0.12 - i * 0.02, 0.35 - i * 0.22]);
  return g;
}

export function makeLadderUp() {
  const g = new THREE.Group();
  const wood = mat(0x8a6038, { flatShading: true });
  for (const x of [-0.3, 0.3]) M(new THREE.BoxGeometry(0.08, 2.6, 0.08), wood, g, [x, 1.3, 0]);
  for (let i = 0; i < 6; i++) M(new THREE.BoxGeometry(0.6, 0.06, 0.08), wood, g, [0, 0.3 + i * 0.4, 0]);
  return g;
}

export function makeRock(vein, theme) {
  const g = new THREE.Group();
  const rock = mat(theme.rock, { flatShading: true });
  M(new THREE.IcosahedronGeometry(0.45, 0), rock, g, [0, 0.32, 0], [0.3, 0.6, 0], [1.1, 0.8, 1]);
  M(new THREE.IcosahedronGeometry(0.3, 0), rock, g, [0.28, 0.2, 0.15], [0.8, 0.2, 0.4]);
  if (vein) for (const [x, y, z] of [[0.1, 0.55, 0.25], [-0.25, 0.4, 0.2], [0.3, 0.35, -0.1]]) M(new THREE.IcosahedronGeometry(0.09, 0), glow(0xffd27a, 0.35), g, [x, y, z]);
  return g;
}

export function makeLift() {
  const g = new THREE.Group();
  const wood = mat(0x7a5232, { flatShading: true });
  for (const x of [-0.9, 0.9]) M(new THREE.BoxGeometry(0.18, 3, 0.18), wood, g, [x, 1.5, 0]);
  M(new THREE.BoxGeometry(2.1, 0.2, 0.3), wood, g, [0, 3.0, 0]);
  M(new THREE.BoxGeometry(1.5, 0.1, 1.2), mat(0x3e3b3a), g, [0, 0.05, 0]);
  return g;
}
```

- [ ] **Step 3: 목업 캡처 회귀 확인**

프리뷰 서버를 켜고: `node dev/active/cave-delve/mockup/capture.mjs <포트> 2-axolotl`
Expected: `pc 2-axolotl {...lineLines:1...}`·`phone 2-axolotl {...}` 출력, 예외 없음.

- [ ] **Step 4: 커밋**

```bash
git add js/delve/pest-art.js sims/cave-pest-art.mjs
git commit -m "feat(delve): pest and cave prop art module"
```

---

### Task 8: 지하 층 공간 `js/spaces/delve.js` · 층 생성·이동·채굴·줍기·방해꾼

**Files:**
- Create: `js/spaces/delve.js`
- Modify: `js/data/places.js`, `js/game.js`(543, 5630, 5790-5792, 6590, 6624, export 목록·`$w`), `js/spaces/mine.js`(186-190, `buildMine` 끝), `js/spaces/doors.js:242-243`
- Test: `tests/delve-wiring.test.mjs`(추가)

**Interfaces:**
- Consumes: Task 2~5 규칙, Task 7 조형, `game.js`의 `$w, atMine, clock, dexDiscover, dist2D, doPlayerAction, gameState, player, questEvent, refreshInventoryUI, scene, setSpaceVisible, situation, snapCamera, spawnDust, spawnFloatText, spawnSparkle, ui, todayStr`
- Produces:
  - `delveFloorNow(): number`(0 = 0층)
  - `placeLift(): void`
  - `enterFloor(floor: number, via: 'lift'|'ladder'): void`
  - `leaveToFloor0(reason: 'ladder'|'reload'): void`
  - `clampDelve(pos: Vector3): void`
  - `delvePrompt(): null | { nd: string, prompt: string }`
  - `handleDelveDoor(nd: string): boolean`
  - `tryDelveMine(): void`
  - `updateDelve(dt: number, t: number): void`

- [ ] **Step 1: 실패하는 연결 테스트(`tests/delve-wiring.test.mjs`에 추가)**

```js
test('지하 층 연결: 공간 표시·갱신·이동 제한·문·괭이·0층 광맥', () => {
  assert.match(src, /mineGroup\.visible = atMine && delveFloorNow\(\) === 0/);
  assert.match(src, /updateDelve\(dt, t\)/);
  assert.match(src, /if \(delveFloorNow\(\) > 0\) clampDelve\(player\.position\)/);
  assert.match(src, /handleDelveDoor\(nearDoor\)/);
  assert.match(src, /delveFloorNow\(\) > 0 \? tryDelveMine\(\) : tryMine\(\)/);
  assert.match(src, /rock\.visible = atMine && delveFloorNow\(\) === 0 && !ud\.depleted/);
});

test('DELVE 좌표는 다른 공간과 200 이상 떨어진다', async () => {
  const P = await import('../js/data/places.js');
  for (const k of ['MINE', 'MUSEUM', 'CAFE', 'OBSERVATORY', 'NEIGHBOR', 'DREAM', 'RIVER', 'MIST', 'SEA', 'ORCHARD', 'FARM', 'INT']) {
    assert.ok(P.DELVE.distanceTo(P[k]) >= 200, k);
  }
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/delve-wiring.test.mjs`
Expected: FAIL

- [ ] **Step 3: 좌표(`js/data/places.js`, `MINE_GATE` 줄 다음)**

```js
export const DELVE = new THREE.Vector3(-400, 0, 0);
```

- [ ] **Step 4: `js/spaces/delve.js`**

```js
import {
  $w, atMine, clock, dexDiscover, dist2D, doPlayerAction, gameState, player, questEvent, refreshInventoryUI, scene,
  setSpaceVisible, situation, snapCamera, spawnDust, spawnFloatText, spawnSparkle, ui, todayStr,
} from '../game.js';
import { trackEvent } from '../analytics.js';
import { DELVE, MINE, MINE_HALF } from '../data/places.js';
import { DELVE_HALF, DELVE_CHEST_FLOORS, PEST_COPY } from '../data/delve.js';
import {
  floorSeed, layoutFloor, ladderRevealed, themeOf, oreOdds, rollOre, makeRng, noteReach, oreAllowed, markOreFloor,
  bumpCount, canDescendFrom0, stopsOpen,
} from '../delve/rules.js';
import { createPest, stepPest, tapPest, baitPest, canPick, RING_SEC, TAP_R, BAIT_R } from '../delve/pests.js';
import { makePest, makeOreChunk, makePuddle, makeBurrow, makeRing, makeBait, makeShaft, makeLadderUp, makeRock, makeLift } from '../delve/pest-art.js';
import * as THREE from 'three';

let run = null;
let group = null;
let visitN = 0;
let liftMesh = null;

export function delveFloorNow() { return run ? run.floor : 0; }

const W = (lx, lz) => new THREE.Vector3(DELVE.x + lx, 0, DELVE.z + lz);
const L = (pos) => ({ x: pos.x - DELVE.x, z: pos.z - DELVE.z });
const FLOOR_Y = 0.15;

export function placeLift() {
  if (liftMesh) return;
  liftMesh = makeLift();
  liftMesh.position.set(MINE.x + 5, FLOOR_Y, MINE.z - MINE_HALF + 4);
  scene.add(liftMesh);
}

function clearRoom() {
  if (group) scene.remove(group);
  group = null;
}

function buildRoom(floor, layout) {
  clearRoom();
  const theme = themeOf(floor);
  group = new THREE.Group();
  const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(DELVE_HALF * 2 + 2, 0.2, DELVE_HALF * 2 + 2), new THREE.MeshStandardMaterial({ color: theme.floor, roughness: 1 }));
  floorMesh.position.copy(W(0, 0)); floorMesh.position.y = 0.05; floorMesh.receiveShadow = true; group.add(floorMesh);
  const wallGeo = new THREE.IcosahedronGeometry(1, 0), wallMat = new THREE.MeshStandardMaterial({ color: theme.rock, roughness: 1, flatShading: true });
  for (let t = -DELVE_HALF; t <= DELVE_HALF; t += 1.1) {
    for (const [x, z] of [[t, DELVE_HALF + 0.3], [t, -DELVE_HALF - 0.3], [DELVE_HALF + 0.3, t], [-DELVE_HALF - 0.3, t]]) {
      const r = new THREE.Mesh(wallGeo, wallMat);
      r.position.copy(W(x, z)); r.position.y = 1; r.scale.set(0.9, 1.6 + Math.abs(Math.sin(t * 3 + x)) * 0.8, 0.9); group.add(r);
    }
  }
  const up = makeLadderUp(); up.position.copy(W(layout.arrival.x, layout.arrival.z - 1)); up.position.y = FLOOR_Y; group.add(up);
  const light = new THREE.PointLight(0xffb866, 2.0, 18, 1.2); light.position.copy(W(0, 0)); light.position.y = 4; group.add(light);
  run.rockMeshes = layout.rocks.map(r => { const m = makeRock(r.vein, theme); m.position.copy(W(r.x, r.z)); m.position.y = FLOOR_Y; m.userData.hp = 3; group.add(m); return m; });
  for (const p of layout.puddles) { const m = makePuddle(0.85); m.position.copy(W(p.x, p.z)); m.position.y = FLOOR_Y; group.add(m); }
  for (const b of layout.burrows) { const m = makeBurrow(); m.position.copy(W(b.x, b.z)); m.position.y = FLOOR_Y; group.add(m); }
  scene.add(group);
}

function spawnPests(layout) {
  run.pests = layout.pests.map((kind, i) => {
    const home = layout.burrows[i];
    const at = kind === 'axolotl' && layout.puddles[0] ? layout.puddles[0] : home;
    const art = makePest(kind, { submerged: kind === 'axolotl' });
    group.add(art.g);
    return { sim: createPest(kind, at, home), art, met: false, bubble: null, bubbleTxt: null };
  });
}

export function enterFloor(floor, via) {
  const date = todayStr();
  const layout = layoutFloor({ seed: floorSeed(date, floor, visitN++), floor });
  const oreOk = oreAllowed(gameState.delve, date, floor);
  run = { floor, layout, oreOk, broken: 0, ladderShown: false, chunks: [], carried: new Map(), stash: [], ore: 0, chunkN: 0, trail: null };
  buildRoom(floor, layout);
  spawnPests(layout);
  gameState.delve = noteReach(gameState.delve, floor);
  if (oreOk) gameState.delve = markOreFloor(gameState.delve, date, floor);
  player.position.copy(W(layout.arrival.x, layout.arrival.z));
  player.rotation.y = 0;
  $w.nearDoor = null; ui.setDoorPrompt?.(null); snapCamera(); setSpaceVisible();
  trackEvent('delve_floor', { floor, via, stops: stopsOpen(gameState.delve).length });
}

export function leaveToFloor0(reason) {
  trackEvent('delve_exit', { floor: delveFloorNow(), reason, ore: run?.ore || 0 });
  clearRoom(); run = null;
  player.position.set(MINE.x + 5, 0, MINE.z - MINE_HALF + 5.5);
  $w.nearDoor = null; ui.setDoorPrompt?.(null); snapCamera(); setSpaceVisible();
}

export function clampDelve(pos) {
  const h = DELVE_HALF - 0.7;
  pos.x = Math.max(DELVE.x - h, Math.min(DELVE.x + h, pos.x));
  pos.z = Math.max(DELVE.z - h, Math.min(DELVE.z + h, pos.z));
}

function nearestRock(maxD) {
  let best = -1, bd = maxD;
  run.layout.rocks.forEach((r, i) => {
    if (!run.rockMeshes[i].visible) return;
    const d = dist2D(W(r.x, r.z), player.position);
    if (d < bd) { bd = d; best = i; }
  });
  return best;
}

function dropChunk(lx, lz, ore) {
  const mesh = makeOreChunk(); mesh.position.copy(W(lx, lz)); mesh.position.y = FLOOR_Y + 0.12; group.add(mesh);
  const ring = makeRing(0.5); ring.position.copy(W(lx, lz)); ring.position.y = FLOOR_Y + 0.02; ring.visible = false; group.add(ring);
  run.chunks.push({ id: `c${run.chunkN++}`, x: lx, z: lz, age: 0, ore, mesh, ring });
}

function showLadder() {
  run.ladderShown = true;
  const s = makeShaft(); s.position.copy(W(run.layout.ladderAt.x, run.layout.ladderAt.z)); s.position.y = FLOOR_Y; group.add(s);
  const lr = run.rockMeshes[run.layout.ladderRock]; if (lr) lr.visible = false;
  spawnSparkle(s.position.x, 0.6, s.position.z, 18);
  ui.toast?.('🪜 아래로 가는 길이 보여요');
}

export function tryDelveMine() {
  const i = nearestRock(2.4);
  if (i < 0) { ui.toast?.('가까운 바위가 없어요 ⛏️'); return; }
  const r = run.layout.rocks[i], m = run.rockMeshes[i];
  doPlayerAction(m.position.x, m.position.z);
  spawnDust(m.position.x, m.position.z, 8);
  m.userData.hp -= 1;
  if (m.userData.hp > 0) return;
  m.visible = false;
  run.broken++;
  if (r.vein && run.oreOk) dropChunk(r.x, r.z, rollOre(makeRng((Date.now() ^ (i * 2654435761)) >>> 0), oreOdds(run.floor, situation().weather)));
  if (!run.ladderShown && ladderRevealed({ broken: run.broken, hitLadderRock: i === run.layout.ladderRock })) showLadder();
}

const batAlive = () => run.pests.some(p => p.sim.kind === 'bat' && p.sim.state !== 'gone');

function pickUp(c) {
  run.chunks = run.chunks.filter(x => x !== c);
  group.remove(c.mesh); group.remove(c.ring);
  gameState.inventory[c.ore] = (gameState.inventory[c.ore] || 0) + 1;
  run.ore++;
  refreshInventoryUI();
  spawnFloatText(c.mesh.position.x, 1.4, c.mesh.position.z, `+1`, c.ore === 'gem' ? '#5ad0e0' : '#cfc8b8');
  questEvent('mine', 1);
  dexDiscover('ore', c.ore);
  if (batAlive() && c.age < RING_SEC) {
    gameState.delve = bumpCount(gameState.delve, 'grab');
    trackEvent('pest_counter', { pest: 'bat', method: 'grab', ok: 1 });
  }
}

export function delvePrompt() {
  if (!run) {
    if (liftMesh && dist2D(liftMesh.position, player.position) < 2.0) {
      return canDescendFrom0(gameState.delve) ? { nd: 'delve_lift', prompt: '🛗 승강기 타기' } : { nd: 'delve_lift_locked', prompt: '🛗 승강기 고장' };
    }
    return null;
  }
  const lp = L(player.position);
  const near = (p, r) => Math.hypot(lp.x - p.x, lp.z - p.z) < r;
  if (near({ x: run.layout.arrival.x, z: run.layout.arrival.z - 1 }, 1.6)) return { nd: 'delve_up', prompt: '🪜 올라가기' };
  if (run.ladderShown && near(run.layout.ladderAt, 1.6)) return run.floor >= 20 ? { nd: 'delve_bottom', prompt: '🪜 가장 깊은 곳' } : { nd: 'delve_down', prompt: '🪜 내려가기' };
  for (const p of run.pests) {
    if (p.sim.kind === 'axolotl' && p.sim.state !== 'gone' && near(p.sim, TAP_R)) return { nd: 'delve_tap', prompt: PEST_COPY.axolotl.prompt };
    if (p.sim.kind === 'crab' && ['idle', 'approach'].includes(p.sim.state) && near(p.sim, BAIT_R) && (gameState.inventory.forage || 0) > 0) return { nd: 'delve_bait', prompt: PEST_COPY.crab.prompt };
  }
  if (run.stash.length && run.layout.burrows.some(b => near(b, 1.4))) return { nd: 'delve_dig', prompt: PEST_COPY.grub.prompt };
  return null;
}

export function handleDelveDoor(nd) {
  if (nd === 'delve_lift_locked') { ui.toast?.('⛏️ 광부 아저씨에게 석탄 3개를 가져다줘요'); return true; }
  if (nd === 'delve_lift') {
    const stops = stopsOpen(gameState.delve);
    trackEvent('delve_enter', { floor: stops.at(-1) || 0, stops: stops.length });
    enterFloor(stops.length ? stops.at(-1) : 1, 'lift');
    return true;
  }
  if (nd === 'delve_up') { leaveToFloor0('ladder'); return true; }
  if (nd === 'delve_down') { enterFloor(run.floor + 1, 'ladder'); return true; }
  if (nd === 'delve_bottom') { ui.toast?.('🪜 여기가 가장 깊은 곳이에요'); return true; }
  if (nd === 'delve_tap') {
    const lp = L(player.position);
    for (const p of run.pests) {
      const r = tapPest(p.sim, lp);
      if (!r) continue;
      p.sim = r.pest;
      for (const e of r.events) {
        const c = run.carried.get(e.chunkId);
        if (!c) continue;
        run.carried.delete(e.chunkId); group.remove(c.mesh);
        dropChunk(e.x, e.z, c.ore);
      }
      gameState.delve = bumpCount(gameState.delve, 'tap');
      trackEvent('pest_counter', { pest: 'axolotl', method: 'tap', ok: r.events.length ? 1 : 0 });
      return true;
    }
    return true;
  }
  if (nd === 'delve_bait') {
    const at = L(player.position);
    for (const p of run.pests) {
      const next = baitPest(p.sim, at);
      if (!next) continue;
      p.sim = next;
      gameState.inventory.forage -= 1; refreshInventoryUI();
      const b = makeBait(); b.position.copy(W(p.sim.x, p.sim.z + 0.5)); b.position.y = FLOOR_Y; group.add(b);
      const g = group; setTimeout(() => g.remove(b), 6000);
      gameState.delve = bumpCount(gameState.delve, 'bait');
      trackEvent('pest_counter', { pest: 'crab', method: 'bait', ok: 1 });
      return true;
    }
    return true;
  }
  if (nd === 'delve_dig') {
    const got = run.stash.length + 1;
    const ore = run.stash[0].ore;
    gameState.inventory[ore] = (gameState.inventory[ore] || 0) + got;
    run.stash = [];
    refreshInventoryUI();
    spawnFloatText(player.position.x, 1.6, player.position.z, `+${got}`, '#ffe48a');
    gameState.delve = bumpCount(gameState.delve, 'reclaim');
    trackEvent('pest_counter', { pest: 'grub', method: 'reclaim', ok: 1 });
    return true;
  }
  return false;
}

function meetBanner(kind) {
  const c = PEST_COPY[kind];
  $w.firstHintBanner?.(`delve_${kind}`, c.ico, c.title, c.line);
  trackEvent('pest_meet', { pest: kind, floor: run.floor });
}

export function updateDelve(dt, t) {
  if (!run || !atMine) return;
  const lp = L(player.position);
  const ringOn = batAlive();
  for (const c of [...run.chunks]) {
    c.age += dt;
    c.ring.visible = ringOn && c.age < RING_SEC;
    if (c.ring.visible) c.ring.scale.setScalar(1 - (c.age / RING_SEC) * 0.6);
    if (canPick(c, lp)) pickUp(c);
  }
  for (const p of run.pests) {
    const world = { chunks: run.chunks.map(c => ({ id: c.id, x: c.x, z: c.z, age: c.age })), burrowAt: p.sim.home };
    const { pest, events } = stepPest(p.sim, dt, world);
    p.sim = pest;
    for (const e of events) {
      if (e.type === 'grab') {
        const c = run.chunks.find(x => x.id === e.chunkId);
        if (c) { run.chunks = run.chunks.filter(x => x !== c); group.remove(c.ring); run.carried.set(c.id, c); }
        if (!p.met) { p.met = true; meetBanner(pest.kind); }
      }
      if (e.type === 'stash') {
        const c = run.carried.get(e.chunkId);
        run.carried.delete(e.chunkId);
        if (c) { group.remove(c.mesh); if (pest.kind === 'grub') run.stash.push(c); }
      }
    }
    p.art.g.position.copy(W(pest.x, pest.z)); p.art.g.position.y = FLOOR_Y + (p.art.hover || 0);
    p.art.g.visible = pest.state !== 'gone';
    if (pest.carryId) { const c = run.carried.get(pest.carryId); if (c) c.mesh.position.copy(p.art.g.position).add(new THREE.Vector3(0, 0.5, 0)); }
  }
}
```

- [ ] **Step 5: `js/game.js` 연결**

import 묶음:

```js
import { delveFloorNow, clampDelve, handleDelveDoor, tryDelveMine, updateDelve } from './spaces/delve.js';
```

`js/game.js:543`:

```js
  if (mineGroup) mineGroup.visible = atMine && delveFloorNow() === 0;
```

`js/game.js:5630` `updateOreRocks();` 다음 줄:

```js
  updateDelve(dt, t);
```

`js/game.js:5790-5792` 동굴 분기를 바꾼다:

```js
  } else if (atMine) { // 동굴: 벽 안쪽으로 제한
    if (delveFloorNow() > 0) clampDelve(player.position);
    else {
      player.position.x = Math.max(MINE.x - MINE_HALF + 0.7, Math.min(MINE.x + MINE_HALF - 0.7, player.position.x));
      player.position.z = Math.max(MINE.z - MINE_HALF + 0.6, Math.min(MINE.z + MINE_HALF - 0.7, player.position.z));
    }
```

`js/game.js:6590` `if (nearDoor === 'mineexit') return exitMine();` 바로 위:

```js
  if (typeof nearDoor === 'string' && nearDoor.startsWith('delve_') && handleDelveDoor(nearDoor)) return;
```

`js/game.js:6624`:

```js
      if (TOOLS[currentTool].id === 'hoe') return delveFloorNow() > 0 ? tryDelveMine() : tryMine();
```

(`delveFloorNow()`는 지하 층에 있을 때만 0보다 크고, 그때 `atMine`은 항상 true다.)

`js/game.js:2622` `getGameState()`의 `playerPos` 줄을 바꾼다(지하 층 좌표 x=-400 을 저장하면 새로고침 때 허공에 선다):

```js
  gameState.playerPos = atNeighbor ? neighborReturnPos() : atDream ? dreamReturnPos() : delveFloorNow() > 0 ? { x: MINE_GATE.x, z: MINE_GATE.z + 2 } : { x: player.position.x, z: player.position.z };
```

연결 테스트에 추가(`tests/delve-wiring.test.mjs`, Step 1 테스트 블록 안):

```js
  assert.match(src, /delveFloorNow\(\) > 0 \? \{ x: MINE_GATE\.x, z: MINE_GATE\.z \+ 2 \}/);
```

`js/game.js:7478` `export {` 목록에 `todayStr, situation`이 없으면 추가. `$w` getter 묶음(`js/game.js:262` 근처)에 `firstHintBanner`가 없으면 추가:

```js
  get firstHintBanner() { return firstHintBanner; },
```

`js/spaces/mine.js` import에 추가:

```js
import { delveFloorNow, placeLift } from './delve.js';
```

`js/spaces/mine.js:187`:

```js
    rock.visible = atMine && delveFloorNow() === 0 && !ud.depleted;
```

`js/spaces/mine.js` `buildMine()`의 광맥 배치 `for` 다음 줄:

```js
  placeLift();
```

`js/spaces/doors.js` import에 `import { delvePrompt, delveFloorNow } from './delve.js';` 추가, 242~243을 바꾼다:

```js
  } else if (atMine) {
    const dp = delvePrompt();
    if (dp) { nd = dp.nd; prompt = dp.prompt; }
    else if (delveFloorNow() === 0 && dist2D({ x: MINE.x, z: MINE.z - MINE_HALF }, player.position) < 1.7) { nd = 'mineexit'; prompt = '🚪 나가기'; }
```

- [ ] **Step 6: 테스트**

Run: `npm test 2>&1 | tail -8`
Expected: 새 테스트 PASS, 실패 수 = 기준선. 순환 import 검사(`tools/refactor/` verify)가 있으면 `js/spaces/delve.js`가 모듈 최상위에서 game.js 값을 읽지 않는지 확인(전부 함수 안에서만 사용).

- [ ] **Step 7: 실제 브라우저 확인**

프리뷰 `?dbg=1&weather=clear` → 게스트 진입 → 콘솔 `__gs().delve = { ...__gs().delve, started: true, stage: 1 }` → `__tp(-14, 5)` 후 동굴 입장 → 승강기 앞 "🛗 승강기 타기" → 1층.
확인 목록: 사다리가 도착점 반대편(북쪽 절반)에 생김 · 바위 5개 안에 사다리 · 광맥 조각을 밟으면 가방 +1 · 같은 날 같은 층 다시 오면 광맥에서 조각 없음 · "🪜 올라가기"로 0층 복귀 · 콘솔 오류 0.

- [ ] **Step 8: 커밋**

```bash
git add js/spaces/delve.js js/data/places.js js/game.js js/spaces/mine.js js/spaces/doors.js tests/delve-wiring.test.mjs
git commit -m "feat(delve): underground floors, mining, ladder, pests runtime"
```

---

### Task 9: ⛏️ 광부 아저씨 · 퀘스트 카드 · 자동 시작

**Files:**
- Create: `js/delve/miner.js`
- Modify: `js/spaces/npc.js:786`, `js/spaces/delve.js`, `js/spaces/mine.js`(`enterMine`)
- Test: `tests/delve-rules.test.mjs`, `tests/delve-wiring.test.mjs`

**Interfaces:**
- Consumes: `stepView`, `claimStep`
- Produces:
  - `makeMiner(): Group`(A안, `sims/miner-npc-compare.html` `minerA` 치수)
  - `minerCard(delve, inv, inCave: boolean): null | { id: 'delve_miner', name: '광부 아저씨', title, desc, how, progress, target, ready }`
  - `shouldStartLine(delve, tutorialDone: boolean): boolean`

- [ ] **Step 1: 실패하는 테스트**

`js/delve/miner.js`는 `three`를 import해 노드 테스트에서 못 불러오므로, 카드·시작 조건은 Three 없는 `js/delve/miner-card.js`에 두고 조형만 `js/delve/miner.js`에 둔다.

`tests/delve-rules.test.mjs`:

```js
import { minerCard, shouldStartLine } from '../js/delve/miner-card.js';

test('광부 카드는 동굴 안에서만, 시작 전·완주 후엔 없음', () => {
  const d = { ...defaultDelve(), started: true };
  assert.equal(minerCard(d, { coal: 1 }, false), null);
  const c = minerCard(d, { coal: 1 }, true);
  assert.equal(c.id, 'delve_miner');
  assert.equal(c.name, '광부 아저씨');
  assert.equal(c.progress, 1);
  assert.equal(c.target, 3);
  assert.equal(minerCard(defaultDelve(), {}, true), null);
  assert.equal(minerCard({ ...d, stage: 8 }, {}, true), null);
});

test('라인은 튜토리얼이 끝난 뒤, 한 번만 시작', () => {
  assert.equal(shouldStartLine(defaultDelve(), false), false);
  assert.equal(shouldStartLine(defaultDelve(), true), true);
  assert.equal(shouldStartLine({ ...defaultDelve(), started: true }, true), false);
});
```

`tests/delve-wiring.test.mjs`:

```js
test('퀘스트 패널에 광부 카드가 합쳐진다(동굴 안에서만)', () => {
  assert.match(src, /minerCard\(gameState\.delve, gameState\.inventory, atMine\)/);
  assert.match(src, /shouldStartLine\(gameState\.delve/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test 2>&1 | grep -E "^not ok|# fail" | head`
Expected: 새 테스트 FAIL

- [ ] **Step 3: `js/delve/miner-card.js`**

```js
import { stepView } from './rules.js';

export function minerCard(delve, inv, inCave) {
  if (!inCave) return null;
  const v = stepView(delve, inv);
  if (!v) return null;
  return { id: 'delve_miner', name: '광부 아저씨', title: `⛏️ ${v.title}`, desc: v.desc, how: '⛏️ 동굴 0층 승강기 옆 광부 아저씨에게 가요', progress: v.progress, target: v.target, ready: v.ready };
}

export function shouldStartLine(delve, tutorialDone) {
  return tutorialDone && !delve.started;
}
```

- [ ] **Step 4: `js/delve/miner.js`(조형)**

```js
import * as THREE from 'three';

const clayMat = (color, flat = true) => new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0, flatShading: flat });
const glowMat = (color, k) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, roughness: 0.4 });

export function makeMiner() {
  const g = new THREE.Group();
  const add = (m, x, y, z) => { m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
  add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), clayMat(0x6b7448, false)), 0, 0.55, 0).scale.set(1, 1.05, 1);
  add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 1), clayMat(0xf3d5b5, false)), 0, 1.15, 0);
  const eye = new THREE.MeshStandardMaterial({ color: 0x3a2f2a, roughness: 0.6 });
  [-0.13, 0.13].forEach(x => add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eye), x, 1.18, 0.32));
  const helm = 0x41556b;
  add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), clayMat(helm, false)), 0, 1.3, 0);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.04, 18), clayMat(helm, false)), 0, 1.31, 0.02);
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.07, 12), clayMat(0x2a2a2e, false)), 0, 1.6, 0.31).rotation.x = Math.PI / 2 - 0.8;
  add(new THREE.Mesh(new THREE.CircleGeometry(0.052, 14), glowMat(0xfff2b0, 1.6)), 0, 1.627, 0.338).rotation.x = -0.8;
  add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), clayMat(0x4a3628, false)), 0, 1.06, 0.33).scale.set(1.5, 0.45, 0.6);
  [-0.2, 0.2].forEach(x => add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), clayMat(0x8a8078, false)), x, 1.08, 0.3).scale.set(1, 0.6, 0.4));
  add(new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.045, 6, 20), clayMat(0x8a5a2e, false)), 0, 0.62, 0).rotation.set(Math.PI / 2, 0.5, 0);
  const pick = new THREE.Group(); pick.position.set(0.38, 1.0, -0.22); pick.rotation.set(0.3, 0, -0.6); g.add(pick);
  pick.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.1, 6), clayMat(0x7a5232)));
  [-1, 1].forEach(s => { const c = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.36, 5), clayMat(0x3e3b3a)); c.rotation.z = -s * (Math.PI / 2 + 0.25); c.position.set(s * 0.17, 0.52, 0); pick.add(c); });
  return g;
}
```

- [ ] **Step 5: 연결**

`js/spaces/npc.js` import: `import { minerCard } from '../delve/miner-card.js';`, game.js import 목록에 `atMine` 추가. 786을 바꾼다:

```js
  const views = [...npcObjs.map(questView), onboardView(gameState.progress?.orchardQuest), minerCard(gameState.delve, gameState.inventory, atMine)].filter(Boolean);
```

`js/spaces/delve.js` import에 `stepView, claimStep`(rules), `import { makeMiner } from '../delve/miner.js';` 추가 후:

```js
let minerMesh = null;
function placeMiner() {
  if (minerMesh) return;
  minerMesh = makeMiner();
  minerMesh.position.set(MINE.x + 3.2, FLOOR_Y, MINE.z - MINE_HALF + 4.2);
  minerMesh.rotation.y = 0.4;
  scene.add(minerMesh);
}
```

`placeLift()` 끝에 `placeMiner();` 추가. `delvePrompt()`의 `if (!run) {` 블록 맨 앞에:

```js
    if (minerMesh && dist2D(minerMesh.position, player.position) < 1.8) {
      const v = stepView(gameState.delve, gameState.inventory);
      if (v?.ready) return { nd: 'delve_miner_claim', prompt: '⛏️ 광부 아저씨 · 받기' };
      if (v) return { nd: 'delve_miner_talk', prompt: '⛏️ 광부 아저씨' };
    }
```

`handleDelveDoor()` 맨 앞에:

```js
  if (nd === 'delve_miner_talk') {
    const v = stepView(gameState.delve, gameState.inventory);
    if (v) ui.toast?.(`⛏️ ${v.desc} (${v.progress}/${v.target})`);
    return true;
  }
  if (nd === 'delve_miner_claim') {
    const c = claimStep(gameState.delve, gameState.inventory);
    if (!c) return true;
    gameState.delve = c.delve;
    Object.assign(gameState.inventory, c.inv);
    grantMinerReward(c.reward);
    refreshInventoryUI();
    ui.toast?.('⛏️ 고맙네! 다음 일을 부탁하지');
    trackEvent('delve_step', { step: c.stepId, stage: c.delve.stage });
    $w.refreshQuestPanel?.();
    return true;
  }
```

같은 파일에 보상 훅(꾸미기·장식 실제 지급은 Task 12에서 채운다):

```js
function grantMinerReward(reward) {
  if (reward.cosmetic) $w.grantCosmetic?.(reward.cosmetic);
  if (reward.decor) $w.grantDecor?.(reward.decor);
}
```

`js/spaces/mine.js` import: `import { shouldStartLine } from '../delve/miner-card.js';`, `enterMine()`의 `trackEvent('enter_mine');` 다음 줄:

```js
  if (shouldStartLine(gameState.delve, !ui.coachActive?.())) { gameState.delve = { ...gameState.delve, started: true }; $w.refreshQuestPanel?.(); }
```

`$w`에 `refreshQuestPanel` getter가 없으면 game.js `$w` 묶음에 `get refreshQuestPanel() { return refreshQuestPanel; },` 추가.

- [ ] **Step 6: 테스트**

Run: `npm test 2>&1 | tail -8`
Expected: PASS, 실패 수 = 기준선

- [ ] **Step 7: 브라우저 확인**

게스트 → 튜토리얼 건너뛰기 → 동굴 입장 → 패널 맨 위 "⛏️ 갱도 다시 열기 0/3" · 마을로 나가면 카드 사라짐 · localhost `?give=coal:3` → 광부 앞 "⛏️ 광부 아저씨 · 받기" → 석탄 3 차감 · 승강기 "🛗 승강기 타기"로 바뀜.

- [ ] **Step 8: 커밋**

```bash
git add js/delve/miner.js js/delve/miner-card.js js/spaces/npc.js js/spaces/delve.js js/spaces/mine.js js/game.js tests/delve-rules.test.mjs tests/delve-wiring.test.mjs
git commit -m "feat(delve): miner npc, separate quest card, auto start"
```

---

### Task 10: 안내 · 액션 아이콘 · 공통 배너 · 이모지 말풍선 · 빛 자국

**Files:**
- Modify: `index.html:3548-3549`(`doorIcon` 첫 줄), `js/spaces/delve.js`
- Test: `tests/delve-wiring.test.mjs`

- [ ] **Step 1: 실패하는 테스트**

```js
test('액션 아이콘: 톡 치기 ❗ · 굴 파기 ⛏️ · 미끼 던지기 🍄 · 승강기 🛗 · 내려가기/올라가기 🪜', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const [word, ico] of [['톡 치기', '❗'], ['굴 파기', '⛏️'], ['미끼 던지기', '🍄'], ['승강기', '🛗'], ['내려가기', '🪜'], ['올라가기', '🪜']]) {
    assert.ok(html.includes(`t.includes('${word}') ? '${ico}'`), word);
  }
  const first = html.indexOf("t.includes('미끼 던지기')"), fishing = html.indexOf("t.includes('던지기') || t.includes('기다리는')");
  assert.ok(first > 0 && first < fishing, '미끼 던지기 판정이 낚시 던지기보다 먼저');
});

test('공통 배너는 1층 첫 진입, 빛 자국은 등불벌레가 굴에 넣을 때', () => {
  assert.match(src, /delve_common/);
  assert.match(src, /makeTrail\(/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/delve-wiring.test.mjs`
Expected: FAIL

- [ ] **Step 3: `index.html` `doorIcon` 첫 줄 교체**

기존:

```js
        doorIcon = t.includes('비료') ? '🌱' : t.includes('주문판') ? '📋'
```

새로:

```js
        doorIcon = t.includes('톡 치기') ? '❗' : t.includes('굴 파기') ? '⛏️' : t.includes('미끼 던지기') ? '🍄' : t.includes('승강기') ? '🛗'
          : t.includes('내려가기') ? '🪜' : t.includes('올라가기') ? '🪜'
          : t.includes('비료') ? '🌱' : t.includes('주문판') ? '📋'
```

- [ ] **Step 4: `js/spaces/delve.js`**

import에 `emojiBubble, makeTrail` 추가.

`enterFloor` 끝:

```js
  if (floor === 1) $w.firstHintBanner?.('delve_common', PEST_COPY.common.ico, PEST_COPY.common.title, PEST_COPY.common.line);
```

`updateDelve` 방해꾼 반복의 위치 갱신(`p.art.g.visible = ...`) 다음:

```js
    const want = pest.state === 'carry' ? '💎' : pest.state === 'flee' ? '❗' : pest.state === 'eat' ? '😋' : null;
    if (p.bubbleTxt !== want) {
      if (p.bubble) group.remove(p.bubble);
      p.bubble = want ? emojiBubble(want, 0.9) : null;
      if (p.bubble) group.add(p.bubble);
      p.bubbleTxt = want;
    }
    if (p.bubble) p.bubble.position.set(p.art.g.position.x, p.art.g.position.y + 1.6, p.art.g.position.z);
```

`stash` 처리의 `if (pest.kind === 'grub') run.stash.push(c);`를 바꾼다:

```js
        if (c && pest.kind === 'grub') {
          run.stash.push(c);
          if (!run.trail) {
            const pts = [];
            for (let k = 0; k <= 8; k++) pts.push([DELVE.x + pest.spawn.x + (pest.home.x - pest.spawn.x) * k / 8, DELVE.z + pest.spawn.z + (pest.home.z - pest.spawn.z) * k / 8]);
            run.trail = makeTrail(pts); run.trail.position.y = FLOOR_Y; group.add(run.trail);
          }
        }
```

- [ ] **Step 5: 테스트 + 커밋**

Run: `npm test 2>&1 | tail -5` → PASS

```bash
git add index.html js/spaces/delve.js tests/delve-wiring.test.mjs
git commit -m "feat(delve): guidance banners, action icons, emoji bubbles, glow trail"
```

---

### Task 11: 10·20층 보물상자 · 완주 후 하루 일감 카드

**Files:**
- Modify: `js/spaces/delve.js`, `js/delve/miner-card.js`
- Test: `tests/delve-rules.test.mjs`, `tests/delve-wiring.test.mjs`

**Interfaces:**
- Consumes: `rollChest(seed)`, `chestGive(loot, {unlocked})`(js/boat-chest.js), `makeChestMesh({ wood, buoy })`(js/boat-chest-art.js), `noteChest`, `jobFor`, `hashSeed`
- Produces: `jobCard(delve, inv, inCave, date, progress): null | card`(miner-card.js)

- [ ] **Step 1: 실패하는 테스트**

`tests/delve-rules.test.mjs`:

```js
import { jobCard } from '../js/delve/miner-card.js';

test('완주 후에만 동굴 안에서 하루 일감 카드', () => {
  const done = { ...defaultDelve(), started: true, stage: 8 };
  assert.equal(jobCard({ ...done, stage: 7 }, {}, true, '2026-10-25', 0), null);
  assert.equal(jobCard(done, {}, false, '2026-10-25', 0), null);
  const c = jobCard(done, {}, true, '2026-10-25', 1);
  assert.equal(c.id, 'delve_job');
  assert.equal(c.progress, 1);
  assert.equal(jobCard({ ...done, jobDate: '2026-10-25' }, {}, true, '2026-10-25', 0), null);
});
```

`tests/delve-wiring.test.mjs`:

```js
test('상자는 보물상자 규칙(rollChest·chestGive) 재사용, 열면 noteChest', () => {
  assert.match(src, /rollChest\(/);
  assert.match(src, /chestGive\(/);
  assert.match(src, /noteChest\(gameState\.delve, run\.floor\)/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test 2>&1 | grep -E "^not ok" | head`
Expected: 새 테스트 FAIL

- [ ] **Step 3: `js/delve/miner-card.js`에 추가**

```js
import { jobFor } from './rules.js';

export function jobCard(delve, inv, inCave, date, progress) {
  if (!inCave || delve.stage < 8 || delve.jobDate === date) return null;
  const j = jobFor(date);
  const desc = j.kind === 'ore' ? `⛏️ 지하 ${j.floorMin}층 이하에서 광석 ${j.n}개` : `🐛 굴에서 되찾기 ${j.n}번`;
  return { id: 'delve_job', name: '광부 아저씨', title: '⛏️ 오늘의 갱도 일감', desc, how: '⛏️ 끝나면 광부 아저씨에게 가요', progress: Math.min(progress, j.n), target: j.n, ready: progress >= j.n };
}
```

(첫 줄 import를 `import { stepView, jobFor } from './rules.js';`로 합친다.)

- [ ] **Step 4: `js/spaces/delve.js` 상자·일감**

import:

```js
import { rollChest, chestGive } from '../boat-chest.js';
import { makeChestMesh } from '../boat-chest-art.js';
import { noteChest, jobFor, hashSeed } from '../delve/rules.js';
import { jobCard } from '../delve/miner-card.js';
```

`enterFloor` 끝:

```js
  run.chest = null;
  if (DELVE_CHEST_FLOORS.includes(floor) && !gameState.delve.chests[floor]) {
    const mesh = makeChestMesh({ buoy: false });
    const at = { x: Math.max(-DELVE_HALF + 1.5, Math.min(DELVE_HALF - 1.5, layout.ladderAt.x - 1.6)), z: layout.ladderAt.z };
    mesh.position.copy(W(at.x, at.z)); mesh.position.y = FLOOR_Y; group.add(mesh);
    run.chest = { at, mesh };
  }
```

일감 진행은 층을 나가도 유지돼야 하므로 모듈 변수로 둔다(`js/spaces/delve.js` 위쪽 `let` 묶음):

```js
let jobToday = { date: null, n: 0 };
const bumpJob = () => { const d = todayStr(); jobToday = jobToday.date === d ? { date: d, n: jobToday.n + 1 } : { date: d, n: 1 }; };
export function delveJobProgress() { return jobToday.date === todayStr() ? jobToday.n : 0; }
```

`delvePrompt()`의 `run` 분기, 사다리 판정 다음:

```js
  if (run.chest && near(run.chest.at, 1.6)) return { nd: 'delve_chest', prompt: '🧰 상자 열기' };
```

`handleDelveDoor()`:

```js
  if (nd === 'delve_chest') {
    const loot = chestGive(rollChest(hashSeed(`delvechest:${todayStr()}:${run.floor}`)), { unlocked: false });
    for (const [k, v] of Object.entries(loot.give)) gameState.inventory[k] = (gameState.inventory[k] || 0) + v;
    group.remove(run.chest.mesh); run.chest = null;
    gameState.delve = noteChest(gameState.delve, run.floor);
    refreshInventoryUI();
    ui.toast?.(`🧰 ${loot.name}`);
    trackEvent('delve_chest', { floor: run.floor, loot: loot.id });
    $w.refreshQuestPanel?.();
    return true;
  }
```

일감 진행: `pickUp()` 끝에

```js
  const j = jobFor(todayStr());
  if (gameState.delve.stage >= 8 && j.kind === 'ore' && run.floor >= j.floorMin) bumpJob();
```

`delve_dig` 처리의 `return true;` 바로 위에:

```js
    if (gameState.delve.stage >= 8 && jobFor(todayStr()).kind === 'reclaim') bumpJob();
```

광부 프롬프트(`delvePrompt()`의 광부 블록) 맨 앞에 일감 완료 분기:

```js
      if (jobCard(gameState.delve, gameState.inventory, true, todayStr(), delveJobProgress())?.ready) return { nd: 'delve_job_claim', prompt: '⛏️ 광부 아저씨 · 받기' };
```

`handleDelveDoor()` 맨 앞에:

```js
  if (nd === 'delve_job_claim') {
    const jc = jobCard(gameState.delve, gameState.inventory, true, todayStr(), delveJobProgress());
    if (jc?.ready) {
      gameState.delve = { ...gameState.delve, jobDate: todayStr() };
      gameState.inventory.gem = (gameState.inventory.gem || 0) + 1;
      gameState.inventory.crystal = (gameState.inventory.crystal || 0) + 1;
      refreshInventoryUI(); ui.toast?.('⛏️ 오늘 일감 끝! 💎 +1 · 🔮 +1');
      trackEvent('delve_step', { step: 'job', stage: 8 });
      $w.refreshQuestPanel?.();
    }
    return true;
  }
```

`js/spaces/npc.js` import에 `import { minerCard, jobCard } from '../delve/miner-card.js';`·`import { delveJobProgress } from './delve.js';`(game.js import 목록에 `todayStr` 추가) 후 786을 바꾼다:

```js
  const views = [...npcObjs.map(questView), onboardView(gameState.progress?.orchardQuest), minerCard(gameState.delve, gameState.inventory, atMine), jobCard(gameState.delve, gameState.inventory, atMine, todayStr(), delveJobProgress())].filter(Boolean);
```

- [ ] **Step 5: 테스트 + 커밋**

Run: `npm test 2>&1 | tail -5` → PASS

```bash
git add js/spaces/delve.js js/delve/miner-card.js js/spaces/npc.js tests/delve-rules.test.mjs tests/delve-wiring.test.mjs
git commit -m "feat(delve): floor 10/20 chests and post-line daily job"
```

---

### Task 12: 광부 보상 지급(헤드램프 꾸미기 · 광산 수레 장식) · 영어 사전

**Files:**
- Modify: 꾸미기 카탈로그·소유 처리(`js/cosmetics/`), 야외 장식 카탈로그, `js/game.js`(`$w.grantCosmetic`, `$w.grantDecor`), `js/i18n-en.js`
- Test: `tests/delve-wiring.test.mjs`, `node scripts/i18n_check.mjs`

- [ ] **Step 1: 지급 구조 확인**

Run:

```bash
grep -n "^export" js/cosmetics/*.js | head -30
grep -rn "outdoorDecor\|OUTDOOR_DECOR\|decorInv" js/data/*.js js/game.js | head -20
```

Expected: 무료 지급이 가능한 꾸미기 소유 함수(예: `buy`가 아닌 직접 소유 추가)와 야외 장식 인벤 키. 이 이름으로 Step 2를 쓴다. 기존 무료 보상 선례(친구 추천 보상 `referral`의 꾸미기 지급)가 있으면 그 경로를 그대로 쓴다: `grep -rn "referral" js/*.js | grep -i "grant\|own"`.

- [ ] **Step 2: 실패하는 테스트**

```js
test('광부 보상 두 개가 실제 카탈로그와 지급 훅에 연결된다', () => {
  assert.match(src, /miner_lamp/);
  assert.match(src, /mine_cart/);
  assert.match(src, /get grantCosmetic\(\)/);
  assert.match(src, /get grantDecor\(\)/);
});
```

- [ ] **Step 3: 구현**

Step 1에서 찾은 구조로: 꾸미기 카탈로그에 `miner_lamp`(머리 착용, A안 헬멧+헤드램프 축소판, 판매 안 함), 야외 장식 카탈로그에 `mine_cart`(`sims/miner-npc-compare.html`의 `minerC` 수레 조형, 판매 안 함)를 추가하고, `js/game.js` `$w` 묶음에 지급 함수 getter 두 개를 추가한다. 🚨 새 id는 옛 클라이언트가 세이브에서 지우므로 4곳 동시 배포 목록에 적는다(`cave-delve-context.md`).

- [ ] **Step 4: 영어 사전**

`js/i18n-en.js`에 추가(키 = 한국어 원문 그대로):

```js
  '조각 도둑': 'Bit thieves',
  '가방은 안전해요. 조각만 노려요': 'Only dropped bits get taken. Your bag is safe',
  '동굴 도롱뇽': 'Cave axolotl',
  '웅덩이 아가미를 톡 치면 뱉어요': 'Tap the gills in the puddle!',
  '수정집게': 'Crystal crab',
  '먹보예요. 🍄 미끼를 던져요': 'A glutton. Toss bait 🍄',
  '잎귀박쥐': 'Leaf-eared bat',
  '반짝이면 툭! 조각은 바로 주워요': 'Snatches shiny bits. Grab them fast',
  '등불벌레': 'Lamp grub',
  '놓쳐도 OK. 빛 자국 끝 굴로': 'Lost it? Follow the glow',
  '❗ 톡 치기': '❗ Tap', '🍄 미끼 던지기': '🍄 Toss bait', '⛏️ 굴 파기': '⛏️ Dig',
  '🛗 승강기 타기': '🛗 Take the lift', '🛗 승강기 고장': '🛗 Lift broken',
  '🪜 올라가기': '🪜 Go up', '🪜 내려가기': '🪜 Go down', '🪜 가장 깊은 곳': '🪜 The very bottom',
  '🧰 상자 열기': '🧰 Open chest',
  '⛏️ 광부 아저씨': '⛏️ Miner', '⛏️ 광부 아저씨 · 받기': '⛏️ Miner · Claim', '광부 아저씨': 'Miner',
  '🪜 아래로 가는 길이 보여요': '🪜 A way down appeared',
  '가까운 바위가 없어요 ⛏️': 'No rock nearby ⛏️',
  '⛏️ 광부 아저씨에게 석탄 3개를 가져다줘요': '⛏️ Bring 3 coal to the Miner',
  '⛏️ 고맙네! 다음 일을 부탁하지': '⛏️ Thanks! Here is the next job',
  '🪜 여기가 가장 깊은 곳이에요': '🪜 This is the very bottom',
  '⛏️ 오늘의 갱도 일감': "⛏️ Today's mine job",
  '⛏️ 오늘 일감 끝! 💎 +1 · 🔮 +1': '⛏️ Job done! 💎 +1 · 🔮 +1',
  '⛏️ 동굴 0층 승강기 옆 광부 아저씨에게 가요': '⛏️ Visit the Miner by the lift on cave floor 0',
  '⛏️ 끝나면 광부 아저씨에게 가요': '⛏️ Report to the Miner when done',
  '🔮수정': '🔮Crystal', '수정': 'Crystal',
  '갱도 다시 열기': 'Reopen the shaft', '⚫ 석탄 3개 가져다주기': '⚫ Bring 3 coal',
  '웅덩이 속 도둑': 'Thief in the puddle', '🦎 웅덩이 아가미 톡 치기': '🦎 Tap the gills in a puddle',
  '첫 정류장': 'First stop', '🪜 지하 5층까지 내려가기': '🪜 Reach floor B5',
  '먹보 달래기': 'Feed the glutton', '🍄 수정집게에게 미끼 던지기': '🍄 Toss bait to a crystal crab',
  '10층 보물상자': 'Floor 10 chest', '🧰 지하 10층 상자 열기': '🧰 Open the B10 chest',
  '반짝이 사수': 'Guard the shine', '🦇 박쥐 앞에서 조각 바로 줍기 3번': '🦇 Grab bits before a bat 3 times',
  '빛을 따라': 'Follow the light', '🐛 굴에서 조각 되찾기': '🐛 Reclaim bits from a burrow',
  '바닥까지': 'All the way down', '🪜 지하 20층까지 내려가기': '🪜 Reach floor B20',
```

`⛏️ 지하 ${n}층 이하에서 광석 ${n}개`·`🐛 굴에서 되찾기 ${n}번`처럼 숫자가 들어간 문구는 이 저장소의 조합 문구 규칙(i18n `{0}` 자리표시)을 따른다: `js/i18n.js`에서 기존 `{0}` 사용 예를 찾아(`grep -n "{0}" js/i18n-en.js | head -3`) 같은 방식으로 키를 만든다.

Run: `node scripts/i18n_check.mjs`
Expected: 누락 0

- [ ] **Step 5: 테스트 + 커밋**

Run: `npm test 2>&1 | tail -5` → PASS

```bash
git add -A js tests
git commit -m "feat(delve): miner rewards and english copy"
```

---

### Task 13: 검증 · 캡처 · 드로우콜 · 리뷰 · dev docs

**Files:**
- Modify: `dev/active/cave-delve/mockup/capture.mjs`(목업 장면 → 실제 구현 장면)
- Modify: `dev/active/cave-delve/cave-delve-context.md`, `cave-delve-tasks.md`

- [ ] **Step 1: 전체 테스트**

Run: `npm test 2>&1 | tail -5`
Expected: 실패 수 = 기준선

- [ ] **Step 2: 캡처 스크립트를 실제 장면으로 교체**

`capture.mjs`의 `SETUP` 이후 각 장면을 실제 함수로 만든다: `__gs().delve = {...stage:8...}` → `(await import('/js/spaces/delve.js')).enterFloor(4, 'lift')` 등. 장면: 0층 승강기·광부, 1층 도착(사다리 반대편), 4층 도롱뇽 톡 프롬프트, 4층 수정집게 미끼 프롬프트, 12층 박쥐 노란 원, 16층 등불벌레 빛 자국·굴 파기, 10층 상자. 기기: PC 1280×800, 폰 375×812, 폰 320×640.

Run: `node dev/active/cave-delve/mockup/capture.mjs <포트>`
Expected: 모든 장면 `lineLines:1`, 겹침 `true` 0건. PNG를 직접 열어 확인: 방해꾼이 보이고, 안내가 읽히고, 사다리가 입구 반대편.

- [ ] **Step 3: 드로우콜**

프리뷰에서 0층과 지하 12층(방해꾼 2마리) 각각 `__perf().calls`. 기준: 지하 층 ≤ 0층 실측. 넘으면 `pest-art.js` 방해꾼을 `js/visitor-art.js`의 `bake()` 방식(정점색 2덩어리)으로 구워 종당 2~3콜로 줄인다.

- [ ] **Step 4: 코드 리뷰**

`code-reviewer` 에이전트로 `git diff origin/main...HEAD` 검토 → CRITICAL·HIGH 수정 → 테스트 재실행.

- [ ] **Step 5: dev docs 갱신 + 커밋**

`cave-delve-context.md`: Last Updated, 구현 완료 상태, 배포 대기, 4곳 동시 배포 목록(저장 칸 `delve`, 꾸미기 `miner_lamp`, 장식 `mine_cart`, 인벤 `crystal`). `cave-delve-tasks.md` 체크.

```bash
git add -A
git commit -m "test(delve): capture verification and docs"
```

- [ ] **Step 6: 배포 준비 메모(실행하지 않음)**

dev docs에: 4곳 동시 배포 + iOS 같은 날 심사, 배포 다음 날 BigQuery 확인 쿼리(`delve_enter`·`delve_floor`·`pest_counter`·`delve_step`·`delve_chest` 일별 건수), 공지 초안(토스 출시 후).
