# 포구 섬 + 길 안내 1단계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 부엌 서식지를 완성한 플레이어가 마을 바다터 후미의 통배 부두에서 배를 타고, 바다에서 낚시하며 포구 섬에 가서 주민 의뢰로 식재료를 모아 오게 한다. 첫 방문은 12단계 길 안내가 끝까지 데려간다.

**Architecture:** 판정(낚시 확률, 의뢰 진행, 창고, 저장 정규화, 길 안내 단계·경유점)은 DOM·Three.js 없는 순수 모듈(`js/port/rules.js`, `js/port/sail.js`, `js/port/card.js`, `js/guide/route.js`, `js/guide/runner.js`)에 두고 node 테스트로 고정한다. 섬은 새 공간 플래그를 만들지 않고, 잠수·갯벌처럼 바다 공간(`atSea`) 안의 하위 모드 `port.active` 로 둔다. 그러면 game.js 의 공간 등록 17곳을 건드리지 않는다. 조형은 시안 `sims/port-*.js` 를 `js/port/` 로 옮긴다.

**Tech Stack:** Three.js 0.160 (ES module, 번들러 없음, 배포 때 `scripts/lib/bundle-boot.mjs` 가 esbuild 로 `js/b/` 생성), node:test + node:assert/strict, GA4 `trackEvent`.

**Spec:** `docs/superpowers/specs/2026-10-31-restaurant-quest-design.md` (5·6·7·9·10절). 시안: `sims/port-island-sim.html`, `sims/port-npc-models.js`, `sims/port-shop-models.js`, `sims/icon-set/tub-boat.svg`, `sims/icon-set/buoy.svg`, `sims/port-entry-compare.html`(A안). dev docs: `dev/active/restaurant-port/`.

## Global Constraints

- 새 코드·CSS·테스트에 주석을 쓰지 않는다. 설명은 커밋 메시지와 dev docs 에 쓴다.
- 화면 문구에 엠대시(—)와 "놀다/놀아요"를 쓰지 않는다. 문구는 기획서 6.2 표와 시안의 확정본을 그대로 쓴다.
- 월드(머리 위) 말풍선은 이모지만. 글자 안내는 HUD 카드·대사 박스로.
- ⛵ 이모지 아이콘을 바꾸지 않는다(강 나룻배 `js/boat/boats.js:12`, `js/boat/result-card.js:6` 가 쓴다). 통배·부표는 새 아이콘 id `tub_boat`, `buoy`.
- 새 기능 코드는 `js/port/`, `js/guide/` 에. `game.js` 에는 진입·종료·분기 한 줄씩만.
- 잠금: 포구 섬은 `branch(s,'kitchen','habitat')`(카페와 같은 조건). 통배 부두는 바다터 잠금과 분리.
- GA4: 이벤트 파라미터 ≤5개, 코드 키 총량 ≤23(`tests/ga-param-split.test.mjs`), 새 이벤트는 `docs/analysis/event-taxonomy.csv` 에 행 추가(`tests/event-taxonomy.test.mjs`).
- 길 안내 원칙(기획서 6.1): 목표 하나, 화면 안이면 ⬇️+거리+금색 고리, 밖이면 가장자리 화살표+거리, 발밑 화살촉, 건물은 경유점으로 우회, 눌러야 할 때만 👆, 안내 중 무관한 버튼 숨김, 첫 낚시 입질 창 2.2초.
- 주민 대화는 광부와 같은 아래 대사 박스(`js/mirror/talk-box.js`). 대화 얼굴은 3D 모형 초상(`npcPortrait`). 의뢰 창 `#npc-modal` 은 쓰지 않는다.
- "커밋"만 지시받으면 푸시·병합·배포하지 않는다. 배포는 사용자 승인 뒤 5곳(웹·토스·Play·iOS·itch) 동시, `docs/ops/DEPLOY.md` 체크리스트대로.
- 공개 저장소다. 푸시 전 키 스캔을 한다.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `js/port/data.js` (새) | 섬 로컬 좌표·낚시터·어종표·의뢰 4개·창고 키·문구. 값만 |
| `js/port/rules.js` (새) | `defaultPort`, `sanitizePort`, `rollCatch`, `acceptQuest`, `pickItem`, `claimQuest`, `addToPantry`, `pantryUnits` |
| `js/port/sail.js` (새) | `steer`, `pushOutOfIsland`, `fastStep` |
| `js/port/card.js` (새) | `portCard`, `splitLines` |
| `js/guide/route.js` (새) | `waypoint`, `edgeArrow` |
| `js/guide/runner.js` (새) | `createGuide` |
| `js/guide/view.js` (새) | 금색 고리·발밑 화살촉·HUD 카드·⬇️·가장자리 화살표 |
| `js/port/models.js` (새) | `tubBoat`, `buildPortShops`(C2), `setPortNight` |
| `js/port/npc-models.js` (새) | `buildIslandNPC`, `netBuoy`, `beachBuoy`, `npcPortrait`, `setNpcNight`, `ISLAND_NPCS` |
| `js/port/pier.js` (새) | `spawnPortPier`, `nearPortPier`, `portPierBoat` |
| `js/port/index.js` (새) | `port` 상태와 진입·종료·갱신·카메라·액션·프롬프트·클램프 |
| `js/port/guide-steps.js` (새) | 12단계 정의 |
| `js/data/places.js` | `PORT`, `PORT_PIER` |
| `js/world/unlocks.js` | `cove`, `port` |
| `js/spaces/sea.js` | `spawnSeaGate` 를 `spawnSeaCove`/`spawnSeaGate` 로 분리, port 분기 |
| `js/spaces/doors.js` | 마을 `port_board`, 섬 안 프롬프트 |
| `js/game.js` | 부팅 빌더, 액션·이동·클램프 분기, 저장, `?port=1` |
| `js/spaces/npc.js` | 의뢰 패널에 `portCard` |
| `sims/icon-set/icons-toss.js`, `tools/icons/build-game-icons.mjs`, `js/icons/toss-icons*.js` | `tub_boat`, `buoy` |
| `docs/analysis/event-taxonomy.csv` | 새 이벤트 3개 |
| 테스트 | `tests/port-rules.test.mjs`, `tests/guide-route.test.mjs`, `tests/guide-runner.test.mjs`, `tests/port-wiring.test.mjs`, `tests/world-unlocks.test.mjs`(추가) |

**Supabase:** 1단계는 `game_saves.state` jsonb 안 `port` 필드만 쓴다. 키 CHECK 가 없고 크기 제한(524288바이트, `sql/migrations/migrate_security_size_caps.sql:12-14`)만 있어 마이그레이션이 필요 없다. 창고를 서버 진실 값으로 옮기는 일은 식당 1차(2단계)에서.

---

### Task 0: 겹치는 작업 확인

**Files:** 없음(조사만)

- [ ] **Step 1:** 온보딩 세션의 집 짓기 길 안내 코드를 확인한다.

Run: `git status --short js tests | grep -i guide; ls js | grep -i guide; git branch --list '*guide*' '*onboard*'`
Expected: `js/house-guide-rules.js` 외에 화살표·경유점 모듈이 이미 있으면 Task 2·3·12 의 `js/guide/` 를 그 위에 얹는다. 없으면 계획대로.

- [ ] **Step 2:** 결과를 `dev/active/restaurant-port/restaurant-port-context.md` "핵심 파일" 아래 한 줄로 적는다.

---

### Task 1: 포구 데이터와 판정 규칙

**Files:**
- Create: `js/port/data.js`, `js/port/rules.js`
- Test: `tests/port-rules.test.mjs`

**Interfaces:**
- Produces:
  - `PANTRY_KEYS`, `PANTRY_ICO`, `QUESTS`, `SEA_SPOTS`, `PIER_SPOT`, `SPOT_LEFT`, `CATCH`, `ROUTE`, `SEA_BOUNDS`, `ISLAND`, `ISLAND_R`, `WALK_R`, `LAND_Y`, `ISLAND_DOCK`, `PIER_END`, `VILLAGE_DOCK`, `MARKET_POS`, `HUT_POS`, `LIGHT_POS`, `SOLIDS`, `BOAT_SPEED`, `BOAT_TURN`, `FAST_MULT`, `BITE_FIRST`, `BITE_WIN`, `MARKET_PRICE`, `MARKET_GIVE`, `PORT_COPY` (좌표는 섬 로컬, 원점 = `PORT`)
  - `Port = { v:1, visited, fastUnlocked, guideDone, quests:{[id]:{state:'avail'|'active'|'done', got}}, pantry:{[k]:n}, boughtDay:string|null }`
  - `defaultPort(): Port`, `sanitizePort(raw): Port`, `rollCatch(zone, r): string`, `acceptQuest(port, id): Port`, `pickItem(port, id): Port`, `claimQuest(port, id): {port, reward}|null`, `addToPantry(port, items): Port`, `pantryUnits(port): number`

- [ ] **Step 1: 실패하는 테스트** `tests/port-rules.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PANTRY_KEYS, QUESTS, CATCH } from '../js/port/data.js';
import { defaultPort, sanitizePort, rollCatch, acceptQuest, pickItem, claimQuest, addToPantry, pantryUnits } from '../js/port/rules.js';

test('기본 상태는 의뢰 4개가 모두 대기, 창고는 0', () => {
  const p = defaultPort();
  assert.equal(p.v, 1);
  assert.deepEqual(Object.keys(p.quests), QUESTS.map(q => q.id));
  assert.ok(Object.values(p.quests).every(q => q.state === 'avail' && q.got === 0));
  assert.deepEqual(Object.keys(p.pantry), PANTRY_KEYS);
  assert.equal(pantryUnits(p), 0);
});

test('저장값 정규화: 모르는 키·음수·문자열·범위 밖은 버리거나 고친다', () => {
  const p = sanitizePort({ v: 1, visited: 'yes', fastUnlocked: true, quests: { fisher: { state: 'active', got: 9 }, ghost: { state: 'done', got: 1 } }, pantry: { fish: -3, squid: 4.7, gold: 99 }, boughtDay: 12 });
  assert.equal(p.visited, false);
  assert.equal(p.fastUnlocked, true);
  assert.equal(p.quests.fisher.got, 3);
  assert.equal(p.quests.ghost, undefined);
  assert.equal(p.quests.yatai.state, 'avail');
  assert.equal(p.pantry.fish, 0);
  assert.equal(p.pantry.squid, 4);
  assert.equal(p.pantry.gold, undefined);
  assert.equal(p.boughtDay, null);
  assert.deepEqual(sanitizePort(null), defaultPort());
});

test('어종 뽑기는 누적 확률표를 따른다', () => {
  assert.equal(rollCatch('near', 0.0), 'fish');
  assert.equal(rollCatch('near', 0.74), 'fish');
  assert.equal(rollCatch('near', 0.76), 'shrimp');
  assert.equal(rollCatch('far', 0.1), 'squid');
  assert.equal(rollCatch('far', 0.99), 'bigfish');
  assert.equal(rollCatch('night', 0.5), 'squid');
  for (const zone of Object.keys(CATCH)) assert.ok(Math.abs(CATCH[zone].reduce((a, [, w]) => a + w, 0) - 1) < 1e-9);
});

test('의뢰: 수락 → 줍기(need 까지만) → 보상, 순서를 어기면 그대로', () => {
  let p = defaultPort();
  assert.equal(pickItem(p, 'fisher').quests.fisher.got, 0);
  assert.equal(claimQuest(p, 'fisher'), null);
  p = acceptQuest(p, 'fisher');
  assert.equal(p.quests.fisher.state, 'active');
  for (let i = 0; i < 5; i++) p = pickItem(p, 'fisher');
  assert.equal(p.quests.fisher.got, 3);
  const r = claimQuest(p, 'fisher');
  assert.deepEqual(r.reward, { fish: 5, shrimp: 2 });
  assert.equal(r.port.quests.fisher.state, 'done');
  assert.equal(r.port.pantry.fish, 5);
  assert.equal(claimQuest(r.port, 'fisher'), null);
  assert.equal(p.quests.fisher.state, 'active');
});

test('창고 합계와 영업 회분(재료 8개 = 1회)', () => {
  const p = addToPantry(defaultPort(), { fish: 6, shrimp: 2, rice: 4 });
  assert.equal(p.pantry.fish, 6);
  assert.equal(pantryUnits(p), 1.5);
  assert.equal(addToPantry(p, { gold: 3 }).pantry.gold, undefined);
});
```

- [ ] **Step 2:** Run: `node --test tests/port-rules.test.mjs` / Expected: FAIL `Cannot find module '.../js/port/data.js'`

- [ ] **Step 3: `js/port/data.js`** (값은 시안 `sims/port-island-sim.html` 그대로)

```js
export const PANTRY_KEYS = ['fish', 'bigfish', 'squid', 'shrimp', 'clam', 'rice', 'veg'];
export const PANTRY_ICO = { fish: '🐟', bigfish: '🐠', squid: '🦑', shrimp: '🦐', clam: '🐚', rice: '🍚', veg: '🥬' };

export const ISLAND = { x: 44, z: 0 };
export const ISLAND_R = 20;
export const WALK_R = ISLAND_R - 0.8;
export const LAND_Y = 0.6;
export const VILLAGE_DOCK = { x: -25.5, z: 0 };
export const ISLAND_DOCK = { x: 20.6, z: 0 };
export const PIER_END = { x: 22.6, z: 0 };
export const ROUTE = [[-25.5, 0], [-18, -4.6], [-7, -0.5], [2, 5.2], [11, 1], [16, -3.6], [20.6, 0]];
export const SEA_BOUNDS = { x0: -26, x1: 28, z0: -24, z1: 24 };
export const MARKET_POS = { x: 32, z: -6 };
export const HUT_POS = { x: 29.6, z: 8 };
export const LIGHT_POS = { x: 60, z: -9 };
export const SOLIDS = [[MARKET_POS, 1.6], [HUT_POS, 1.9], [LIGHT_POS, 1.2]];

export const BOAT_SPEED = 6;
export const BOAT_TURN = 5;
export const FAST_MULT = 2.6;
export const BITE_FIRST = { delay: 1.4, win: 2.2 };
export const BITE_WIN = 0.9;
export const MARKET_PRICE = 30;
export const MARKET_GIVE = { rice: 2, veg: 2 };

export const SEA_SPOTS = [
  { at: [-17, -5], zone: 'near' }, { at: [-8, 6.5], zone: 'near' }, { at: [3, -6], zone: 'near' }, { at: [12, 6], zone: 'near' },
  { at: [-6, -17], zone: 'far' }, { at: [9, 18], zone: 'far' }, { at: [20, -16], zone: 'far' },
  { at: [-1, 13], zone: 'night' }, { at: [6, -13], zone: 'night' },
];
export const PIER_SPOT = { at: [19.6, -2.6], zone: 'pier' };
export const SPOT_LEFT = { near: 2, far: 3, night: 2, pier: 2 };
export const CATCH = {
  near: [['fish', 0.75], ['shrimp', 0.25]],
  far: [['squid', 0.45], ['fish', 0.3], ['bigfish', 0.25]],
  night: [['squid', 0.8], ['bigfish', 0.2]],
  pier: [['fish', 0.85], ['shrimp', 0.15]],
};

export const QUESTS = [
  { id: 'fisher', who: '수달 어부', pos: [31.2, 11.6], title: '떠내려간 부표 찾기', ask: '그물 부표가 동쪽 해변으로 떠내려갔어. 3개만 주워 줄래?', thanks: '고마워! 오늘 잡은 생선 나눠 줄게.', item: 'buoy', itemName: '부표', need: 3, spots: [[50, 17], [58, 12], [62, 4]], reward: { fish: 5, shrimp: 2 } },
  { id: 'yatai', who: '포장마차 너구리', pos: [34.6, -3.6], title: '어묵 국물용 조개', ask: '국물 낼 조개가 떨어졌네. 남쪽 갯바위에서 4개만 캐 와 줘.', thanks: '덕분에 국물 맛 살겠다! 넉넉히 캐 왔으니 조개 반은 가져가.', item: 'clam', itemName: '조개', need: 4, spots: [[31.5, 13.5], [33.5, 15.2], [35.5, 16.8], [38, 17.5]], reward: { rice: 3, clam: 3 } },
  { id: 'farm', who: '밭 할머니 염소', pos: [49.5, -12], title: '배추 뽑기 도와주기', ask: '아이고 허리야. 배추 3포기만 뽑아다 주겠니?', thanks: '아이고 고마워라. 넉넉히 가져가렴.', item: 'cabbage', itemName: '배추', need: 3, spots: [[52.5, -8.5], [55.5, -8.5], [52.5, -11.5], [55.5, -11.5]], reward: { veg: 5 } },
  { id: 'light', who: '등대지기 부엉이', pos: [57.6, -5.4], title: '등대 기름통 가져다주기', ask: '등불 기름이 다 됐어. 어부네 집 데크에 기름통이 있을 거야. 좀 가져다줄래?', thanks: '이제 배들이 길을 잃지 않겠군. 밤바다에서 잡은 오징어야.', item: 'oil', itemName: '기름통', need: 1, spots: [[32.4, 10.4]], reward: { squid: 3 }, night: true },
];

export const PORT_COPY = {
  board: '🛶 부두 끝에서 배 타기',
  home: '부두 끝에서 마을로 돌아가기',
  fastHome: '🗺️ 마을로 바로 가기',
  fastGo: '🗺️ 섬으로 바로 가기',
  nag: '조금만 더 부탁해.',
  sleep: ['쿨쿨…', '(밤에 다시 와 봐요)'],
  market: '코인 30으로 쌀 2·채소 2를 샀어요. 의뢰를 하면 더 많이 받아요.',
  arrive: '🗺️ 이제 마을 부두에서 포구 섬으로 바로 갈 수 있어요',
};
```

- [ ] **Step 4: `js/port/rules.js`**

```js
import { PANTRY_KEYS, QUESTS, CATCH } from './data.js';

const QUEST_BY_ID = new Map(QUESTS.map(q => [q.id, q]));
const STATES = new Set(['avail', 'active', 'done']);
const nat = v => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

export function defaultPort() {
  return {
    v: 1, visited: false, fastUnlocked: false, guideDone: false,
    quests: Object.fromEntries(QUESTS.map(q => [q.id, { state: 'avail', got: 0 }])),
    pantry: Object.fromEntries(PANTRY_KEYS.map(k => [k, 0])),
    boughtDay: null,
  };
}

export function sanitizePort(raw) {
  const base = defaultPort();
  if (!raw || typeof raw !== 'object') return base;
  const quests = Object.fromEntries(QUESTS.map(q => {
    const r = raw.quests?.[q.id];
    const state = STATES.has(r?.state) ? r.state : 'avail';
    return [q.id, { state, got: Math.min(q.need, nat(r?.got)) }];
  }));
  const pantry = Object.fromEntries(PANTRY_KEYS.map(k => [k, nat(raw.pantry?.[k])]));
  return {
    ...base,
    visited: raw.visited === true,
    fastUnlocked: raw.fastUnlocked === true,
    guideDone: raw.guideDone === true,
    quests, pantry,
    boughtDay: typeof raw.boughtDay === 'string' ? raw.boughtDay : null,
  };
}

export function rollCatch(zone, r) {
  const table = CATCH[zone] || CATCH.near;
  let acc = 0;
  for (const [kind, w] of table) { acc += w; if (r < acc) return kind; }
  return table[table.length - 1][0];
}

const withQuest = (port, id, q) => ({ ...port, quests: { ...port.quests, [id]: q } });

export function acceptQuest(port, id) {
  const q = port.quests[id];
  if (!q || q.state !== 'avail') return port;
  return withQuest(port, id, { state: 'active', got: 0 });
}

export function pickItem(port, id) {
  const q = port.quests[id], def = QUEST_BY_ID.get(id);
  if (!q || !def || q.state !== 'active' || q.got >= def.need) return port;
  return withQuest(port, id, { ...q, got: q.got + 1 });
}

export function addToPantry(port, items) {
  const pantry = { ...port.pantry };
  for (const [k, n] of Object.entries(items)) if (k in pantry) pantry[k] += nat(n);
  return { ...port, pantry };
}

export function claimQuest(port, id) {
  const q = port.quests[id], def = QUEST_BY_ID.get(id);
  if (!q || !def || q.state !== 'active' || q.got < def.need) return null;
  const done = withQuest(port, id, { ...q, state: 'done' });
  return { port: addToPantry(done, def.reward), reward: { ...def.reward } };
}

export function pantryUnits(port) {
  const total = Object.values(port.pantry).reduce((a, b) => a + b, 0);
  return Math.floor((total / 8) * 10) / 10;
}
```

- [ ] **Step 5:** Run: `node --test tests/port-rules.test.mjs` / Expected: PASS (5 tests)

- [ ] **Step 6: 커밋**

```bash
git add js/port/data.js js/port/rules.js tests/port-rules.test.mjs
git commit -m "feat(port): add port island data and pure rules"
```

---

### Task 2: 길 안내 경로 계산(경유점·가장자리 화살표)

**Files:**
- Create: `js/guide/route.js`
- Test: `tests/guide-route.test.mjs`

**Interfaces:**
- Produces:
  - `waypoint(me:{x,z}, tgt:{x,z,y?}, solids:[{x,z},number][], pad=0.6): {x,z,y?}` 직선이 장애물 원을 지나면 비켜 선 점, 아니면 `tgt` 그대로(같은 객체)
  - `edgeArrow(p:{x,y,inFront}, w, h, margin=26, topPad=24): {inside, x, y, deg}`

- [ ] **Step 1: 실패하는 테스트** `tests/guide-route.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { waypoint, edgeArrow } from '../js/guide/route.js';

test('막는 것이 없으면 목표를 그대로 가리킨다', () => {
  const t = { x: 10, z: 0 };
  assert.equal(waypoint({ x: 0, z: 0 }, t, [[{ x: 5, z: 5 }, 1]]), t);
});

test('직선 위의 건물은 옆으로 비켜 간다', () => {
  const w = waypoint({ x: 0, z: 0 }, { x: 10, z: 0 }, [[{ x: 5, z: 0.3 }, 1.5]]);
  assert.ok(Math.abs(w.z - 0.3) >= 1.5, `비켜 선 점 z=${w.z}`);
  assert.ok(Math.abs(w.x - 5) < 1e-9);
});

test('목표가 건물 반경 안이면 우회하지 않는다', () => {
  const t = { x: 5, z: 0.5 };
  assert.equal(waypoint({ x: 0, z: 0 }, t, [[{ x: 5, z: 0 }, 1.5]]), t);
});

test('화면 안이면 inside, 밖이면 가장자리에 붙고 방향각을 준다', () => {
  assert.deepEqual(edgeArrow({ x: 100, y: 100, inFront: true }, 560, 258), { inside: true, x: 100, y: 100, deg: 0 });
  const r = edgeArrow({ x: 900, y: 129, inFront: true }, 560, 258);
  assert.equal(r.inside, false);
  assert.ok(r.x <= 560 - 26 + 1e-9);
  assert.ok(Math.abs(r.deg) < 1);
  const back = edgeArrow({ x: 900, y: 129, inFront: false }, 560, 258);
  assert.ok(back.x < 280);
});
```

- [ ] **Step 2:** Run: `node --test tests/guide-route.test.mjs` / Expected: FAIL (모듈 없음)

- [ ] **Step 3: `js/guide/route.js`** (시안 `guideWaypoint`, `renderHud` 가장자리 계산을 순수 함수로)

```js
export function waypoint(me, tgt, solids, pad = 0.6) {
  const dx = tgt.x - me.x, dz = tgt.z - me.z, len = Math.hypot(dx, dz);
  if (len < 1e-3) return tgt;
  const ux = dx / len, uz = dz / len;
  for (const [c, r] of solids) {
    const cx = c.x - me.x, cz = c.z - me.z;
    const along = cx * ux + cz * uz;
    if (along <= 0 || along >= len) continue;
    const side = cx * uz - cz * ux;
    if (Math.abs(side) >= r) continue;
    if (Math.hypot(c.x - tgt.x, c.z - tgt.z) < r) continue;
    const s = side >= 0 ? -1 : 1;
    return { ...tgt, x: c.x + uz * s * (r + pad), z: c.z - ux * s * (r + pad) };
  }
  return tgt;
}

export function edgeArrow(p, w, h, margin = 26, topPad = 24) {
  const inside = p.inFront && p.x > margin && p.x < w - margin && p.y > margin + topPad && p.y < h - margin;
  if (inside) return { inside: true, x: p.x, y: p.y, deg: 0 };
  const cx = w / 2, cy = h / 2;
  let vx = p.x - cx, vy = p.y - cy;
  if (!p.inFront) { vx = -vx; vy = -vy; }
  const sx = (cx - margin) / Math.max(1e-3, Math.abs(vx));
  const sy = (cy - margin - 12) / Math.max(1e-3, Math.abs(vy));
  const s = Math.min(sx, sy);
  return { inside: false, x: cx + vx * s, y: cy + vy * s + 6, deg: (Math.atan2(vy, vx) * 180) / Math.PI };
}
```

검산(테스트 2): `ux=1, uz=0`, `side = cx*0 - 0.3*1 = -0.3` → `s=+1` → 비켜 선 점 `x = 5 + 0 = 5`, `z = 0.3 - 1*1*2.1 = -1.8` → `|z-0.3| = 2.1 ≥ 1.5`.

- [ ] **Step 4:** Run: `node --test tests/guide-route.test.mjs` / Expected: PASS (4 tests)

- [ ] **Step 5: 커밋**

```bash
git add js/guide/route.js tests/guide-route.test.mjs
git commit -m "feat(guide): add waypoint and edge arrow math"
```

---

### Task 3: 길 안내 진행기(단계·완료·기록)

**Files:**
- Create: `js/guide/runner.js`
- Test: `tests/guide-runner.test.mjs`

**Interfaces:**
- Produces:
  - `createGuide({ flow, steps, now, onStep, onDone })` → `{ total, index(), active(), current(), stop(), tick(ctx) }`
  - `Step = { id, text: string | (ctx)=>string, target:(ctx)=>{x,z,y?}|null, done:(ctx)=>boolean, expect?:string[], joy?:true }`
  - `onStep({ flow, step, ms })`: 단계를 마칠 때마다 한 번(`step` 은 1부터, `ms` 는 그 단계에 머문 시간). 한 tick 에 여러 단계가 끝나면 차례로 여러 번.

- [ ] **Step 1: 실패하는 테스트** `tests/guide-runner.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGuide } from '../js/guide/runner.js';

const make = () => {
  let t = 0; const log = []; let finished = 0;
  const g = createGuide({
    flow: 'port',
    steps: [
      { id: 'a', text: 'A', target: () => null, done: c => c.a },
      { id: 'b', text: c => `B ${c.n}`, target: () => ({ x: 1, z: 2 }), done: c => c.b, expect: ['go'] },
    ],
    now: () => t, onStep: e => log.push(e), onDone: () => finished++,
  });
  return { g, log, adv: ms => { t += ms; }, finished: () => finished };
};

test('완료 조건을 만족할 때만 다음 단계로 가고 머문 시간을 기록한다', () => {
  const { g, log, adv } = make();
  assert.equal(g.current().id, 'a');
  g.tick({ a: false });
  assert.equal(g.index(), 0);
  adv(1500); g.tick({ a: true, b: false });
  assert.equal(g.current().id, 'b');
  assert.deepEqual(log, [{ flow: 'port', step: 1, ms: 1500 }]);
});

test('한 tick 에 여러 단계가 끝나면 모두 기록하고 끝나면 onDone 한 번', () => {
  const { g, log, adv, finished } = make();
  adv(200); g.tick({ a: true, b: true });
  assert.deepEqual(log.map(e => e.step), [1, 2]);
  assert.equal(g.active(), false);
  assert.equal(g.current(), null);
  assert.equal(finished(), 1);
  g.tick({ a: true, b: true });
  assert.equal(finished(), 1);
});

test('stop 하면 더 기록하지 않는다', () => {
  const { g, log } = make();
  g.stop(); g.tick({ a: true, b: true });
  assert.equal(log.length, 0);
  assert.equal(g.active(), false);
});
```

- [ ] **Step 2:** Run: `node --test tests/guide-runner.test.mjs` / Expected: FAIL

- [ ] **Step 3: `js/guide/runner.js`**

```js
export function createGuide({ flow, steps, now, onStep = () => {}, onDone = () => {} }) {
  let i = 0, since = now(), live = steps.length > 0;
  return {
    total: steps.length,
    index: () => i,
    active: () => live,
    current: () => (live ? steps[i] : null),
    stop: () => { live = false; },
    tick(ctx) {
      while (live && steps[i].done(ctx)) {
        const t = now();
        onStep({ flow, step: i + 1, ms: Math.round(t - since) });
        since = t; i += 1;
        if (i >= steps.length) { live = false; onDone(); }
      }
    },
  };
}
```

- [ ] **Step 4:** Run: `node --test tests/guide-runner.test.mjs` / Expected: PASS (3 tests)

- [ ] **Step 5: 커밋**

```bash
git add js/guide/runner.js tests/guide-runner.test.mjs
git commit -m "feat(guide): add step runner with per-step timing"
```

---

### Task 4: 통배·부표 아이콘

**Files:**
- Modify: `sims/icon-set/icons-toss.js` (`homi_opt_feet` 항목 다음 줄)
- Modify: `tools/icons/build-game-icons.mjs:22` (`GAME_IDS`)
- Regenerate: `js/icons/toss-icons.js`, `js/icons/toss-icons-all.js`
- Test: `tests/port-wiring.test.mjs` (새), `tests/toss-icons.test.mjs` (기존)

**Interfaces:**
- Produces: `iconById('tub_boat')`, `iconById('buoy')` (`js/icons/index.js`)

- [ ] **Step 1: 실패하는 테스트** `tests/port-wiring.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('통배·부표는 새 아이콘 id 로 들어가고 ⛵ 는 그대로', async () => {
  const { ICON_BY_ID, ICON_BY_EMOJI } = await import('../js/icons/toss-icons.js');
  assert.ok(ICON_BY_ID.tub_boat?.startsWith('<svg'));
  assert.ok(ICON_BY_ID.buoy?.startsWith('<svg'));
  assert.equal(ICON_BY_EMOJI['⛵'], undefined);
  assert.match(read('tools/icons/build-game-icons.mjs'), /'tub_boat', 'buoy'/);
});
```

- [ ] **Step 2:** Run: `node --test tests/port-wiring.test.mjs` / Expected: FAIL (`ICON_BY_ID.tub_boat` undefined)

- [ ] **Step 3:** `sims/icon-set/icons-toss.js` 의 `homi_opt_feet` 항목 다음 줄에 두 항목을 넣는다. 도형은 `sims/icon-set/tub-boat.svg`, `buoy.svg` 그대로다(`t` = 채움색, `s`+`w` = 선색+굵기, 이 파일의 `homi` 항목과 같은 객체 형식).

```js
  { g:'도구', id:'tub_boat', n:'통배', e:'(SVG)', s:[ { t:'#90c2ff', d:'M1.6 19.6a10.4 2.6 0 1 0 20.8 0a10.4 2.6 0 1 0 -20.8 0z' }, { t:'#f04452', d:'M.9 13.2a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0 -3.6 0z' }, { t:'#f04452', d:'M2.6 13.4a9.4 6 0 1 0 18.8 0a9.4 6 0 1 0 -18.8 0z' }, { t:'#d22030', d:'M12 7.4a9.4 6 0 0 1 0 12z' }, { t:'#ff8a3d', d:'M2.6 11a9.4 4.3 0 1 0 18.8 0a9.4 4.3 0 1 0 -18.8 0z' }, { t:'#8a2a22', d:'M4.3 11.2a7.7 3.1 0 1 0 15.4 0a7.7 3.1 0 1 0 -15.4 0z' }, { t:'#b98a55', d:'M7.4 11.1h9.2a.8.8 0 0 1 0 1.6h-9.2a.8.8 0 0 1 0 -1.6z' }, { t:'#6b4a2e', d:'M17.2 3.8h1.1v7.2h-1.1z' }, { t:'#ffc342', d:'M15.65 5.9a2.1 2.1 0 1 0 4.2 0a2.1 2.1 0 1 0 -4.2 0z' }, { t:'#3b2a20', d:'M16.2 2.6h3.1a.6.6 0 0 1 0 1.2h-3.1a.6.6 0 0 1 0 -1.2z' } ] },
  { g:'도구', id:'buoy', n:'부표', e:'(SVG)', s:[ { s:'#b98a55', d:'M13.2 3.4c2.6-1.4 5.6-.6 6 1.6.4 2-1.6 2.6-1.2 4.2', w:1.4 }, { s:'#4e5968', d:'M10.5 3.4a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0z', w:1.3 }, { t:'#f04452', d:'M3.5 13a8.5 8.5 0 0 1 17 0z' }, { t:'#d22030', d:'M12 4.5a8.5 8.5 0 0 1 8.5 8.5h-8.5z' }, { t:'#f2f4f6', d:'M3.5 13a8.5 8.5 0 0 0 17 0z' }, { t:'#d1d6db', d:'M12 21.5a8.5 8.5 0 0 0 8.5-8.5h-8.5z' }, { t:'#333d4b', d:'M4.3 12.1h15.4a.9.9 0 0 1 0 1.8h-15.4a.9.9 0 0 1 0 -1.8z' }, { t:'#ff8a95', d:'M7.1 8.4a1.2 1.9 0 1 0 2.4 0a1.2 1.9 0 1 0 -2.4 0z', r:'rotate(35 8.3 8.4)' } ] },
```

- [ ] **Step 4:** `tools/icons/build-game-icons.mjs:22`

```js
export const GAME_IDS = ['sickle', 'net', 'homi', 'homi_long', 'homi_eye', 'homi_gold', 'homi_opt_reach', 'homi_opt_eye', 'homi_opt_spare', 'homi_opt_feet', 'tub_boat', 'buoy'];
```

- [ ] **Step 5:** Run: `node tools/icons/build-game-icons.mjs` / Expected: 두 출력 파일 갱신

- [ ] **Step 6:** Run: `node --test tests/port-wiring.test.mjs tests/toss-icons.test.mjs` / Expected: PASS. 그리고 포트 8033 서버로 `sims/icon-set/preview.html` 을 열어 두 아이콘이 `sims/boat-icon-compare.html` 의 T2·`buoy.svg` 와 같은 모양인지 본다(`{s}` 항목의 채움이 비어야 한다. 렌더가 선에 채움을 넣으면 `renderToss` 의 선 항목 규칙을 확인해 맞춘다).

- [ ] **Step 7: 커밋**

```bash
git add sims/icon-set/icons-toss.js tools/icons/build-game-icons.mjs js/icons/toss-icons.js js/icons/toss-icons-all.js tests/port-wiring.test.mjs
git commit -m "feat(icons): add tub boat and buoy icons by id"
```

---

### Task 5: 해금 항목(포구 섬·후미 바탕)

**Files:**
- Modify: `js/world/unlocks.js:71` 다음
- Test: `tests/world-unlocks.test.mjs` (추가)

**Interfaces:**
- Produces: 해금 id `cove`(바다터 또는 포구가 열리면), `port`(부엌 서식지)

- [ ] **Step 1: 테스트 추가** (`tests/world-unlocks.test.mjs` 끝)

```js
import { isUnlocked as isUnlockedPort, newlyUnlocked as newlyPort, unlockedSet as setPort } from '../js/world/unlocks.js';

test('포구 섬은 부엌 서식지에서, 후미 바탕은 바다터나 포구 중 하나만 열려도 열린다', () => {
  const st = (b) => ({ unlocks: {}, tree: { branches: b } });
  const none = st({});
  const kitchen = st({ kitchen: { habitat: true } });
  const water = st({ water: { bundles: true } });
  assert.equal(isUnlockedPort(none, 'port'), false);
  assert.equal(isUnlockedPort(none, 'cove'), false);
  assert.equal(isUnlockedPort(kitchen, 'port'), true);
  assert.equal(isUnlockedPort(kitchen, 'cove'), true);
  assert.equal(isUnlockedPort(kitchen, 'sea'), false);
  assert.equal(isUnlockedPort(water, 'cove'), true);
  assert.equal(isUnlockedPort(water, 'port'), false);
  assert.deepEqual(newlyPort(setPort(none), setPort(kitchen)).filter(id => id === 'port' || id === 'cove'), ['cove', 'port']);
});
```

이 파일 상단에 같은 이름의 import 가 이미 있으면 별칭 대신 기존 이름을 쓴다.

- [ ] **Step 2:** Run: `node --test tests/world-unlocks.test.mjs` / Expected: 새 테스트 FAIL(표에 없는 id 는 항상 열림)

- [ ] **Step 3:** `js/world/unlocks.js` 의 `{ id: 'sea', ... }` 바로 다음 줄에

```js
  { id: 'cove',       kind: 'place', when: s => branch(s, 'water', 'bundles') || branch(s, 'kitchen', 'habitat') },
  { id: 'port',       kind: 'place', when: s => branch(s, 'kitchen', 'habitat') },
```

- [ ] **Step 4:** Run: `node --test tests/world-unlocks.test.mjs tests/map-gate.test.mjs` / Expected: PASS. 기존 테스트가 해금 id 전체 목록을 고정해 두었으면 같은 자리에 `cove`, `port` 를 넣는다.

- [ ] **Step 5: 커밋**

```bash
git add js/world/unlocks.js tests/world-unlocks.test.mjs
git commit -m "feat(unlocks): open port island with the kitchen habitat"
```

---

### Task 6: 조형 이식(통배·가게·주민·부표)

**Files:**
- Create: `js/port/models.js`, `js/port/npc-models.js`
- Test: `tests/port-wiring.test.mjs` (추가)

**Interfaces:**
- Produces:
  - `tubBoat(): THREE.Group` (`userData.seat`, `userData.lamp`)
  - `buildPortShops(): { market, hut }` (C2 고정), `setPortNight(root, on)`
  - `buildIslandNPC(id)`, `netBuoy(r)`, `beachBuoy()`, `npcPortrait(id, size=160): string`, `setNpcNight(root, on)`, `ISLAND_NPCS`

- [ ] **Step 1: 테스트 추가**

```js
test('조형은 js/port 로 옮기고 sims 를 import 하지 않는다', () => {
  for (const f of ['js/port/models.js', 'js/port/npc-models.js']) {
    const src = read(f);
    assert.doesNotMatch(src, /sims\//);
    assert.match(src, /from 'three'/);
    assert.doesNotMatch(src, /^\s*\/\/|\/\*/m);
  }
  const m = read('js/port/models.js');
  assert.match(m, /export function tubBoat\(/);
  assert.match(m, /export function buildPortShops\(/);
  assert.doesNotMatch(m, /function marketA|function hutB|SHOP_STYLES/);
  const n = read('js/port/npc-models.js');
  for (const name of ['buildIslandNPC', 'netBuoy', 'beachBuoy', 'npcPortrait', 'setNpcNight']) assert.match(n, new RegExp(`export function ${name}\\(`));
});
```

- [ ] **Step 2:** Run: `node --test tests/port-wiring.test.mjs` / Expected: FAIL

- [ ] **Step 3:** Run: `cp sims/port-npc-models.js js/port/npc-models.js`

- [ ] **Step 4:** `js/port/models.js` 를 만든다. `sims/port-shop-models.js` 에서 재질·도우미(`mats`, `mat`, `glow`, `put`, `lathe`, `ball`, `cyl`, `twoSided`, `lampLight`), `tubBoat`, `C_VARIANTS` 의 `C2` 객체, `yatai`, `dockHouse`, 그리고 둘이 부르는 함수(`paperLantern`, `produceRow`, `fishSign`, `hangLantern` 등. `grep -n "^function\|^export function" sims/port-shop-models.js` 로 목록을 보고 `yatai`·`dockHouse` 본문에서 부르는 것만)를 복사한다. `marketA`..`hutC`, `SHOP_STYLES`, `buildShops`, `setNight`, `tree`, `glowTexture` 는 옮기지 않는다. `C_VARIANTS` 는 `{ C2: {...} }` 만 남기고 끝에

```js
export function buildPortShops() {
  const v = C_VARIANTS.C2;
  return { market: yatai(v), hut: dockHouse(v) };
}

export function setPortNight(root, on) {
  root.traverse(o => { if (o.isPointLight) o.intensity = on ? (o.distance > 10 ? 14 : 7) : 0; });
}
```

복사한 코드 안의 주석은 지운다.

- [ ] **Step 5:** Run: `node --test tests/port-wiring.test.mjs` / Expected: PASS

- [ ] **Step 6:** 눈 확인: `sims/port-shop-compare.html` 의 import 를 잠시 `../js/port/models.js` 와 `buildPortShops` 로 바꿔 C2 가 시안과 같은지 보고 되돌린다.

- [ ] **Step 7: 커밋**

```bash
git add js/port/models.js js/port/npc-models.js tests/port-wiring.test.mjs
git commit -m "feat(port): move tub boat, C2 shops and island residents into js/port"
```

---

### Task 7: 마을 후미 통배 부두와 잠금 분리

**Files:**
- Modify: `js/data/places.js` (`SEA_COVE` 아래)
- Modify: `js/spaces/sea.js:105-190` (`spawnSeaGate`)
- Create: `js/port/pier.js`
- Modify: `js/game.js:193`(import), `:3360`(부팅)
- Modify: `js/spaces/doors.js:339` 앞
- Test: `tests/port-wiring.test.mjs`

**Interfaces:**
- Consumes: `tubBoat` (Task 6), `cove`·`port` 해금 (Task 5)
- Produces:
  - `PORT = new THREE.Vector3(700, 0, 0)`, `PORT_PIER = { ax, az, bx, bz, end:{x,z}, boat:{x,z,ry} }` (마을 좌표)
  - `spawnSeaCove()` (sea.js), `spawnPortPier()`, `nearPortPier(p): boolean`, `portPierBoat`
  - doors.js `nd = 'port_board'`

부두 위치는 `sims/port-entry-compare.html` A안 계산 그대로: 후미 중심 `SEA_COVE`, 반지름 `SEA_COVE.r`, 방향 `atan2(-9 - SEA_COVE.z, 26.5 - SEA_COVE.x)`.

- [ ] **Step 1: 테스트 추가**

```js
test('후미 바탕은 cove, 바다터 입구는 sea, 통배 부두는 port 잠금으로 나뉜다', () => {
  const game = read('js/game.js');
  assert.match(game, /lockFrom\('cove'\); spawnSeaCove\(\); lockTo\(\);/);
  assert.match(game, /lockFrom\('sea'\); spawnSeaGate\(\); lockTo\(\);/);
  assert.match(game, /lockFrom\('port'\); spawnPortPier\(\); lockTo\(\);/);
  const places = read('js/data/places.js');
  assert.match(places, /export const PORT = new THREE\.Vector3\(700, 0, 0\);/);
  assert.match(places, /export const PORT_PIER = /);
  const doors = read('js/spaces/doors.js');
  assert.match(doors, /isOpen\('port'\) && nearPortPier\(player\.position\)/);
  assert.match(doors, /nd = 'port_board'/);
});
```

- [ ] **Step 2:** Run: `node --test tests/port-wiring.test.mjs` / Expected: FAIL

- [ ] **Step 3:** `js/data/places.js` 의 `SEA_COVE` 정의 바로 아래에

```js
const PORT_DIR = Math.atan2(-9 - SEA_COVE.z, 26.5 - SEA_COVE.x);
const coveAt = (r) => ({ x: SEA_COVE.x + Math.cos(PORT_DIR) * r, z: SEA_COVE.z + Math.sin(PORT_DIR) * r });
const PIER_A = coveAt(SEA_COVE.r - 1.2), PIER_B = coveAt(SEA_COVE.r - 4.4);
export const PORT_PIER = { ax: PIER_A.x, az: PIER_A.z, bx: PIER_B.x, bz: PIER_B.z, end: coveAt(SEA_COVE.r - 3.9), boat: { ...coveAt(SEA_COVE.r - 4.6), ry: 0.4 } };
export const PORT = new THREE.Vector3(700, 0, 0);
```

- [ ] **Step 4:** `js/spaces/sea.js` 의 `spawnSeaGate` 를 둘로 나눈다.
  - 새 `export function spawnSeaCove()`: 그룹 위치 `SEA_GATE`. 지금 `spawnSeaGate` 의 모래(`sand`), `coveWater`, 물가 거품, 등대(바위섬·탑·띠·`seaLampMat` 램프·캡·`seaBeacon`), 방파제 바위, 부표 두 개, `obstacles.push({ x: SEA_COVE.x, ... })`, `const water = solidCircle(SEA_COVE...)` 를 옮기고 `water` 를 모듈 변수 `coveSolidRef` 에 담는다(모듈 상단에 `let coveSolidRef = null;` 과 `export const coveSolid = () => coveSolidRef;`).
  - 남은 `spawnSeaGate()`: 표지판 `🌊 바다터`, 호미 가판·`HOMI_STALL` 충돌체·장애물, 게이트 앞 `obstacles.push({ x: SEA_GATE.x, ... })`, `addGateWalk(g, 'sea', { water: coveSolid(), ... })`.
  - `js/game.js:3360` 을

```js
  lockFrom('cove'); spawnSeaCove(); lockTo();
  lockFrom('sea'); spawnSeaGate(); lockTo();
  lockFrom('port'); spawnPortPier(); lockTo();
```

  - `js/game.js:193` 의 sea.js import 목록에 `spawnSeaCove` 추가, 그리고 `import { spawnPortPier } from './port/pier.js';`

- [ ] **Step 5: `js/port/pier.js`**

```js
import * as THREE from 'three';
import { PORT_PIER } from '../data/places.js';
import { tubBoat } from './models.js';
import { scene, clayMat, solidCircle } from '../game.js';
import { makeSignpost } from '../spaces/signpost.js';
import { addGateWalk, makeWalk } from '../spaces/gate-cue.js';
import { coveSolid } from '../spaces/sea.js';

export let portPierBoat = null;

export function spawnPortPier() {
  const g = new THREE.Group(); scene.add(g);
  const { ax, az, bx, bz, boat } = PORT_PIER;
  const len = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bx - ax, bz - az);
  const deck = new THREE.Group(); deck.position.set(ax, 0, az); deck.rotation.y = ang; g.add(deck);
  for (let d = 0.3; d < len; d += 0.62) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 0.54), clayMat(d > len - 1.2 ? 0xc46a4a : 0xb98a5a));
    plank.position.set(0, 0.32, d); plank.receiveShadow = true; deck.add(plank);
  }
  for (let d = 0.6; d < len; d += 2) for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.8, 6), clayMat(0x6e4a2c));
    post.position.set(s * 0.6, 0.15, d); deck.add(post);
  }
  portPierBoat = tubBoat(); portPierBoat.position.set(boat.x, 0.18, boat.z); portPierBoat.rotation.y = boat.ry; g.add(portPierBoat);
  const sign = makeSignpost('⛵ 포구 섬', ax + 1.6, az + 1.5); g.add(sign);
  solidCircle(boat.x, boat.z, 1.1);
  addGateWalk(g, 'port', { water: coveSolid(), color: 0xffc94a, ringR: 0.85, walk: makeWalk({ ax, az, bx, bz, hw: 0.6, y: 0.36 }) });
}

export function nearPortPier(p) {
  return Math.hypot(p.x - PORT_PIER.end.x, p.z - PORT_PIER.end.z) < 1.6;
}
```

  Step 5 의 첫 동작으로 위 import 네 줄의 경로를 확인하고, 다르면 실제 경로로 고친다.
  - `scene`, `clayMat`, `solidCircle`: sea.js 상단 import 줄(`js/spaces/sea.js:8-16`)이 가져오는 경로와 같게.
  - `makeSignpost`: `grep -rn "export function makeSignpost" js` 로 찾은 파일. 인자 순서도 확인한다(sea.js 는 `makeSignpost('🌊 바다터', -1.6, 1.2)` 로 그룹 로컬 좌표를 넘긴다. 여기서는 그룹 원점이 0 이라 마을 좌표를 그대로 넘긴다).
  - `addGateWalk`, `makeWalk`: sea.js 가 import 하는 경로와 같게.
  - `coveSolid`: Step 4 에서 sea.js 에 `let coveSolidRef = null;` 을 두고 `export const coveSolid = () => coveSolidRef;` 로 내보낸 getter. `spawnSeaGate` 도 `coveSolid()` 로 읽는다.

- [ ] **Step 6:** `js/spaces/doors.js` 의 `isOpen('sea') && nearGateEnd('sea')` 분기 바로 앞에

```js
  } else if (isOpen('port') && nearPortPier(player.position)) {
    nd = 'port_board'; prompt = PORT_COPY.board;
```

  상단 import: `import { nearPortPier } from '../port/pier.js';`, `import { PORT_COPY } from '../port/data.js';`

- [ ] **Step 7:** Run: `node --test tests/port-wiring.test.mjs tests/sea-gate-hint.test.mjs tests/dive-wiring.test.mjs && node --check js/spaces/sea.js js/port/pier.js js/spaces/doors.js js/game.js` / Expected: PASS. 기존 sea 테스트가 등대·후미 코드를 `spawnSeaGate` 안에서 찾으면 같은 커밋에서 `spawnSeaCove` 를 보도록 고친다.

- [ ] **Step 8: 브라우저 확인** `calm-forest` 서버(`.claude/launch.json`)로 `?unlocks=on`:
  1. 부엌 서식지만 완성: 후미·등대·통배 부두 보임, 바다터 표지판·돌다리 안 보임, 부두 끝에서 `🛶 부두 끝에서 배 타기`.
  2. 물 꾸러미만 완성: 후미·바다터 보임, 통배 부두 안 보임.
  3. 둘 다 안 함: 후미 전체 안 보임(지금과 같음).
  상태는 콘솔에서 `gameState.tree.branches` 를 바꾸고 `syncUnlocks()` 를 불러 만든다.

- [ ] **Step 9: 커밋**

```bash
git add js/data/places.js js/spaces/sea.js js/port/pier.js js/game.js js/spaces/doors.js tests/port-wiring.test.mjs
git commit -m "feat(port): add tub boat pier in the village cove with its own unlock"
```

---

### Task 8: 섬 공간 뼈대(바다 공간 하위 모드)

**Files:**
- Create: `js/port/index.js`
- Modify: `js/spaces/sea.js` (`updateSea` :521, `seaCamera` :775, `exitSea` :317)
- Modify: `js/spaces/doors.js` (`if (atSea)` 블록 :186)
- Modify: `js/game.js` (:7482 액션, :6429 이동, :6517 클램프, :2776 디버그)
- Test: `tests/port-wiring.test.mjs`

**Interfaces:**
- Consumes: `PORT`, `PORT_PIER` (Task 7), `data.js` (Task 1), 모델 (Task 6)
- Produces (`js/port/index.js`): `port`, `enterPort(o?)`, `leavePort()`, `updatePort(dt,t)`, `portCamera(camera,look,dt)`, `portAction()`, `portPrompt(): {nd, prompt}`, `clampPort(pos)`, `portOwnsMovement()`

- [ ] **Step 1: 테스트 추가**

```js
test('섬은 바다 공간의 하위 모드로 붙는다', () => {
  const sea = read('js/spaces/sea.js'), game = read('js/game.js'), doors = read('js/spaces/doors.js');
  assert.match(sea, /if \(port\.active\) return updatePort\(dt, t\);/);
  assert.match(sea, /if \(port\.active\) return portCamera\(camera, look, dt\);/);
  assert.match(sea, /leaveMudflat\(\);\n  leaveDive\(\);\n  leavePort\(\);/);
  assert.match(game, /if \(nearDoor === 'port_board' && !atSea\) return enterPort\(\);/);
  assert.match(game, /port\.active \? portAction :/);
  assert.match(game, /else if \(port\.active\) clampPort\(player\.position\);/);
  assert.match(game, /if \(portOwnsMovement\(\)\) return;/);
  assert.match(game, /_wq\.get\('port'\) === '1'/);
  assert.match(doors, /else if \(port\.active\) \{ const pp = portPrompt\(\); nd = pp\.nd; prompt = pp\.prompt; \}/);
});
```

- [ ] **Step 2:** Run: `node --test tests/port-wiring.test.mjs` / Expected: FAIL

- [ ] **Step 3: `js/port/index.js` 뼈대** (이 태스크는 진입·종료·카메라·이동 소유만. 항해·낚시는 Task 9, 섬은 Task 10)

```js
import * as THREE from 'three';
import { PORT } from '../data/places.js';
import { ISLAND, VILLAGE_DOCK, WALK_R } from './data.js';
import { tubBoat } from './models.js';

export const port = { active: false };
const env = {};
let group = null, boat = null;
const P = { phase: 'sail', dir: 1, fast: false, heading: -Math.PI / 2, speed: 0, moved: 0, fishing: null, trip: null };
const W = (x, z, y = 0) => new THREE.Vector3(PORT.x + x, y, PORT.z + z);

export function bindPortEnv(e) { Object.assign(env, e); }

function buildPort() {
  group = new THREE.Group(); group.name = 'port'; env.scene.add(group);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(300, 180), new THREE.MeshLambertMaterial({ color: 0x4fb3c9 }));
  sea.rotation.x = -Math.PI / 2; sea.position.copy(W(20, 0, -0.02)); group.add(sea);
  boat = tubBoat(); group.add(boat);
}

function seatPlayer() { env.player.position.set(boat.position.x, 0.34, boat.position.z); }

export function enterPort(o = {}) {
  if (port.active) return;
  if (!group) buildPort();
  env.$w.atSea = true;
  port.active = true;
  Object.assign(P, { phase: 'sail', dir: 1, fast: !!o.fast, heading: -Math.PI / 2, speed: 0, moved: 0, fishing: null,
    trip: { t0: performance.now(), caught: 0, quests: 0, via: o.fast ? 'fast' : 'sail' } });
  boat.position.copy(W(VILLAGE_DOCK.x, VILLAGE_DOCK.z)); boat.rotation.y = P.heading;
  seatPlayer();
  env.ui.setSeaMode?.(true);
  env.snapCamera(); env.setSpaceVisible();
}

export function leavePort() {
  if (!port.active) return;
  env.player.position.y = 0;
  port.active = false;
}

export function portOwnsMovement() { return port.active && P.phase === 'sail'; }

export function clampPort(pos) {
  const cx = PORT.x + ISLAND.x, cz = PORT.z + ISLAND.z;
  const dx = pos.x - cx, dz = pos.z - cz, d = Math.hypot(dx, dz);
  const lx = pos.x - PORT.x, lz = pos.z - PORT.z;
  const onPier = lx >= 21.9 && lx <= 26.5 && Math.abs(lz) <= 0.75;
  if (!onPier && d > WALK_R) { pos.x = cx + (dx / d) * WALK_R; pos.z = cz + (dz / d) * WALK_R; }
}

const _v = new THREE.Vector3();
export function portCamera(camera, look, dt) {
  const tall = camera.aspect < 1, low = !tall && innerHeight < 500;
  const fov = tall ? 60 : low ? 30 : 36;
  if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  const t = P.phase === 'sail' ? boat.position : env.player.position;
  const off = P.phase === 'island' ? (low ? [17, 11.5] : [20, 13]) : (low ? [14, 9.8] : [16.5, 11.5]);
  look.lerp(_v.set(t.x, 0, t.z), Math.min(1, dt * 4));
  camera.position.lerp(_v.set(look.x, off[0], look.z + off[1]), Math.min(1, dt * 3));
  camera.lookAt(look);
}

export function updatePort(dt, t) {}
export function portAction() {}
export function portPrompt() { return { nd: null, prompt: '' }; }
```

  game.js 와의 순환 import 를 피하려고 `bindPortEnv` 로 의존을 넘겨받는다. game.js 부팅에서(`spawnSeaGate` 가 불리는 :3360 근처) 한 번:

```js
  bindPortEnv({ $w, scene, player, ui, snapCamera, setSpaceVisible, gameState: () => gameState, requestSave, analog, keys });
```

  `gameState` 는 불러오기에서 객체가 바뀔 수 있으므로 getter 로 넘기고, 이후 태스크에서는 `env.gameState()` 로 읽는다. `analog`, `keys` 는 `updatePlayer` 가 읽는 그 변수다(game.js :1750 근처 정의를 확인).

- [ ] **Step 4: 연결**
  - `js/spaces/sea.js`
    - `updateSea`: `if (dive.active) return updateDive(dt, t);` 다음 줄 `if (port.active) return updatePort(dt, t);`
    - `seaCamera`: `if (dive.active) return diveCamera(camera, look, dt);` 다음 줄 `if (port.active) return portCamera(camera, look, dt);`
    - `exitSea`: 함수 첫 줄 `const fromPort = port.active;`, `leaveMudflat();\n  leaveDive();` 다음 줄 `leavePort();`, 플레이어를 `SEA_GATE` 쪽에 세우는 줄을 `if (fromPort) player.position.set(PORT_PIER.end.x, 0, PORT_PIER.end.z); else { 기존 줄 }` 로.
    - import: `import { port, updatePort, portCamera, leavePort } from '../port/index.js';`, places.js 목록에 `PORT_PIER`.
  - `js/spaces/doors.js` `if (atSea)` 블록의 `else if (dive.active) {...}` 다음:

```js
    else if (port.active) { const pp = portPrompt(); nd = pp.nd; prompt = pp.prompt; }
```

  - `js/game.js`
    - 액션(:7482): `if (nearDoor === 'sea') return openSeaPick();` 바로 앞 `if (nearDoor === 'port_board' && !atSea) return enterPort();`
    - 같은 곳 `(mudflat.active ? mudflatAction : dive.active ? diveAction : seaAction)()` → `(mudflat.active ? mudflatAction : dive.active ? diveAction : port.active ? portAction : seaAction)()`
    - `updatePlayer`(:6429) 첫 줄 `if (portOwnsMovement()) return;`
    - 클램프(:6517) `else if (dive.active) clampDive(player.position);` 다음 줄 `else if (port.active) clampPort(player.position);`
    - 디버그(:2776-2780 패턴) `if (_wq.get('port') === '1') enterPort();`
    - import: `import { port, enterPort, portAction, clampPort, portOwnsMovement, bindPortEnv } from './port/index.js';`

- [ ] **Step 5:** Run: `node --test tests/port-wiring.test.mjs tests/dive-wiring.test.mjs && node --check js/port/index.js js/spaces/sea.js js/spaces/doors.js js/game.js` / Expected: PASS

- [ ] **Step 6: 브라우저 확인** `?port=1&unlocks=off` 에서 바다·통배·플레이어가 보이고 콘솔 오류 0. 마을 통배 부두 끝에서 액션 → 바다로 들어감(아직 움직이지 않는 게 정상).

- [ ] **Step 7: 커밋**

```bash
git add js/port/index.js js/spaces/sea.js js/spaces/doors.js js/game.js tests/port-wiring.test.mjs
git commit -m "feat(port): add port island as a sub-mode of the sea space"
```

---

### Task 9: 항해·바다 낚시·바로 가기

**Files:**
- Create: `js/port/sail.js`
- Modify: `js/port/index.js`
- Test: `tests/port-rules.test.mjs` (추가)

**Interfaces:**
- Produces (`js/port/sail.js`):
  - `steer(state:{heading,speed}, input:{x,y}, dt, opts:{speed,turn}): {heading,speed}`
  - `pushOutOfIsland(p:{x,z}, island:{x,z}, r): {x,z}`
  - `fastStep(p:{x,z}, route:[x,z][], wp, dist): {p, wp, done}`
- `portPrompt` 가 내는 nd: 낚시터 3.4 안 → `'port_cast'`, 낚시 중 → `'port_fish'`

- [ ] **Step 1: 테스트 추가** (`tests/port-rules.test.mjs`)

```js
import { steer, pushOutOfIsland, fastStep } from '../js/port/sail.js';

test('조이스틱 방향으로 돌고 속도가 붙으며, 놓으면 멈춘다', () => {
  let s = { heading: 0, speed: 0 };
  for (let i = 0; i < 20; i++) s = steer(s, { x: 1, y: 0 }, 0.05, { speed: 6, turn: 5 });
  assert.ok(Math.abs(s.heading - (-Math.PI / 2)) < 0.05);
  assert.ok(s.speed > 5);
  for (let i = 0; i < 40; i++) s = steer(s, { x: 0, y: 0 }, 0.05, { speed: 6, turn: 5 });
  assert.equal(s.speed, 0);
});

test('섬 안으로 들어오면 테두리 밖으로 밀어낸다', () => {
  const p = pushOutOfIsland({ x: 30, z: 0 }, { x: 44, z: 0 }, 22.2);
  assert.ok(Math.abs(Math.hypot(p.x - 44, p.z) - 22.2) < 1e-9);
});

test('바로 가기는 항로 점을 차례로 따라가 끝에서 done', () => {
  let st = { p: { x: 0, z: 0 }, wp: 1, done: false };
  const route = [[0, 0], [3, 0], [3, 4]];
  for (let i = 0; i < 10 && !st.done; i++) st = fastStep(st.p, route, st.wp, 1);
  assert.equal(st.done, true);
  assert.deepEqual(st.p, { x: 3, z: 4 });
});
```

- [ ] **Step 2:** Run: `node --test tests/port-rules.test.mjs` / Expected: FAIL

- [ ] **Step 3: `js/port/sail.js`** (시안 `sail()` 과 같은 식)

```js
const wrap = d => { while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };

export function steer(state, input, dt, { speed, turn }) {
  const len = Math.hypot(input.x, input.y);
  if (len * len <= 0.02) return { heading: state.heading, speed: Math.max(0, state.speed - dt * 6) };
  const want = Math.atan2(-input.x, -input.y);
  const d = wrap(want - state.heading), step = turn * dt;
  const heading = state.heading + Math.max(-step, Math.min(step, d));
  return { heading, speed: Math.min(speed * Math.min(1, len * 1.2), state.speed + dt * 10) };
}

export function pushOutOfIsland(p, island, r) {
  const dx = p.x - island.x, dz = p.z - island.z, d = Math.hypot(dx, dz);
  if (d >= r || d < 1e-6) return p;
  return { x: island.x + (dx / d) * r, z: island.z + (dz / d) * r };
}

export function fastStep(p, route, wp, dist) {
  let x = p.x, z = p.z, i = wp, left = dist;
  while (left > 0 && i < route.length) {
    const [tx, tz] = route[i], d = Math.hypot(tx - x, tz - z);
    if (d < 1e-6) { i++; continue; }
    const k = Math.min(left, d);
    x += ((tx - x) / d) * k; z += ((tz - z) / d) * k; left -= k;
    if (k >= d) { x = tx; z = tz; i++; }
  }
  return { p: { x, z }, wp: i, done: i >= route.length };
}
```

- [ ] **Step 4:** Run: `node --test tests/port-rules.test.mjs` / Expected: PASS

- [ ] **Step 5: `js/port/index.js` 에 항해·낚시**
  - `buildPort` 에 추가(시안에서 옮김): 낚시터 물결 원(`makeSpot`: 바깥 고리 + 반투명 원, 색 `{near:0xbfe6ff, far:0x9fd0ff, night:0xffd27a, pier:0xbfe6ff}`)을 `P.spots = [...SEA_SPOTS, PIER_SPOT].map(s => ({ zone: s.zone, pos: W(s.at[0], s.at[1]), left: SPOT_LEFT[s.zone], mesh }))` 로. 밤 자리는 `isNight()`(`js/daynight.js`)일 때만 `mesh.visible`. 항로 부표(`ROUTE` 양 끝 제외, 주황 원뿔), 섬 땅·모래·나무·바위·등대(시안 `buildIsland`), `buildPortShops()` 의 `market`·`hut` 을 `W(MARKET_POS)`·`W(HUT_POS)` 에(회전은 시안 `placeShops` 값).
  - `updatePort(dt)` 의 바다 분기:

```js
function inputVec() {
  const k = env.keys, a = env.analog;
  let x = a.x + ((k.has('d') || k.has('arrowright')) ? 1 : 0) - ((k.has('a') || k.has('arrowleft')) ? 1 : 0);
  let y = a.y + ((k.has('s') || k.has('arrowdown')) ? 1 : 0) - ((k.has('w') || k.has('arrowup')) ? 1 : 0);
  const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
  return { x, y };
}

function sailTick(dt) {
  const p = { x: boat.position.x - PORT.x, z: boat.position.z - PORT.z }, ox = p.x, oz = p.z;
  let next = p;
  if (P.fast) {
    const route = P.dir > 0 ? ROUTE : [...ROUTE].reverse();
    const st = fastStep(p, route, P.wp ?? 1, BOAT_SPEED * FAST_MULT * dt);
    P.wp = st.wp; next = st.p;
    if (st.done) return arrive();
  } else {
    const s = P.fishing ? { heading: P.heading, speed: Math.max(0, P.speed - dt * 10) } : steer(P, inputVec(), dt, { speed: BOAT_SPEED, turn: BOAT_TURN });
    P.heading = s.heading; P.speed = s.speed;
    next = { x: p.x - Math.sin(P.heading) * P.speed * dt, z: p.z - Math.cos(P.heading) * P.speed * dt };
    next = pushOutOfIsland(next, ISLAND, ISLAND_R + 2.2);
    next.x = Math.max(SEA_BOUNDS.x0, Math.min(SEA_BOUNDS.x1, next.x));
    next.z = Math.max(SEA_BOUNDS.z0, Math.min(SEA_BOUNDS.z1, next.z));
  }
  P.moved += Math.hypot(next.x - ox, next.z - oz);
  boat.position.set(PORT.x + next.x, 0, PORT.z + next.z);
  boat.rotation.y = P.heading;
  seatPlayer();
  const dock = P.dir > 0 ? ISLAND_DOCK : VILLAGE_DOCK;
  if (!P.fast && !P.fishing && Math.hypot(next.x - dock.x, next.z - dock.z) < 1.2) arrive();
}
```

  - 낚시(`portAction`):

```js
function nearSpot(r) {
  let best = null, bd = r;
  for (const s of P.spots) { if (!s.left || !s.mesh.visible) continue; const d = s.pos.distanceTo(boat.position); if (d < bd) { bd = d; best = s; } }
  return best;
}

function startFish(spot) {
  const first = P.trip.caught === 0 && guideActive();
  P.fishing = { spot, t: 0, bite: first ? BITE_FIRST.delay : 1.2 + Math.random() * 1.6, win: first ? BITE_FIRST.win : BITE_WIN, state: 'wait' };
}

function tapFish() {
  const f = P.fishing; if (!f) return;
  if (f.state === 'bite') {
    const kind = rollCatch(f.spot.zone, Math.random());
    const gs = env.gameState(); gs.port = addToPantry(gs.port, { [kind]: 1 });
    P.trip.caught++; f.spot.left--; if (!f.spot.left) f.spot.mesh.visible = false;
    env.popAt?.(f.spot.pos, PANTRY_ICO[kind]);
  }
  P.fishing = null;
}
```

  `updatePort` 에서 낚시 타이머: `wait` 이 `bite` 를 넘으면 `state='bite'`(❗), `bite` 상태에서 `win` 을 넘으면 `💨` 팝업 후 `P.fishing=null`. 팝업은 game.js 의 기존 월드 팝업 함수를 `bindPortEnv` 에 `popAt` 으로 넘긴다(`grep -n "function spawnFloatText\|function popText\|function floatText" js/game.js` 로 이름 확인).
  - `portPrompt()` 바다 분기: 낚시 중이면 `{ nd: 'port_fish', prompt: '' }`, `nearSpot(3.4)` 이면 `{ nd: 'port_cast', prompt: '' }`.
  - `portAction()`: `nd==='port_cast'` → `startFish(nearSpot(3.4))`, `'port_fish'` → `tapFish()`. (`env.$w.nearDoor` 로 현재 nd 를 읽는다.)
  - 도착:

```js
function arrive() {
  P.speed = 0; P.fast = false; P.wp = 1;
  if (P.dir > 0) return arriveIsland();
  const gs = env.gameState();
  env.trackEvent('port_trip', { via: P.trip.via, caught: P.trip.caught, quests: P.trip.quests, sec: Math.round((performance.now() - P.trip.t0) / 1000) });
  if (!gs.port.fastUnlocked) { gs.port = { ...gs.port, visited: true, fastUnlocked: true }; env.ui.toast?.(PORT_COPY.arrive); }
  env.requestSave();
  env.exitSea();
}
function arriveIsland() { P.phase = 'island'; }
```

  `trackEvent`, `exitSea`, `popAt` 도 `bindPortEnv` 로 넘긴다(Task 8 의 bind 호출에 추가). `guideActive` 는 Task 12 에서 채우고, 그 전까지는 `() => false`.
  - 마을 결과에서 `fastUnlocked` 면 마을 부두 프롬프트에 `🗺️ 섬으로 바로 가기` 를 같이 낸다: doors.js `port_board` 분기에서 `gameState.port.fastUnlocked` 면 `nd='port_fast_go'`(액션 버튼 하나는 배 타기, 화면 칩 하나는 바로 가기. 칩 UI 는 기존 `ui.setSeaBtn` 처럼 버튼 하나를 더 띄우는 함수가 있으면 그것을 쓰고, 없으면 액션 버튼 길게 누르기 대신 `PORT_COPY.fastGo` 텍스트 버튼을 프롬프트 옆에 띄운다). game.js 액션 분기에 `if (nearDoor === 'port_fast_go' && !atSea) return enterPort({ fast: true });`
- [ ] **Step 6: 브라우저 확인** `?port=1` 에서 키보드·조이스틱으로 배를 몰고, 물결 원에서 낚시가 되고, 섬 둘레에 막히고, 섬 부두에 닿으면 `phase` 가 `island` 가 되는지(`window.__space` 또는 콘솔) 확인한다.
- [ ] **Step 7: 커밋**

```bash
git add js/port/sail.js js/port/index.js js/spaces/doors.js js/game.js tests/port-rules.test.mjs
git commit -m "feat(port): sail the tub boat, fish sea spots, fast travel"
```

---

### Task 10: 섬 걷기·주민 대화·의뢰·포장마차

**Files:**
- Create: `js/port/card.js`
- Modify: `js/port/index.js`, `js/spaces/npc.js:821`
- Test: `tests/port-rules.test.mjs`, `tests/port-wiring.test.mjs`

**Interfaces:**
- Consumes: Task 1 규칙, Task 6 모형, `showTalk`/`hideTalk`/`onTalkTap`/`talkShown` (`js/mirror/talk-box.js`)
- Produces:
  - `portCard(port, inPort)`, `splitLines(text)` (`js/port/card.js`)
  - 섬 안 nd: `'port_talk'`, `'port_next'`, `'port_pick'`, `'port_buy'`, `'port_board'`(귀항), `'port_fast'`(마을로 바로 가기)

- [ ] **Step 1: 테스트 추가**

```js
import { portCard, splitLines } from '../js/port/card.js';
import { acceptQuest as accQ, pickItem as pickQ, defaultPort as defP } from '../js/port/rules.js';

test('대사는 문장 끝에서 나눈다', () => {
  assert.deepEqual(splitLines('그물 부표가 떠내려갔어. 3개만 주워 줄래?'), ['그물 부표가 떠내려갔어.', '3개만 주워 줄래?']);
});

test('의뢰 카드는 섬 안에서, 진행 중인 의뢰가 있을 때만 뜬다', () => {
  assert.equal(portCard(defP(), true), null);
  const p = pickQ(accQ(defP(), 'fisher'), 'fisher');
  assert.equal(portCard(p, false), null);
  const c = portCard(p, true);
  assert.equal(c.id, 'port_quest');
  assert.equal(c.progress, 1);
  assert.equal(c.target, 3);
  assert.equal(c.ready, false);
});
```

`tests/port-wiring.test.mjs`:

```js
test('포구 의뢰 카드가 의뢰 패널에 붙고 대화는 아래 대사 박스를 쓴다', () => {
  assert.match(read('js/spaces/npc.js'), /portCard\(gameState\.port, port\.active\)/);
  const idx = read('js/port/index.js');
  assert.match(idx, /from '\.\.\/mirror\/talk-box\.js'/);
  assert.match(idx, /npcPortrait\(/);
  assert.doesNotMatch(idx, /npc-modal|openNPCModal/);
});
```

- [ ] **Step 2:** Run: `node --test tests/port-rules.test.mjs tests/port-wiring.test.mjs` / Expected: FAIL

- [ ] **Step 3: `js/port/card.js`**

```js
import { QUESTS } from './data.js';

export const splitLines = text => text.split(/(?<=[.?!])\s+/).filter(Boolean);

export function portCard(port, inPort) {
  if (!inPort || !port) return null;
  const q = QUESTS.find(d => port.quests[d.id]?.state === 'active');
  if (!q) return null;
  const s = port.quests[q.id];
  return { id: 'port_quest', name: q.who, title: `📜 ${q.title}`, desc: `${q.itemName} ${q.need}개 가져다주기`, how: `${q.who}에게 가져가요`, progress: s.got, target: q.need, ready: s.got >= q.need };
}
```

- [ ] **Step 4: `js/port/index.js` 섬** (시안 `walkIsland`·`context`·`talkTo`·`advanceTalk` 를 옮긴다)
  - `arriveIsland()`: `P.phase='island'`, 배를 `W(ISLAND_DOCK)` 에, 플레이어를 `W(PIER_END)` 에 세우고 `y=0`. 처음 한 번 주민 4명(`buildIslandNPC(q.id)` 를 `W(q.pos)`, 시안과 같은 방향)과 진행 중 의뢰 물건(부표 `beachBuoy()`, 조개·배추·기름통은 시안 `itemMesh`)을 만든다. 가게·집·등대에 `solidCircle` (반경 `SOLIDS`).
  - 섬 걷기는 game.js `updatePlayer` 가 하고 `clampPort` 가 원 안에 묶는다(`portOwnsMovement()` false).
  - 대화:

```js
let talk = null;
function showLine() {
  const def = ISLAND_NPCS[talk.id];
  const badge = '#' + def.badge.toString(16).padStart(6, '0');
  showTalk({ face: '', color: `url(${npcPortrait(talk.id)}) center / 100% no-repeat, ${badge}44`, name: def.name, line: talk.lines[0], next: env.isTouch() ? '▶ 탭' : '▶ Space · 클릭' });
}
function talkTo(id, kind) {
  const q = QUESTS.find(x => x.id === id), gs = env.gameState(), s = gs.port.quests[id];
  let lines, onDone = null;
  if (kind === 'accept') { lines = splitLines(q.ask); onDone = () => { gs.port = acceptQuest(gs.port, id); spawnItems(id); env.trackEvent('port_quest', { quest_id: id, act: 'accept' }); env.refreshQuestPanel(); env.requestSave(); }; }
  else if (kind === 'turnin') {
    const r = claimQuest(gs.port, id); if (!r) return;
    gs.port = r.port; P.trip.quests++;
    env.popAt?.(npcs[id].position, Object.entries(r.reward).map(([k, n]) => `${PANTRY_ICO[k]}+${n}`).join(' '));
    env.trackEvent('port_quest', { quest_id: id, act: 'done' }); env.refreshQuestPanel(); env.requestSave();
    lines = splitLines(q.thanks);
  } else if (kind === 'sleep') lines = [...PORT_COPY.sleep];
  else lines = [PORT_COPY.nag, `${q.itemName} (${s.got}/${q.need})`];
  talk = { id, lines, onDone };
  onTalkTap(advanceTalk);
  showLine();
}
function advanceTalk() {
  if (!talk) return;
  talk.lines = talk.lines.slice(1);
  if (talk.lines.length) return showLine();
  const done = talk.onDone; talk = null; hideTalk(); done?.();
}
```

  `npcs` 는 `{ [id]: THREE.Group }`. `env.isTouch` 는 `() => document.body.classList.contains('is-touch')`, `env.refreshQuestPanel` 은 `() => env.$w.refreshQuestPanel?.()` 로 bind 에 넣는다.
  - `portPrompt()` 섬 분기(우선순위 순서):
    1. `talk` 열림 → `{ nd: 'port_next', prompt: '' }`
    2. 물건 1.5 안 → `'port_pick'`
    3. 주민 2.6 안 → `'port_talk'` (밤 의뢰가 낮이면 kind `sleep`, `avail` 이면 `accept`, `active`+다 모음 `turnin`, `active` 이면 `remind`)
    4. 안내 중(`npc`~`turnin` 단계)이면 여기서 `{ nd: null, prompt: '' }`
    5. 포장마차 2.6 안이고 오늘 안 샀으면 `'port_buy'`
    6. 섬 부두 끝 1.2 안 → `'port_board'`, `fastUnlocked` 면 `'port_fast'` 도 같은 자리(Task 9 의 바로 가기 버튼과 같은 방식)
  - `portAction()` 섬 분기: `port_next` → `advanceTalk()`, `port_pick` → `gs.port = pickItem(...)`, 메시 숨김, 팝업, `refreshQuestPanel`, `port_talk` → `talkTo`, `port_buy` → 코인 차감(코인을 빼는 기존 함수를 `grep -n "export function spendCoins\|function spend(" js/game.js js/*.js` 로 찾아 bind 로 넘긴다) 후 `addToPantry(MARKET_GIVE)`, `boughtDay = todayStr()`, `PORT_COPY.market` 을 토스트, `port_board` → `P.phase='sail'; P.dir=-1; P.heading=Math.PI/2; seatPlayer()`, `port_fast` → 같은데 `P.fast=true`.
  - 주민 머리 위: ❗(대기)/아이콘 없음 대신 진행 중이면 물건 이모지(🐚🥬🛢️, 부표는 🔴 대신 `iconById('buoy')` 를 캔버스에 못 그리므로 월드 말풍선은 이모지 규칙대로 `🎈` 같은 대체 없이 ❗/🎁/💤 세 가지만 쓴다)/🎁(다 모음)/💤(밤 의뢰 낮). 기존 NPC 말풍선 캔버스 그리기(`js/spaces/npc.js` `updateNPCGlyph`)를 본떠 섬 주민에도 스프라이트를 단다.
  - 대화 중 거리가 3 이상 멀어지면 `talk=null; hideTalk()` (광부 `TALK_CLOSE_R` 과 같은 규칙).
- [ ] **Step 5:** `js/spaces/npc.js:821` `views` 배열의 `jobCard(...)` 뒤에 `portCard(gameState.port, port.active)` 를 넣고, import `import { portCard } from '../port/card.js';`, `import { port } from '../port/index.js';`.
- [ ] **Step 6:** Run: `node --test tests/port-rules.test.mjs tests/port-wiring.test.mjs && node --check js/port/index.js js/spaces/npc.js` / Expected: PASS
- [ ] **Step 7: 브라우저 확인** `?port=1` 에서 섬 → 수달 어부 대화 → 탭으로 넘기기 → 마지막 줄에서 수락 → 부표 3개 → 돌려주기 → 창고 증가 → 부두 끝 귀항 → 마을 부두 도착. 가로 폰(844×390)과 PC 에서 대사 박스가 조이스틱·버튼과 겹치지 않는지.
- [ ] **Step 8: 커밋**

```bash
git add js/port/card.js js/port/index.js js/spaces/npc.js tests/port-rules.test.mjs tests/port-wiring.test.mjs
git commit -m "feat(port): island residents, quests via the bottom talk box, stall"
```

---

### Task 11: 저장·복원

**Files:**
- Modify: `js/game.js` (`gameState` 기본값 :1042-1131, `applySave` :2927 근처)
- Test: `tests/port-wiring.test.mjs`

- [ ] **Step 1: 테스트 추가**

```js
test('port 는 기본값으로 시작하고 불러올 때 정규화한다', () => {
  const game = read('js/game.js');
  assert.match(game, /port: defaultPort\(\),/);
  assert.match(game, /gameState\.port = sanitizePort\(saved\.port\);/);
});
```

- [ ] **Step 2:** Run: `node --test tests/port-wiring.test.mjs` / Expected: FAIL
- [ ] **Step 3:** `gameState` 의 `delve: defaultDelve(),` 다음 줄 `port: defaultPort(),`, `applySave` 의 `gameState.delve = sanitizeDelve(saved.delve);` 다음 줄 `gameState.port = sanitizePort(saved.port);`, import `import { defaultPort, sanitizePort } from './port/rules.js';`
- [ ] **Step 4:** Run: `npm test` / Expected: 전부 PASS
- [ ] **Step 5: 브라우저 확인** 의뢰 하나를 진행 중으로 두고 새로고침 → 그대로. 로컬 세이브의 `port` 를 `{ quests: 'x' }` 로 망가뜨려도 기본값으로 뜸.
- [ ] **Step 6: 커밋**

```bash
git add js/game.js tests/port-wiring.test.mjs
git commit -m "feat(port): save and restore port island progress"
```

---

### Task 12: 첫 방문 길 안내 12단계

**Files:**
- Create: `js/port/guide-steps.js`, `js/guide/view.js`
- Modify: `js/port/index.js`, `index.html`(안내 DOM·CSS)
- Test: `tests/guide-runner.test.mjs`, `tests/port-wiring.test.mjs`

**Interfaces:**
- Consumes: `createGuide` (Task 3), `waypoint`, `edgeArrow` (Task 2)
- Produces:
  - `portGuideSteps(): Step[]`
  - `createGuideView({ scene, camera, root }) → { show(step, ctx, me, solids), hide() }`
  - `startPortGuide()`, `guideActive()` (`js/port/index.js`), 디버그 `window.__portGuide`

- [ ] **Step 1: 테스트 추가** (`tests/guide-runner.test.mjs`)

```js
import { portGuideSteps } from '../js/port/guide-steps.js';

test('포구 안내는 12단계, 문구는 확정본 그대로', () => {
  const s = portGuideSteps();
  assert.deepEqual(s.map(x => x.id), ['walk', 'embark', 'move', 'spot', 'cast', 'bite', 'island', 'npc', 'collect', 'turnin', 'free', 'home']);
  const txt = (st, ctx = { device: 'phone', got: 0 }) => (typeof st.text === 'function' ? st.text(ctx) : st.text);
  assert.equal(txt(s[0]), '포구 섬 가는 배가 생겼어요. 부두로 가 보세요');
  assert.equal(txt(s[1]), '배에 타고 바다로 나가 볼까요?');
  assert.equal(txt(s[2]), '화면 왼쪽을 끌어 배를 움직여 보세요');
  assert.equal(txt(s[2], { device: 'pc' }), 'WASD나 방향키로 배를 움직여 보세요');
  assert.equal(txt(s[3]), '물결이 이는 곳이 낚시터예요. 다가가 보세요');
  assert.equal(txt(s[4]), '🎣 👆');
  assert.equal(txt(s[5]), '❗ ➜ 🎣 👆');
  assert.equal(txt(s[6]), '이제 포구 섬으로! 금색 화살표를 따라가세요');
  assert.equal(txt(s[7]), '❗가 뜬 수달 어부에게 말을 걸어 보세요');
  assert.equal(txt(s[8], { got: 2 }), '해변에 떠내려온 부표를 주워 오세요 (2/3)');
  assert.equal(txt(s[9]), '수달 어부에게 부표를 돌려주세요');
  assert.equal(txt(s[10]), '다른 주민도 도와 보세요. 돌아갈 땐 부두 끝으로');
  assert.equal(txt(s[11]), '마을 부두로 돌아가세요');
  for (const st of s) assert.doesNotMatch(txt(st), /—|놀/);
});
```

- [ ] **Step 2:** Run: `node --test tests/guide-runner.test.mjs` / Expected: FAIL

- [ ] **Step 3: `js/port/guide-steps.js`** (`ctx` 필드: `phase`('village'|'sail'|'island'|'done'), `nearPier`, `moved`, `canCast`, `fishing`, `caught`, `quest`(수달 상태), `got`, `dir`, `done`, `device`, 그리고 목표 좌표 `pierEnd`, `boat`, `spot`, `islandDock`, `fisher`, `item`, `pierEndIsland`, `villageDock`)

```js
export function portGuideSteps() {
  return [
    { id: 'walk', text: '포구 섬 가는 배가 생겼어요. 부두로 가 보세요', target: c => c.pierEnd, done: c => c.phase !== 'village' || c.nearPier, joy: true },
    { id: 'embark', text: '배에 타고 바다로 나가 볼까요?', target: c => c.boat, done: c => c.phase === 'sail', expect: ['port_board'] },
    { id: 'move', text: c => (c.device === 'pc' ? 'WASD나 방향키로 배를 움직여 보세요' : '화면 왼쪽을 끌어 배를 움직여 보세요'), target: c => c.spot, done: c => c.moved > 5, joy: true },
    { id: 'spot', text: '물결이 이는 곳이 낚시터예요. 다가가 보세요', target: c => c.spot, done: c => c.canCast || c.fishing || c.caught > 0 },
    { id: 'cast', text: '🎣 👆', target: c => c.spot, done: c => c.fishing || c.caught > 0, expect: ['port_cast'] },
    { id: 'bite', text: '❗ ➜ 🎣 👆', target: c => c.spot, done: c => c.caught > 0, expect: ['port_fish'] },
    { id: 'island', text: '이제 포구 섬으로! 금색 화살표를 따라가세요', target: c => c.islandDock, done: c => c.phase === 'island' },
    { id: 'npc', text: '❗가 뜬 수달 어부에게 말을 걸어 보세요', target: c => c.fisher, done: c => c.quest !== 'avail', expect: ['port_talk', 'port_next'] },
    { id: 'collect', text: c => `해변에 떠내려온 부표를 주워 오세요 (${c.got}/3)`, target: c => c.item, done: c => c.got >= 3, expect: ['port_pick'] },
    { id: 'turnin', text: '수달 어부에게 부표를 돌려주세요', target: c => c.fisher, done: c => c.quest === 'done', expect: ['port_talk', 'port_next'] },
    { id: 'free', text: '다른 주민도 도와 보세요. 돌아갈 땐 부두 끝으로', target: c => c.pierEndIsland, done: c => c.phase === 'sail' && c.dir < 0, expect: ['port_board'] },
    { id: 'home', text: '마을 부두로 돌아가세요', target: c => c.villageDock, done: c => c.done },
  ];
}
```

- [ ] **Step 4: `js/guide/view.js`** (시안 `goldRing`, `chevron`, `renderHud` 의 ⬇️·가장자리 화살표)

```js
import * as THREE from 'three';
import { waypoint, edgeArrow } from './route.js';

export function createGuideView({ scene, camera, root }) {
  const gold = 0xffc94a;
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.15, 28), new THREE.MeshBasicMaterial({ color: gold, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.visible = false; scene.add(ring);
  const sh = new THREE.Shape(); sh.moveTo(0, 0.55); sh.lineTo(0.42, -0.25); sh.lineTo(0, -0.05); sh.lineTo(-0.42, -0.25); sh.closePath();
  const chev = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: gold, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }));
  chev.visible = false; scene.add(chev);
  const card = root.querySelector('#guide-card'), mark = root.querySelector('#guide-mark'), edge = root.querySelector('#guide-edge');
  const v = new THREE.Vector3();
  function hide() { ring.visible = chev.visible = false; card.hidden = mark.hidden = edge.hidden = true; }
  function show(step, index, total, ctx, me, solids, groundY = 0) {
    if (!step) return hide();
    card.hidden = false;
    card.innerHTML = `<small>${index + 1}/${total}</small>${typeof step.text === 'function' ? step.text(ctx) : step.text}`;
    const tgt = step.target(ctx);
    if (!tgt) { ring.visible = chev.visible = false; mark.hidden = edge.hidden = true; return; }
    const d = Math.hypot(tgt.x - me.x, tgt.z - me.z);
    ring.position.set(tgt.x, (tgt.y ?? groundY) + 0.06, tgt.z); ring.visible = true;
    ring.scale.setScalar(1 + Math.sin(performance.now() / 200) * 0.12);
    chev.visible = d > 2.5;
    if (chev.visible) {
      const wp = waypoint(me, tgt, solids), ang = Math.atan2(wp.x - me.x, wp.z - me.z);
      chev.position.set(me.x + Math.sin(ang) * 1.9, groundY + 0.12, me.z + Math.cos(ang) * 1.9);
      chev.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, ang + Math.PI, 'XYZ'));
    }
    v.set(tgt.x, (tgt.y ?? groundY) + 1.6, tgt.z).project(camera);
    const r = root.getBoundingClientRect();
    const e = edgeArrow({ x: (v.x + 1) / 2 * r.width, y: (1 - v.y) / 2 * r.height, inFront: v.z < 1 }, r.width, r.height);
    const label = `${Math.round(d)}m`;
    mark.hidden = !e.inside; edge.hidden = e.inside;
    if (e.inside) { mark.style.left = `${e.x}px`; mark.style.top = `${e.y}px`; mark.innerHTML = `⬇️<span>${d > 3 ? label : ''}</span>`; }
    else { edge.style.left = `${e.x}px`; edge.style.top = `${e.y}px`; edge.innerHTML = `<i style="transform:rotate(${e.deg}deg)">➜</i><span>${label}</span>`; }
  }
  hide();
  return { show, hide };
}
```

  `index.html` 의 HUD 영역(게임 화면 오버레이 컨테이너, `#mirror-talk` 와 같은 부모)에 `<div id="guide-card" hidden></div><div id="guide-mark" hidden></div><div id="guide-edge" hidden></div>` 를 넣고, CSS 는 시안의 `.gcard`, `.mark.guide`, `.edge`, `.act.point::after` 규칙을 이 id 로 옮긴다(가로 폰 `@media (orientation: landscape) and (max-height: 500px)` 블록에도 크기 조정). `#mirror-talk.show` 가 있을 때 `#guide-card` 를 숨기는 규칙: `body:has(#mirror-talk.show) #guide-card { display: none; }`.

- [ ] **Step 5: `js/port/index.js` 에 연결**

```js
let guide = null, view = null;
export const guideActive = () => !!guide?.active();

export function startPortGuide() {
  const gs = env.gameState();
  if (guide || gs.port.guideDone) return;
  view ??= createGuideView({ scene: env.scene, camera: env.camera, root: env.hudRoot });
  guide = createGuide({ flow: 'port', steps: portGuideSteps(), now: () => performance.now(),
    onStep: e => env.trackEvent('guide_step', e),
    onDone: () => { const g = env.gameState(); g.port = { ...g.port, guideDone: true }; env.requestSave(); view.hide(); guide = null; } });
}
```

  - 시작: 매초 루프(`syncUnlocks` 를 부르는 자리)에서 `isOpen('port') && !gameState.port.guideDone && !atSea` 이면 `startPortGuide()`.
  - 매 프레임(마을에서도 돌아야 하므로 game.js 의 메인 루프에서 `updatePortGuide(dt)` 를 부른다. `updateSeaVisuals(t)` 를 부르는 :6309 옆 한 줄):

```js
export function updatePortGuide() {
  if (!guide) return;
  const ctx = guideCtx();
  guide.tick(ctx);
  if (!guide) return;
  const me = port.active && P.phase === 'sail' ? boat.position : env.player.position;
  view.show(guide.current(), guide.index(), guide.total, ctx, me, port.active && P.phase === 'island' ? islandSolids : [], port.active && P.phase === 'island' ? LAND_Y : 0);
  env.setActPoint(!!guide.current()?.expect?.includes(env.$w.nearDoor));
  window.__portGuide = { step: guide.current()?.id, target: guide.current()?.target(ctx), nearDoor: env.$w.nearDoor };
}
```

  `guideCtx()` 는 `phase`(마을이면 `'village'`, 마을로 돌아오면 `'done'`), `nearPier: nearPortPier(player.position)`, `moved: P.moved`, `canCast: !!nearSpot(3.4)`, `fishing: !!P.fishing`, `caught: P.trip?.caught ?? 0`, `quest`·`got`: `gameState.port.quests.fisher`, `dir: P.dir`, `done: phase==='done'`, `device: env.isTouch() ? 'phone' : 'pc'`, 그리고 목표 좌표(`PORT_PIER.end`, 마을 통배, 가장 가까운 남은 낚시터, `W(ISLAND_DOCK)`, 수달 위치, 가장 가까운 남은 부표, `W(PIER_END)`, `W(VILLAGE_DOCK)`)를 담는다. `home` 단계의 완료는 `arrive()` 의 귀항 직후 `phase='done'` 을 한 번 넘겨 `guide.tick` 을 부르고 나서 `exitSea()` 하도록 순서를 맞춘다.
  - `setActPoint(on)`: 액션 버튼에 `point` 클래스를 붙였다 떼는 작은 함수를 game.js 쪽(액션 버튼을 그리는 곳)에 두고 bind 로 넘긴다.
  - 안내 중 숨김: `portPrompt` 섬 분기 4번(Task 10)과 바로 가기 버튼은 `guideActive() && guide.index() < 10` 일 때 내지 않는다.
- [ ] **Step 6:** Run: `node --test tests/guide-runner.test.mjs tests/port-wiring.test.mjs && npm test` / Expected: PASS
- [ ] **Step 7: 화살표 추종 봇**(실제 게임) `?unlocks=on` 에서 부엌 서식지 완성 상태를 만들고 콘솔에 아래를 붙여 12단계 완주·막힘 0·콘솔 오류 0 을 가로 폰(844×390)과 PC 각 1회 확인한다.

```js
const bot = setInterval(() => {
  const g = window.__portGuide; if (!g) return;
  if (g.step == null) { clearInterval(bot); console.log('done'); return; }
  const me = window.__space?.playerPos?.() ?? null;
  if (g.nearDoor && document.querySelector('#act-btn.point')) { document.querySelector('#act-btn').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return; }
  if (g.target && me) { const dx = g.target.x - me.x, dz = g.target.z - me.z, l = Math.hypot(dx, dz) || 1; window.__setAnalog?.(dx / l, dz / l); }
}, 100);
```

  `window.__space.playerPos`, `window.__setAnalog`, `#act-btn` 의 실제 이름은 game.js 디버그 훅(:2756)과 액션 버튼 DOM id 를 확인해 맞춘다. 없으면 이 태스크에서 `?dbg=1` 일 때만 두 훅을 노출한다.
- [ ] **Step 8: 커밋**

```bash
git add js/guide/view.js js/port/guide-steps.js js/port/index.js js/game.js index.html tests/guide-runner.test.mjs tests/port-wiring.test.mjs
git commit -m "feat(port): first-visit 12-step arrow guidance"
```

---

### Task 13: 트래킹 등록

**Files:**
- Modify: `docs/analysis/event-taxonomy.csv`
- Test: `tests/event-taxonomy.test.mjs`, `tests/ga-param-split.test.mjs`, `tests/ga-mp.test.mjs` (기존)

- [ ] **Step 1:** Run: `node --test tests/event-taxonomy.test.mjs` / Expected: FAIL (`guide_step`, `port_trip`, `port_quest` 행 없음)
- [ ] **Step 2:** csv 헤더 순서 그대로 세 행을 넣는다. `custom_keys` 는 `flow|step|ms`, `via|caught|quests|sec`, `quest_id|act`. `code_line` 은 `js/port/index.js` 의 해당 `trackEvent` 줄. 나머지 열은 같은 성격의 기존 행(예: `delve_step`)을 본떠 채운다.
- [ ] **Step 3:** Run: `node --test tests/event-taxonomy.test.mjs tests/ga-param-split.test.mjs tests/ga-mp.test.mjs` / Expected: PASS. 코드 키 총량이 23을 넘으면 `ms` 를 기존 `sec`(초)로 바꾸는 식으로 이미 있는 키를 쓴다(이 경우 Task 3 의 `onStep` 과 테스트도 같이 바꾼다).
- [ ] **Step 4: 커밋**

```bash
git add docs/analysis/event-taxonomy.csv
git commit -m "docs(analytics): register port island and guide events"
```

---

### Task 14: 성능·함정 점검

**Files:** 필요 시 `js/port/index.js`, `dev/active/restaurant-port/restaurant-port-context.md`

- [ ] **Step 1:** 드로우콜: 마을 평소, 바다 한가운데, 섬 도착 직후 세 곳에서 `renderer.info.render.calls` 를 기록(메모리 draw-call-optimization 측정법). 섬이 마을보다 크게 높으면 바위·나무·물결 원을 재질별로 병합.
- [ ] **Step 2:** `js/shadow-scope.js:48` `OUT_OF_REACH_FLAGS` 에 `atSea` 가 이미 있어 추가가 필요 없는지 확인(:65 주석 기준).
- [ ] **Step 3:** 밤에 동시에 켜지는 포인트 라이트(통배 등불, 포장마차 등, 어부 집 창, 부엉이 손등불)를 세고 메모리 mobile-render-cost 기준을 넘으면 먼 것부터 emissive 만 남긴다.
- [ ] **Step 4:** 숫자를 context 문서에 적고 커밋.

```bash
git add dev/active/restaurant-port/restaurant-port-context.md js/port/index.js
git commit -m "perf(port): measure and trim island draw calls"
```

---

### Task 15: 배포(사용자 승인 뒤)

- [ ] **Step 1:** `npm test` 전부 PASS, 바뀐 js 를 `node --check`.
- [ ] **Step 2:** 키 스캔: `git grep -nE "(sk_live|sk-ant|AIza|service_role|-----BEGIN)" -- ':!*.md'` 결과 없음.
- [ ] **Step 3:** 사용자에게 배포 여부를 묻는다. 승인 뒤 `docs/ops/DEPLOY.md` 순서로 웹·토스(`bundle_upload` + 메모)·Play(프로덕션)·iOS·itch(`npm run build:itch`) 5곳, `main` 과 `capacitor` 둘 다.
- [ ] **Step 4:** 다음 날 BQ 에서 `guide_step`(단계 1~12 기기 수), `port_trip`, `port_quest` 가 들어왔는지 확인하고 단계별 이탈을 표로 남긴다.

---

## Self-Review

- 스펙 대응: 5.1 항해·바로 가기 → Task 9 / 5.2 낚시터 → Task 1·9 / 5.3 섬 구역 → Task 9·10 / 5.4 의뢰 → Task 1·10 / 5.5 창고 → Task 1·9·10 / 5.6 조형 → Task 6 / 6 길 안내 → Task 2·3·12 / 7 트래킹 → Task 9·10·12·13 / 9 코드 구조 → 전체 / 10 저장 → Task 11 / 12 결정(A안·C2·T2·해금·대사 박스·초상) → Task 4·5·6·7·10.
- 범위 밖(스펙 11절 후속): 의뢰 날짜 시드·단골, 정기 배송, 큰 물고기 줄다리기, 식당 전부, 창고의 서버 진실 값.
- 이름 일관성: `port.active`, `enterPort/leavePort/updatePort/portCamera/portAction/portPrompt/clampPort/portOwnsMovement/bindPortEnv/startPortGuide/guideActive/updatePortGuide`, nd `port_board/port_fast_go/port_cast/port_fish/port_talk/port_next/port_pick/port_buy/port_fast` 를 Task 7~12 에서 같은 철자로 썼다.
- 알려진 확인 지점(실행 중 grep 으로 확정): `makeSignpost` 인자 순서와 위치, `addGateWalk`/`makeWalk` 경로, 코인 차감 함수 이름, 월드 팝업 함수 이름, `analog`/`keys` 변수, 액션 버튼 DOM id. 각 태스크 안에 확인 명령을 적어 두었다.
