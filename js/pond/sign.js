export const SIGN_OUT = 2.2;
export const SIGN_REACH = 1.6;
export const SIGN_SOLID_R = 0.15;
export const SIGN_TOP = 0.9;
export const SIGN_PLANK_W = 0.7;
export const SIGN_BUBBLE_Y = 1.3;
export const SIGN_PULSE_SEC = 5;

const SIDE_OUT = 1.9;

export const SIGN_RING = Object.freeze({
  idle: Object.freeze({ color: 0xd8cfa8, opacity: 0.18 }),
  active: Object.freeze({ color: 0xd4a017, opacity: 0.6 }),
  easeSec: 0.2,
});

export function signRingLook(k, pulseT) {
  const beat = pulseT > 0 ? Math.sin(pulseT * 4) * 0.3 + 0.7 : 0;
  const mix = Math.max(k, beat);
  const { idle, active } = SIGN_RING;
  return { mix, opacity: idle.opacity + (active.opacity - idle.opacity) * mix, scale: 1 + beat * 0.06 * (1 - k) };
}

export function signRingEase(k, active, dt) {
  const step = dt / SIGN_RING.easeSec;
  return active ? Math.min(1, k + step) : Math.max(0, k - step);
}
const HOUSE_HALF = 3.95, HOUSE_PAD = 1.2, HOUSE_BEHIND = 5;

export const SIGN_SIDES = Object.freeze([
  Object.freeze({ id: 'ese', sx: 1, sz: 1 }),
  Object.freeze({ id: 'ene', sx: 1, sz: -1 }),
  Object.freeze({ id: 'wsw', sx: -1, sz: 1 }),
  Object.freeze({ id: 'wnw', sx: -1, sz: -1 }),
]);

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

const POST = 0xc9a06a, PLANK = 0xe8d3a8, TRIM = 0x7a5a28, WATER = 0x3f7fb0, STONE = [0x5a5048, 0xd6cec4];
const PLANK_Y = 0.72, PLANK_H = 0.28, STONES = 8;

export function signParts() {
  const stones = Array.from({ length: STONES }, (_, i) => {
    const a = (i / STONES) * Math.PI * 2;
    return { kind: 'stone', x: Math.cos(a) * 0.17, y: PLANK_Y + Math.sin(a) * 0.07, z: 0.05, w: 0.07, h: 0.05, d: 0.1, color: STONE[i % 2] };
  });
  return [
    { kind: 'post', x: 0, y: SIGN_TOP / 2, z: 0, w: 0.11, h: SIGN_TOP, d: 0.11, color: POST },
    { kind: 'plank', x: 0, y: PLANK_Y, z: 0.05, w: SIGN_PLANK_W, h: PLANK_H, d: 0.07, color: PLANK },
    { kind: 'trim', x: 0, y: PLANK_Y + PLANK_H / 2 - 0.015, z: 0.05, w: SIGN_PLANK_W, h: 0.03, d: 0.08, color: TRIM },
    { kind: 'trim', x: 0, y: PLANK_Y - PLANK_H / 2 + 0.015, z: 0.05, w: SIGN_PLANK_W, h: 0.03, d: 0.08, color: TRIM },
    { kind: 'water', x: 0, y: PLANK_Y, z: 0.05, w: 0.2, h: 0.07, d: 0.09, color: WATER },
    ...stones,
  ];
}
