import { COURSE } from './course.js';

export function idealTimeMs(p, acorns, length = COURSE.length, dt = 4) {
  let z = 0, v = p.baseSpeed * 0.5, t = 0, boost = 0, left = acorns;
  while (z < length) {
    if (left > 0 && boost <= 0) { left -= 1; boost = p.boostMs; }
    const goal = Math.min(p.maxSpeed * p.boostMult, p.baseSpeed * (boost > 0 ? p.boostMult : 1));
    const rate = p.accel * dt / 1000 * (goal < v ? 4 : 1);
    v += Math.sign(goal - v) * Math.min(Math.abs(goal - v), rate);
    z += v * dt / 1000;
    t += dt;
    boost = Math.max(0, boost - dt);
  }
  return t;
}
