import * as THREE from 'three';
import { bakeGroup, part } from '../dream/art.js';

export const IDS = ['tc_tea_table', 'tc_floor_cushion', 'tc_teaware_shelf'];
export const YARD_IDS = ['tc_bamboo_basin'];

const C = {
  matcha: 0x8fb45a, matchaDk: 0x67904a, celadon: 0x9cc6b2, celadonDk: 0x74a390,
  cream: 0xe2d4b6, creamDk: 0xcab994, wood: 0xc2905c, woodDk: 0x8e6440,
  persimmon: 0xe57c48, stone: 0xaaa699, stoneDk: 0x7b786e, stoneLt: 0xb4b0a4,
  moss: 0x8a9548, water: 0x8cc4d0, stream: 0xa8d4de, bamboo: 0xa2bf66, bambooDk: 0x7a9a48,
};

const TAU = Math.PI * 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sph = (r, w = 24, h = 18, ...rest) => new THREE.SphereGeometry(r, w, h, ...rest);
const cyl = (a, b, h, s = 24, ...rest) => new THREE.CylinderGeometry(a, b, h, s, ...rest);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const torus = (r, t, rs = 8, ts = 28, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc);
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

function teapot(p, x, y, z, r, body, lid, knob, rot = 0) {
  const g = grp(p, x, y, z); g.rotation.y = rot;
  part(g, sph(r), body, 0, r * 0.78, 0).scale.y = 0.8;
  part(g, cyl(r * 0.5, r * 0.56, r * 0.08, 24), lid, 0, r * 1.42, 0);
  part(g, sph(r * 0.5, 24, 10, 0, TAU, 0, Math.PI / 2), lid, 0, r * 1.45, 0).scale.y = 0.35;
  part(g, sph(r * 0.13), knob, 0, r * 1.66, 0);
  part(g, cyl(r * 0.5, r * 0.55, r * 0.12, 24), body, 0, r * 0.08, 0);
  const sp = grp(g, r * 0.8, r * 0.72, 0); sp.rotation.z = -0.75;
  part(sp, cyl(r * 0.09, r * 0.17, r * 0.62, 14), body, 0, r * 0.26, 0);
  part(g, torus(r * 0.34, r * 0.08, 8, 20, Math.PI * 1.3), body, -r * 0.92, r * 0.84, 0).rotation.z = Math.PI * 0.35;
  return g;
}

function cup(p, x, y, z, r, col = C.celadon, tea = C.matcha) {
  const g = grp(p, x, y, z);
  part(g, cyl(r * 0.5, r * 0.55, r * 0.14, 20), col, 0, r * 0.07, 0);
  part(g, lathe([[0, r * 0.1], [r * 0.6, r * 0.12], [r * 0.9, r * 0.45], [r, r * 0.85], [r * 0.92, r * 0.85], [r * 0.82, r * 0.5], [0, r * 0.3]], 24), col);
  part(g, cyl(r * 0.88, r * 0.88, 0.004, 22), tea, 0, r * 0.72, 0);
  return g;
}

function persimmon(p, x, y, z, r) {
  const g = grp(p, x, y, z);
  part(g, sph(r), C.persimmon, 0, r * 0.8, 0).scale.y = 0.8;
  for (let i = 0; i < 4; i++) {
    const l = part(g, sph(r * 0.32, 10, 8), C.matchaDk, Math.cos(i / 4 * TAU) * r * 0.24, r * 1.42, Math.sin(i / 4 * TAU) * r * 0.24);
    l.scale.set(1, 0.28, 0.55); l.rotation.y = -i / 4 * TAU;
  }
  part(g, cyl(r * 0.06, r * 0.07, r * 0.22, 8), C.woodDk, 0, r * 1.55, 0);
  return g;
}

function plate(p, x, y, z, r, col = C.cream) {
  part(p, lathe([[0, 0], [r * 0.6, 0], [r, r * 0.16], [r * 0.94, r * 0.18], [0, r * 0.08]], 24), col, x, y, z);
}

function caddy(p, x, y, z, r, h, col, lid) {
  part(p, cyl(r, r, h, 22), col, x, y + h / 2, z);
  part(p, cyl(r * 1.04, r * 1.04, h * 0.22, 22), lid, x, y + h * 0.95, z);
  part(p, sph(r * 0.3), lid, x, y + h * 1.08, z).scale.y = 0.6;
}

function bambooRod(p, a, b, r, nodes = 3) {
  rod(p, a, b, r, C.bamboo, 16);
  for (let i = 1; i <= nodes; i++) {
    const t = i / (nodes + 1), q = V(...a).lerp(V(...b), t);
    const ring = part(p, torus(r * 1.02, r * 0.14, 6, 20), C.bambooDk, q.x, q.y, q.z);
    ring.quaternion.setFromUnitVectors(V(0, 0, 1), V(...b).sub(V(...a)).normalize());
  }
}

function pebble(p, x, z, r, col = C.stoneLt, sq = 0.5) {
  part(p, sph(r, 16, 12), col, x, r * sq * 0.6, z).scale.set(1.15, sq, 0.95);
}

function stream(p, x, top, bottom, z, r = 0.022) {
  part(p, cyl(r * 0.8, r, top - bottom, 12), C.stream, x, (top + bottom) / 2, z);
  part(p, torus(r * 2.6, r * 0.5, 6, 20), C.stream, x, bottom + 0.004, z).rotation.x = Math.PI / 2;
  part(p, torus(r * 4.8, r * 0.35, 6, 24), C.stream, x, bottom + 0.003, z).rotation.x = Math.PI / 2;
}

function cushionSq(p, x, z, s, top, edge, knot, rot = 0) {
  const g = grp(p, x, 0, z); g.rotation.y = rot;
  roundSlab(g, s, s, 0.12, 0.1, top, 0);
  roundSlab(g, s * 1.02, s * 1.02, 0.018, 0.1, edge, 0.052);
  part(g, sph(0.035), knot, 0, 0.125, 0).scale.y = 0.6;
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([a, b]) => part(g, sph(0.012), C.creamDk, a * s * 0.18, 0.121, b * s * 0.18).scale.y = 0.4);
  return g;
}

function shelfFrame(s, w, d, h, boards) {
  [-1, 1].forEach(sx => part(s, box(0.06, h, d), C.wood, sx * (w / 2 - 0.03), h / 2, 0));
  part(s, box(w, h, 0.02), C.creamDk, 0, h / 2, -d / 2 + 0.01);
  boards.forEach(y => part(s, box(w - 0.06, 0.04, d), C.wood, 0, y, 0));
  part(s, box(w + 0.06, 0.05, d + 0.04), C.woodDk, 0, h + 0.025, 0);
  part(s, box(w, 0.06, d), C.woodDk, 0, 0.03, 0);
}

function kakei(s, px, pz, ph, tipX, tipZ, tipY) {
  bambooRod(s, [px, 0, pz], [px, ph, pz], 0.045, 3);
  part(s, sph(0.046, 16, 8, 0, TAU, 0, Math.PI / 2), C.bambooDk, px, ph, pz).scale.y = 0.3;
  bambooRod(s, [px, ph - 0.06, pz], [tipX, tipY, tipZ], 0.028, 2);
}

const BUILD = {
  tc_tea_table(s) {
    const top = 0.3;
    part(s, cyl(0.44, 0.44, 0.05, 12), C.wood, 0, top, 0).rotation.y = Math.PI / 12;
    part(s, torus(0.43, 0.018, 6, 12), C.woodDk, 0, top + 0.025, 0).rotation.set(Math.PI / 2, 0, Math.PI / 12);
    part(s, cyl(0.4, 0.38, 0.06, 12), C.woodDk, 0, top - 0.05, 0).rotation.y = Math.PI / 12;
    [0, 1, 2, 3].forEach(i => {
      const a = i / 4 * TAU + Math.PI / 4, cx = Math.cos(a), cz = Math.sin(a);
      part(s, tube([[cx * 0.28, top - 0.07, cz * 0.28], [cx * 0.36, top - 0.16, cz * 0.36], [cx * 0.32, 0.08, cz * 0.32], [cx * 0.38, 0.0, cz * 0.38]], 0.032, 24, 10), C.woodDk);
    });
    part(s, torus(0.33, 0.016, 6, 32), C.woodDk, 0, 0.11, 0).rotation.x = Math.PI / 2;
    teapot(s, -0.05, top + 0.025, -0.06, 0.14, C.cream, C.matcha, C.persimmon, 0.6);
    cup(s, 0.22, top + 0.025, 0.1, 0.075);
    cup(s, -0.04, top + 0.025, 0.24, 0.075);
    persimmon(s, 0.24, top + 0.025, -0.16, 0.066);
  },
  tc_floor_cushion(s) {
    cushionSq(s, 0, 0, 0.66, C.matcha, C.cream, C.persimmon);
  },
  tc_teaware_shelf(s) {
    const w = 1.0, d = 0.32, h = 1.2;
    shelfFrame(s, w, d, h, [0.42, 0.82]);
    teapot(s, -0.24, 0.84, 0, 0.1, C.celadon, C.celadon, C.persimmon, 0.4);
    [0.06, 0.2, 0.34].forEach((x, i) => cup(s, x, 0.84, 0.02, 0.05, i === 1 ? C.cream : C.celadon));
    caddy(s, -0.3, 0.44, 0, 0.07, 0.18, C.matcha, C.woodDk);
    caddy(s, -0.12, 0.44, 0, 0.06, 0.14, C.cream, C.matchaDk);
    plate(s, 0.22, 0.44, 0, 0.13);
    persimmon(s, 0.18, 0.455, 0.0, 0.05); persimmon(s, 0.27, 0.455, 0.02, 0.045);
    teapot(s, 0.0, 0.06, 0.02, 0.12, C.wood, C.celadon, C.celadonDk, -0.3);
    caddy(s, 0.3, 0.06, 0, 0.08, 0.2, C.celadonDk, C.woodDk);
  },
  tc_bamboo_basin(s) {
    const bx = 0.1, bz = 0.08;
    part(s, lathe([[0, 0], [0.2, 0], [0.3, 0.06], [0.34, 0.18], [0.33, 0.3], [0.3, 0.34], [0.26, 0.34], [0.25, 0.3], [0, 0.26]], 36), C.stone, bx, 0, bz);
    part(s, cyl(0.255, 0.255, 0.01, 36), C.water, bx, 0.305, bz);
    stream(s, bx - 0.08, 0.62, 0.31, bz - 0.04);
    kakei(s, -0.42, -0.24, 0.8, bx - 0.08, bz - 0.04, 0.63);
    [[-0.32, 0.22, 0.1], [0.46, -0.08, 0.12, C.stone], [0.42, 0.3, 0.07], [-0.12, 0.42, 0.06, C.stoneDk], [-0.48, -0.02, 0.08]].forEach(([x, z, r, c]) => pebble(s, x, z, r, c ?? C.stoneLt));
    part(s, cyl(0.5, 0.52, 0.02, 40), C.moss, 0.02, 0.01, 0.06).scale.z = 0.8;
    const lad = grp(s, bx + 0.1, 0.35, bz + 0.05); lad.rotation.set(0, 0.6, -0.08);
    part(lad, cyl(0.012, 0.012, 0.46, 10), C.wood, 0, 0, 0).rotation.z = Math.PI / 2;
    part(lad, cyl(0.04, 0.035, 0.06, 18), C.bamboo, -0.24, -0.01, 0);
  },
};

export function build(id) {
  const fn = BUILD[id];
  if (!fn) throw new Error(`unknown tea pick decor: ${id}`);
  const solid = new THREE.Group();
  fn(solid);
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: false, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }));
  body.castShadow = true; body.receiveShadow = true;
  const out = new THREE.Group();
  out.add(body);
  return out;
}
