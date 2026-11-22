import * as THREE from 'three';
import { bakeGroup, part } from '../dream/art.js';

export const IDS = ['xm_mini_tree', 'xm_gift_pile', 'xm_ginger_house'];
export const YARD_IDS = ['xm_wreath_arch'];

const C = {
  cream: 0xe3d4b8, berry: 0xb5363f, coal: 0x2a2624,
  green: 0x2f6b4f, greenDk: 0x24503c, greenLt: 0x3f7d55, gold: 0xd9a63a,
  wood: 0x9c6b40, woodLt: 0xc99a62, woodDk: 0x6b4a2e,
  ginger: 0xa0612f, gingerDk: 0x7a4424, icing: 0xe8dcc6,
  lamp: 0xffd27a, lampRed: 0xff9a6a,
};

const TAU = Math.PI * 2;
const lathe = (pr, seg = 16) => new THREE.LatheGeometry(pr.map(([x, y]) => new THREE.Vector2(x, y)), seg);
const sph = (r, w = 12, h = 9, ...rest) => new THREE.SphereGeometry(r, w, h, ...rest);
const cyl = (a, b, h, s = 12, ...rest) => new THREE.CylinderGeometry(a, b, h, s, ...rest);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const ico = (r) => new THREE.IcosahedronGeometry(r, 0);
const torus = (r, t, rs = 6, ts = 18, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc);
const flatRing = (p, r, tube, col, y, rs = 5, ts = 24) => { const t = part(p, torus(r, tube, rs, ts), col, 0, y, 0); t.rotation.x = Math.PI / 2; return t; };
const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
const pathPoints = (fn, n) => Array.from({ length: n + 1 }, (_, i) => fn(i / n));
const basicBaked = (g) => new THREE.Mesh(bakeGroup(g), new THREE.MeshBasicMaterial({ vertexColors: true }));

function starGeo(r1, r2, depth) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + Math.PI / 2, r = i % 2 ? r2 : r1; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  return g;
}

function bow(s, x, y, z, k, col, rotY = 0) {
  const b = grp(s, x, y, z); b.scale.setScalar(k); b.rotation.y = rotY;
  [-1, 1].forEach(sx => { const l = part(b, torus(0.05, 0.018, 5, 10), col, sx * 0.05, 0.03, 0); l.scale.set(1, 0.7, 0.6); l.rotation.z = sx * 0.5; });
  part(b, sph(0.024, 8, 6), col, 0, 0.012, 0);
}

function gift(s, x, y, z, w, h, d, col, rib, rotY = 0, bowK = 1) {
  const g = grp(s, x, y, z); g.rotation.y = rotY;
  part(g, box(w, h, d), col, 0, h / 2, 0);
  const rw = Math.min(w, d) * 0.16;
  part(g, box(w + 0.012, h + 0.012, rw), rib, 0, h / 2, 0);
  part(g, box(rw, h + 0.02, d + 0.02), rib, 0, h / 2, 0);
  if (bowK) bow(g, 0, h + 0.01, 0, bowK, rib, 0.6);
}

function wreath(s, x, y, z, r) {
  const w = grp(s, x, y, z);
  part(w, torus(r, r * 0.26, 6, 18), C.greenDk);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU, c = part(w, ico(r * 0.24), i % 2 ? C.green : C.greenLt, Math.cos(a) * r, Math.sin(a) * r, r * 0.08);
    c.rotation.set(a, a * 2, a * 0.5);
  }
  [0.6, 1.9, 3.4].forEach(a => [[0, 0], [0.05, 0.03], [-0.03, 0.05]].forEach(([dx, dy]) => part(w, sph(r * 0.075, 6, 5), C.berry, Math.cos(a) * r + dx * r * 2, Math.sin(a) * r + dy * r * 2, r * 0.3)));
  const b = grp(w, 0, -r, r * 0.3);
  [-1, 1].forEach(sx => {
    const l = part(b, torus(r * 0.22, r * 0.07, 5, 10), C.berry, sx * r * 0.22, 0.02, 0); l.scale.set(1, 0.75, 0.6); l.rotation.z = sx * 0.4;
    const t = part(b, box(r * 0.14, r * 0.55, r * 0.04), C.berry, sx * r * 0.14, -r * 0.3, 0); t.rotation.z = sx * 0.3;
  });
  part(b, sph(r * 0.1, 8, 6), C.berry, 0, 0, r * 0.02);
}

function gingerMan(s, x, y, z, rotY) {
  const g = grp(s, x, y, z); g.rotation.y = rotY;
  const t = 0.028;
  part(g, cyl(0.05, 0.05, t, 12), C.ginger, 0, 0.22, 0).rotation.x = Math.PI / 2;
  part(g, box(0.08, 0.1, t), C.ginger, 0, 0.13, 0);
  [-1, 1].forEach(sx => {
    part(g, box(0.1, 0.035, t), C.ginger, sx * 0.075, 0.155, 0).rotation.z = sx * 0.4;
    part(g, box(0.035, 0.1, t), C.ginger, sx * 0.03, 0.05, 0).rotation.z = sx * 0.25;
    part(g, sph(0.008, 5, 4), C.coal, sx * 0.017, 0.23, t / 2 + 0.002);
  });
  [0.15, 0.115].forEach(yy => part(g, sph(0.01, 6, 4), C.berry, 0, yy, t / 2 + 0.004));
  part(g, box(0.03, 0.006, 0.006), C.icing, 0, 0.205, t / 2 + 0.003);
}

function triPrism(w, rise, d) {
  const tri = new THREE.Shape(); tri.moveTo(-w / 2, 0); tri.lineTo(w / 2, 0); tri.lineTo(0, rise); tri.closePath();
  const g = new THREE.ExtrudeGeometry(tri, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2);
  return g;
}

function snowHouse(s, x, y, z) {
  const h = grp(s, x, y, z);
  const w = 0.48, d = 0.34, wh = 0.28, pitch = 0.5, snow = 0.06;
  part(h, box(w, wh, d), C.ginger, 0, wh / 2, 0);
  const L = (w / 2 + 0.06) / Math.cos(pitch), rise = (w / 2) * Math.tan(pitch);
  part(h, triPrism(w, rise, d), C.ginger, 0, wh, 0);
  [-1, 1].forEach(sx => {
    const r = grp(h, sx * (L / 2) * Math.cos(pitch), wh + rise - (L / 2) * Math.sin(pitch), 0); r.rotation.z = -sx * pitch;
    part(r, box(L, 0.05, d + 0.12), C.gingerDk, 0, 0.035, 0);
    part(r, box(L * 0.96, snow, d + 0.1), C.cream, 0, 0.06 + snow / 2, 0);
    for (let i = 0; i < 6; i++) part(r, sph(0.022, 6, 5), C.icing, -L / 2 + 0.04 + i * (L - 0.08) / 5, 0.01, (d + 0.12) / 2 + 0.006);
  });
  part(h, cyl(0.075, 0.075, d + 0.1, 10), C.cream, 0, wh + rise + 0.065, 0).rotation.x = Math.PI / 2;
  part(h, box(0.09, 0.22, 0.09), C.gingerDk, w * 0.22, wh + rise * 0.72, -d * 0.18);
  part(h, box(0.11, 0.035, 0.11), C.cream, w * 0.22, wh + rise * 0.72 + 0.12, -d * 0.18);
  const fz = d / 2 + 0.008;
  part(h, box(w * 0.26, wh * 0.62, 0.016), C.gingerDk, 0, wh * 0.31, fz);
  part(h, box(w * 0.3, 0.02, 0.02), C.icing, 0, wh * 0.63, fz + 0.004);
  part(h, sph(0.012, 6, 4), C.gold, w * 0.07, wh * 0.3, fz + 0.012);
  [-1, 1].forEach(sx => {
    const wx = sx * w * 0.32, wy = wh * 0.6;
    part(h, box(w * 0.18, wh * 0.3, 0.012), C.gold, wx, wy, fz);
    [1, -1].forEach(sy => part(h, box(w * 0.2 + 0.02, 0.018, 0.02), C.icing, wx, wy + sy * wh * 0.16, fz + 0.004));
    part(h, box(0.012, wh * 0.3, 0.018), C.icing, wx, wy, fz + 0.006);
  });
  [-1, 1].forEach(sx => [0.25, 0.6, 0.9].forEach((f, i) => part(h, sph(0.016, 6, 4), [C.berry, C.green, C.gold][i], sx * (w / 2 + 0.008), wh * f, d * 0.3)));
}

function bulbs(g, pts, r) { pts.forEach(([x, y, z], i) => part(g, sph(r, 6, 5), i % 3 === 1 ? C.lampRed : C.lamp, x, y, z)); }

function flickerRows(glow) {
  const rows = new Map();
  [...glow.children].forEach(m => {
    const k = Math.round(m.position.y * 10);
    if (!rows.has(k)) rows.set(k, new THREE.Group());
    m.position.y -= k / 10;
    rows.get(k).add(m);
  });
  return [...rows].map(([k, row]) => { const m = basicBaked(row); m.position.y = k / 10; m.userData.flicker = true; return m; });
}

const BUILD = {
  xm_mini_tree(s, g) {
    part(s, cyl(0.25, 0.2, 0.3, 12), C.woodLt, 0, 0.15, 0);
    [0.08, 0.16, 0.24].forEach(y => flatRing(s, 0.2 + y * 0.17 + 0.006, 0.014, C.wood, y, 4, 20));
    flatRing(s, 0.255, 0.025, C.woodDk, 0.3, 5, 20);
    part(s, lathe([[0, 0.3], [0.5, 0.36], [0.3, 0.56], [0.42, 0.6], [0.22, 0.8], [0.33, 0.83], [0.14, 1.02], [0.22, 1.05], [0, 1.26]], 9), C.green);
    [[0.5, 0.36, 8], [0.42, 0.6, 7], [0.33, 0.83, 6], [0.22, 1.05, 5]].forEach(([r, y, n], li) => {
      for (let i = 0; i < n; i++) { const a = (i + li * 0.5) / n * TAU; part(g, sph(0.026, 6, 5), (i + li) % 3 === 1 ? C.lampRed : C.lamp, Math.sin(a) * r, y - 0.015, Math.cos(a) * r); }
    });
    part(g, starGeo(0.085, 0.085 * 0.45, 0.085 * 0.35), C.lamp, 0, 1.33, 0);
  },
  xm_gift_pile(s) {
    gift(s, -0.05, 0, 0, 0.42, 0.3, 0.36, C.berry, C.gold, 0.15, 0);
    gift(s, -0.06, 0.3, 0.0, 0.28, 0.2, 0.24, C.green, C.cream, 0.6, 1.1);
    gift(s, 0.32, 0, 0.12, 0.22, 0.22, 0.22, C.cream, C.berry, -0.4, 0.9);
    gift(s, -0.36, 0, 0.22, 0.16, 0.1, 0.14, C.gold, C.berry, 0.5, 0.6);
  },
  xm_ginger_house(s) {
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => part(s, box(0.06, 0.36, 0.06), C.woodDk, sx * 0.38, 0.18, sz * 0.26));
    part(s, box(0.86, 0.05, 0.62), C.wood, 0, 0.385, 0);
    part(s, box(0.8, 0.012, 0.56), C.cream, 0, 0.416, 0);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2 === 0) part(s, box(0.2, 0.016, 0.186), C.berry, -0.3 + i * 0.2, 0.417, -0.186 + j * 0.186);
    snowHouse(s, -0.06, 0.426, -0.06);
    [[0.0, 0.15], [-0.04, 0.2], [-0.08, 0.25]].forEach(([x, z], i) => part(s, cyl(0.03, 0.03, 0.012, 10), i % 2 ? C.berry : C.icing, x - 0.02, 0.432, z));
    gingerMan(s, 0.3, 0.426, 0.12, -0.4);
  },
  xm_wreath_arch(s, g) {
    const len = 1.55, r = 0.065, hr = 0.42, y0 = 0.08 + len, m = 8;
    [-1, 1].forEach(sx => {
      const c = grp(s, sx * hr * 2, 0, 0);
      part(c, cyl(0.12, 0.14, 0.08, 10), C.greenDk, 0, 0.04, 0);
      for (let i = 0; i < 8; i++) part(c, cyl(r, r, len / 8, 10), i % 2 ? C.cream : C.berry, 0, 0.08 + len / 8 * (i + 0.5), 0);
      for (let i = 0; i < m; i++) part(c, torus(hr, r, 8, 3, Math.PI / m), i % 2 ? C.berry : C.cream, -sx * hr, y0, 0).rotation.z = i * Math.PI / m;
    });
    bulbs(g, [-1, 1].flatMap(sx => pathPoints(t => [sx * hr + Math.cos(t * Math.PI) * (hr + 0.1), y0 + Math.sin(t * Math.PI) * (hr + 0.1), 0], 8).slice(sx < 0 ? 1 : 0, sx < 0 ? 9 : 8)), 0.028);
    wreath(s, 0, y0 + 0.1, 0.12, 0.28);
  },
};

export function build(id) {
  const fn = BUILD[id];
  if (!fn) throw new Error(`unknown xmas pick decor: ${id}`);
  const solid = new THREE.Group(), glow = new THREE.Group();
  fn(solid, glow);
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, metalness: 0 }));
  body.castShadow = true; body.receiveShadow = true;
  const out = new THREE.Group();
  out.add(body);
  flickerRows(glow).forEach(m => { m.userData.noShadow = true; out.add(m); });
  return out;
}
