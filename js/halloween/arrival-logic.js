export const ARRIVAL_NEAR_R = 1.5;
export const ARRIVAL_OFFSETS = [[-2.7, -0.6], [3.4, 0.7], [-2.3, 1.7]];
export const ARRIVAL_DROPS = [0.75, 1.55, 0.95];
export const ARRIVAL_GHOST_SEC = 2.6;

const ease = (k) => 1 - (1 - k) ** 3;
const clamp01 = (x) => Math.min(1, Math.max(0, x));

export function isHalloweenTouch(touch) {
  const u = touch?.utm;
  if (!u) return false;
  return /halloween/i.test(`${u.content || ''} ${u.campaign || ''}`);
}

export function arrivalEligible({ touch, open, visits, force = false }) {
  if (!open) return false;
  if (force) return true;
  return (visits || 0) === 0 && isHalloweenTouch(touch);
}

export function arrivalSpots(anchor) {
  return ARRIVAL_OFFSETS.map(([dx, dz]) => ({ x: anchor.x + dx, z: anchor.z + dz }));
}

export function nearestSpot(spots, p, r = ARRIVAL_NEAR_R) {
  let best = -1, bd = r;
  spots.forEach((s, i) => {
    const d = Math.hypot(s.x - p.x, s.z - p.z);
    if (d < bd) { bd = d; best = i; }
  });
  return best;
}

export function arrivalTimeline(t) {
  const k = clamp01(t / ARRIVAL_GHOST_SEC);
  const e = k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2;
  const ghost = { x: -5 + 10.5 * e, y: 1.4 + 0.25 * Math.sin(k * Math.PI * 4), z: -0.2 + 0.9 * Math.sin(k * Math.PI) };
  const dropped = ARRIVAL_DROPS.map(d => t >= d);
  const fall = ARRIVAL_DROPS.map(d => clamp01((t - d) / 0.45));
  const bounce = ARRIVAL_DROPS.map(d => clamp01((t - d - 0.45) / 0.35));
  const lit = ARRIVAL_DROPS.map(d => {
    const q = clamp01((t - d - 0.5) / 0.6);
    return q >= 1 ? 1 : q > 0.2 && q < 0.35 ? 0.15 : q > 0.5 && q < 0.6 ? 0.3 : q;
  });
  return { ghostOn: t < ARRIVAL_GHOST_SEC + 0.1, ghost, dropped, fall: fall.map(ease), bounce, lit };
}
