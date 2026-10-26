export const CAFE_OFFSET = Object.freeze({ x: 300, z: 0 });
export const ROOM = Object.freeze({ w: 11, d: 8.5 });
export const ROOF = Object.freeze({ rise: 5.2, cut: 2.2 });
export const KNEE = ROOM.w / 2 - (ROOM.w / 2) * (ROOF.cut / ROOF.rise);
export const ENTRY = Object.freeze({ x: 0, z: 3.2 });
export const EXIT_SPOT = Object.freeze({ x: 0, z: 3.8 });
export const ORDER_SPOT = Object.freeze({ x: 2.2, z: -0.8 });
export const SPOT_R = 1.0;
export const BARISTA = Object.freeze({ x: 2.2, z: -2.8 });
export const TABLES = Object.freeze([{ x: -1.6, z: -0.6 }, { x: -2.0, z: 1.8 }, { x: 2.1, z: 2.3 }].map(t => Object.freeze(t)));
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
  const hx = KNEE, hz = ROOM.d / 2 - WALL_IN;
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

export const DRINK = Object.freeze({ s: 3.4, up: 0.2, down: 0.82, sips: 2, tilt: 0.95, lean: 0.22, mouth: Object.freeze({ fwd: 0.52, y: 0.98 }) });

const ease = k => k * k * (3 - 2 * k);
const lerp3 = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k });

export function drinkPose(p, table, mouth) {
  if (p < DRINK.up) return { at: lerp3(table, mouth, ease(p / DRINK.up)), tilt: 0, sip: 0 };
  if (p < DRINK.down) {
    const k = (p - DRINK.up) / (DRINK.down - DRINK.up);
    const sip = 0.5 - 0.5 * Math.cos(k * Math.PI * 2 * DRINK.sips);
    return { at: mouth, tilt: DRINK.tilt * sip, sip };
  }
  return { at: lerp3(mouth, table, ease(Math.min(1, (p - DRINK.down) / (1 - DRINK.down)))), tilt: 0, sip: 0 };
}

function emojiTexture(THREE, emoji) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  c.fillStyle = '#ffffff';
  c.beginPath(); c.arc(64, 60, 54, 0, Math.PI * 2); c.fill();
  c.font = '64px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(emoji, 64, 64);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
