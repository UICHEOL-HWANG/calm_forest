import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { register } from 'node:module';

const threeUrl = new URL('../vendor/three/three.module.js', import.meta.url).href;
register(`data:text/javascript,export const resolve = (s, c, n) => s === 'three' ? { url: '${threeUrl}', shortCircuit: true } : n(s, c);`);

const P = await import('../js/data/places.js');
const { ISLE, ISLE_R, STREAM_HALF, BANK_W } = await import('../js/world/bridge.js');
const { AUCTION_STAGE } = await import('../js/data/auction.js');
const { walkLimit } = await import('../js/world/walk-bounds.js');
const { MAP_VIEW, LAND_FRINGE, WOBBLE_MAX, COVE_SAND, SCENERY, sceneryReach, mapLand, mapWater, mapGrove } = await import('../js/world/village-map.js');

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const WORLD_TREE = (() => {
  const m = /WORLD_TREE = new THREE\.Vector3\((-?[\d.]+), 0, (-?[\d.]+)\)/.exec(read('js/spaces/world-tree.js'));
  return { x: +m[1], z: +m[2] };
})();
const LANDMARKS = {
  SEA_GATE: P.SEA_GATE, DOCK_GATE: P.DOCK_GATE, MUSEUM_GATE: P.MUSEUM_GATE, ORCHARD_GATE: P.ORCHARD_GATE,
  LIGHT_WORKSHOP: P.LIGHT_WORKSHOP, MOUNTAIN_GATE: P.MOUNTAIN_GATE, WORLD_TREE, AUCTION_STAGE,
};

const inPoly = (pts, x, z) => {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
};
const inView = (x, z) => x >= MAP_VIEW.x0 && x <= MAP_VIEW.x0 + MAP_VIEW.w && z >= MAP_VIEW.z0 && z <= MAP_VIEW.z0 + MAP_VIEW.h;

test('the beach fringe and wobble bounds match the plan', () => {
  assert.equal(LAND_FRINGE, 2.2);
  assert.ok(WOBBLE_MAX <= 1.5);
  assert.equal(COVE_SAND, 1.1);
  assert.match(read('js/spaces/sea.js'), /CircleGeometry\(SEA_COVE\.r \+ 1\.1,/);
});

test('the land outline never cuts into the walk limit and hugs it away from the scenery', () => {
  const pts = mapLand();
  assert.ok(pts.length >= 120);
  for (const [x, z] of pts) {
    const t = Math.atan2(z, x), r = Math.hypot(x, z), lim = walkLimit(t);
    assert.ok(r >= lim - 1e-9, `${x.toFixed(2)},${z.toFixed(2)} inside the walk limit`);
    const base = Math.max(lim, sceneryReach(t));
    assert.ok(r - base <= WOBBLE_MAX + 1e-9, `${x.toFixed(2)},${z.toFixed(2)} too far out`);
  }
});

test('the scenery beyond the walk limit comes from the world constants', () => {
  const s = Object.fromEntries(SCENERY.map(o => [o.id, o]));
  assert.deepEqual([s.mountain.x, s.mountain.z, s.mountain.r], [P.MOUNTAIN_LANDMARK.x, P.MOUNTAIN_LANDMARK.z, P.MOUNTAIN_LANDMARK_R]);
  assert.deepEqual([s.tree.x, s.tree.z], [WORLD_TREE.x, WORLD_TREE.z]);
  assert.ok(s.tree.r >= 8);
  for (const o of SCENERY) assert.ok(Math.hypot(o.x, o.z) + o.r > walkLimit(Math.atan2(o.z, o.x)), `${o.id} pokes past the walk limit`);
});

test('the mountain and the world tree canopy sit inside the land outline', () => {
  const land = mapLand();
  for (const o of SCENERY) {
    assert.ok(inPoly(land, o.x, o.z), `${o.id} centre`);
    for (let i = 0; i < 72; i++) {
      const a = i / 72 * Math.PI * 2;
      assert.ok(inPoly(land, o.x + Math.cos(a) * o.r, o.z + Math.sin(a) * o.r), `${o.id} edge ${i}`);
    }
  }
});

test('the outline is continuous where the scenery meets the walk limit', () => {
  const pts = mapLand();
  for (let i = 0; i < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length];
    assert.ok(Math.abs(Math.hypot(ax, az) - Math.hypot(bx, bz)) < 1.6, `step at ${i}`);
  }
});

test('the wobble is deterministic and the fringe grows the outline outward', () => {
  assert.deepEqual(mapLand(), mapLand());
  const a = mapLand(), b = mapLand(LAND_FRINGE);
  assert.equal(a.length, b.length);
  a.forEach(([x, z], i) => assert.ok(Math.abs(Math.hypot(...b[i]) - Math.hypot(x, z) - LAND_FRINGE) < 1e-9));
  const wob = a.map(([x, z]) => Math.hypot(x, z) - walkLimit(Math.atan2(z, x))).filter((_, i) => sceneryReach(Math.atan2(a[i][1], a[i][0])) === 0);
  assert.ok(Math.max(...wob) - Math.min(...wob) > 0.5, 'the edge is hand-drawn, not a perfect circle');
});

test('MAP_VIEW is square and holds the whole fringe outline', () => {
  assert.equal(MAP_VIEW.w, MAP_VIEW.h);
  for (const [x, z] of mapLand(LAND_FRINGE)) assert.ok(inView(x, z), `${x.toFixed(2)},${z.toFixed(2)}`);
  assert.ok(MAP_VIEW.w < 100, 'not padded far beyond the land');
  for (const o of SCENERY) assert.ok(inView(o.x, o.z - o.r), `${o.id} north edge in view`);
});

test('every map water matches the 3D water constants', () => {
  const w = Object.fromEntries(mapWater().map(o => [o.id, o]));
  assert.deepEqual(Object.keys(w).sort(), ['cove', 'lake', 'moat', 'pond']);
  assert.deepEqual([w.lake.x, w.lake.z, w.lake.r], [P.LAKE.x, P.LAKE.z, P.LAKE_R]);
  assert.deepEqual([w.pond.x, w.pond.z, w.pond.r], [P.DOCK_POND.x, P.DOCK_POND.z, P.DOCK_POND_R]);
  assert.deepEqual([w.cove.x, w.cove.z, w.cove.r, w.cove.sand], [P.SEA_COVE.x, P.SEA_COVE.z, P.SEA_COVE.r, P.SEA_COVE.r + COVE_SAND]);
  assert.deepEqual([w.moat.x, w.moat.z, w.moat.r, w.moat.half, w.moat.bank], [ISLE.x, ISLE.z, ISLE_R, STREAM_HALF, BANK_W]);
  assert.equal(w.moat.ring, true);
  for (const id of ['lake', 'pond', 'cove']) assert.ok(!w[id].ring, id);
});

test('the groves come from the forage forest and the firefly glade', () => {
  const g = mapGrove();
  assert.deepEqual(g.map(o => [o.x, o.z, o.r]), [[P.FOREST.x, P.FOREST.z, P.FOREST_R], [P.GLADE.x, P.GLADE.z, P.GLADE_R]]);
});

test('every landmark sits on land inside the map view', () => {
  const land = mapLand();
  for (const [name, p] of Object.entries(LANDMARKS)) {
    assert.ok(inView(p.x, p.z), `${name} in view`);
    assert.ok(inPoly(land, p.x, p.z), `${name} on land`);
  }
});

test('the moved sea cove sits inside the land, as in the 3D world', () => {
  const land = mapLand();
  const c = P.SEA_COVE;
  for (let i = 0; i < 64; i++) {
    const a = i / 64 * Math.PI * 2;
    assert.ok(inPoly(land, c.x + Math.cos(a) * (c.r + 0.5), c.z + Math.sin(a) * (c.r + 0.5)), `cove edge ${i}`);
  }
});

test('index.html paints both maps from the shared village map module', () => {
  const html = read('index.html');
  assert.equal((html.match(/<script type="module"/g) || []).length, 3);
  assert.match(html, /import \{ MAP_VIEW, LAND_FRINGE, mapLand, mapWater, mapGrove \} from '\.\/js\/world\/village-map\.js';/);
  assert.ok(html.indexOf("from './js/world/village-map.js'") > html.indexOf("from './js/data/places.js'"));
  for (const gone of ['WM_LAND', 'WM_WATER', 'WM_GROVE', 'const MAP_VIEW =']) assert.ok(!html.includes(gone), gone);
  assert.equal((html.match(/paintIsland\(/g) || []).length, 3);
  assert.match(html, /paintIsland\(c, px, pr, S, SH\)/);
  assert.match(html, /paintIsland\(c, \(x, z\) => \[\(x - MAP_VIEW\.x0\) \* k, \(z - MAP_VIEW\.z0\) \* k\], \(r\) => r \* k, size, size\)/);
});

test('the world map frame is square like MAP_VIEW', () => {
  const html = read('index.html');
  assert.ok(!html.includes('76 / 80'));
  assert.match(html, /#wm-canvas-wrap \{ position: relative; width: max\(240px, min\(100%, calc\(100dvh - 260px\)\)\); aspect-ratio: 1 \/ 1;/);
  assert.match(html, /#wm-canvas-wrap \{ width: max\(180px, min\(100%, calc\(100dvh - 150px\)\)\); margin-top: 4px; \}/);
});
