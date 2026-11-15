import { test } from 'node:test';
import assert from 'node:assert/strict';
import { concertDefault, restoreConcert } from '../js/concert/rules.js';
import { guideNeed, guideTarget, CONCERT_MAX_TRIES } from '../js/concert/guide.js';

const ok = { need: true, inVillage: true, pastOnboarding: true, cameraFree: true, uiBusy: false, otherGuide: false };

test('only a player who never played needs the guide', () => {
  assert.equal(guideNeed(concertDefault()), true);
  assert.equal(guideNeed({ ...concertDefault(), tutorial: true }), false);
  assert.equal(guideNeed({ ...concertDefault(), notes: 3 }), false);
});

test('the guide yields to every other gate', () => {
  assert.equal(guideTarget(ok), true);
  for (const k of ['need', 'inVillage', 'pastOnboarding', 'cameraFree']) assert.equal(guideTarget({ ...ok, [k]: false }), false, k);
  assert.equal(guideTarget({ ...ok, uiBusy: true }), false);
  assert.equal(guideTarget({ ...ok, otherGuide: true }), false);
});

test('the guide is not needed once the hall was opened', () => {
  assert.equal(guideNeed({ ...concertDefault(), seen: true }), false);
});

test('the guide gives up after two sessions unless this session already counted', () => {
  assert.equal(concertDefault().guideTries, 0);
  assert.equal(guideNeed({ ...concertDefault(), guideTries: CONCERT_MAX_TRIES - 1 }), true);
  assert.equal(guideNeed({ ...concertDefault(), guideTries: CONCERT_MAX_TRIES }), false);
  assert.equal(guideNeed({ ...concertDefault(), guideTries: CONCERT_MAX_TRIES }, true), true);
});

test('restore keeps the guide tries', () => {
  assert.equal(restoreConcert({ guideTries: 2 }).guideTries, 2);
  assert.equal(restoreConcert({ guideTries: 'x' }).guideTries, 0);
});
