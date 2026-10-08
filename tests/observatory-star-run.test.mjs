// 🔭 별 잇기 정산 — 하루 1회 보상·세이브 상태 (js/observatory/star-run.js) 동작 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as rhythm from '../js/observatory/rhythm.js';
import { gameSource } from './helpers/game-source.mjs';
import { ddaOutcome } from '../js/difficulty.js';
import * as constellations from '../js/observatory/constellations.js';

function run(day = '2026-10-04', starDay = null, star = undefined) {
  const paid = [], saves = [], events = [], settled = [], rows = [], abandons = [];
  const ctx = {
    gameState: { starDay, ...(star ? { star } : {}) },
    today: day,
    giveReward: (r, source, item) => paid.push([r, source, item]),
    requestSave: () => saves.push(1),
    trackEvent: (name, params) => events.push([name, params]),
    settleDifficulty: (game, o) => settled.push([game, o]),
    sendStarRun: row => rows.push(row),
    trackDiffAbandon: (...a) => abandons.push(a),
    diffParams: r => ({ ease: r.ease, dda: r.dda, arm: r.arm, ...(r.probe_v ? { probe_v: r.probe_v } : {}) }), ddaOutcome,
  };
  const c = vm.createContext({ ...rhythm, ...constellations, ...ctx, todayStr: () => c.today });
  vm.runInContext(readFileSync(new URL('../js/observatory/star-run.js', import.meta.url), 'utf8')
    .replace(/^import [\s\S]*?;\n/gm, '').replace(/^export /gm, ''), c);
  return { c, paid, saves, events, settled, rows, abandons };
}
const plain = v => JSON.parse(JSON.stringify(v));
const S = judges => rhythm.summarize(judges);
const ALL_PERFECT = Array(7).fill('perfect');
const FAILED = ['miss', 'miss', 'miss', 'miss', 'good', 'good', 'good'];

test('first success of the day pays 10 + 2×perfect, marks the day and saves', () => {
  const { c, paid, saves } = run('2026-10-04', null, { cleared: { big_dipper: '2026-10-01' }, plays: {}, best: {} });
  const r = c.starSettle(S(ALL_PERFECT));
  assert.deepEqual(plain(r), { coins: 24, bonus: 0, alreadyToday: false, firstClear: false, unlockedNext: null });
  assert.deepEqual(plain(paid), [[{ coins: 24 }, 'star_rhythm', 'big_dipper']]);
  assert.equal(c.gameState.starDay, '2026-10-04');
  assert.equal(saves.length, 1);
});

test('first clear of a constellation pays a one-time +30, records it and unlocks the next', () => {
  const { c, paid, events } = run();
  const r = c.starSettle(S(ALL_PERFECT), {}, null, { c: constellations.BY_ID.big_dipper, runId: 'r1' });
  assert.deepEqual(plain(r), { coins: 24, bonus: 30, alreadyToday: false, firstClear: true, unlockedNext: 'cassiopeia' });
  assert.deepEqual(plain(paid), [[{ coins: 24 }, 'star_rhythm', 'big_dipper'], [{ coins: 30 }, 'star_first_clear', 'big_dipper']]);
  assert.equal(c.gameState.star.cleared.big_dipper, '2026-10-04');
  assert.equal(c.gameState.star.best.big_dipper, 14);
  assert.deepEqual(plain(events.find(e => e[0] === 'star_unlock')[1]), { constellation: 'cassiopeia', from: 'big_dipper', run_id: 'r1' });
  // second clear: no bonus, no unlock
  const again = c.starSettle(S(ALL_PERFECT), {}, null, { c: constellations.BY_ID.big_dipper, runId: 'r2' });
  assert.equal(again.bonus, 0);
  assert.equal(again.unlockedNext, null);
});

test('a failed first try neither clears nor unlocks', () => {
  const { c, paid } = run();
  const r = c.starSettle(S(FAILED), {}, null, { c: constellations.BY_ID.big_dipper });
  assert.equal(r.firstClear, false);
  assert.equal(r.unlockedNext, null);
  assert.equal(c.gameState.star.cleared.big_dipper, undefined);
  assert.equal(paid.length, 0);
});

test('starBegin counts attempts per constellation and sends star_start with run_id', () => {
  const { c, events, saves } = run('2026-10-04', null, { cleared: { big_dipper: 'x' }, plays: { cassiopeia: 2 }, best: {} });
  const meta = c.starBegin(constellations.BY_ID.cassiopeia, { ease: 1, dda: 1, arm: 1 }, 'run-9');
  assert.deepEqual(plain(meta), { attemptN: 3, unlockedN: 2 });
  assert.equal(saves.length, 1, 'attempt count is saved even if the run is abandoned');
  assert.equal(c.gameState.star.plays.cassiopeia, 3);
  assert.deepEqual(plain(events.at(-1)), ['star_start', {
    constellation: 'cassiopeia', notes: 4, run_id: 'run-9', attempt_n: 3, unlocked_n: 2, ease: 1, dda: 1, arm: 1,
  }]);
});

const daily = paid => paid.filter(p => p[1] === 'star_rhythm');   // 하루 1회 보상만(첫 클리어 보너스는 따로 검사)

test('same-day replay is practice — nothing paid', () => {
  const { c, paid: all } = run('2026-10-04', '2026-10-04');
  const paid = daily(all);
  const r = c.starSettle(S(ALL_PERFECT));
  assert.equal(r.coins, 0);
  assert.equal(r.alreadyToday, true);
  assert.equal(paid.length, 0);
});

test('a failed run does not use up the day', () => {
  const { c, paid: all } = run();
  const paid = { get length() { return daily(all).length; } };
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
    constellation: 'big_dipper', notes: 7, max_score: 14, success: 1, perfect: 4, good: 2, miss: 1, max_combo: 4, score: 10,
    coins: 18, bonus_coins: 30, first_clear: 1, already_today: 0, duration_ms: 7013, early_taps: 0,
    run_id: '', attempt_n: 0, unlocked_n: 0,
    ease: 1.4, dda: 1, arm: 2,
  });
  // 🧮 탭별 배열은 GA4 25개 한도 때문에 star_detail 로 나눈다(run_id 로 잇는다)
  const [, d] = events.find(e => e[0] === 'star_detail');
  assert.deepEqual({ ...d }, {
    constellation: 'big_dipper', run_id: '', offsets: '3,-120,40,0,-10,150',
    judges: 'perfect,good,miss,perfect,perfect,good,perfect',
  });
  assert.ok(Object.keys(p).length + 2 <= 25, 'ts·platform 포함 25개 이하');
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

const ROW_KEYS = ['run_id', 'constellation', 'notes', 'tempo', 'attempt_n', 'unlocked_n', 'outcome', 'abandon_reason',
  'perfect', 'good', 'miss', 'early_taps', 'max_combo', 'score', 'max_score', 'judges', 'offsets', 'duration_ms',
  'coins', 'already_today', 'first_clear', 'unlocked_next', 'ease', 'arm', 'dda', 'probe_v'];

test('every settled run becomes one star_runs row whose columns match the migration', () => {
  const sql = readFileSync(new URL('../sql/migrations/migrate_star_runs.sql', import.meta.url), 'utf8');
  for (const k of ROW_KEYS) assert.match(sql, new RegExp(`^\\s+${k}\\s`, 'm'), `migration lacks ${k}`);
  const { c, rows } = run();
  const RUN2 = { ...RUN, noteOffsets: [3, -120, null, 40, 0, -10, 150], earlyTaps: 2 };
  c.starSettle(S(RUN.judges), RUN2, { ease: 1.4, dda: 1, arm: 2, probe_v: 2 },
    { c: constellations.BY_ID.big_dipper, runId: 'r-1', attemptN: 1, unlockedN: 1 });
  assert.equal(rows.length, 1);
  assert.deepEqual(Object.keys(rows[0]).sort(), [...ROW_KEYS].sort());
  assert.deepEqual(plain(rows[0]), {
    run_id: 'r-1', constellation: 'big_dipper', notes: 7, tempo: 1, attempt_n: 1, unlocked_n: 1,
    outcome: 'success', abandon_reason: null, perfect: 4, good: 2, miss: 1, early_taps: 2, max_combo: 4,
    score: 10, max_score: 14, judges: RUN.judges, offsets: [3, -120, null, 40, 0, -10, 150], duration_ms: 7013,
    coins: 48, already_today: false, first_clear: true, unlocked_next: 'cassiopeia',
    ease: 1.4, arm: 2, dda: 1, probe_v: 2,
  });
});

test('abandon: GA4 minigame_abandon with the run id + an abandon row, no DDA, no payout', () => {
  const { c, rows, abandons, settled, paid } = run();
  const diff = { ease: 1, dda: 1, arm: 0, probe_v: 2 };
  c.starAbandon('esc', { judges: ['perfect', 'miss'], noteOffsets: [5, null], earlyTaps: 0, durationMs: 2100 }, diff,
    { c: constellations.BY_ID.leo, runId: 'r-2', attemptN: 4, unlockedN: 4 });
  assert.deepEqual(plain(abandons), [['star', diff, 'esc', { constellation: 'leo', notes: 9, run_id: 'r-2', done: 2 }]]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].outcome, 'abandon');
  assert.equal(rows[0].abandon_reason, 'esc');
  assert.equal(rows[0].max_score, 18);
  assert.equal(rows[0].coins, 0);
  assert.equal(settled.length, 0);
  assert.equal(paid.length, 0);
});

test('gameState.star has a default and survives save/load (old Big Dipper winners count as cleared)', () => {
  const src = gameSource();
  assert.match(src, /star: \{ cleared: \{\}, plays: \{\}, best: \{\} \},/);
  assert.match(src, /gameState\.star = restoreStar\(saved\.star, saved\.starDay\)/);
});
