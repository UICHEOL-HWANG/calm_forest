import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COURSE, COURSE_V, centerX, minTimeMs } from '../js/mountain/course.js';
import { PHYS, PHYS_V, createSled, stepSled, tryBoost, finalTimeMs } from '../js/mountain/sled.js';
import { perfectLine } from '../tools/sim/sled-sim.mjs';

const runToEnd = (s, steerFn = st => Math.sign(centerX(st.z + 6) - st.x), boostAtZ = []) => {
  let cur = s;
  const pending = [...boostAtZ];
  while (!cur.finished && cur.t < 120000) {
    if (pending.length && cur.z >= pending[0]) { cur = tryBoost(cur); pending.shift(); }
    cur = stepSled(cur, 16, steerFn(cur));
  }
  return cur;
};

test('course has 12 flags in order along the S curve', () => {
  assert.equal(COURSE_V, 2);
  assert.equal(COURSE.flags.length, 12);
  COURSE.flags.forEach((f, i) => {
    if (i) assert.ok(f.z > COURSE.flags[i - 1].z);
    assert.ok(Math.abs(f.x - centerX(f.z)) < 1e-9);
  });
  assert.ok(COURSE.flags.at(-1).z < COURSE.length);
});

test('stepSled returns a new object and never mutates input', () => {
  const s = createSled(0);
  const frozen = JSON.stringify(s);
  const n = stepSled(s, 16, 1);
  assert.notEqual(n, s);
  assert.equal(JSON.stringify(s), frozen);
});

test('a clean run without boost finishes in 22-30 s with all flags', () => {
  const end = perfectLine(COURSE, 0).sled;
  assert.equal(end.finished, true);
  assert.equal(end.flagsPassed, 12);
  assert.ok(end.t >= 22000 && end.t <= 30000, `t=${end.t}`);
  assert.equal(end.splits.length, 12);
});

test('boost consumes one acorn, records time and makes the run faster', () => {
  const plain = perfectLine(COURSE, 0).sled;
  const boosted = perfectLine(COURSE, 3).sled;
  assert.equal(boosted.acorns, 0);
  assert.equal(boosted.boostsAt.length, 3);
  assert.ok(boosted.t < plain.t - 1333);
});

test('boost with zero acorns does nothing', () => {
  const s = createSled(0);
  assert.deepEqual(tryBoost(s), s);
});

test('missing a flag adds the penalty to the final time', () => {
  const end = runToEnd(createSled(0), () => 1);
  assert.ok(end.flagsPassed < 12);
  assert.equal(finalTimeMs(end), end.t + (12 - end.flagsPassed) * PHYS.flagPenaltyMs);
});

test('hitting an obstacle slows down once per obstacle and is recorded', () => {
  const o = COURSE.obstacles[0];
  let s = { ...createSled(0), x: o.x, z: o.z - 1, speed: PHYS.baseSpeed };
  s = stepSled(s, 120, 0);
  assert.equal(s.hits.length, 1);
  assert.ok(s.slowLeftMs > 0);
  const again = stepSled({ ...s, x: o.x, z: o.z - 0.5 }, 16, 0);
  assert.equal(again.hits.length, 1);
});

test('x is clamped to the course width', () => {
  let s = createSled(0);
  for (let i = 0; i < 400; i++) s = stepSled(s, 16, 1);
  assert.ok(s.x <= centerX(s.z) + COURSE.width / 2 + 1e-9);
});

test('steer time is accumulated per side', () => {
  let s = createSled(0);
  s = stepSled(s, 100, -1);
  s = stepSled(s, 50, 1);
  assert.equal(s.steerLeftMs, 100);
  assert.equal(s.steerRightMs, 50);
});

test('theoretical minimum time is below any reachable time', () => {
  const best = runToEnd(createSled(6), undefined, [10, 60, 110, 160, 210, 260]);
  assert.ok(minTimeMs() < best.t);
  assert.equal(PHYS_V, 5);
});

test('createSled carries its physics and stepSled uses it', () => {
  const fast = { ...PHYS, baseSpeed: PHYS.baseSpeed * 1.06 };
  let a = createSled(0), b = createSled(0, fast);
  for (let i = 0; i < 300; i++) { a = stepSled(a, 16, 0); b = stepSled(b, 16, 0); }
  assert.ok(b.z > a.z);
  assert.equal(PHYS_V, 5);
});

test('hit recovery follows the sled physics', () => {
  const s = createSled(0, { ...PHYS, hitRecoverMs: 1100 });
  assert.equal(s.phys.hitRecoverMs, 1100);
});
