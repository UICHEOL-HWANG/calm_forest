import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guideNeed, guideTarget, bannerDue, guideStalled, countTry, WEEKLY_MAX_TRIES, WEEKLY_STALL_SEC } from '../js/weekly/guide.js';
import { weeklyDefault, weekIndex } from '../js/weekly/rules.js';

const kst = (y, m, d, h = 0) => Date.UTC(y, m - 1, d, h - 9);
const fri = kst(2026, 11, 13, 10), wed = kst(2026, 11, 11, 10);
const at = (ms, over = {}) => ({ ...weeklyDefault(), week: weekIndex(ms), ...over });

test('first visit on a market day points to the market', () => {
  assert.equal(guideNeed(at(fri), fri), 'market');
});

test('market guidance shows only until the market was ever opened', () => {
  assert.equal(guideNeed(at(fri, { seenMarket: weekIndex(fri), seenBoard: weekIndex(fri) }), fri), null);
  assert.equal(guideNeed(at(fri, { seenMarket: weekIndex(fri) - 1, seenBoard: weekIndex(fri) - 1 }), fri), null);
});

test('weekday first visit points to the board, and only in the first week', () => {
  assert.equal(guideNeed(at(wed), wed), 'board');
  assert.equal(guideNeed(at(wed, { seenBoard: weekIndex(wed) }), wed), null);
  assert.equal(guideNeed(at(wed, { seenBoard: weekIndex(wed) - 3 }), wed), null);
});

test('each arrow gives up after its tries', () => {
  assert.equal(guideNeed(at(wed, { boardTries: WEEKLY_MAX_TRIES - 1 }), wed), 'board');
  assert.equal(guideNeed(at(wed, { boardTries: WEEKLY_MAX_TRIES }), wed), null);
  assert.equal(guideNeed(at(fri, { marketTries: WEEKLY_MAX_TRIES }), fri), 'board');
  assert.equal(guideNeed(at(fri, { marketTries: WEEKLY_MAX_TRIES, boardTries: WEEKLY_MAX_TRIES }), fri), null);
});

test('an arrow already counted this session keeps going', () => {
  const spent = at(wed, { boardTries: WEEKLY_MAX_TRIES });
  assert.equal(guideNeed(spent, wed, new Set(['board'])), 'board');
  assert.equal(guideNeed(spent, wed, new Set(['market'])), null);
});

test('an arrow that runs too long has stalled', () => {
  assert.equal(guideStalled(WEEKLY_STALL_SEC - 1), false);
  assert.equal(guideStalled(WEEKLY_STALL_SEC), true);
});

test('the tries count goes up by one for the started arrow only', () => {
  const s = at(wed);
  const next = countTry(s, 'board');
  assert.equal(next.boardTries, 1);
  assert.equal(next.marketTries | 0, 0);
  assert.equal(s.boardTries | 0, 0);
  assert.equal(countTry(next, 'market').marketTries, 1);
});

const ok = { need: 'market', inVillage: true, pastOnboarding: true, cameraFree: true, uiBusy: false, otherGuide: false };

test('guideTarget passes the need through when every gate is clear', () => {
  assert.equal(guideTarget(ok), 'market');
  assert.equal(guideTarget({ ...ok, need: 'board' }), 'board');
});

test('guideTarget is null when any gate fails', () => {
  assert.equal(guideTarget({ ...ok, need: null }), null);
  assert.equal(guideTarget({ ...ok, inVillage: false }), null);
  assert.equal(guideTarget({ ...ok, pastOnboarding: false }), null);
  assert.equal(guideTarget({ ...ok, cameraFree: false }), null);
  assert.equal(guideTarget({ ...ok, uiBusy: true }), null);
  assert.equal(guideTarget({ ...ok, otherGuide: true }), null);
});

const due = { open: true, seenMarket: 4, arrow: null, gate: true, week: 5, lastBannerWeek: 4, cine: false };

test('bannerDue is true for a market week the player has not opened', () => {
  assert.equal(bannerDue(due), true);
  assert.equal(bannerDue({ ...due, lastBannerWeek: null }), true);
});

test('bannerDue stays quiet while the market arrow itself leads there', () => {
  assert.equal(bannerDue({ ...due, arrow: 'market' }), false);
  assert.equal(bannerDue({ ...due, arrow: 'board' }), true);
});

test('bannerDue is false when closed, seen, repeated, gated or in a cinematic', () => {
  assert.equal(bannerDue({ ...due, open: false }), false);
  assert.equal(bannerDue({ ...due, seenMarket: 5 }), false);
  assert.equal(bannerDue({ ...due, lastBannerWeek: 5 }), false);
  assert.equal(bannerDue({ ...due, gate: false }), false);
  assert.equal(bannerDue({ ...due, cine: true }), false);
});
