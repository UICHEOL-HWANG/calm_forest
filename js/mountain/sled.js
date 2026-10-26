import { COURSE, centerX, obstacleRadius } from './course.js';
import { SLOPE_M_PER_UNIT } from './terrain.js';
import { JUMP, KICK_MULT, driftStep, comboStep, shieldStep, moverStep, launchStep, flyStep, startTrick } from './sled-moves.js';

export const PHYS_V = 5;

export const PHYS = Object.freeze({
  baseSpeed: 12.9,
  maxSpeed: 16,
  accel: 13.5,
  steerRate: 9.75,
  boostMult: 1.5,
  boostMs: 1333,
  boostJolt: 0.7,
  hitSlowMult: 0.5,
  hitRecoverMs: 1500,
  flagPenaltyMs: 1000,
  steerGrip: 37.5,
  steerGlide: 4.2,
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

export function createSled(acorns, phys = PHYS, { shield = 0 } = {}) {
  return {
    phys,
    x: centerX(0), z: 0, vx: 0, speed: phys.baseSpeed * 0.5, t: 0, acorns,
    boostLeftMs: 0, kickLeftMs: 0, slowLeftMs: 0, flagIdx: 0, flagsPassed: 0,
    splits: [], hits: [], hitIds: [], boostsAt: [],
    steerLeftMs: 0, steerRightMs: 0, finished: false,
    y: 0, vy: 0, air: false, trick: false, spin: 0,
    driftDir: 0, driftMs: 0, driftsAt: [], combo: 0, gustsAt: [],
    jumps: 0, tricksOk: 0, tricksFail: 0,
    shield, shieldUsed: 0, moverHitIds: [],
  };
}

export function pressSled(s) {
  if (s.finished) return s;
  return s.air ? startTrick(s) : tryBoost(s);
}

export function tryBoost(s) {
  if (s.finished || s.acorns <= 0) return s;
  const boosted = { ...s, acorns: s.acorns - 1, boostLeftMs: s.phys.boostMs, boostsAt: [...s.boostsAt, s.t] };
  const gap = targetSpeed(boosted) - s.speed;
  return gap > 0 ? { ...boosted, speed: s.speed + gap * (s.phys.boostJolt ?? 0) } : boosted;
}

function targetSpeed(s) {
  const boost = Math.max(s.boostLeftMs > 0 ? s.phys.boostMult : 1, s.kickLeftMs > 0 ? KICK_MULT : 1);
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
  const { x, vx } = slide(s, s.air ? steer * JUMP.airSteer : steer, dt, cx, half);
  const t = s.t + dtMs;
  const moved = {
    ...s, x, vx, z, speed, t,
    boostLeftMs: Math.max(0, s.boostLeftMs - dtMs),
    kickLeftMs: Math.max(0, (s.kickLeftMs || 0) - dtMs),
    slowLeftMs: Math.max(0, s.slowLeftMs - dtMs),
    steerLeftMs: s.steerLeftMs + (steer < 0 ? -steer * dtMs : 0),
    steerRightMs: s.steerRightMs + (steer > 0 ? steer * dtMs : 0),
  };
  const drifted = { ...moved, ...driftStep(s, moved, steer, dtMs) };
  const flagged = { ...drifted, ...crossFlags(drifted, x, t, course) };
  const combo = { ...flagged, ...comboStep(s.splits.length, flagged) };
  const struck = shieldStep(combo, collide(combo, course));
  const hit = s.air ? combo : shieldStep(struck, moverStep(struck, course));
  const flown = flyStep(launchStep(s, hit, course), dtMs);
  return { ...flown, finished: z >= course.length };
}

export function finalTimeMs(s, course = COURSE) {
  return s.t + (course.flags.length - s.flagsPassed) * PHYS.flagPenaltyMs;
}
