import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulate, profile } from '../tools/sim/sled-sim.mjs';
import { PHYS } from '../js/mountain/sled.js';

test('simulation is deterministic per seed', () => {
  assert.deepEqual(simulate({ skill: 0.6, acorns: 3, seed: 7 }), simulate({ skill: 0.6, acorns: 3, seed: 7 }));
});

test('higher skill means more flags and a faster median', () => {
  const lo = profile(0.3, 3, 200);
  const hi = profile(0.9, 3, 200);
  assert.ok(hi.meanFlags > lo.meanFlags);
  assert.ok(hi.p50 < lo.p50);
});

test('six acorns are worth a visible but not dominant gain', () => {
  const none = profile(0.7, 0, 200).p50;
  const six = profile(0.7, 6, 200).p50;
  const gain = none - six;
  assert.ok(gain >= 3000 && gain <= 9000, `gain=${gain}`);
});

test('boosted speeds stay within the server min-time assumption of 24 m/s', () => {
  assert.ok(PHYS.baseSpeed * PHYS.boostMult <= 24);
  assert.ok(PHYS.maxSpeed * PHYS.boostMult <= 24);
});
