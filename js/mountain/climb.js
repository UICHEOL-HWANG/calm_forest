export const CLIMB_PATH = Object.freeze([
  { x: 8.69, z: 72.27 }, { x: 17, z: 66 }, { x: 25, z: 51 }, { x: 24, z: 30 }, { x: 23, z: 8 },
  { x: 19, z: -12 }, { x: 10, z: -21 }, { x: -6, z: -15 }, { x: 0, z: -4 },
]);

export const CLIMB_START = CLIMB_PATH[0];

export const PLAZA = Object.freeze({ x: 0, z: 74.6, r: 9 });

const BAND = 1.5;

export const ACORNS = Object.freeze([
  { x: 20.6, z: 59.3, offPath: false },
  { x: 24.5, z: 40.4, offPath: false },
  { x: 21.2, z: 20.6, offPath: true },
  { x: 23.5, z: -1.8, offPath: true },
  { x: 12.5, z: -18.5, offPath: false },
  { x: 5.2, z: -21.3, offPath: true },
]);

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

function segK(n) {
  const a = CLIMB_PATH[n.seg], b = CLIMB_PATH[n.seg + 1];
  const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  return Math.min(1, Math.hypot(n.x - a.x, n.z - a.z) / len);
}

export function clampLocal(p, plaza) {
  const pd = Math.hypot(p.x - plaza.x, p.z - plaza.z);
  if (pd <= plaza.r) return { x: p.x, z: p.z, onPath: false, seg: 0, k: 0 };
  const n = nearestOnPath(p);
  const k = segK(n);
  if (n.dist <= BAND) return { x: p.x, z: p.z, onPath: true, seg: n.seg, k };
  if (pd - plaza.r <= n.dist - BAND) {
    const s = plaza.r / pd;
    return { x: plaza.x + (p.x - plaza.x) * s, z: plaza.z + (p.z - plaza.z) * s, onPath: false, seg: 0, k: 0 };
  }
  const s = BAND / n.dist;
  return { x: n.x + (p.x - n.x) * s, z: n.z + (p.z - n.z) * s, onPath: true, seg: n.seg, k };
}
