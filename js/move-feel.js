export const DEAD_ZONE = 0.18;
export const FULL_AT = 0.7;
export const TURN_RATE = 20;
export const CAM_FOLLOW = 0.004;

export function stickVector(dx, dy, r) {
  const len = Math.hypot(dx, dy);
  const s = len > r ? r / len : 1;
  return { x: dx * s / r, y: dy * s / r };
}

export function stickMove(x, z, dead = DEAD_ZONE) {
  const mag = Math.hypot(x, z);
  if (mag <= dead) return { mx: 0, mz: 0, scale: 0 };
  return { mx: x / mag, mz: z / mag, scale: Math.min(1, (mag - dead) / (FULL_AT - dead)) };
}

export function stickCenter(x, y, r, vw, vh, pad = 8) {
  const m = r + pad;
  return { x: Math.min(vw - m, Math.max(m, x)), y: Math.min(vh - m, Math.max(m, y)) };
}

export function turnToward(a, b, dt, rate = TURN_RATE) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * (1 - Math.exp(-rate * dt));
}

export function followK(dt, base = CAM_FOLLOW) {
  return 1 - Math.pow(base, dt);
}
