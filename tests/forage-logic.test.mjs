import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MUDFLAT, DIVE, MUD_SPECIES, DIVE_SPECIES,
  tideProgress, tideFront, breathPhase, inBreathWindow, digResult,
  pickWeighted, diveSpeciesPool, airNeeded, airAfter, summarizeBag, roundOver,
} from '../js/forage/logic.js';

test('species keys are unique, prefixed and carry a positive coin value', () => {
  const all = [...MUD_SPECIES, ...DIVE_SPECIES];
  assert.equal(new Set(all.map(s => s.key)).size, all.length);
  for (const s of MUD_SPECIES) assert.match(s.key, /^mf_[a-z]+$/);
  for (const s of DIVE_SPECIES) assert.match(s.key, /^dv_[a-z]+$/);
  for (const s of all) { assert.ok(s.coin > 0, s.key); assert.ok(s.sell > 0, s.key); assert.ok(s.w > 0, s.key); }
  assert.equal(MUD_SPECIES.length, 6);
  assert.equal(DIVE_SPECIES.length, 5);
});

test('approved economy table (2026-10-27): catch coin / sell price', () => {
  const table = sp => Object.fromEntries(sp.map(s => [s.id, [s.coin, s.sell]]));
  assert.deepEqual(table(MUD_SPECIES), {
    clam: [1, 2], crab: [1, 1], cockle: [1, 3], razor: [1, 4], scallop: [2, 6], octo: [5, 15],
  });
  assert.deepEqual(table(DIVE_SPECIES), {
    conch: [1, 2], star: [1, 1], abalone: [2, 5], octo: [3, 8], pearl: [5, 18],
  });
});

test('expected value per catch stays below sea fishing per-catch value', () => {
  const ev = sp => { const w = sp.reduce((a, s) => a + s.w, 0); return sp.reduce((a, s) => a + s.w * (s.coin + s.sell), 0) / w; };
  assert.ok(Math.abs(ev(MUD_SPECIES) - 3.92) < .01);
  assert.ok(Math.abs(ev(DIVE_SPECIES) - 4.63) < .01);
});

test('tide starts slow, then rushes in during the last quarter', () => {
  assert.equal(tideProgress(0), 0);
  assert.equal(tideProgress(MUDFLAT.TIDE), 1);
  assert.equal(tideProgress(MUDFLAT.TIDE * 2), 1);
  const q3 = tideProgress(MUDFLAT.TIDE * .75);
  assert.ok(Math.abs(q3 - .35) < 1e-9);
  assert.ok(tideProgress(MUDFLAT.TIDE * .9) - q3 > q3 - tideProgress(MUDFLAT.TIDE * .6));
  assert.equal(tideFront(0), MUDFLAT.FRONT0);
  assert.equal(tideFront(MUDFLAT.TIDE), MUDFLAT.FRONT1);
});

test('breath window opens only at the start of each breath', () => {
  assert.equal(breathPhase(2.1), breathPhase(.1));
  assert.ok(Math.abs(breathPhase(-.25) - .75) < 1e-9);
  assert.equal(inBreathWindow(0), true);
  assert.equal(inBreathWindow(.29), true);
  assert.equal(inBreathWindow(.3), false);
  assert.equal(inBreathWindow(.9), false);
  assert.equal(inBreathWindow(3.1), true);
  assert.equal(digResult(.1), 'hit');
  assert.equal(digResult(.5), 'miss');
});

test('weighted pick walks the pool by weight', () => {
  const pool = [{ id: 'a', w: 1 }, { id: 'b', w: 3 }];
  assert.equal(pickWeighted(pool, 0).id, 'a');
  assert.equal(pickWeighted(pool, .24).id, 'a');
  assert.equal(pickWeighted(pool, .26).id, 'b');
  assert.equal(pickWeighted(pool, .999).id, 'b');
});

test('deeper water unlocks rarer finds', () => {
  const ids = d => diveSpeciesPool(d).map(s => s.id);
  assert.deepEqual(ids(2), ['conch', 'star']);
  assert.ok(!ids(3.9).includes('abalone'));
  assert.ok(ids(4).includes('abalone'));
  assert.ok(!ids(7.9).includes('pearl'));
  assert.ok(ids(8).includes('pearl'));
});

test('air drains with time and the climb home is always budgeted', () => {
  assert.equal(airAfter(1, DIVE.BREATH / 2), .5);
  assert.equal(airAfter(.1, DIVE.BREATH), 0);
  const need = airNeeded(9);
  assert.ok(Math.abs(need - (9 / DIVE.ASCEND / DIVE.BREATH + .05)) < 1e-9);
  assert.ok(airNeeded(9) > airNeeded(3));
});

test('a round ends when the tide is in or the last breath is spent', () => {
  assert.equal(roundOver('mudflat', { t: MUDFLAT.TIDE - .01 }), false);
  assert.equal(roundOver('mudflat', { t: MUDFLAT.TIDE }), true);
  assert.equal(roundOver('dive', { dives: DIVE.DIVES - 1 }), false);
  assert.equal(roundOver('dive', { dives: DIVE.DIVES }), true);
});

test('bag summary lists rare first, then by value, and totals coins', () => {
  const s = summarizeBag(MUD_SPECIES, { clam: 3, octo: 1, cockle: 2 });
  assert.equal(s.items[0].id, 'octo');
  assert.equal(s.items[1].id, 'cockle');
  assert.equal(s.count, 6);
  const f = (id, k) => MUD_SPECIES.find(x => x.id === id)[k];
  assert.equal(s.coins, f('clam', 'coin') * 3 + f('octo', 'coin') + f('cockle', 'coin') * 2);
  assert.equal(s.sellValue, f('clam', 'sell') * 3 + f('octo', 'sell') + f('cockle', 'sell') * 2);
  assert.deepEqual(summarizeBag(DIVE_SPECIES, {}), { items: [], count: 0, coins: 0, sellValue: 0 });
});
