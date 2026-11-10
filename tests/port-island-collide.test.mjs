import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SOLIDS, QUESTS, ISLAND_TREES, ISLAND_ROCKS, FENCE, ISLAND, WALK_R, PIER_END } from '../js/port/data.js';

const PLAYER_R = 0.35;
const circles = SOLIDS.map(([c, r]) => ({ x: c.x, z: c.z, r }));
const blocked = (x, z, pad = PLAYER_R) => circles.some(c => Math.hypot(x - c.x, z - c.z) < c.r + pad);
const covered = (x, z) => circles.some(c => Math.hypot(x - c.x, z - c.z) < c.r);

test('every resident stands inside a solid so the player cannot walk through them', () => {
  for (const q of QUESTS) assert.ok(covered(q.pos[0], q.pos[1]), `${q.id} at ${q.pos}`);
});

test('every tree trunk and rock is solid', () => {
  for (const [x, z] of ISLAND_TREES) assert.ok(covered(x, z), `tree ${x},${z}`);
  for (const [x, z] of ISLAND_ROCKS) assert.ok(covered(x, z), `rock ${x},${z}`);
});

test('the farm fence rails are solid along their whole length', () => {
  for (const z of FENCE.z) for (let x = FENCE.x0; x <= FENCE.x1 + 1e-9; x += 0.25) assert.ok(covered(x, z), `fence ${x.toFixed(2)},${z}`);
});

test('every quest pickup is reachable without overlapping a solid', () => {
  for (const q of QUESTS) for (const [x, z] of q.spots) assert.ok(!blocked(x, z), `${q.id} item ${x},${z}`);
});

test('every resident has free ground within talking range', () => {
  for (const q of QUESTS) {
    let ok = false;
    for (let a = 0; a < Math.PI * 2 && !ok; a += Math.PI / 16) {
      const x = q.pos[0] + Math.cos(a) * 1.6, z = q.pos[1] + Math.sin(a) * 1.6;
      ok = !blocked(x, z) && Math.hypot(x - ISLAND.x, z - ISLAND.z) < WALK_R;
    }
    assert.ok(ok, `${q.id} has no free spot to talk from`);
  }
});

test('the island pier end where the player lands is free', () => {
  assert.ok(!blocked(PIER_END.x, PIER_END.z));
});
