import { TABLE_SITES, TABLE_SHAPES, TABLE_TREE_CLEAR, TABLE_SOUTH_CLEAR, TABLE_YARD_PAD, TABLE_DECOR_PAD } from '../data/table.js';
import { pondSignPos, SIGN_REACH } from '../pond/sign.js';

const ORIGIN = Object.freeze({ x: 0, z: 0 });
const list = (v) => (Array.isArray(v) ? v : []);
const edgeGap = (f, x, z) => Math.hypot(Math.max(0, Math.abs(x - f.x) - f.hx), Math.max(0, Math.abs(z - f.z) - f.hz));

export function tableFootprint(site, shape, house) {
  const { hx, hz } = TABLE_SHAPES[shape];
  return { x: house.x + site.dx, z: house.z + site.dz, hx, hz };
}

export function tableKeepOut(site, shape, house) {
  const f = tableFootprint(site, shape, house);
  const n = shape === 'long' ? 3 : 1, step = (f.hx * 2) / n;
  const r = Math.hypot(step / 2, f.hz);
  return Array.from({ length: n }, (_, i) => ({ x: f.x - f.hx + step * (i + 0.5), z: f.z, r }));
}

function pondTouches(f, pond) {
  if (!pond) return false;
  if (edgeGap(f, pond.dx, pond.dz) < pond.r) return true;
  const sign = pondSignPos({ x: pond.dx, z: pond.dz }, pond.r, ORIGIN);
  return edgeGap(f, sign.x, sign.z) < SIGN_REACH;
}

const inWay = (f, items) => list(items).some(o => edgeGap(f, o.dx, o.dz) < TABLE_DECOR_PAD);

function siteState(site, { pond, outdoorRel, plotsRel }) {
  const f = tableFootprint(site, 'long', ORIGIN);
  return { pond: pondTouches(f, pond), decor: inWay(f, outdoorRel), plots: inWay(f, plotsRel) };
}

export function tableSiteFor(yard) {
  return TABLE_SITES.find(s => Object.values(siteState(s, yard)).every(v => !v)) ?? null;
}

export function tableBlockedBy(yard) {
  if (tableSiteFor(yard)) return null;
  return TABLE_SITES.some(s => siteState(s, yard).decor) ? 'decor' : 'plots';
}

export function tableCovers(table, dx, dz, pad = 0) {
  if (!table) return false;
  const { hx, hz } = TABLE_SHAPES[table.shape];
  return edgeGap({ x: table.dx, z: table.dz, hx, hz }, dx, dz) <= pad;
}

export function segmentHitsKeepOut(a, b, circles, pad = 0) {
  const vx = b.x - a.x, vz = b.z - a.z, len2 = vx * vx + vz * vz;
  return circles.some(c => {
    const t = len2 > 0 ? Math.min(1, Math.max(0, ((c.x - a.x) * vx + (c.z - a.z) * vz) / len2)) : 0;
    return Math.hypot(a.x + vx * t - c.x, a.z + vz * t - c.z) < c.r + pad;
  });
}

export function tableClear(shape) {
  const { hx, hz } = TABLE_SHAPES[shape], r = Math.hypot(hx, hz);
  return { r: r + TABLE_YARD_PAD, treeR: r + TABLE_TREE_CLEAR, south: TABLE_SOUTH_CLEAR };
}

export function tableMapKey(siteId, shape) {
  return `${siteId}/${shape}`;
}
