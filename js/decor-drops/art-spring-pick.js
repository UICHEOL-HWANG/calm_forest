import * as THREE from 'three';
import { bakeGroup, part } from '../dream/art.js';

export const IDS = ['sb_blossom_pot', 'sb_picnic_mat'];
export const YARD_IDS = ['sb_petal_swing', 'sb_blossom_arch'];

const C = {
  sakura: 0xf592b6, sakuraDk: 0xe0739c, sakuraLt: 0xf9bad2, rose: 0xc95a7a,
  cream: 0xe6d6ba, leafDk: 0x689e50,
  wood: 0xc99a64, woodDk: 0x9c7046, bark: 0x7a5a44,
  soil: 0x6b5240, rope: 0xd8c49a, stone: 0x9a948a,
};

const TAU = Math.PI * 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sph = (r, w = 12, h = 9) => new THREE.SphereGeometry(r, w, h);
const cyl = (a, b, h, s = 12) => new THREE.CylinderGeometry(a, b, h, s);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const torus = (r, t, rs = 6, ts = 18, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc);
const lathe = (pr, seg = 20) => new THREE.LatheGeometry(pr.map(([x, y]) => new THREE.Vector2(x, y)), seg);
const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
const tube = (pts, r, seg = 30, rad = 6) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V(...p))), seg, r, rad, false);
const PINKS = [C.sakura, C.sakuraLt, C.sakura, C.sakuraDk];

function rod(p, a, b, r, col, seg = 6, r2 = r) {
  const A = V(...a), B = V(...b), d = B.clone().sub(A);
  const m = part(p, cyl(r2, r, d.length(), seg), col, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  return m;
}

function petalShape(s) {
  const sh = new THREE.Shape();
  sh.moveTo(0, 0);
  sh.bezierCurveTo(s * 0.44, s * 0.16, s * 0.46, s * 0.84, s * 0.18, s);
  sh.lineTo(0, s * 0.86);
  sh.lineTo(-s * 0.18, s);
  sh.bezierCurveTo(-s * 0.46, s * 0.84, -s * 0.44, s * 0.16, 0, 0);
  return sh;
}

function flatPetal(p, s, depth, col, x, y, z, rot) {
  const geo = new THREE.ExtrudeGeometry(petalShape(s), { depth, bevelEnabled: false, curveSegments: 8 });
  geo.rotateX(-Math.PI / 2);
  const m = part(p, geo, col, x, y, z); m.rotation.y = rot;
  return m;
}

function flatBlossom(p, s, depth, col, x, y, z, rot = 0, center = C.rose) {
  for (let i = 0; i < 5; i++) flatPetal(p, s, depth, col, x, y, z, rot + i / 5 * TAU);
  part(p, cyl(s * 0.18, s * 0.18, depth * 1.4, 12), center, x, y + depth * 0.7, z);
}

function clump(p, x, y, z, r, n = 6, seed = 0, sq = 1) {
  const g = grp(p, x, y, z); g.scale.y = sq;
  part(g, sph(r, 12, 8), PINKS[seed % 4]);
  for (let i = 0; i < n; i++) {
    const a = i * 2.39996 + seed, t = (i + 0.5) / n, yy = 1 - 1.6 * t, rr = Math.sqrt(Math.max(0, 1 - yy * yy));
    part(g, sph(r * (0.5 + 0.12 * ((i + seed) % 3)), 10, 7), PINKS[(i + seed + 1) % 4], Math.cos(a) * rr * r * 0.85, yy * r * 0.7, Math.sin(a) * rr * r * 0.85);
  }
  return g;
}

function gingham(p, w, d, n, m, y, base, check, t = 0.02) {
  part(p, box(w, t, d), base, 0, y + t / 2, 0);
  const cw = w / n, cd = d / m;
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) if ((i + j) % 2 === 0)
    part(p, box(cw, t * 0.4, cd), check, -w / 2 + cw * (i + 0.5), y + t + t * 0.2, -d / 2 + cd * (j + 0.5));
}

function flatBlossomV(p, s, x, y, z, seed = 0) {
  const g = grp(p, x, y, z); g.rotation.x = Math.PI / 2;
  flatBlossom(g, s, 0.012, seed % 2 ? C.sakuraLt : C.sakura, 0, 0, 0, seed);
  return g;
}

function swingSeat(p, x, y, z, w, d, col, top, ropeX = w * 0.42) {
  part(p, box(w, 0.05, d), col, x, y, z);
  part(p, box(w * 1.02, 0.02, d * 1.02), C.woodDk, x, y - 0.03, z);
  [-1, 1].forEach(s => {
    rod(p, [x + s * ropeX, y, z], [x + s * ropeX, top, z], 0.012, C.rope, 5);
    [0.3, 0.62].forEach((t, i) => flatBlossomV(p, 0.05, x + s * ropeX, y + (top - y) * t, z + 0.015, i));
  });
}

const BUILD = {
  sb_blossom_pot(s, soft) {
    part(s, lathe([[0, 0], [0.16, 0], [0.22, 0.06], [0.25, 0.2], [0.23, 0.34], [0.25, 0.37], [0.25, 0.4], [0.2, 0.4], [0, 0.36]]), C.cream);
    part(s, torus(0.24, 0.018, 5, 22), C.sakuraDk, 0, 0.3, 0).rotation.x = Math.PI / 2;
    part(s, cyl(0.21, 0.21, 0.02, 20), C.soil, 0, 0.37, 0);
    part(s, tube([[0, 0.36, 0], [0.04, 0.6, 0.02], [-0.05, 0.82, 0], [0.02, 1.0, -0.02]], 0.04, 24, 7), C.bark);
    part(s, tube([[-0.04, 0.78, 0], [-0.2, 0.92, 0.04], [-0.3, 1.02, 0.02]], 0.022, 16, 5), C.bark);
    part(s, tube([[0.0, 0.88, 0], [0.18, 0.98, -0.02], [0.28, 1.06, 0]], 0.02, 16, 5), C.bark);
    clump(soft, 0.02, 1.16, 0, 0.17, 8, 0);
    clump(soft, -0.3, 1.06, 0.04, 0.13, 6, 1);
    clump(soft, 0.3, 1.1, -0.02, 0.13, 6, 2);
    [[0.12, 0.42, 0.1, 0.4], [-0.1, 0.4, -0.06, 2.1]].forEach(([x, y, z, r]) => flatPetal(s, 0.05, 0.006, C.sakuraLt, x, y, z, r));
  },
  sb_picnic_mat(s) {
    gingham(s, 1.4, 1.0, 7, 5, 0, C.sakura, C.cream, 0.022);
    [-0.51, 0.51].forEach(z => part(s, box(1.44, 0.03, 0.04), C.leafDk, 0, 0.015, z));
    [-0.71, 0.71].forEach(x => part(s, box(0.04, 0.03, 1.06), C.leafDk, x, 0.015, 0));
    [[-0.55, -0.32, 0.4], [0.5, 0.36, 2.5], [0.2, -0.3, 4.2]].forEach(([x, z, r], i) => flatPetal(s, 0.07, 0.006, i % 2 ? C.sakuraLt : C.rose, x, 0.04, z, r));
  },
  sb_petal_swing(s, soft) {
    const top = 1.75, px = 0.85;
    [-1, 1].forEach(sx => {
      rod(s, [sx * px, 0, -0.38], [sx * px, top, 0], 0.045, C.wood, 7);
      rod(s, [sx * px, 0, 0.38], [sx * px, top, 0], 0.045, C.wood, 7);
      part(s, box(0.06, 0.05, 0.5), C.woodDk, sx * px, 0.5, 0);
    });
    rod(s, [-px - 0.1, top, 0], [px + 0.1, top, 0], 0.05, C.woodDk, 8);
    for (let i = 0; i < 7; i++) clump(soft, -0.72 + i * 0.24, top + 0.04, i % 2 ? 0.05 : -0.05, 0.1 + (i % 3) * 0.015, 5, i, 0.8);
    part(s, tube([[-0.6, top, 0.05], [-0.4, top - 0.18, 0.08], [-0.2, top - 0.05, 0.07], [0.05, top - 0.2, 0.08], [0.3, top - 0.06, 0.07], [0.55, top - 0.17, 0.08], [0.7, top - 0.02, 0.06]], 0.014, 40, 5), C.leafDk);
    swingSeat(s, 0, 0.45, 0, 0.7, 0.3, C.sakura, top);
  },
  sb_blossom_arch(s, soft) {
    const px = 0.9, cy = 1.25;
    [-1, 1].forEach(sx => {
      part(s, cyl(0.12, 0.14, 0.1, 10), C.stone, sx * px, 0.05, 0);
      part(s, box(0.09, cy, 0.09), C.wood, sx * px, cy / 2 + 0.05, 0);
      [0.35, 0.75].forEach((t, i) => clump(soft, sx * (px + 0.02), 0.05 + cy * t, 0.05, 0.08, 4, i + (sx > 0 ? 2 : 0)));
      part(s, tube([[sx * px, 0.1, 0.05], [sx * (px + 0.06), 0.5, 0.06], [sx * (px - 0.05), 0.9, 0.06], [sx * px, cy, 0.05]], 0.014, 20, 5), C.leafDk);
    });
    part(s, torus(px, 0.045, 6, 32, Math.PI), C.wood, 0, cy + 0.05, 0);
    for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI; clump(soft, Math.cos(a) * px, cy + 0.05 + Math.sin(a) * px, i % 2 ? 0.04 : -0.04, 0.14 + ((i + 1) % 3) * 0.02, 6, i); }
  },
};

function baked(group, flatShading) {
  const m = new THREE.Mesh(bakeGroup(group), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading, roughness: 0.9, metalness: 0 }));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function build(id) {
  const fn = BUILD[id];
  if (!fn) throw new Error(`unknown spring pick decor: ${id}`);
  const solid = new THREE.Group(), soft = new THREE.Group();
  fn(solid, soft);
  const out = new THREE.Group();
  out.add(baked(solid, true));
  if (soft.children.length) out.add(baked(soft, false));
  return out;
}
