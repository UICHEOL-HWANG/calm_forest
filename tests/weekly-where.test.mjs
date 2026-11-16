import { test } from 'node:test';
import assert from 'node:assert/strict';
import { whereOf } from '../js/weekly/rules.js';
import { makeWeeklyBridge } from '../js/weekly/bridge.js';
import { marketView } from '../js/weekly/ui.js';
import { MARKET_THEMES } from '../js/data/weekly.js';
import { WEEKLY_COPY } from '../js/weekly/copy.js';

const books = MARKET_THEMES.find(t => t.hero.id === 'bookstall');
const hero = books.hero;
const prop = books.props[0];

test('whereOf points a stored yard item to the workbench', () => {
  assert.deepEqual(whereOf(hero, { stored: 1, hasHouse: false }), { key: 'outdoor', guide: 'bench' });
});

test('whereOf points a stored indoor item into the house when it exists', () => {
  assert.deepEqual(whereOf(prop, { stored: 1, hasHouse: true }), { key: 'indoor', guide: 'house' });
});

test('whereOf tells a houseless buyer the item waits for the house, with no guide', () => {
  assert.deepEqual(whereOf(prop, { stored: 1, hasHouse: false }), { key: 'indoorNoHouse', guide: null });
});

test('whereOf says nothing once the item is placed', () => {
  assert.equal(whereOf(hero, { stored: 0, hasHouse: true }), null);
  assert.equal(whereOf(prop, { stored: 0, hasHouse: true }), null);
});

function bridge(g) {
  return makeWeeklyBridge({ gameState: () => g, patch: () => {}, questAvailable: () => true, questCtx: () => ({}), isOpen: () => true });
}

test('bridge.where reads storage and house stage from the save', () => {
  const g = { houseStage: 2, house: { stored: { [prop.id]: 1 }, decor: [] }, outdoorStored: { [hero.id]: 1 }, outdoor: [] };
  assert.deepEqual(bridge(g).where(hero), { key: 'outdoor', guide: 'bench' });
  assert.deepEqual(bridge(g).where(prop), { key: 'indoorNoHouse', guide: null });
  assert.deepEqual(bridge({ ...g, houseStage: 3 }).where(prop), { key: 'indoor', guide: 'house' });
});

test('bridge.storedIndoor counts only market items waiting in house storage', () => {
  const g = { houseStage: 3, house: { stored: { [prop.id]: 1, sofa: 2 }, decor: [] }, outdoorStored: { [hero.id]: 1 }, outdoor: [] };
  assert.equal(bridge(g).storedIndoor(), 1);
  assert.equal(bridge({ ...g, house: { stored: {}, decor: [] } }).storedIndoor(), 0);
});

test('marketView attaches where only to owned rows', () => {
  const v = marketView({ tickets: 6 }, books, {
    open: true, isGuest: false, ownsDecor: (id) => id === hero.id,
    whereOf: (item) => (item.id === hero.id ? { key: 'outdoor', guide: 'bench' } : { key: 'indoor', guide: 'house' }),
  });
  assert.deepEqual(v.rows[0].where, { key: 'outdoor', guide: 'bench' });
  assert.equal(v.rows[1].where, null);
});

test('where copy exists for every key and the guide button', () => {
  for (const k of ['outdoor', 'indoor', 'indoorNoHouse', 'go', 'houseReady']) assert.equal(typeof WEEKLY_COPY.where[k], 'string');
});

test('weekly guide priority rises above story goals only while a place guide was asked for', async () => {
  const src = (await import('node:fs')).readFileSync(new URL('../js/weekly/index.js', import.meta.url), 'utf8');
  assert.match(src, /export const weeklyPriority = \(\) => \(placeGuide \? GUIDE_PRIORITY\.goal \+ 5 : GUIDE_PRIORITY\.weekly\);/);
});
