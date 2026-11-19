# 세계수 엔딩 (tree-finale) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a player finishes story chapter 9, play a ~13 s "follow the root path" ending. The tree then keeps permanent blossoms, a glowing root path runs to the neighbor gate, and the player earns the title 「세계수지기」. The title also shows on other players' neighbor lists.

**Architecture:**
- Pure logic lives in three new modules under `js/world/`: rules, camera rig, and art. The art takes `THREE` as a parameter, following the `tree-shot.js` / `tree-art.js` pattern.
- A runtime module `js/spaces/tree-finale.js` drives overlay, camera, NPC placement and GA4. `world-tree.js` calls it from `updateWorldTree`.
- The server change is one extra `title` key in `neighbors_today`.

**Tech Stack:** Vanilla ES modules, Three.js (`vendor/three`), `node --test`, Supabase Postgres (plpgsql), CDP harness (`tools/store-shots/cdp.mjs`).

**Spec:** `docs/superpowers/specs/2026-11-20-tree-finale-design.md`

## Global Constraints

- No comments in new code (JS, CSS, SQL bodies, tests). Explanations go in commits and dev docs.
- UI copy has no em dash (—) and no "놀다". World bubbles are emoji only.
- Every new Korean UI string gets an English entry in `js/i18n-en.js`.
- New save data goes only in `gameState.hintsSeen` (key `treeFinale`, value `'YYYY-MM-DD'` from `todayStr()`).
- GA4: one new event `tree_finale` with exactly 3 params `{ skipped, sec, via }`.
- Do not change tool swing motion. Do not edit `js/b/` bundles by hand.
- Push, merge, deploy and production SQL only on the user's explicit instruction. Commits are local.
- Production SQL starts from the current production body. It was read on 2026-11-20 and is identical to `sql/migrations/migrate_neighbors_moderation.sql:71-101`. Never re-run old migrations.
- Title threshold is the constant `FINALE_CH = 9`. Do not use `STORY.length`: a future chapter 10 must not take the title away.
- Copy is fixed by the spec §7. Use it verbatim.

## File Map

| File | Status | Responsibility |
|---|---|---|
| `js/world/finale-rules.js` | create | Pure judgments: title, due, teaser, via, neighbor row |
| `js/world/finale-rig.js` | create | Pure camera path + reveal/bloom progress + skip/close |
| `js/world/finale-art.js` | create | Blossoms, petals, root tubes (4 draw calls), progress setters |
| `js/spaces/tree-finale.js` | create | Runtime: start/skip/close, overlay, NPC staging, glyphs, GA4, save, permanent art |
| `js/spaces/world-tree.js` | modify | Build art, call finale update, busy/fog/near hooks, board view fields |
| `js/world/tree-board-ui.js` | modify | Title band, replay button, teaser |
| `js/story/rules.js` | modify | `keeper` flag in story view |
| `index.html` | modify | Story chip shows title after the last chapter |
| `js/neighbors/rules.js`, `js/neighbors/ui.js` | modify | `keeper` row flag, 🌸 badge |
| `js/i18n-en.js` | modify | English copy |
| `sql/migrations/migrate_tree_finale_title.sql` | create | `neighbors_today` + `title` |
| `sql/tests/neighbors_selftest.sql` | modify | title assertions |
| `tests/finale-rules.test.mjs`, `tests/finale-rig.test.mjs`, `tests/finale-art.test.mjs`, `tests/finale-i18n.test.mjs`, `tests/finale-wiring.test.mjs` | create | Unit tests |
| `dev/active/tree-finale/verify/finale-verify.mjs` | create | CDP verification (not shipped) |

---

### Task 1: finale-rules (pure judgments)

**Files:**
- Create: `js/world/finale-rules.js`
- Test: `tests/finale-rules.test.mjs`

**Interfaces:**
- Produces:
  - `FINALE_CH: 9`
  - `FINALE_KEY: 'treeFinale'`
  - `hasKeeperTitle(state) → boolean`
  - `finaleDue(state) → boolean`
  - `showTeaser(state) → boolean`
  - `finaleVia(chAtBoot: number|null, state, replay: boolean) → 'live'|'boot'|'replay'`
  - `markFinaleSeen(hintsSeen, day) → new hintsSeen object`
  - `isKeeperRow(row) → boolean`

- [ ] **Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FINALE_CH, FINALE_KEY, finaleDue, finaleVia, hasKeeperTitle, isKeeperRow, markFinaleSeen, showTeaser } from '../js/world/finale-rules.js';

const S = (ch, hintsSeen = {}) => ({ story: { ch }, hintsSeen });

test('칭호는 9장을 끝낸 세이브만 받는다', () => {
  assert.equal(FINALE_CH, 9);
  assert.equal(hasKeeperTitle(S(8)), false);
  assert.equal(hasKeeperTitle(S(9)), true);
  assert.equal(hasKeeperTitle(S(10)), true);
  assert.equal(hasKeeperTitle(S('9')), true);
  assert.equal(hasKeeperTitle(S('abc')), false);
  assert.equal(hasKeeperTitle({}), false);
  assert.equal(hasKeeperTitle(null), false);
});

test('엔딩은 칭호가 있고 아직 안 본 세이브에서 한 번만 돈다', () => {
  assert.equal(finaleDue(S(9)), true);
  assert.equal(finaleDue(S(9, { [FINALE_KEY]: '2026-11-20' })), false);
  assert.equal(finaleDue(S(8)), false);
});

test('예고는 칭호가 없을 때만 보인다', () => {
  assert.equal(showTeaser(S(3)), true);
  assert.equal(showTeaser(S(9)), false);
});

test('via: 다시 보기 > 이번 접속에 9장을 끝냄 > 소급', () => {
  assert.equal(finaleVia(8, S(9), false), 'live');
  assert.equal(finaleVia(9, S(9), false), 'boot');
  assert.equal(finaleVia(null, S(9), false), 'boot');
  assert.equal(finaleVia(8, S(9), true), 'replay');
});

test('본 기록은 새 객체로 남기고 원본은 그대로 둔다', () => {
  const h = { a: true };
  const out = markFinaleSeen(h, '2026-11-20');
  assert.deepEqual(out, { a: true, treeFinale: '2026-11-20' });
  assert.deepEqual(h, { a: true });
  assert.deepEqual(markFinaleSeen(undefined, '2026-11-20'), { treeFinale: '2026-11-20' });
});

test('이웃 행 칭호는 서버 title 값만 믿는다', () => {
  assert.equal(isKeeperRow({ title: 'keeper' }), true);
  assert.equal(isKeeperRow({ title: null }), false);
  assert.equal(isKeeperRow({}), false);
  assert.equal(isKeeperRow(null), false);
});

test('순수 모듈: import 없음', () => {
  assert.doesNotMatch(readFileSync(new URL('../js/world/finale-rules.js', import.meta.url), 'utf8'), /^import /m);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/finale-rules.test.mjs`
Expected: FAIL with `Cannot find module` for `finale-rules.js`.

- [ ] **Step 3: Write minimal implementation**

```js
export const FINALE_CH = 9;
export const FINALE_KEY = 'treeFinale';

const chOf = (s) => {
  const n = Number(s?.story?.ch);
  return Number.isFinite(n) ? n : 0;
};

export const hasKeeperTitle = (s) => chOf(s) >= FINALE_CH;
export const finaleDue = (s) => hasKeeperTitle(s) && !s?.hintsSeen?.[FINALE_KEY];
export const showTeaser = (s) => !hasKeeperTitle(s);

export function finaleVia(chAtBoot, s, replay) {
  if (replay) return 'replay';
  return chAtBoot != null && chAtBoot < FINALE_CH && hasKeeperTitle(s) ? 'live' : 'boot';
}

export const markFinaleSeen = (hintsSeen, day) => ({ ...(hintsSeen || {}), [FINALE_KEY]: day });
export const isKeeperRow = (row) => row?.title === 'keeper';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/finale-rules.test.mjs`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add js/world/finale-rules.js tests/finale-rules.test.mjs
git commit -m "feat(tree-finale): pure rules for title, due and via"
```

---

### Task 2: finale-rig (pure camera path and progress)

**Files:**
- Create: `js/world/finale-rig.js`
- Test: `tests/finale-rig.test.mjs`

**Interfaces:**
- Consumes: `ease` from `js/world/tree-shot.js`.
- Produces:
  - `FINALE_T = { fly: 1.2, root: 6, bloom: 3, out: 0.9 }`
  - `rootPoints(tree:{x,z}, gate:{x,z}, n = 9) → [{x, y, z}]`, ordered **gate first, tree last**
  - `pointAt(pts, k) → {x, y, z}`: linear interpolation by arc length, `k` clamped to 0..1
  - `createFinaleRig({ from:{pos,look}, pts, tree:{x,z}, aspect, home(p,l) })` → rig with:
    - getters `phase` (`'fly'|'root'|'bloom'|'card'|'out'|'done'`), `cur`, `reveal`, `bloom`, `caption`
    - methods `update(dt) → phase`, `skip()`, `close()`

- [ ] **Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FINALE_T, createFinaleRig, pointAt, rootPoints } from '../js/world/finale-rig.js';

const TREE = { x: 4, z: -35 }, GATE = { x: -4, z: 25 };
const home = (p, l) => { p.x = 0; p.y = 14; p.z = 16; l.x = 0; l.y = 1.2; l.z = 0; };
const from = { pos: { x: 0, y: 14, z: 16 }, look: { x: 0, y: 1.2, z: 0 } };
const make = (aspect = 1.6) => createFinaleRig({ from, pts: rootPoints(TREE, GATE), tree: TREE, aspect, home });

test('뿌리 점: 입구에서 시작해 세계수 앞에서 끝난다', () => {
  const pts = rootPoints(TREE, GATE);
  assert.equal(pts.length, 10);
  assert.ok(Math.abs(pts[0].x - GATE.x) < 0.01 && Math.abs(pts[0].z - GATE.z) < 0.01);
  assert.ok(Math.abs(pts[9].x - TREE.x) < 0.01 && Math.abs(pts[9].z - (TREE.z + 2.6)) < 0.01);
  assert.ok(pts.every(p => p.y > 0 && p.y < 0.2));
});

test('pointAt: 끝점 고정·범위 밖은 자른다', () => {
  const pts = rootPoints(TREE, GATE);
  assert.deepEqual(pointAt(pts, 0), pts[0]);
  assert.deepEqual(pointAt(pts, 1), pts[9]);
  assert.deepEqual(pointAt(pts, -1), pts[0]);
  assert.deepEqual(pointAt(pts, 2), pts[9]);
});

test('흐름: fly → root → bloom → card 에서 멈추고, 번짐·꽃은 줄지 않는다', () => {
  const r = make();
  const seen = [];
  let lastReveal = 0, lastBloom = 0, t = 0;
  while (r.phase !== 'card' && t < 20) {
    r.update(1 / 60); t += 1 / 60;
    if (seen.at(-1) !== r.phase) seen.push(r.phase);
    assert.ok(r.reveal >= lastReveal - 1e-9 && r.bloom >= lastBloom - 1e-9);
    if (r.phase === 'fly' || r.phase === 'root') assert.equal(r.bloom, 0);
    assert.equal(r.caption, r.phase === 'root');
    lastReveal = r.reveal; lastBloom = r.bloom;
  }
  assert.deepEqual(seen, ['fly', 'root', 'bloom', 'card']);
  const total = FINALE_T.fly + FINALE_T.root + FINALE_T.bloom;
  assert.ok(Math.abs(t - total) < 0.1, String(t));
  assert.equal(r.reveal, 1);
  assert.equal(r.bloom, 1);
  for (let i = 0; i < 600; i++) r.update(1 / 60);
  assert.equal(r.phase, 'card');
});

test('건너뛰기: 바로 끝 카드, 번짐·꽃은 다 찬다', () => {
  const r = make();
  r.update(0.5);
  r.skip();
  assert.equal(r.phase, 'card');
  assert.equal(r.reveal, 1);
  assert.equal(r.bloom, 1);
  r.skip();
  assert.equal(r.phase, 'card');
});

test('닫기: 카드에서만 집 시점으로 돌아가 끝난다', () => {
  const r = make();
  r.close();
  assert.equal(r.phase, 'fly');
  r.skip();
  r.close();
  assert.equal(r.phase, 'out');
  let t = 0;
  while (r.update(1 / 60) !== 'done' && t < 5) t += 1 / 60;
  assert.ok(t <= FINALE_T.out + 0.05);
  assert.ok(Math.abs(r.cur.pos.z - 16) < 1e-6 && Math.abs(r.cur.look.y - 1.2) < 1e-6);
});

test('폰 세로는 세계수를 더 멀리서 올려다본다', () => {
  const land = make(1.6), port = make(390 / 844);
  land.skip(); port.skip();
  const d = (r) => Math.hypot(r.cur.pos.x - TREE.x, r.cur.pos.z - TREE.z);
  assert.ok(d(port) > d(land) * 1.5, `${d(port)} vs ${d(land)}`);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/finale-rig.test.mjs`
Expected: FAIL with `Cannot find module`.

- [ ] **Step 3: Write minimal implementation**

```js
import { ease } from './tree-shot.js';

export const FINALE_T = { fly: 1.2, root: 6, bloom: 3, out: 0.9 };
const U0 = 0.04, U1 = 0.9, AHEAD = 0.15;

export function rootPoints(tree, gate, n = 9) {
  const z0 = tree.z + 2.6, out = [];
  for (let i = 0; i <= n; i++) {
    const k = 1 - i / n;
    const wig = Math.sin(k * 7) * 2.2 * (1 - Math.abs(k - 0.5) * 1.4) * (i === 0 || i === n ? 0 : 1);
    out.push({ x: tree.x + (gate.x - tree.x) * k + wig, y: 0.08, z: z0 + (gate.z - z0) * k });
  }
  return out;
}

export function pointAt(pts, k) {
  const c = Math.min(1, Math.max(0, k));
  const seg = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z); seg.push(d); total += d; }
  let want = c * total;
  for (let i = 0; i < seg.length; i++) {
    if (want <= seg[i] || i === seg.length - 1) {
      const f = seg[i] ? Math.min(1, want / seg[i]) : 0, a = pts[i], b = pts[i + 1];
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: a.z + (b.z - a.z) * f };
    }
    want -= seg[i];
  }
  return { ...pts[pts.length - 1] };
}

const mix = (o, a, b, k) => { o.x = a.x + (b.x - a.x) * k; o.y = a.y + (b.y - a.y) * k; o.z = a.z + (b.z - a.z) * k; };

export function createFinaleRig({ from, pts, tree, aspect, home }) {
  const far = aspect < 0.8 ? 1.8 : 1;
  const along = (u) => {
    const p = pointAt(pts, u), q = pointAt(pts, Math.min(1, u + 0.18));
    return { pos: { x: p.x + 2, y: 5.5, z: p.z + 7 * far }, look: { x: q.x, y: 2.5, z: q.z } };
  };
  const top = { pos: { x: tree.x, y: 6, z: tree.z + 22 * far }, look: { x: tree.x, y: 7, z: tree.z } };
  const start = along(U0);
  const cur = { pos: { ...from.pos }, look: { ...from.look } };
  const outFrom = { pos: {}, look: {} }, hp = { x: 0, y: 0, z: 0 }, hl = { x: 0, y: 0, z: 0 };
  let phase = 'fly', t = 0, reveal = 0, bloom = 0;
  const setCur = (f) => { cur.pos = { ...f.pos }; cur.look = { ...f.look }; };
  return {
    get phase() { return phase; },
    get cur() { return cur; },
    get reveal() { return reveal; },
    get bloom() { return bloom; },
    get caption() { return phase === 'root'; },
    skip() {
      if (phase !== 'fly' && phase !== 'root' && phase !== 'bloom') return;
      reveal = 1; bloom = 1; setCur(top); phase = 'card';
    },
    close() {
      if (phase !== 'card') return;
      outFrom.pos = { ...cur.pos }; outFrom.look = { ...cur.look }; phase = 'out'; t = 0;
    },
    update(dt) {
      if (phase === 'done' || phase === 'card') return phase;
      t += dt;
      if (phase === 'fly') {
        const k = ease(t / FINALE_T.fly);
        mix(cur.pos, from.pos, start.pos, k); mix(cur.look, from.look, start.look, k);
        reveal = Math.max(reveal, Math.min(1, U0 + AHEAD) * k);
        if (t >= FINALE_T.fly) { phase = 'root'; t = 0; }
      } else if (phase === 'root') {
        const u = U0 + (U1 - U0) * ease(t / FINALE_T.root);
        setCur(along(u));
        reveal = Math.max(reveal, Math.min(1, u + AHEAD));
        if (t >= FINALE_T.root) { phase = 'bloom'; t = 0; reveal = 1; }
      } else if (phase === 'bloom') {
        const k = ease(t / FINALE_T.bloom), a = along(U1);
        mix(cur.pos, a.pos, top.pos, Math.min(1, k * 1.6)); mix(cur.look, a.look, top.look, Math.min(1, k * 1.6));
        bloom = Math.max(bloom, k);
        if (t >= FINALE_T.bloom) { bloom = 1; setCur(top); phase = 'card'; }
      } else if (phase === 'out') {
        home(hp, hl);
        const k = ease(t / FINALE_T.out);
        mix(cur.pos, outFrom.pos, hp, k); mix(cur.look, outFrom.look, hl, k);
        if (t >= FINALE_T.out) { cur.pos = { ...hp }; cur.look = { ...hl }; phase = 'done'; }
      }
      return phase;
    },
  };
}
```

Note: `rootPoints` uses `k = 1 - i/n`, so index 0 is the gate (k = 1) and index n is the tree (k = 0). The wiggle is zeroed at both ends so the endpoints are exact.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/finale-rig.test.mjs tests/tree-shot.test.mjs`
Expected: PASS. If the "흐름" total-time assert fails by one frame, make sure the phase change happens on `t >= T` in the same update, not the next one.

- [ ] **Step 5: Commit**

```bash
git add js/world/finale-rig.js tests/finale-rig.test.mjs
git commit -m "feat(tree-finale): pure camera rig along the root path"
```

---

### Task 3: finale-art (blossoms, petals, root path)

**Files:**
- Create: `js/world/finale-art.js`
- Test: `tests/finale-art.test.mjs`

**Interfaces:**
- Consumes: nothing from earlier tasks. Points come from Task 2's `rootPoints` and are passed in by the caller.
- Produces: `buildFinaleArt(three, { box:{cx,cy,cz,hx,hy,hz}, pts:[{x,y,z}], seed = 7 })` returns:
  - `{ group, setReveal(k), setBloom(k), setNight(on), update(dt) }`
  - `group` holds exactly 4 drawables: blossoms InstancedMesh, petals InstancedMesh, root tube, root halo.
  - `box` uses the shape of `wt.box` in `world-tree.js` (center + half sizes).

- [ ] **Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { buildFinaleArt } from '../js/world/finale-art.js';
import { rootPoints } from '../js/world/finale-rig.js';

const BOX = { cx: 4, cy: 5, cz: -34, hx: 6.5, hy: 5, hz: 5 };
const make = () => buildFinaleArt(THREE, { box: BOX, pts: rootPoints({ x: 4, z: -35 }, { x: -4, z: 25 }) });
const drawables = (g) => { const out = []; g.traverse(o => { if (o.isMesh || o.isSprite || o.isPoints) out.push(o); }); return out; };
const scaleOf = (im, i) => { const m = new THREE.Matrix4(), s = new THREE.Vector3(); im.getMatrixAt(i, m); m.decompose(new THREE.Vector3(), new THREE.Quaternion(), s); return s.x; };

test('three 를 직접 import 하지 않는다', () => {
  assert.doesNotMatch(readFileSync(new URL('../js/world/finale-art.js', import.meta.url), 'utf8'), /from 'three'/);
});

test('그리기 호출 4개: 꽃·꽃잎·뿌리·뿌리 빛', () => {
  const a = make();
  assert.equal(drawables(a.group).length, 4);
});

test('뿌리 번짐: 0 이면 안 보이고 1 이면 끝까지', () => {
  const a = make();
  const tubes = drawables(a.group).filter(o => !o.isInstancedMesh);
  a.setReveal(0);
  assert.ok(tubes.every(o => o.geometry.drawRange.count === 0));
  a.setReveal(1);
  assert.ok(tubes.every(o => o.geometry.drawRange.count >= o.geometry.index.count));
});

test('꽃: 0 이면 다 접히고, 중간엔 아래쪽이 먼저, 1 이면 다 핀다', () => {
  const a = make();
  const im = drawables(a.group).find(o => o.isInstancedMesh && o.count >= 200);
  a.setBloom(0);
  for (let i = 0; i < im.count; i++) assert.equal(scaleOf(im, i), 0);
  a.setBloom(0.5);
  const ys = [], open = [];
  const m = new THREE.Matrix4(), p = new THREE.Vector3();
  for (let i = 0; i < im.count; i++) { im.getMatrixAt(i, m); p.setFromMatrixPosition(m); ys.push(p.y); open.push(scaleOf(im, i) > 0); }
  const meanY = (f) => { const v = ys.filter((_, i) => open[i] === f); return v.reduce((s, y) => s + y, 0) / Math.max(1, v.length); };
  assert.ok(meanY(true) < meanY(false));
  a.setBloom(1);
  for (let i = 0; i < im.count; i++) assert.ok(scaleOf(im, i) > 0);
});

test('밤엔 뿌리 빛이 더 진하다', () => {
  const a = make();
  const halo = drawables(a.group).find(o => o.material.transparent && !o.isInstancedMesh);
  a.setNight(false); const day = halo.material.opacity;
  a.setNight(true); assert.ok(halo.material.opacity > day);
});

test('꽃잎은 꽃이 반 넘게 핀 뒤에만 떨어진다', () => {
  const a = make();
  const petals = drawables(a.group).find(o => o.isInstancedMesh && o.count < 200);
  a.setBloom(0.3); assert.equal(petals.visible, false);
  a.setBloom(1); assert.equal(petals.visible, true);
  a.update(0.5);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/finale-art.test.mjs`
Expected: FAIL with `Cannot find module`.

- [ ] **Step 3: Write minimal implementation**

```js
const PINKS = [0xffb7d5, 0xffd1e3, 0xff9cc4, 0xfff0f6];
const N_BLOOM = 240, N_PETAL = 160;

function rnd(seed) {
  let s = seed >>> 0;
  return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909)) >>> 0) / 4294967296;
}

export function buildFinaleArt(three, { box, pts, seed = 7 }) {
  const T = three, r = rnd(seed), group = new T.Group();
  const top = box.cy + box.hy, m4 = new T.Matrix4(), q = new T.Quaternion(), v = new T.Vector3(), s = new T.Vector3();

  const blooms = new T.InstancedMesh(new T.IcosahedronGeometry(1, 1), new T.MeshBasicMaterial({ toneMapped: false }), N_BLOOM);
  const spots = [];
  for (let i = 0; i < N_BLOOM; i++) {
    const th = r() * Math.PI * 2, ph = r() * 1.35, rr = 0.86 + r() * 0.1;
    const pos = new T.Vector3(
      box.cx + Math.cos(th) * Math.sin(ph) * box.hx * rr,
      top - box.hy * 0.6 + Math.cos(ph) * box.hy * 0.6 * rr,
      box.cz + Math.sin(th) * Math.sin(ph) * box.hz * rr);
    spots.push({ pos, size: 0.16 + r() * 0.16 });
    blooms.setColorAt(i, new T.Color(PINKS[i % 4]));
  }
  const ys = spots.map(p => p.pos.y), y0 = Math.min(...ys), y1 = Math.max(...ys);
  spots.forEach(p => { p.at = (p.pos.y - y0) / Math.max(1e-6, y1 - y0) * 0.7; });

  const petalGeo = new T.PlaneGeometry(0.16, 0.11);
  const petals = new T.InstancedMesh(petalGeo, new T.MeshBasicMaterial({ color: PINKS[0], side: T.DoubleSide, toneMapped: false }), N_PETAL);
  const fall = [];
  for (let i = 0; i < N_PETAL; i++) {
    fall.push({ x: box.cx + (r() - 0.5) * box.hx * 4.4, y: r() * top, z: box.cz + (r() - 0.5) * box.hz * 4.4 + 4, a: r() * 6, sp: 0.4 + r() * 0.5 });
  }

  const curve = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(p.x, p.y, p.z)));
  const tube = new T.Mesh(new T.TubeGeometry(curve, 240, 0.22, 6, false), new T.MeshBasicMaterial({ color: 0xffd36b, toneMapped: false }));
  const halo = new T.Mesh(new T.TubeGeometry(curve, 240, 0.55, 6, false),
    new T.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.22, depthWrite: false, toneMapped: false }));

  group.add(blooms, petals, tube, halo);

  const placePetals = () => {
    fall.forEach((f, i) => { q.setFromEuler(new T.Euler(f.a, f.a * 0.7, f.a * 1.3)); m4.compose(v.set(f.x, f.y, f.z), q, s.set(1, 1, 1)); petals.setMatrixAt(i, m4); });
    petals.instanceMatrix.needsUpdate = true;
  };

  const api = {
    group,
    setReveal(k) {
      const c = Math.min(1, Math.max(0, k));
      for (const o of [tube, halo]) o.geometry.setDrawRange(0, Math.floor(o.geometry.index.count * c / 3) * 3);
    },
    setBloom(k) {
      spots.forEach((p, i) => {
        const g = Math.min(1, Math.max(0, (k - p.at) / 0.3));
        m4.compose(p.pos, q.identity(), s.setScalar(p.size * g));
        blooms.setMatrixAt(i, m4);
      });
      blooms.instanceMatrix.needsUpdate = true;
      petals.visible = k > 0.5;
    },
    setNight(on) { halo.material.opacity = on ? 0.45 : 0.22; },
    update(dt) {
      if (!petals.visible) return;
      for (const f of fall) {
        f.y -= dt * f.sp; f.a += dt * 1.5; f.x += Math.sin(f.a) * dt * 0.3;
        if (f.y < 0) f.y = top;
      }
      placePetals();
    },
  };
  placePetals();
  api.setBloom(0);
  api.setReveal(0);
  return api;
}
```

Runtime note for Task 5: `setBloom(1)` every frame rewrites 240 matrices. The permanent path must call `setBloom` only when the value changes. Task 5's runtime keeps a `lastBloom` guard.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/finale-art.test.mjs`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add js/world/finale-art.js tests/finale-art.test.mjs
git commit -m "feat(tree-finale): blossom crown, petals and root path art"
```

---

### Task 4: Server title in neighbors_today (SQL + selftest)

**Files:**
- Create: `sql/migrations/migrate_tree_finale_title.sql`
- Modify: `sql/tests/neighbors_selftest.sql`. Insert after the `today 응답에 user_id` check around line 75, and add declarations to the `declare` block at the top.

**Interfaces:**
- Produces: each `neighbors_today().list[]` row gains `title: 'keeper' | null`. Later tasks read it through `isKeeperRow(row)` (Task 1).

- [ ] **Step 1: Write the selftest assertions first**

Add to the `declare` block:

```sql
  pid1 uuid; pid2 uuid; orig1 jsonb; orig2 jsonb; tt1 text; tt2 text;
```

Insert after the `today 응답에 user_id` loop:

```sql
  select public_id into pid1 from village_profiles where user_id = top3[1];
  select public_id into pid2 from village_profiles where user_id = top3[2];
  select state into orig1 from game_saves where user_id = top3[1];
  select state into orig2 from game_saves where user_id = top3[2];
  update game_saves set state = jsonb_set(state, '{story}', '{"ch":9}'::jsonb) where user_id = top3[1];
  update game_saves set state = jsonb_set(state, '{story}', '{"ch":"abc"}'::jsonb) where user_id = top3[2];
  t1 := public.neighbors_today();
  select e->>'title' into tt1 from jsonb_array_elements(t1->'list') e where e->>'public_id' = pid1::text;
  select e->>'title' into tt2 from jsonb_array_elements(t1->'list') e where e->>'public_id' = pid2::text;
  if tt1 is distinct from 'keeper' then raise exception 'FAIL title: 9장 이웃은 keeper 여야 한다 (%)', tt1; end if;
  if tt2 is not null then raise exception 'FAIL title: 숫자가 아닌 ch 는 null 이어야 한다 (%)', tt2; end if;
  update game_saves set state = orig1 where user_id = top3[1];
  update game_saves set state = orig2 where user_id = top3[2];
  t1 := public.neighbors_today();
  if exists (select 1 from jsonb_array_elements(t1->'list') e where e->>'title' is not null) then
    raise exception 'FAIL title: 9장 미만 이웃에 title 이 있다'; end if;
```

If `top3` is not a `uuid[]` at that point, read the surrounding lines and use the variable that holds the first three candidates' user ids.

- [ ] **Step 2: Write the migration from the production body**

`sql/migrations/migrate_tree_finale_title.sql`. The body is the production body (read 2026-11-20) plus one `'title'` pair. The Korean comment inside the body is dropped (no new comments rule):

```sql
create or replace function public.neighbors_today()
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_day  date := _nb_kst_today();
  v_list jsonb;
  v_rew  int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'auth'); end if;
  insert into village_profiles (user_id) select c.uid from _nb_candidates(v_uid, v_day, 3) c
  on conflict (user_id) do nothing;
  select coalesce(jsonb_agg(jsonb_build_object(
           'public_id', vp.public_id,
           'nick', _nb_nick(gs.state, c.uid),
           'character', case when jsonb_typeof(gs.state->'character') = 'string' then left(gs.state->>'character', 16) end,
           'house_stage', (gs.state->>'houseStage')::numeric::int,
           'decor_n', jsonb_array_length(_nb_yard(gs.state)),
           'visited_today', vv.emoji is not null,
           'reacted_emoji', vv.emoji,
           'title', case when jsonb_typeof(gs.state->'story'->'ch') = 'number'
                          and (gs.state->'story'->>'ch')::numeric >= 9 then 'keeper' end
         ) order by c.k), '[]'::jsonb)
    into v_list
  from _nb_candidates(v_uid, v_day, 3) c
  join game_saves gs on gs.user_id = c.uid
  join village_profiles vp on vp.user_id = c.uid
  left join village_visits vv on vv.visitor = v_uid and vv.host = c.uid and vv.day = v_day;
  select count(*) into v_rew from village_visits where visitor = v_uid and day = v_day and rewarded;
  return jsonb_build_object('ok', true, 'list', v_list, 'rewarded_today', v_rew);
end $$;
```

The client stores `story.ch` as a number. Task 1 also accepts `'9'` client-side, but the server is stricter on purpose: only a JSON number counts.

- [ ] **Step 3: Dry-run against production inside a rolled-back transaction**

Use the pg8000 pooler pattern from `scratchpad/fndefs.py`: `.env` `SUPABASE_DB_PASSWORD`, pooler `aws-1-ap-northeast-2.pooler.supabase.com:5432`. In one transaction:
1. run the migration file;
2. run the whole selftest DO block;
3. `rollback`.

Expected: NOTICE `NEIGHBORS SELFTEST ALL PASS`, then rollback. Nothing remains in production.
Confirm after the run:
- `select count(*) from auth.users where email like 'nb-selftest-%'` returns 0.
- `pg_get_functiondef` of `neighbors_today` is still the old body (no `'title'`).

- [ ] **Step 4: Do NOT apply to production.** Production apply is a separate step that needs the user's explicit instruction (spec §11). Record "dry-run passed, not applied" in `dev/active/tree-finale/tree-finale-tasks.md`.

- [ ] **Step 5: Commit**

```bash
git add sql/migrations/migrate_tree_finale_title.sql sql/tests/neighbors_selftest.sql
git commit -m "feat(tree-finale): neighbors_today returns keeper title"
```

---

### Task 5: Runtime ending (tree-finale.js + world-tree hooks)

**Files:**
- Create: `js/spaces/tree-finale.js`
- Modify: `js/spaces/world-tree.js`. Changes go in `buildWorldTree` (line 50), `updateWorldTree` (line 82), `worldTreeNear` (line 99), `treeShotBusy` (line 449), `treeShotFogPush` (line 455) and `shotReady` (line 462).
- Test: `tests/finale-wiring.test.mjs` (source-level wiring checks; behavior is verified in Task 8)

**Interfaces:**
- Consumes:
  - `finaleDue`, `finaleVia`, `markFinaleSeen`, `hasKeeperTitle` (Task 1)
  - `createFinaleRig`, `rootPoints` (Task 2)
  - `buildFinaleArt` (Task 3)
  - from `../game.js`: `Input, camera, defaultCamPose, gameState, isNight, npcObjs, requestSave, scene, setCameraRig, syncStory, todayStr`
  - `setNpcGlyphsHidden` from `./npc.js`
  - `trackEvent` from `../analytics.js`
  - `Sound` from `../sound.js`
  - `t as tr` from `../i18n.js`
  - `NEIGHBOR_GATE` from `../data/places.js`
- Produces:
  - `initFinale(three, box, treePos)`: called once from `buildWorldTree`
  - `updateFinale(dt, ready)`: called each frame from `updateWorldTree`. `ready` = `!shot && !shotQueue.length && shotReady()`.
  - `finaleBusy() → boolean`
  - `finaleFogPush() → number`
  - `replayFinale()`

- [ ] **Step 1: Write the failing wiring test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

test('world-tree 가 엔딩을 만들고, 매 프레임 돌리고, 바쁨·안개·안내에 반영한다', () => {
  const w = read('js/spaces/world-tree.js');
  assert.match(w, /from '\.\/tree-finale\.js'/);
  assert.match(w, /initFinale\(/);
  assert.match(w, /updateFinale\(/);
  assert.match(w, /finaleBusy\(\)/);
  assert.match(w, /finaleFogPush\(\)/);
});

test('엔딩 런타임은 GA4 tree_finale 파라미터 3개만 보낸다', () => {
  const f = read('js/spaces/tree-finale.js');
  const m = f.match(/trackEvent\('tree_finale', \{([^}]*)\}/);
  assert.ok(m, 'tree_finale event missing');
  const keys = m[1].split(',').map(s => s.split(':')[0].trim()).filter(Boolean);
  assert.deepEqual(keys.sort(), ['sec', 'skipped', 'via']);
});

test('본 기록은 hintsSeen 에만 남긴다', () => {
  const f = read('js/spaces/tree-finale.js');
  assert.match(f, /markFinaleSeen\(/);
  assert.doesNotMatch(f, /gameState\.(treeFinale|finale)\s*=/);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/finale-wiring.test.mjs`
Expected: FAIL (file missing / no matches).

- [ ] **Step 3: Write `js/spaces/tree-finale.js`**

```js
import {
  Input, camera, defaultCamPose, gameState, isNight, npcObjs, requestSave, scene, setCameraRig, syncStory, todayStr,
} from '../game.js';
import { trackEvent } from '../analytics.js';
import { Sound } from '../sound.js';
import { t as tr } from '../i18n.js';
import { NEIGHBOR_GATE } from '../data/places.js';
import { setNpcGlyphsHidden } from './npc.js';
import { finaleDue, finaleVia, hasKeeperTitle, markFinaleSeen } from '../world/finale-rules.js';
import { createFinaleRig, rootPoints } from '../world/finale-rig.js';
import { buildFinaleArt } from '../world/finale-art.js';

const BAR = 'clamp(48px,9vh,90px)';
let T = null, art = null, pts = null, tree = null, run = null, chAtBoot = null, overlay = null, onKey = null;
let shownBloom = -1, shownNight = null;

export function initFinale(three, box, treePos) {
  if (art) return;
  T = three;
  tree = { x: treePos.x, z: treePos.z };
  pts = rootPoints(tree, { x: NEIGHBOR_GATE.x, z: NEIGHBOR_GATE.z });
  art = buildFinaleArt(three, { box, pts });
  art.group.visible = false;
  scene.add(art.group);
}

export const finaleBusy = () => !!run;

export function finaleFogPush() {
  if (!run) return 0;
  const c = run.rig.cur;
  return Math.max(0, Math.hypot(c.pos.x - c.look.x, c.pos.y - c.look.y, c.pos.z - c.look.z) - 21);
}

export function replayFinale() { start(true); }

function show(bloom, reveal, dt) {
  if (bloom !== shownBloom) { art.setBloom(bloom); shownBloom = bloom; }
  art.setReveal(reveal);
  const night = isNight();
  if (night !== shownNight) { art.setNight(night); shownNight = night; }
  art.update(dt);
}

export function updateFinale(dt, ready) {
  if (!art) return;
  if (chAtBoot == null) chAtBoot = Number(gameState.story?.ch) || 0;
  if (run) { step(dt); return; }
  const keeper = hasKeeperTitle(gameState);
  art.group.visible = keeper;
  if (keeper) show(1, 1, dt);
  if (ready && finaleDue(gameState)) start(false);
}

function staging() {
  const list = npcObjs.filter(o => o.group && !o.hidden && o.def.id !== 'merchant');
  return list.map((o, i) => {
    const k = 0.1 + (i / Math.max(1, list.length)) * 0.75;
    const a = pts[Math.min(pts.length - 1, Math.round(k * (pts.length - 1)))];
    const side = i % 2 ? 1.8 : -1.8;
    return { o, x: a.x + side, z: a.z, face: Math.atan2(-side, 0), save: { p: o.group.position.clone(), r: o.group.rotation.y } };
  });
}

function start(replay) {
  const via = finaleVia(chAtBoot, gameState, replay);
  if (!replay) { gameState.hintsSeen = markFinaleSeen(gameState.hintsSeen, todayStr()); requestSave(); }
  const fwd = new T.Vector3();
  camera.getWorldDirection(fwd);
  const p0 = camera.position;
  const from = { pos: { x: p0.x, y: p0.y, z: p0.z }, look: { x: p0.x + fwd.x * 20, y: p0.y + fwd.y * 20, z: p0.z + fwd.z * 20 } };
  const rig = createFinaleRig({ from, pts, tree, aspect: camera.aspect, home: defaultCamPose });
  run = { rig, via, skipped: false, t0: performance.now(), cast: staging() };
  art.group.visible = true;
  shownBloom = -1;
  show(0, 0, 0);
  Input.setAnalog?.(0, 0);
  setNpcGlyphsHidden(true);
  setCameraRig((cam) => {
    if (!run) return;
    for (const c of run.cast) {
      c.o.group.position.set(c.x, 0, c.z); c.o.group.rotation.y = c.face;
      c.o.group.traverse(ch => { if (ch.isSprite) ch.visible = false; });
    }
    const p = run.rig.cur;
    cam.position.set(p.pos.x, p.pos.y, p.pos.z);
    cam.lookAt(p.look.x, p.look.y, p.look.z);
  });
  showOverlay();
  Sound.cineWhoosh?.();
}

function step(dt) {
  const before = run.rig.phase;
  const ph = run.rig.update(Math.min(dt, 0.05));
  show(run.rig.bloom, run.rig.reveal, dt);
  overlay.querySelector('#fin-cap').style.opacity = run.rig.caption ? '1' : '0';
  if (ph === 'card' && before !== 'card') { overlay.querySelector('#fin-card').style.display = 'block'; Sound.complete?.(); }
  if (ph === 'done') end();
}

function skip() {
  if (!run) return;
  if (run.rig.phase === 'card') { run.rig.close(); overlay.querySelector('#fin-card').style.display = 'none'; return; }
  if (run.rig.phase === 'out') return;
  run.skipped = true;
  run.rig.skip();
}

function end() {
  const { via, skipped, t0, cast } = run;
  run = null;
  for (const c of cast) { c.o.group.position.copy(c.save.p); c.o.group.rotation.y = c.save.r; }
  setCameraRig(null);
  setNpcGlyphsHidden(false);
  hideOverlay();
  trackEvent('tree_finale', { skipped: skipped ? 1 : 0, sec: Math.round((performance.now() - t0) / 1000), via });
  syncStory();
}

function showOverlay() {
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'finale-modal';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:60;cursor:pointer;-webkit-tap-highlight-color:transparent;';
    overlay.innerHTML = `<div style="position:absolute;left:0;right:0;top:0;height:${BAR};background:#0d0f0e"></div>`
      + `<div style="position:absolute;left:0;right:0;bottom:0;height:${BAR};background:#0d0f0e"></div>`
      + `<div id="fin-cap" style="position:absolute;left:0;right:0;bottom:calc(${BAR} + 18px);text-align:center;color:#fff;font-size:clamp(15px,2vw,22px);font-weight:700;padding:0 20px;text-shadow:0 2px 12px rgba(0,0,0,.6);opacity:0;transition:opacity .6s ease"></div>`
      + '<div id="fin-card" style="display:none;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(255,253,246,.96);border-radius:18px;padding:18px 26px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.25);width:min(86vw,360px)">'
      + '<div style="font-size:30px">🌸</div><div id="fin-title" style="font-size:clamp(16px,2.2vw,20px);font-weight:800;color:#2c3e4a;margin:6px 0 4px"></div>'
      + '<div id="fin-body" style="font-size:14px;color:#6b7b86;line-height:1.5"></div></div>';
    overlay.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); skip(); });
    document.body.appendChild(overlay);
  }
  overlay.querySelector('#fin-cap').textContent = tr('이웃들이 오간 길마다 뿌리가 이어졌어요');
  overlay.querySelector('#fin-title').textContent = tr('세계수가 다시 숨을 쉬어요');
  overlay.querySelector('#fin-body').replaceChildren(tr('칭호 「세계수지기」를 받았어요'), document.createElement('br'), tr('빛나는 뿌리 길이 이웃 마을까지 이어져요'));
  overlay.querySelector('#fin-card').style.display = 'none';
  overlay.style.display = 'block';
  document.body.classList.add('cine-open');
  onKey = (e) => { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) skip(); };
  window.addEventListener('keydown', onKey, true);
}

function hideOverlay() {
  if (overlay) overlay.style.display = 'none';
  document.body.classList.remove('cine-open');
  if (onKey) window.removeEventListener('keydown', onKey, true);
  onKey = null;
}
```

Implementation notes:
- Verify that every name imported from `../game.js` is in its `export { … }` block (line 8856). `syncStory` is imported by `world-tree.js` already, so it is exported. `isNight`, `npcObjs`, `todayStr` and `defaultCamPose` were confirmed on 2026-11-20.
- NPC position writes happen inside the camera rig callback every frame, so NPC wandering cannot drift them during the ending. Task 8 must confirm visually that no NPC jitters. If one does, also skip that NPC's own update while `finaleBusy()`: find the NPC update loop in `game.js` and add one guard.

- [ ] **Step 4: Wire into `js/spaces/world-tree.js`**

Add the import next to the other world imports:

```js
import { finaleBusy, finaleFogPush, initFinale, updateFinale } from './tree-finale.js';
```

In `buildWorldTree`, after `wt = { ... }`:

```js
  initFinale(THREE, wt.box, WORLD_TREE);
```

In `updateWorldTree`, right after `updateTreeShot(t);`:

```js
  updateFinale(dt, !shot && !shotQueue.length && shotReady());
```

In `worldTreeNear`, add `&& !finaleBusy()`:

```js
export function worldTreeNear(p) { return !!wt && !shot && !finaleBusy() && dist2D(WORLD_TREE, p) < PROMPT_R; }
```

In `treeShotBusy`, first line:

```js
  if (shot || finaleBusy()) return true;
```

In `treeShotFogPush`, first line:

```js
  if (finaleBusy()) return finaleFogPush();
```

In `shotReady`, add `&& !finaleBusy()` so a chapter/region shot never starts during the ending.

Notes:
- `wt.box` is `{cx,cy,cz,hx,hy,hz}`, the shape `buildFinaleArt` expects.
- `game.js` `afterModals` already waits on `treeShotBusy()`, so story modals queue behind the ending with no `game.js` change.
- `shotReady()` includes `!ui.anyModalOpen?.()` and `inVillage2()`. The live case therefore starts only after the "9장 완료" modal closes, and the boot case only once the player is in the village.

- [ ] **Step 5: Run tests**

Run: `node --test tests/finale-wiring.test.mjs tests/finale-rules.test.mjs tests/finale-rig.test.mjs tests/finale-art.test.mjs tests/world-tree-art.test.mjs tests/tree-shot.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add js/spaces/tree-finale.js js/spaces/world-tree.js tests/finale-wiring.test.mjs
git commit -m "feat(tree-finale): play the root path ending and keep the blossoms"
```

---

### Task 6: Title UI (story chip, tree board band, neighbor badge)

**Files:**
- Modify: `js/story/rules.js:84-96` (`buildStoryView`)
- Modify: `index.html:5304-5316` (`setStory`)
- Modify: `js/world/tree-board-ui.js:55-60` (`renderTreeBoard`)
- Modify: `js/spaces/world-tree.js` (the board view builder used by `openWorldTree` / `renderTreeBoard`; find where the `view` object with `life`, `branches`, `cur` is assembled, around lines 212-340)
- Modify: `js/neighbors/rules.js:37-42` (`pickerRows`), `js/neighbors/ui.js:128-132` (`pickerRow`)
- Test: extend `tests/finale-rules.test.mjs`, plus `tests/finale-wiring.test.mjs`

**Interfaces:**
- Consumes: `hasKeeperTitle`, `showTeaser`, `isKeeperRow` (Task 1); `replayFinale` (Task 5).
- Produces:
  - story view gains `keeper: boolean`
  - board view gains `finale: { keeper: boolean, teaser: boolean }` and the `actions.replay` callback
  - picker rows gain `keeper: boolean`

- [ ] **Step 1: Write failing tests**

Append to `tests/finale-rules.test.mjs`. Put the extra imports at the top of the file with the others:

```js
import { buildStoryView } from '../js/story/rules.js';
import { STORY } from '../js/story/chapters.js';
import { pickerRows } from '../js/neighbors/rules.js';

test('이야기 뷰: 9장을 끝내면 keeper', () => {
  assert.equal(buildStoryView(STORY, { story: { ch: 9 } }).keeper, true);
  assert.equal(buildStoryView(STORY, { story: { ch: 4 } }).keeper, false);
});

test('이웃 행: 서버 title 이 keeper 면 배지', () => {
  const rows = pickerRows([{ public_id: 'a', nick: 'x', title: 'keeper' }, { public_id: 'b', nick: 'y', title: null }], () => '🐻');
  assert.deepEqual(rows.map(r => r.keeper), [true, false]);
});
```

Append to `tests/finale-wiring.test.mjs`:

```js
test('칭호가 칩·세계수 판·이웃 목록에 붙는다', () => {
  const html = read('index.html');
  assert.match(html, /v\.keeper/);
  assert.match(html, /세계수지기/);
  const board = read('js/world/tree-board-ui.js');
  assert.match(board, /tb-title-row/);
  assert.match(board, /엔딩 다시 보기/);
  assert.match(board, /모든 이야기를 마치면 세계수에 꽃이 피어요/);
  assert.match(read('js/neighbors/ui.js'), /r\.keeper/);
});
```

- [ ] **Step 2: Run to verify failures**

Run: `node --test tests/finale-rules.test.mjs tests/finale-wiring.test.mjs`
Expected: the 3 new tests FAIL. If `buildStoryView` needs more state fields than `{ story }` to run (e.g. `chapterProgress` reads other keys), give the minimal state the existing `tests/story*.test.mjs` uses.

- [ ] **Step 3: Implement**

`js/story/rules.js`: add the import at the top (keep the module free of three) and add `keeper` to the returned object:

```js
import { hasKeeperTitle } from '../world/finale-rules.js';
```

```js
    keeper: hasKeeperTitle(s),
```

`index.html` `setStory(v)`: replace the early-return line so keepers get the title chip instead of hiding:

```js
        if (v?.allDone && v.keeper) {
          document.body.classList.add('story-on');
          requestAnimationFrame(layoutQuestPanel);
          $('sc-ico').textContent = '🌸';
          $('sc-title').textContent = t('세계수지기');
          $('sc-goal').textContent = t('모든 이야기를 마쳤어요');
          chip.classList.add('show');
          return;
        }
        if (!v || v.allDone) { chip.classList.remove('show'); document.body.classList.remove('story-on'); $('quest-panel').style.top = ''; return; }
```

Use whatever translate function name `index.html` already uses near line 5304 (search that script block for how it calls i18n). Do not add a new import if one exists. If the chip text is translated by the i18n observer instead, assign the Korean text directly.

`js/world/tree-board-ui.js` `renderTreeBoard(view)`: before `const tabs = $('tb-tabs'); tabs.innerHTML = '';`:

```js
  $('tb-title-row')?.remove();
  if (view.finale?.keeper || view.finale?.teaser) {
    const row = el('div', 'tb-title-row');
    row.id = 'tb-title-row';
    if (view.finale.keeper) {
      row.append(el('span', 'tb-title-txt', `🌸 ${tr('세계수지기')} · ${tr('모든 이야기를 마쳤어요')}`));
      const b = el('button', 'tb-title-btn', tr('🎬 엔딩 다시 보기'));
      b.type = 'button';
      b.addEventListener('click', () => actions?.replay?.());
      row.append(b);
    } else row.append(el('span', 'tb-title-txt', tr('모든 이야기를 마치면 세계수에 꽃이 피어요')));
    $('tb-tabs').before(row);
  }
```

If `tree-board-ui.js` has no `tr` import, add `import { t as tr } from '../i18n.js';`. Add CSS where the tree board styles live (search `#tb-tabs` in `index.html`), taken from the approved mockup:

```css
.tb-title-row { display:flex; align-items:center; justify-content:space-between; gap:8px; margin:8px 0 2px; padding:8px 10px; border-radius:10px; background:#ffeef5; font-size:13px; font-weight:700; color:#8a3d5c; }
.tb-title-btn { font:inherit; font-size:12px; border:0; border-radius:8px; padding:5px 9px; background:#fff; color:#8a3d5c; flex:0 0 auto; }
```

`js/spaces/world-tree.js`, where the board view is built: add

```js
    finale: { keeper: hasKeeperTitle(gameState), teaser: showTeaser(gameState) },
```

In the `acts` object passed to `openTreeBoard`, add:

```js
    replay: () => { closeTreeBoard(); replayFinale(); },
```

Import `hasKeeperTitle, showTeaser` from `../world/finale-rules.js` and add `replayFinale` to the Task 5 import from `./tree-finale.js`.

`js/neighbors/rules.js` `pickerRows`: add `keeper: isKeeperRow(r),` to each row object, and import `isKeeperRow` from `../world/finale-rules.js`.

`js/neighbors/ui.js` `pickerRow`: after the `❤️ 다녀옴` badge line:

```js
  if (r.keeper) name.appendChild(el('span', 'nb-badge nb-keeper', '🌸 세계수지기'));
```

Add CSS next to `.nb-badge` (line 36): `.nb-keeper { background: #ffe0ec; }`. The label goes through the same translation path as `'❤️ 다녀옴'` in that module.

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: all pass (baseline 6319 plus the new tests, 0 fail).

- [ ] **Step 5: Commit**

```bash
git add js/story/rules.js index.html js/world/tree-board-ui.js js/spaces/world-tree.js js/neighbors/rules.js js/neighbors/ui.js tests/finale-rules.test.mjs tests/finale-wiring.test.mjs
git commit -m "feat(tree-finale): show the Tree Keeper title on chip, board and neighbor list"
```

---

### Task 7: English copy

**Files:**
- Modify: `js/i18n-en.js` (append before the closing `};`)
- Test: `tests/finale-i18n.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', userAgent: 'node' }; } catch {}
const { t, setLang } = await import('../js/i18n.js');
setLang('en');

const KO = [
  '이웃들이 오간 길마다 뿌리가 이어졌어요', '세계수가 다시 숨을 쉬어요', '칭호 「세계수지기」를 받았어요',
  '빛나는 뿌리 길이 이웃 마을까지 이어져요', '세계수지기', '모든 이야기를 마쳤어요', '🎬 엔딩 다시 보기',
  '모든 이야기를 마치면 세계수에 꽃이 피어요', '🌸 세계수지기',
];

test('엔딩 문구는 모두 영어로 바뀐다', () => {
  for (const s of KO) assert.doesNotMatch(t(s), /[가-힣]/, s);
});

test('문구에 엠대시가 없다', () => {
  for (const s of KO) { assert.doesNotMatch(s, /—/); assert.doesNotMatch(t(s), /—/); }
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/finale-i18n.test.mjs`
Expected: FAIL on the first string.

- [ ] **Step 3: Add entries to `js/i18n-en.js`**

```js
  '이웃들이 오간 길마다 뿌리가 이어졌어요': 'Roots grew along every path your neighbors walked',
  '세계수가 다시 숨을 쉬어요': 'The World Tree breathes again',
  '칭호 「세계수지기」를 받았어요': 'You earned the title "Tree Keeper"',
  '빛나는 뿌리 길이 이웃 마을까지 이어져요': 'A glowing root path now leads to the neighbor village',
  '세계수지기': 'Tree Keeper',
  '모든 이야기를 마쳤어요': 'You finished every chapter',
  '🎬 엔딩 다시 보기': '🎬 Watch the ending again',
  '모든 이야기를 마치면 세계수에 꽃이 피어요': 'Finish every chapter and the World Tree will bloom',
  '🌸 세계수지기': '🌸 Tree Keeper',
```

If a key already exists, keep the existing entry. Do not add a duplicate key.

- [ ] **Step 4: Run tests**

Run: `node --test tests/finale-i18n.test.mjs && npm test`
Expected: PASS, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add js/i18n-en.js tests/finale-i18n.test.mjs
git commit -m "feat(tree-finale): English copy for the ending and title"
```

---

### Task 8: Browser verification, draw calls, review

**Files:**
- Create: `dev/active/tree-finale/verify/finale-verify.mjs` (based on `dev/active/tree-finale/verify/harness.mjs`, which exposes `open(dev, port)` → `{ ev, until, enterGame, b, close }`)
- Output: `dev/active/tree-finale/shots/v-*.png`

- [ ] **Step 1: Write the harness script**

```js
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { open } from './harness.mjs';

const OUT = path.resolve(import.meta.dirname, '../shots');
mkdirSync(OUT, { recursive: true });
const dev = process.argv[2] || 'pc';
const h = await open(dev, 9700 + Math.floor(Math.random() * 90));
await h.enterGame('bear');
await h.ev(`(() => { window.__errs = []; addEventListener('error', e => __errs.push(String(e.message))); return 1; })()`);
const shot = async (name) => { await h.b.shot(path.join(OUT, `v-${dev}-${name}.png`)); };
const tap = () => h.ev(`document.getElementById('finale-modal').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); 1`);
const busy = `(async () => (await import('/js/spaces/tree-finale.js')).finaleBusy())()`;

await h.ev(`(async () => { const g = await import('/js/game.js'); g.gameState.story.ch = 9; delete g.gameState.hintsSeen.treeFinale; return 1; })()`);
await h.until(busy, 15000);
await h.b.sleep(800); await shot('1-fly');
await h.b.sleep(3500); await shot('2-root');
await h.b.sleep(4500); await shot('3-bloom');
await h.b.sleep(2500); await shot('4-card');
await tap();
await h.until(`(async () => !(await import('/js/spaces/tree-finale.js')).finaleBusy())()`, 5000);
await h.b.sleep(800); await shot('5-after');

await h.ev(`(async () => { (await import('/js/spaces/world-tree.js')).openWorldTree(); return 1; })()`);
await h.b.sleep(800); await shot('6-board');
await h.ev(`document.querySelector('.tb-title-btn').click(); 1`);
await h.until(busy, 5000);
await h.b.sleep(1500);
await tap();
await h.b.sleep(400); await shot('7-skip-card');
await tap();
await h.b.sleep(1500);

const seen = await h.ev(`(async () => (await import('/js/game.js')).gameState.hintsSeen.treeFinale)()`);
const jsErrs = await h.ev('window.__errs');
console.log(JSON.stringify({ seen, jsErrs }));
await h.close();
process.exit(0);
```

Draw-call check: measure `renderer.info.render.calls` near the tree with `story.ch = 8` and then `story.ch = 9`, the way `memory/draw-call-optimization.md` describes (same camera pose, same frame count). Do not add a `game.js` export just for this.

- [ ] **Step 2: Run on PC and phone (background, ≈3 min each)**

Run: `node dev/active/tree-finale/verify/finale-verify.mjs pc` and `node dev/active/tree-finale/verify/finale-verify.mjs phone`, each with `run_in_background`.
Expected:
- `seen` is today's date.
- `jsErrs` is `[]`.
- Draw-call difference ≤ 4.
- 7 PNGs per device.

- [ ] **Step 3: Look at every PNG**

Check each item:
- Name tags and "!" are hidden during the ending.
- The caption is visible only in the root phase.
- The card is readable on phone.
- Blossoms and root path are visible after the ending.
- The board band shows the title and the replay button without squeezing the header.
- No NPC is left standing on the path after it ends.

Fix and re-run until all hold. Also take one night shot via the dev hook `night` (`game.js:2889`) and confirm the root halo is brighter.

- [ ] **Step 4: Full test suite and code review**

Run: `npm test`. Expected: 0 fail.
Dispatch the `code-reviewer` agent on `git diff main...HEAD`. Fix CRITICAL and HIGH findings, then re-run `npm test`.

- [ ] **Step 5: Commit verification assets and dev docs**

```bash
git add dev/active/tree-finale/verify/finale-verify.mjs dev/active/tree-finale/tree-finale-tasks.md dev/active/tree-finale/tree-finale-context.md
git commit -m "test(tree-finale): browser verification harness and results"
```

Do not push. Production SQL (Task 4) and deploy to the five places wait for the user's instruction.
