import { diffParams, gameState, giveReward, requestSave, settleDifficulty, todayStr, trackDiffAbandon } from '../game.js';
import { trackEvent } from '../analytics.js';
import { sendSledRun } from '../supabase-client.js';
import { ddaOutcome } from '../difficulty.js';
import { finalTimeMs, PHYS, PHYS_V } from './sled.js';
import { COURSE, COURSE_V } from './course.js';

export const DAILY_REWARD_RUNS = 3;
export const SLED_COINS = { base: 15, perFlag: 2, newBest: 10 };

export function sledState() {
  const s = gameState.mountain?.sled || {};
  const daily = s.daily && typeof s.daily === 'object' ? s.daily : {};
  return {
    best: Number.isFinite(s.best) ? s.best : null,
    plays: Number.isFinite(s.plays) ? s.plays : 0,
    daily: {
      date: typeof daily.date === 'string' ? daily.date : null,
      rewarded: Number.isFinite(daily.rewarded) ? daily.rewarded : 0,
    },
  };
}

function writeSled(next) {
  gameState.mountain = { ...(gameState.mountain || {}), sled: next };
}

function rewardedToday(st, today) {
  return st.daily.date === today ? st.daily.rewarded : 0;
}

export function sledBegin(ctx) {
  const st = sledState();
  const attemptN = st.plays + 1;
  writeSled({ ...st, plays: attemptN });
  requestSave();
  trackEvent('sled_start', {
    run_id: ctx.runId, attempt_n: attemptN, course_v: COURSE_V, acorns: ctx.acornsCollected,
    ...(ctx.diff ? diffParams(ctx.diff) : {}),
  });
  return { attemptN };
}

function sledRow(ctx, outcome, stage, sled, timeMs, pay, bestBefore) {
  const dp = ctx.diff ? diffParams(ctx.diff) : {};
  return {
    run_id: ctx.runId,
    outcome,
    abandon_stage: stage,
    time_ms: timeMs,
    flags_passed: sled ? sled.flagsPassed : null,
    penalty_ms: sled ? (COURSE.flags.length - sled.flagsPassed) * PHYS.flagPenaltyMs : null,
    rewarded: !!pay.rewarded,
    coins: pay.coins || 0,
    splits: sled ? sled.splits : null,
    boosts_at: sled ? sled.boostsAt : null,
    hits: sled ? sled.hits : null,
    steer_left_ms: sled ? Math.round(sled.steerLeftMs) : null,
    steer_right_ms: sled ? Math.round(sled.steerRightMs) : null,
    attempt_n: sledState().plays,
    days_since_unlock: ctx.daysSinceUnlock,
    best_before_ms: bestBefore,
    acorns_available: ctx.acornsAvailable,
    acorns_collected: ctx.acornsCollected,
    climb_ms: Number.isFinite(ctx.climbMs) ? Math.round(ctx.climbMs) : null,
    input: ctx.input,
    orientation: ctx.orientation,
    fps_avg: pay.fpsAvg ?? null,
    course_v: COURSE_V,
    phys_v: PHYS_V,
    ease: dp.ease ?? null,
    arm: dp.arm ?? null,
    dda: dp.dda ?? null,
    probe_v: dp.probe_v ?? null,
  };
}

export function sledSettle(sled, ctx, env = {}) {
  const today = todayStr();
  const st = sledState();
  const timeMs = Math.round(finalTimeMs(sled));
  const done = rewardedToday(st, today);
  const rewarded = done < DAILY_REWARD_RUNS;
  const newBest = st.best === null || timeMs < st.best;
  let coins = 0;
  if (rewarded) {
    coins = SLED_COINS.base + SLED_COINS.perFlag * sled.flagsPassed;
    giveReward({ coins }, 'sled_run', `v${COURSE_V}`);
    if (newBest) {
      giveReward({ coins: SLED_COINS.newBest }, 'sled_best', `v${COURSE_V}`);
      coins += SLED_COINS.newBest;
    }
  }
  const doneAfter = rewarded ? done + 1 : done;
  writeSled({ ...st, best: newBest ? timeMs : st.best, daily: { date: today, rewarded: doneAfter } });
  requestSave();
  if (ctx.diff) settleDifficulty('sled', ddaOutcome('sled', { flagsPassed: sled.flagsPassed }));
  trackEvent('sled_result', {
    run_id: ctx.runId, time_ms: timeMs, flags: sled.flagsPassed, boosts: sled.boostsAt.length,
    acorns: ctx.acornsCollected, hits: sled.hits.length, new_best: newBest ? 1 : 0, rewarded: rewarded ? 1 : 0,
    ...(ctx.diff ? diffParams(ctx.diff) : {}),
  });
  sendSledRun(sledRow(ctx, 'finish', null, sled, timeMs, { rewarded, coins, fpsAvg: env.fpsAvg }, st.best));
  return { timeMs, coins, rewarded, newBest, leftToday: Math.max(0, DAILY_REWARD_RUNS - doneAfter) };
}

export function sledAbandon(stage, ctx, sled) {
  trackDiffAbandon('sled', ctx.diff, stage, { run_id: ctx.runId });
  sendSledRun(sledRow(ctx, 'abandon', stage, sled, null, { rewarded: false, coins: 0 }, sledState().best));
}
