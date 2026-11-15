import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeWeeklyBridge } from '../js/weekly/bridge.js';

function env(initial, open = () => true) {
  let g = initial;
  return {
    api: { gameState: () => g, patch: (p) => { g = { ...g, ...p }; }, questAvailable: () => true, questCtx: () => ({}), isOpen: open },
    get: () => g,
  };
}

const empty = () => ({ house: { stored: {}, decor: [] }, outdoorStored: {}, outdoor: [] });

test('grant adds an indoor item to house storage without mutating', () => {
  const start = empty();
  const e = env(start);
  assert.equal(makeWeeklyBridge(e.api).grant({ id: 'teacups', kind: 'indoor' }), true);
  assert.equal(e.get().house.stored.teacups, 1);
  assert.deepEqual(start.house.stored, {});
});

test('grant adds an outdoor item to outdoor storage', () => {
  const e = env(empty());
  makeWeeklyBridge(e.api).grant({ id: 'teadeck', kind: 'outdoor' });
  assert.equal(e.get().outdoorStored.teadeck, 1);
});

test('owns sees stored and placed items', () => {
  const b1 = makeWeeklyBridge(env({ ...empty(), house: { stored: { teacups: 1 }, decor: [] } }).api);
  assert.equal(b1.owns('teacups'), true);
  assert.equal(b1.owns('bojagi'), false);
  const b2 = makeWeeklyBridge(env({ ...empty(), outdoor: [{ id: 'teadeck' }] }).api);
  assert.equal(b2.owns('teadeck'), true);
  const b3 = makeWeeklyBridge(env({ ...empty(), house: { stored: {}, decor: [{ id: 'bojagi' }] } }).api);
  assert.equal(b3.owns('bojagi'), true);
});

test('canDo blocks types whose space is closed', () => {
  const b = makeWeeklyBridge(env(empty(), (space) => space !== 'mountain').api);
  assert.equal(b.canDo('sled'), false);
  assert.equal(b.canDo('harvest'), true);
});

test('feature guides wait for the shared gate, not the merchant', () => {
  const gate = { open: false };
  const guide = { featureOpen: () => gate.open, isOpen: () => true };
  const b = makeWeeklyBridge({ ...env(empty()).api, guide });
  assert.equal(b.guideEnv.pastOnboarding(), false);
  gate.open = true;
  assert.equal(b.guideEnv.pastOnboarding(), true);
});

test('weekly arrows log guide_step and name their destination', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../js/weekly/bridge.js', import.meta.url), 'utf8');
  assert.match(src, /track: g\.track,/);
  assert.match(src, /follow: ARROW_LABEL\[name\]/);
  assert.doesNotMatch(src, /track: \(\) => \{\}/);
});
