import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRunout, stepRunout, RUNOUT_STOP_Z, RUNOUT_MIN_S } from '../js/mountain/runout.js';
import { CAMP } from '../js/mountain/camp-layout.js';
import { PLAZA, clampLocal } from '../js/mountain/climb.js';

test('the runout stops before the snow bank and inside the walkable plaza', () => {
  assert.ok(RUNOUT_STOP_Z < CAMP.finish.z + 4.2);
  assert.ok(RUNOUT_STOP_Z > CAMP.finish.z);
  const p = { x: CAMP.finish.x, z: RUNOUT_STOP_Z };
  const c = clampLocal(p, PLAZA);
  assert.ok(Math.hypot(c.x - p.x, c.z - p.z) < 0.01);
});

test('stepRunout is immutable, decelerates and lands exactly on the stop line', () => {
  const r0 = createRunout({ x: 1, z: CAMP.finish.z - 0.5, v: 3.4 });
  let r = r0, t = 0, lastV = Infinity;
  while (!r.done && t < 10) {
    const next = stepRunout(r, 1 / 60);
    assert.notEqual(next, r);
    assert.ok(next.v <= lastV + 1e-9);
    lastV = next.v; r = next; t += 1 / 60;
  }
  assert.equal(r0.done, false);
  assert.equal(r.done, true);
  assert.equal(r.v, 0);
  assert.ok(Math.abs(r.z - RUNOUT_STOP_Z) < 1e-6);
  assert.ok(t >= RUNOUT_MIN_S - 0.05 && t < 4);
});

test('a very slow finish still glides for a moment and a fast one does not overshoot', () => {
  for (const v of [0.2, 12]) {
    let r = createRunout({ x: 0, z: CAMP.finish.z, v }), t = 0;
    while (!r.done && t < 10) { r = stepRunout(r, 1 / 60); t += 1 / 60; assert.ok(r.z <= RUNOUT_STOP_Z + 1e-6); }
    assert.ok(t >= RUNOUT_MIN_S - 0.05, `v=${v} t=${t}`);
  }
});

test('the sled drifts back toward the course centre while it slows', () => {
  let r = createRunout({ x: CAMP.finish.x + 5, z: CAMP.finish.z, v: 3 });
  while (!r.done) r = stepRunout(r, 1 / 60);
  assert.ok(Math.abs(r.x - CAMP.finish.x) < 5);
});

test('the sled turns sideways into a hockey stop as it slows, and the turn is monotonic', async () => {
  const { stopTurn } = await import('../js/mountain/runout.js');
  let r = createRunout({ x: 0, z: CAMP.finish.z, v: 3 });
  let last = stopTurn(r);
  assert.equal(last, 0);
  while (!r.done) {
    r = stepRunout(r, 1 / 60);
    const k = stopTurn(r);
    assert.ok(k >= last - 1e-9);
    last = k;
  }
  assert.ok(Math.abs(last - 1) < 1e-9);
});
