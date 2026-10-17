import { COURSE, centerX, obstacleRadius } from './course.js';
import { SLOPE_M_PER_UNIT } from './terrain.js';

export const PHYS_V = 3;

export const PHYS = Object.freeze({
  baseSpeed: 8.6,
  maxSpeed: 16,
  accel: 6.0,
  steerRate: 6.5,
  boostMult: 1.5,
  boostMs: 2000,
  hitSlowMult: 0.5,
  hitRecoverMs: 1500,
  flagPenaltyMs: 1000,
  steerGrip: 25,
  steerGlide: 2.8,
  edgeBounce: 0.3,
});

export const SLED_HALF = Object.freeze({ w: 0.43, l: 0.75 });

export function overlapsObstacle(s, o) {
  const dx = Math.max(0, Math.abs(s.x - o.x) - SLED_HALF.w);
  const dz = Math.max(0, Math.abs(s.z - o.z) * SLOPE_M_PER_UNIT - SLED_HALF.l);
  const r = obstacleRadius(o);
  return dx * dx + dz * dz < r * r;
}

export function hitReach(o) {
  const r = obstacleRadius(o);
  return { x: r + SLED_HALF.w, z: (r + SLED_HALF.l) / SLOPE_M_PER_UNIT };
}

export function createSled(acorns, phys = PHYS) {
  return {
    phys,
    x: centerX(0), z: 0, vx: 0, speed: phys.baseSpeed * 0.5, t: 0, acorns,
    boostLeftMs: 0, slowLeftMs: 0, flagIdx: 0, flagsPassed: 0,
    splits: [], hits: [], hitIds: [], boostsAt: [],
    steerLeftMs: 0, steerRightMs: 0, finished: false,
  };
}

export function tryBoost(s) {
  if (s.finished || s.acorns <= 0) return s;
  return { ...s, acorns: s.acorns - 1, boostLeftMs: s.phys.boostMs, boostsAt: [...s.boostsAt, s.t] };
}

function targetSpeed(s) {
  const boost = s.boostLeftMs > 0 ? s.phys.boostMult : 1;
  const slow = s.slowLeftMs > 0 ? s.phys.hitSlowMult : 1;
  return Math.min(s.phys.maxSpeed * s.phys.boostMult, s.phys.baseSpeed * boost * slow);
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
    !s.hitIds.includes(i) && overlapsObstacle(s, o));
  if (idx < 0) return s;
  return {
    ...s,
    hitIds: [...s.hitIds, idx],
    hits: [...s.hits, [s.t, course.obstacles[idx].kind]],
    slowLeftMs: s.phys.hitRecoverMs,
  };
}

function slide(s, steer, dt, cx, half) {
  const p = { ...PHYS, ...s.phys };
  const target = steer * p.steerRate;
  const rate = steer ? p.steerGrip : p.steerGlide;
  const v = (s.vx || 0) + (target - (s.vx || 0)) * (1 - Math.exp(-rate * dt));
  const x = s.x + v * dt;
  if (x < cx - half) return { x: cx - half, vx: steer < 0 ? 0 : Math.abs(v) * p.edgeBounce };
  if (x > cx + half) return { x: cx + half, vx: steer > 0 ? 0 : -Math.abs(v) * p.edgeBounce };
  return { x, vx: v };
}

export function stepSled(s, dtMs, steer, course = COURSE) {
  if (s.finished) return s;
  const dt = dtMs / 1000;
  const goal = targetSpeed(s);
  const rate = s.phys.accel * dt * (goal < s.speed ? 4 : 1);
  const speed = s.speed + Math.sign(goal - s.speed) * Math.min(Math.abs(goal - s.speed), rate);
  const z = Math.min(course.length, s.z + speed * dt);
  const half = course.width / 2;
  const cx = centerX(z);
  const { x, vx } = slide(s, steer, dt, cx, half);
  const t = s.t + dtMs;
  const moved = {
    ...s, x, vx, z, speed, t,
    boostLeftMs: Math.max(0, s.boostLeftMs - dtMs),
    slowLeftMs: Math.max(0, s.slowLeftMs - dtMs),
    steerLeftMs: s.steerLeftMs + (steer < 0 ? -steer * dtMs : 0),
    steerRightMs: s.steerRightMs + (steer > 0 ? steer * dtMs : 0),
  };
  const flagged = { ...moved, ...crossFlags(moved, x, t, course) };
  const hit = collide(flagged, course);
  return { ...hit, finished: z >= course.length };
}

export function finalTimeMs(s, course = COURSE) {
  return s.t + (course.flags.length - s.flagsPassed) * PHYS.flagPenaltyMs;
}
