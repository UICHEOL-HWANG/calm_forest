import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WALK_R, BUMP_R, BUMP_CENTER, BUMP_HALF, walkLimit, clampVillage } from '../js/world/walk-bounds.js';

const places = readFileSync(new URL('../js/data/places.js', import.meta.url), 'utf8');
const gate = (() => {
  const m = /SEA_GATE = new THREE\.Vector3\((-?[\d.]+), 0, (-?[\d.]+)\)/.exec(places);
  return { x: +m[1], z: +m[2] };
})();
const cove = (() => {
  const m = /const SEA_COVE = \{ x: SEA_GATE\.x \+ ([\d.]+), z: SEA_GATE\.z - ([\d.]+), r: ([\d.]+) \}/.exec(places);
  return { x: gate.x + +m[1], z: gate.z - +m[2], r: +m[3] };
})();
const deg = d => d * Math.PI / 180;
const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

test('the base radius stays 42 and the bump adds 7 toward the north-east', () => {
  assert.equal(WALK_R, 42);
  assert.equal(BUMP_R, 7);
  assert.ok(close(BUMP_CENTER, deg(-35)));
  assert.ok(close(BUMP_HALF, deg(35)));
});

test('far from the bump the limit is the old circle', () => {
  for (const d of [-180, -120, -90, -71, 1, 30, 90, 179]) assert.ok(close(walkLimit(deg(d)), 42), `${d}deg`);
});

test('the limit peaks at 49 in the bump centre', () => {
  assert.ok(close(walkLimit(deg(-35)), 49));
  assert.ok(walkLimit(deg(-20)) > 42 && walkLimit(deg(-20)) < 49);
  assert.ok(close(walkLimit(deg(-20)), walkLimit(deg(-50))));
});

test('the limit is continuous at the window edges and across the wrap', () => {
  for (const edge of [-70, 0]) {
    assert.ok(Math.abs(walkLimit(deg(edge - 1e-6)) - walkLimit(deg(edge + 1e-6))) < 1e-6, `${edge}deg`);
    assert.ok(close(walkLimit(deg(edge)), 42, 1e-9));
  }
  assert.ok(close(walkLimit(Math.PI), walkLimit(-Math.PI)));
  assert.ok(close(walkLimit(deg(-35) + 2 * Math.PI), 49));
});

test('the far edge of the moved sea cove is walkable', () => {
  const far = { x: cove.x + cove.r, z: cove.z };
  assert.ok(Math.hypot(far.x, far.z) <= walkLimit(Math.atan2(far.z, far.x)));
  assert.ok(Math.hypot(far.x, far.z) > WALK_R, 'the bump is what makes it reachable');
});

test('clampVillage leaves inside points alone', () => {
  const p = { x: 10, z: -5, y: 3 };
  clampVillage(p);
  assert.deepEqual(p, { x: 10, z: -5, y: 3 });
});

test('clampVillage pulls outside points back onto the limit along the same ray', () => {
  const p = { x: 0, z: 60 };
  clampVillage(p);
  assert.ok(close(p.x, 0) && close(p.z, 42));
  const q = { x: Math.cos(deg(-35)) * 80, z: Math.sin(deg(-35)) * 80 };
  clampVillage(q);
  assert.ok(close(Math.hypot(q.x, q.z), 49));
  assert.ok(close(Math.atan2(q.z, q.x), deg(-35)));
});

test('clampVillage lets the player stand in the bump beyond the old circle', () => {
  const p = { x: Math.cos(deg(-35)) * 46, z: Math.sin(deg(-35)) * 46 };
  clampVillage(p);
  assert.ok(close(Math.hypot(p.x, p.z), 46));
});
