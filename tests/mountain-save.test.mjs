import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { restoreMountain, MOUNTAIN_DEFAULT } from '../js/mountain/save.js';
import { ddaOutcome } from '../js/difficulty.js';
import { PHYS, PHYS_V, finalTimeMs } from '../js/mountain/sled.js';
import { COURSE, COURSE_V, minTimeMs } from '../js/mountain/course.js';
import { gameSource } from './helpers/game-source.mjs';

const plain = v => JSON.parse(JSON.stringify(v));
const DEFAULT = { sled: { best: null, plays: 0, daily: { date: null, rewarded: 0 }, perfect: false }, hut: { sleds: ['basic'], sled: 'basic' } };

test('valid mountain save is kept', () => {
  const saved = { sled: { best: 40000, plays: 7, daily: { date: '2026-10-20', rewarded: 2 }, perfect: true }, hut: { sleds: ['basic', 'sky', 'toboggan'], sled: 'sky' } };
  assert.deepEqual(plain(restoreMountain(saved)), saved);
});

test('restore returns a new object and drops unknown keys', () => {
  const saved = { sled: { best: 40000, plays: 7, daily: { date: '2026-10-20', rewarded: 2, extra: 1 }, junk: 1 }, other: { a: 1 } };
  const out = restoreMountain(saved);
  assert.notEqual(out, saved);
  assert.notEqual(out.sled, saved.sled);
  assert.deepEqual(plain(out), { sled: { best: 40000, plays: 7, daily: { date: '2026-10-20', rewarded: 2 }, perfect: false }, hut: { sleds: ['basic', 'toboggan'], sled: 'basic' } });
});

test('missing or non-object input gives defaults', () => {
  for (const v of [undefined, null, 0, 'x', [], {}, { sled: null }, { sled: 'x' }, { sled: [] }]) {
    assert.deepEqual(plain(restoreMountain(v)), DEFAULT, JSON.stringify(v));
  }
  assert.deepEqual(plain(MOUNTAIN_DEFAULT), DEFAULT);
});

test('best must be an integer at or above the course minimum', () => {
  const floor = minTimeMs(COURSE);
  assert.equal(floor, 13750);
  const best = b => restoreMountain({ sled: { best: b } }).sled.best;
  assert.equal(best(floor), floor);
  assert.equal(best(floor - 1), null);
  assert.equal(best(0), null);
  assert.equal(best(-5), null);
  assert.equal(best(40000.5), null);
  assert.equal(best('40000'), null);
  assert.equal(best(Infinity), null);
  assert.equal(best(NaN), null);
});

test('plays must be a non-negative integer', () => {
  const plays = p => restoreMountain({ sled: { plays: p } }).sled.plays;
  assert.equal(plays(0), 0);
  assert.equal(plays(12), 12);
  assert.equal(plays(-1), 0);
  assert.equal(plays(1.5), 0);
  assert.equal(plays('3'), 0);
});

test('daily needs a YYYY-MM-DD date and an integer rewarded 0-3', () => {
  const daily = d => plain(restoreMountain({ sled: { daily: d } }).sled.daily);
  const none = { date: null, rewarded: 0 };
  assert.deepEqual(daily({ date: '2026-10-20', rewarded: 0 }), { date: '2026-10-20', rewarded: 0 });
  assert.deepEqual(daily({ date: '2026-10-20', rewarded: 3 }), { date: '2026-10-20', rewarded: 3 });
  assert.deepEqual(daily({ date: '2026-10-20', rewarded: 4 }), none);
  assert.deepEqual(daily({ date: '2026-10-20', rewarded: -1 }), none);
  assert.deepEqual(daily({ date: '2026-10-20', rewarded: 1.5 }), none);
  assert.deepEqual(daily({ date: '2026-10-20' }), none);
  assert.deepEqual(daily({ date: '20261020', rewarded: 1 }), none);
  assert.deepEqual(daily({ date: 20261020, rewarded: 1 }), none);
  assert.deepEqual(daily('x'), none);
  assert.deepEqual(daily(null), none);
});

function harness(gameState, day = '2026-10-20') {
  const ctx = {
    gameState, giveReward: () => {}, requestSave: () => {}, trackEvent: () => {}, settleDifficulty: () => {},
    sendSledRun: () => {}, trackDiffAbandon: () => {}, diffParams: () => ({}), onPlay: () => {},
    ddaOutcome, finalTimeMs, PHYS, PHYS_V, COURSE, COURSE_V,
  };
  const c = vm.createContext({ ...ctx, todayStr: () => day });
  vm.runInContext(readFileSync(new URL('../js/mountain/sled-run.js', import.meta.url), 'utf8')
    .replace(/^import [\s\S]*?;\n/gm, '').replace(/^export /gm, ''), c);
  return c;
}

const CTX = { runId: 'r1', diff: null, acornsAvailable: 6, acornsCollected: 4, climbMs: 41000, daysSinceUnlock: 1, input: 'keys', orientation: 'landscape' };
const SLED = t => ({ t, flagsPassed: 12, splits: [], hits: [], boostsAt: [], steerLeftMs: 0, steerRightMs: 0, acorns: 0 });

test('reload keeps best, plays and the daily reward cap', () => {
  const before = harness({ firstDay: '2026-10-18' });
  [0, 1, 2].forEach(() => { before.sledBegin(CTX); before.sledSettle(SLED(40000), CTX); });
  const saved = JSON.parse(JSON.stringify({ ...before.gameState }));
  const after = harness({ firstDay: '2026-10-18' });
  after.gameState.mountain = restoreMountain(saved.mountain);
  assert.deepEqual(plain(after.sledState()), plain(before.sledState()));
  assert.deepEqual(plain(after.sledState()), { best: 40000, plays: 3, daily: { date: '2026-10-20', rewarded: 3 }, perfect: true });
  assert.equal(after.sledSettle(SLED(39000), CTX).rewarded, false);
});

test('game.js restores mountain through restoreMountain next to firstDay', () => {
  const src = gameSource();
  assert.match(src, /import \{ restoreMountain \} from '\.\/mountain\/save\.js';/);
  assert.match(src, /gameState\.firstDay = resolveFirstDay\(saved\.firstDay\);\n\s*gameState\.mountain = restoreMountain\(saved\.mountain\);/);
});

test('the restore cap matches the daily reward runs in sled-run.js', async () => {
  const { DAILY_REWARD_CAP } = await import('../js/mountain/save.js');
  const src = readFileSync(new URL('../js/mountain/sled-run.js', import.meta.url), 'utf8');
  assert.match(src, new RegExp(`export const DAILY_REWARD_RUNS = ${DAILY_REWARD_CAP};`));
});

test('hut state restores owned sled colours and keeps basic', async () => {
  const { restoreMountain } = await import('../js/mountain/save.js');
  assert.deepEqual(restoreMountain({}).hut, { sleds: ['basic'], sled: 'basic' });
  assert.deepEqual(restoreMountain({ hut: { sleds: ['sky', 'bogus', 'sky'], sled: 'sky' } }).hut, { sleds: ['basic', 'sky'], sled: 'sky' });
  assert.equal(restoreMountain({ hut: { sleds: ['sky'], sled: 'forest' } }).hut.sled, 'basic');
  assert.equal(restoreMountain({ sled: { perfect: true } }).sled.perfect, true);
  assert.equal(restoreMountain({ sled: { perfect: 'yes' } }).sled.perfect, false);
});

test('lineup sleds restore, unknown ids drop, and a finisher gets the toboggan', () => {
  assert.deepEqual(plain(restoreMountain({ hut: { sleds: ['basic', 'wind', 'acorn', 'zzz'], sled: 'acorn' } }).hut), { sleds: ['basic', 'wind', 'acorn'], sled: 'acorn' });
  assert.deepEqual(plain(restoreMountain({ hut: { sleds: ['basic', 'sky'], sled: 'sky' } }).hut), { sleds: ['basic', 'sky'], sled: 'sky' });
  assert.ok(restoreMountain({ sled: { best: 40000, plays: 3 } }).hut.sleds.includes('toboggan'));
  assert.ok(!restoreMountain({}).hut.sleds.includes('toboggan'));
});
