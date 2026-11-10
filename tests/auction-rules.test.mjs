import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AUCTION_POOL, AUCTION_BIDDERS, OPEN_FROM, OPEN_TO } from '../js/data/auction.js';
import { hashStr, lotFor, bidderMaxes, auctionOpenAt, secondsUntilOpen, joinMode, auctionDefault, restoreAuction } from '../js/auction/rules.js';

test('hashStr is stable and unsigned', () => {
  assert.equal(hashStr('abc'), hashStr('abc'));
  assert.notEqual(hashStr('2026-11-10'), hashStr('2026-11-11'));
  assert.ok(hashStr('x') >= 0);
});

test('lotFor picks a pool item with start = half appraisal rounded to 10', () => {
  const lot = lotFor('2026-11-10');
  const item = AUCTION_POOL.find(p => p.id === lot.id);
  assert.ok(item);
  assert.equal(lot.appraisal, item.appraisal);
  assert.equal(lot.start, Math.round(item.appraisal * 0.5 / 10) * 10);
  assert.deepEqual(lotFor('2026-11-10'), lot);
});

test('lotFor covers every pool item across 60 days', () => {
  const seen = new Set();
  for (let d = 0; d < 60; d++) seen.add(lotFor(new Date(Date.UTC(2026, 11, 1 + d)).toISOString().slice(0, 10)).id);
  assert.equal(seen.size, AUCTION_POOL.length);
});

test('bidderMaxes stay within 0.75..1.40 of appraisal, multiples of 10, same per day', () => {
  for (let d = 1; d <= 28; d++) {
    const day = `2027-02-${String(d).padStart(2, '0')}`;
    const m = bidderMaxes(day, 400);
    assert.deepEqual(Object.keys(m).sort(), AUCTION_BIDDERS.map(b => b.id).sort());
    for (const v of Object.values(m)) {
      assert.equal(v % 10, 0);
      assert.ok(v >= 300 && v <= 560, `${day} ${v}`);
    }
    assert.deepEqual(bidderMaxes(day, 400), m);
  }
});

test('auctionOpenAt is true only in the evening window', () => {
  assert.equal(auctionOpenAt(OPEN_FROM - 0.001), false);
  assert.equal(auctionOpenAt(OPEN_FROM), true);
  assert.equal(auctionOpenAt(0.8), true);
  assert.equal(auctionOpenAt(OPEN_TO), false);
  assert.equal(auctionOpenAt(0.3), false);
});

test('secondsUntilOpen wraps around midnight', () => {
  assert.equal(secondsUntilOpen(0.8, 0.002), 0);
  assert.ok(Math.abs(secondsUntilOpen(0.70, 0.002) - 10) < 1e-6);
  assert.ok(Math.abs(secondsUntilOpen(0.97, 0.002) - 375) < 1e-6);
});

test('joinMode', () => {
  const base = { t: 0.8, day: '2026-11-10', lastDate: '', coins: 500, start: 200 };
  assert.equal(joinMode({ ...base, t: 0.5 }), 'closed');
  assert.equal(joinMode({ ...base, lastDate: '2026-11-10' }), 'done');
  assert.equal(joinMode(base), 'bid');
  assert.equal(joinMode({ ...base, coins: 199 }), 'watch');
  assert.equal(joinMode({ ...base, lastDate: '2026-11-09' }), 'bid');
});

test('restoreAuction sanitizes', () => {
  assert.deepEqual(auctionDefault(), { lastDate: '', wins: 0 });
  assert.deepEqual(restoreAuction(undefined), { lastDate: '', wins: 0 });
  assert.deepEqual(restoreAuction({ lastDate: 3, wins: -2 }), { lastDate: '', wins: 0 });
  assert.deepEqual(restoreAuction({ lastDate: '2026-11-10', wins: 2.7, x: 1 }), { lastDate: '2026-11-10', wins: 2 });
});

test('bidderMaxes covers only the bidders it is given', () => {
  const all = bidderMaxes('2026-11-10', 400);
  const one = bidderMaxes('2026-11-10', 400, AUCTION_BIDDERS.filter(b => b.id === 'builder'));
  assert.deepEqual(Object.keys(one), ['builder']);
  assert.equal(one.builder, all.builder);
  assert.deepEqual(bidderMaxes('2026-11-10', 400, []), {});
});
