# 🏛️ 박물관 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 박물관 정문을 1층에만 두고, 층별 배치(1·2층 벽 유리장 / 3층·특별전 회랑+낮은 탁자)를 새로 짜며, 원석으로 뭉뚱그려진 전시물을 카테고리별 조형으로 바꾼다.

**Architecture:** 배치는 THREE 없는 순수 모듈 `js/museum/layout.js` 로 분리하고 `cafe.js` 의 `buildMuseumHall` 이 그 결과를 그린다. 전시물은 "도형 목록(순수 데이터) `exhibit-parts.js` → THREE 병합 빌더 `exhibit-build.js`(전시물당 메시 ≤3)" 두 겹으로 나눠 Node 에서 데이터를 테스트한다. 방 크기는 층별이므로 `MUSEUM_HALF_W/D` 상수를 `museumDims()` 로 바꾼다.

**Tech Stack:** Vanilla ES modules · Three.js(브라우저 importmap, Node 에는 없음) · `node --test`(`npm test`) · `tests/helpers/game-source.mjs` 의 텍스트 검사.

**Spec:** `docs/superpowers/specs/2026-10-06-museum-redesign-design.md` · 시안 `sims/museum-redesign-layout-sim.html`, `sims/museum-redesign-exhibits-sim.html`

## Global Constraints

- **스펙과 달라지는 한 가지:** 벽 배치 방은 스펙의 15×13 이 아니라 **16×14**(`hw 8, hd 7`). 15폭에선 코너 계단 충돌체(x≥4.3)와 뒷벽 5칸이 겹쳐 뒷벽에 4칸밖에 안 들어간다. 회랑 방은 20×14(`hw 10, hd 7`).
- 정문·"🚪 나가기"는 **1층에만**. 상층 남쪽은 난간+유리창(카메라가 남쪽 41° 위에서 내려다보므로 벽을 세우지 않는다).
- 전시물 하나 = **메시 최대 3개**(solid·glow·glass 정점색 병합). 드로우콜이 이 게임의 병목이다.
- glow 색은 채널 ≤ 0xd9(블룸 임계 0.85 — 눈부심 방지).
- `js/game.js`·`js/spaces/cafe.js` 에 새 로직을 몰지 않는다. 새 코드는 `js/museum/*.js` (파일 분리 규칙). 파일 800줄 이하.
- 불변: 레이아웃·파츠 함수는 입력을 바꾸지 않고 새 객체를 돌려준다.
- 플레이어에게 보이는 새 문구는 없다(명판·토스트 그대로) → i18n 변경 없음.
- 미획득 전시물은 만들지 않고 천만 덮는다(기존 규칙 유지).
- `package.json` test = `node --test tests/*.test.mjs`. 커밋은 **로컬만**(푸시·배포는 사용자 승인 후 별도). 작업 트리에 다른 작업의 미커밋 파일이 많으므로 **`git add` 는 각 태스크가 적은 파일만**. 커밋 메시지 끝에 `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- 커밋 직전 `npm test` 가 통과해야 한다(검증).

## File Structure

| 파일 | 역할 |
|---|---|
| Create `js/museum/layout.js` | 층 배치 순수 계산: 방 크기·칸 자리·탁자·계단 박스·충돌 반경 |
| Create `js/museum/exhibit-parts.js` | 전시물 도형 목록(순수 데이터) — 카테고리·종별 |
| Create `js/museum/exhibit-build.js` | 도형 목록 → THREE 메시(재질별 정점색 병합) |
| Modify `js/museum.js` | `MUSEUM_FLOORS` 에 `layout`·`theme` 추가 |
| Modify `js/spaces/cafe.js` | `buildMuseumHall` 을 layout 기반으로, `museumDims()`, 상층 난간, 탁자, 전시물 배선 |
| Modify `js/spaces/doors.js` | 나가기는 1층만, `museumDims()` |
| Modify `js/game.js` | 이동 제한·미니맵이 `museumDims()` 사용 |
| Modify `js/museum/extras.js` | 새 전시물 원점(바닥 0)에 맞춰 높이·주석 갱신 |
| Create `tests/helpers/real-dex.mjs` | 실제 도감 id 목록(Node 에서 three 없이) |
| Create `tests/museum-layout.test.mjs` | 배치 테스트(기존 museumSlots 텍스트 추출 테스트 대체) |
| Create `tests/museum-exhibits.test.mjs` | 전시물 도형 테스트 |
| Modify `tests/museum.test.mjs` | 낡은 슬롯 테스트 제거, 층 정의·배선 테스트 |

---

### Task 1: 실제 도감 id 도우미 + 층 정의에 layout·theme

**Files:**
- Create: `tests/helpers/real-dex.mjs`
- Modify: `js/museum.js:19-24` (`MUSEUM_FLOORS`)
- Modify: `tests/museum.test.mjs` (끝에 테스트 추가)

**Interfaces:**
- Produces: `realDexIds(): Record<string, string[]>` (카테고리 → 실제 id 배열). `MUSEUM_FLOORS[i]` 에 `layout: 'wall'|'gallery'` · `theme: { floor, wall, light }`(hex 숫자) 추가.

- [ ] **Step 1: 도우미 작성**

```js
// tests/helpers/real-dex.mjs
// 🧪 실제 도감 id — three 가 없는 Node 에서 읽는다. museum.test.mjs 의 표본 DEX 는 칸 수가 낡아(fish 3) 배치 검증에 못 쓴다.
import { readFileSync } from 'node:fs';
import { VISITORS } from '../../js/habitat.js';
import { gameSource } from './game-source.mjs';

const DEXSRC = readFileSync(new URL('../../js/data/dex.js', import.meta.url), 'utf8');
const SRC = gameSource();
const ids = (src, start, end, re) => {
  const i = src.indexOf(start);
  if (i < 0) throw new Error(`${start} 를 찾지 못했다 — 도우미가 낡았다`);
  return [...src.slice(i, src.indexOf(end, i)).matchAll(re)].map(m => m[1]);
};
const staticIds = (cat) => ids(DEXSRC, `\n  ${cat}: [`, '\n  ],', /\{ id: '([a-z_]+)'/g);

export function realDexIds() {
  const out = {};
  for (const c of ['fish', 'crop', 'ore', 'forage', 'bug', 'track', 'dig', 'river', 'spirit', 'weather']) out[c] = staticIds(c);
  out.npc = [...ids(SRC, 'const NPCS = [', '\n];', /^    id: '([^']+)'/gm), ...ids(SRC, 'CAFE_GUESTS = [', '\n];', /\{ id: '([^']+)'/g)];
  out.cook = ids(SRC, 'const RECIPES = [', '\n];', /\{ id: '([^']+)'/g);
  out.visitor = VISITORS.map(v => v.id);
  return out;
}
```

- [ ] **Step 2: 실패 테스트 추가** — `tests/museum.test.mjs` 끝에:

```js
// ── 🏛️ 리디자인: 층 정의에 배치·테마가 붙는다 ──────────────────────
import { realDexIds } from './helpers/real-dex.mjs';

test('층 정의: 1·2층은 벽 유리장, 3층·특별전은 회랑 — 그리고 테마 색이 있다', () => {
  assert.deepEqual(MUSEUM_FLOORS.map(f => f.layout), ['wall', 'wall', 'gallery', 'gallery']);
  for (const f of MUSEUM_FLOORS) {
    for (const k of ['floor', 'wall', 'light']) assert.ok(Number.isInteger(f.theme?.[k]), `${f.name} theme.${k}`);
  }
});

test('실제 도감 칸 수 — 1층 17 · 2층 17 · 3층 31 · 특별전 11(바뀌면 배치 한도를 다시 본다)', () => {
  const real = realDexIds();
  const DEXR = Object.fromEntries(Object.entries(real).map(([k, v]) => [k, v.map(id => ({ id }))]));
  assert.deepEqual(MUSEUM_FLOORS.map(f => floorEntries(f.id, DEXR).length), [17, 17, 31, 11]);
});
```

- [ ] **Step 3: 실패 확인**

Run: `node --test tests/museum.test.mjs 2>&1 | tail -25`
Expected: 새 2건 FAIL(`layout` undefined) — 나머지는 기존대로.

- [ ] **Step 4: 구현** — `js/museum.js` 의 `MUSEUM_FLOORS` 를 교체

```js
export const MUSEUM_FLOORS = [
  { id: 1, name: '1층',   cats: ['crop', 'fish', 'ore'],                  need: 0,  layout: 'wall',    theme: { floor: 0xd9b98a, wall: 0xf3e2c8, light: 0xfff3dc } },
  { id: 2, name: '2층',   cats: ['forage', 'bug', 'dig', 'track', 'visitor'], need: 9,  layout: 'wall',    theme: { floor: 0xd9b98a, wall: 0xf3e2c8, light: 0xfff3dc } },
  { id: 3, name: '3층',   cats: ['river', 'spirit', 'weather', 'npc'],    need: 9,  layout: 'gallery', theme: { floor: 0xd9b98a, wall: 0xf3e2c8, light: 0xfff3dc } },
  { id: 4, name: '특별전', cats: ['cook'],                                 need: 12, layout: 'gallery', theme: { floor: 0xd9b98a, wall: 0xf3e2c8, light: 0xfff3dc } },
];
```
(테마 색은 Task 10 에서 사용자 비교로 확정 — 지금은 현재 색 그대로라 시각 변화 없음.)

- [ ] **Step 5: 통과 확인**

Run: `node --test tests/museum.test.mjs 2>&1 | tail -8`
Expected: 전부 PASS.

- [ ] **Step 6: 커밋**

```bash
git add tests/helpers/real-dex.mjs js/museum.js tests/museum.test.mjs
git commit -m "feat: museum floors declare layout and theme"
```

---

### Task 2: 배치 순수 모듈 `layout.js`

**Files:**
- Create: `js/museum/layout.js`
- Create: `tests/museum-layout.test.mjs`

**Interfaces:**
- Consumes: `MUSEUM_FLOORS` (Task 1).
- Produces:
  - `WALL_DIMS = { hw: 8, hd: 7 }`, `GALLERY_DIMS = { hw: 10, hd: 7 }`, `WALL_MAX = 17`, `GALLERY_MAX = 35`
  - `dimsOf(kind): { hw, hd }`
  - `museumLayout(kind, count): { dims, slots: [{ x, z, ry, kind: 'case'|'open' }], tables: [{ x, z, w, d }] }`
  - `stairBox(sx, dims): { x0, x1, z0, z1 }` · `stairSpot(sx, dims): { x, z }` (계단 안내 위치, 도착은 z+1.4)
  - `caseHalf(slot): { hx, hz }` (유리장 충돌 반 크기) · `inwardOf(ry): [dx, dz]`

- [ ] **Step 1: 실패 테스트 작성** — `tests/museum-layout.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MUSEUM_FLOORS, floorEntries } from '../js/museum.js';
import { museumLayout, dimsOf, stairBox, stairSpot, caseHalf, inwardOf, WALL_MAX, GALLERY_MAX } from '../js/museum/layout.js';
import { realDexIds } from './helpers/real-dex.mjs';

const REAL = Object.fromEntries(Object.entries(realDexIds()).map(([k, v]) => [k, v.map(id => ({ id }))]));
const realCount = (floor) => floorEntries(floor.id, REAL).length;
const box = (s) => { const { hx, hz } = caseHalf(s); return { x0: s.x - hx, x1: s.x + hx, z0: s.z - hz, z1: s.z + hz }; };
const overlap = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0;
const tableBox = (t) => ({ x0: t.x - t.w / 2, x1: t.x + t.w / 2, z0: t.z - t.d / 2, z1: t.z + t.d / 2 });

for (const floor of MUSEUM_FLOORS) {
  test(`${floor.name}: 실제 칸 수가 배치에 들어가고 자리 수와 같다`, () => {
    const n = realCount(floor);
    const L = museumLayout(floor.layout, n);
    assert.equal(L.slots.length, n, '칸 수와 자리 수가 다르다 — 전시물이 사라지거나 남는다');
  });

  test(`${floor.name}: 모든 칸이 이동 제한 안쪽(벽에서 0.8)이다`, () => {
    const L = museumLayout(floor.layout, realCount(floor));
    const { hw, hd } = L.dims;
    const out = L.slots.filter(s => Math.abs(s.x) > hw - 0.8 || Math.abs(s.z) > hd - 0.8);
    assert.deepEqual(out, [], '벽 밖 칸은 걸어갈 수 없어 영원히 못 본다');
  });

  test(`${floor.name}: 칸끼리 겹치지 않고 계단 박스·도착 지점·안내 반경과 겹치지 않는다`, () => {
    const L = museumLayout(floor.layout, realCount(floor));
    const cases = L.slots.filter(s => s.kind === 'case');
    for (let i = 0; i < L.slots.length; i++) for (let j = i + 1; j < L.slots.length; j++) {
      const d = Math.hypot(L.slots[i].x - L.slots[j].x, L.slots[i].z - L.slots[j].z);
      assert.ok(d > 1.1, `칸이 겹친다(간격 ${d.toFixed(2)})`);
    }
    for (const sx of [-1, 1]) {
      const sb = stairBox(sx, L.dims), spot = stairSpot(sx, L.dims), arrive = { x: spot.x, z: spot.z + 1.4 };
      for (const s of cases) {
        assert.ok(!overlap(box(s), sb), `유리장(${s.x},${s.z}) 이 계단 발판과 겹친다`);
        const h = caseHalf(s);
        assert.ok(Math.abs(arrive.x - s.x) > h.hx + 0.35 || Math.abs(arrive.z - s.z) > h.hz + 0.35, `도착 지점이 유리장(${s.x},${s.z}) 충돌체에 붙는다`);
      }
      for (const s of L.slots) {
        const [dx, dz] = inwardOf(s.ry);
        assert.ok(Math.hypot(s.x + dx * 0.9 - spot.x, s.z + dz * 0.9 - spot.z) > 1.8, `칸(${s.x},${s.z}) 앞이 계단 안내 반경에 든다`);
      }
      for (const t of L.tables) assert.ok(!overlap(tableBox(t), sb), '탁자가 계단과 겹친다');
    }
  });
}

test('벽 배치: 17칸이 뒷벽 5 + 좌우 6/6, 입구 길(가운데 폭 3.6)이 비어 있다', () => {
  const L = museumLayout('wall', 17);
  assert.equal(L.slots.filter(s => s.ry === 0).length, 5);
  assert.equal(L.slots.filter(s => s.ry > 0).length, 6);
  assert.equal(L.slots.filter(s => s.ry < 0).length, 6);
  assert.ok(L.slots.every(s => s.kind === 'case'));
  assert.deepEqual(L.tables, []);
  assert.deepEqual(L.slots.filter(s => Math.abs(s.x) < 1.8 && s.z > 3.0), [], '입구 길을 막았다');
});

test('벽 배치: 한도(17) 초과는 던진다 — 층 정의 오류를 조용히 삼키지 않는다', () => {
  assert.equal(WALL_MAX, 17);
  assert.throws(() => museumLayout('wall', 18), /17/);
  assert.doesNotThrow(() => museumLayout('wall', 1));
});

test('회랑 배치: 31칸 = 벽 15 + 탁자 16(두 줄 8칸), 11칸 = 벽 6 + 탁자 5(한 줄)', () => {
  const a = museumLayout('gallery', 31);
  assert.equal(a.slots.filter(s => s.kind === 'case').length, 15);
  assert.equal(a.slots.filter(s => s.kind === 'open').length, 16);
  assert.equal(a.tables.length, 2);
  const b = museumLayout('gallery', 11);
  assert.equal(b.slots.filter(s => s.kind === 'case').length, 6);
  assert.equal(b.slots.filter(s => s.kind === 'open').length, 5);
  assert.equal(b.tables.length, 1);
  assert.equal(GALLERY_MAX, 35);
  assert.throws(() => museumLayout('gallery', 36), /35/);
});

test('회랑 배치: 탁자 칸은 자기 탁자 위에 있고, 간격 ≥1.3, 두 줄 사이 통로 ≥2.2, 방 안쪽이다', () => {
  for (const n of [9, 11, 16, 20, 31, 35]) {
    const L = museumLayout('gallery', n), { hw } = L.dims;
    const open = L.slots.filter(s => s.kind === 'open');
    for (const s of open) {
      const t = L.tables.find(t => Math.abs(t.z - s.z) < 0.05 && Math.abs(s.x - t.x) <= t.w / 2);
      assert.ok(t, `탁자 칸(${s.x},${s.z}) 이 탁자 위에 없다`);
      assert.ok(t.x - t.w / 2 >= -(hw - 0.8) && t.x + t.w / 2 <= hw - 0.8, '탁자가 벽에 닿는다');
    }
    for (let i = 0; i < open.length; i++) for (let j = i + 1; j < open.length; j++) {
      if (Math.abs(open[i].z - open[j].z) < 0.05) assert.ok(Math.abs(open[i].x - open[j].x) >= 1.3, '탁자 칸이 붙었다');
    }
    if (L.tables.length === 2) assert.ok(tableBox(L.tables[1]).z0 - tableBox(L.tables[0]).z1 >= 2.2, '두 탁자 사이 통로가 좁다');
    // 두 탁자의 칸은 서로 통로 쪽을 본다
    if (L.tables.length === 2) {
      assert.ok(open.filter(s => s.z < 0).every(s => Math.abs(s.ry) < 0.01));
      assert.ok(open.filter(s => s.z > 0).every(s => Math.abs(Math.abs(s.ry) - Math.PI) < 0.01));
    }
  }
});

test('inwardOf — 칸이 바라보는 방향(통로 쪽)', () => {
  assert.deepEqual(inwardOf(0), [0, 1]);
  assert.deepEqual(inwardOf(Math.PI), [0, -1]);
  assert.deepEqual(inwardOf(Math.PI / 2), [1, 0]);
  assert.deepEqual(inwardOf(-Math.PI / 2), [-1, 0]);
});

test('방 크기: 벽 16×14, 회랑 20×14 — 소비처(이동 제한·미니맵)가 이 값을 읽는다', () => {
  assert.deepEqual(dimsOf('wall'), { hw: 8, hd: 7 });
  assert.deepEqual(dimsOf('gallery'), { hw: 10, hd: 7 });
});

// ✨ 1층 가운데 특별 진열대 3칸이 벽 유리장과 같은 자리를 쓰면 겹쳐 보인다(2026-10-06 실기기 제보)
test('1층 특별 진열대가 진열장과 겹치지 않는다', () => {
  const EXTRAS = readFileSync(new URL('../js/museum/extras.js', import.meta.url), 'utf8');
  const specials = JSON.parse(EXTRAS.match(/specials: (\[\[.*?\]\])/)[1]);
  const L = museumLayout('wall', 17);
  for (const [sx, sz] of specials) for (const s of L.slots) {
    assert.ok(Math.hypot(sx - s.x, sz - s.z) > 1.6, `특별 진열대(${sx},${sz}) 가 진열장(${s.x},${s.z})과 겹친다`);
  }
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/museum-layout.test.mjs 2>&1 | tail -12`
Expected: FAIL — `Cannot find module '../js/museum/layout.js'`

- [ ] **Step 3: 구현** — `js/museum/layout.js`

```js
// =============================================================
//  🏛️ 박물관 층 배치 — 순수 계산(THREE·DOM 의존 없음, Node 테스트)
//  ------------------------------------------------------------
//  ▶ 벽 배치(1·2층): 16×14 방, 뒷벽 최대 5 + 좌우 6/6 = 17칸. 가운데 섬이 없다.
//  ▶ 회랑 배치(3층·특별전): 20×14 방, 벽 유리장 + 가운데 **뚜껑 없는 낮은 탁자**.
//    높이 1.9m 유리장이 41° 카메라에서 뒷줄을 가리던 빽빽함(2026-10-06 사용자 지적)을 이걸로 푼다.
//  ▶ 좌표는 방 로컬(중심 0,0) · 입구는 남쪽(+z) · 계단은 북쪽 두 구석.
//  ▶ ⚠️ 한도를 넘으면 던진다 — 층에 도감이 늘어 넘치면 조용히 잘리지 않고 테스트가 먼저 터져야 한다.
// =============================================================
export const WALL_DIMS = { hw: 8, hd: 7 };
export const GALLERY_DIMS = { hw: 10, hd: 7 };
export const WALL_MAX = 17;
export const GALLERY_MAX = 35;
const GALLERY_WALL_MAX = 15, TABLE_GAP = 1.35, TABLE_ROW_MAX = 10;

export const dimsOf = (kind) => ({ ...(kind === 'gallery' ? GALLERY_DIMS : WALL_DIMS) });

/** 칸이 바라보는 방향(통로 쪽) 단위벡터 [dx, dz]. -0 이 나오지 않게 + 0. */
export const inwardOf = (ry) => [Math.round(Math.sin(ry)) + 0, Math.round(Math.cos(ry)) + 0];

/** 🪜 계단 발판 충돌 박스 — 뒷벽 구석. 벽 폭이 달라도 구석에 붙는다. */
export function stairBox(sx, { hw, hd }) {
  return { x0: sx > 0 ? hw - 3.2 : -(hw - 0.3), x1: sx > 0 ? hw - 0.3 : -(hw - 3.2), z0: -hd + 0.2, z1: -hd + 1.8 };
}
/** 계단 안내 자리(도착 지점은 z + 1.4 — 앞 빈 바닥). */
export const stairSpot = (sx, { hw, hd }) => ({ x: sx * (hw - 2.5), z: -hd + 1.2 });

/** 유리장 받침 충돌 반 크기 — 벽 쪽으로 0.6 까지 덮어 진열장 뒤 틈을 막는다. */
export const caseHalf = (s) => (Math.abs(Math.sin(s.ry)) > 0.5 ? { hx: 0.6, hz: 0.5 } : { hx: 0.5, hz: 0.6 });

function wallLayout(count) {
  if (count > WALL_MAX) throw new Error(`벽 배치는 최대 ${WALL_MAX}칸이다(받은 ${count}) — 층을 나누거나 gallery 로`);
  const dims = dimsOf('wall'), { hw, hd } = dims;
  const back = Math.min(5, count), rest = count - back, left = Math.ceil(rest / 2), right = rest - left;
  const slots = [];
  for (let i = 0; i < back; i++) slots.push({ x: (i - (back - 1) / 2) * 1.9, z: -hd + 1.2, ry: 0, kind: 'case' });
  for (let k = 0; k < left; k++) slots.push({ x: -(hw - 1.2), z: -3.0 + k * 1.6, ry: Math.PI / 2, kind: 'case' });
  for (let k = 0; k < right; k++) slots.push({ x: hw - 1.2, z: -3.0 + k * 1.6, ry: -Math.PI / 2, kind: 'case' });
  return { dims, slots, tables: [] };
}

function galleryLayout(count) {
  if (count > GALLERY_MAX) throw new Error(`회랑 배치는 최대 ${GALLERY_MAX}칸이다(받은 ${count}) — 탁자 줄을 늘려야 한다`);
  const dims = dimsOf('gallery'), { hw, hd } = dims;
  const wallN = Math.min(GALLERY_WALL_MAX, Math.ceil(count / 2)), tableN = count - wallN;
  const slots = [], back = Math.min(5, wallN);
  for (let i = 0; i < back; i++) slots.push({ x: (i - (back - 1) / 2) * 2.3, z: -hd + 1.2, ry: 0, kind: 'case' });
  for (let j = 0; j < wallN - back; j++) {
    const isRight = j % 2 === 1, k = Math.floor(j / 2);
    slots.push({ x: isRight ? hw - 1.2 : -(hw - 1.2), z: -3.2 + k * 1.9, ry: isRight ? -Math.PI / 2 : Math.PI / 2, kind: 'case' });
  }
  const tables = [];
  if (tableN > 0) {
    const rows = tableN > TABLE_ROW_MAX - 2 ? 2 : 1;   // 8칸 이하면 한 줄
    const perRow = Math.ceil(tableN / rows), zs = rows === 2 ? [-1.9, 1.9] : [-1.9];
    for (let r = 0; r < rows; r++) {
      const n = r === 0 ? perRow : tableN - perRow, ry = r === 0 ? 0 : Math.PI;
      for (let k = 0; k < n; k++) slots.push({ x: (k - (n - 1) / 2) * TABLE_GAP, z: zs[r], ry, kind: 'open' });
      tables.push({ x: 0, z: zs[r], w: n * TABLE_GAP + 0.6, d: 1.2 });
    }
  }
  return { dims, slots, tables };
}

export function museumLayout(kind, count) {
  if (kind === 'wall') return wallLayout(count);
  if (kind === 'gallery') return galleryLayout(count);
  throw new Error(`알 수 없는 박물관 배치: ${kind}`);
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/museum-layout.test.mjs 2>&1 | tail -15`
Expected: 전부 PASS. 실패하면 **수치를 테스트에 맞춰 늘리지 말고** 어느 단언인지 읽고 layout.js 의 간격·시작 z 를 조정한다(예: 계단 안내 반경에 걸리면 뒷벽 간격 1.9→2.0).

- [ ] **Step 5: 커밋**

```bash
git add js/museum/layout.js tests/museum-layout.test.mjs
git commit -m "feat: pure museum layout (wall 16x14, gallery 20x14 with low tables)"
```

---

### Task 3: 낡은 슬롯 테스트 걷어내고 소비처를 `museumDims()` 로

**Files:**
- Modify: `tests/museum.test.mjs:201-291` (낡은 슬롯 테스트 구간 삭제 + 배선 테스트로 교체)
- Modify: `js/spaces/cafe.js` (상수·`museumSlots`·`museumStairBox` 제거, `museumDims`·`museumLayoutNow` 추가)
- Modify: `js/spaces/doors.js:229-239`
- Modify: `js/game.js:145, 5461, 5558, 5744-5745`

**Interfaces:**
- Consumes: `museumLayout`, `dimsOf`, `stairBox`, `stairSpot`, `caseHalf`, `inwardOf` (Task 2), `MUSEUM_FLOORS[].layout` (Task 1).
- Produces (cafe.js exports): `museumDims(): { hw, hd }`(현재 층), `museumLayoutNow(): { dims, slots, tables }`. `MUSEUM_HALF_W`·`MUSEUM_HALF_D`·`museumSlots`·`museumStairBox` 는 **사라진다**.

- [ ] **Step 1: 테스트 교체(RED)** — `tests/museum.test.mjs` 에서 `// ── 🏛️ 진열장 자리 — 모든 칸이 방 안에 있어야 한다` 주석부터 `test('관람 모형이 층 칸 수에 맞는 자리를 쓴다'…` 끝(약 201~291행)까지를 지우고 아래로 바꾼다. (`readFileSync` import 는 그대로 둔다.)

```js
// ── 🏛️ 배치는 js/museum/layout.js(순수)가 계산한다 — 테스트는 tests/museum-layout.test.mjs ──
//   ⚠️ 예전엔 game.js 에서 museumSlots 함수 본문을 떼어 new Function 으로 평가했다. 순수 모듈로 옮겨 그럴 필요가 없다.
test('전시실은 배치를 layout.js 에서 가져온다 — cafe.js 에 슬롯 계산을 다시 두지 않는다', () => {
  const cafe = readFileSync(new URL('../js/spaces/cafe.js', import.meta.url), 'utf8');
  assert.match(cafe, /from '\.\.\/museum\/layout\.js'/, 'layout.js 를 안 쓴다');
  assert.doesNotMatch(cafe, /function museumSlots\(/, '낡은 슬롯 계산이 남아 있다');
  assert.doesNotMatch(cafe, /MUSEUM_HALF_[WD]\b/, '고정 방 크기 상수가 남아 있다 — 층마다 방이 다르다');
  assert.match(cafe, /export const museumDims = /);
});

test('방 크기를 읽는 곳은 전부 museumDims() 를 쓴다(이동 제한·미니맵·출구)', () => {
  for (const f of ['js/game.js', 'js/spaces/doors.js']) {
    const t = readFileSync(new URL('../' + f, import.meta.url), 'utf8');
    assert.doesNotMatch(t, /MUSEUM_HALF_[WD]\b/, `${f} 에 고정 방 크기가 남아 있다`);
  }
  const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.match(game, /museumDims\(\)/, 'game.js 가 museumDims 를 안 쓴다');
});

// ⚠️ 정문은 1층에만 있다 — 상층에서 "🚪 나가기" 가 뜨면 계단으로 올라온 사람이 밖으로 나가진다(2026-10-06 사용자 지적)
test('나가기는 1층에서만 뜬다', () => {
  const doors = readFileSync(new URL('../js/spaces/doors.js', import.meta.url), 'utf8');
  const i = doors.indexOf('} else if (atMuseum) {');
  const body = doors.slice(i, doors.indexOf('} else if', i + 10));
  assert.match(body, /museumFloor === 1[^\n]*museumexit|museumexit[^\n]*museumFloor === 1/, 'museumexit 가 museumFloor === 1 조건 안에 없다');
});

test('관람 모형이 층의 실제 자리와 방향을 쓴다', () => {
  const cafe = readFileSync(new URL('../js/spaces/cafe.js', import.meta.url), 'utf8');
  const i = cafe.indexOf('export function openMuseumView(');
  const fn = cafe.slice(i, cafe.indexOf('\nexport function closeMuseumView'));
  assert.match(fn, /museumLayoutNow\(\)\.slots\[i\]/, '층 배치의 자리를 안 쓴다');
  assert.match(fn, /inwardOf\(/, '탁자 칸은 방향이 칸마다 다르다 — 옛 ry===0 분기를 쓰면 틀어진다');
  assert.match(fn, /if \(!slot\) return/, '없는 자리를 그대로 구조분해한다');
});
```
같은 파일 상단의 `SRC` 기반 `전시실이 층 목록을 museum.js 에서 가져온다` 테스트는 그대로 둔다.

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/museum.test.mjs 2>&1 | grep -E "^# (pass|fail)|not ok" | head`
Expected: 새 4건 FAIL.

- [ ] **Step 3: `cafe.js` — 상수·슬롯 계산 제거, 헬퍼 추가**

(a) 31행 import 아래에 추가:
```js
import { museumLayout, dimsOf, stairBox, stairSpot, caseHalf, inwardOf } from '../museum/layout.js';
```
(b) `export const MUSEUM_HALF_W = 7.5, MUSEUM_HALF_D = 6.5, MUSEUM_H = 3.2;`(199행)를 다음으로 바꾼다:
```js
export const MUSEUM_H = 3.2;
```
(c) `museumFloor` 선언(215행) 바로 아래에 추가:
```js
const curFloorDef = () => MUSEUM_FLOORS.find(f => f.id === museumFloor) || MUSEUM_FLOORS[0];
// 🏛️ 방은 층마다 크기가 다르다(벽 16×14 · 회랑 20×14). 이동 제한·미니맵·출구가 전부 이 값을 읽는다.
export const museumDims = () => dimsOf(curFloorDef().layout);
// 지금 층의 배치 — 칸 자리·탁자. 전시물 목록(museumFloorItems)과 같은 순서다.
export const museumLayoutNow = () => museumLayout(curFloorDef().layout, museumFloorItems().length);
```
(d) `museumSlots` 함수 전체(`// 진열장 자리 — 좌우 벽 …` 주석부터 `return out.slice(0, count);\n}`)와 `museumStairBox` 함수를 **삭제**한다.
(e) `enterMuseum` 의 시작 위치를 바꾼다:
```js
  player.position.set(MUSEUM.x, 0, MUSEUM.z + museumDims().hd - 2.2); player.rotation.y = Math.PI;
```
(f) `openMuseumView` 의 자리 계산을 바꾼다:
```js
  const slot = museumLayoutNow().slots[i];
  if (!slot) return;
  const inward = inwardOf(slot.ry);
  group.position.set(MUSEUM.x + slot.x + inward[0] * 1.25, 1.75, MUSEUM.z + slot.z + inward[1] * 1.25);   // 명판(화면 중앙) 위로 띄운다
```
(`const [sx, sz, ry] = slot;` 과 옛 `inward` 줄은 삭제.)

> `buildMuseumHall` 은 아직 옛 `museumSlots` 를 부른다 → 이 시점엔 깨진 상태다. 다음 Task 4 에서 바로 고친다. **Task 3·4 는 한 번에 커밋한다.**

- [ ] **Step 4: `doors.js`**

import 의 `MUSEUM_HALF_D` 를 `museumDims` 로 바꾸고, 전시실 블록을:
```js
  } else if (atMuseum) {   // 🏛️ 전시실: 정문은 1층만 — 상층은 계단으로만 오르내린다 / 진열장 앞 자세히 보기
    if (museumFloor === 1 && dist2D({ x: MUSEUM.x, z: MUSEUM.z + museumDims().hd }, player.position) < 1.9) { nd = 'museumexit'; prompt = '🚪 나가기'; }
    else {
```
로 바꾼다. (`museumFloor` 는 이미 같은 import 줄에 있다.)

- [ ] **Step 5: `game.js`**

- 145행 import 의 `MUSEUM_HALF_D, MUSEUM_HALF_W,` 를 `museumDims,` 로 바꾼다. 같은 import 묶음에 `museumFloor` 가 없으면 추가한다(`grep -n "museumFloor" js/game.js | head -3` 로 확인).
- 미니맵 출구 표시:
```js
    if (museumFloor === 1) marks.push({ x: MUSEUM.x, z: MUSEUM.z + museumDims().hd, c: '#c8905a', kind: 'exit' });     // 나가는 문(1층 남쪽 벽만)
```
- 미니맵 범위: `place === 'museum' ? Math.max(MUSEUM_HALF_W, MUSEUM_HALF_D)` 를 `place === 'museum' ? Math.max(museumDims().hw, museumDims().hd)` 로.
- 이동 제한:
```js
    const mdm = museumDims();
    player.position.x = Math.max(MUSEUM.x - mdm.hw + 0.8, Math.min(MUSEUM.x + mdm.hw - 0.8, player.position.x));
    player.position.z = Math.max(MUSEUM.z - mdm.hd + 0.8, Math.min(MUSEUM.z + mdm.hd - 0.7, player.position.z));
```

- [ ] **Step 6: 통과 확인은 Task 4 와 함께** — 지금은 건너뛴다.

---

### Task 4: `buildMuseumHall` 을 배치 기반으로 다시 짓기

**Files:**
- Modify: `js/spaces/cafe.js` (`buildMuseumHall` 전체, `museumCases` 항목)
- Modify: `tests/museum.test.mjs` (소스 텍스트 테스트 추가)

**Interfaces:**
- Consumes: `museumLayoutNow`, `stairBox`, `stairSpot`, `caseHalf`, `inwardOf`, `MUSEUM_FLOORS[].theme`.
- Produces: `museumCases: [{ x, z, i, kind }]` (kind 추가), `museumStairs: [{ x, z, up }]`(좌표 의미 동일), 탁자 충돌체는 `museumColliders` 에 들어간다. 전시물 모델은 **바닥(y=0)이 받침 위**에 앉는다(Task 6 의 `seatOnBase` 가 보장).

- [ ] **Step 1: 실패 테스트 추가**

```js
test('buildMuseumHall: 정문은 1층만 비우고, 상층은 난간+유리창으로 막는다', () => {
  const cafe = readFileSync(new URL('../js/spaces/cafe.js', import.meta.url), 'utf8');
  const i = cafe.indexOf('export function buildMuseumHall(');
  const body = cafe.slice(i, cafe.indexOf('\n// 수집이 늘면 천이 걷힌다'));
  assert.match(body, /if \(museumFloor === 1\)/, '정문 분기가 없다');
  assert.match(body, /lay\.tables/, '탁자를 안 짓는다');
  assert.match(body, /slot\.kind === 'open'/, '탁자 칸 분기가 없다');
  assert.match(body, /stairBox\(sx, lay\.dims\)/, '계단 충돌체가 방 크기를 안 따른다');
  assert.doesNotMatch(body, /museumSlots\(/);
});
```
Run: `node --test tests/museum.test.mjs 2>&1 | grep -E "^# fail|not ok"` — FAIL 확인.

- [ ] **Step 2: 구현** — `buildMuseumHall` 을 아래로 **통째로 교체**한다. 재질 병합 루프·조명은 기존과 같다.

```js
export function buildMuseumHall() {
  const g = new THREE.Group(); g.position.copy(MUSEUM); g.visible = false;
  const def = curFloorDef(), th = def.theme;
  const MATS = {
    wall:  clayMat(th.wall, false), trim: clayMat(0xf2ece0, false),
    floor: woodMat(6, 6, th.floor),  stone: clayMat(0xcfc7b0, false),
    wood:  woodMat(4, 1, 0xb5834f),  dark: clayMat(0x6b5a46, false),
    cloth: clayMat(0xe4dccb, false),                       // 🎀 빈 칸을 덮은 천
    rugA:  clayMat(0xb8cfa8, false), rugB: clayMat(0xa8c4d8, false),
    rugC:  clayMat(0xcbc0ad, false), rugD: clayMat(0xd8c0c8, false),   // ⚠️ rugD 가 없으면 three 가 흰 MeshBasicMaterial 로 떨어진다(2층 🐾흔적·3층 🧑주민)
    glass: new THREE.MeshStandardMaterial({ color: 0xbfe3ea, roughness: 0.3, metalness: 0, transparent: true, opacity: 0.28, side: THREE.DoubleSide }),
  };
  const parts = new Map();
  const exhibitMeshes = [];
  const add = (k, ...geos) => {
    const a = parts.get(k) || (parts.set(k, []), parts.get(k));
    for (const geo of geos) {
      if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
      a.push(geo);
    }
  };
  const box = (w, h, d, x, y, z, ry = 0) => { const b = new THREE.BoxGeometry(w, h, d); if (ry) b.rotateY(ry); return b.translate(x, y, z); };

  const items = museumFloorItems();
  const lay = museumLayoutNow();                       // 칸 자리·탁자·방 크기 — js/museum/layout.js
  const { hw: HW, hd: HD } = lay.dims, W = HW * 2, D = HD * 2, H = MUSEUM_H;

  add('floor', box(W, 0.2, D, 0, -0.1, 0));
  // ⚠️ 천장은 만들지 않는다 — 카메라가 41° 로 내려다보므로 천장을 덮으면 방 안이 통째로 가린다.
  //    집 실내(buildInterior)·☕카페 홀도 같은 이유로 천장이 없다(js/shadow-scope.js 주석 참고).
  add('trim',  box(W + 0.4, 0.18, 0.5, 0, H, -HD));   // 뒷벽 위 처마만 — 공간의 위쪽을 닫아 보이게
  add('wall',  box(W, H, 0.3, 0, H / 2, -HD));
  add('wall',  box(0.3, H, D, -HW, H / 2, 0));
  add('wall',  box(0.3, H, D,  HW, H / 2, 0));
  // 정면(남쪽) — ⚠️ 낮은 난간만. 카메라가 이쪽에서 41° 로 내려다보므로 벽을 세우면 방이 가린다
  const RAIL = 0.9;
  if (museumFloor === 1) {   // 🚪 정문은 1층에만 — 문 자리를 비우고 좌우만
    const doorW = 2.8, side = (W - doorW) / 2;
    add('wall', box(side, RAIL, 0.3, -(doorW + side) / 2, RAIL / 2, HD));
    add('wall', box(side, RAIL, 0.3,  (doorW + side) / 2, RAIL / 2, HD));
    add('trim', box(side + 0.1, 0.12, 0.4, -(doorW + side) / 2, RAIL, HD));
    add('trim', box(side + 0.1, 0.12, 0.4,  (doorW + side) / 2, RAIL, HD));
    add('dark', box(doorW, 0.06, 1.1, 0, 0.02, HD - 0.2));   // 문턱(나가는 자리 표시)
  } else {                   // 상층 — 문 없이 막는다. 층 이동은 계단뿐
    add('wall', box(W, RAIL, 0.3, 0, RAIL / 2, HD));
    add('trim', box(W + 0.1, 0.12, 0.4, 0, RAIL, HD));
    add('glass', box(W, 1.0, 0.06, 0, RAIL + 0.06 + 0.5, HD));
    for (let k = -4; k <= 4; k++) add('trim', box(0.08, 1.0, 0.1, k * W / 8.5, RAIL + 0.56, HD));
  }
  // 굽도리 + 벽 상단 띠
  for (const [x, z, w, d] of [[0, -HD + 0.2, W, 0.12], [-HW + 0.2, 0, 0.12, D], [HW - 0.2, 0, 0.12, D]]) {
    add('trim', box(w, 0.22, d, x, 0.11, z), box(w, 0.14, d, x, H - 0.45, z));
  }

  // 구역 러그 — 유리장 앞에만(탁자 칸은 탁자가 구역을 말한다)
  lay.slots.forEach((slot, i) => {
    if (slot.kind !== 'case') return;
    const zn = MUSEUM_ZONES[items[i].zone], [dx, dz] = inwardOf(slot.ry);
    add(zn.key, box(1.0, 0.03, 1.0, slot.x + dx * 0.95, 0.015, slot.z + dz * 0.95));
  });

  museumCases = [];
  // 🚧 이전 전시실의 충돌체를 걷어낸다 — 들어갈 때마다 다시 지으므로 안 지우면 계속 쌓인다
  for (const c of museumColliders) { const i = colliders.indexOf(c); if (i >= 0) colliders.splice(i, 1); }
  museumColliders = [];

  // 🪑 낮은 탁자(회랑층) — 뚜껑 없는 전시. 통과할 수 없다
  for (const t of lay.tables) {
    add('wood',  box(t.w, 0.75, t.d, t.x, 0.375, t.z));
    add('stone', box(t.w + 0.2, 0.08, t.d + 0.1, t.x, 0.79, t.z));
    museumColliders.push(solidBox(MUSEUM.x + t.x - t.w / 2, MUSEUM.z + t.z - t.d / 2, MUSEUM.x + t.x + t.w / 2, MUSEUM.z + t.z + t.d / 2));
  }

  lay.slots.forEach((slot, i) => {
    const item = items[i], { x, z, ry } = slot;
    const got = !!gameState.dex[item.cat]?.[item.id];
    museumCases.push({ x, z, i, kind: slot.kind });
    if (slot.kind === 'open') {   // 탁자 위 — 작은 받침 + 전시물(유리 없음)
      add('stone', box(0.55, 0.03, 0.55, x, 0.815, z, ry));
      if (!got) { add('cloth', box(0.42, 0.12, 0.42, x, 0.89, z, ry)); return; }   // 🎀 곧 열릴 전시 — 작은 천 덮개
      const ex = museumExhibitMesh(item);
      ex.position.set(x, 0.83, z); ex.rotation.y = ry + 0.35;
      exhibitMeshes.push(ex); g.add(ex);
      return;
    }
    add('stone', box(0.95, 0.12, 0.7, x, 0.9, z, ry));
    add('wood',  box(0.8, 0.85, 0.58, x, 0.46, z, ry));
    // 받침은 통과할 수 없다. 원으로 두면 모서리에 낄 수 있어 사각으로 — 명판 판정(1.9)은 그대로 닿는다.
    //   ⚠️ 벽 쪽으로 0.6 까지 덮어야 한다. 진열장은 벽에서 1.2, 이동 제한은 0.8 이라 그냥 받침 크기로 두면 그 사이 틈으로 뒤를 지나갈 수 있다.
    const { hx, hz } = caseHalf(slot);
    museumColliders.push(solidBox(MUSEUM.x + x - hx, MUSEUM.z + z - hz, MUSEUM.x + x + hx, MUSEUM.z + z + hz));
    add('trim',  box(0.5, 0.14, 0.05, x + Math.sin(ry) * 0.32, 0.99, z + Math.cos(ry) * 0.32, ry));
    if (!got) {   // 🎀 "아직 없음" 이 아니라 "곧 열릴 전시" — 수집하면 천이 걷힌다
      add('cloth', box(0.9, 0.26, 0.66, x, 1.09, z, ry), box(0.78, 0.18, 0.54, x, 1.28, z, ry));
      return;
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const px = x + (ry ? sz * 0.25 : sx * 0.4), pz = z + (ry ? sx * 0.4 : sz * 0.25);
      add('trim', new THREE.CylinderGeometry(0.024, 0.024, 0.9, 5).translate(px, 1.41, pz));
    }
    add('glass', box(0.86, 0.88, 0.54, x, 1.41, z, ry));
    add('trim',  box(0.94, 0.07, 0.62, x, 1.88, z, ry));
    const ex = museumExhibitMesh(item);
    ex.position.set(x, 0.97, z); ex.rotation.y = ry + 0.35; ex.scale.setScalar(0.85);   // 받침 위 — 모델 바닥이 y=0 이다
    exhibitMeshes.push(ex); g.add(ex);   // 병합하지 않는다 — 전시물 자체가 이미 재질별로 병합돼 있다(≤3 메시)
  });

  // 🪜 계단 — 열린 층이 둘 이상일 때만 놓는다. ⚠️ 재질 병합 루프보다 **앞**에서 add 해야 그려진다. 위층은 북동, 아래층은 북서 구석
  const opened = openFloors(gameState.dex, DEX);
  museumStairs = [];
  const stair = (sx, up) => {
    for (let i = 0; i < 5; i++) add('stone', box(0.5, 0.22, 1.5, sx * (HW - 2.9 + i * 0.5), 0.11 + i * 0.22, -HD + 1.0));
    add('trim', box(0.2, 0.16, 1.7, sx * (HW - 0.4), 0.11 + 5 * 0.22, -HD + 1.0));
    museumStairs.push({ ...stairSpot(sx, lay.dims), up });   // 도착 지점 = z + 1.4: 앞 빈 바닥
    const b = stairBox(sx, lay.dims);
    museumColliders.push(solidBox(MUSEUM.x + b.x0, MUSEUM.z + b.z0, MUSEUM.x + b.x1, MUSEUM.z + b.z1));
  };
  if (museumFloor < opened) stair(1, true);
  if (museumFloor > 1) stair(-1, false);

  for (const [k, geos] of parts) {
    const m = new THREE.Mesh(geos.length > 1 ? mergeGeos(geos) : geos[0], MATS[k]);
    m.receiveShadow = true; g.add(m);
  }

  // ✨ 1층 가운데 — 조건부 전시 3칸. 조형은 js/museum/extras.js(규칙은 js/museum.js)
  museumExtraSpots = [];
  if (museumFloor === 1) {
    const ex = buildMuseumExtras({ clayMat, exhibitMesh: museumExhibitMesh, solidBox }, { origin: MUSEUM, special: gameState.museum.special });
    g.add(ex.group); museumExtraSpots = ex.spots; museumColliders.push(...ex.colliders);   // 충돌체는 다시 지을 때 같이 걷힌다
  }

  const lamp = new THREE.PointLight(th.light, 0.8, 26); lamp.position.set(0, H - 0.7, 0); g.add(lamp);
  scene.add(g);
  return g;
}
```
`museumPlateText()` 의 `museumCases` 순회는 그대로 둔다(`c.i`·`c.x`·`c.z` 사용). 탁자 칸은 간격 1.35 라 "가장 가까운 한 칸"이 곧 대상이다.

- [ ] **Step 3: 통과 확인**

Run: `node --test tests/museum.test.mjs tests/museum-layout.test.mjs 2>&1 | grep -E "^# (pass|fail)"`
Expected: `# fail 0`

- [ ] **Step 4: 브라우저 스모크** (preview 서버 `calm-forest` 가 떠 있다고 가정, 없으면 `preview_start`)

`http://localhost:8000/?dbg` 를 열고 JS:
```js
// 도감을 전부 채워 4층 모두 연다
const gs = __gs(); const { DEX } = await import('/js/data/dex.js');
for (const [c, l] of Object.entries(DEX)) for (const e of l) gs.dex[c][e.id] = Date.now();
__space.museum[0]();            // 입장(1층)
```
확인: 1층에서 남쪽 문 앞 → `🚪 나가기`. `museumGoFloor` 로 3층(계단) 이동 후 남쪽 가장자리로 걸어가도 `🚪 나가기` 가 안 뜬다. 스크린샷 1층·3층. 콘솔 에러 0. (⚠️ 이 단계의 전시물은 아직 옛 원석 — Task 6 이후 바뀐다.)

- [ ] **Step 5: 커밋 (Task 3 + 4 함께)**

```bash
git add js/spaces/cafe.js js/spaces/doors.js js/game.js tests/museum.test.mjs
git commit -m "feat: museum hall built from layout — exit door on floor 1 only, low tables on gallery floors"
```

---

### Task 5: 전시물 도형 목록(순수 데이터) 뼈대 + 광물

**Files:**
- Create: `js/museum/exhibit-parts.js`
- Create: `tests/museum-exhibits.test.mjs`

**Interfaces:**
- Produces: `exhibitParts(cat, id, meta = {}): Part[] | null` · `Part = { shape, args, color, mat: 'solid'|'glow'|'glass', pos: [x,y,z], scl: [x,y,z], rot: [x,y,z] }` · `SHAPES`, `MATS` · `PARTS_CATS: string[]`(이 모듈이 다루는 카테고리) · `hash`, `pick`(안정적인 문자열 해시 선택).
- 도형 인자 규약: `sph [r, wSeg, hSeg]` · `cyl [rTop, rBottom, h, seg]` · `cone [r, h, seg]` · `box [w, h, d]` · `ico [r, detail]` · `dod [r, detail]` · `torus [R, r, radSeg, tubSeg]` · `lathe [[[r,y],…], seg]` · `tube [[[x,y,z],…], seg, r, radial]`. 모든 모델은 **바닥이 y≈0, 높이 ≈0.5 이하, 폭 ≈0.5 이하**(받침 위에 앉는다).

- [ ] **Step 1: 실패 테스트 작성** — `tests/museum-exhibits.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exhibitParts, SHAPES, MATS, PARTS_CATS } from '../js/museum/exhibit-parts.js';
import { MUSEUM_FLOORS } from '../js/museum.js';
import { realDexIds } from './helpers/real-dex.mjs';

const REAL = realDexIds();
// 작물·물고기는 기존 cropMini·fishMesh 가 그린다 — 여기서 다루지 않는다
const OWN = ['crop', 'fish'];
// ⚠️ 카테고리를 옮길 때마다 여기에 추가한다. Task 10 의 '전부 덮는다' 테스트가 이 목록을 전체와 맞춰 본다.
const PORTED = ['ore'];

const chan = (c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

for (const cat of PORTED) {
  test(`${cat}: 실제 도감 id 전부가 올바른 도형 목록을 낸다`, () => {
    assert.ok(REAL[cat]?.length, `${cat} 실제 id 를 못 읽었다`);
    for (const id of REAL[cat]) {
      const parts = exhibitParts(cat, id);
      assert.ok(Array.isArray(parts) && parts.length > 0, `${cat}/${id} 도형이 없다`);
      assert.ok(parts.length <= 60, `${cat}/${id} 도형 ${parts.length}개 — 병합해도 정점이 너무 많다`);
      for (const q of parts) {
        assert.ok(SHAPES.includes(q.shape), `${cat}/${id} 모르는 도형 ${q.shape}`);
        assert.ok(MATS.includes(q.mat), `${cat}/${id} 모르는 재질 ${q.mat}`);
        assert.ok(Number.isInteger(q.color) && q.color >= 0 && q.color <= 0xffffff, `${cat}/${id} 색`);
        assert.ok(q.pos.length === 3 && q.scl.length === 3 && q.rot.length === 3 && [...q.pos, ...q.scl, ...q.rot].every(isNum), `${cat}/${id} 변환`);
        if (q.mat === 'glow') assert.ok(chan(q.color).every(v => v <= 0xd9), `${cat}/${id} 발광색 채널이 0xd9 를 넘는다 — 블룸으로 눈이 부시다`);
      }
    }
  });

  test(`${cat}: 종마다 모양이나 색이 다르다(전부 같은 돌덩이로 보이면 안 된다)`, () => {
    const sig = REAL[cat].map(id => JSON.stringify(exhibitParts(cat, id)));
    assert.equal(new Set(sig).size, sig.length, `${cat} 에 똑같이 생긴 종이 있다`);
  });
}

test('exhibitParts: 모르는 카테고리·id 는 null — 호출부가 20면체 폴백으로 받는다', () => {
  assert.equal(exhibitParts('nope', 'x'), null);
  assert.equal(exhibitParts('ore', 'nope'), null);
});

test('같은 입력이면 같은 결과, 호출할 때마다 새 객체(불변)', () => {
  const a = exhibitParts('ore', 'stone'), b = exhibitParts('ore', 'stone');
  assert.deepEqual(a, b);
  assert.notEqual(a, b);
  a[0].pos[0] = 99;
  assert.notEqual(exhibitParts('ore', 'stone')[0].pos[0], 99, '내부 상태를 공유한다');
});

test('PARTS_CATS 는 실제로 다루는 카테고리와 같다', () => {
  assert.deepEqual([...PARTS_CATS].sort(), [...PORTED].sort());
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/museum-exhibits.test.mjs 2>&1 | tail -6`
Expected: FAIL — module not found.

- [ ] **Step 3: 구현** — `js/museum/exhibit-parts.js`

```js
// =============================================================
//  🏛️ 박물관 전시물 도형 목록 — 순수 데이터(THREE 없음, Node 테스트)
//  ------------------------------------------------------------
//  ▶ 지금까지 작물·물고기·광물 말고는 전부 색만 다른 20면체 하나였다(사용자: "전부 원석으로 처리된다").
//    카테고리마다 대표 조형을 두고 종마다 색·소품으로 구분한다.
//  ▶ 시안: sims/museum-redesign-exhibits-sim.html — 모델을 여기로 옮긴다(도형 호출 → p(...) 한 줄).
//  ▶ 이 모듈은 "무엇을 그릴까" 만 안다. 그리는 쪽(exhibit-build.js)이 재질별로 정점색 병합해
//    **전시물 하나 = 메시 최대 3개**(solid·glow·glass)가 되게 한다 — 드로우콜이 이 게임의 병목이다.
//  ▶ 규약: 바닥 y≈0 · 높이 ≤0.5 · 폭 ≤0.5. glow 색 채널은 0xd9 이하(블룸 임계 0.85).
// =============================================================
export const SHAPES = ['sph', 'cyl', 'cone', 'box', 'ico', 'dod', 'torus', 'lathe', 'tube'];
export const MATS = ['solid', 'glow', 'glass'];

/** 도형 한 개. 호출할 때마다 새 객체·새 배열을 만든다(불변). */
const p = (shape, args, color, o = {}) => ({
  shape, args, color, mat: o.mat || 'solid',
  pos: [...(o.pos || [0, 0, 0])], scl: [...(o.scl || [1, 1, 1])], rot: [...(o.rot || [0, 0, 0])],
});

/** 문자열 → 안정적인 해시. 모르는 id 도 늘 같은 색·모양을 받는다. */
export const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export const pick = (arr, id) => arr[hash(id) % arr.length];

// ── ⛏️ 광물 — 원석 덩어리가 아니라 "표본" ──────────────────────────
const ORE = {
  stone: () => [
    p('dod', [0.2, 0], 0x9a9a92, { pos: [0, 0.17, 0], scl: [1, 0.8, 1.1] }),
    p('dod', [0.11, 0], 0xb0b0a6, { pos: [0.2, 0.09, 0.1] }),
    p('dod', [0.08, 0], 0x80807a, { pos: [-0.2, 0.07, 0.12] }),
  ],
  coal: () => [
    p('ico', [0.19, 0], 0x2d2d33, { pos: [0, 0.17, 0], scl: [1.1, 0.85, 1] }),
    p('ico', [0.11, 0], 0x1c1c22, { pos: [0.2, 0.1, 0.1] }),
    p('box', [0.1, 0.02, 0.06], 0x7a7a88, { pos: [-0.04, 0.3, 0.04], rot: [0.3, 0.5, 0] }),   // 석탄 결의 반짝임
  ],
  gem: () => [
    ...[[0, 0, 0.3, 0], [0.12, 0.1, 0.22, -0.35], [-0.12, 0.04, 0.2, 0.4], [0.04, -0.12, 0.17, 0.2], [-0.05, 0.13, 0.15, -0.2]]
      .map(([x, z, h, t], i) => p('cone', [0.075, h, 6], i % 2 ? 0x6fe0e8 : 0x4fc3f0, { pos: [x, h / 2 + 0.02, z], rot: [t, 0, t * 0.6] })),
    p('cyl', [0.2, 0.22, 0.04, 8], 0x7a6a5a, { pos: [0, 0.02, 0] }),   // 결정이 박힌 돌판
  ],
};

// ── 레지스트리 — 카테고리 → { 종 id → 도형 목록 함수 } ───────────────
const BUILDERS = { ore: ORE };

export const PARTS_CATS = Object.keys(BUILDERS);

/** 전시물 도형 목록. 모르는 카테고리·종이면 null(호출부가 폴백). meta 는 게임이 아는 추가 정보(예: 주민 색). */
export function exhibitParts(cat, id, meta = {}) {
  const b = BUILDERS[cat];
  const fn = b && (b[id] || b._default);
  return fn ? fn(id, meta) : null;
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/museum-exhibits.test.mjs 2>&1 | grep -E "^# (pass|fail)|not ok"`
Expected: `# fail 0`

- [ ] **Step 5: 커밋**

```bash
git add js/museum/exhibit-parts.js tests/museum-exhibits.test.mjs
git commit -m "feat: museum exhibit parts data module with ore specimens"
```

---

### Task 6: THREE 빌더 + `museumExhibitMesh` 배선

**Files:**
- Create: `js/museum/exhibit-build.js`
- Modify: `js/spaces/cafe.js` (`museumExhibitMesh` + import)
- Modify: `js/museum/extras.js` (높이·주석)
- Modify: `tests/museum.test.mjs`, `tests/museum-exhibits.test.mjs`

**Interfaces:**
- Consumes: `exhibitParts` (Task 5).
- Produces: `buildExhibitMesh(THREE, parts): THREE.Group | null` — `THREE` 를 인자로 받아 이 파일이 three 를 import 하지 않는다(Node 테스트 가능). 메시 ≤3. cafe.js 의 `museumExhibitMesh(item)` 는 **모든** 카테고리에서 바닥이 y=0 인 그룹을 돌려준다(`seatOnBase`).

- [ ] **Step 1: 실패 테스트** — `tests/museum-exhibits.test.mjs` 에 추가 (가짜 THREE 로 병합 규칙만 본다)

```js
import { buildExhibitMesh } from '../js/museum/exhibit-build.js';

// 최소 가짜 THREE — 병합 결과가 재질당 메시 1개인지만 본다
function fakeTHREE() {
  class Geo { constructor(n = 12) { this.attributes = { position: { count: n, array: new Float32Array(n * 3), itemSize: 3 }, normal: { count: n, array: new Float32Array(n * 3), itemSize: 3 } }; this.index = null; } applyMatrix4() { return this; } setAttribute(k, v) { this.attributes[k] = v; } toNonIndexed() { return this; } dispose() {} }
  const geo = function () { return new Geo(); };
  class Obj { constructor() { this.children = []; } add(o) { this.children.push(o); return this; } }
  return {
    Group: Obj, Mesh: class extends Obj { constructor(geometry, material) { super(); this.geometry = geometry; this.material = material; this.isMesh = true; } },
    BufferGeometry: Geo, BufferAttribute: class { constructor(arr, size) { this.array = arr; this.itemSize = size; this.count = arr.length / size; } },
    SphereGeometry: geo, CylinderGeometry: geo, ConeGeometry: geo, BoxGeometry: geo, IcosahedronGeometry: geo, DodecahedronGeometry: geo, TorusGeometry: geo, LatheGeometry: geo, TubeGeometry: geo,
    Vector2: class {}, Vector3: class {}, CatmullRomCurve3: class {},
    Matrix4: class { compose() { return this; } }, Quaternion: class { setFromEuler() { return this; } }, Euler: class {},
    Color: class { constructor(h) { this.r = ((h >> 16) & 255) / 255; this.g = ((h >> 8) & 255) / 255; this.b = (h & 255) / 255; } },
    MeshStandardMaterial: class { constructor(o) { Object.assign(this, o); } }, MeshBasicMaterial: class { constructor(o) { Object.assign(this, o); } },
    DoubleSide: 2,
  };
}

test('buildExhibitMesh: 재질별로 병합 — 전시물 하나는 메시 3개 이하', () => {
  const T = fakeTHREE();
  const mk = (shape, args, color, mat) => ({ shape, args, color, mat, pos: [0, 0, 0], scl: [1, 1, 1], rot: [0, 0, 0] });
  const g = buildExhibitMesh(T, [mk('sph', [0.1, 8, 6], 0xff0000, 'solid'), mk('box', [1, 1, 1], 0x00ff00, 'solid'), mk('sph', [0.1, 8, 6], 0xd0c060, 'glow'), mk('cyl', [1, 1, 1, 8], 0xcfeff5, 'glass')]);
  assert.equal(g.children.length, 3, 'solid·glow·glass 한 메시씩이어야 한다');
  assert.equal(buildExhibitMesh(T, null), null);
});

test('buildExhibitMesh: solid 만 있으면 메시 1개', () => {
  const g = buildExhibitMesh(fakeTHREE(), exhibitParts('ore', 'gem'));
  assert.equal(g.children.length, 1);
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/museum-exhibits.test.mjs 2>&1 | tail -5` → module not found.

- [ ] **Step 3: 구현** — `js/museum/exhibit-build.js`

```js
// =============================================================
//  🏛️ 전시물 도형 목록 → THREE 메시 (재질별 정점색 병합)
//  ------------------------------------------------------------
//  ▶ solid / glow / glass 세 재질로 묶어 **전시물 하나 = 메시 최대 3개**. 색은 정점에 실어 재질 수를 늘리지 않는다
//    (🏛️ 옛 전시물 13종에서 쓴 수법 — 재질을 색마다 만들면 그 수가 곧 드로우콜이다).
//  ▶ THREE 를 인자로 받는다 — 이 파일이 three 를 import 하지 않아야 Node 테스트가 가짜 THREE 로 돌 수 있다.
//  ▶ 재질은 **전시물마다 새로** 만든다. disposeTree 가 재질까지 dispose 하므로 공유하면 다음 전시물이 깨진다.
//  ▶ game.js 의 mergeGeos 는 import 하지 않는다(순환) — 같은 방식의 작은 병합을 여기 둔다.
// =============================================================
const GEO = {
  sph: (T, a) => new T.SphereGeometry(...a),
  cyl: (T, a) => new T.CylinderGeometry(...a),
  cone: (T, a) => new T.ConeGeometry(...a),
  box: (T, a) => new T.BoxGeometry(...a),
  ico: (T, a) => new T.IcosahedronGeometry(...a),
  dod: (T, a) => new T.DodecahedronGeometry(...a),
  torus: (T, a) => new T.TorusGeometry(...a),
  lathe: (T, [pts, seg]) => new T.LatheGeometry(pts.map(([r, y]) => new T.Vector2(r, y)), seg),
  tube: (T, [pts, seg, r, radial]) => new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(q => new T.Vector3(...q))), seg, r, radial),
};

const MATERIAL = {
  solid: (T) => new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0, flatShading: true }),
  glow:  (T) => new T.MeshBasicMaterial({ vertexColors: true }),   // 빛 받지 않는 밝은 색(반딧불·달빛) — 채널 ≤0xd9 는 parts 테스트가 잠근다
  glass: (T) => new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.2, metalness: 0, transparent: true, opacity: 0.26, depthWrite: false, side: T.DoubleSide }),
};

function paint(T, geo, hex) {
  const c = new T.Color(hex), n = geo.attributes.position.count, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new T.BufferAttribute(arr, 3));
  return geo;
}

function merge(T, geos) {
  const flat = geos.map(g => (g.index ? g.toNonIndexed() : g));
  const out = new T.BufferGeometry();
  for (const name of ['position', 'normal', 'color']) {
    const size = flat[0].attributes[name].itemSize;
    const total = flat.reduce((n, g) => n + g.attributes[name].count, 0);
    const arr = new Float32Array(total * size);
    let off = 0;
    for (const g of flat) { arr.set(g.attributes[name].array, off); off += g.attributes[name].count * size; }
    out.setAttribute(name, new T.BufferAttribute(arr, size));
  }
  return out;
}

/** @returns {THREE.Group|null} parts 가 없으면 null */
export function buildExhibitMesh(T, parts) {
  if (!parts || !parts.length) return null;
  const byMat = { solid: [], glow: [], glass: [] };
  for (const q of parts) {
    const geo = GEO[q.shape](T, q.args);
    geo.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...q.pos), new T.Quaternion().setFromEuler(new T.Euler(...q.rot)), new T.Vector3(...q.scl)));
    byMat[q.mat].push(paint(T, geo, q.color));
  }
  const g = new T.Group();
  for (const [k, geos] of Object.entries(byMat)) {
    if (!geos.length) continue;
    const m = new T.Mesh(merge(T, geos), MATERIAL[k](T));
    if (k === 'solid') m.castShadow = true;
    g.add(m);
  }
  return g;
}
```

- [ ] **Step 4: 통과 확인** — Run: `node --test tests/museum-exhibits.test.mjs 2>&1 | grep -E "^# (pass|fail)"` → `# fail 0`. (가짜 THREE 에 빠진 생성자가 있으면 보탠다. 실제 THREE 정확성은 Step 7 브라우저 스모크가 본다.)

- [ ] **Step 5: `museumExhibitMesh` 배선 + 바닥 맞춤** — `js/spaces/cafe.js`

import 추가(31행 근처):
```js
import { buildExhibitMesh } from '../museum/exhibit-build.js';
import { exhibitParts } from '../museum/exhibit-parts.js';
```
`museumExhibitMesh` 를 교체:
```js
// 🏛️ 전시물 메시 — 작물·물고기는 **게임에서 실제로 쓰는 조형**(cropMini·fishMesh)을 그대로 쓴다. 나머지는
//   js/museum/exhibit-parts.js 의 카테고리별 대표 조형 + 종별 변형. 그것도 없으면 색 20면체 폴백.
//   ⚠️ 2·3층 카테고리는 ORES 에 없다 — 폴백이 없으면 undefined.color 로 터진다.
//   모든 경로가 **바닥이 y=0** 인 그룹을 돌려준다(seatOnBase) — 받침·탁자·돔 어디에 놓든 같은 규칙.
function exhibitMeta(item) {
  if (item.cat !== 'npc') return {};
  const n = NPCS.find(x => x.id === item.id) || CAFE_GUESTS.find(x => x.id === item.id);
  return n ? { color: n.color, hat: n.hat } : {};
}
function seatOnBase(obj) {
  const g = new THREE.Group(); g.add(obj);
  obj.updateWorldMatrix(true, true);   // ⚠️ 재기 전에 행렬 갱신(museum-view-worldspace 의 교훈)
  const b = new THREE.Box3().setFromObject(g);
  if (Number.isFinite(b.min.y)) obj.position.y -= b.min.y;
  return g;
}
export function museumExhibitMesh(item) {
  let obj;
  if (item.cat === 'crop') obj = cropMini(CROP_TYPES.find(c => c.id === item.id));
  else if (item.cat === 'fish') obj = fishMesh(item.id);   // common / uncommon / rare 가 곧 등급 키다
  else obj = buildExhibitMesh(THREE, exhibitParts(item.cat, item.id, exhibitMeta(item))) || fallbackExhibit(item);
  return seatOnBase(obj);
}
function fallbackExhibit(item) {
  const ore = ORES.find(o => o.id === item.id);
  const tint = ore ? ore.color : (MUSEUM_CAT_TINT[item.cat] ?? 0xcfc8b8);
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 0), clayMat(tint));
  m.castShadow = true; g.add(m);
  return g;
}
```
`NPCS` 가 cafe.js 에 import 되어 있는지 확인(`grep -n "NPCS" js/spaces/cafe.js | head -3`); 없으면 `import { NPCS } from '../data/npcs.js';` 추가(`CAFE_GUESTS` 는 이미 places.js import 에 있다). `tests/museum.test.mjs` 의 `모든 층 카테고리에 전시물 색 폴백이 있다` 테스트는 `museumExhibitMesh` 본문에서 `MUSEUM_CAT_TINT[item.cat]` 를 찾으므로 **슬라이스를 `fallbackExhibit` 로 옮긴다**: `SRC.indexOf('function museumExhibitMesh(')` 를 `SRC.indexOf('function fallbackExhibit(')` 로 바꾼다(두 곳).

배선 테스트 추가(`tests/museum.test.mjs`):
```js
test('전시물 메시: 새 조형 → 폴백 순서, 모든 경로가 바닥 y=0 으로 앉는다', () => {
  const cafe = readFileSync(new URL('../js/spaces/cafe.js', import.meta.url), 'utf8');
  const i = cafe.indexOf('export function museumExhibitMesh(');
  const fn = cafe.slice(i, cafe.indexOf('\nfunction fallbackExhibit'));
  assert.match(fn, /buildExhibitMesh\(THREE, exhibitParts\(/);
  assert.match(fn, /\|\| fallbackExhibit\(item\)/);
  assert.match(fn, /return seatOnBase\(obj\)/);
  assert.match(cafe, /updateWorldMatrix\(true, true\);[^\n]*\n\s*const b = new THREE\.Box3/, '재기 전에 월드 행렬을 갱신해야 한다');
});
```

- [ ] **Step 6: `extras.js` 높이 갱신** — 모델 바닥이 0 이 되었으므로 돔 안(방석 윗면 1.05)에 맞춘다. `ex.position.set(x, 1.3, z); ex.rotation.y = 0.5; ex.scale.setScalar(0.72);` 를
```js
      ex.position.set(x, 1.06, z); ex.rotation.y = 0.5; ex.scale.setScalar(0.85);   // 방석 윗면(1.05) 위 — 전시물 모델 바닥이 y=0
```
로 바꾸고, 상단 주석 `// 방 로컬 좌표. 방은 x ±7.5 · z ±6.5, …` 를 `// 방 로컬 좌표. 1층은 벽 배치 방(x ±8 · z ±7, js/museum/layout.js), 입구는 남쪽(z +7) 가운데 폭 2.8, 계단은 북동·북서 구석.` 으로, `벽 진열장이 17칸으로 …` 줄은 `벽 유리장이 17칸이고 가운데는 비어 있어 — 특별 진열대 3칸이 가운데를 쓴다.` 로 고친다.

- [ ] **Step 7: 확인**

Run: `npm test 2>&1 | tail -6` → 전부 통과.
브라우저: Task 4 Step 4 와 같이 도감을 채우고 1층 입장 → **광물 3종이 돌/석탄/보석 결정 표본**으로 보이고(옛 20면체 아님) 바닥이 받침에 닿아 있는지, 🔍 확대 관람(`__museumView.open(i)`)에서 사라지지 않는지(`.state()` 의 cy 유한) 확인. 콘솔 에러 0. 스크린샷.

- [ ] **Step 8: 커밋**

```bash
git add js/museum/exhibit-build.js js/museum/extras.js js/spaces/cafe.js tests/museum.test.mjs tests/museum-exhibits.test.mjs
git commit -m "feat: merged exhibit builder wired into museumExhibitMesh (<=3 meshes, base at y=0)"
```

---

### Task 7: 카테고리 이식 A — 🍄채집 · 🌟반딧불이 · 🐾흔적 · 🪏땅속

**Files:**
- Modify: `js/museum/exhibit-parts.js` (BUILDERS 에 추가)
- Modify: `tests/museum-exhibits.test.mjs` (`PORTED` 확장)

**Interfaces:** `exhibitParts('forage'|'bug'|'track'|'dig', id)` — 실제 id 는 `forage: mushroom berry acorn herb` · `bug: yellow blue green rainbow` · `track: fur_tuft acorn_drop` · `dig: worm shard old_coin`.

**이식 규칙(시안 → 도형 목록):** 시안 `sims/museum-redesign-exhibits-sim.html` 의 함수(괄호는 시안 함수명)를 그대로 옮긴다. `mesh(SPH(r,w,h), mat(c), x,y,z, [sx,sy,sz], [rx,ry,rz])` → `p('sph',[r,w,h], c, { pos:[x,y,z], scl:[sx,sy,sz], rot:[rx,ry,rz] })`. `CYL→'cyl'`, `CONE→'cone'`, `BOX→'box'`, `grp(...)` 는 배열로 펼친다. `glow(c)` 재질 → `mat:'glow'`, `glass(c)` → `mat:'glass'`. `paw()`·`tile()` 같은 보조 그룹은 **도형 배열을 돌려주는 함수**로 만들어 `...` 로 펼친다(이동은 각 도형 `pos` 에 더한다).

| 카테고리 | id → 시안 함수 | 종별 구분 |
|---|---|---|
| forage | mushroom(`mushroom`) · berry(`berry`) · acorn(`acorn`) · herb(`herb`) | 모양 자체가 다름 |
| bug | yellow · blue · green · rainbow → `jar(cols)` | 병 속 빛구슬 색(채널 ≤0xd9 로 눌러 쓴다): yellow `[0xe8d44a, 0xe8d44a]` · blue `[0x62b0f0, 0x62b0f0]` · green `[0x80e070, 0x80e070]` · rainbow `[0xe0607a, 0xe0c040, 0x60e090, 0x62b0f0, 0xb880e0]`. 병 몸통 `mat:'glass'`, 구슬 `mat:'glow'` |
| track | fur_tuft(`fur`) · acorn_drop(`dropAcorn`) | 둘 다 점토판 `tile()` 위 |
| dig | worm(`worm`, `tube` 도형) · shard(`shard`) · old_coin(`oldCoin`) | |

- [ ] **Step 1: 실패 테스트** — `tests/museum-exhibits.test.mjs` 의 `const PORTED = ['ore'];` 를 `['ore', 'forage', 'bug', 'track', 'dig']` 로. Run: `node --test tests/museum-exhibits.test.mjs 2>&1 | grep -E "not ok|^# fail"` → forage·bug·track·dig 가 FAIL(`도형이 없다`).

- [ ] **Step 2: 구현** — 위 표대로 `exhibit-parts.js` 에 `FORAGE`, `BUG`, `TRACK`, `DIG` 객체를 만들고 `BUILDERS` 에 등록한다. 완성된 예 하나(🍄 버섯, 나머지도 같은 모양):

```js
const FORAGE = {
  mushroom: () => [
    p('cyl', [0.05, 0.07, 0.2, 8], 0xf1e4cf, { pos: [0, 0.1, 0] }),
    p('sph', [0.17, 10, 6], 0xd9483b, { pos: [0, 0.22, 0], scl: [1, 0.65, 1] }),
    ...[[0.07, 0.3, 0.05], [-0.08, 0.28, 0.03], [0.01, 0.3, -0.09]].map(pos => p('sph', [0.03, 6, 4], 0xfff7e8, { pos })),
  ],
  // berry · acorn · herb 는 시안(berry·acorn·herb 함수)을 위 규칙대로 옮긴다
};
```
`BUILDERS` 는 `{ ore: ORE, forage: FORAGE, bug: BUG, track: TRACK, dig: DIG }`.

- [ ] **Step 3: 통과 확인** — Run: `node --test tests/museum-exhibits.test.mjs 2>&1 | grep -E "^# (pass|fail)"` → `# fail 0`.
- [ ] **Step 4: 브라우저 확인** — 도감 전부 채우고 2층(`museumGoFloor`) 캡처. 🍄🌟🐾🪏 가 색 20면체가 아니고 유리장 안에 앉는지, 병 속 반딧불이가 눈부시지 않은지 본다. 시안(`dev/active/museum-redesign/look/exhibits.png`)과 모양을 대조.
- [ ] **Step 5: 커밋**

```bash
git add js/museum/exhibit-parts.js tests/museum-exhibits.test.mjs
git commit -m "feat: museum exhibits for forage, firefly jars, tracks, dig finds"
```

---

### Task 8: 카테고리 이식 B — 🛶강 · 🌫️정령 · 🌦️날씨

**Files:** Modify: `js/museum/exhibit-parts.js`, `tests/museum-exhibits.test.mjs`

**이식 규칙은 Task 7 과 같다.** 실제 id: `river: lotus driftwood shell moon_fish` · `spirit: shy sleepy mischief golden` · `weather: clear rain snow fog`.

| 카테고리 | id → 시안 함수 | 메모 |
|---|---|---|
| river | lotus(`lotus`) · driftwood(`driftwood`) · shell(`shell`) · moon_fish(`moonFish`) | moon_fish 몸통은 `mat:'glow'`, 색 `0xf6eaa8` → `0xd8cc90`(채널 ≤0xd9) |
| spirit | shy `0xa86fd9` · sleepy `0x6a8ad9` · mischief `0xf09a4a` · golden `0xf5d04a`+후광 | 아래 코드 |
| weather | clear(`sunG`) · rain(`rainG`) · snow(`snowG`) · fog(`fogG`) → `globe(inner)` | 유리돔 `sph [0.2,14,10]` `mat:'glass'` `pos [0,0.28,0]`, 받침 `cyl [0.17,0.2,0.08,10]` `0x7a6a5a` `pos [0,0.04,0]`. 안쪽 도형은 `pos` 의 y 에 +0.28. 태양·광선 `mat:'glow'`(색 `0xffd24a`→`0xd8b840`). 안개 구름은 `mat:'glass'` |

- [ ] **Step 1: 실패 테스트** — `PORTED` 에 `'river', 'spirit', 'weather'` 추가 → FAIL 확인.
- [ ] **Step 2: 구현** — `RIVER`, `SPIRIT`, `WEATHER` 를 만들어 `BUILDERS` 에 등록. 정령 코드(완성본):
```js
const SPIRIT_COLOR = { shy: 0xa86fd9, sleepy: 0x6a8ad9, mischief: 0xf09a4a, golden: 0xf5d04a };
// 발광색 채널을 눌러 0xd9 이하로(블룸 임계) — 0xf5·0.85 = 0xd0
const dim = (h) => ((((h >> 16) & 255) * 0.85) << 16) | ((((h >> 8) & 255) * 0.85) << 8) | ((h & 255) * 0.85);
const spirit = (id) => [
  p('lathe', [[[0, 0], [0.1, 0.02], [0.15, 0.13], [0.13, 0.25], [0.07, 0.33], [0, 0.35]], 12], dim(SPIRIT_COLOR[id]), { mat: 'glow' }),
  p('sph', [0.02, 4, 4], 0x2a2a3a, { pos: [-0.045, 0.24, 0.12] }),
  p('sph', [0.02, 4, 4], 0x2a2a3a, { pos: [0.045, 0.24, 0.12] }),
  ...(id === 'golden' ? [p('torus', [0.13, 0.012, 4, 16], 0xd8c060, { mat: 'glow', pos: [0, 0.45, 0], rot: [Math.PI / 2, 0, 0] })] : []),
];
const SPIRIT = Object.fromEntries(Object.keys(SPIRIT_COLOR).map(id => [id, () => spirit(id)]));
```
(`dim` 은 비트 연산이라 정수를 돌려주어 `Number.isInteger(color)` 테스트를 통과한다.)
- [ ] **Step 3: 통과 확인** — `# fail 0`.
- [ ] **Step 4: 브라우저 확인** — 3층 캡처(탁자 위 전시물이 유리 없이 보이는지 포함).
- [ ] **Step 5: 커밋**

```bash
git add js/museum/exhibit-parts.js tests/museum-exhibits.test.mjs
git commit -m "feat: museum exhibits for river finds, spirits, weather globes"
```

---

### Task 9: 카테고리 이식 C — 🧑주민 · 🍳요리 · 🦋방문객 (+ 모르는 id 기본값)

**Files:** Modify: `js/museum/exhibit-parts.js`, `tests/museum-exhibits.test.mjs`

실제 id: `visitor: butterfly sparrow hedgehog frog` · `npc`: NPCS 전체(`farmer builder merchant … courier`) + `guest_deer guest_otter guest_hedgehog guest_squirrel guest_raccoon guest_frog guest_turtle guest_beaver` · `cook: veg_stew mushroom_soup rice_ball baked_yam herb_salad grilled_fish omelette bread grape_juice lunchbox forest_feast`.

**주민(npc) — 인형(`doll`)**: 몸통 `cyl [.1,.14,.2,8]` · 머리 `sph [.11,10,8]` · 귀 2 · 눈 2 · 모자(`cyl` 두 단). 색은 `meta.color`·`meta.hat`(게임이 NPCS/CAFE_GUESTS 에서 넘긴다 — 실제 주민 색 그대로), 없으면 `pick(DOLL_BODY, id)`·`pick(DOLL_HAT, id)`(`DOLL_BODY = [0xd9a86a,0x6fa8c9,0xa08fb8,0x9a7a5a,0xe08a4a]`, `DOLL_HAT = [0x7a5f3c,0xf0e0c0,0x5a4d6a,0xc0503a,0x4a6a8a]`). 소품은 id 로 고정: `guest_deer` 뿔(`antler`) · `guest_otter` 리본 · `guest_hedgehog` 가시(`spike`). `NPC._default` 가 `(id, meta)` 를 받는 함수라 모든 id 가 통과한다.

**요리(cook) — 접시 위 음식**, 모양 4종 + 컵 1종을 id 로 매핑(`COOK._default` 는 `pick([soup, bread, cake, skewer], id)`):

| id | 모양(시안 함수) | 색 변형 |
|---|---|---|
| veg_stew | soup | 국물 `0xd9a05a`, 고명 초록 |
| mushroom_soup | soup | 국물 `0xe8d9b8`, 고명 `0xd9483b` |
| herb_salad | soup | 국물 `0x6fb36a`, 고명 `0xf4e3a0` |
| forest_feast | soup | 국물 `0xc77a3a`, 고명 3개 |
| bread | bread | 기본 `0xd9a05a` |
| baked_yam | bread | `0x9a5a7a` |
| rice_ball | bread | `0xf5f2ea` + 김 띠 `0x1c1c22`(박스 하나) |
| omelette | cake | 윗면 `0xf5d04a`, 위 장식 없음 |
| grilled_fish | skewer | 꼬치 대신 `sph` 몸통 `0xc89a6a` 한 개 + 꼬리 `cone` |
| lunchbox | cake | 상자(`box [.34,.1,.26]` `0xb5834f`) + 칸 네 개 색 |
| grape_juice | cup | **새 모양**: 컵 `cyl [.1,.08,.22,10]` `mat:'glass'` + 주스 `cyl [.085,.075,.16,10]` `0x7a3a8a` + 빨대 `cyl [.012,.012,.3,4]` |

**방문객(visitor)**: butterfly(`butterfly`) · sparrow(`sparrow`) · hedgehog(`hedgehog`) · frog(`frog`) — 시안 함수를 Task 7 규칙대로 옮긴다.

- [ ] **Step 1: 실패 테스트** — `PORTED` 에 `'npc', 'cook', 'visitor'` 추가. 아래 테스트도 추가:

```js
test('npc: 모르는 id·meta 없이도 도형이 나온다 — 주민이 늘어도 박물관이 터지지 않는다', () => {
  const a = exhibitParts('npc', 'brand_new_villager');
  assert.ok(a && a.length > 0);
  assert.deepEqual(exhibitParts('npc', 'brand_new_villager'), a, '같은 id 는 늘 같은 모양이어야 한다');
});

test('npc: meta 의 실제 색을 쓴다(주민이 자기 색으로 전시된다)', () => {
  const parts = exhibitParts('npc', 'farmer', { color: 0x5fbf62, hat: 0xf0cd6a });
  assert.ok(parts.some(q => q.color === 0x5fbf62), '몸 색이 meta.color 가 아니다');
  assert.ok(parts.some(q => q.color === 0xf0cd6a), '모자 색이 meta.hat 이 아니다');
});

test('cook: 모르는 레시피도 접시 위 음식으로 나온다', () => {
  assert.ok(exhibitParts('cook', 'brand_new_dish')?.length > 0);
});
```
Run → FAIL 확인.

- [ ] **Step 2: 구현** — `NPC`·`COOK`·`VISITOR` 를 만든다. 레지스트리는 `_default` 를 가진다:
```js
const NPC = { _default: (id, meta) => doll(id, meta) };
const COOK = { ...Object.fromEntries(Object.keys(COOK_SPEC).map(id => [id, () => dish(id)])), _default: (id) => dish(id) };
```
`doll(id, meta)` 는 `meta.color ?? pick(DOLL_BODY, id)`, `meta.hat ?? pick(DOLL_HAT, id)` 를 쓴다. `dish(id)` 는 `COOK_SPEC[id] ?? { kind: pick(['soup','bread','cake','skewer'], id) }` 로 모양과 색을 고른다. `BUILDERS` 에 `npc: NPC, cook: COOK, visitor: VISITOR` 등록.

- [ ] **Step 3: 통과 확인** — `# fail 0`.
- [ ] **Step 4: 브라우저 확인** — 3층(주민 인형 19칸이 서로 구분되는지)·특별전(요리 11칸)·2층(방문객) 캡처.
- [ ] **Step 5: 커밋**

```bash
git add js/museum/exhibit-parts.js tests/museum-exhibits.test.mjs
git commit -m "feat: museum exhibits for villagers, dishes, garden visitors"
```

---

### Task 10: 전부 덮는지 잠그고, 층 테마를 사용자와 정한다

**Files:**
- Modify: `tests/museum-exhibits.test.mjs`
- Modify: `js/museum.js` (`theme` 값)

- [ ] **Step 1: "전부 덮는다" 테스트 추가**

```js
test('작물·물고기 말고 모든 층 카테고리에 도형 목록이 있다 — 하나라도 빠지면 그 종은 옛 원석으로 남는다', () => {
  const need = [...new Set(MUSEUM_FLOORS.flatMap(f => f.cats))].filter(c => !OWN.includes(c)).sort();
  assert.deepEqual([...PARTS_CATS].sort(), need);
  assert.deepEqual([...PORTED].sort(), need);
});
```
Run: `node --test tests/museum-exhibits.test.mjs 2>&1 | grep -E "^# (pass|fail)"` → 통과해야 한다(Task 7~9 후).

- [ ] **Step 2: 테마 후보 렌더** — 상층(2·3·특별전)의 `theme`(floor·wall·light) 후보 3종을 만든다. 후보(예): ①`{floor:0xcdb58f, wall:0xe9dcc6, light:0xfff0d8}` 따뜻한 상아 ②`{floor:0xb9a98c, wall:0xdde3d6, light:0xf2f7e8}` 이끼 ③`{floor:0x9fa6b8, wall:0xe3e5ee, light:0xeaf0ff}` 푸른 밤. 브라우저에서 `const m = await import('/js/museum.js'); Object.assign(m.MUSEUM_FLOORS[2].theme, 후보)` 로 바꾸고 `__space.museum[0]()` 재진입(방을 다시 짓는다)해 3층을 PC·모바일(375)로 캡처한다. 후보별 3층 캡처를 한 장으로 나란히 만들어(`dev/active/museum-redesign/look/theme-compare.png`) **사용자에게 보내 고르게 한다**(디자인 결정은 시각 비교로 받는 규칙).
- [ ] **Step 3: 확정값을 `MUSEUM_FLOORS` 에 반영**(층마다 약간씩 다르게: 2층 → 3층 → 특별전으로 갈수록 차분하게). 테마 정수 테스트(Task 1)는 그대로 통과해야 한다.
- [ ] **Step 4: 커밋**

```bash
git add js/museum.js tests/museum-exhibits.test.mjs dev/active/museum-redesign/look
git commit -m "feat: per-floor museum theme and exhibit coverage lock"
```

---

### Task 11: 실측 검증 + 문서

**Files:** Modify: `dev/active/museum-redesign/*`(dev docs), 메모리 `museum-redesign.md`

- [ ] **Step 1: 전체 테스트** — Run: `npm test 2>&1 | tail -8` → `# fail 0`.
- [ ] **Step 2: 층별 캡처** — 도감 전부 채우고 4개 층을 PC(1280×800)·모바일(375×812)로 캡처. 확인 항목: (a) 상층 남쪽에 문이 없고 `🚪 나가기` 프롬프트가 안 뜬다 (b) 3층 31칸·특별전 11칸이 겹치거나 가려지지 않는다 (c) 걸어서 모든 칸 앞에 설 수 있다(탁자 사이 통로 통과, 계단 왕복) (d) 명판이 옆 칸으로 헷갈리지 않는다(탁자 칸 앞에서 `museumPlateText()` 가 바로 앞 칸을 돌려준다) (e) 🔍 확대 관람이 벽 칸·탁자 칸에서 모두 전시물을 보여준다(`__museumView.open(i)` → `.state()` 의 cy 유한, 카메라가 벽 속이 아님).
- [ ] **Step 3: 드로우콜** — `renderer.info.render.calls` 를 3층 진입 전·후로 읽는다. 3층 전시물 31개의 증가분이 **메시 수 ≤ 31×3 + 방 재질 수**인지, 총 프레임 드로우콜이 기존 마을 기준(≈570)을 넘지 않는지 확인하고 수치를 기록한다.
- [ ] **Step 4: 기존 진행 보호** — `tests/museum.test.mjs` 의 "도감 종이 늘어도 이미 열린 층이 닫히지 않는다"·세이브 복원 테스트가 그대로 통과(해금·세이브는 안 건드렸다).
- [ ] **Step 5: dev docs·메모리** — `dev/active/museum-redesign/` 에 `museum-redesign-plan.md`(이 계획 요약+링크) · `-context.md`(핵심 파일·결정·Last Updated) · `-tasks.md`(체크리스트)를 만들고, 메모리 `museum-redesign.md` 를 쓰고 `MEMORY.md` 에 한 줄 추가한다(내용: 정문 1층만 · 벽 16×14/회랑 20×14 · exhibit-parts 데이터+빌더 · 메시 ≤3 규칙 · 배포 대기).
- [ ] **Step 6: 커밋**

```bash
git add dev/active/museum-redesign
git commit -m "docs: museum redesign dev docs"
```
- [ ] **Step 7: 사용자 보고** — 캡처와 수치를 보여주고 **배포(웹·토스·itch·안드로이드 4곳 동시)는 승인 후** 진행한다. 푸시는 main + feat/capacitor-app 둘 다(메모리 규칙), 푸시 전 `git grep` 키 스캔 필수(저장소가 PUBLIC).

---

## Self-Review

**1. Spec coverage**
- §3.1 문·층 구조 → Task 3(doors/game 1층 조건), Task 4(남쪽 난간·유리창, 계단 일반화). ✓
- §3.2 배치 순수 모듈·`museumDims()` 소비처 → Task 2·3. (스펙의 "15×13" 은 16×14 로 수정 — Global Constraints 에 명시.) ✓
- §3.3 전시물 조형·메시 ≤3·폴백 유지·광물 표본 → Task 5~9. ✓
- §3.4 층 테마 → Task 1(필드)·Task 10(확정). ✓
- §4 건드리지 않는 것 — 해금·세이브 미변경, 확대 관람은 입력만(Task 3 Step 3f) ✓
- §5 위험: 탁자 칸 명판 헷갈림 → Task 11 Step 2(d) 실측(최근접 한 칸). 드로우콜 → Task 6 빌더 + Task 11 Step 3. 방 크기 → Task 3. ✓ (스펙의 "탁자 빈 칸 받침 표식" → Task 4 의 작은 천 덮개 `cloth`.)
- §6 테스트 → Task 1·2·3·4·5~10. ✓

**2. Placeholder scan:** Task 7·8·9 의 일부 종(berry·acorn·herb 등)은 코드를 풀어 쓰지 않고 시안 함수를 **명시한 변환 규칙**으로 옮기게 했다(시안 파일이 커밋된 원천이고, 완성 예제 + 종별 id·색 표 + 자동 테스트가 완성도를 잠근다). 코드 블록이 필요한 로직(layout·builder·배선·테스트)은 전부 실었다.

**3. Type consistency:** `museumLayout(kind,count) → { dims, slots:[{x,z,ry,kind}], tables:[{x,z,w,d}] }`, `stairBox(sx,dims)`, `stairSpot(sx,dims)`, `caseHalf(slot)`, `inwardOf(ry)`, `museumDims()`, `museumLayoutNow()`, `exhibitParts(cat,id,meta)`, `buildExhibitMesh(T, parts)`, `museumExhibitMesh(item)`, `seatOnBase(obj)` — 정의(Task 2·3·5·6)와 사용(Task 3·4·6)의 이름·시그니처가 일치한다. `museumCases` 항목에 `kind` 가 추가됐으나 소비처(`museumPlateText`)는 `x·z·i` 만 쓴다.
