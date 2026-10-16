import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SLED_LINEUP, SLED_IDS, physOf, sledOf, CASH_SLED_IDS } from '../js/mountain/sled-lineup.js';
import { idealTimeMs } from '../js/mountain/sled-ideal.js';

test('every sled has the same ideal time with all 7 acorns', () => {
  const base = idealTimeMs(physOf('basic'), 7);
  for (const id of SLED_IDS) assert.ok(Math.abs(idealTimeMs(physOf(id), 7) - base) <= 100, id);
});

test('trade-offs show at low acorn counts', () => {
  assert.ok(idealTimeMs(physOf('wind'), 0) < idealTimeMs(physOf('basic'), 0) - 1500);
  assert.ok(idealTimeMs(physOf('acorn'), 0) > idealTimeMs(physOf('basic'), 0) + 500);
});

test('lineup order, cash sleds and fallbacks', () => {
  assert.deepEqual(SLED_IDS, ['basic', 'sky', 'forest', 'starry', 'toboggan', 'wind', 'acorn', 'skiff']);
  assert.deepEqual(CASH_SLED_IDS, ['wind', 'acorn', 'skiff']);
  for (const id of CASH_SLED_IDS) { assert.equal(SLED_LINEUP[id].coins, 1500); assert.equal(SLED_LINEUP[id].cashWon, 3900); }
  assert.equal(sledOf('nope').id, 'basic');
  assert.equal(SLED_LINEUP.toboggan.needs, 'finish');
  assert.equal(SLED_LINEUP.starry.needs, 'perfect');
});

test('peak speed stays under the server floor speed', () => {
  for (const id of SLED_IDS) { const p = physOf(id); assert.ok(p.baseSpeed * p.boostMult < 24, id); }
});
