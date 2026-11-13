import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guideNeed, guideTarget, bannerDue } from '../js/weekly/guide.js';
import { weeklyDefault, weekIndex } from '../js/weekly/rules.js';

const kst = (y, m, d, h = 0) => Date.UTC(y, m - 1, d, h - 9);
const fri = kst(2026, 11, 13, 10), wed = kst(2026, 11, 11, 10);
const at = (ms, over = {}) => ({ ...weeklyDefault(), week: weekIndex(ms), ...over });

test('first visit on a market day points to the market', () => {
  assert.equal(guideNeed(at(fri), fri), 'market');
});

test('market guidance shows once per week', () => {
  assert.equal(guideNeed(at(fri, { seenMarket: weekIndex(fri), seenBoard: weekIndex(fri) }), fri), null);
});

test('weekday first visit points to the board', () => {
  assert.equal(guideNeed(at(wed), wed), 'board');
  assert.equal(guideNeed(at(wed, { seenBoard: weekIndex(wed) }), wed), null);
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

const due = { target: 'market', week: 5, lastBannerWeek: 4, cine: false };

test('bannerDue is true only for an unseen market week', () => {
  assert.equal(bannerDue(due), true);
  assert.equal(bannerDue({ ...due, lastBannerWeek: null }), true);
});

test('bannerDue is false for the board, a repeat week, or a cinematic', () => {
  assert.equal(bannerDue({ ...due, target: 'board' }), false);
  assert.equal(bannerDue({ ...due, target: null }), false);
  assert.equal(bannerDue({ ...due, lastBannerWeek: 5 }), false);
  assert.equal(bannerDue({ ...due, cine: true }), false);
});
