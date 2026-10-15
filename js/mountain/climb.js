export const CLIMB_PATH = [
  { x: 6, z: 22 }, { x: 18, z: 12 }, { x: 26, z: -2 }, { x: 24, z: -18 },
  { x: 12, z: -30 }, { x: -2, z: -34 }, { x: -12, z: -26 }, { x: -6, z: -14 }, { x: 0, z: -4 },
];

export const CLIMB_START = CLIMB_PATH[0];

export const ACORNS = [
  { x: 18, z: 12, offPath: false },
  { x: 28.4, z: -1, offPath: true },
  { x: 24, z: -18, offPath: false },
  { x: 11, z: -32.6, offPath: true },
  { x: -12, z: -26, offPath: false },
  { x: -8.6, z: -12.6, offPath: true },
];

function closestOnSeg(p, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz)));
  return { x: a.x + dx * t, z: a.z + dz * t };
}

export function nearestOnPath(p) {
  let best = { x: 0, z: 0, seg: 0, dist: Infinity };
  for (let i = 0; i < CLIMB_PATH.length - 1; i++) {
    const c = closestOnSeg(p, CLIMB_PATH[i], CLIMB_PATH[i + 1]);
    const dist = Math.hypot(p.x - c.x, p.z - c.z);
    if (dist < best.dist) best = { ...c, seg: i, dist };
  }
  return best;
}

export function collectAcorns(p, taken, r = 1.2) {
  return taken.map((t, i) => t || Math.hypot(p.x - ACORNS[i].x, p.z - ACORNS[i].z) <= r);
}

export function atSummit(p) {
  const s = CLIMB_PATH.at(-1);
  return Math.hypot(p.x - s.x, p.z - s.z) <= 2.5;
}
