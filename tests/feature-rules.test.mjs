import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tutorialDone, featureGuidesOpen, houseGoalDue, placeGuideReady, ARROW_LABEL, FIRST_VISIT } from '../js/guide/feature-rules.js';
import { YARD_MAX_TRIES, YARD_IDLE_SEC } from '../js/pond/yard-steps.js';

const save = (over = {}) => ({ houseStage: 3, hintsSeen: { tutStep: 'done' }, unlocks: { legacy: false }, ...over });

test('the tutorial counts as done once it ended or was skipped', () => {
  assert.equal(tutorialDone(save()), true);
  assert.equal(tutorialDone(save({ hintsSeen: { tutStep: 'chop' } })), false);
  assert.equal(tutorialDone(save({ hintsSeen: {} })), false);
});

test('a legacy save without a tutorial step counts as done', () => {
  assert.equal(tutorialDone(save({ hintsSeen: {}, unlocks: { legacy: true } })), true);
  assert.equal(tutorialDone(save({ hintsSeen: { tutStep: 'mine' }, unlocks: { legacy: true } })), false);
});

test('feature guides need the tutorial and a finished house', () => {
  assert.equal(featureGuidesOpen(save()), true);
  assert.equal(featureGuidesOpen(save({ houseStage: 2 })), false);
  assert.equal(featureGuidesOpen(save({ hintsSeen: { tutStep: 'build' } })), false);
  assert.equal(featureGuidesOpen(null), false);
});

test('a skipped player without a house is sent to the house', () => {
  assert.equal(houseGoalDue(save({ houseStage: 0 }), false), true);
  assert.equal(houseGoalDue(save({ houseStage: 2 }), false), true);
  assert.equal(houseGoalDue(save({ houseStage: 3 }), false), false);
  assert.equal(houseGoalDue(save({ houseStage: 0 }), true), false);
  assert.equal(houseGoalDue(save({ houseStage: 0, hintsSeen: { tutStep: 'house1' } }), false), false);
});

const ready = { eligible: true, done: false, tries: 0, idleSec: YARD_IDLE_SEC };

test('a place guide starts after idle time, like the yard guide', () => {
  assert.equal(placeGuideReady(ready), true);
  assert.equal(placeGuideReady({ ...ready, idleSec: YARD_IDLE_SEC - 0.1 }), false);
});

test('a place guide stops after its tries, when done, or when not eligible', () => {
  assert.equal(placeGuideReady({ ...ready, tries: YARD_MAX_TRIES - 1 }), true);
  assert.equal(placeGuideReady({ ...ready, tries: YARD_MAX_TRIES }), false);
  assert.equal(placeGuideReady({ ...ready, done: true }), false);
  assert.equal(placeGuideReady({ ...ready, eligible: false }), false);
});

test('each arrow names its destination', () => {
  assert.deepEqual({ ...ARROW_LABEL }, {
    'weekly-board': '주간 의뢰판으로 가요',
    'weekly-market': '주말 장터로 가요',
    concert: '음악회 무대로 가요',
    auction: '저녁 경매로 가요',
  });
});

test('first-visit lines are one short line per place', () => {
  assert.deepEqual(Object.keys(FIRST_VISIT), ['weekly', 'concert', 'auction', 'pond']);
  for (const v of Object.values(FIRST_VISIT)) {
    assert.match(v.key, /^visit[A-Z]\w+$/);
    assert.ok(v.ico && v.title && v.line);
  }
});

test('new copy has no em dash, no banned verb and no arrow emoji', () => {
  const all = [...Object.values(ARROW_LABEL), ...Object.values(FIRST_VISIT).flatMap(v => [v.title, v.line])];
  for (const s of all) {
    assert.doesNotMatch(s, /—/, s);
    assert.doesNotMatch(s, /놀/, s);
    assert.doesNotMatch(s, /[⬅➡⬆⬇↗↘↙↖]/u, s);
  }
});
