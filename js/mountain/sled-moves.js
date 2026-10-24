import { SLOPE_M_PER_UNIT } from './terrain.js';
import { moverPos } from './course.js';

export const DRIFT = Object.freeze({ min: 0.7, t1: 600, t2: 1400, ms1: 500, ms2: 900 });
export const JUMP = Object.freeze({ vy: 7.5, g: 20, airSteer: 0.35, spinMs: 550, okMs: 600, failMs: 800 });
export const COMBO = Object.freeze({ n: 3, ms: 1000 });
export const KICK_MULT = 1.35;
const MOVER_HALF = Object.freeze({ w: 0.43, l: 0.75 });

export function driftTier(s) {
  return s.driftMs >= DRIFT.t2 ? 2 : s.driftMs >= DRIFT.t1 ? 1 : 0;
}

export function driftStep(prev, next, steer, dtMs) {
  if (prev.air) return { driftDir: 0, driftMs: 0 };
  const dir = Math.abs(steer) >= DRIFT.min ? Math.sign(steer) : 0;
  if (dir && dir === prev.driftDir) return { driftMs: prev.driftMs + dtMs };
  const tier = driftTier(prev);
  const fire = prev.driftDir && tier;
  return {
    driftDir: dir,
    driftMs: 0,
    ...(fire ? {
      kickLeftMs: Math.max(next.kickLeftMs, tier === 2 ? DRIFT.ms2 : DRIFT.ms1),
      driftsAt: [...next.driftsAt, [next.t, tier]],
    } : {}),
  };
}

export function comboStep(prevSplits, next) {
  const fresh = next.splits.slice(prevSplits);
  if (!fresh.length) return {};
  return fresh.reduce((acc, [ok]) => {
    const combo = ok ? acc.combo + 1 : 0;
    if (combo < COMBO.n) return { ...acc, combo };
    return { combo: 0, gustsAt: [...acc.gustsAt, next.t], kickLeftMs: Math.max(acc.kickLeftMs, COMBO.ms) };
  }, { combo: next.combo, gustsAt: next.gustsAt, kickLeftMs: next.kickLeftMs });
}

export function shieldStep(before, after) {
  if (after.hits.length <= before.hits.length || after.shieldUsed >= after.shield) return after;
  return { ...after, slowLeftMs: before.slowLeftMs, shieldUsed: after.shieldUsed + 1 };
}

export function moverStep(s, course) {
  const movers = course.movers || [];
  const idx = movers.findIndex((m, i) => {
    if (s.moverHitIds.includes(i)) return false;
    const p = moverPos(m, s.t);
    const dx = Math.max(0, Math.abs(p.x - s.x) - MOVER_HALF.w);
    const dz = Math.max(0, Math.abs(p.z - s.z) * SLOPE_M_PER_UNIT - MOVER_HALF.l);
    return dx * dx + dz * dz < m.r * m.r;
  });
  if (idx < 0) return s;
  return {
    ...s,
    moverHitIds: [...s.moverHitIds, idx],
    hits: [...s.hits, [s.t, 'mover']],
    slowLeftMs: s.phys.hitRecoverMs,
  };
}

export function launchStep(prev, next, course) {
  if (prev.air) return next;
  const ramp = (course.ramps || []).find(r => prev.z < r.z && next.z >= r.z && Math.abs(next.x - r.x) <= r.half);
  if (!ramp) return next;
  return { ...next, air: true, vy: JUMP.vy, y: 0.01, jumps: next.jumps + 1 };
}

export function flyStep(s, dtMs) {
  if (!s.air) return s;
  const dt = dtMs / 1000;
  const y = s.y + s.vy * dt;
  const vy = s.vy - JUMP.g * dt;
  const spin = s.trick ? s.spin + dtMs / JUMP.spinMs : s.spin;
  if (y > 0) return { ...s, y, vy, spin };
  const landed = { ...s, y: 0, vy: 0, air: false, trick: false, spin: 0 };
  if (!s.trick) return landed;
  if (spin >= 1) return { ...landed, tricksOk: s.tricksOk + 1, kickLeftMs: Math.max(s.kickLeftMs, JUMP.okMs) };
  return { ...landed, tricksFail: s.tricksFail + 1, slowLeftMs: Math.max(s.slowLeftMs, JUMP.failMs) };
}

export function startTrick(s) {
  if (!s.air || s.trick) return s;
  return { ...s, trick: true, spin: 0 };
}
