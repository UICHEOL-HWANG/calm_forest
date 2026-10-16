import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIFFICULTY } from '../js/tuning.js';
import { ddaOutcome, defaultDifficulty, easeFor } from '../js/difficulty.js';

test('sled is registered with probe only for the first week', () => {
  assert.deepEqual(DIFFICULTY.sled, { arms: [0.85, 1.0, 1.15], target: 0.8, ddaOn: false });
  assert.ok('sled' in defaultDifficulty());
});

test('sled outcome is the share of flags passed, abandon is null', () => {
  assert.equal(ddaOutcome('sled', { flagsPassed: 9 }), 0.75);
  assert.equal(ddaOutcome('sled', { flagsPassed: 20 }), 1);
  assert.equal(ddaOutcome('sled', { abandoned: true }), null);
});

test('easeFor returns one of the sled arms', () => {
  const r = easeFor('sled', 'user-a', 0, 1);
  assert.ok(DIFFICULTY.sled.arms.includes(r.ease) || r.ease === 1);
});
