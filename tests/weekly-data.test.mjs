import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WEEKLY_GROUPS, WEEKLY_POOL, WEEKLY_FALLBACK, TICKETS_PER_QUEST, TICKET_CAP, MARKET_THEMES, MARKET_ITEM_IDS } from '../js/data/weekly.js';

test('every group has at least two candidates', () => {
  for (const g of WEEKLY_GROUPS) assert.ok(WEEKLY_POOL.filter(q => q.group === g).length >= 2, g);
});

test('pool ids are unique and targets are positive integers', () => {
  const ids = [...WEEKLY_POOL, ...WEEKLY_FALLBACK].map(q => q.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const q of [...WEEKLY_POOL, ...WEEKLY_FALLBACK]) assert.ok(Number.isInteger(q.target) && q.target > 0, q.id);
});

test('fallback covers five distinct types', () => {
  assert.equal(new Set(WEEKLY_FALLBACK.map(q => q.type)).size, 5);
});

test('six themes with one hero at 6 tickets and two props at 2 tickets', () => {
  assert.equal(MARKET_THEMES.length, 6);
  for (const t of MARKET_THEMES) {
    assert.equal(t.hero.cost, 6);
    assert.equal(t.hero.kind, 'outdoor');
    assert.equal(t.props.length, 2);
    for (const p of t.props) { assert.equal(p.cost, 2); assert.equal(p.kind, 'indoor'); }
  }
  assert.equal(new Set(MARKET_ITEM_IDS).size, 18);
});

test('a full week of quests buys the whole stall', () => {
  assert.equal(TICKETS_PER_QUEST * WEEKLY_GROUPS.length, 10);
  assert.ok(TICKET_CAP >= 10);
});
