import * as THREE from 'three';
import { bakeGroup, part } from '../dream/art.js';

export const IDS = ['ds_cake_case', 'ds_pudding_chair', 'ds_waffle_rug'];
export const YARD_IDS = ['ds_icecream_cart'];

const C = {
  pink: 0xff7aa8, pinkLt: 0xffa6c9, pinkDk: 0xe0507e, berry: 0xf03a5a, berryDk: 0xc22445,
  cream: 0xffcadc, vanilla: 0xfad29a, mint: 0x5fdcb0, mintDk: 0x2fb88a,
  butter: 0xffd040, butterDk: 0xf0a82a, lilac: 0xbf94ff, lilacDk: 0x9a6ae8, sky: 0x7cc8ff,
  cocoa: 0x8a4a2a, cocoaDk: 0x5e2f1a, leaf: 0x4cc25a,
  wafer: 0xf0a640, waferDk: 0xc97a24, custard: 0xffc845, caramel: 0xc8642a, caramelDk: 0x9a4418,
  wood: 0xd08a4e, woodDk: 0x9a5a30, ink: 0x2b1d1a, blush: 0xff6f91,
};

const TAU = Math.PI * 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sph = (r, w = 12, h = 9, ...rest) => new THREE.SphereGeometry(r, w, h, ...rest);
const cyl = (a, b, h, s = 12, ...rest) => new THREE.CylinderGeometry(a, b, h, s, ...rest);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const cone = (r, h, s = 8, ...rest) => new THREE.ConeGeometry(r, h, s, ...rest);
const torus = (r, t, rs = 6, ts = 18, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc);
const lathe = (pr, seg = 16) => new THREE.LatheGeometry(pr.map(([x, y]) => new THREE.Vector2(x, y)), seg);
const capsule = (r, l) => new THREE.CapsuleGeometry(r, l, 3, 6);
const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
const SPR = [C.berry, C.mint, C.butter, C.lilac, C.sky];

function rod(p, a, b, r, col, seg = 6, r2 = r) {
  const A = V(...a), B = V(...b), d = B.clone().sub(A);
  const m = part(p, cyl(r2, r, d.length(), seg), col, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  return m;
}

function face(p, x, y, z, s, rotY = 0) {
  const f = grp(p, x, y, z); f.rotation.y = rotY;
  [-1, 1].forEach(sx => {
    part(f, sph(s * 0.14, 10, 8), C.ink, sx * s * 0.34, s * 0.06, 0).scale.set(1, 1.2, 0.5);
    part(f, sph(s * 0.13, 10, 8), C.blush, sx * s * 0.62, -s * 0.16, -s * 0.02).scale.set(1.3, 0.75, 0.35);
  });
  part(f, torus(s * 0.1, s * 0.03, 4, 10, Math.PI), C.ink, 0, -s * 0.07, 0).rotation.z = Math.PI;
  return f;
}

function dollop(p, x, y, z, r, col = C.cream, turns = 3) {
  for (let i = 0; i < turns; i++) {
    const rr = r * (1 - (i / turns) * 0.62);
    part(p, torus(rr * 0.62, rr * 0.38, 6, 12), col, x, y + r * 0.42 * i, z).rotation.x = Math.PI / 2;
  }
  part(p, cone(r * 0.28, r * 0.42, 8), col, x, y + r * 0.42 * turns - r * 0.05, z);
}

function berry(p, x, y, z, s) {
  part(p, sph(s * 0.5, 10, 8), C.berry, x, y + s * 0.45, z).scale.set(1, 1.15, 1);
  part(p, cone(s * 0.42, s * 0.4, 10), C.berry, x, y + s * 0.1, z).rotation.x = Math.PI;
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; part(p, sph(s * 0.06, 4, 3), C.butter, x + Math.cos(a) * s * 0.46, y + s * 0.45, z + Math.sin(a) * s * 0.46); }
  part(p, cone(s * 0.36, s * 0.14, 5), C.leaf, x, y + s * 1.0, z);
}

function scallops(p, x, y, z, w, n, r, col, rotY = 0) {
  const g = grp(p, x, y, z); g.rotation.y = rotY;
  for (let i = 0; i < n; i++) part(g, sph(r, 10, 6, 0, TAU, Math.PI / 2, Math.PI / 2), col, -w / 2 + w / n * (i + 0.5), 0, 0).scale.set(w / n / (2 * r), 1, 0.45);
}

function sprinkles(p, cx, cy, cz, rad, n, ry = 0.02) {
  for (let i = 0; i < n; i++) {
    const a = i * 2.39996, rr = rad * Math.sqrt((i + 0.5) / n);
    part(p, capsule(0.009, 0.03), SPR[i % SPR.length], cx + Math.cos(a) * rr, cy + (i % 3) * ry * 0.3, cz + Math.sin(a) * rr).rotation.set(Math.PI / 2, 0, a * 1.7);
  }
}

function roundCake(p, x, y, z, r, h, sponge = C.vanilla, frost = C.pink) {
  part(p, cyl(r, r, h * 0.4, 18), sponge, x, y + h * 0.2, z);
  part(p, cyl(r * 1.01, r * 1.01, h * 0.14, 18), C.cream, x, y + h * 0.47, z);
  part(p, cyl(r, r, h * 0.3, 18), sponge, x, y + h * 0.69, z);
  part(p, cyl(r * 1.03, r * 1.03, h * 0.18, 18), frost, x, y + h * 0.93, z);
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, L = h * (0.12 + 0.12 * (i % 3) / 2); part(p, capsule(r * 0.08, L), frost, x + Math.cos(a) * r * 1.02, y + h * 0.86 - L / 2, z + Math.sin(a) * r * 1.02); }
  for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; dollop(p, x + Math.cos(a) * r * 0.74, y + h * 1.02, z + Math.sin(a) * r * 0.74, r * 0.16, C.cream, 2); }
  berry(p, x, y + h * 1.02, z, r * 0.5);
}

function slice(p, x, y, z, r, h, rotY, cols = [C.vanilla, C.cream, C.berry, C.vanilla, C.pink]) {
  const g = grp(p, x, y, z); g.rotation.y = rotY;
  let yy = 0;
  cols.forEach(c => {
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.absarc(0, 0, r, -0.5, 0.5, false); sh.lineTo(0, 0);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: h / cols.length, bevelEnabled: false, curveSegments: 6 }); geo.rotateX(-Math.PI / 2);
    part(g, geo, c, -r * 0.5, yy, 0); yy += h / cols.length;
  });
  berry(g, r * 0.2, yy, 0, r * 0.32);
}

function cupcake(p, x, y, z, s, cup, frost, withFace = false) {
  part(p, cyl(s * 0.82, s * 0.62, s * 0.85, 14), cup, x, y + s * 0.425, z);
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; part(p, box(s * 0.08, s * 0.82, s * 0.08), C.cream, x + Math.cos(a) * s * 0.73, y + s * 0.425, z + Math.sin(a) * s * 0.73).rotation.set(Math.sin(a) * 0.23, 0, -Math.cos(a) * 0.23); }
  dollop(p, x, y + s * 0.9, z, s * 0.86, frost, 3);
  part(p, sph(s * 0.18, 8, 6), C.berry, x, y + s * 0.9 + s * 1.12, z);
  if (withFace) face(p, x, y + s * 0.45, z + s * 0.74, s * 0.9);
}

function plate(p, x, y, z, r, col = C.sky) {
  part(p, cyl(r, r * 0.8, r * 0.1, 18), col, x, y + r * 0.05, z);
  for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; part(p, sph(r * 0.1, 6, 4), col, x + Math.cos(a) * r, y + r * 0.08, z + Math.sin(a) * r).scale.y = 0.6; }
}

function wheel(p, x, y, z, r, rim = C.pinkDk, spoke = C.cream, hub = C.butter) {
  part(p, torus(r * 0.85, r * 0.15, 6, 20), rim, x, y, z);
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; rod(p, [x + Math.cos(a) * r * 0.1, y + Math.sin(a) * r * 0.1, z], [x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75, z], r * 0.06, spoke, 4); }
  part(p, cyl(r * 0.2, r * 0.2, r * 0.28, 10), hub, x, y, z).rotation.x = Math.PI / 2;
}

function parasol(p, x, y, z, r, h, cols) {
  const n = 10;
  for (let i = 0; i < n; i++) part(p, cone(r, h, 3, 1, true, i / n * TAU, TAU / n), cols[i % cols.length], x, y, z);
  part(p, cyl(r * 0.98, r * 0.98, 0.012, 20), cols[1], x, y - h / 2 - 0.006, z);
  for (let i = 0; i < n * 2; i++) { const a = (i + 0.5) / (n * 2) * TAU; part(p, sph(r * 0.075, 8, 5, 0, TAU, Math.PI / 2, Math.PI / 2), cols[Math.floor(i / 2) % cols.length], x + Math.sin(a) * r, y - h / 2, z + Math.cos(a) * r); }
  berry(p, x, y + h / 2 - 0.01, z, 0.08);
}

function heartShape(s) {
  const sh = new THREE.Shape();
  sh.moveTo(0, -s);
  sh.bezierCurveTo(s * 0.9, -s * 0.3, s * 1.1, s * 0.55, s * 0.5, s * 0.7);
  sh.bezierCurveTo(s * 0.2, s * 0.8, 0, s * 0.55, 0, s * 0.4);
  sh.bezierCurveTo(0, s * 0.55, -s * 0.2, s * 0.8, -s * 0.5, s * 0.7);
  sh.bezierCurveTo(-s * 1.1, s * 0.55, -s * 0.9, -s * 0.3, 0, -s);
  return sh;
}

function flatHeart(p, s, depth, col, y) {
  const geo = new THREE.ExtrudeGeometry(heartShape(s), { depth, bevelEnabled: false, curveSegments: 10 });
  geo.rotateX(Math.PI / 2);
  return part(p, geo, col, 0, y + depth, 0);
}

function pudding(p, x, y, z, r, h, withFace) {
  part(p, lathe([[0, y], [r, y], [r * 1.02, y + h * 0.12], [r * 0.86, y + h * 0.9], [r * 0.8, y + h], [0, y + h]], 22), C.custard, x, 0, z);
  part(p, lathe([[0, y + h * 0.88], [r * 0.84, y + h * 0.88], [r * 0.8, y + h], [r * 0.7, y + h * 1.08], [0, y + h * 1.1]], 22), C.caramel, x, 0, z);
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, L = h * (0.12 + 0.1 * ((i * 7) % 3)); part(p, capsule(r * 0.08, L), C.caramel, x + Math.cos(a) * r * 0.84, y + h * 0.92 - L / 2, z + Math.sin(a) * r * 0.84); }
  if (withFace) face(p, x, y + h * 0.45, z + r * 0.93, r * 0.62, 0).rotation.x = -0.12;
  dollop(p, x, y + h * 1.06, z, r * 0.26, C.cream, 2);
  part(p, sph(r * 0.12, 10, 8), C.berry, x, y + h * 1.06 + r * 0.3, z);
}

const BUILD = {
  ds_cake_case(s, gl) {
    const W = 1.05, D = 0.52, H = 0.55;
    part(s, box(W, 0.06, D), C.pinkDk, 0, 0.03, 0);
    part(s, box(W - 0.04, H - 0.06, D - 0.04), C.pink, 0, 0.06 + (H - 0.06) / 2, 0);
    for (let i = 0; i < 5; i++) part(s, box(0.1, H - 0.16, 0.02), C.pinkLt, -W / 2 + 0.14 + i * (W - 0.28) / 4, 0.03 + (H - 0.06) / 2, D / 2 - 0.01);
    part(s, box(W + 0.04, 0.05, D + 0.04), C.mint, 0, H + 0.025, 0);
    scallops(s, 0, H, D / 2 + 0.02, W + 0.04, 10, 0.06, C.cream);
    const gy = H + 0.05, GH = 0.46;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => part(s, box(0.035, GH, 0.035), C.mintDk, sx * (W / 2 - 0.02), gy + GH / 2, sz * (D / 2 - 0.02)));
    part(s, box(W - 0.06, 0.02, D - 0.06), C.cream, 0, gy + GH * 0.5, 0);
    part(s, box(W + 0.06, 0.05, D + 0.06), C.mint, 0, gy + GH + 0.025, 0);
    scallops(s, 0, gy + GH, D / 2 + 0.035, W + 0.06, 10, 0.055, C.pinkLt);
    part(gl, box(W - 0.04, GH, D - 0.04), 0, 0, gy + GH / 2, 0);
    plate(s, -0.28, gy, 0, 0.14); roundCake(s, -0.28, gy + 0.014, 0, 0.11, 0.12);
    plate(s, 0.06, gy, 0.02, 0.1, C.butter); slice(s, 0.06, gy + 0.014, 0.02, 0.12, 0.1, 0.4);
    cupcake(s, 0.32, gy, 0.02, 0.07, C.mint, C.pink, true);
    const ty = gy + GH * 0.5 + 0.01;
    [[-0.34, C.pink, C.cream], [-0.17, C.butter, C.cocoa], [0.0, C.lilac, C.mint]].forEach(([x, cup, fr], i) => cupcake(s, x, ty, 0.04, 0.055, cup, fr, i !== 1));
    plate(s, 0.28, ty, 0, 0.13, C.lilac); roundCake(s, 0.28, ty + 0.013, 0, 0.1, 0.1, C.cocoa, C.mint);
    cupcake(s, 0, gy + GH + 0.05, 0, 0.11, C.pink, C.cream, true);
  },
  ds_pudding_chair(s) {
    part(s, cyl(0.31, 0.31, 0.035, 20), C.mint, 0, 0.0175, 0);
    for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; part(s, sph(0.035, 6, 4), C.mint, Math.cos(a) * 0.31, 0.03, Math.sin(a) * 0.31).scale.y = 0.6; }
    pudding(s, 0, 0.035, 0, 0.26, 0.38, true);
  },
  ds_waffle_rug(s) {
    const sz = 0.38, n = 5;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU;
      const hg = grp(s, Math.sin(a) * sz * 1.05, 0, Math.cos(a) * sz * 1.05); hg.rotation.y = a;
      flatHeart(hg, sz, 0.035, C.wafer, 0);
      flatHeart(hg, sz * 0.8, 0.012, C.waferDk, 0.03).position.z = sz * 0.04;
      for (let k = 0; k < 6; k++) { const px = ((k % 3) - 1) * sz * 0.34, pz = -sz * 0.05 + Math.floor(k / 3) * sz * 0.38; part(hg, box(sz * 0.2, 0.022, sz * 0.2), C.wafer, px, 0.05, pz); }
      sprinkles(hg, 0, 0.065, sz * 0.15, sz * 0.5, 6);
    }
    part(s, cyl(0.22, 0.22, 0.045, 20), C.wafer, 0, 0.022, 0);
    part(s, cyl(0.17, 0.17, 0.035, 18), C.berry, 0, 0.055, 0);
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; part(s, sph(0.035, 6, 5), C.berryDk, Math.cos(a) * 0.09, 0.072, Math.sin(a) * 0.09); }
    part(s, sph(0.05, 8, 6), C.pinkLt, 0, 0.075, 0).scale.y = 0.5;
  },
  ds_icecream_cart(s) {
    const W = 1.0, D = 0.55, y0 = 0.32, H = 0.5;
    part(s, box(W, H, D), C.mint, 0.05, y0 + H / 2, 0);
    part(s, box(W + 0.02, 0.08, D + 0.02), C.pinkLt, 0.05, y0 + H * 0.62, 0);
    scallops(s, 0.05, y0 + H * 0.58, D / 2 + 0.015, W, 9, 0.05, C.pinkLt);
    part(s, box(W + 0.06, 0.05, D + 0.06), C.mintDk, 0.05, y0 + H + 0.025, 0);
    [[-0.2, C.pink], [0.05, C.butter], [0.3, C.cocoa]].forEach(([x, c]) => { part(s, cyl(0.1, 0.1, 0.03, 14), C.pinkDk, x, y0 + H + 0.06, 0); part(s, sph(0.095, 12, 8, 0, TAU, 0, Math.PI / 2), c, x, y0 + H + 0.07, 0); sprinkles(s, x, y0 + H + 0.14, 0, 0.06, 4); });
    [-1, 1].forEach(sz => wheel(s, -0.18, 0.28, sz * (D / 2 + 0.04), 0.28));
    rod(s, [-0.18, 0.28, -D / 2 - 0.04], [-0.18, 0.28, D / 2 + 0.04], 0.02, C.pinkDk);
    [-1, 1].forEach(sz => rod(s, [0.5, y0 + 0.02, sz * 0.2], [0.52, 0, sz * 0.22], 0.025, C.mintDk));
    [-1, 1].forEach(sz => rod(s, [0.55, y0 + H * 0.6, sz * 0.22], [0.78, y0 + H * 0.95, sz * 0.22], 0.02, C.mintDk));
    rod(s, [0.78, y0 + H * 0.95, -0.24], [0.78, y0 + H * 0.95, 0.24], 0.035, C.pink);
    rod(s, [-0.35, y0 + H, -0.15], [-0.35, 1.72, -0.15], 0.022, C.pinkLt);
    parasol(s, -0.35, 1.72, -0.15, 0.64, 0.22, [C.pink, C.butter]);
    const sg = grp(s, 0.12, y0 + H * 0.28, D / 2 + 0.02);
    part(sg, cone(0.09, 0.22, 10), C.wafer, 0, -0.02, 0).rotation.x = Math.PI;
    part(sg, sph(0.1, 12, 10), C.pink, 0, 0.12, 0);
    face(sg, 0, 0.12, 0.09, 0.11);
    part(sg, sph(0.03, 6, 5), C.berry, 0, 0.23, 0);
  },
};

export function build(id) {
  const fn = BUILD[id];
  if (!fn) throw new Error(`unknown dessert pick decor: ${id}`);
  const solid = new THREE.Group(), glass = new THREE.Group();
  fn(solid, glass);
  const out = new THREE.Group();
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }));
  body.castShadow = true; body.receiveShadow = true;
  out.add(body);
  if (glass.children.length) {
    const gm = new THREE.Mesh(bakeGroup(glass), new THREE.MeshStandardMaterial({ color: 0xcfe3e8, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.2, depthWrite: false }));
    gm.userData.noShadow = true; gm.renderOrder = 1; out.add(gm);
  }
  return out;
}
