import * as THREE from 'three';
import { bakeGroup, part } from '../dream/art.js';

export const IDS = ['bk_bookshelf', 'bk_reading_lamp', 'bk_reading_chair', 'bk_globe'];
export const YARD_IDS = [];

const C = {
  walnut: 0x6e4a32, walnutDk: 0x4e3424,
  green: 0x3f6a4e, greenDk: 0x2c4c38,
  wine: 0x8e2f3c, wineDk: 0x6a2230,
  cream: 0xe2d4b6, creamDk: 0xc8b48e,
  brass: 0xc99a48, brassDk: 0x9c7434,
  pot: 0xb0704a, leaf: 0x6f9a58,
  lampCream: 0xecd4a2, lampWarm: 0xf0c070,
};

const TAU = Math.PI * 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sph = (r, w = 24, h = 18, ...rest) => new THREE.SphereGeometry(r, w, h, ...rest);
const cyl = (a, b, h, s = 24, ...rest) => new THREE.CylinderGeometry(a, b, h, s, ...rest);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const torus = (r, t, rs = 8, ts = 28, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc);
const lathe = (pr, seg = 28, a0 = 0, al = TAU) => new THREE.LatheGeometry(pr.map(([x, y]) => new THREE.Vector2(x, y)), seg, a0, al);
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

const SPINES = [C.green, C.wine, C.cream, C.walnut, C.greenDk, C.wineDk, C.brassDk, C.creamDk];

function bookRow(p, x0, x1, y, z, d, hMax, seed = 0, gap = -1) {
  let x = x0, i = seed;
  while (x < x1 - 0.03) {
    const w = 0.035 + ((i * 37) % 5) * 0.008, hh = hMax * (0.72 + ((i * 53) % 7) * 0.04);
    if (x + w > x1) break;
    if (i - seed === gap) {
      const lean = grp(p, x + hh * Math.sin(0.38), y, z); lean.rotation.z = 0.38;
      part(lean, box(w, hh, d), SPINES[i % 8], -w / 2, hh / 2, 0);
      x += hh * Math.sin(0.38) + 0.006;
    } else {
      part(p, box(w, hh, d), SPINES[i % 8], x + w / 2, y + hh / 2, z);
      if (i % 3 === 0) part(p, box(w * 1.04, 0.012, d * 0.2), C.brass, x + w / 2, y + hh * 0.8, z + d * 0.42);
      x += w + 0.004;
    }
    i++;
  }
}

function lyingStack(p, x, y, z, n, w = 0.24, d = 0.17) {
  for (let i = 0; i < n; i++) {
    const ry = i % 2 ? 0.12 : -0.08, dx = i % 2 ? 0.01 : -0.01, yy = y + 0.02 + i * 0.042;
    part(p, box(w - i * 0.02, 0.04, d - i * 0.01), SPINES[(i * 3 + 1) % 8], x + dx, yy, z).rotation.y = ry;
    part(p, box(w - i * 0.02 - 0.012, 0.03, d - i * 0.01 + 0.004), C.cream, x + dx + 0.006, yy, z).rotation.y = ry;
  }
  return y + n * 0.042;
}

function plant(p, x, y, z, s = 1) {
  part(p, lathe([[0.0, 0], [0.05 * s, 0], [0.06 * s, 0.07 * s], [0.065 * s, 0.075 * s], [0, 0.075 * s]], 16), C.pot, x, y, z);
  [[0, 0.11, 0], [0.04, 0.09, 0.02], [-0.04, 0.09, -0.01], [0.01, 0.13, -0.03]].forEach(([dx, dy, dz]) => part(p, sph(0.04 * s, 10, 8), C.leaf, x + dx * s, y + dy * s, z + dz * s).scale.set(1, 0.8, 1));
}

function carcass(p, w, h, d, col, shelves, back = C.walnutDk) {
  const t = 0.04;
  [-1, 1].forEach(s => part(p, box(t, h, d), col, s * (w / 2 - t / 2), h / 2, 0));
  part(p, box(w, t, d), col, 0, h - t / 2, 0);
  part(p, box(w, 0.07, d), col, 0, 0.035, 0);
  part(p, box(w - 0.02, h - 0.04, 0.02), back, 0, h / 2, -d / 2 + 0.01);
  shelves.forEach(y => part(p, box(w - t * 2, 0.03, d - 0.02), col, 0, y, 0.01));
}

function legs(p, xs, zs, h, col, r = 0.025, foot = C.brass) {
  xs.forEach(x => zs.forEach(z => { part(p, cyl(r, r * 0.75, h, 10), col, x, h / 2, z); if (foot) part(p, sph(r * 0.9, 10, 8), foot, x, r * 0.6, z); }));
}

function continents(g, R, cols) {
  const spots = [[0.5, 0.3, 0.35], [0.2, 1.2, 0.28], [-0.4, 0.8, 0.3], [0.9, 2.4, 0.22], [-0.2, 2.9, 0.33], [0.3, 4.0, 0.3], [-0.7, 4.6, 0.2], [0.6, 5.4, 0.25], [-0.1, 5.9, 0.18]];
  spots.forEach(([lat, lon, s], i) => {
    const d = V(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon));
    const m = part(g, sph(R * 1.012, 18, 6, 0, TAU, 0, s * 0.9), cols[i % cols.length]);
    m.quaternion.setFromUnitVectors(V(0, 1, 0), d);
    m.scale.set(1.25, 1, 0.8);
  });
}

function globe(p, x, y, z, R, ocean, land, ring = C.brass, tilt = 0.41) {
  const g = grp(p, x, y, z); g.rotation.z = tilt;
  part(g, sph(R, 32, 24), ocean);
  continents(g, R, land);
  part(g, torus(R * 1.08, R * 0.035, 8, 48, Math.PI * 1.25), ring).rotation.set(0, Math.PI / 2, -Math.PI * 0.125);
  [-1, 1].forEach(s => part(g, sph(R * 0.06, 10, 8), ring, 0, s * R * 1.08, 0));
  return g;
}

const BUILD = {
  bk_bookshelf(s) {
    const w = 0.8, h = 1.05, d = 0.3;
    carcass(s, w, h, d, C.walnut, [0.38, 0.72]);
    part(s, box(w + 0.04, 0.04, d + 0.03), C.walnutDk, 0, h + 0.02, 0.005);
    bookRow(s, -0.36, 0.36, 0.07, 0.02, 0.22, 0.26, 0, 5);
    bookRow(s, -0.36, 0.12, 0.395, 0.02, 0.22, 0.25, 3);
    lyingStack(s, 0.24, 0.395, 0.02, 3, 0.2, 0.18);
    bookRow(s, -0.1, 0.36, 0.735, 0.02, 0.22, 0.24, 6, 3);
    plant(s, -0.25, 0.735, 0.03, 1.1);
  },
  bk_reading_lamp(s, g) {
    part(s, cyl(0.17, 0.19, 0.06, 32), C.walnutDk, 0, 0.03, -0.14);
    part(s, torus(0.18, 0.012, 6, 36), C.brass, 0, 0.06, -0.14).rotation.x = Math.PI / 2;
    part(s, tube([[0, 0.06, -0.14], [0, 0.6, -0.16], [0.0, 0.94, -0.08], [0.0, 1.02, 0.08], [0, 0.98, 0.22]], 0.016, 40, 10), C.brass);
    const top = 0.74;
    rod(s, [0, 0.98, 0.22], [0, top + 0.13, 0.22], 0.008, C.brassDk, 8);
    part(g, lathe([[0.14, 0.0], [0.12, 0.14], [0.115, 0.14], [0.135, 0.0]], 32), C.lampCream, 0, top, 0.22);
    part(g, sph(0.05, 14, 10), C.lampWarm, 0, top + 0.06, 0.22);
    part(s, torus(0.14, 0.008, 6, 36), C.wine, 0, top, 0.22).rotation.x = Math.PI / 2;
    part(s, torus(0.12, 0.008, 6, 36), C.wine, 0, top + 0.14, 0.22).rotation.x = Math.PI / 2;
  },
  bk_reading_chair(s) {
    legs(s, [-0.26, 0.26], [-0.22, 0.22], 0.14, C.walnutDk, 0.03);
    roundSlab(s, 0.66, 0.6, 0.16, 0.06, C.wine, 0.12);
    roundSlab(s, 0.5, 0.44, 0.09, 0.05, C.cream, 0.27).position.z = 0.05;
    const back = grp(s, 0, 0.26, -0.24); back.rotation.x = -0.12;
    part(back, box(0.62, 0.56, 0.14), C.wine, 0, 0.28, 0);
    part(back, cyl(0.31, 0.31, 0.14, 32, 1, false, -Math.PI / 2, Math.PI), C.wine, 0, 0.56, 0).rotation.x = Math.PI / 2;
    [-1, 1].forEach(sx => {
      const wing = grp(s, sx * 0.3, 0.5, -0.08); wing.rotation.y = -sx * 0.2;
      part(wing, box(0.1, 0.38, 0.3), C.wine, 0, 0.0, 0);
      part(wing, sph(0.16, 16, 12), C.wine, 0, 0.2, -0.02).scale.set(0.32, 0.6, 1.0);
      part(s, cyl(0.06, 0.06, 0.52, 18), C.wineDk, sx * 0.3, 0.32, 0.02).rotation.x = Math.PI / 2;
      for (let i = 0; i < 6; i++) part(s, sph(0.012, 8, 6), C.brass, sx * 0.334, 0.22, -0.18 + i * 0.07);
    });
  },
  bk_globe(s) {
    const R = 0.25, cy = 0.56 + R;
    [0, 1, 2].forEach(i => {
      const a = i / 3 * TAU + Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
      part(s, tube([[ca * R * 1.18, cy, sa * R * 1.18], [ca * 0.24, 0.45, sa * 0.24], [ca * 0.22, 0.2, sa * 0.22], [ca * 0.29, 0.02, sa * 0.29]], 0.022, 30, 8), C.walnut);
      part(s, sph(0.026), C.brass, ca * 0.29, 0.02, sa * 0.29);
    });
    part(s, torus(0.215, 0.012, 6, 30), C.walnutDk, 0, 0.2, 0).rotation.x = Math.PI / 2;
    globe(s, 0, cy, 0, R, C.cream, [C.green, C.wine, C.greenDk]);
    part(s, torus(R * 1.18, 0.02, 6, 48), C.brass, 0, cy, 0).rotation.x = Math.PI / 2;
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
  if (!fn) throw new Error(`unknown book pick decor: ${id}`);
  const solid = new THREE.Group(), glow = new THREE.Group();
  fn(solid, glow);
  const out = new THREE.Group();
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: false, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }));
  body.castShadow = true; body.receiveShadow = true;
  out.add(body);
  flickerRows(glow).forEach(m => { m.userData.noShadow = true; out.add(m); });
  return out;
}
