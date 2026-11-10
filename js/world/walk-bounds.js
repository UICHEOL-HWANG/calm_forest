export const WALK_R = 42;
export const BUMP_R = 7;
export const BUMP_CENTER = -35 * Math.PI / 180;
export const BUMP_HALF = 35 * Math.PI / 180;

const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

export function walkLimit(theta) {
  const d = wrap(theta - BUMP_CENTER);
  if (Math.abs(d) >= BUMP_HALF) return WALK_R;
  const c = Math.cos(d / BUMP_HALF * Math.PI / 2);
  return WALK_R + BUMP_R * c * c;
}

export function clampVillage(p) {
  const r = Math.hypot(p.x, p.z);
  if (r === 0) return p;
  const lim = walkLimit(Math.atan2(p.z, p.x));
  if (r > lim) { p.x *= lim / r; p.z *= lim / r; }
  return p;
}
