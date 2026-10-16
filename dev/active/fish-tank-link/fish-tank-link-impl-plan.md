# 마당 연못 (공간 연결 1번 · E3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 처음 물고기를 낚으면 집 앞마당에 연못이 생기고, 잡은 물고기(연못 어종 1종 1마리 + 바다 최대어 1마리)가 그 안에서 헤엄친다. 신규 기기는 E3 로 50:50 배정한다.

**Architecture:** 수확제 광장(`js/plaza/`)과 같은 구조 — 순수 규칙(`js/pond/rules.js`, Node 테스트) · 조형(`js/pond/build.js`, three) · 연결 진입점(`js/pond/index.js`). 스펙 §8 의 `js/spaces/pond.js` 한 파일 대신 이 폴더로 나눈다 — 순수 규칙을 Node 에서 테스트하려면 three 를 끌어오는 조형과 떨어져 있어야 해서. `game.js` 에는 연결 줄만 둔다. 배정은 E2 패턴(`js/exp-e3.js` 순수 + `js/exp-e3-boot.js` 저장소). 새 세이브 필드 없이 `gameState.dex.fish`·`gameState.sea.best` 에서 매번 계산한다.

**Tech Stack:** Vanilla ES modules · three.js(importmap, 브라우저 전용) · `node --test` · Supabase(PL/pgSQL) · GA4

**Spec:** `dev/active/fish-tank-link/pond-spec.md` · 실험: `dev/active/metrics-framework/space-link-experiment-prereg.md` (둘 다 analytics/metrics-framework 브랜치 — 워크트리로 복사해 함께 커밋)

## Global Constraints

- 새 코드·CSS·테스트에 주석을 넣지 않는다 (설명은 커밋 메시지·dev docs)
- 새 로직은 `game.js` 에 두지 않는다 — 연결 줄만
- `three`·`js/data/catalog.js`·`js/data/places.js` 는 Node 에서 import 불가 → 순수 모듈은 id 목록을 인자로 받고, 좌표 검증은 소스 텍스트를 파싱한다
- 안내 토스트 문구 정확히: `🌊 내 연못이 생겼어요 — 새 물고기를 잡을 때마다 식구가 늘어요` / en `🌊 Your own pond is here! Every new fish you catch joins the family`
- 월드 말풍선은 이모지만 (🐟, 🌊)
- GA4 이벤트 파라미터 ≤ 5, 사용자 속성 `exp_space` 는 `allUserProps()` 빌더로만 싣는다
- 배정 솔트 `e3:` · 무리 `off`/`on` · 저장 키 `cf_e3` · dev QA `?dbg&e3=on|off`
- 연못 반경 2.0 · 집 중심에서 6.5 이상 · 물고기 최대 7 + 바다 1 · 바다 물고기 크기 ×1.5
- 드로우콜 증가 ≤ 15 · 블룸 임계 0.85 아래 발광 · 물고기 그림자 끔
- 커밋 메시지 영어, `feat:`/`test:`/`fix:` 형식, 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## File Structure

| 파일 | 책임 |
|---|---|
| `js/data/pond.js` (신규) | 상수: `POND_R`, `POND_HOUSE_CLEAR`, `POND_SPOTS`(집 기준 상대 좌표 후보 3개), `POND_VIEW_R`, `POND_VIEW_SEC` |
| `js/pond/rules.js` (신규, 순수) | 물고기 목록·대어 계산, 변화 감지, 자리 고르기, 나무 배치 차단 |
| `js/pond/copy.js` (신규) | 토스트 문구 |
| `js/pond/build.js` (신규, three) | 연못 메시(불투명 1 + 물 1) · 물고기 유영 · 이모지 팝 |
| `js/pond/index.js` (신규) | 게임 연결: `refreshPond`, `updatePond`, `pondScatterBlocks` |
| `js/exp-e3.js` (신규, 순수) / `js/exp-e3-boot.js` (신규) | E3 배정 |
| `js/analytics.js` | `allUserProps()` 에 `e3UserProps` |
| `js/game.js` | `fishMesh(rarity, colOverride)` · import 1줄 · 연결 5곳 |
| `js/spaces/fishing.js`, `js/spaces/sea.js` | 획득 직후 `refreshPond` |
| `js/i18n-en.js` | 토스트 1문장 |
| `js/neighbors/sanitize.js`, `js/neighbors/scene.js`, `js/spaces/neighbor.js` | 이웃 연못 |
| `sql/migrations/migrate_neighbor_pond.sql` (신규) | `_nb_pond` + `neighbor_showcase` 에 `pond` |
| `tests/pond-spots.test.mjs`, `tests/pond-rules.test.mjs`, `tests/exp-e3.test.mjs`, `tests/pond-wiring.test.mjs`, `tests/neighbor-pond.test.mjs` (신규) | |

---

### Task 0: 워크트리

- [ ] **Step 1: main 에서 워크트리 만들기**

```bash
cd /Users/uicheol_hwang/calm_forest
git fetch origin main
git worktree add .claude/worktrees/space-link-pond -b feat/space-link-pond origin/main
cd .claude/worktrees/space-link-pond && npm ci
```

- [ ] **Step 2: 스펙·사전등록·시안 복사** (analytics 브랜치 파일 → 워크트리)

```bash
R=/Users/uicheol_hwang/calm_forest
W=$R/.claude/worktrees/space-link-pond
mkdir -p $W/dev/active/fish-tank-link $W/dev/active/metrics-framework
cp $R/dev/active/fish-tank-link/*.md $R/dev/active/fish-tank-link/*.png $W/dev/active/fish-tank-link/
cp $R/dev/active/metrics-framework/space-link-experiment-prereg.md $W/dev/active/metrics-framework/
cp $R/sims/fish-tank-sim.html $W/sims/
```

- [ ] **Step 3: 기준선 테스트** — Run: `npm test 2>&1 | tail -5` · Expected: `# fail 0`

- [ ] **Step 4: 미리보기 설정** — 루트 `.claude/launch.json` 의 `configurations` 에 추가(워크트리 launch.json 은 무시된다)

```json
{ "name": "space-link-pond", "runtimeExecutable": "python3",
  "runtimeArgs": ["/Users/uicheol_hwang/calm_forest/.claude/worktrees/space-link-pond/scripts/serve.py", "8817"], "port": 8817 }
```

- [ ] **Step 5: 커밋**

```bash
git add dev/active/fish-tank-link dev/active/metrics-framework/space-link-experiment-prereg.md sims/fish-tank-sim.html
git commit -m "docs(pond): spec, E3 pre-registration, mockups"
```

---

### Task 1: 연못 자리 상수 + 자리 검증 테스트

**Files:**
- Create: `js/data/pond.js`
- Test: `tests/pond-spots.test.mjs`

**Interfaces:**
- Produces: `POND_R = 2.0`, `POND_HOUSE_CLEAR = 6.5`, `POND_SPOTS: {dx:number, dz:number}[]` (집 `HOUSE_POS(-8,0,-8)` 기준), `POND_VIEW_R = 5`, `POND_VIEW_SEC = 3`

- [ ] **Step 1: 실패하는 테스트**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { POND_R, POND_SPOTS, POND_HOUSE_CLEAR } from '../js/data/pond.js';

const places = readFileSync(new URL('../js/data/places.js', import.meta.url), 'utf8');
const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
const vec = (src, name) => {
  const m = src.match(new RegExp(`const ${name} = new THREE\\.Vector3\\((-?[\\d.]+), 0, (-?[\\d.]+)\\)`));
  assert.ok(m, `${name} not found`);
  return { x: Number(m[1]), z: Number(m[2]) };
};
const HOUSE = vec(places, 'HOUSE_POS');
const abs = (s) => ({ x: HOUSE.x + s.dx, z: HOUSE.z + s.dz });
const d = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

test('후보는 3개, 모두 7단계 집과 통로를 비켜 선다', () => {
  assert.equal(POND_SPOTS.length, 3);
  for (const s of POND_SPOTS) assert.ok(Math.hypot(s.dx, s.dz) >= POND_HOUSE_CLEAR, JSON.stringify(s));
  assert.ok(POND_HOUSE_CLEAR >= 3.9 + POND_R + 0.6);
});

test('호수·나루터 연못과 겹치지 않는다', () => {
  const lake = vec(game, 'LAKE');
  const dock = vec(places, 'DOCK_POND');
  for (const s of POND_SPOTS) {
    assert.ok(d(abs(s), lake) >= 6 + POND_R + 1);
    assert.ok(d(abs(s), dock) >= 7 + POND_R + 1);
  }
});

test('마을 입구·시설 좌표와 2.5 이상 떨어진다', () => {
  const re = /export const ([A-Z_]+) = new THREE\.Vector3\((-?[\d.]+), 0, (-?[\d.]+)\)/g;
  const gates = [...places.matchAll(re)]
    .map(m => ({ name: m[1], x: Number(m[2]), z: Number(m[3]) }))
    .filter(g => g.name !== 'HOUSE_POS' && Math.abs(g.x) < 45 && Math.abs(g.z) < 45);
  assert.ok(gates.length > 5);
  for (const s of POND_SPOTS) for (const g of gates) assert.ok(d(abs(s), g) >= POND_R + 2.5, `${g.name} ${JSON.stringify(s)}`);
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/pond-spots.test.mjs` · Expected: FAIL `Cannot find module '../js/data/pond.js'`

- [ ] **Step 3: 상수 파일 `js/data/pond.js`**

```js
export const POND_R = 2.0;
export const POND_HOUSE_CLEAR = 6.5;
export const POND_SPOTS = Object.freeze([
  Object.freeze({ dx: 5.0, dz: 4.2 }),
  Object.freeze({ dx: 6.4, dz: -1.5 }),
  Object.freeze({ dx: 2.5, dz: 6.5 }),
]);
export const POND_VIEW_R = 5;
export const POND_VIEW_SEC = 3;
```

- [ ] **Step 4: 통과 확인** — Run: `node --test tests/pond-spots.test.mjs` · Expected: PASS 3. 실패한 후보는 단언 메시지에 나온 시설에서 멀어지는 쪽으로 0.5 씩 옮기고, `Math.hypot(dx,dz) ≥ 6.5` 를 지키며 다시 돌린다

- [ ] **Step 5: 게임 화면으로 자리 확인** — `preview_start space-link-pond` → `http://localhost:8817/?dbg` → 콘솔에서 후보마다 `window.__tp(-8 + dx, -8 + dz)` 후 스크린샷. 길·벤치·주민·꽃밭과 겹치는 후보는 상수를 옮기고 Step 4 반복. 최종 3점 스크린샷을 `dev/active/fish-tank-link/spots-1.png`~`spots-3.png` 로 저장

- [ ] **Step 6: 커밋**

```bash
git add js/data/pond.js tests/pond-spots.test.mjs dev/active/fish-tank-link/spots-*.png
git commit -m "feat(pond): yard pond spot candidates with clearance tests"
```

---

### Task 2: 순수 규칙 (`js/pond/rules.js`)

**Files:**
- Create: `js/pond/rules.js`
- Test: `tests/pond-rules.test.mjs`

**Interfaces:**
- Consumes: Task 1 `POND_SPOTS` 형태 `{dx,dz}`
- Produces:
  - `POND_MAX_RIVER = 7`, `POND_SEA_SCALE = 1.5`
  - `pondFish(dexFish: object, riverIds: string[]): string[]`
  - `pondSea(seaBest: object, seaIds: string[]): {sp:string, w:number} | null`
  - `pondView({dexFish, seaBest}, {riverIds, seaIds}): {fish:string[], sea:{sp,w}|null, has:boolean}`
  - `pondChanges(prev: View|null, next: View): {type:'created'|'fish'|'sea', species:string}[]`
  - `pickPondSpot(spots: {dx,dz}[], outdoorRel: {dx,dz}[], r: number): {dx,dz} | null`
  - `pondBlocks(spots, house: {x,z}, x: number, z: number, r: number, pad?: number): boolean`

- [ ] **Step 1: 실패하는 테스트 `tests/pond-rules.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POND_MAX_RIVER, pondFish, pondSea, pondView, pondChanges, pickPondSpot, pondBlocks } from '../js/pond/rules.js';

const RIVER = ['sakura_trout', 'puffer', 'maple_carp', 'ice_smelt', 'rare', 'uncommon', 'common'];
const SEA = ['aji', 'buri', 'mola', 'tuna'];
const ctx = { riverIds: RIVER, seaIds: SEA };

test('도감이 비면 연못이 없다', () => {
  assert.deepEqual(pondView({ dexFish: {}, seaBest: {} }, ctx), { fish: [], sea: null, has: false });
  assert.deepEqual(pondView({ dexFish: null, seaBest: undefined }, ctx), { fish: [], sea: null, has: false });
});

test('물고기는 첫 발견 순, 모르는 id 는 버린다', () => {
  assert.deepEqual(pondFish({ uncommon: 30, common: 10, shark: 5, rare: 20 }, RIVER), ['common', 'rare', 'uncommon']);
});

test('같은 시각이면 riverIds 순서', () => {
  assert.deepEqual(pondFish({ common: 1, rare: 1 }, RIVER), ['rare', 'common']);
});

test('최대 7마리', () => {
  const all = Object.fromEntries(RIVER.map((id, i) => [id, i + 1]));
  assert.equal(pondFish(all, RIVER).length, POND_MAX_RIVER);
});

test('대어는 가장 무거운 바다 종 하나, 동률은 seaIds 순서', () => {
  assert.equal(pondSea({}, SEA), null);
  assert.deepEqual(pondSea({ aji: 2, tuna: 88, mola: 60 }, SEA), { sp: 'tuna', w: 88 });
  assert.deepEqual(pondSea({ mola: 50, buri: 50 }, SEA), { sp: 'buri', w: 50 });
  assert.equal(pondSea({ whale: 900, aji: -1, buri: 'x' }, SEA), null);
});

test('바다 물고기만 있어도 연못이 생긴다', () => {
  assert.equal(pondView({ dexFish: {}, seaBest: { aji: 1.2 } }, ctx).has, true);
});

test('변화 감지: 처음 생김 → created 하나만', () => {
  const next = pondView({ dexFish: { common: 1 }, seaBest: {} }, ctx);
  assert.deepEqual(pondChanges(null, next), [{ type: 'created', species: 'common' }]);
});

test('변화 감지: 새 종·대어 교체', () => {
  const a = pondView({ dexFish: { common: 1 }, seaBest: { aji: 2 } }, ctx);
  const b = pondView({ dexFish: { common: 1, rare: 2 }, seaBest: { aji: 2, buri: 9 } }, ctx);
  assert.deepEqual(pondChanges(a, b), [{ type: 'fish', species: 'rare' }, { type: 'sea', species: 'buri' }]);
  assert.deepEqual(pondChanges(b, b), []);
});

test('같은 종 무게 경신도 sea 변화', () => {
  const a = pondView({ dexFish: {}, seaBest: { tuna: 60 } }, ctx);
  const b = pondView({ dexFish: {}, seaBest: { tuna: 70 } }, ctx);
  assert.deepEqual(pondChanges(a, b), [{ type: 'sea', species: 'tuna' }]);
});

test('연못이 없어지면 변화 없음', () => {
  const a = pondView({ dexFish: { common: 1 }, seaBest: {} }, ctx);
  const none = pondView({ dexFish: {}, seaBest: {} }, ctx);
  assert.deepEqual(pondChanges(a, none), []);
});

const SPOTS = [{ dx: 5, dz: 4.2 }, { dx: 6.4, dz: -1.5 }, { dx: 2.5, dz: 6.5 }];

test('야외 장식이 첫 후보를 차지하면 다음 후보', () => {
  assert.deepEqual(pickPondSpot(SPOTS, [], 2), SPOTS[0]);
  assert.deepEqual(pickPondSpot(SPOTS, [{ dx: 5.5, dz: 4 }], 2), SPOTS[1]);
  assert.equal(pickPondSpot(SPOTS, SPOTS.map(s => ({ ...s })), 2), null);
});

test('나무 배치 차단은 모든 후보 둘레', () => {
  const house = { x: -8, z: -8 };
  assert.equal(pondBlocks(SPOTS, house, -3, -3.8, 2), true);
  assert.equal(pondBlocks(SPOTS, house, -1.6, -9.5, 2), true);
  assert.equal(pondBlocks(SPOTS, house, 10, 10, 2), false);
  assert.equal(pondBlocks(SPOTS, house, -3, -3.8 + 2.4, 2, 0.5), true);
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/pond-rules.test.mjs` · Expected: FAIL `Cannot find module '../js/pond/rules.js'`

- [ ] **Step 3: 구현 `js/pond/rules.js`**

```js
export const POND_MAX_RIVER = 7;
export const POND_SEA_SCALE = 1.5;

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

export function pondFish(dexFish, riverIds) {
  const dex = obj(dexFish);
  return riverIds
    .map((id, i) => ({ id, i, t: dex[id] }))
    .filter(e => isNum(e.t))
    .sort((a, b) => (a.t - b.t) || (a.i - b.i))
    .slice(0, POND_MAX_RIVER)
    .map(e => e.id);
}

export function pondSea(seaBest, seaIds) {
  const best = obj(seaBest);
  let out = null;
  for (const sp of seaIds) {
    const w = best[sp];
    if (!isNum(w) || w <= 0) continue;
    if (!out || w > out.w) out = { sp, w };
  }
  return out;
}

export function pondView({ dexFish, seaBest } = {}, { riverIds, seaIds }) {
  const fish = pondFish(dexFish, riverIds);
  const sea = pondSea(seaBest, seaIds);
  return { fish, sea, has: fish.length > 0 || !!sea };
}

export function pondChanges(prev, next) {
  if (!next?.has) return [];
  if (!prev?.has) return [{ type: 'created', species: next.fish[0] ?? next.sea.sp }];
  const out = next.fish.filter(id => !prev.fish.includes(id)).map(species => ({ type: 'fish', species }));
  if (next.sea && (!prev.sea || next.sea.sp !== prev.sea.sp || next.sea.w > prev.sea.w)) out.push({ type: 'sea', species: next.sea.sp });
  return out;
}

export function pickPondSpot(spots, outdoorRel, r) {
  const items = Array.isArray(outdoorRel) ? outdoorRel : [];
  return spots.find(s => items.every(o => Math.hypot(o.dx - s.dx, o.dz - s.dz) >= r + 0.6)) ?? null;
}

export function pondBlocks(spots, house, x, z, r, pad = 0) {
  return spots.some(s => Math.hypot(house.x + s.dx - x, house.z + s.dz - z) < r + 0.6 + pad);
}
```

- [ ] **Step 4: 통과 확인** — Run: `node --test tests/pond-rules.test.mjs` · Expected: PASS 12

- [ ] **Step 5: 커밋**

```bash
git add js/pond/rules.js tests/pond-rules.test.mjs
git commit -m "feat(pond): pure rules for pond fish, big sea fish, changes and spot picking"
```

---

### Task 3: E3 배정

**Files:**
- Create: `js/exp-e3.js`, `js/exp-e3-boot.js`
- Modify: `js/analytics.js` (import 2줄 + `allUserProps()` 1곳)
- Test: `tests/exp-e3.test.mjs`

**Interfaces:**
- Produces:
  - `E3_ARMS = ['off','on']`, `E3_STORE_KEY = 'cf_e3'`
  - `armForE3(clientId: string): 'off'|'on'`
  - `decideE3({clientId, newDevice, stored, dev, forced}): {hashed, enrolled:boolean, arm:'off'|'on'|null, reason:'forced'|'dev'|'device'|'returning'|'new'}`
  - `parseE3Stored(raw: string|null): {arm}|null`
  - `e3UserProps(decision): {exp_space?: 'off'|'on'}` — forced(dev QA)는 싣지 않음
  - `spaceLinkOn(decision): boolean` — 배정됐고 `off` 일 때만 false
  - `e3Decision()` (`js/exp-e3-boot.js`, 첫 호출에 판정·memo)

- [ ] **Step 1: 실패하는 테스트 `tests/exp-e3.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E3_ARMS, armForE3, decideE3, parseE3Stored, e3UserProps, spaceLinkOn } from '../js/exp-e3.js';
import { armForE2 } from '../js/exp-e2.js';

const ids = Array.from({ length: 10000 }, (_, i) => `c-${i.toString(36)}-${(i * 7919).toString(16)}`);
const NEW = { clientId: 'c-abc', newDevice: true, stored: null, dev: false, forced: null };

test('해시 배정은 결정적이고 50:50 (48~52%)', () => {
  assert.equal(armForE3('c-x'), armForE3('c-x'));
  const on = ids.filter(id => armForE3(id) === 'on').length / ids.length;
  assert.ok(on > 0.48 && on < 0.52, String(on));
});

test('E2 와 독립 — 교차 칸이 약 25%', () => {
  const both = ids.filter(id => armForE3(id) === 'on' && armForE2(id) === 'skip_login').length / ids.length;
  assert.ok(both > 0.22 && both < 0.28, String(both));
});

test('새 기기만 배정, 기존 기기는 on·속성 없음', () => {
  const n = decideE3(NEW);
  assert.equal(n.enrolled, true); assert.equal(n.reason, 'new'); assert.ok(E3_ARMS.includes(n.arm));
  const old = decideE3({ ...NEW, newDevice: false });
  assert.equal(old.enrolled, false); assert.equal(old.reason, 'returning');
  assert.equal(spaceLinkOn(old), true); assert.deepEqual(e3UserProps(old), {});
});

test('저장 기록이 해시보다 먼저', () => {
  const flip = armForE3('c-abc') === 'on' ? 'off' : 'on';
  const d = decideE3({ ...NEW, newDevice: false, stored: { arm: flip } });
  assert.equal(d.arm, flip); assert.equal(d.reason, 'device');
});

test('dev 는 기록 없이 on, ?e3= 로 강제하되 속성은 안 싣는다', () => {
  const dev = decideE3({ ...NEW, dev: true });
  assert.equal(dev.enrolled, false); assert.equal(spaceLinkOn(dev), true);
  const forced = decideE3({ ...NEW, dev: true, forced: 'off' });
  assert.equal(forced.reason, 'forced'); assert.equal(spaceLinkOn(forced), false);
  assert.deepEqual(e3UserProps(forced), {});
  assert.equal(decideE3({ ...NEW, forced: 'off' }).reason, 'new');
});

test('사용자 속성·스위치', () => {
  const off = { enrolled: true, arm: 'off', reason: 'new' }, on = { enrolled: true, arm: 'on', reason: 'device' };
  assert.deepEqual(e3UserProps(off), { exp_space: 'off' });
  assert.deepEqual(e3UserProps(on), { exp_space: 'on' });
  assert.equal(spaceLinkOn(off), false); assert.equal(spaceLinkOn(on), true); assert.equal(spaceLinkOn(null), true);
});

test('저장 기록 파싱', () => {
  assert.deepEqual(parseE3Stored('{"arm":"off"}'), { arm: 'off' });
  assert.equal(parseE3Stored('{"arm":"x"}'), null);
  assert.equal(parseE3Stored('nope'), null);
  assert.equal(parseE3Stored(null), null);
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/exp-e3.test.mjs` · Expected: FAIL `Cannot find module '../js/exp-e3.js'`

- [ ] **Step 3: `js/exp-e3.js`**

```js
export const E3_ARMS = ['off', 'on'];
export const E3_STORE_KEY = 'cf_e3';

const isArm = (a) => E3_ARMS.includes(a);

export function armForE3(clientId) {
  const s = `e3:${clientId || ''}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15;
  return E3_ARMS[(h >>> 0) & 1];
}

export function decideE3({ clientId, newDevice = false, stored = null, dev = false, forced = null } = {}) {
  const hashed = armForE3(clientId);
  const out = (enrolled, arm, reason) => ({ hashed, enrolled, arm: enrolled ? arm : null, reason });
  if (dev && isArm(forced)) return out(true, forced, 'forced');
  if (dev) return out(false, null, 'dev');
  if (isArm(stored?.arm)) return out(true, stored.arm, 'device');
  if (!newDevice) return out(false, null, 'returning');
  return out(true, hashed, 'new');
}

export function parseE3Stored(raw) {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' && !Array.isArray(v) && isArm(v.arm) ? { arm: v.arm } : null;
  } catch { return null; }
}

export function e3UserProps(decision) {
  return decision?.enrolled && decision.reason !== 'forced' && isArm(decision.arm) ? { exp_space: decision.arm } : {};
}

export function spaceLinkOn(decision) {
  return !(decision?.enrolled && decision.arm === 'off');
}
```

- [ ] **Step 4: `js/exp-e3-boot.js`**

```js
import { IS_DEV_SESSION } from './config.js';
import { clientId, clientIdIsNew } from './i18n.js';
import { decideE3, parseE3Stored, E3_STORE_KEY } from './exp-e3.js';

const store = () => { try { return window.localStorage; } catch { return null; } };
const safe = (fn, fallback) => { try { return fn(); } catch { return fallback; } };

let memo = null;
export function e3Decision() {
  if (memo) return memo;
  const s = store();
  memo = decideE3({
    clientId: clientId(),
    newDevice: clientIdIsNew(),
    stored: parseE3Stored(safe(() => s?.getItem(E3_STORE_KEY), null)),
    dev: IS_DEV_SESSION,
    forced: IS_DEV_SESSION ? new URLSearchParams(location.search).get('e3') : null,
  });
  if (memo.reason === 'new') safe(() => s?.setItem(E3_STORE_KEY, JSON.stringify({ arm: memo.arm })), null);
  return memo;
}
```

- [ ] **Step 5: `js/analytics.js`** — `import { e2UserProps } from './exp-e2.js';` 아래에 2줄, `allUserProps` 반환 객체의 `...e2UserProps(e2Decision()),` 바로 뒤에 `...e3UserProps(e3Decision()),`

```js
import { e3Decision } from './exp-e3-boot.js';
import { e3UserProps } from './exp-e3.js';
```

```js
  return { platform: PLATFORM, lang: LANG, ab_variant: abVariant ?? assignVariant(), ...e2UserProps(e2Decision()),
    ...e3UserProps(e3Decision()), ...installProps(), ...(expArm ? { exp_arm: expArm } : {}), ...extra };
```

- [ ] **Step 6: 통과 확인** — Run: `node --test tests/exp-e3.test.mjs && npm test 2>&1 | tail -3` · Expected: PASS 7 · `# fail 0`

- [ ] **Step 7: 커밋**

```bash
git add js/exp-e3.js js/exp-e3-boot.js js/analytics.js tests/exp-e3.test.mjs
git commit -m "feat(e3): space-link experiment assignment (new devices 50:50, exp_space user property)"
```

---

### Task 4: 연못 조형 (`js/pond/build.js`) + `fishMesh` 색 인자

**Files:**
- Create: `js/pond/build.js`
- Modify: `js/game.js` — `function fishMesh(rarity) {` 와 다음 색 줄 2줄
- Test: `tests/pond-wiring.test.mjs` (이 태스크에서 만들고 Task 5 에서 늘린다)

**Interfaces:**
- Consumes: Task 1 `POND_R`, Task 2 `POND_SEA_SCALE`
- Produces: `buildPond({ fishMesh, mergeGeos, paintGeo, emojiSprite }): { group: THREE.Group, setContents(view, seaColorOf: (sp:string)=>number): void, pop(emoji:string): void, update(dt:number): void, dispose(): void }`

- [ ] **Step 1: 실패하는 테스트 `tests/pond-wiring.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('fishMesh 는 색을 덮어쓸 수 있다', () => {
  assert.match(src('js/game.js'), /function fishMesh\(rarity, colOverride\)/);
  assert.match(src('js/game.js'), /const col = colOverride \?\? FISH_KINDS/);
});

test('연못 조형은 불투명 1 + 물 1 메시, 물고기 그림자 없음', () => {
  const b = src('js/pond/build.js');
  assert.equal((b.match(/new THREE\.Mesh\(/g) || []).length, 2);
  assert.match(b, /castShadow = false/);
  assert.match(b, /POND_SEA_SCALE/);
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/pond-wiring.test.mjs` · Expected: FAIL (정규식 불일치 / 파일 없음)

- [ ] **Step 3: `game.js` 의 fishMesh 두 줄 수정** (셋째 줄 `?? (rarity === 'rare' ? …)` 는 그대로)

```js
function fishMesh(rarity, colOverride) {
  const g = new THREE.Group();
  const col = colOverride ?? FISH_KINDS.find(k => k.rarity === rarity)?.col
```

- [ ] **Step 4: `js/pond/build.js`**

```js
import * as THREE from 'three';
import { POND_R } from '../data/pond.js';
import { POND_SEA_SCALE } from './rules.js';

const FISH_SCALE = 0.62;
const BED = 0x3f7f96, ROCK_A = 0xb8b0a4, ROCK_B = 0xa39a8e, PAD = 0x5fbf7a, REED = 0x6aa84f, LOTUS = 0xf5a9c4;

function shoreGeometry({ mergeGeos, paintGeo }) {
  const parts = [paintGeo(new THREE.CylinderGeometry(POND_R - 0.1, POND_R - 0.1, 0.06, 20).translate(0, -0.18, 0), BED)];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const g = new THREE.DodecahedronGeometry(0.26 + (i % 3) * 0.05, 0).scale(1, 0.6, 1)
      .translate(Math.cos(a) * (POND_R + 0.1), 0.08, Math.sin(a) * (POND_R + 0.1));
    parts.push(paintGeo(g, i % 2 ? ROCK_A : ROCK_B));
  }
  for (const [x, z] of [[-0.8, -0.6], [0.9, 0.7], [0.2, -1.1]]) {
    parts.push(paintGeo(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 10, 1, false, 0.4, Math.PI * 1.75).translate(x, 0.07, z), PAD));
  }
  parts.push(paintGeo(new THREE.SphereGeometry(0.09, 6, 5).translate(0.9, 0.12, 0.7), LOTUS));
  for (const [x, z] of [[-1.8, 0.7], [-1.6, 1.0], [1.5, -1.4]]) {
    parts.push(paintGeo(new THREE.CylinderGeometry(0.03, 0.04, 0.9, 4).translate(x, 0.45, z), REED));
  }
  return mergeGeos(parts);
}

export function buildPond({ fishMesh, mergeGeos, paintGeo, emojiSprite }) {
  const group = new THREE.Group(); group.name = 'pond';
  const shore = new THREE.Mesh(shoreGeometry({ mergeGeos, paintGeo }),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true }));
  shore.receiveShadow = true;
  const water = new THREE.Mesh(new THREE.CylinderGeometry(POND_R - 0.05, POND_R - 0.05, 0.04, 24),
    new THREE.MeshStandardMaterial({ color: 0x4aa6d0, transparent: true, opacity: 0.3, roughness: 0.25, emissive: 0x184a63, emissiveIntensity: 0.35, depthWrite: false }));
  water.position.y = 0.04; water.renderOrder = 2;
  group.add(shore, water);

  let swimmers = [];
  const pops = [];
  let t = 0;

  const addFish = (mesh, i, scale) => {
    mesh.scale.setScalar(scale);
    mesh.traverse(o => { o.castShadow = false; });
    group.add(mesh);
    swimmers.push({ mesh, rx: 1.15 - (i % 4) * 0.12, rz: 0.9 - (i % 4) * 0.1, cx: ((i % 4) - 1.5) * 0.15,
      cz: i % 2 ? 0.2 : -0.2, speed: (i % 2 ? -1 : 1) * (0.35 + (i % 5) * 0.05), phase: i * 1.5 });
  };

  const clearFish = () => {
    for (const s of swimmers) { group.remove(s.mesh); s.mesh.traverse(o => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); }
    swimmers = [];
  };

  return {
    group,
    setContents(view, seaColorOf) {
      clearFish();
      view.fish.forEach((id, i) => addFish(fishMesh(id), i, FISH_SCALE));
      if (view.sea) addFish(fishMesh('common', seaColorOf(view.sea.sp)), view.fish.length, FISH_SCALE * POND_SEA_SCALE);
    },
    pop(emoji) {
      const sp = emojiSprite(emoji, 0.7);
      sp.position.set(0, 1.2, 0); group.add(sp); pops.push({ sp, age: 0 });
    },
    update(dt) {
      t += dt;
      for (const f of swimmers) {
        const a = t * f.speed + f.phase;
        f.mesh.position.set(f.cx + Math.cos(a) * f.rx, -0.05 + Math.sin(a * 2) * 0.03, f.cz + Math.sin(a) * f.rz);
        f.mesh.rotation.y = -a - (Math.PI / 2) * Math.sign(f.speed);
      }
      for (let i = pops.length - 1; i >= 0; i--) {
        const p = pops[i]; p.age += dt;
        p.sp.position.y = 1.2 + p.age * 0.6; p.sp.material.opacity = Math.max(0, 1 - p.age / 1.6);
        if (p.age > 1.6) { group.remove(p.sp); p.sp.material.dispose(); pops.splice(i, 1); }
      }
    },
    dispose() {
      clearFish();
      for (const p of pops) { group.remove(p.sp); p.sp.material.dispose(); }
      shore.geometry.dispose(); shore.material.dispose(); water.geometry.dispose(); water.material.dispose();
    },
  };
}
```

- [ ] **Step 5: 통과 확인** — Run: `node --test tests/pond-wiring.test.mjs` · Expected: PASS 2

- [ ] **Step 6: 커밋**

```bash
git add js/pond/build.js js/game.js tests/pond-wiring.test.mjs
git commit -m "feat(pond): pond mesh (1 opaque + 1 water) and swimming fish; fishMesh color override"
```

---

### Task 5: 게임 연결 (`js/pond/index.js` · copy · i18n · 훅)

**Files:**
- Create: `js/pond/index.js`, `js/pond/copy.js`
- Modify: `js/game.js` (import 1줄 · 연결 5곳), `js/spaces/fishing.js` (catchFish), `js/spaces/sea.js` (최고 기록 갱신 뒤), `js/i18n-en.js`
- Test: `tests/pond-wiring.test.mjs` (추가)

**Interfaces:**
- Consumes: Task 1~4 · `game.js` 내보내기 `gameState, scene, solidCircle, ui, player, dist2D, fishMesh, mergeGeos, paintGeo, requestSave` (광장 `js/plaza/index.js` 가 같은 이름으로 import 중) · `emojiSprite` (`js/spaces/kitchen-stage.js`) · `trackEvent` · `e3Decision`, `spaceLinkOn`
- Produces: `refreshPond(trigger: 'load'|'fishing'|'sea'): void`, `updatePond(dt: number, inVillage: boolean): void`, `pondScatterBlocks(x: number, z: number, pad?: number): boolean`

- [ ] **Step 1: 실패하는 테스트 (파일 끝에 추가, import 는 맨 위로)**

```js
import { POND_COPY } from '../js/pond/copy.js';

test('토스트 문구와 영어 사전', () => {
  assert.equal(POND_COPY.created, '🌊 내 연못이 생겼어요 — 새 물고기를 잡을 때마다 식구가 늘어요');
  assert.ok(src('js/i18n-en.js').includes("'🌊 내 연못이 생겼어요 — 새 물고기를 잡을 때마다 식구가 늘어요': '🌊 Your own pond is here! Every new fish you catch joins the family'"));
});

test('game.js 는 연결 줄만 가진다', () => {
  const g = src('js/game.js');
  assert.match(g, /import \{ refreshPond, updatePond, pondScatterBlocks \} from '\.\/pond\/index\.js';/);
  assert.match(g, /refreshPond\('load'\)/);
  assert.match(g, /updatePond\(dt, inVillage2\(\)\)/);
  assert.ok((g.match(/pondScatterBlocks\(x, z/g) || []).length >= 3);
});

test('낚시·바다 획득 직후 갱신', () => {
  const f = src('js/spaces/fishing.js');
  assert.ok(f.indexOf("refreshPond('fishing')") > f.indexOf("dexDiscover('fish', kind.rarity)"));
  assert.match(src('js/spaces/sea.js'), /refreshPond\('sea'\)/);
});

test('연결 모듈: 스위치·트래킹·1회 토스트', () => {
  const p = src('js/pond/index.js');
  assert.match(p, /spaceLinkOn\(e3Decision\(\)\)/);
  for (const ev of ['pond_created', 'pond_fish_added', 'pond_view']) assert.match(p, new RegExp(`trackEvent\\('${ev}'`));
  assert.match(p, /hintsSeen\.pond/);
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/pond-wiring.test.mjs` · Expected: FAIL `Cannot find module '../js/pond/copy.js'`

- [ ] **Step 3: `js/pond/copy.js`**

```js
export const POND_COPY = Object.freeze({
  created: '🌊 내 연못이 생겼어요 — 새 물고기를 잡을 때마다 식구가 늘어요',
});
```

- [ ] **Step 4: `js/i18n-en.js`** — `EN` 객체 닫는 `};` 바로 앞 줄에

```js
  '🌊 내 연못이 생겼어요 — 새 물고기를 잡을 때마다 식구가 늘어요': '🌊 Your own pond is here! Every new fish you catch joins the family',
```

- [ ] **Step 5: `js/pond/index.js`**

```js
import { gameState, scene, solidCircle, ui, player, dist2D, fishMesh, mergeGeos, paintGeo, requestSave } from '../game.js';
import { emojiSprite } from '../spaces/kitchen-stage.js';
import { trackEvent } from '../analytics.js';
import { FISH_KINDS } from '../data/catalog.js';
import { SEA_SPECIES, HOUSE_POS } from '../data/places.js';
import { POND_R, POND_SPOTS, POND_VIEW_R, POND_VIEW_SEC } from '../data/pond.js';
import { pondView, pondChanges, pickPondSpot, pondBlocks } from './rules.js';
import { buildPond } from './build.js';
import { POND_COPY } from './copy.js';
import { e3Decision } from '../exp-e3-boot.js';
import { spaceLinkOn } from '../exp-e3.js';

const RIVER_IDS = FISH_KINDS.map(k => k.rarity);
const SEA_IDS = SEA_SPECIES.map(s => s.id);
const seaColorOf = (sp) => SEA_SPECIES.find(s => s.id === sp)?.color ?? 0x6f8fa8;

let pond = null, solid = null, last = null, nearSec = 0, viewedDay = null;

const kstDay = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const outdoorRel = () => (Array.isArray(gameState.outdoor) ? gameState.outdoor : [])
  .filter(o => Number.isFinite(o?.x) && Number.isFinite(o?.z))
  .map(o => ({ dx: o.x - HOUSE_POS.x, dz: o.z - HOUSE_POS.z }));

function ensureBuilt() {
  if (pond) return true;
  const spot = pickPondSpot(POND_SPOTS, outdoorRel(), POND_R);
  if (!spot) return false;
  pond = buildPond({ fishMesh, mergeGeos, paintGeo, emojiSprite });
  pond.group.position.set(HOUSE_POS.x + spot.dx, 0, HOUSE_POS.z + spot.dz);
  scene.add(pond.group);
  solid = solidCircle(pond.group.position.x, pond.group.position.z, POND_R + 0.1);
  return true;
}

export function refreshPond(trigger) {
  if (!spaceLinkOn(e3Decision())) return;
  const view = pondView({ dexFish: gameState.dex?.fish, seaBest: gameState.sea?.best }, { riverIds: RIVER_IDS, seaIds: SEA_IDS });
  if (!view.has || !ensureBuilt()) return;
  const changes = pondChanges(last, view);
  pond.setContents(view, seaColorOf);
  last = view;
  for (const c of changes) {
    if (c.type === 'created') {
      trackEvent('pond_created', { trigger: trigger === 'load' ? 'existing' : trigger, species: c.species });
      if (!gameState.hintsSeen.pond) { gameState.hintsSeen.pond = true; ui.toast?.(POND_COPY.created, 4200); requestSave(); }
    } else {
      trackEvent('pond_fish_added', { species: c.species, kind: c.type === 'sea' ? 'sea' : 'river', count: view.fish.length + (view.sea ? 1 : 0) });
      if (trigger !== 'load') pond.pop(c.type === 'sea' ? '🌊' : '🐟');
    }
  }
}

export function updatePond(dt, inVillage) {
  if (!pond) return;
  pond.group.visible = inVillage;
  if (solid) solid.off = !inVillage;
  if (!inVillage) { nearSec = 0; return; }
  pond.update(dt);
  const near = dist2D(player.position, pond.group.position) < POND_VIEW_R;
  nearSec = near ? nearSec + dt : 0;
  if (nearSec >= POND_VIEW_SEC && viewedDay !== kstDay()) {
    viewedDay = kstDay();
    trackEvent('pond_view', { count: (last?.fish.length ?? 0) + (last?.sea ? 1 : 0) });
  }
}

export function pondScatterBlocks(x, z, pad = 0) {
  return pondBlocks(POND_SPOTS, HOUSE_POS, x, z, POND_R, pad);
}
```

- [ ] **Step 6: `js/game.js` 연결** (행 번호는 origin/main 기준, 문자열로 찾는다)
  - `import { initPlaza, updatePlaza, … } from './plaza/index.js';` 다음 줄:

```js
import { refreshPond, updatePond, pondScatterBlocks } from './pond/index.js';
```

  - `refreshPlaza();` (세이브 복원 직후, 2655행 부근) 다음 줄: `refreshPond('load');`
  - `updatePlaza(dt, inVillage2());` (5731행 부근) 다음 줄: `updatePond(dt, inVillage2());`
  - 나무 배치 조건 `|| plazaScatterBlocks(x, z)` (2899행 부근) 다음 줄: `|| pondScatterBlocks(x, z)`
  - `if (plazaScatterBlocks(x, z, 0.5)) continue;` (2929행 부근) 다음 줄: `if (pondScatterBlocks(x, z, 0.5)) continue;`
  - `if (plazaScatterBlocks(x, z, 1)) continue;` (4504행 부근) 다음 줄: `if (pondScatterBlocks(x, z, 1)) continue;`

- [ ] **Step 7: 낚시·바다 훅**
  - `js/spaces/fishing.js`: import 블록 끝에 `import { refreshPond } from '../pond/index.js';` · `catchFish()` 의 `noteSpecialExhibit('fish', kind.rarity);` 다음 줄에 `refreshPond('fishing');`
  - `js/spaces/sea.js`: 같은 import · `const _prevBest = gameState.sea.best?.[sp.id];` 이후 `gameState.sea.best` 를 새 값으로 쓰는 줄(`bestAfterCatch` 결과 대입)을 찾아 그 다음 줄에 `refreshPond('sea');`

- [ ] **Step 8: 통과 확인** — Run: `node --test tests/pond-wiring.test.mjs && npm test 2>&1 | tail -3` · Expected: PASS 6 · `# fail 0`

- [ ] **Step 9: 커밋**

```bash
git add js/pond/index.js js/pond/copy.js js/game.js js/spaces/fishing.js js/spaces/sea.js js/i18n-en.js tests/pond-wiring.test.mjs
git commit -m "feat(pond): wire pond into village (first catch creates it, tracking, toast once)"
```

---

### Task 6: 이웃 구경에 연못

**Files:**
- Create: `sql/migrations/migrate_neighbor_pond.sql`
- Modify: `js/neighbors/sanitize.js`, `js/neighbors/scene.js`, `js/spaces/neighbor.js` (ctx, 29행 부근)
- Test: `tests/neighbor-pond.test.mjs`

**Interfaces:**
- Consumes: Task 2 `POND_MAX_RIVER`, `pickPondSpot`; Task 1 `POND_SPOTS`, `POND_R`; Task 4 `buildPond`
- Produces: View 에 `pond: {fish:string[], sea:{sp,w}|null, has:boolean}` · ctx 에 `pondRiverIds:string[]`, `seaIds:string[]` · showcase JSON 에 `pond: {fish:[...], sea:{sp,w}|null}`

- [ ] **Step 1: 실패하는 테스트 `tests/neighbor-pond.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeShowcase } from '../js/neighbors/sanitize.js';

const ctx = {
  outdoorIds: new Set(['bench']), decorIds: new Set(), animalIds: new Set(['bear']), fallbackAnimal: 'bear',
  yard: { x: -8, z: -8 },
  pondRiverIds: ['sakura_trout', 'puffer', 'maple_carp', 'ice_smelt', 'rare', 'uncommon', 'common'],
  seaIds: ['aji', 'buri', 'mola', 'tuna'],
};
const base = { houseStage: 3, nickname: 'a', character: 'bear', outdoor: [] };

test('pond 없으면 has=false', () => {
  assert.deepEqual(sanitizeShowcase(base, ctx).pond, { fish: [], sea: null, has: false });
});

test('모르는 id·중복·8개 이상은 버린다', () => {
  const raw = { ...base, pond: { fish: ['common', 'common', 'shark', 'rare', 1, 'uncommon', 'puffer', 'maple_carp', 'ice_smelt', 'sakura_trout'], sea: { sp: 'tuna', w: 70 } } };
  const p = sanitizeShowcase(raw, ctx).pond;
  assert.deepEqual(p.fish, ['common', 'rare', 'uncommon', 'puffer', 'maple_carp', 'ice_smelt', 'sakura_trout']);
  assert.deepEqual(p.sea, { sp: 'tuna', w: 70 });
});

test('깨진 대어는 null', () => {
  assert.equal(sanitizeShowcase({ ...base, pond: { fish: [], sea: { sp: 'whale', w: 9 } } }, ctx).pond.sea, null);
  assert.equal(sanitizeShowcase({ ...base, pond: { fish: [], sea: { sp: 'aji', w: -1 } } }, ctx).pond.sea, null);
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/neighbor-pond.test.mjs` · Expected: FAIL (`pond` undefined)

- [ ] **Step 3: `js/neighbors/sanitize.js`** — import 추가, `const room = …` 다음에 계산, 반환 객체 `addons, outdoor, room,` → `addons, outdoor, room, pond,`

```js
import { POND_MAX_RIVER } from '../pond/rules.js';
```

```js
  const rp = raw.pond && typeof raw.pond === 'object' ? raw.pond : {};
  const riverIds = ctx.pondRiverIds || [];
  const pondFish = [...new Set((Array.isArray(rp.fish) ? rp.fish : []).filter(id => typeof id === 'string' && riverIds.includes(id)))].slice(0, POND_MAX_RIVER);
  const sw = rp.sea && typeof rp.sea === 'object' ? rp.sea : null;
  const pondSea = sw && (ctx.seaIds || []).includes(sw.sp) && num(sw.w) != null && sw.w > 0 ? { sp: sw.sp, w: sw.w } : null;
  const pond = { fish: pondFish, sea: pondSea, has: pondFish.length > 0 || !!pondSea };
```

- [ ] **Step 4: `js/spaces/neighbor.js` ctx** — `outdoorIds: new Set(OUTDOOR.map(d => d.id)), …` 줄 뒤에 아래 줄, 파일 import 에 `FISH_KINDS`(`'../data/catalog.js'` 기존 import 줄에 추가)와 `SEA_SPECIES`(`'../data/places.js'`)

```js
  pondRiverIds: FISH_KINDS.map(k => k.rarity), seaIds: SEA_SPECIES.map(s => s.id),
```

- [ ] **Step 5: `js/neighbors/scene.js`**
  - import: `'../game.js'` 줄에 `fishMesh, mergeGeos, paintGeo` 추가 · `'../data/places.js'` 줄에 `SEA_SPECIES` 추가 · 새 줄

```js
import { buildPond } from '../pond/build.js';
import { pickPondSpot } from '../pond/rules.js';
import { POND_SPOTS, POND_R } from '../data/pond.js';
import { emojiSprite } from '../spaces/kitchen-stage.js';
```

  - `let host = null, pet = null, sign = null, t = 0;` → `let host = null, pet = null, sign = null, t = 0, pondUpdate = null, pondDispose = null;`
  - `update(dt) { t += dt; host.position.y = …; }` 본문 끝에 `pondUpdate?.(dt);`
  - `dispose() {` 첫 줄에 `pondDispose?.();`
  - 앞마당 장식 `for (const o of view.outdoor) { … }` 다음에

```js
    if (view.pond?.has) {
      const ps = pickPondSpot(POND_SPOTS, view.outdoor, POND_R);
      if (ps) {
        const p = buildPond({ fishMesh, mergeGeos, paintGeo, emojiSprite });
        p.group.position.set(NEIGHBOR.x + ps.dx, 0, NEIGHBOR.z + ps.dz);
        p.setContents(view.pond, (sp) => SEA_SPECIES.find(s => s.id === sp)?.color ?? 0x6f8fa8);
        group.add(p.group);
        pondUpdate = (dt) => p.update(dt);
        pondDispose = () => p.dispose();
      }
    }
```

- [ ] **Step 6: SQL `sql/migrations/migrate_neighbor_pond.sql`** — 아래 함수, 그리고 `sql/migrations/migrate_neighbors_room.sql` 의 `create or replace function public.neighbor_showcase` 정의 전체(31~67행)를 그대로 복사해 `'coop', jsonb_build_object(…)` 다음에 `, 'pond', _nb_pond(s)` 를 더한 것. 원본 파일에 `grant execute … neighbor_showcase` 줄이 있으면 그대로 따라 붙인다

```sql
create or replace function public._nb_pond(p_state jsonb)
returns jsonb language sql immutable as $$
  with fish as (
    select k.key as id, (k.value #>> '{}')::numeric as t
    from jsonb_each(case when jsonb_typeof(p_state #> '{dex,fish}') = 'object' then p_state #> '{dex,fish}' else '{}'::jsonb end) k
    where k.key in ('sakura_trout','puffer','maple_carp','ice_smelt','rare','uncommon','common')
      and jsonb_typeof(k.value) = 'number'
    order by 2, array_position(array['sakura_trout','puffer','maple_carp','ice_smelt','rare','uncommon','common'], k.key)
    limit 7
  ), sea as (
    select k.key as sp, (k.value #>> '{}')::numeric as w
    from jsonb_each(case when jsonb_typeof(p_state #> '{sea,best}') = 'object' then p_state #> '{sea,best}' else '{}'::jsonb end) k
    where k.key in ('aji','buri','mola','tuna') and jsonb_typeof(k.value) = 'number' and (k.value #>> '{}')::numeric > 0
    order by 2 desc, array_position(array['aji','buri','mola','tuna'], k.key)
    limit 1
  )
  select jsonb_build_object(
    'fish', coalesce((select jsonb_agg(id order by t, array_position(array['sakura_trout','puffer','maple_carp','ice_smelt','rare','uncommon','common'], id)) from fish), '[]'::jsonb),
    'sea', (select jsonb_build_object('sp', sp, 'w', w) from sea));
$$;
```

- [ ] **Step 7: SQL 적용·검증 (풀러 직접 실행)** — 메모리 [[sql-run-direct-pooler]] 절차대로 `ml/.venv/bin/python` + pg8000 로 파일을 DO 블록 하나로 실행 → 확인

```sql
select public._nb_pond('{"dex":{"fish":{"common":2,"rare":1,"shark":0}},"sea":{"best":{"tuna":70,"aji":"x"}}}'::jsonb);
```

Expected: `{"fish": ["rare", "common"], "sea": {"sp": "tuna", "w": 70}}`

- [ ] **Step 8: 통과 확인** — Run: `node --test tests/neighbor-pond.test.mjs && npm test 2>&1 | tail -3` · Expected: PASS 3 · `# fail 0`. 기존 `tests/neighbors-*` 가 View 키 목록을 고정해 두었다면 그 단언에 `pond` 를 추가한다

- [ ] **Step 9: 커밋**

```bash
git add sql/migrations/migrate_neighbor_pond.sql js/neighbors/sanitize.js js/neighbors/scene.js js/spaces/neighbor.js tests/neighbor-pond.test.mjs
git commit -m "feat(pond): show host pond in neighbor village (showcase pond field, sanitized)"
```

---

### Task 7: 실기 검증 (브라우저)

- [ ] **Step 1: 처치 무리** — `http://localhost:8817/?dbg&e3=on`, 새 게스트로 시작 → 호수에서 첫 물고기 → 토스트 1회 → 마을로 돌아와 집 앞 연못·물고기 1마리 → 다른 어종 → 🐟 팝 + 2마리 → 새로고침 후에도 연못 유지, 토스트 재표시 없음
- [ ] **Step 2: 대조 무리** — `?dbg&e3=off`, 물고기를 잡아도 연못 없음 · `read_console_messages onlyErrors` 0
- [ ] **Step 3: 기존 유저** — 도감에 물고기가 있는 세이브를 `?dbg` 로 로드 → 연못이 바로 보이고 토스트 1회 (세이브 주입은 메모리 [[worktree-pitfalls]] 의 fetch 세이브 주입 방식)
- [ ] **Step 4: 화면 캡처** — PC(1600×1000)·모바일 세로(390×844) 게임 거리 스크린샷 → `dev/active/fish-tank-link/ingame-pc.png`, `ingame-mobile.png` · 직접 열어 물고기 색이 게임 거리에서 구분되는지 확인
- [ ] **Step 5: 드로우콜** — 메모리 [[draw-call-optimization]] 측정법으로 연못 있음/없음 비교. Expected: 증가 ≤ 15 (연못 2 + 물고기 최대 8 + 무지개 눈 1)
- [ ] **Step 6: 밤** — 밤 시각으로 블룸에 물·물고기가 하얗게 번지지 않는지 캡처
- [ ] **Step 7: 이웃** — 연못 있는 계정을 이웃 구경으로 열어 연못·물고기 표시, 나갈 때 콘솔 오류 0
- [ ] **Step 8:** 문제를 찾으면 해당 태스크로 돌아가 실패하는 테스트부터 쓰고 고친 뒤 이 태스크 반복 · 통과한 캡처를 커밋

```bash
git add dev/active/fish-tank-link/ingame-*.png
git commit -m "test(pond): in-game verification captures"
```

---

### Task 8: 리뷰·마무리

- [ ] **Step 1:** `code-reviewer` 에이전트로 `git diff origin/main...HEAD` 리뷰 → CRITICAL/HIGH 수정 (수정마다 테스트 먼저)
- [ ] **Step 2:** `npm test 2>&1 | tail -3` → `# fail 0`
- [ ] **Step 3:** 키 스캔 (PUBLIC 저장소) — `git grep -n -E "AIza|GOCSPX-|sk-ant-|sbp_" HEAD -- js sql tests dev` → 출력 0
- [ ] **Step 4:** dev docs(`fish-tank-link-tasks.md`·`fish-tank-link-context.md`) 갱신·커밋
- [ ] **Step 5:** 배포는 사용자 승인 후 별도 — 메모리 [[deploy-checklist]] (웹·토스 `bundle_upload` 메모·Play 프로덕션·iOS·itch, main + feat/capacitor-app 푸시) · 웹 배포일 = E3 시작일로 사전등록 문서에 기록 · 다음 날 BQ 에서 `pond_*` 이벤트와 `exp_space` 적재 재검증 · 광고 시작은 4곳 출시 확인 뒤
