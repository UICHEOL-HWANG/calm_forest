import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIFFICULTY } from '../js/tuning.js';
import { ddaOutcome, defaultDifficulty, easeFor, nextDda } from '../js/difficulty.js';
import { MUDFLAT, DIVE, mudWindow, diveBreath } from '../js/forage/logic.js';

test('mudflat and dive are registered as probe-only games', () => {
  assert.deepEqual(DIFFICULTY.mudflat, { arms: [0.8, 1.0, 1.25], target: 0.7, ddaOn: false });
  assert.deepEqual(DIFFICULTY.dive, { arms: [0.85, 1.0, 1.15], target: 0.7, ddaOn: false });
  assert.ok('mudflat' in defaultDifficulty());
  assert.ok('dive' in defaultDifficulty());
  assert.equal(nextDda('mudflat', 1, 0), 1);
  assert.equal(nextDda('dive', 1, 1), 1);
});

test('easeFor hands out one of each game arms', () => {
  for (const g of ['mudflat', 'dive']) {
    const seen = new Set();
    for (let n = 0; n < 6; n++) seen.add(easeFor(g, 'user-a', n, 1).arm);
    assert.equal(seen.size, DIFFICULTY[g].arms.length);
  }
});

test('ease widens the breath window and lengthens the breath', () => {
  assert.equal(mudWindow(1), MUDFLAT.WINDOW);
  assert.ok(Math.abs(mudWindow(0.8) - 0.24) < 1e-9);
  assert.ok(Math.abs(mudWindow(1.25) - 0.375) < 1e-9);
  assert.equal(mudWindow(99), 0.6);
  assert.equal(diveBreath(1), DIVE.BREATH);
  assert.equal(diveBreath(0.85), 17);
  assert.equal(diveBreath(1.15), 23);
});

test('mudflat outcome is the hit rate, abandons and dive stay out of DDA', () => {
  assert.equal(ddaOutcome('mudflat', { good: 6, bad: 2 }), 0.75);
  assert.equal(ddaOutcome('mudflat', { good: 0, bad: 0 }), null);
  assert.equal(ddaOutcome('mudflat', { good: 5, bad: 1, abandoned: true }), null);
  assert.equal(ddaOutcome('dive', { items: 12 }), null);
});
