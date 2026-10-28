import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SLED_LINEUP, SLED_IDS, physOf, sledOf, CASH_SLED_IDS } from '../js/mountain/sled-lineup.js';
import { idealTimeMs } from '../js/mountain/sled-ideal.js';
import { ACORNS } from '../js/mountain/climb.js';

const MAX = ACORNS.length;

test('every sled has the same ideal time with the reachable acorn max', () => {
  assert.equal(MAX, 6);
  const base = idealTimeMs(physOf('basic'), MAX);
  for (const id of SLED_IDS) assert.ok(Math.abs(idealTimeMs(physOf(id), MAX) - base) <= 100, id);
});

test('trade-offs show at low acorn counts', () => {
  assert.ok(idealTimeMs(physOf('wind'), 0) < idealTimeMs(physOf('basic'), 0) - 1000);
  assert.ok(idealTimeMs(physOf('acorn'), 0) > idealTimeMs(physOf('basic'), 0) + 333);
});

test('lineup order, cash sleds and fallbacks', () => {
  assert.deepEqual(SLED_IDS, ['basic', 'sky', 'forest', 'starry', 'worldtree', 'toboggan', 'wind', 'acorn', 'skiff']);
  assert.deepEqual(CASH_SLED_IDS, ['wind', 'acorn', 'skiff']);
  for (const id of CASH_SLED_IDS) { assert.equal(SLED_LINEUP[id].coins, 1500); assert.equal(SLED_LINEUP[id].cashWon, 3900); }
  assert.equal(sledOf('nope').id, 'basic');
  assert.equal(SLED_LINEUP.toboggan.needs, 'finish');
  assert.equal(SLED_LINEUP.starry.needs, 'perfect');
});

test('peak speed stays under the server floor speed', () => {
  for (const id of SLED_IDS) { const p = physOf(id); assert.ok(p.baseSpeed * p.boostMult < 24, id); }
});

test('phys overrides are pinned per sled', () => {
  assert.deepEqual({ ...SLED_LINEUP.basic.phys }, {});
  assert.deepEqual({ ...SLED_LINEUP.sky.phys }, {});
  assert.deepEqual({ ...SLED_LINEUP.forest.phys }, {});
  assert.deepEqual({ ...SLED_LINEUP.starry.phys }, {});
  assert.deepEqual({ ...SLED_LINEUP.toboggan.phys }, { steerRate: 7.8, hitSlowMult: 0.65, hitRecoverMs: 1100 });
  assert.deepEqual({ ...SLED_LINEUP.wind.phys }, { baseSpeed: 13.65, boostMult: 1.33 });
  assert.deepEqual({ ...SLED_LINEUP.acorn.phys }, { baseSpeed: 12.6, accel: 11.25, boostMult: 1.575 });
  assert.deepEqual({ ...SLED_LINEUP.skiff.phys }, { steerRate: 12.3, hitRecoverMs: 1900 });
});

test('stats are pinned per sled', () => {
  for (const id of ['basic', 'sky', 'forest', 'starry']) assert.deepEqual([...SLED_LINEUP[id].stats], [3, 3, 3, 3], id);
  assert.deepEqual([...SLED_LINEUP.toboggan.stats], [3, 2, 5, 3]);
  assert.deepEqual([...SLED_LINEUP.wind.stats], [5, 3, 2, 1]);
  assert.deepEqual([...SLED_LINEUP.acorn.stats], [2, 3, 3, 5]);
  assert.deepEqual([...SLED_LINEUP.skiff.stats], [3, 5, 1, 3]);
});
