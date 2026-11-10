import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STAR_TOOLS, MAX_STAR, STAR_EFFECT, TOOL_MAT, starCost, starOf, rodBiteSec, waterMult, potMult, netBonus, hammerRate,
  forgeCheck, forgeStart, forgeCancel, forgeScore, forgeReady, forgeComplete, restoreToolStars, restoreForge,
  defaultToolStars,
} from '../js/workbench/rules.js';
import { HAMMER_EXPAND_RATE } from '../js/tool-tiers.js';

const rich = (extra = {}) => ({ coins: 2000, wood: 50, stone: 50, gem: 5, fish: 30, crop: 30, coal: 30, bug: 10, ...extra });
const owner = (over = {}) => ({
  upgrades: { rod: true, water: true, pot: true, net: true, hammer: true },
  toolStars: defaultToolStars(),
  forge: null,
  inventory: rich(),
  ...over,
});

test('five star tools with three stars each', () => {
  assert.deepEqual(STAR_TOOLS, ['rod', 'water', 'pot', 'net', 'hammer']);
  assert.equal(MAX_STAR, 3);
  for (const t of STAR_TOOLS) assert.equal(STAR_EFFECT[t].length, 4, t);
});

test('effects match the approved numbers', () => {
  assert.deepEqual(STAR_EFFECT.rod, [2.6, 3.0, 3.4, 3.8]);
  assert.deepEqual(STAR_EFFECT.water, [1.75, 2.0, 2.25, 2.5]);
  assert.deepEqual(STAR_EFFECT.pot, [1.5, 1.65, 1.8, 2.0]);
  assert.deepEqual(STAR_EFFECT.net, [0.18, 0.24, 0.30, 0.36]);
  assert.deepEqual(STAR_EFFECT.hammer, [0.7, 0.65, 0.6, 0.55]);
  assert.equal(STAR_EFFECT.hammer[0], HAMMER_EXPAND_RATE);
});

test('tool materials use real inventory keys', () => {
  assert.deepEqual(TOOL_MAT, { rod: 'fish', water: 'crop', pot: 'coal', net: 'bug', hammer: 'coal' });
});

test('star costs per tier', () => {
  assert.deepEqual(starCost('rod', 1), { coins: 120, wood: 10, fish: 4 });
  assert.deepEqual(starCost('rod', 2), { coins: 240, stone: 10, fish: 8 });
  assert.deepEqual(starCost('rod', 3), { coins: 400, gem: 1, fish: 12 });
  assert.deepEqual(starCost('water', 1), { coins: 120, wood: 10, crop: 4 });
  assert.deepEqual(starCost('pot', 2), { coins: 240, stone: 10, coal: 8 });
  assert.deepEqual(starCost('hammer', 3), { coins: 400, gem: 1, coal: 12 });
  assert.deepEqual(starCost('net', 1), { coins: 120, wood: 10, bug: 2 });
  assert.deepEqual(starCost('net', 2), { coins: 240, stone: 10, bug: 4 });
  assert.deepEqual(starCost('net', 3), { coins: 400, gem: 1, bug: 6 });
  assert.equal(starCost('axe', 1), null);
  assert.equal(starCost('rod', 4), null);
  assert.equal(starCost('rod', 0), null);
});

test('stars need the tier-1 tool and ignore the gold tier', () => {
  assert.equal(starOf({ upgrades: { rod: false }, toolStars: { rod: 2 } }, 'rod'), 0);
  assert.equal(starOf({ upgrades: { rod: true }, toolStars: { rod: 2 } }, 'rod'), 2);
  assert.equal(starOf({ upgrades: { rod: true }, tier2: { rod: true } }, 'rod'), 0);
  assert.equal(starOf({ upgrades: { rod: true }, toolStars: { rod: 9 } }, 'rod'), 3);
  assert.equal(starOf({}, 'rod'), 0);
});

test('effect getters fall back to the old values', () => {
  assert.equal(rodBiteSec({ upgrades: { rod: true } }), 2.6);
  assert.equal(rodBiteSec({ upgrades: { rod: true }, toolStars: { rod: 1 } }), 3.0);
  assert.equal(rodBiteSec({ upgrades: { rod: true }, toolStars: { rod: 3 } }), 3.8);
  assert.equal(waterMult(0), 1.75);
  assert.equal(waterMult(2), 2.25);
  assert.equal(waterMult(7), 2.5);
  assert.equal(potMult({ upgrades: {} }), 1);
  assert.equal(potMult({ upgrades: { pot: true } }), 1.5);
  assert.equal(potMult({ upgrades: { pot: true }, toolStars: { pot: 3 } }), 2.0);
  assert.equal(netBonus({ upgrades: {} }), 0);
  assert.equal(netBonus({ upgrades: { net: true } }), 0.18);
  assert.equal(netBonus({ upgrades: { net: true }, toolStars: { net: 2 } }), 0.30);
  assert.equal(hammerRate({ upgrades: {} }), 1);
  assert.equal(hammerRate({ upgrades: { hammer: true } }), 0.7);
  assert.equal(hammerRate({ upgrades: { hammer: true }, toolStars: { hammer: 3 } }), 0.55);
});

test('forgeCheck states', () => {
  assert.equal(forgeCheck(owner({ upgrades: {} }), 'rod').state, 'noTool');
  assert.equal(forgeCheck(owner(), 'axe').state, 'unknown');
  const ready = forgeCheck(owner(), 'rod');
  assert.equal(ready.state, 'ready');
  assert.equal(ready.next, 1);
  assert.deepEqual(ready.cost, { coins: 120, wood: 10, fish: 4 });
  assert.equal(forgeCheck(owner({ toolStars: { ...defaultToolStars(), rod: 3 } }), 'rod').state, 'max');
  const short = forgeCheck(owner({ inventory: rich({ fish: 1, coins: 10 }) }), 'rod');
  assert.equal(short.state, 'short');
  assert.deepEqual(short.missing, ['coins', 'fish']);
  const busy = owner({ forge: { tool: 'pot', star: 1, day: '2026-11-11', coins: 120, score: 5 } });
  assert.equal(forgeCheck(busy, 'rod').state, 'busy');
  assert.equal(forgeCheck(busy, 'pot').state, 'pending');
});

test('forgeStart spends the cost and opens a hammer run', () => {
  const s = owner();
  const r = forgeStart(s, 'rod', '2026-11-11');
  assert.equal(r.inventory.coins, 1880);
  assert.equal(r.inventory.wood, 40);
  assert.equal(r.inventory.fish, 26);
  assert.deepEqual(r.forge, { tool: 'rod', star: 1, day: '2026-11-11', coins: 120, score: null });
  assert.equal(s.inventory.coins, 2000);
  assert.equal(forgeStart(owner({ upgrades: {} }), 'rod', '2026-11-11'), null);
  assert.equal(forgeStart({ ...s, forge: r.forge }, 'water', '2026-11-11'), null);
});

test('cancel before any strike returns everything', () => {
  const s = owner();
  const r = forgeStart(s, 'rod', '2026-11-11');
  const c = forgeCancel({ ...s, ...r });
  assert.deepEqual(c.inventory, s.inventory);
  assert.equal(c.forge, null);
  assert.equal(forgeCancel({ ...s, forge: { ...r.forge, score: 4 } }), null);
  assert.equal(forgeCancel(s), null);
});

test('forgeScore refunds coins by score once', () => {
  const s = owner();
  const r = forgeStart(owner({ toolStars: { ...defaultToolStars(), rod: 1 } }), 'rod', '2026-11-11');
  const st = { ...s, ...r };
  const done = forgeScore(st, 8);
  assert.equal(done.refund, 48);
  assert.equal(done.inventory.coins, st.inventory.coins + 48);
  assert.equal(done.forge.score, 8);
  assert.equal(forgeScore({ ...st, forge: done.forge }, 10), null);
  assert.equal(forgeScore(st, 10).refund, 72);
  assert.equal(forgeScore(st, 4).refund, 0);
  assert.equal(forgeScore(st, 99).forge.score, 10);
});

test('ready after a new day or after sleeping, never during hammering', () => {
  const f = { tool: 'rod', star: 1, day: '2026-11-11', coins: 120, score: 6 };
  assert.equal(forgeReady(f, '2026-11-11', false), false);
  assert.equal(forgeReady(f, '2026-11-11', true), true);
  assert.equal(forgeReady(f, '2026-11-12', false), true);
  assert.equal(forgeReady(f, '2026-11-10', false), false);
  assert.equal(forgeReady({ ...f, score: null }, '2026-11-12', true), false);
  assert.equal(forgeReady(null, '2026-11-12', true), false);
});

test('forgeComplete applies the star and clears the anvil', () => {
  const s = owner({ forge: { tool: 'rod', star: 1, day: '2026-11-11', coins: 120, score: 6 } });
  assert.equal(forgeComplete(s, '2026-11-11', false), null);
  const c = forgeComplete(s, '2026-11-12', false);
  assert.equal(c.toolStars.rod, 1);
  assert.equal(c.forge, null);
  assert.deepEqual(c.done, { tool: 'rod', star: 1 });
  assert.equal(s.toolStars.rod, 0);
});

test('restoreToolStars keeps only known tools and valid stars', () => {
  assert.deepEqual(restoreToolStars(undefined), defaultToolStars());
  assert.deepEqual(restoreToolStars('x'), defaultToolStars());
  assert.deepEqual(restoreToolStars({ rod: 2, axe: 3, pot: -1, net: 9, water: 1.7, hammer: '2' }),
    { rod: 2, water: 1, pot: 0, net: 3, hammer: 0 });
});

test('restoreForge validates and finishes an interrupted hammer run at zero', () => {
  const stars = { ...defaultToolStars(), rod: 1 };
  const ok = { tool: 'rod', star: 2, day: '2026-11-11', coins: 240, score: 8 };
  assert.deepEqual(restoreForge(ok, stars), ok);
  assert.deepEqual(restoreForge({ ...ok, score: null }, stars), { ...ok, score: 0 });
  assert.equal(restoreForge(undefined, stars), null);
  assert.equal(restoreForge({ ...ok, tool: 'axe' }, stars), null);
  assert.equal(restoreForge({ ...ok, star: 1 }, stars), null);
  assert.equal(restoreForge({ ...ok, star: 3 }, stars), null);
  assert.equal(restoreForge({ ...ok, day: 'yesterday' }, stars), null);
  assert.equal(restoreForge({ ...ok, score: 30 }, stars).score, 10);
  assert.equal(restoreForge({ ...ok, coins: 'x' }, stars).coins, 240);
});
