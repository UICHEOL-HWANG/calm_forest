export const SIGN_OUT = 1.9;
export const SIGN_REACH = 1.2;
export const SIGN_SOLID_R = 0.15;
export const SIGN_TOP = 1.15;
export const SIGN_PLANK_W = 0.74;
export const SIGN_BUBBLE_Y = 1.52;
export const SIGN_PULSE_SEC = 5;

const SIDE_OUT = 1.6;
const HOUSE_HALF = 3.95, HOUSE_PAD = 1.2, HOUSE_BEHIND = 5;
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])$/;

export const SIGN_SIDES = Object.freeze([
  Object.freeze({ id: 'ese', sx: 1, sz: 1 }),
  Object.freeze({ id: 'ene', sx: 1, sz: -1 }),
  Object.freeze({ id: 'wsw', sx: -1, sz: 1 }),
  Object.freeze({ id: 'wnw', sx: -1, sz: -1 }),
]);

export const SIGN_RINGS = Object.freeze({
  dash: Object.freeze({ idle: Object.freeze({ color: 0xd8cfa8, opacity: 0.5 }), active: Object.freeze({ color: 0xd4a017, opacity: 0.9 }), grow: 0 }),
  disc: Object.freeze({ idle: Object.freeze({ color: 0xd8cfa8, opacity: 0.4 }), active: Object.freeze({ color: 0xd8a52a, opacity: 0.85 }), grow: 0.08 }),
  pebble: Object.freeze({ idle: Object.freeze({ color: 0x9a9288, opacity: 1 }), active: Object.freeze({ color: 0xd4a017, opacity: 1 }), grow: 0 }),
});
export const SIGN_RING_DEFAULT = 'dash';
export const SIGN_RING_EASE_SEC = 0.2;
const RING_PARAM = Object.freeze({ 1: 'dash', 2: 'disc', 3: 'pebble' });

export function signRingKind(search, hostname) {
  if (!LOCAL_HOST.test(hostname || '')) return SIGN_RING_DEFAULT;
  return RING_PARAM[new URLSearchParams(search || '').get('pondring')] ?? SIGN_RING_DEFAULT;
}

export function signRingLook(kind, k, pulseT) {
  const beat = pulseT > 0 ? Math.sin(pulseT * 4) * 0.3 + 0.7 : 0;
  const mix = Math.max(k, beat);
  const { idle, active, grow } = SIGN_RINGS[kind];
  return { mix, opacity: idle.opacity + (active.opacity - idle.opacity) * mix, scale: 1 + grow * mix };
}

export function signRingEase(k, active, dt) {
  const step = dt / SIGN_RING_EASE_SEC;
  return active ? Math.min(1, k + step) : Math.max(0, k - step);
}

function at(centre, radius, side) {
  const dx = radius + SIDE_OUT, dz = Math.sqrt((radius + SIGN_OUT) ** 2 - dx * dx);
  return { x: centre.x + side.sx * dx, z: centre.z + side.sz * dz };
}

function houseHides(p, house) {
  if (!house || Math.abs(p.x - house.x) >= HOUSE_HALF + HOUSE_PAD) return false;
  return p.z > house.z - HOUSE_HALF - HOUSE_BEHIND && p.z < house.z + HOUSE_HALF + HOUSE_PAD;
}

function pick(centre, radius, house) {
  return SIGN_SIDES.find(s => !houseHides(at(centre, radius, s), house)) ?? SIGN_SIDES[0];
}

export function pondSignSide(centre, radius, house) {
  return pick(centre, radius, house).id;
}

export function pondSignPos(centre, radius, house) {
  return at(centre, radius, pick(centre, radius, house));
}

export function signNear(sign, me) {
  return !!sign && Math.hypot(sign.x - me.x, sign.z - me.z) < SIGN_REACH;
}

export function signPulseDue({ seen, inView, busy, coach, modal }) {
  return !seen && !!inView && !busy && !coach && !modal;
}

const POST = 0xb98a4e, PLANK = 0xd9b98a, FRAME = 0x7a5a28, WATER = 0x2f7f86, STONE = [0xd6cec4, 0xc4bbae];
const ACCENT = [0xd8d3ca, 0xb87862, 0xd58fa0], ROCK = 0xa39a8e, TUFT = 0x6aa84f;
const PLANK_Y = 0.83, PLANK_H = 0.42, PLANK_Z = 0.07, FRAME_W = 0.035, STONES = 8, ICON_R = 0.135;

export function signParts() {
  const half = SIGN_PLANK_W / 2, top = PLANK_Y + PLANK_H / 2;
  const stones = Array.from({ length: STONES }, (_, i) => {
    const a = (i / STONES) * Math.PI * 2;
    return { kind: 'stone', shape: 'ball', x: Math.cos(a) * ICON_R, y: PLANK_Y + Math.sin(a) * ICON_R, z: PLANK_Z + 0.04, w: 0.075, h: 0.06, d: 0.05, color: STONE[i % 2] };
  });
  const frame = [
    { x: 0, y: top - FRAME_W / 2, w: SIGN_PLANK_W, h: FRAME_W },
    { x: 0, y: PLANK_Y - PLANK_H / 2 + FRAME_W / 2, w: SIGN_PLANK_W, h: FRAME_W },
    { x: -half + FRAME_W / 2, y: PLANK_Y, w: FRAME_W, h: PLANK_H },
    { x: half - FRAME_W / 2, y: PLANK_Y, w: FRAME_W, h: PLANK_H },
  ].map(f => ({ kind: 'frame', shape: 'box', z: PLANK_Z, d: 0.1, color: FRAME, ...f }));
  const accent = ACCENT.map((color, i) => ({ kind: 'accent', shape: 'ball', x: (i - 1) * 0.11, y: top + 0.07 + 0.02, z: PLANK_Z, w: 0.09, h: 0.04, d: 0.07, color }));
  return [
    { kind: 'post', shape: 'post', x: 0, y: 0.5, z: 0, w: 0.15, h: 1.0, d: 0.15, color: POST },
    { kind: 'plank', shape: 'box', x: 0, y: PLANK_Y, z: PLANK_Z, w: SIGN_PLANK_W, h: PLANK_H, d: 0.07, color: PLANK },
    ...frame,
    { kind: 'cap', shape: 'box', x: 0, y: top + 0.035, z: PLANK_Z, w: 0.46, h: 0.07, d: 0.1, color: FRAME },
    { kind: 'water', shape: 'disc', x: 0, y: PLANK_Y, z: PLANK_Z + 0.03, w: 0.21, h: 0.21, d: 0.03, color: WATER },
    ...stones,
    ...accent,
    { kind: 'rock', shape: 'ball', x: 0.16, y: 0.06, z: 0.08, w: 0.24, h: 0.14, d: 0.2, color: ROCK },
    { kind: 'tuft', shape: 'cone', x: -0.14, y: 0.09, z: 0.06, w: 0.11, h: 0.18, d: 0.11, color: TUFT },
    { kind: 'tuft', shape: 'cone', x: -0.22, y: 0.065, z: -0.02, w: 0.09, h: 0.13, d: 0.09, color: TUFT },
  ];
}
