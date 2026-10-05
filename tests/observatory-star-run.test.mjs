// 🔭 별 잇기 정산 — 하루 1회 보상·세이브 상태 (js/observatory/star-run.js) 동작 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as rhythm from '../js/observatory/rhythm.js';
import { gameSource } from './helpers/game-source.mjs';
import { ddaOutcome } from '../js/difficulty.js';

function run(day = '2026-10-04', starDay = null) {
  const paid = [], saves = [], events = [], settled = [];
  const ctx = {
    gameState: { starDay },
    today: day,
    giveReward: (r, source, item) => paid.push([r, source, item]),
    requestSave: () => saves.push(1),
    trackEvent: (name, params) => events.push([name, params]),
    settleDifficulty: (game, o) => settled.push([game, o]),
    diffParams: r => ({ ease: r.ease, dda: r.dda, arm: r.arm }), ddaOutcome,
  };
  const c = vm.createContext({ ...rhythm, ...ctx, todayStr: () => c.today });
  vm.runInContext(readFileSync(new URL('../js/observatory/star-run.js', import.meta.url), 'utf8')
    .replace(/^import [\s\S]*?;\n/gm, '').replace(/^export /gm, ''), c);
  return { c, paid, saves, events, settled };
}
const S = judges => rhythm.summarize(judges);
const ALL_PERFECT = Array(7).fill('perfect');
const FAILED = ['miss', 'miss', 'miss', 'miss', 'good', 'good', 'good'];

test('first success of the day pays 10 + 2×perfect, marks the day and saves', () => {
  const { c, paid, saves } = run();
  const r = c.starSettle(S(ALL_PERFECT));
  assert.deepEqual({ ...r }, { coins: 24, alreadyToday: false });
  assert.deepEqual(JSON.parse(JSON.stringify(paid)), [[{ coins: 24 }, 'star_rhythm', 'big_dipper']]);
  assert.equal(c.gameState.starDay, '2026-10-04');
  assert.equal(saves.length, 1);
});

test('same-day replay is practice — nothing paid', () => {
  const { c, paid } = run('2026-10-04', '2026-10-04');
  const r = c.starSettle(S(ALL_PERFECT));
  assert.equal(r.coins, 0);
  assert.equal(r.alreadyToday, true);
  assert.equal(paid.length, 0);
});

test('a failed run does not use up the day', () => {
  const { c, paid } = run();
  assert.equal(c.starSettle(S(FAILED)).coins, 0);
  assert.equal(c.gameState.starDay, null);
  assert.equal(c.starSettle(S(['good', 'good', 'good', 'good', 'good', 'good', 'perfect'])).coins, 12);
  assert.equal(paid.length, 1);
});

test('a new day pays again', () => {
  const { c } = run('2026-10-05', '2026-10-04');
  assert.equal(c.starSettle(S(ALL_PERFECT)).coins, 24);
  assert.equal(c.gameState.starDay, '2026-10-05');
});

test('starDay has a default and survives a save/load round trip', () => {
  const src = gameSource();
  assert.match(src, /starDay: null,/, 'gameState default');
  const restore = /if \(typeof saved\.starDay === 'string'\) gameState\.starDay = saved\.starDay;/;
  assert.match(src, restore, 'restore from save');
  // getGameState spreads gameState, so the field rides along in every save
  assert.match(src, /return \{ \.\.\.gameState,/);
});

const DIFF = { ease: 1.4, dda: 1, arm: 2 };
const RUN = { judges: ['perfect', 'good', 'miss', 'perfect', 'perfect', 'good', 'perfect'], offsets: [3, -120, 40, 0, -10, 150], durationMs: 7012.6 };

test('star_result carries the run, the payout and the rolled difficulty; DDA learns score/14', () => {
  const { c, events, settled } = run();
  const summary = S(RUN.judges);
  c.starSettle(summary, RUN, DIFF);
  const [name, p] = events.find(e => e[0] === 'star_result');
  assert.equal(name, 'star_result');
  assert.deepEqual({ ...p }, {
    constellation: 'big_dipper', success: 1, perfect: 4, good: 2, miss: 1, max_combo: 4, score: 10,
    coins: 18, already_today: 0, offsets: '3,-120,40,0,-10,150',
    judges: 'perfect,good,miss,perfect,perfect,good,perfect', duration_ms: 7013,
    ease: 1.4, dda: 1, arm: 2,
  });
  assert.deepEqual(settled, [['star', 10 / 14]]);
});

test('no difficulty rolled → no DDA update, still tracked', () => {
  const { c, events, settled } = run();
  c.starSettle(S(RUN.judges), RUN, null);
  assert.equal(settled.length, 0);
  assert.equal(events.filter(e => e[0] === 'star_result').length, 1);
});

test('DIFFICULTY.star exists and its ease is the same "bigger = easier" as rhythm.js', async () => {
  const { DIFFICULTY } = await import('../js/tuning.js');
  const { easeFor, ddaOutcome } = await import('../js/difficulty.js');
  assert.deepEqual(DIFFICULTY.star, { arms: [0.7, 1.0, 1.4], target: 0.78, ddaOn: true });
  const eases = [0, 1, 2].map(n => easeFor('star', 'device-1', n).ease).sort();
  assert.deepEqual(eases, [0.7, 1, 1.4]);
  // bigger ease → wider judge window and slower comet = easier, matching DIFFICULTY's convention
  assert.equal(rhythm.judgeTap(110, 1.4), 'perfect');
  assert.equal(rhythm.judgeTap(110, 0.7), 'good');
  assert.equal(ddaOutcome('star', { score: 14 }), 1);
  assert.equal(ddaOutcome('star', { score: 7 }), 0.5);
});
