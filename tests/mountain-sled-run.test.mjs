import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { ddaOutcome } from '../js/difficulty.js';
import { PHYS, PHYS_V, finalTimeMs } from '../js/mountain/sled.js';
import { COURSE, COURSE_V } from '../js/mountain/course.js';
import { GHOST_V } from '../js/mountain/sled-extras.js';

function run(day = '2026-10-20', mountain = undefined) {
  const paid = [], saves = [], events = [], settled = [], rows = [], abandons = [], plays = [];
  const ctx = {
    gameState: { ...(mountain ? { mountain } : {}), firstDay: '2026-10-18' },
    today: day,
    giveReward: (r, source, item) => paid.push([r, source, item]),
    requestSave: () => saves.push(1),
    trackEvent: (name, params) => events.push([name, { ...params, ts: 1, platform: 'web', exp_arm: 'a' }]),
    settleDifficulty: (g, o) => settled.push([g, o]),
    sendSledRun: row => rows.push(row),
    trackDiffAbandon: (...a) => abandons.push(a),
    onPlay: src => plays.push(src),
    diffParams: r => ({ ease: r.ease, dda: r.dda, arm: r.arm, probe_v: 2 }),
    ddaOutcome, finalTimeMs, PHYS, PHYS_V, COURSE, COURSE_V, GHOST_V,
  };
  const c = vm.createContext({ ...ctx, todayStr: () => c.today });
  vm.runInContext(readFileSync(new URL('../js/mountain/sled-run.js', import.meta.url), 'utf8')
    .replace(/^import [\s\S]*?;\n/gm, '').replace(/^export /gm, ''), c);
  return { c, paid, saves, events, settled, rows, abandons, plays };
}

const plain = v => JSON.parse(JSON.stringify(v));
const CTX = { runId: 'r1', diff: { ease: 1, dda: 1, arm: 1 }, acornsAvailable: 6, acornsCollected: 4, climbMs: 41000, daysSinceUnlock: 1, input: 'touch', orientation: 'portrait' };
const SLED = (t, flags) => ({ t, flagsPassed: flags, splits: Array.from({ length: 12 }, (_, i) => [i < flags, i * 3000]), hits: [[5000, 'rock']], boostsAt: [1000, 9000], steerLeftMs: 4000, steerRightMs: 3500, acorns: 2 });

test('first three finishes of the day pay, the fourth does not', () => {
  const { c, paid } = run();
  c.sledBegin(CTX);
  const results = [0, 1, 2, 3].map(() => c.sledSettle(SLED(40000, 12), CTX, { fpsAvg: 58 }));
  assert.deepEqual(results.map(r => r.rewarded), [true, true, true, false]);
  assert.equal(paid.filter(p => p[1] === 'sled_run').length, 3);
  assert.equal(results[3].leftToday, 0);
});

test('coins are base + perFlag×flags, new best adds bonus', () => {
  const { c, paid } = run();
  const r = c.sledSettle(SLED(40000, 10), CTX, { fpsAvg: 58 });
  assert.equal(r.timeMs, 40000 + 2 * PHYS.flagPenaltyMs);
  assert.equal(r.newBest, true);
  assert.deepEqual(plain(paid[0]), [{ coins: 15 + 2 * 10 }, 'sled_run', 'v2']);
  assert.deepEqual(plain(paid[1]), [{ coins: 10 }, 'sled_best', 'v2']);
});

test('a new day resets the reward counter', () => {
  const { c } = run('2026-10-21', { sled: { best: 39000, plays: 9, daily: { date: '2026-10-20', rewarded: 3 } } });
  assert.equal(c.sledSettle(SLED(42000, 12), CTX, { fpsAvg: 60 }).rewarded, true);
});

test('settle saves, settles difficulty with flag share and sends one full row', () => {
  const { c, saves, settled, rows } = run();
  c.sledBegin(CTX);
  c.sledSettle(SLED(40000, 9), CTX, { fpsAvg: 57.4 });
  assert.ok(saves.length >= 1);
  assert.deepEqual(plain(settled), [['sled', 0.75]]);
  const row = rows[0];
  for (const k of ['run_id', 'outcome', 'time_ms', 'flags_passed', 'penalty_ms', 'rewarded', 'splits', 'boosts_at', 'hits', 'steer_left_ms', 'steer_right_ms', 'attempt_n', 'days_since_unlock', 'best_before_ms', 'acorns_available', 'acorns_collected', 'climb_ms', 'input', 'orientation', 'fps_avg', 'course_v', 'phys_v', 'ease', 'arm', 'dda', 'probe_v', 'coins']) {
    assert.ok(k in row, `missing ${k}`);
  }
  assert.equal(row.outcome, 'finish');
  assert.equal(row.course_v, 2);
});

test('steer ms report the screen side pressed: world -x (steerLeftMs) is screen-right, world +x (steerRightMs) is screen-left', () => {
  const { c, rows } = run();
  c.sledSettle(SLED(40000, 12), CTX, { fpsAvg: 58 });
  assert.equal(rows[0].steer_right_ms, 4000);
  assert.equal(rows[0].steer_left_ms, 3500);
});

test('abandon sends an abandon row, pays nothing and does not move DDA', () => {
  const { c, paid, settled, rows, abandons } = run();
  c.sledAbandon('climb', CTX, null);
  assert.equal(paid.length, 0);
  assert.equal(settled.length, 0);
  assert.equal(rows[0].outcome, 'abandon');
  assert.equal(rows[0].abandon_stage, 'climb');
  assert.equal(abandons[0][0], 'sled');
});

test('every GA4 payload stays within 25 params and carries no arrays', () => {
  const { c, events } = run();
  c.sledBegin(CTX);
  c.sledSettle(SLED(40000, 12), CTX, { fpsAvg: 58 });
  for (const [name, p] of events) {
    const sent = Object.values(p).filter(v => v !== null && v !== undefined);
    assert.ok(sent.length <= 25, `${name} has ${sent.length}`);
    assert.ok(!sent.some(Array.isArray), `${name} has an array`);
  }
  assert.deepEqual(events.map(e => e[0]), ['sled_start', 'sled_result']);
});

test('fractional times are rounded to integers everywhere', () => {
  const { c, rows } = run();
  const r = c.sledSettle(SLED(40000.67, 12), { ...CTX, climbMs: 41000.4 }, { fpsAvg: 58 });
  assert.ok(Number.isInteger(r.timeMs));
  assert.ok(Number.isInteger(c.gameState.mountain.sled.best));
  assert.ok(Number.isInteger(rows[0].time_ms));
  assert.ok(Number.isInteger(rows[0].best_before_ms ?? 0));
  assert.ok(Number.isInteger(rows[0].climb_ms));
});

test('a faster fourth run updates best without paying', () => {
  const { c, paid } = run();
  [0, 1, 2].forEach(() => c.sledSettle(SLED(40000, 12), CTX, { fpsAvg: 58 }));
  const r = c.sledSettle(SLED(38000, 12), CTX, { fpsAvg: 58 });
  assert.equal(r.rewarded, false);
  assert.equal(c.gameState.mountain.sled.best, 38000);
  assert.equal(paid.filter(p => p[1] === 'sled_run').length, 3);
});

test('abandon rows carry no penalty, finish rows count missed flags', () => {
  const { c, rows } = run();
  c.sledAbandon('sled', CTX, SLED(12000, 3));
  c.sledAbandon('climb', CTX, null);
  c.sledSettle(SLED(40000, 10), CTX, { fpsAvg: 58 });
  assert.equal(rows[0].penalty_ms, null);
  assert.equal(rows[0].flags_passed, 3);
  assert.equal(rows[1].penalty_ms, null);
  assert.equal(rows[2].penalty_ms, 2 * PHYS.flagPenaltyMs);
});

test('idle time at the hut is recorded as an integer and sent with sled_start', () => {
  const { c, rows, events } = run();
  c.sledBegin({ ...CTX, idleMs: 5400.7 });
  c.sledSettle(SLED(40000, 12), { ...CTX, idleMs: 5400.7 }, { fpsAvg: 58 });
  assert.equal(rows[0].idle_ms, 5401);
  assert.equal(events[0][1].idle_ms, 5401);
});

test('idle time is null for an abandon on the climb', () => {
  const { c, rows } = run();
  c.sledAbandon('climb', CTX, null);
  assert.equal(rows[0].idle_ms, null);
});

test('a 12-flag finish marks the run history as perfect, fewer flags do not', () => {
  const a = run();
  a.c.sledSettle(SLED(40000, 11), CTX, { fpsAvg: 58 });
  assert.equal(a.c.gameState.mountain.sled.perfect, false);
  a.c.sledSettle(SLED(40000, 12), CTX, { fpsAvg: 58 });
  assert.equal(a.c.gameState.mountain.sled.perfect, true);
  a.c.sledSettle(SLED(40000, 3), CTX, { fpsAvg: 58 });
  assert.equal(a.c.gameState.mountain.sled.perfect, true);
});

test('sled_start carries the sled colour', () => {
  const { c, events } = run();
  c.sledBegin({ ...CTX, sledSkin: 'sky' });
  assert.equal(events[0][1].sled_skin, 'sky');
});

test('row records the sled id and the current physics version', () => {
  const { c, rows } = run();
  c.sledSettle(SLED(40000, 12), { ...CTX, sledSkin: 'acorn' }, { fpsAvg: 58 });
  c.sledAbandon('climb', CTX, null);
  assert.equal(rows[0].sled, 'acorn');
  assert.equal(rows[0].phys_v, PHYS_V);
  assert.equal(rows[0].phys_v, 4);
  assert.equal(rows[1].sled, 'basic');
});

test('every finished run rolls one decor drop, abandons do not', () => {
  const { c, plays } = run();
  c.sledSettle(SLED(40000, 12), CTX, { fpsAvg: 58 });
  c.sledSettle(SLED(41000, 12), CTX, { fpsAvg: 58 });
  c.sledAbandon('sled', CTX, SLED(12000, 3));
  assert.deepEqual(plays, ['sled', 'sled']);
});

test('a new best saves the run path as the ghost, later plays keep it', () => {
  const { c } = run();
  const pts = [[0, 0, 0], [13, 100, 0]];
  c.sledSettle({ ...SLED(24000, 12), t: 24000 }, CTX, { fpsAvg: 58, ghostPts: pts });
  assert.deepEqual(plain(c.gameState.mountain.sled.ghost), { v: GHOST_V, t: 24000, pts });
  c.sledSettle({ ...SLED(30000, 12), t: 30000 }, CTX, { fpsAvg: 58, ghostPts: [[0, 0, 0]] });
  assert.deepEqual(plain(c.gameState.mountain.sled.ghost.pts), pts);
  c.sledBegin(CTX);
  assert.deepEqual(plain(c.gameState.mountain.sled.ghost.pts), pts);
});
