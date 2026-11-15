import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { boardView, marketView } from '../js/weekly/ui.js';
import { weeklyDefault } from '../js/weekly/rules.js';
import { MARKET_THEMES } from '../js/data/weekly.js';

const base = { ...weeklyDefault(), week: 2970, quests: ['w_harvest', 'w_fish'], counts: { harvest: 25, fish: 4 } };

test('board rows carry progress and claim state', () => {
  const v = boardView({ ...base, claimed: [] });
  assert.equal(v.rows.length, 2);
  assert.deepEqual([v.rows[0].have, v.rows[0].target, v.rows[0].done, v.rows[0].claimed], [25, 25, true, false]);
  assert.deepEqual([v.rows[1].have, v.rows[1].done], [4, false]);
  assert.equal(v.capped, false);
});

test('board flags the ticket cap', () => {
  assert.equal(boardView({ ...base, tickets: 15 }).capped, true);
});

test('board rows carry the quest group and its approved name', () => {
  const v = boardView(base);
  assert.deepEqual(v.rows.map(r => r.group), ['field', 'water']);
  assert.equal(v.rows[0].label, '밭 25칸 수확하기');
});

test('fallback quests take the accent of their usual group', () => {
  const s = { ...weeklyDefault(), quests: ['f_harvest', 'f_fish', 'f_chop', 'f_sell', 'f_daily'], counts: {} };
  const v = boardView(s);
  assert.deepEqual(v.rows.map(r => r.group), ['any', 'any', 'any', 'any', 'any']);
  assert.deepEqual(v.rows.map(r => r.accent), ['field', 'water', 'field', 'village', 'village']);
});

test('claimable rows come first, then in progress, then claimed, stable inside each', () => {
  const s = {
    ...weeklyDefault(),
    quests: ['w_water', 'w_fish', 'w_cook', 'w_gift', 'w_harvest'],
    counts: { water: 10, fish: 15, cook: 8, gift: 3, harvest: 25 },
    claimed: ['w_cook', 'w_fish'],
  };
  assert.deepEqual(boardView(s).rows.map(r => r.id), ['w_gift', 'w_harvest', 'w_water', 'w_fish', 'w_cook']);
});

test('board keeps the stored order when no row differs', () => {
  const s = { ...weeklyDefault(), quests: ['w_water', 'w_fish', 'w_cook'], counts: {} };
  assert.deepEqual(boardView(s).rows.map(r => r.id), ['w_water', 'w_fish', 'w_cook']);
});

test('market rows report one status each', () => {
  const theme = MARKET_THEMES[0];
  const owns = (id) => id === theme.props[0].id;
  const v = marketView({ ...base, tickets: 3 }, theme, { open: true, isGuest: false, ownsDecor: owns });
  assert.deepEqual(v.rows.map(r => r.status), ['short', 'owned', 'buy']);
  assert.equal(v.rows[0].short, 3);
});

test('guests and closed days override buy status', () => {
  const theme = MARKET_THEMES[0];
  const none = () => false;
  assert.ok(marketView({ ...base, tickets: 15 }, theme, { open: true, isGuest: true, ownsDecor: none }).rows.every(r => r.status === 'guest'));
  assert.ok(marketView({ ...base, tickets: 15 }, theme, { open: false, isGuest: false, ownsDecor: none }).rows.every(r => r.status === 'closed'));
});

test('market rows carry copy and cost for the hero and both props', () => {
  const theme = MARKET_THEMES[0];
  const v = marketView({ ...base, tickets: 7 }, theme, { open: true, isGuest: false, ownsDecor: () => false });
  assert.deepEqual(v.rows.map(r => [r.id, r.cost]), [['teadeck', 6], ['teacups', 2], ['bojagi', 2]]);
  assert.equal(v.rows[0].name, '찻상 놓인 평상');
  assert.equal(v.open, true);
  assert.equal(v.tickets, 7);
});

const css = readFileSync(new URL('../js/weekly/style.js', import.meta.url), 'utf8');

test('dialog css uses the game conventions instead of container queries', () => {
  assert.match(css, /@media \(orientation: landscape\) and \(max-height: 500px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /env\(safe-area-inset-left/);
  assert.doesNotMatch(css, /@container/);
  assert.match(css, /#weekly-modal/);
});

test('ui.js avoids innerHTML and does not import game.js', () => {
  const ui = readFileSync(new URL('../js/weekly/ui.js', import.meta.url), 'utf8');
  assert.doesNotMatch(ui, /innerHTML/);
  assert.doesNotMatch(ui, /from '\.\.\/game\.js'/);
});

const statusOf = (tickets, over = {}) => boardView({
  ...weeklyDefault(), quests: ['w_harvest'], counts: { harvest: 25 }, claimed: [], tickets, ...over,
}).rows[0].status;

test('row status: capped only when finished, unclaimed and tickets are at the cap', () => {
  assert.equal(statusOf(15), 'capped');
  assert.equal(statusOf(14), 'claim');
  assert.equal(statusOf(15, { claimed: ['w_harvest'] }), 'claimed');
  assert.equal(statusOf(0, { claimed: ['w_harvest'] }), 'claimed');
  assert.equal(statusOf(15, { counts: { harvest: 3 } }), 'progress');
});

test('capped rows still sort with the claimable ones', () => {
  const s = { ...weeklyDefault(), quests: ['w_fish', 'w_harvest'], counts: { fish: 3, harvest: 25 }, tickets: 15 };
  assert.deepEqual(boardView(s).rows.map(r => [r.id, r.status]), [['w_harvest', 'capped'], ['w_fish', 'progress']]);
});
