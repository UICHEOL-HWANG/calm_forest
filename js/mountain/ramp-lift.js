import { slopePoint } from './terrain.js';
import { SLED_HALF } from './sled.js';

export const RAMP_SHAPE = Object.freeze({ tilt: -0.32, len: 2.2, thick: 0.12, cy: 0.35, cz: -0.8, tail: 0.8 });

const SIN = Math.sin(-RAMP_SHAPE.tilt), COS = Math.cos(-RAMP_SHAPE.tilt), H = RAMP_SHAPE.thick / 2;
const W_MAX = RAMP_SHAPE.len / 2;
const DECK_END = RAMP_SHAPE.cz + W_MAX * COS - H * SIN;

function deckTop(dz) {
  const w = (dz - RAMP_SHAPE.cz + H * SIN) / COS;
  return Math.abs(w) <= W_MAX + 1e-9 ? RAMP_SHAPE.cy + H * COS + w * SIN : null;
}

export const RAMP_TOP = deckTop(0);

function liftAt(r, z, x) {
  const p = slopePoint(r.z, r.x), q = slopePoint(z, x);
  if (Math.abs(q.x - p.x) > r.half + SLED_HALF.w) return null;
  const dz = q.z - p.z;
  const top = deckTop(dz);
  if (top !== null) return { lift: Math.max(0, p.y + top - q.y), deck: true };
  const past = dz - DECK_END;
  if (past <= 0 || past >= RAMP_SHAPE.tail) return null;
  return { lift: Math.max(0, (p.y + deckTop(DECK_END) - q.y) * (1 - past / RAMP_SHAPE.tail)), deck: false };
}

export function rampAt(course, z, x) {
  return (course.ramps || []).reduce((best, r) => {
    const hit = liftAt(r, z, x);
    return hit && hit.lift > best.lift ? hit : best;
  }, { lift: 0, deck: false });
}
