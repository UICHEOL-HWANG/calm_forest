import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNav } from '../js/guide/path.js';
import { SOLIDS, QUESTS, ISLAND, WALK_R, PIER_END } from '../js/port/data.js';
import { islandWalkable, PIER_WALK } from '../js/port/nav.js';

const PLAYER_R = 0.35, STEP = 0.12;
const solids = SOLIDS.map(([c, r]) => [{ x: c.x, z: c.z }, r]);

function push(p) {
  for (const [c, r] of solids) {
    const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), m = r + PLAYER_R;
    if (d < m && d > 1e-6) { p.x = c.x + dx / d * m; p.z = c.z + dz / d * m; }
  }
  const onPier = p.x >= PIER_WALK.x0 && p.x <= PIER_WALK.x1 && Math.abs(p.z) <= PIER_WALK.halfZ;
  const dx = p.x - ISLAND.x, dz = p.z - ISLAND.z, d = Math.hypot(dx, dz);
  if (!onPier && d > WALK_R) { p.x = ISLAND.x + dx / d * WALK_R; p.z = ISLAND.z + dz / d * WALK_R; }
}
const nav = createNav(solids, islandWalkable);

function walk(from, tgt, reach) {
  const p = { ...from };
  push(p);
  for (let i = 0; i < 4000; i++) {
    if (Math.hypot(tgt.x - p.x, tgt.z - p.z) < reach) return i;
    const w = nav.route(p, tgt), dx = w.x - p.x, dz = w.z - p.z, l = Math.hypot(dx, dz) || 1;
    p.x += dx / l * STEP; p.z += dz / l * STEP;
    push(p);
  }
  return -1;
}

const places = [
  { name: 'pier', at: { x: PIER_END.x, z: PIER_END.z }, reach: 1.2 },
  ...QUESTS.map(q => ({ name: q.id, at: { x: q.pos[0], z: q.pos[1] }, reach: 2.4 })),
  ...QUESTS.flatMap(q => q.spots.map(([x, z], i) => ({ name: `${q.id}#${i}`, at: { x, z }, reach: 1.4 }))),
];

test('following the guide arrow reaches every island place from every other place', () => {
  const fails = [];
  for (const a of places) for (const b of places) {
    if (a === b) continue;
    if (walk(a.at, b.at, b.reach) < 0) fails.push(`${a.name} -> ${b.name}`);
  }
  assert.deepEqual(fails, []);
});
