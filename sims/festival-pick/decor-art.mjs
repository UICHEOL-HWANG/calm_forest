import * as THREE from 'three';
import { bakeGroup, part } from '../../js/dream/art.js';

export const IDS = ['sf_lantern_string', 'sf_goldfish_bowl', 'sf_shaved_ice_stand', 'sf_festival_stall'];
export const VARIANTS = ['A', 'B', 'C'];
export const REC = { sf_lantern_string: 'A', sf_goldfish_bowl: 'A', sf_shaved_ice_stand: 'A', sf_festival_stall: 'B' };

export const C = {
  indigo: 0x46528e, indigoDk: 0x313a66, red: 0xd4503e, redDk: 0xa83c30,
  cream: 0xe2d4b6, creamDk: 0xcab994, soft: 0xd8d4ce, gold: 0xe0b450,
  wood: 0xc2905c, woodDk: 0x8e6440, walnut: 0x6e4c34, cap: 0x3c3448,
  fish: 0xf07a3a, fishLt: 0xf3a060, water: 0x7fb6cc, glass: 0xa8ccd8, rim: 0xbcd4da,
  leaf: 0x7ea35a, leafDk: 0x5f8a44, syrupBlue: 0x6f86c8,
  lampRed: 0xe0604a, lampOr: 0xf0964a, lampCream: 0xecd4a2,
};

export const META = {
  sf_lantern_string: {
    A: { name: '처진 줄 등롱 다섯', note: '나무 기둥 둘 사이 늘어진 줄 · 빨강·주황 둥근 등롱 다섯', foot: [1.6, 0.35] },
    B: { name: '등롱 걸이 기둥', note: '둥근 받침 기둥 · 가로대 양쪽에 크림 등롱 넷 · 빨간 꼭지', foot: [1.0, 0.45] },
    C: { name: '나무 틀 긴 등롱', note: '낮은 나무 틀 · 길쭉한 크림 등롱 셋 · 빨간 띠', foot: [1.4, 0.35] },
  },
  sf_goldfish_bowl: {
    A: { name: '나무 의자 위 어항', note: '둥근 물빛 어항 · 금붕어 둘 · 물풀 하나 · 낮은 나무 의자', foot: [0.55, 0.55] },
    B: { name: '넓은 금붕어 대야', note: '쪽빛 테 크림 대야 · 물 위 금붕어 셋 · 연잎 · 종이 뜰채', foot: [0.9, 0.9] },
    C: { name: '물결 테 어항 받침', note: '키 큰 나무 받침 · 빨간 물결 테 어항 · 큰 금붕어 하나', foot: [0.55, 0.55] },
  },
  sf_shaved_ice_stand: {
    A: { name: '줄무늬 차양 빙수 가게', note: '나무 계산대 · 빨강·크림 줄무늬 차양 · 빙수 기계 · 빙수 셋 · 등롱 하나', foot: [1.4, 0.9] },
    B: { name: '파라솔 빙수 수레', note: '쪽빛 수레 · 바퀴 둘 · 빨강·크림 파라솔 · 빙수 기계 · 등롱 하나', foot: [1.4, 1.0] },
    C: { name: '쪽빛 천 빙수 가게', note: '나무 계산대 · 위에 쪽빛 천 셋 · 빙수 기계 · 등롱 둘', foot: [1.3, 0.8] },
  },
  sf_festival_stall: {
    A: { name: '고리 던지기 노점', note: '줄무늬 지붕 · 계산대 위 고리 · 뒤 선반 인형 상품 · 등롱 셋', foot: [1.8, 1.1] },
    B: { name: '금붕어 뜨기 노점', note: '줄무늬 지붕 · 긴 물통에 금붕어 · 종이 뜰채 · 등롱 셋', foot: [1.8, 1.1] },
    C: { name: '뽑기 노점', note: '쪽빛 지붕 · 세 칸 상품 선반 · 끈 뽑기 상자 · 등롱 셋', foot: [1.8, 1.1] },
  },
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

function prize(s, x, y, z, col, kind = 0, k = 1.35) {
  const g = grp(s, x, y, z); g.scale.setScalar(k);
  if (kind === 0) {
    part(g, sph(0.06, 16, 12), col, 0, 0.055, 0);
    [-1, 1].forEach(sx => part(g, sph(0.022, 10, 8), col, sx * 0.04, 0.11, 0));
    [-1, 1].forEach(sx => part(g, sph(0.008, 8, 6), C.cap, sx * 0.02, 0.065, 0.055));
  } else if (kind === 1) {
    part(g, box(0.1, 0.09, 0.08), col, 0, 0.045, 0);
    part(g, box(0.104, 0.018, 0.084), C.gold, 0, 0.06, 0);
  } else {
    part(g, cyl(0.035, 0.04, 0.11, 14), col, 0, 0.055, 0);
    part(g, sph(0.035, 14, 8, 0, TAU, 0, Math.PI / 2), C.soft, 0, 0.11, 0);
  }
}

const BUILD = {
  sf_lantern_string: {
    A(s, g) {
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
      return {};
    },
    B(s, g) {
      part(s, cyl(0.2, 0.22, 0.07, 28), C.woodDk, 0, 0.035, 0);
      rod(s, [0, 0.06, 0], [0, 1.74, 0], 0.035, C.wood);
      part(s, sph(0.05), C.red, 0, 1.78, 0);
      rod(s, [-0.46, 1.64, 0], [0.46, 1.64, 0], 0.022, C.wood);
      [-1, 1].forEach(sx => part(s, sph(0.03), C.woodDk, sx * 0.47, 1.64, 0));
      [[-0.4, 0.06], [-0.18, 0.32], [0.18, 0.18], [0.4, 0.42]].forEach(([x, d]) => lantern(s, g, x, 1.62, 0, 0.1, d, C.lampCream, C.red));
      return {};
    },
    C(s, g) {
      const X = 0.62, H = 1.46;
      [-1, 1].forEach(sx => {
        part(s, box(0.12, 0.05, 0.3), C.woodDk, sx * X, 0.025, 0);
        part(s, box(0.06, H, 0.06), C.wood, sx * X, H / 2, 0);
      });
      part(s, box(2 * X + 0.16, 0.06, 0.08), C.walnut, 0, H + 0.03, 0);
      [-1, 1].forEach(sx => part(s, box(0.12, 0.03, 0.03), C.walnut, sx * (X - 0.07), H - 0.08, 0).rotation.z = sx * 0.7);
      [-0.36, 0, 0.36].forEach((x, i) => {
        const cy = lantern(s, g, x, H, 0, 0.1, 0.05 + (i === 1 ? 0.05 : 0), C.lampCream, C.red, 1.6);
        part(s, cyl(0.093, 0.093, 0.05, 20), C.red, x, cy + 0.06, 0);
      });
      return {};
    },
  },
  sf_goldfish_bowl: {
    A(s) {
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
      return { flat: false };
    },
    B(s) {
      part(s, lathe([[0, 0], [0.34, 0], [0.4, 0.04], [0.43, 0.16], [0.45, 0.17], [0.44, 0.19], [0.41, 0.18], [0.38, 0.06], [0, 0.04]], 40), C.cream);
      part(s, torus(0.44, 0.02, 8, 48), C.indigo, 0, 0.18, 0).rotation.x = Math.PI / 2;
      part(s, cyl(0.405, 0.405, 0.006, 40), C.water, 0, 0.15, 0);
      [[0.12, 0.05, 0.4], [-0.14, 0.1, 2.2], [0.02, -0.16, -1.2]].forEach(([x, z, r]) => floatFish(s, x, 0.155, z, 1.15, r));
      part(s, cyl(0.09, 0.09, 0.006, 20, 1, false, 0.3, TAU - 0.6), C.leaf, -0.2, 0.158, -0.14);
      scoop(s, 0.36, 0.2, 0.16, -0.6, 0.25);
      return { flat: false };
    },
    C(s) {
      const top = 0.56;
      part(s, cyl(0.17, 0.2, 0.05, 6), C.walnut, 0, 0.025, 0);
      [0, 1, 2].forEach(i => { const a = i / 3 * TAU + 0.5; rod(s, [Math.cos(a) * 0.15, 0.04, Math.sin(a) * 0.15], [Math.cos(a) * 0.1, top - 0.02, Math.sin(a) * 0.1], 0.02, C.walnut); });
      part(s, torus(0.12, 0.012, 6, 24), C.walnut, 0, 0.24, 0).rotation.x = Math.PI / 2;
      part(s, cyl(0.15, 0.15, 0.04, 24), C.walnut, 0, top - 0.02, 0);
      const r = 0.2, cy = top + r * 0.9;
      part(s, sph(r, 32, 24, 0, TAU, 0.75, Math.PI - 0.75), C.glass, 0, cy, 0);
      const ry = Math.cos(0.75) * r, rr = Math.sin(0.75) * r;
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * TAU, m = part(s, sph(0.038, 14, 10), C.red, Math.cos(a) * rr, cy + ry + 0.012, Math.sin(a) * rr);
        m.scale.set(1, 0.55, 0.55); m.rotation.y = -a + Math.PI / 2;
      }
      part(s, cyl(rr * 0.98, rr * 0.98, 0.006, 32), C.water, 0, cy + ry - 0.03, 0);
      fish(s, 0.0, cy - 0.01, r * 0.9, 1.5, -0.2);
      return { flat: false };
    },
  },
  sf_shaved_ice_stand: {
    A(s, g) {
      counter(s, 1.2, 0.5, 0.82, 0.1, C.cream, C.red);
      posts(s, 1.3, 0.8, 1.92, 1.72, C.woodDk, 0.035, -0.02);
      stripedRoof(s, 1.36, 0.86, 1.94, 1.72, 8, C.red, C.cream, -0.02);
      iceMachine(s, -0.3, 0.87, 0.06);
      [[0.08, C.red], [0.26, C.syrupBlue], [0.44, C.gold]].forEach(([x, c]) => iceCup(s, x, 0.87, 0.18, c));
      lantern(s, g, 0.6, 1.72, 0.4, 0.12, 0.04, C.lampRed);
      return {};
    },
    B(s, g) {
      part(s, box(1.0, 0.42, 0.56), C.indigo, 0, 0.5, 0);
      part(s, box(1.04, 0.05, 0.6), C.cream, 0, 0.735, 0);
      part(s, box(1.004, 0.06, 0.564), C.cream, 0, 0.36, 0);
      [-1, 1].forEach(sz => {
        part(s, torus(0.2, 0.035, 8, 28), C.woodDk, -0.2, 0.22, sz * 0.31);
        part(s, cyl(0.04, 0.04, 0.04, 12), C.gold, -0.2, 0.22, sz * 0.33).rotation.x = Math.PI / 2;
        [0, 1, 2].forEach(i => { const sp = part(s, cyl(0.008, 0.008, 0.38, 6), C.woodDk, -0.2, 0.22, sz * 0.31); sp.rotation.z = i / 3 * Math.PI; });
      });
      rod(s, [0.42, 0.06, 0], [0.42, 0.3, 0], 0.025, C.woodDk);
      [-1, 1].forEach(sz => rod(s, [0.5, 0.6, sz * 0.22], [0.78, 0.72, sz * 0.22], 0.018, C.woodDk));
      rod(s, [0.78, 0.72, -0.24], [0.78, 0.72, 0.24], 0.02, C.woodDk);
      rod(s, [0.3, 0.76, -0.18], [0.3, 1.85, -0.18], 0.02, C.cap);
      const n = 8;
      for (let i = 0; i < n; i++) part(s, new THREE.ConeGeometry(0.72, 0.26, 4, 1, true, i / n * TAU, TAU / n), i % 2 ? C.cream : C.red, 0.3, 1.88, -0.18);
      part(s, sph(0.035), C.red, 0.3, 2.03, -0.18);
      iceMachine(s, -0.2, 0.76, -0.05);
      [[0.1, C.red], [0.26, C.syrupBlue]].forEach(([x, c]) => iceCup(s, x, 0.76, 0.12, c));
      lantern(s, g, 0.3 + 0.66, 1.76, -0.18, 0.115, 0.03, C.lampRed);
      return {};
    },
    C(s, g) {
      counter(s, 1.1, 0.5, 0.82, 0.05, C.wood, C.walnut, C.walnut);
      [-1, 1].forEach(sx => part(s, box(0.07, 1.86, 0.07), C.walnut, sx * 0.55, 0.93, -0.22));
      part(s, box(1.3, 0.08, 0.1), C.walnut, 0, 1.86, -0.22);
      [-0.36, 0, 0.36].forEach(x => {
        part(s, box(0.34, 0.42, 0.012), C.indigo, x, 1.6, -0.15);
        part(s, box(0.34, 0.03, 0.016), C.cream, x, 1.5, -0.15);
      });
      iceMachine(s, -0.26, 0.87, 0.0, C.indigo);
      [[0.1, C.red], [0.28, C.syrupBlue], [0.44, C.gold]].forEach(([x, c]) => iceCup(s, x, 0.87, 0.14, c));
      [-1, 1].forEach(sx => lantern(s, g, sx * 0.62, 1.82, -0.15, 0.115, 0.04, sx < 0 ? C.lampRed : C.lampOr));
      return {};
    },
  },
  sf_festival_stall: {
    A(s, g) {
      counter(s, 1.6, 0.4, 0.78, 0.3, C.cream, C.red);
      part(s, box(1.6, 1.1, 0.06), C.woodDk, 0, 0.55, -0.45);
      [0.5, 0.9].forEach(y => part(s, box(1.5, 0.04, 0.24), C.wood, 0, y, -0.33));
      [[-0.55, 0.52, C.red, 0], [-0.25, 0.52, C.cream, 0], [0.05, 0.52, C.gold, 1], [0.35, 0.52, C.indigo, 0], [0.6, 0.52, C.fishLt, 2],
       [-0.45, 0.92, C.indigo, 1], [-0.1, 0.92, C.red, 2], [0.25, 0.92, C.soft, 0], [0.55, 0.92, C.red, 1]].forEach(([x, y, c, k]) => prize(s, x, y, -0.32, c, k));
      [[-0.55, 0.4, C.red], [-0.36, 0.3, C.gold], [-0.17, 0.4, C.red]].forEach(([x, z, c]) => part(s, torus(0.08, 0.018, 8, 24), c, x, 0.83, z).rotation.x = Math.PI / 2);
      posts(s, 1.74, 1.1, 2.0, 1.78, C.woodDk, 0.035);
      stripedRoof(s, 1.8, 1.16, 2.02, 1.78, 10, C.red, C.cream);
      [-0.55, 0, 0.55].forEach((x, i) => lantern(s, g, x, 1.78, 0.56, 0.115, 0.03, i === 1 ? C.lampOr : C.lampRed));
      return {};
    },
    B(s, g) {
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
      return {};
    },
    C(s, g) {
      counter(s, 1.6, 0.4, 0.78, 0.3, C.wood, C.indigo, C.walnut);
      part(s, box(1.6, 1.3, 0.06), C.walnut, 0, 0.65, -0.45);
      [0.4, 0.75, 1.1].forEach(y => part(s, box(1.5, 0.04, 0.24), C.wood, 0, y, -0.33));
      const cols = [C.red, C.gold, C.indigo, C.cream, C.fishLt, C.soft];
      [0.42, 0.77, 1.12].forEach((y, r) => [-0.56, -0.28, 0, 0.28, 0.56].forEach((x, i) => prize(s, x, y, -0.32, cols[(i + r * 2) % 6], (i + r) % 3)));
      part(s, box(0.36, 0.2, 0.26), C.red, 0.3, 0.9, 0.3);
      part(s, box(0.37, 0.03, 0.27), C.cream, 0.3, 0.99, 0.3);
      for (let i = 0; i < 9; i++) { const x = 0.18 + (i % 3) * 0.12, z = 0.22 + Math.floor(i / 3) * 0.08; rod(s, [x, 1.0, z], [x + 0.02, 1.06, z + 0.04], 0.005, C.soft, 5); }
      posts(s, 1.74, 1.1, 2.0, 1.78, C.walnut, 0.035);
      stripedRoof(s, 1.8, 1.16, 2.02, 1.78, 6, C.indigo, C.indigoDk);
      [-0.55, 0, 0.55].forEach((x, i) => lantern(s, g, x, 1.78, 0.56, 0.115, 0.03, i === 1 ? C.lampCream : C.lampRed));
      return {};
    },
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

export function build(id, v) {
  const fn = BUILD[id]?.[v];
  if (!fn) throw new Error(`unknown festival pick decor: ${id}/${v}`);
  const solid = new THREE.Group(), glow = new THREE.Group();
  const { k = 1, flat = false, rough = 0.9 } = fn(solid, glow) || {};
  const out = new THREE.Group();
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: flat, roughness: rough, metalness: 0, side: THREE.DoubleSide }));
  body.castShadow = true; body.receiveShadow = true;
  out.add(body);
  flickerRows(glow).forEach(m => { m.userData.noShadow = true; out.add(m); });
  out.scale.setScalar(k);
  return out;
}
