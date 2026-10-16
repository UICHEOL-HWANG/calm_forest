import { slopePoint } from './terrain.js';
import { CLIMB_PATH, CLIMB_START } from './climb.js';
import { COURSE, centerX } from './course.js';

export const PLAYER_R = 0.35;
export const HUT_R = 2.6;

const summit = CLIMB_PATH.at(-1);
const top = slopePoint(0, centerX(0));
const end = slopePoint(COURSE.length - 4, centerX(COURSE.length - 4));
const FINISH_HALF = COURSE.width / 2 - 0.4;

export const CAMP = Object.freeze({
  hut: { x: 4.2, z: -11.2, ry: -2.2, w: 4.4, d: 4.4 },
  keeper: { x: 2.6, z: -6.4 },
  deck: { x: top.x, z: top.z - 1.2, y: top.y },
  finish: { x: end.x, z: end.z, half: FINISH_HALF },
  fire: { x: -3.6, z: 76.5 },
  benches: [{ dx: 0, dz: 2.1, ry: 0 }, { dx: -2.1, dz: 0, ry: Math.PI / 2 }, { dx: 1.6, dz: -1.4, ry: -0.8 }],
  lamps: [{ x: -7.4, z: 70.2 }, { x: 7.6, z: 79.6 }, { x: -6.8, z: 81.6 }],
  woodpile: { x: -7.8, z: 75.6 },
  snowman: { x: 5.4, z: 81.0 },
  sign: { x: CLIMB_START.x + 1.8, z: CLIMB_START.z + 0.8 },
  sticks: { x: CLIMB_START.x + 0.6, z: CLIMB_START.z + 2.2 },
  cairn: { x: CLIMB_START.x + 0.4, z: CLIMB_START.z - 1.6 },
  shelter: { x: 27.8, z: 24 },
});

export const START_SPOT = Object.freeze({ x: CAMP.deck.x, z: CAMP.deck.z + 0.3 });

export const CAMP_COLLIDERS = Object.freeze([
  { id: 'campfire', ...CAMP.fire, r: 1.25 },
  ...CAMP.benches.map((b, i) => ({ id: `bench${i}`, x: CAMP.fire.x + b.dx, z: CAMP.fire.z + b.dz, r: 0.8 })),
  ...CAMP.lamps.map((l, i) => ({ id: `lamp${i}`, ...l, r: 0.3 })),
  { id: 'woodpile', ...CAMP.woodpile, r: 0.95 },
  { id: 'stump', x: CAMP.woodpile.x + 0.9, z: CAMP.woodpile.z - 0.8, r: 0.35 },
  { id: 'snowman', ...CAMP.snowman, r: 0.65 },
  { id: 'sign', ...CAMP.sign, r: 0.25 },
  { id: 'sticks', ...CAMP.sticks, r: 0.5 },
  { id: 'cairn', ...CAMP.cairn, r: 0.45 },
  { id: 'finishL', x: CAMP.finish.x - FINISH_HALF, z: CAMP.finish.z, r: 0.3 },
  { id: 'finishR', x: CAMP.finish.x + FINISH_HALF, z: CAMP.finish.z, r: 0.3 },
  { id: 'keeper', ...CAMP.keeper, r: 0.45 },
  { id: 'hut', x: CAMP.hut.x, z: CAMP.hut.z, r: HUT_R },
  { id: 'poleL', x: CAMP.deck.x - 2.4, z: CAMP.deck.z + 1.3, r: 0.2 },
  { id: 'poleR', x: CAMP.deck.x + 2.4, z: CAMP.deck.z + 1.3, r: 0.2 },
].map(c => Object.freeze(c)));

function pushOnce(p) {
  return CAMP_COLLIDERS.reduce((q, c) => {
    const dx = q.x - c.x, dz = q.z - c.z, d = Math.hypot(dx, dz), min = c.r + PLAYER_R;
    if (d >= min) return q;
    if (d < 1e-6) return { x: c.x + min, z: c.z };
    return { x: c.x + (dx / d) * min, z: c.z + (dz / d) * min };
  }, p);
}

const PUSH_PASSES = 4;

export function pushOutProps(p) {
  let q = p;
  for (let i = 0; i < PUSH_PASSES; i++) {
    const next = pushOnce(q);
    if (next === q) return q;
    q = next;
  }
  return q;
}

export function atHut(p) {
  return Math.hypot(p.x - summit.x, p.z - summit.z) <= 2.5;
}

export const YARD = Object.freeze({ x: 1.5, z: -6.9, r: 3.2 });
export const DOOR_R = 1.0;
export const DOOR_SPOT = Object.freeze({
  x: CAMP.hut.x + Math.cos(CAMP.hut.ry) * (CAMP.hut.w / 2 + 1.0),
  z: CAMP.hut.z - Math.sin(CAMP.hut.ry) * (CAMP.hut.w / 2 + 1.0),
});

export function inYard(p) {
  return Math.hypot(p.x - YARD.x, p.z - YARD.z) <= YARD.r;
}

export function clampSummit(p, clampLocalFn) {
  if (inYard(p)) return { x: p.x, z: p.z, onPath: false, seg: 0, k: 0, yard: true };
  const c = clampLocalFn(p);
  const d = Math.hypot(p.x - YARD.x, p.z - YARD.z);
  const e = { x: YARD.x + ((p.x - YARD.x) / d) * YARD.r, z: YARD.z + ((p.z - YARD.z) / d) * YARD.r };
  const toPath = Math.hypot(c.x - p.x, c.z - p.z), toYard = Math.hypot(e.x - p.x, e.z - p.z);
  return toYard < toPath ? { ...e, onPath: false, seg: 0, k: 0, yard: true } : { ...c, yard: false };
}
