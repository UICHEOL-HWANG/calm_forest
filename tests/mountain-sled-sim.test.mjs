import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulate, profile } from '../tools/sim/sled-sim.mjs';
import { PHYS } from '../js/mountain/sled.js';

test('simulation is deterministic per seed', () => {
  assert.deepEqual(simulate({ skill: 0.6, acorns: 3, seed: 7 }), simulate({ skill: 0.6, acorns: 3, seed: 7 }));
});

test('higher skill means more flags and a clearly faster median', () => {
  const lo = profile(0.3, 3, 200);
  const hi = profile(0.9, 3, 200);
  assert.ok(hi.meanFlags > lo.meanFlags);
  assert.ok(lo.p50 - hi.p50 >= 1000, `gap=${lo.p50 - hi.p50}`);
});

test('median time falls monotonically with skill', () => {
  const a = profile(0.3, 3, 200).p50;
  const b = profile(0.6, 3, 200).p50;
  const c = profile(0.9, 3, 200).p50;
  assert.ok(a > b && b > c, `${a} ${b} ${c}`);
});

test('skilled players hit fewer obstacles', () => {
  assert.ok(profile(0.9, 3, 200).meanHits < profile(0.3, 3, 200).meanHits);
});

test('an expert with six acorns takes at least 20 s and a novice without acorns at most 40 s', () => {
  assert.ok(profile(0.9, 6, 200).p50 >= 20000);
  assert.ok(profile(0.3, 0, 200).p90 <= 40000);
});

test('six acorns are worth a visible but not dominant gain', () => {
  const none = profile(0.7, 0, 200).p50;
  const six = profile(0.7, 6, 200).p50;
  const gain = none - six;
  assert.ok(gain >= 2000 && gain <= 6000, `gain=${gain}`);
});

test('boosted speeds stay within the server min-time assumption of 24 m/s', () => {
  assert.ok(PHYS.baseSpeed * PHYS.boostMult <= 24);
  assert.ok(PHYS.maxSpeed * PHYS.boostMult <= 24);
});
