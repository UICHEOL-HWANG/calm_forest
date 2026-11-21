import * as THREE from 'three';
import { bakeGroup, part } from '../dream/art.js';

export const IDS = ['sf_lantern_string', 'sf_goldfish_bowl'];
export const YARD_IDS = ['sf_shaved_ice_stand', 'sf_festival_stall'];

const C = {
  indigo: 0x46528e, indigoDk: 0x313a66, red: 0xd4503e, redDk: 0xa83c30,
  cream: 0xe2d4b6, creamDk: 0xcab994, soft: 0xd8d4ce, gold: 0xe0b450,
  wood: 0xc2905c, woodDk: 0x8e6440, walnut: 0x6e4c34, cap: 0x3c3448,
  fish: 0xf07a3a, fishLt: 0xf3a060, water: 0x7fb6cc, glass: 0xa8ccd8, rim: 0xbcd4da,
  leaf: 0x7ea35a, leafDk: 0x5f8a44, syrupBlue: 0x6f86c8,
  lampRed: 0xff7a52, lampOr: 0xffaa4e, lampCream: 0xecd4a2,
};

const TAU = Math.PI * 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sph = (r, w = 22, h = 16, ...rest) => new THREE.SphereGeometry(r, w, h, ...rest);
const cyl = (a, b, h, s = 22, ...rest) => new THREE.CylinderGeometry(a, b, h, s, ...rest);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const torus = (r, t, rs = 8, ts = 28, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc);
const lathe = (pr, seg = 28) => new THREE.LatheGeometry(pr.map(([x, y]) => new THREE.Vector2(x, y)), seg);
const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
const tube = (pts, r, seg = 40, rad = 8) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V(...p))), seg, r, rad, false);

function rod(p, a, b, r, col, seg = 12, r2 = r) {
  const A = V(...a), B = V(...b), d = B.clone().sub(A);
  const m = part(p, cyl(r2, r, d.length(), seg), col, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  return m;
}

function lantern(s, g, x, top, z, r, drop, col, rib = C.redDk, tall = 1) {
  const cy = top - drop - r * tall;
  rod(s, [x, top, z], [x, cy + r * tall, z], 0.006, C.cap, 6);
  part(s, cyl(r * 0.45, r * 0.5, r * 0.2, 16), C.cap, x, cy + r * tall * 0.98, z);
  part(s, cyl(r * 0.5, r * 0.45, r * 0.2, 16), C.cap, x, cy - r * tall * 0.98, z);
  const G = grp(g, x, cy, z);
  part(G, sph(r, 20, 16), col).scale.set(0.92, tall, 0.92);
  [-0.45, 0.45].forEach(t => part(s, torus(r * 0.92 * Math.sqrt(1 - t * t) * 1.01, r * 0.025, 5, 24), rib, x, cy + t * r * tall, z).rotation.x = Math.PI / 2);
  part(s, cyl(r * 0.05, r * 0.08, r * 0.35, 8), rib, x, cy - r * tall - r * 0.3, z);
  return cy;
}

function fish(p, x, y, z, k, rot = 0, col = C.fish) {
  const g = grp(p, x, y, z); g.rotation.y = rot;
  part(g, sph(0.05 * k, 16, 12), col).scale.set(1.3, 0.85, 0.75);
  [-1, 1].forEach(sy => {
    const t = part(g, sph(0.035 * k, 12, 8), C.fishLt, -0.075 * k, sy * 0.016 * k, 0);
    t.scale.set(1.2, 0.5, 0.3); t.rotation.z = sy * 0.6;
  });
  part(g, sph(0.018 * k, 10, 8), C.fishLt, 0, 0.042 * k, 0).scale.set(1.4, 0.6, 0.3);
  [-1, 1].forEach(sz => part(g, sph(0.008 * k, 8, 6), C.cap, 0.04 * k, 0.012 * k, sz * 0.03 * k));
  return g;
}

function floatFish(p, x, y, z, k, rot) {
  const f = fish(p, x, y, z, k, rot); f.rotation.order = 'YXZ'; f.rotation.x = Math.PI / 2;
  return f;
}

function scoop(p, x, y, z, rot, tilt = 0.4) {
  const g = grp(p, x, y, z); g.rotation.set(0, rot, tilt);
  part(g, torus(0.05, 0.007, 6, 20), C.red).rotation.x = Math.PI / 2;
  part(g, cyl(0.046, 0.046, 0.002, 18), C.soft, 0, 0, 0);
  rod(g, [0.05, 0, 0], [0.17, 0, 0], 0.007, C.red, 6);
  return g;
}

function stripedRoof(s, w, d, yb, yf, n, a, b, zc = 0) {
  const L = Math.hypot(d, yb - yf), ang = Math.atan2(yb - yf, d), sw = w / n;
  for (let i = 0; i < n; i++) {
    const m = part(s, box(sw * 1.002, 0.035, L), i % 2 ? b : a, -w / 2 + sw * (i + 0.5), (yb + yf) / 2, zc);
    m.rotation.x = ang;
  }
  for (let i = 0; i < n; i++) {
    const m = part(s, sph(sw / 2, 16, 10, 0, TAU, Math.PI / 2, Math.PI / 2), i % 2 ? b : a, -w / 2 + sw * (i + 0.5), yf - 0.012, zc + d / 2);
    m.scale.set(1, 0.7, 0.25);
  }
}

function posts(s, w, d, yb, yf, col, r = 0.035, zc = 0) {
  [-1, 1].forEach(sx => {
    rod(s, [sx * (w / 2 - 0.04), 0, zc - d / 2 + 0.04], [sx * (w / 2 - 0.04), yb, zc - d / 2 + 0.04], r, col);
    rod(s, [sx * (w / 2 - 0.04), 0, zc + d / 2 - 0.04], [sx * (w / 2 - 0.04), yf, zc + d / 2 - 0.04], r, col);
  });
}

function counter(s, w, d, h, z, body, band, top = C.wood) {
  part(s, box(w, h, d), body, 0, h / 2, z);
  part(s, box(w + 0.04, 0.05, d + 0.06), top, 0, h + 0.025, z);
  part(s, box(w + 0.004, 0.08, d + 0.004), band, 0, h * 0.72, z);
  part(s, box(w + 0.01, 0.05, d + 0.01), C.woodDk, 0, 0.025, z);
}

function iceCup(s, x, y, z, syrup) {
  part(s, lathe([[0, 0], [0.04, 0], [0.055, 0.07], [0.05, 0.07], [0, 0.01]], 18), C.glass, x, y, z);
  part(s, sph(0.058, 18, 12, 0, TAU, 0, Math.PI / 2), C.soft, x, y + 0.065, z).scale.y = 1.1;
  part(s, sph(0.059, 18, 8, 0, TAU, 0, Math.PI * 0.28), syrup, x, y + 0.066, z).scale.y = 1.12;
}

function iceMachine(s, x, y, z, body = C.red) {
  const g = grp(s, x, y, z);
  part(g, box(0.18, 0.04, 0.16), body, 0, 0.02, 0);
  part(g, cyl(0.02, 0.02, 0.32, 10), body, 0, 0.2, -0.06);
  part(g, box(0.2, 0.08, 0.18), body, 0, 0.38, 0);
  part(g, cyl(0.06, 0.06, 0.1, 18), C.soft, 0, 0.31, 0);
  part(g, lathe([[0, 0], [0.05, 0], [0.065, 0.03], [0.06, 0.03], [0, 0.01]], 18), C.glass, 0, 0.04, 0.01);
  const w = grp(g, 0.11, 0.38, 0); w.rotation.y = Math.PI / 2;
  part(w, torus(0.08, 0.008, 6, 24), body);
  [0, 1, 2].forEach(i => { const sp = part(w, cyl(0.005, 0.005, 0.16, 6), body); sp.rotation.z = i / 3 * Math.PI; });
  part(w, cyl(0.012, 0.012, 0.06, 8), C.cap, 0.07, 0, 0.03).rotation.x = Math.PI / 2;
  return g;
}

const BUILD = {
  sf_lantern_string(s, g) {
    const X = 0.72, H = 1.62;
    [-1, 1].forEach(sx => {
      part(s, cyl(0.12, 0.14, 0.06, 20), C.woodDk, sx * X, 0.03, 0);
      rod(s, [sx * X, 0.05, 0], [sx * X, H, 0], 0.035, C.wood);
      part(s, sph(0.045), C.woodDk, sx * X, H + 0.02, 0);
    });
    const pts = Array.from({ length: 21 }, (_, i) => { const t = i / 20; return [-X + 2 * X * t, H - 0.06 - Math.sin(Math.PI * t) * 0.16, 0]; });
    part(s, tube(pts, 0.008, 40, 6), C.cap);
    [0.17, 0.335, 0.5, 0.665, 0.83].forEach((t, i) => {
      const x = -X + 2 * X * t, y = H - 0.06 - Math.sin(Math.PI * t) * 0.16;
      lantern(s, g, x, y, 0, 0.1, 0.04, i % 2 ? C.lampOr : C.lampRed);
    });
  },
  sf_goldfish_bowl(s) {
    const top = 0.36;
    part(s, cyl(0.2, 0.2, 0.05, 28), C.wood, 0, top - 0.025, 0);
    [0, 1, 2].forEach(i => { const a = i / 3 * TAU + 0.3; rod(s, [Math.cos(a) * 0.15, 0, Math.sin(a) * 0.15], [Math.cos(a) * 0.12, top - 0.05, Math.sin(a) * 0.12], 0.022, C.woodDk); });
    const r = 0.22, cy = top + r * 0.86;
    part(s, sph(r, 32, 24, 0, TAU, 0.6, Math.PI - 0.6), C.glass, 0, cy, 0);
    const ry = Math.cos(0.6) * r, rr = Math.sin(0.6) * r;
    part(s, torus(rr, 0.012, 8, 32), C.rim, 0, cy + ry, 0).rotation.x = Math.PI / 2;
    part(s, cyl(rr * 1.06, rr * 1.06, 0.006, 32), C.water, 0, cy + ry - 0.03, 0);
    fish(s, 0.06, cy + 0.02, r * 0.86, 1.1, -0.3);
    fish(s, -0.1, cy - 0.06, r * 0.84, 0.9, 0.5);
    [[-0.03, 0.0], [0.03, 0.3]].forEach(([dx, rz]) => { const w = part(s, cyl(0.008, 0.012, 0.2, 6), C.leaf, dx - 0.05, cy + ry - 0.02, -0.05); w.rotation.z = rz; });
    part(s, sph(0.025, 10, 8), C.leafDk, -0.1, cy + ry + 0.07, -0.05).scale.set(1.4, 0.6, 1);
  },
  sf_shaved_ice_stand(s, g) {
    counter(s, 1.2, 0.5, 0.82, 0.1, C.cream, C.red);
    posts(s, 1.3, 0.8, 1.92, 1.72, C.woodDk, 0.035, -0.02);
    stripedRoof(s, 1.36, 0.86, 1.94, 1.72, 8, C.red, C.cream, -0.02);
    iceMachine(s, -0.3, 0.87, 0.06);
    [[0.08, C.red], [0.26, C.syrupBlue], [0.44, C.gold]].forEach(([x, c]) => iceCup(s, x, 0.87, 0.18, c));
    lantern(s, g, 0.6, 1.72, 0.4, 0.12, 0.04, C.lampRed);
  },
  sf_festival_stall(s, g) {
    part(s, box(1.5, 0.36, 0.6), C.indigo, 0, 0.18, 0.15);
    [-1, 1].forEach(sz => part(s, box(1.54, 0.05, 0.07), C.cream, 0, 0.385, 0.15 + sz * 0.285));
    [-1, 1].forEach(sx => part(s, box(0.07, 0.05, 0.64), C.cream, sx * 0.735, 0.385, 0.15));
    part(s, box(1.44, 0.02, 0.52), C.water, 0, 0.385, 0.15);
    [[-0.5, 0.05, 0.3], [-0.25, 0.25, 2.0], [0.0, 0.08, -0.8], [0.3, 0.22, 1.2], [0.52, 0.04, -2.4], [0.15, 0.32, 0.5]].forEach(([x, z, r]) => floatFish(s, x, 0.4, z, 1.3, r));
    scoop(s, 0.68, 0.42, 0.42, -0.5, 0.2);
    scoop(s, -0.68, 0.42, 0.42, Math.PI + 0.4, 0.2);
    part(s, lathe([[0, 0], [0.06, 0], [0.08, 0.05], [0.07, 0.05], [0, 0.01]], 18), C.soft, 0.62, 0.4, -0.06);
    part(s, box(1.6, 1.1, 0.06), C.woodDk, 0, 0.55, -0.45);
    part(s, box(1.5, 0.04, 0.2), C.wood, 0, 0.92, -0.35);
    [-0.5, -0.2, 0.1, 0.4].forEach((x, i) => { part(s, sph(0.07, 16, 12, 0, TAU, 0.35, Math.PI - 0.35), C.glass, x, 1.0, -0.35); if (i % 2 === 0) fish(s, x, 0.99, -0.29, 0.6, 0); });
    posts(s, 1.74, 1.1, 2.0, 1.78, C.woodDk, 0.035);
    stripedRoof(s, 1.8, 1.16, 2.02, 1.78, 10, C.indigo, C.cream);
    [-0.55, 0, 0.55].forEach((x, i) => lantern(s, g, x, 1.78, 0.56, 0.115, 0.03, i === 1 ? C.lampOr : C.lampRed));
  },
};

function flickerRows(glow) {
  const rows = new Map();
  [...glow.children].forEach(m => {
    const k = Math.round(m.position.y * 10);
    if (!rows.has(k)) rows.set(k, new THREE.Group());
    m.position.y -= k / 10;
    rows.get(k).add(m);
  });
  return [...rows].map(([k, row]) => { const m = new THREE.Mesh(bakeGroup(row), new THREE.MeshBasicMaterial({ vertexColors: true })); m.position.y = k / 10; m.userData.flicker = true; return m; });
}

export function build(id) {
  const fn = BUILD[id];
  if (!fn) throw new Error(`unknown festival pick decor: ${id}`);
  const solid = new THREE.Group(), glow = new THREE.Group();
  fn(solid, glow);
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: false, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }));
  body.castShadow = true; body.receiveShadow = true;
  const out = new THREE.Group();
  out.add(body);
  flickerRows(glow).forEach(m => { m.userData.noShadow = true; out.add(m); });
  return out;
}
