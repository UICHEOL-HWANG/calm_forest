import * as THREE from 'three';
import { bakeGroup, part } from '../dream/art.js';

export const IDS = ['kn_rocking_chair', 'kn_yarn_basket', 'kn_patch_rug', 'kn_knit_pot'];
export const YARD_IDS = [];

const C = {
  cream: 0xe6d6b8, creamDk: 0xcdb48c,
  mustard: 0xd29a3a, mustardDk: 0xa87828,
  rose: 0xc8707a, roseDk: 0x9c4c58,
  sage: 0x8aa07a, sageDk: 0x667f5c,
  wood: 0xb8834e, woodDk: 0x7e5432, walnut: 0x5e3e2a,
  wicker: 0xc49a5c, wickerDk: 0x98713f,
  terra: 0xb86a48, leafDk: 0x476e45,
};

const BACK_DROP = 0.06;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sph = (r, w = 20, h = 14) => new THREE.SphereGeometry(r, w, h);
const cyl = (a, b, h, s = 24) => new THREE.CylinderGeometry(a, b, h, s);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const torus = (r, t, rs = 8, ts = 28) => new THREE.TorusGeometry(r, t, rs, ts);
const lathe = (pr, seg = 28) => new THREE.LatheGeometry(pr.map(([x, y]) => new THREE.Vector2(x, y)), seg);
const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
const tube = (pts, r, seg = 30, rad = 8) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V(...p))), seg, r, rad, false);

function rod(p, a, b, r, col, seg = 12, r2 = r) {
  const A = V(...a), B = V(...b), d = B.clone().sub(A);
  const m = part(p, cyl(r2, r, d.length(), seg), col, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  return m;
}

function roundSlab(p, w, d, h, r, col, y) {
  const sh = new THREE.Shape(), x0 = -w / 2, z0 = -d / 2;
  sh.moveTo(x0 + r, z0); sh.lineTo(x0 + w - r, z0); sh.quadraticCurveTo(x0 + w, z0, x0 + w, z0 + r);
  sh.lineTo(x0 + w, z0 + d - r); sh.quadraticCurveTo(x0 + w, z0 + d, x0 + w - r, z0 + d);
  sh.lineTo(x0 + r, z0 + d); sh.quadraticCurveTo(x0, z0 + d, x0, z0 + d - r);
  sh.lineTo(x0, z0 + r); sh.quadraticCurveTo(x0, z0, x0 + r, z0);
  const bev = Math.min(h * 0.45, r * 0.8);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.001, h - bev * 2), bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelSegments: 4, curveSegments: 12 });
  geo.rotateX(Math.PI / 2); geo.translate(0, h - bev, 0);
  return part(p, geo, col, 0, y, 0);
}

function ribbed(geo, n, amp) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), f = 1 + amp * Math.cos(Math.atan2(z, x) * n);
    pos.setX(i, x * f); pos.setZ(i, z * f);
  }
  geo.computeVertexNormals();
  return geo;
}

function yarnBall(p, r, c, cDk, x, y, z, seed) {
  const b = grp(p, x, y, z);
  part(b, sph(r), c);
  for (let i = 0; i < 6; i++) part(b, torus(r, r * 0.07, 5, 28), i % 2 ? cDk : c).rotation.set(seed * 0.7 + i * 1.1, seed + i * 0.6, i * 0.9);
}

function needle(p, a, b, r) {
  rod(p, a, b, r, C.woodDk, 8, r * 0.6);
  part(p, sph(r * 2.2, 10, 8), C.rose, ...b);
}

function pompom(p, r, col, x, y, z, puffs) {
  part(p, new THREE.IcosahedronGeometry(r, 2), col, x, y, z);
  for (let i = 0; i < puffs; i++) {
    const a = i * 2.39996, t = (i + 0.5) / puffs, ry = 1 - 2 * t, rr = Math.sqrt(1 - ry * ry);
    part(p, new THREE.IcosahedronGeometry(r * 0.42, 1), col, x + Math.cos(a) * rr * r * 0.85, y + ry * r * 0.85, z + Math.sin(a) * rr * r * 0.85);
  }
}

function rockers(s, half, len, col, lift = 0.03) {
  [-1, 1].forEach(sx => part(s, tube([[sx * half, lift + 0.09, -len * 0.55], [sx * half, lift + 0.02, -len * 0.25], [sx * half, lift, 0.05], [sx * half, lift + 0.03, len * 0.35], [sx * half, lift + 0.11, len * 0.5]], 0.026, 30, 8), col));
}

function stripes(p, w, h, d, cols, n, x, y, z) {
  const g = grp(p, x, y, z);
  for (let i = 0; i < n; i++) part(g, box(w, h / n + 0.002, d), cols[i % cols.length], 0, -h / 2 + (i + 0.5) * h / n, 0);
  return g;
}

const BUILD = {
  kn_rocking_chair(s) {
    const top = 1.08 - BACK_DROP;
    rockers(s, 0.24, 0.85, C.woodDk);
    [[-0.22, 0.2], [0.22, 0.2], [-0.22, -0.18], [0.22, -0.18]].forEach(([x, z]) => rod(s, [x, 0.06, z], [x, 0.42, z], 0.025, C.wood));
    roundSlab(s, 0.54, 0.48, 0.05, 0.06, C.wood, 0.4);
    [-1, 1].forEach(sx => {
      rod(s, [sx * 0.23, 0.42, -0.2], [sx * 0.25, top, -0.32], 0.03, C.woodDk);
      rod(s, [sx * 0.23, 0.42, 0.2], [sx * 0.25, 0.68, 0.2], 0.025, C.wood);
      rod(s, [sx * 0.25, 0.7, -0.24], [sx * 0.26, 0.7, 0.24], 0.03, C.woodDk);
    });
    part(s, tube([[-0.27, top - 0.02, -0.31], [0, top + 0.04, -0.35], [0.27, top - 0.02, -0.31]], 0.035, 20, 8), C.woodDk);
    [-0.14, -0.07, 0, 0.07, 0.14].forEach(x => rod(s, [x, 0.46, -0.21], [x, top, -0.33], 0.014, C.wood));
    roundSlab(s, 0.46, 0.42, 0.07, 0.08, C.cream, 0.45);
    for (let i = -3; i <= 3; i++) part(s, box(0.012, 0.012, 0.36), C.creamDk, i * 0.06, 0.525, 0);
    const bl = grp(s, 0, 0.88 - BACK_DROP, -0.29); bl.rotation.x = -0.19;
    stripes(bl, 0.46, 0.38, 0.03, [C.rose, C.rose, C.mustard, C.cream], 8, 0, 0, 0.03);
    stripes(bl, 0.46, 0.16, 0.03, [C.rose, C.mustard], 4, 0, 0.12, -0.04);
    for (let i = 0; i < 9; i++) part(bl, box(0.016, 0.06, 0.016), C.roseDk, -0.2 + i * 0.05, -0.22, 0.03);
  },
  kn_yarn_basket(s) {
    part(s, ribbed(lathe([[0.2, 0], [0.24, 0.04], [0.25, 0.2], [0.27, 0.3]], 36), 18, 0.03), C.wicker);
    part(s, cyl(0.2, 0.2, 0.03, 30), C.wickerDk, 0, 0.015, 0);
    [0.08, 0.16, 0.24].forEach(y => part(s, torus(0.24 + y * 0.1, 0.012, 5, 36), C.wickerDk, 0, y, 0).rotation.x = Math.PI / 2);
    part(s, torus(0.27, 0.025, 6, 36), C.wickerDk, 0, 0.3, 0).rotation.x = Math.PI / 2;
    yarnBall(s, 0.11, C.rose, C.roseDk, -0.1, 0.3, 0.06, 1);
    yarnBall(s, 0.1, C.mustard, C.mustardDk, 0.1, 0.29, 0.08, 2);
    yarnBall(s, 0.1, C.cream, C.creamDk, 0.0, 0.31, -0.1, 3);
    yarnBall(s, 0.09, C.sage, C.sageDk, 0.13, 0.3, -0.09, 4);
    yarnBall(s, 0.08, C.rose, C.roseDk, -0.14, 0.29, -0.11, 5);
    needle(s, [0.02, 0.28, -0.02], [-0.12, 0.62, -0.14], 0.012);
    needle(s, [0.04, 0.28, -0.02], [0.04, 0.6, -0.2], 0.012);
    part(s, tube([[0.1, 0.3, 0.17], [0.2, 0.22, 0.27], [0.27, 0.06, 0.3], [0.33, 0.012, 0.33]], 0.01, 20, 5), C.mustardDk);
  },
  kn_patch_rug(s) {
    const rings = [C.rose, C.mustard, C.cream, C.sage, C.rose, C.mustard, C.cream, C.roseDk];
    const g = grp(s); g.scale.set(1.32, 1, 1);
    part(g, cyl(0.1, 0.1, 0.03, 20), C.mustard, 0, 0.015, 0);
    rings.forEach((c, i) => {
      const t = part(g, torus(0.13 + i * 0.054, 0.03, 6, 64), c, 0, 0.022, 0);
      t.rotation.x = Math.PI / 2; t.scale.z = 0.55;
    });
  },
  kn_knit_pot(s) {
    part(s, lathe([[0.001, 0], [0.14, 0], [0.17, 0.32], [0.18, 0.34], [0.15, 0.34]], 28), C.terra);
    for (let i = 0; i < 6; i++) {
      const y0 = 0.03 + i * 0.05, r0 = 0.142 + 0.03 * (y0 + 0.025) / 0.32;
      part(s, ribbed(cyl(r0 + 0.012, r0 + 0.01, 0.052, 36), 18, 0.03), i % 2 ? C.cream : C.rose, 0, y0 + 0.025, 0);
    }
    part(s, cyl(0.16, 0.16, 0.02, 24), C.walnut, 0, 0.33, 0);
    const flowers = [[0, 0.82, 0, C.mustard], [0.1, 0.7, 0.06, C.rose], [-0.1, 0.72, 0.05, C.cream], [0.06, 0.64, -0.1, C.cream], [-0.08, 0.66, -0.08, C.rose]];
    flowers.forEach(([x, y, z, c], i) => {
      part(s, tube([[x * 0.2, 0.33, z * 0.2], [x * 0.6, (0.33 + y) / 2, z * 0.6], [x, y, z]], 0.008, 12, 5), C.leafDk);
      pompom(s, 0.055, c, x, y, z, 8);
      const lf = part(s, ribbed(sph(0.05, 12, 8), 6, 0.08), C.sage, x * 0.6 + (i % 2 ? 0.04 : -0.04), (0.33 + y) / 2, z * 0.6);
      lf.scale.set(1, 0.3, 0.55); lf.rotation.y = i;
    });
  },
};

export function build(id) {
  const fn = BUILD[id];
  if (!fn) throw new Error(`unknown knit pick decor: ${id}`);
  const solid = new THREE.Group();
  fn(solid);
  const out = new THREE.Group();
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: false, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }));
  body.castShadow = true; body.receiveShadow = true;
  out.add(body);
  return out;
}
