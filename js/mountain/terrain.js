import { COURSE, centerX } from './course.js';
import { ACORNS, CLIMB_PATH, PLAZA, nearestOnPath } from './climb.js';

export const SUMMIT_Y = 30;
const SLOPE_DROP = 30;
const SLOPE_Z0 = -4;
const SLOPE_RUN = 70;
const SLOPE_HALF = COURSE.width / 2;
const PATH_BAND = 1.5;
const PATH_FALL = 2;
const SLOPE_FALL = 2.5;
const PLAZA_FALL = 1;
const BASE_R = 70;
const BASE_POW = 1.15;
const BASE_MARGIN = 0.4;
const BASE_RISE = 0.7;
const SLOPE_KEEP = 3;
const SUMMIT = CLIMB_PATH.at(-1);
const CLOUD_Y = SUMMIT_Y * 0.4;
const CLOUD_R0 = 10;
const CLOUD_DIP = 1.5;
const CLOUD_CLEAR = 3;
const CLOUD_CLUSTERS = 36;
const CLOUD_FLANK_ROWS = 8;
const CLOUD_FLANK_Z0 = 24;
const CLOUD_FLANK_STEP = 4.5;

export const SLOPE_M_PER_UNIT = SLOPE_RUN / COURSE.length;

export function slopePoint(z, x) {
  const k = z / COURSE.length;
  return { x, y: SUMMIT_Y - SLOPE_DROP * k, z: SLOPE_Z0 + k * SLOPE_RUN };
}

const CUM = CLIMB_PATH.reduce((acc, b, i) => (i === 0 ? [0] : [...acc, acc[i - 1] + Math.hypot(b.x - CLIMB_PATH[i - 1].x, b.z - CLIMB_PATH[i - 1].z)]), []);

export function pathY(i) {
  return (CUM[i] / CUM.at(-1)) * SUMMIT_Y;
}

export function pathHeight(seg, k) {
  return pathY(seg) + (pathY(seg + 1) - pathY(seg)) * k;
}

function nearestPathHeight(p) {
  const n = nearestOnPath(p);
  const a = CLIMB_PATH[n.seg], b = CLIMB_PATH[n.seg + 1];
  const k = Math.hypot(n.x - a.x, n.z - a.z) / (Math.hypot(b.x - a.x, b.z - a.z) || 1);
  return { dist: n.dist, y: pathHeight(n.seg, k) };
}

export function acornY(i) {
  return nearestPathHeight(ACORNS[i]).y + 0.5;
}

const soft = (d, k) => (k * d * d) / (d + 1);

function slopeFeature(x, z) {
  const cz = Math.max(0, Math.min(COURSE.length, ((z - SLOPE_Z0) / SLOPE_RUN) * COURSE.length));
  const p = slopePoint(cz, centerX(cz));
  const lateral = Math.max(0, Math.abs(x - p.x) - SLOPE_HALF);
  return { h: p.y, d: Math.hypot(lateral, z - p.z), fall: SLOPE_FALL, keep: SLOPE_KEEP };
}

function pathFeature(x, z) {
  const n = nearestPathHeight({ x, z });
  const ahead = n.y >= SUMMIT_Y && z > SUMMIT.z;
  return { h: n.y, d: ahead ? n.dist : Math.max(0, n.dist - PATH_BAND), fall: PATH_FALL, keep: 0 };
}

function plazaFeature(x, z) {
  return { h: 0, d: Math.max(0, Math.hypot(x - PLAZA.x, z - PLAZA.z) - PLAZA.r), fall: PLAZA_FALL, keep: 0 };
}

function baseCone(x, z) {
  const dx = x - SUMMIT.x, dz = z - SUMMIT.z;
  const r = Math.hypot(dx, dz);
  const a = Math.atan2(dz, dx);
  const wobble = 1 + 0.05 * Math.sin(a * 7) + 0.03 * Math.sin(a * 13 + 1.3);
  return SUMMIT_Y * Math.pow(Math.max(0, 1 - (r * wobble) / BASE_R), BASE_POW);
}

export function inSlopeCorridor(x, z, margin = 0) {
  const cz = ((z - SLOPE_Z0) / SLOPE_RUN) * COURSE.length;
  return cz >= 0 && cz <= COURSE.length && Math.abs(x - centerX(cz)) <= SLOPE_HALF + margin;
}

export function terrainHeight(x, z) {
  if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA.r) return 0;
  const feats = [slopeFeature(x, z), pathFeature(x, z), plazaFeature(x, z)];
  const ramp = Math.max(...feats.map(f => f.h - soft(f.d, f.fall)));
  const envelope = Math.min(...feats.map(f => f.h - BASE_MARGIN + BASE_RISE * Math.max(0, f.d - f.keep)));
  return Math.max(0, ramp, Math.min(baseCone(x, z), envelope));
}

const SLOPE_LINE = Array.from({ length: 111 }, (_, i) => {
  const z = (i * COURSE.length) / 110;
  return slopePoint(z, centerX(z));
});

function slopeLineDist(x, z) {
  return Math.min(...SLOPE_LINE.map(p => Math.hypot(x - p.x, z - p.z)));
}

function cloudClear(x, y, z, s) {
  const pad = CLOUD_CLEAR + s * 1.3;
  return slopeLineDist(x, z) >= SLOPE_HALF + pad
    && nearestOnPath({ x, z }).dist >= PATH_BAND + pad
    && y > terrainHeight(x, z) + s * 0.35;
}

function contourRadius(a) {
  let r = CLOUD_R0;
  while (r < BASE_R && terrainHeight(SUMMIT.x + Math.cos(a) * r, SUMMIT.z + Math.sin(a) * r) > CLOUD_Y - CLOUD_DIP) r += 0.5;
  return r;
}

function clusterPuffs(rnd, cx, cz) {
  const size = 1.8 + rnd() * 1.4;
  return Array.from({ length: 4 }, () => {
    const s = size * (0.55 + rnd() * 0.6);
    return [cx + (rnd() - 0.5) * size * 2.4, CLOUD_Y + (rnd() - 0.3) * size * 0.6, cz + (rnd() - 0.5) * size * 1.6, s];
  });
}

function ringCentres(rnd) {
  return Array.from({ length: CLOUD_CLUSTERS }, (_, i) => {
    const a = (i / CLOUD_CLUSTERS) * Math.PI * 2 + rnd() * 0.12;
    const r = contourRadius(a) + 1.5 + rnd() * 4;
    return [SUMMIT.x + Math.cos(a) * r, SUMMIT.z + Math.sin(a) * r];
  });
}

function flankCentres(rnd) {
  return Array.from({ length: CLOUD_FLANK_ROWS * 2 }, (_, i) => {
    const z = CLOUD_FLANK_Z0 + Math.floor(i / 2) * CLOUD_FLANK_STEP + rnd() * 2;
    const cz = ((z - SLOPE_Z0) / SLOPE_RUN) * COURSE.length;
    return [centerX(cz) + (i % 2 ? 1 : -1) * (SLOPE_HALF + 6 + rnd() * 9), z];
  });
}

export function cloudPuffs() {
  let seed = 29;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  return [...ringCentres(rnd), ...flankCentres(rnd)]
    .flatMap(([cx, cz]) => clusterPuffs(rnd, cx, cz))
    .filter(([x, y, z, s]) => cloudClear(x, y, z, s));
}
