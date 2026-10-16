export const CAFE_OFFSET = Object.freeze({ x: 300, z: 0 });
export const ROOM = Object.freeze({ w: 11, d: 8.5 });
export const ENTRY = Object.freeze({ x: 0, z: 3.2 });
export const EXIT_SPOT = Object.freeze({ x: 0, z: 3.8 });
export const ORDER_SPOT = Object.freeze({ x: 2.2, z: -0.8 });
export const SPOT_R = 1.0;
export const BARISTA = Object.freeze({ x: 2.2, z: -2.8 });
export const TABLES = Object.freeze([{ x: -1.6, z: -0.6 }, { x: 0.4, z: 1.6 }, { x: 3.4, z: 1.4 }].map(t => Object.freeze(t)));
export const SEATS = Object.freeze(TABLES.flatMap((t, i) => [-1, 1].map(s => Object.freeze({ x: t.x + s * 0.75, z: t.z, ry: s < 0 ? Math.PI / 2 : -Math.PI / 2, table: i }))));

const PLAYER_R = 0.35;
const WALL_IN = 0.55;

export const CAFE_COLLIDERS = Object.freeze([
  { id: 'counterL', x: 1.0, z: -1.8, r: 0.6 },
  { id: 'counterM', x: 2.2, z: -1.8, r: 0.6 },
  { id: 'counterR', x: 3.4, z: -1.8, r: 0.6 },
  ...TABLES.map((t, i) => ({ id: `table${i}`, x: t.x, z: t.z, r: 0.55 })),
  ...SEATS.map((s, i) => ({ id: `stool${i}`, x: s.x, z: s.z, r: 0.28 })),
  { id: 'loftL', x: -3.1, z: -2.1, r: 0.2 },
  { id: 'loftR', x: -0.7, z: -2.1, r: 0.2 },
  { id: 'ladder', x: -0.3, z: -1.6, r: 0.4 },
].map(c => Object.freeze(c)));

function pushOnce(p) {
  return CAFE_COLLIDERS.reduce((q, c) => {
    const dx = q.x - c.x, dz = q.z - c.z, d = Math.hypot(dx, dz), min = c.r + PLAYER_R;
    if (d >= min) return q;
    if (d < 1e-6) return { x: c.x, z: c.z + min };
    return { x: c.x + (dx / d) * min, z: c.z + (dz / d) * min };
  }, p);
}

export function clampCafe(p) {
  const hx = ROOM.w / 2 - WALL_IN, hz = ROOM.d / 2 - WALL_IN;
  let q = { x: Math.max(-hx, Math.min(hx, p.x)), z: Math.max(-hz, Math.min(hz + 0.3, p.z)) };
  for (let i = 0; i < 4; i++) {
    const next = pushOnce(q);
    if (next === q) break;
    q = next;
  }
  return q.x === p.x && q.z === p.z ? p : q;
}

export function nearestSeat(p, taken = []) {
  const open = SEATS.filter(s => !taken.some(t => t.x === s.x && t.z === s.z));
  return open.reduce((a, s) => (Math.hypot(s.x - p.x, s.z - p.z) < Math.hypot(a.x - p.x, a.z - p.z) ? s : a), open[0]);
}
