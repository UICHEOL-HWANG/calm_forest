import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weekIndex, marketOpen, themeFor, pickWeekly, questById, weeklyDefault, restoreWeekly, rollover, note, progressOf, claim, buyPlan, spend } from '../js/weekly/rules.js';
import { MARKET_THEMES, WEEKLY_GROUPS } from '../js/data/weekly.js';

const kst = (y, m, d, h = 0, min = 0) => Date.UTC(y, m - 1, d, h - 9, min);
const all = () => true;

test('week rolls over at Monday 00:00 KST', () => {
  assert.equal(weekIndex(kst(2026, 11, 8, 23, 59)) + 1, weekIndex(kst(2026, 11, 9, 0, 0)));
  assert.equal(weekIndex(kst(2026, 11, 9, 0, 0)), weekIndex(kst(2026, 11, 15, 23, 59)));
});

test('market opens Friday 00:00 and closes Monday 00:00 KST', () => {
  assert.equal(marketOpen(kst(2026, 11, 12, 23, 59)), false);
  assert.equal(marketOpen(kst(2026, 11, 13, 0, 0)), true);
  assert.equal(marketOpen(kst(2026, 11, 14, 12, 0)), true);
  assert.equal(marketOpen(kst(2026, 11, 15, 23, 59)), true);
  assert.equal(marketOpen(kst(2026, 11, 16, 0, 0)), false);
});

test('themes rotate every six weeks', () => {
  const w = weekIndex(kst(2026, 11, 13));
  assert.equal(themeFor(w).id, themeFor(w + 6).id);
  assert.equal(new Set([0, 1, 2, 3, 4, 5].map(i => themeFor(w + i).id)).size, 6);
  assert.ok(MARKET_THEMES.includes(themeFor(w)));
});

test('picks one quest per group', () => {
  const ids = pickWeekly(2970, all, []);
  assert.equal(ids.length, 5);
  assert.deepEqual(ids.map(id => questById(id).group), WEEKLY_GROUPS);
});

test('same week gives the same picks', () => {
  assert.deepEqual(pickWeekly(2970, all, []), pickWeekly(2970, all, []));
});

test('locked types are never picked', () => {
  const open = new Set(['harvest', 'water', 'fish', 'cook', 'gift', 'sell', 'chop', 'daily']);
  for (let w = 2970; w < 2990; w++) {
    for (const id of pickWeekly(w, t => open.has(t), [])) assert.ok(open.has(questById(id).type), id);
  }
});

test('an empty group is filled from the fallback without duplicate types', () => {
  const open = new Set(['harvest', 'fish', 'chop', 'sell', 'daily']);
  const ids = pickWeekly(2970, t => open.has(t), []);
  assert.equal(ids.length, 5);
  assert.equal(new Set(ids.map(id => questById(id).type)).size, 5);
});

test('last week picks are avoided when the group has another candidate', () => {
  for (let w = 2970; w < 2990; w++) {
    const prev = pickWeekly(w, all, []);
    const next = pickWeekly(w + 1, all, prev);
    for (const id of next) assert.ok(!prev.includes(id), `${w}: ${id}`);
  }
});

const fresh = (w = 2970) => rollover(weeklyDefault(), w, () => true);

test('rollover draws quests and keeps tickets', () => {
  const a = { ...fresh(2970), tickets: 7, counts: { harvest: 9 }, claimed: ['w_harvest'] };
  const b = rollover(a, 2971, () => true);
  assert.equal(b.week, 2971);
  assert.equal(b.tickets, 7);
  assert.deepEqual(b.counts, {});
  assert.deepEqual(b.claimed, []);
  assert.deepEqual(b.prev, a.quests);
  assert.equal(b.quests.length, 5);
});

test('rollover within the same week returns the same object', () => {
  const a = fresh(2970);
  assert.equal(rollover(a, 2970, () => true), a);
});

test('note accumulates without mutating', () => {
  const a = fresh();
  const b = note(note(a, 'harvest', 3), 'harvest');
  assert.equal(b.counts.harvest, 4);
  assert.equal(a.counts.harvest, undefined);
});

test('note ignores bad amounts', () => {
  const a = fresh();
  assert.equal(note(a, 'harvest', -2), a);
  assert.equal(note(a, 'harvest', NaN), a);
});

test('claim pays two tickets once', () => {
  const a = { ...fresh(), quests: ['w_harvest'], counts: { harvest: 25 } };
  const r = claim(a, 'w_harvest');
  assert.equal(r.ok, true);
  assert.equal(r.gained, 2);
  assert.equal(r.state.tickets, 2);
  assert.equal(claim(r.state, 'w_harvest').reason, 'claimed');
});

test('claim refuses unfinished and unknown quests', () => {
  const a = { ...fresh(), quests: ['w_harvest'], counts: { harvest: 24 } };
  assert.equal(claim(a, 'w_harvest').reason, 'not_done');
  assert.equal(claim(a, 'w_water').reason, 'unknown');
});

test('tickets stop at the cap', () => {
  const a = { ...fresh(), quests: ['w_harvest'], counts: { harvest: 25 }, tickets: 14 };
  const r = claim(a, 'w_harvest');
  assert.equal(r.state.tickets, 15);
  assert.equal(r.gained, 1);
});

test('progress reports have, target, done, claimed', () => {
  const a = { ...fresh(), quests: ['w_harvest'], counts: { harvest: 40 } };
  assert.deepEqual(progressOf(a, 'w_harvest'), { have: 25, target: 25, done: true, claimed: false });
});

test('buy plan checks open, guest, owned, tickets in that order', () => {
  const item = { id: 'teadeck', cost: 6, kind: 'outdoor' };
  const s = { ...fresh(), tickets: 4 };
  assert.equal(buyPlan(s, item, { isGuest: false, owned: false, open: false }).reason, 'closed');
  assert.equal(buyPlan(s, item, { isGuest: true, owned: false, open: true }).reason, 'guest');
  assert.equal(buyPlan(s, item, { isGuest: false, owned: true, open: true }).reason, 'owned');
  assert.deepEqual(buyPlan(s, item, { isGuest: false, owned: false, open: true }), { ok: false, reason: 'short', short: 2 });
  assert.deepEqual(buyPlan({ ...s, tickets: 6 }, item, { isGuest: false, owned: false, open: true }), { ok: true });
});

test('spend never goes below zero', () => {
  assert.equal(spend({ ...fresh(), tickets: 6 }, 6).tickets, 0);
  assert.equal(spend({ ...fresh(), tickets: 1 }, 6).tickets, 0);
});

test('restore tolerates missing and malformed saves', () => {
  assert.deepEqual(restoreWeekly(undefined), weeklyDefault());
  const r = restoreWeekly({ week: 2970, quests: ['w_harvest', 'gone'], tickets: 99, counts: { harvest: 'x', fish: 3 }, claimed: 'nope' });
  assert.deepEqual(r.quests, ['w_harvest']);
  assert.equal(r.tickets, 15);
  assert.deepEqual(r.counts, { fish: 3 });
  assert.deepEqual(r.claimed, []);
});

test('restore dedupes quests, caps them at five and keeps claimed within quests', () => {
  const r = restoreWeekly({ week: 2970, quests: ['w_harvest', 'w_harvest', 'w_fish', 'w_cook', 'w_delve', 'w_gift', 'w_sell'], claimed: ['w_harvest', 'w_harvest', 'w_water'] });
  assert.deepEqual(r.quests, ['w_harvest', 'w_fish', 'w_cook', 'w_delve', 'w_gift']);
  assert.deepEqual(r.claimed, ['w_harvest']);
});

test('rollover ignores a non-integer index and returns the same object', () => {
  const a = fresh(2970);
  assert.equal(rollover(a, NaN, () => true), a);
  assert.equal(rollover(a, 2970.5, () => true), a);
});

test('claim is refused at the ticket cap and the quest stays unclaimed', () => {
  const a = { ...fresh(), quests: ['w_harvest'], counts: { harvest: 25 }, tickets: 15 };
  const r = claim(a, 'w_harvest');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'cap');
  assert.equal(r.gained, 0);
  assert.equal(r.state, a);
  assert.equal(progressOf(r.state, 'w_harvest').claimed, false);
});

test('a claim succeeds again after spending brings tickets below the cap', () => {
  const a = { ...fresh(), quests: ['w_harvest'], counts: { harvest: 25 }, tickets: 15 };
  const s = spend(a, 6);
  const r = claim(s, 'w_harvest');
  assert.equal(r.ok, true);
  assert.equal(r.state.tickets, 11);
});
