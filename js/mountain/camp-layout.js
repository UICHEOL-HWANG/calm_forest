import { slopePoint, pathHeight } from './terrain.js';
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

export function hutLocal(f, r) {
  const ry = CAMP.hut.ry;
  return { x: CAMP.hut.x + Math.sin(ry) * f + Math.cos(ry) * r, z: CAMP.hut.z + Math.cos(ry) * f - Math.sin(ry) * r };
}

export const LEAN_SLEDS = Object.freeze([0, 1, 2].map(i => Object.freeze({ f: 2.7 + i * 0.01, r: 3.2 + i * 0.55, h: 0.62, tilt: i * 0.05 })));
const LEAN_MID = hutLocal(2.71, 3.75);

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
  { id: 'leanSleds', ...LEAN_MID, r: 0.8 },
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

export const CAFE_EXIT_SPOT = Object.freeze({
  x: DOOR_SPOT.x + Math.cos(CAMP.hut.ry) * 1.5,
  z: DOOR_SPOT.z - Math.sin(CAMP.hut.ry) * 1.5,
});

export function inYard(p) {
  return Math.hypot(p.x - YARD.x, p.z - YARD.z) <= YARD.r;
}

const HEIGHT_TOL = 0.5;
const YARD_GAP = 1e-3;
const SETTLE_PASSES = 4;

function yardEdge(p, r) {
  const d = Math.hypot(p.x - YARD.x, p.z - YARD.z) || 1;
  return { x: YARD.x + ((p.x - YARD.x) / d) * r, z: YARD.z + ((p.z - YARD.z) / d) * r };
}

function onYard(p) {
  return { x: p.x, z: p.z, onPath: false, seg: 0, k: 0, yard: true };
}

function offYard(p, clampLocalFn) {
  let q = { ...clampLocalFn(yardEdge(p, YARD.r + YARD_GAP)), yard: false };
  for (let i = 1; i < SETTLE_PASSES && inYard(q); i++) q = { ...clampLocalFn(yardEdge(q, YARD.r + YARD_GAP)), yard: false };
  return q;
}

export function clampSummit(p, clampLocalFn, curY) {
  const gap = c => (curY === undefined ? 0 : Math.abs(summitHeight(c) - curY));
  if (inYard(p)) {
    const y = onYard(p);
    return gap(y) <= HEIGHT_TOL ? y : offYard(p, clampLocalFn);
  }
  const c = { ...clampLocalFn(p), yard: false };
  const e = onYard(yardEdge(p, YARD.r));
  const toPath = Math.hypot(c.x - p.x, c.z - p.z), toYard = Math.hypot(e.x - p.x, e.z - p.z);
  const order = toYard < toPath ? [e, c] : [c, e];
  return order.find(q => gap(q) <= HEIGHT_TOL) ?? (gap(e) < gap(c) ? e : c);
}

export function summitHeight(c) {
  return c.yard ? CAMP.deck.y : c.onPath ? pathHeight(c.seg, c.k) : 0;
}
