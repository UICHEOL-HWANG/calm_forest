import { BOATS } from './boats.js';
import { RIVER_OBS, BOAT_BOOST_CD } from './consts.js';

export const COMBO_WINDOW = 1.5;
export const NEAR_BAND = 0.6;
export const NEAR_GAIN = 0.35;
export const HIT_PAD = 0.7;
export const RIDE = { spin: 0.8, boost: 1.4, boostDur: 1.5 };

const lvAt = (arr, lv) => arr[Math.max(0, Math.min(arr.length - 1, lv || 0))];
const B = id => BOATS[id] || BOATS.ferry;

export function comboStep(c, t) {
  const n = t - c.last <= COMBO_WINDOW ? c.n + 1 : 1;
  return { n, last: t, bonus: n % 10 === 0 ? 1 : 0 };
}

export const steerParams = id => ({ acc: 26 * B(id).steer, maxVx: 6.2 * B(id).steer });
export const boostCd = windLv => BOAT_BOOST_CD - lvAt([0, 0.3, 0.55, 0.8], windLv);
export const hitRadius = (id, kind) => RIVER_OBS[kind].r * B(id).hitR;
export const isHit = (dx, id, kind) => dx < hitRadius(id, kind) + HIT_PAD;

export function isNearMiss(dx, id, kind) {
  if (kind !== 'rock' && kind !== 'log') return false;
  const edge = hitRadius(id, kind) + HIT_PAD;
  return dx >= edge && dx < edge + NEAR_BAND;
}

export function obstacleOutcome(id, kind, ctx) {
  if (ctx.diving) return 'pass';
  if (B(id).logPush && kind === 'log') return 'push';
  if (ctx.ramLeft > 0 && kind === 'rock') return 'ram';
  return 'hit';
}

export const ramPerRun = lv => lvAt([0, 1, 1, 2], lv);
export const whirlMode = id => B(id).whirl;
export const skillReady = (skill, t, readyAt) => !!skill && t >= readyAt;
export const startSkill = (skill, t) => ({ until: t + skill.dur, readyAt: t + skill.cd });
