import { COURSE, centerX } from './course.js';

export const PHYS_V = 1;

export const PHYS = Object.freeze({
  baseSpeed: 8.6,
  maxSpeed: 16,
  accel: 6.0,
  steerRate: 6.5,
  boostMult: 1.5,
  boostMs: 2000,
  hitSlowMult: 0.55,
  hitRecoverMs: 900,
  flagPenaltyMs: 1000,
});

export function createSled(acorns) {
  return {
    x: centerX(0), z: 0, speed: PHYS.baseSpeed * 0.5, t: 0, acorns,
    boostLeftMs: 0, slowLeftMs: 0, flagIdx: 0, flagsPassed: 0,
    splits: [], hits: [], hitIds: [], boostsAt: [],
    steerLeftMs: 0, steerRightMs: 0, finished: false,
  };
}

export function tryBoost(s) {
  if (s.finished || s.acorns <= 0) return s;
  return { ...s, acorns: s.acorns - 1, boostLeftMs: PHYS.boostMs, boostsAt: [...s.boostsAt, s.t] };
}

function targetSpeed(s) {
  const boost = s.boostLeftMs > 0 ? PHYS.boostMult : 1;
  const slow = s.slowLeftMs > 0 ? PHYS.hitSlowMult : 1;
  return Math.min(PHYS.maxSpeed * PHYS.boostMult, PHYS.baseSpeed * boost * slow);
}

function crossFlags(s, x, t, course) {
  let { flagIdx, flagsPassed, splits } = s;
  while (flagIdx < course.flags.length && course.flags[flagIdx].z <= s.z) {
    const f = course.flags[flagIdx];
    const ok = Math.abs(x - f.x) <= f.half;
    splits = [...splits, [ok, t]];
    flagsPassed += ok ? 1 : 0;
    flagIdx += 1;
  }
  return { flagIdx, flagsPassed, splits };
}

function collide(s, course) {
  const idx = course.obstacles.findIndex((o, i) =>
    !s.hitIds.includes(i) && Math.abs(s.z - o.z) < o.r && Math.abs(s.x - o.x) < o.r);
  if (idx < 0) return s;
  return {
    ...s,
    hitIds: [...s.hitIds, idx],
    hits: [...s.hits, [s.t, course.obstacles[idx].kind]],
    slowLeftMs: PHYS.hitRecoverMs,
  };
}

export function stepSled(s, dtMs, steer, course = COURSE) {
  if (s.finished) return s;
  const dt = dtMs / 1000;
  const goal = targetSpeed(s);
  const rate = PHYS.accel * dt * (goal < s.speed ? 4 : 1);
  const speed = s.speed + Math.sign(goal - s.speed) * Math.min(Math.abs(goal - s.speed), rate);
  const z = Math.min(course.length, s.z + speed * dt);
  const half = course.width / 2;
  const cx = centerX(z);
  const x = Math.max(cx - half, Math.min(cx + half, s.x + steer * PHYS.steerRate * dt));
  const t = s.t + dtMs;
  const moved = {
    ...s, x, z, speed, t,
    boostLeftMs: Math.max(0, s.boostLeftMs - dtMs),
    slowLeftMs: Math.max(0, s.slowLeftMs - dtMs),
    steerLeftMs: s.steerLeftMs + (steer < 0 ? dtMs : 0),
    steerRightMs: s.steerRightMs + (steer > 0 ? dtMs : 0),
  };
  const flagged = { ...moved, ...crossFlags(moved, x, t, course) };
  const hit = collide(flagged, course);
  return { ...hit, finished: z >= course.length };
}

export function finalTimeMs(s, course = COURSE) {
  return s.t + (course.flags.length - s.flagsPassed) * PHYS.flagPenaltyMs;
}
