import { TABLE_SHAPES } from '../data/table.js';

export const SEAT = Object.freeze({
  tuck: 0.18,
  y: 0.41,
  lean: 0.16,
  round: Object.freeze({ out: 1.18, top: 0.85 }),
  long: Object.freeze({ out: 1.08, top: 0.65 }),
});

export const SEAT_CAM = Object.freeze({ pos: Object.freeze([1.7, 2.9, 4.2]), look: Object.freeze([0, 0.95, -0.1]), portrait: 1.45 });

const BODY_R_DEFAULT = 0.55;
const SHAPES = new Set(['round', 'long']);

export function seatOut(shape, bodyR) {
  const s = SHAPES.has(shape) ? SEAT[shape] : SEAT.round;
  return Math.max(s.out, s.top + bodyR - SEAT.tuck);
}

export function seatPose(table, shape, bodyR, side) {
  const d = seatOut(shape, bodyR);
  return side === 'host' ? { x: table.x, z: table.z - d, ry: 0 } : { x: table.x, z: table.z + d, ry: Math.PI };
}

export function seatCamera(table, aspect) {
  const k = aspect < 1 ? SEAT_CAM.portrait : 1;
  const [lx, ly, lz] = SEAT_CAM.look, [px, py, pz] = SEAT_CAM.pos;
  const look = { x: table.x + lx, y: ly, z: table.z + lz };
  if (k === 1) return { look, pos: { x: table.x + px, y: py, z: table.z + pz } };
  return { look, pos: { x: look.x + (px - lx) * k, y: ly + (py - ly) * k, z: look.z + (pz - lz) * k } };
}

export function bodyROf(id, animals) {
  return animals.find(a => a.id === id)?.bodyR ?? BODY_R_DEFAULT;
}

export function nearSeat(table, p) {
  if (!table) return false;
  const reach = (TABLE_SHAPES[table.shape] || TABLE_SHAPES.round).reach;
  return Math.hypot(p.x - table.x, p.z - table.z) < reach;
}
