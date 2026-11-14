import { test } from 'node:test';
import assert from 'node:assert/strict';
import { concertDefault } from '../js/concert/rules.js';
import { guideNeed, guideTarget } from '../js/concert/guide.js';

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
