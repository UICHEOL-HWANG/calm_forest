import * as THREE from 'three';
import { bakeGroup, part } from '../dream/art.js';

export const IDS = ['tr_station_bench', 'tr_trunk', 'tr_mini_train'];
export const YARD_IDS = ['tr_station_clock'];

const C = {
  green: 0x2f5a44, greenDk: 0x22422f,
  wine: 0x7e2a36, wineDk: 0x5e1f2a,
  brass: 0xc99a48, brassDk: 0x9c7434,
  walnut: 0x6e4a32, walnutDk: 0x4e3424,
  cream: 0xe4d6b4, creamDk: 0xc8b48e,
  steam: 0xd2d6d8, ink: 0x3a3230,
};

const CLOCK_K = 0.95;
const TAU = Math.PI * 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sph = (r, w = 20, h = 14, ...rest) => new THREE.SphereGeometry(r, w, h, ...rest);
const cyl = (a, b, h, s = 24, ...rest) => new THREE.CylinderGeometry(a, b, h, s, ...rest);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const torus = (r, t, rs = 8, ts = 28, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc);
const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };

function rod(p, a, b, r, col, seg = 12, r2 = r) {
  const A = V(...a), B = V(...b), d = B.clone().sub(A);
  const m = part(p, cyl(r2, r, d.length(), seg), col, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  return m;
}

function roundBox(p, w, h, d, r, col, x = 0, y = 0, z = 0) {
  const sh = new THREE.Shape(), x0 = -w / 2, y0 = -h / 2;
  sh.moveTo(x0 + r, y0); sh.lineTo(x0 + w - r, y0); sh.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
  sh.lineTo(x0 + w, y0 + h - r); sh.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
  sh.lineTo(x0 + r, y0 + h); sh.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r);
  sh.lineTo(x0, y0 + r); sh.quadraticCurveTo(x0, y0, x0 + r, y0);
  const b = Math.min(d * 0.3, r * 0.7);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: d - b * 2, bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 3, curveSegments: 8 });
  geo.translate(0, 0, -(d - b * 2) / 2);
  return part(p, geo, col, x, y, z);
}

function corners(p, w, h, d, y0, s = 0.06) {
  [-1, 1].forEach(sx => [-1, 1].forEach(sz => [y0 + s / 2, y0 + h - s / 2].forEach(y => part(p, box(s, s, s), C.brass, sx * (w / 2 - s / 2 + 0.006), y, sz * (d / 2 - s / 2 + 0.006)))));
}

function clockFace(p, x, y, z, r, rotY, hr = 10, mn = 2) {
  const f = grp(p, x, y, z); f.rotation.y = rotY;
  part(f, cyl(r, r, 0.02, 36), C.cream).rotation.x = Math.PI / 2;
  part(f, torus(r, r * 0.08, 8, 40), C.brass);
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU, m = part(f, box(r * (i % 3 ? 0.05 : 0.08), r * (i % 3 ? 0.12 : 0.2), 0.008), C.ink, Math.sin(a) * r * 0.78, Math.cos(a) * r * 0.78, 0.012);
    m.rotation.z = -a;
  }
  const hand = (k, len, w) => {
    const a = k / 12 * TAU, g = grp(f, 0, 0, 0.018); g.rotation.z = -a;
    part(g, box(r * w, r * len, 0.008), C.ink, 0, r * len / 2, 0);
  };
  hand(hr, 0.48, 0.08); hand(mn, 0.68, 0.05);
  part(f, sph(r * 0.07, 12, 8), C.brass, 0, 0, 0.02);
  return f;
}

function drumClock(p, x, y, z, r, d, body) {
  const g = grp(p, x, y, z);
  part(g, cyl(r * 1.06, r * 1.06, d, 36), body).rotation.x = Math.PI / 2;
  [-1, 1].forEach(s => clockFace(g, 0, 0, s * (d / 2 + 0.004), r * 0.92, s > 0 ? 0 : Math.PI));
  return g;
}

function ellipsePts(a, b, y, n = 64) {
  return Array.from({ length: n }, (_, i) => { const t = i / n * TAU; return V(a * Math.cos(t), y, b * Math.sin(t)); });
}

function track(p, a, b, y0 = 0) {
  const gauge = 0.03;
  [-1, 1].forEach(s => {
    const curve = new THREE.CatmullRomCurve3(ellipsePts(a + s * gauge, b + s * gauge, y0 + 0.032), true);
    part(p, new THREE.TubeGeometry(curve, 120, 0.007, 6, true), C.brass);
  });
  const n = Math.round((a + b) * 34);
  for (let i = 0; i < n; i++) {
    const t = i / n * TAU, tx = -a * Math.sin(t), tz = b * Math.cos(t);
    const m = part(p, box(0.022, 0.016, 0.1), C.walnut, a * Math.cos(t), y0 + 0.016, b * Math.sin(t));
    m.rotation.y = Math.atan2(-tz, tx);
  }
}

function onTrack(p, a, b, t, y0 = 0) {
  const tx = -a * Math.sin(t), tz = b * Math.cos(t);
  const g = grp(p, a * Math.cos(t), y0 + 0.04, b * Math.sin(t));
  g.rotation.y = Math.atan2(-tz, tx);
  return g;
}

function wheels(g, xs, r = 0.028) {
  xs.forEach(x => [-1, 1].forEach(s => part(g, cyl(r, r, 0.016, 16), C.ink, x, r * 0.75, s * 0.045).rotation.x = Math.PI / 2));
}

function loco(p, puff = true) {
  const g = grp(p);
  part(g, box(0.3, 0.03, 0.1), C.ink, 0, 0.04, 0);
  wheels(g, [-0.1, -0.02, 0.07]);
  const boiler = part(g, cyl(0.048, 0.048, 0.17, 20), C.green, 0.04, 0.1, 0); boiler.rotation.z = Math.PI / 2;
  [-0.02, 0.06].forEach(x => part(g, cyl(0.051, 0.051, 0.012, 20), C.brass, x, 0.1, 0).rotation.z = Math.PI / 2);
  part(g, cyl(0.05, 0.05, 0.02, 20), C.ink, 0.13, 0.1, 0).rotation.z = Math.PI / 2;
  part(g, cyl(0.03, 0.02, 0.06, 14), C.ink, 0.09, 0.17, 0);
  part(g, cyl(0.034, 0.034, 0.012, 14), C.brass, 0.09, 0.2, 0);
  part(g, sph(0.024, 12, 8), C.brass, 0.02, 0.15, 0);
  part(g, box(0.09, 0.12, 0.11), C.green, -0.1, 0.12, 0);
  part(g, box(0.12, 0.016, 0.13), C.wine, -0.1, 0.186, 0);
  [-1, 1].forEach(s => part(g, box(0.04, 0.04, 0.004), C.cream, -0.1, 0.14, s * 0.056));
  part(g, box(0.02, 0.03, 0.09), C.wine, 0.155, 0.05, 0);
  if (puff) [[0.1, 0.25, 0.03], [0.06, 0.29, 0.024], [0.02, 0.32, 0.018]].forEach(([x, y, r]) => part(g, sph(r, 14, 10), C.steam, x, y, 0));
  return g;
}

function coach(p, col = C.wine) {
  const g = grp(p);
  part(g, box(0.22, 0.025, 0.1), C.ink, 0, 0.04, 0);
  wheels(g, [-0.07, 0.07], 0.024);
  roundBox(g, 0.22, 0.09, 0.105, 0.015, col, 0, 0.1, 0);
  part(g, box(0.235, 0.018, 0.12), C.greenDk, 0, 0.152, 0);
  [-0.06, 0, 0.06].forEach(x => [-1, 1].forEach(s => part(g, box(0.035, 0.03, 0.004), C.cream, x, 0.11, s * 0.054)));
  part(g, box(0.226, 0.01, 0.107), C.brass, 0, 0.068, 0);
  return g;
}

const BUILD = {
  tr_station_bench(s) {
    [-0.56, 0.56].forEach(x => {
      rod(s, [x, 0, 0.18], [x, 0.42, 0.15], 0.022, C.green);
      rod(s, [x, 0, -0.18], [x, 0.94, -0.26], 0.024, C.green);
      rod(s, [x, 0.6, -0.22], [x, 0.6, 0.17], 0.02, C.green);
      rod(s, [x, 0.42, 0.15], [x, 0.6, 0.12], 0.018, C.green);
      const sc = part(s, torus(0.045, 0.015, 6, 18, Math.PI * 1.5), C.green, x, 0.56, 0.2); sc.rotation.y = Math.PI / 2;
      [0.18, -0.18].forEach(z => part(s, sph(0.035, 12, 8), C.greenDk, x, 0.02, z).scale.y = 0.6);
      part(s, sph(0.03, 12, 8), C.brass, x, 0.96, -0.265);
    });
    [-0.13, -0.045, 0.045, 0.13].forEach(z => roundBox(s, 1.2, 0.03, 0.075, 0.012, C.walnut, 0, 0.43, z));
    [0.56, 0.68, 0.8].forEach(y => {
      const sl = roundBox(s, 1.2, 0.075, 0.03, 0.012, C.walnut, 0, y, -0.18 - y * 0.075 - 0.02); sl.rotation.x = -0.08;
    });
    const pl = part(s, box(0.24, 0.05, 0.012), C.brass, 0, 0.8, -0.205); pl.rotation.x = -0.08;
    part(s, box(0.2, 0.012, 0.014), C.brassDk, 0, 0.8, -0.2).rotation.x = -0.08;
  },
  tr_station_clock(s) {
    part(s, cyl(0.2, 0.22, 0.1, 28), C.greenDk, 0, 0.05, 0);
    part(s, cyl(0.13, 0.17, 0.14, 24), C.green, 0, 0.17, 0);
    part(s, cyl(0.065, 0.075, 1.62, 20), C.green, 0, 1.05, 0);
    [0.26, 0.9, 1.6].forEach(y => part(s, torus(0.075, 0.018, 6, 20), C.brass, 0, y, 0).rotation.x = Math.PI / 2);
    part(s, cyl(0.12, 0.07, 0.12, 20), C.greenDk, 0, 1.9, 0);
    drumClock(s, 0, 2.22, 0, 0.3, 0.14, C.green);
    part(s, sph(0.05, 14, 10), C.brass, 0, 2.58, 0);
    part(s, new THREE.ConeGeometry(0.022, 0.12, 10), C.brass, 0, 2.68, 0);
    return CLOCK_K;
  },
  tr_trunk(s) {
    const w = 0.8, h = 0.36, d = 0.44;
    part(s, box(w, h, d), C.wine, 0, h / 2 + 0.02, 0);
    const lid = part(s, cyl(d / 2, d / 2, w, 32), C.wine, 0, h + 0.02, 0); lid.rotation.z = Math.PI / 2; lid.scale.x = 0.55;
    [-0.22, 0.22].forEach(x => {
      part(s, box(0.06, h + 0.004, d + 0.012), C.walnut, x, h / 2 + 0.02, 0);
      const b = part(s, cyl(d / 2 + 0.008, d / 2 + 0.008, 0.06, 32), C.walnut, x, h + 0.02, 0); b.rotation.z = Math.PI / 2; b.scale.x = 0.55;
    });
    part(s, box(w + 0.01, 0.025, d + 0.01), C.walnutDk, 0, h + 0.02, 0);
    corners(s, w, h, d, 0.02);
    part(s, box(0.09, 0.11, 0.02), C.brass, 0, h - 0.02, d / 2 + 0.008);
    part(s, sph(0.014, 8, 6), C.ink, 0, h - 0.04, d / 2 + 0.02);
    [-1, 1].forEach(sx => { const hd = part(s, torus(0.05, 0.012, 6, 14, Math.PI), C.walnutDk, sx * (w / 2 + 0.01), h * 0.7, 0); hd.rotation.set(0, Math.PI / 2, Math.PI); });
    [-1, 1].forEach(sx => [-1, 1].forEach(sz => part(s, sph(0.025, 10, 8), C.walnutDk, sx * 0.36, 0.015, sz * 0.18)));
  },
  tr_mini_train(s) {
    const a = 0.42, b = 0.24;
    track(s, a, b);
    loco(onTrack(s, a, b, Math.PI / 2 + 0.3));
    coach(onTrack(s, a, b, Math.PI / 2 - 0.36));
  },
};

export function build(id) {
  const fn = BUILD[id];
  if (!fn) throw new Error(`unknown train pick decor: ${id}`);
  const solid = new THREE.Group();
  const k = fn(solid) ?? 1;
  const out = new THREE.Group();
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: false, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }));
  body.castShadow = true; body.receiveShadow = true;
  out.add(body);
  out.scale.setScalar(k);
  return out;
}
