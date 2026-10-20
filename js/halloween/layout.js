export const HW_R = 13;
export const EDGE_PAD = 0.55;
export const WALK_R = HW_R - EDGE_PAD;
export const GHOSTS_PER_DAY = 3;
export const GHOST_FIND_R = 1.6;
export const GHOST_HINT_R = 4.0;
export const EXIT_R = 1.8;
export const STALL_R = 2.2;

export const ARRIVE = Object.freeze({ x: 0, z: 9.6 });
export const EXIT = Object.freeze({ x: 0, z: 11.4 });
export const STALL = Object.freeze({ x: 0.5, z: 2.5 });

export const GHOST_SPOTS = Object.freeze([
  { id: 'grave-1', kind: 'grave', x: -6.6, z: -3.6 },
  { id: 'grave-2', kind: 'grave', x: 4.0, z: -7.6 },
  { id: 'grave-3', kind: 'grave', x: -3.4, z: -9.6 },
  { id: 'fence-1', kind: 'fence', x: -9.4, z: -5.2 },
  { id: 'fence-2', kind: 'fence', x: 9.2, z: -5.6 },
  { id: 'tree-1', kind: 'tree', x: -8.2, z: -8.4 },
  { id: 'tree-2', kind: 'tree', x: 8.6, z: -8.0 },
  { id: 'lamp-1', kind: 'lamp', x: -8.6, z: 2.6 },
].map(Object.freeze));

const BY_ID = new Map(GHOST_SPOTS.map(s => [s.id, s]));

export function spotOf(id) { return BY_ID.get(id) ?? null; }

export function isWalkable(x, z) { return Math.hypot(x, z) <= WALK_R + 1e-9; }

export function clampToGarden(x, z) {
  const d = Math.hypot(x, z);
  if (d <= WALK_R) return { x, z };
  const k = (WALK_R - 1e-4) / d;
  return { x: x * k, z: z * k };
}

function hashStr(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

let pickDay = null, picked = null;

export function pickSpots(day) {
  if (day === pickDay) return picked;
  const rnd = mulberry32(hashStr(`halloween:${day}`));
  const ids = GHOST_SPOTS.map(s => s.id);
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  const chosen = new Set(ids.slice(0, GHOSTS_PER_DAY));
  picked = Object.freeze(GHOST_SPOTS.map(s => s.id).filter(id => chosen.has(id)));
  pickDay = day;
  return picked;
}
