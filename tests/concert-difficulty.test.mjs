import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIFFICULTY, DIFF_K } from '../js/tuning.js';
import { easeFor, nextDda, ddaOutcome, defaultDifficulty, mergeDifficulty } from '../js/difficulty.js';

test('concert has a probe table with three arms and DDA on', () => {
  assert.deepEqual(DIFFICULTY.concert.arms, [0.85, 1.0, 1.2]);
  assert.equal(DIFFICULTY.concert.target, 0.75);
  assert.equal(DIFFICULTY.concert.ddaOn, true);
});

test('new and old saves both get a concert slot', () => {
  assert.deepEqual(defaultDifficulty().concert, { dda: 1, n: 0 });
  assert.deepEqual(mergeDifficulty({ fish: { dda: 1.2, n: 3 } }).concert, { dda: 1, n: 0 });
});

test('ease is dda times one of the arms, each arm once per block', () => {
  const seen = [0, 1, 2].map(n => easeFor('concert', 'device-a', n, 1).ease).sort((a, b) => a - b);
  assert.deepEqual(seen, [0.85, 1, 1.2]);
});

test('outcome is the ratio, and an abandoned show gives null', () => {
  assert.equal(ddaOutcome('concert', { ratio: 0.62 }), 0.62);
  assert.equal(ddaOutcome('concert', { ratio: 7 }), 1);
  assert.equal(ddaOutcome('concert', { ratio: -1 }), 0);
  assert.equal(ddaOutcome('concert', { abandoned: true, ratio: 0.9 }), null);
});

test('a weak show makes the next one easier, a strong one harder', () => {
  assert.ok(Math.abs(nextDda('concert', 1, 0.25) - (1 + DIFF_K * 0.5)) < 1e-9);
  assert.ok(nextDda('concert', 1, 1) < 1);
});
