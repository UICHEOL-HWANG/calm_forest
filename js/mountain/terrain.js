import { COURSE, centerX } from './course.js';
import { ACORNS, CLIMB_PATH, PLAZA, nearestOnPath } from './climb.js';
import { colorAt, SNOW } from './backdrop.js';

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
const GRID_STEP = 2;
const GRID_X = 74;
const GRID_Z0 = -78;
const GRID_Z1 = 92;
const OVERLAY = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };

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

function strip(THREE, pts, width, color) {
  const pos = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz) || 1;
    const nx = (-dz / len) * width / 2, nz = (dx / len) * width / 2;
    const q = [[a.x - nx, a.y, a.z - nz], [a.x + nx, a.y, a.z + nz], [b.x + nx, b.y, b.z + nz], [b.x - nx, b.y, b.z - nz]];
    pos.push(...q[0], ...q[2], ...q[1], ...q[0], ...q[3], ...q[2]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color, flatShading: true, side: THREE.DoubleSide, ...OVERLAY }));
}

function groundTint(x, z, h) {
  if (inSlopeCorridor(x, z, 1)) return SNOW;
  return colorAt(h, Math.atan2(z - SUMMIT.z, x - SUMMIT.x), SUMMIT_Y * 1.2);
}

function groundMesh(THREE) {
  const nx = Math.round((GRID_X * 2) / GRID_STEP), nz = Math.round((GRID_Z1 - GRID_Z0) / GRID_STEP);
  const vert = (i, j) => {
    const x = -GRID_X + i * GRID_STEP, z = GRID_Z0 + j * GRID_STEP;
    return [x, terrainHeight(x, z), z];
  };
  const rows = Array.from({ length: nz + 1 }, (_, j) => Array.from({ length: nx + 1 }, (_, i) => vert(i, j)));
  const pos = [], col = [], c = new THREE.Color();
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const p00 = rows[j][i], p10 = rows[j][i + 1], p01 = rows[j + 1][i], p11 = rows[j + 1][i + 1];
    for (const tri of [[p00, p01, p11], [p00, p11, p10]]) {
      const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3, cz = (tri[0][2] + tri[1][2] + tri[2][2]) / 3;
      c.setHex(groundTint(cx, cz, cy));
      for (const v of tri) { pos.push(v[0], v[1], v[2]); col.push(c.r, c.g, c.b); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
}

function instanced(THREE, geo, color, items) {
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color, flatShading: true }), items.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3();
  items.forEach(([x, y, z, sc], i) => { m.compose(v.set(x, y, z), q, s.setScalar(sc)); mesh.setMatrixAt(i, m); });
  return mesh;
}

export function buildMountainSpace(THREE) {
  const group = new THREE.Group();
  const ground = groundMesh(THREE);
  const climbPts = CLIMB_PATH.map((p, i) => ({ x: p.x, y: pathY(i) + 0.05, z: p.z }));
  const slopePts = Array.from({ length: 67 }, (_, i) => {
    const z = i * (COURSE.length / 66);
    const p = slopePoint(z, centerX(z));
    return { ...p, y: p.y + 0.05 };
  });
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(PLAZA.r, 24), new THREE.MeshLambertMaterial({ color: 0xe9eef3, ...OVERLAY }));
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(PLAZA.x, 0.02, PLAZA.z);
  const flags = instanced(THREE, new THREE.ConeGeometry(0.35, 1.6, 4), 0xe8743c,
    COURSE.flags.flatMap(f => [-1, 1].map(side => { const p = slopePoint(f.z, f.x + side * f.half); return [p.x, p.y + 0.8, p.z, 1]; })));
  const snowballs = instanced(THREE, new THREE.IcosahedronGeometry(1, 0), 0xf6f8fb,
    COURSE.obstacles.filter(o => o.kind === 'snowball').map(o => { const p = slopePoint(o.z, o.x); return [p.x, p.y + 0.6, p.z, o.r * 0.8]; }));
  const rocks = instanced(THREE, new THREE.DodecahedronGeometry(1, 0), 0x6b625a,
    COURSE.obstacles.filter(o => o.kind === 'rock').map(o => { const p = slopePoint(o.z, o.x); return [p.x, p.y + 0.5, p.z, o.r * 0.8]; }));
  const acorns = instanced(THREE, new THREE.IcosahedronGeometry(0.35, 0), 0x9a6a2f,
    ACORNS.map((a, i) => [a.x, acornY(i), a.z, 1]));
  group.add(ground, plaza, strip(THREE, climbPts, 3, 0xcfc6b4), strip(THREE, slopePts, COURSE.width, 0xf6f8fb), flags, snowballs, rocks, acorns);
  group.userData = { acorns, ground };
  return group;
}
