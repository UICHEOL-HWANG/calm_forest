import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settleWin, markJoined, addWin } from '../js/auction/settle.js';

test('settleWin deducts coins and adds one stored item immutably', () => {
  const stored = { fence: 2 };
  const r = settleWin({ coins: 820, outdoorStored: stored }, 'moonswing', 430);
  assert.deepEqual(r, { ok: true, coins: 390, outdoorStored: { fence: 2, moonswing: 1 } });
  assert.deepEqual(stored, { fence: 2 });
  assert.equal(settleWin({ coins: 390, outdoorStored: r.outdoorStored }, 'moonswing', 100).outdoorStored.moonswing, 2);
});

test('settleWin refuses when coins are short', () => {
  assert.deepEqual(settleWin({ coins: 100, outdoorStored: {} }, 'starvane', 110), { ok: false, why: 'poor' });
});

test('markJoined records the day, addWin counts wins, both immutable', () => {
  const a = { lastDate: '', wins: 1 };
  assert.deepEqual(markJoined(a, '2026-11-10'), { lastDate: '2026-11-10', wins: 1 });
  assert.deepEqual(addWin(markJoined(a, '2026-11-10')), { lastDate: '2026-11-10', wins: 2 });
  assert.deepEqual(a, { lastDate: '', wins: 1 });
});
