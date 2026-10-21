const RAMP = 0.6, CATCH = 0.6;

export function makeWalk({ ax, az, bx, bz, hw, y }) {
  const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
  return { ax, az, bx, bz, hw, y, ux: dx / len, uz: dz / len, len };
}

function local(w, p) {
  const rx = p.x - w.ax, rz = p.z - w.az;
  const raw = rx * w.ux + rz * w.uz, s = Math.max(0, Math.min(w.len, raw));
  const side = rx * -w.uz + rz * w.ux;
  return { raw, s, side, d: Math.max(Math.abs(side) - w.hw, raw - s, s - raw) + w.hw };
}

export function onWalk(w, p) { const l = local(w, p); return l.raw >= 0 && l.raw <= w.len && Math.abs(l.side) <= w.hw; }

export function walkEnd(w) { return { x: w.bx, z: w.bz }; }

export function walkHeight(walks, p) {
  let y = 0;
  for (const w of walks) {
    if (!onWalk(w, p)) continue;
    const l = local(w, p);
    const k = Math.min(1, l.s / RAMP);
    y = Math.max(y, w.y * k * k * (3 - 2 * k));
  }
  return y;
}

export function keepOnWalk(walks, p, inWater) {
  if (!inWater(p) || walks.some(w => onWalk(w, p))) return;
  let best = null;
  for (const w of walks) {
    const l = local(w, p);
    if (l.d <= w.hw + CATCH && (!best || l.d < best.l.d)) best = { w, l };
  }
  if (!best) return;
  const { w, l } = best, side = Math.max(-w.hw, Math.min(w.hw, l.side)) * (1 - 1e-6), s = Math.min(l.s, w.len * (1 - 1e-6));
  p.x = w.ax + w.ux * s - w.uz * side; p.z = w.az + w.uz * s + w.ux * side;
}
