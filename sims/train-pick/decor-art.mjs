import * as THREE from 'three';
import { bakeGroup, part } from '../../js/dream/art.js';

export const IDS = ['tr_station_bench', 'tr_station_clock', 'tr_trunk', 'tr_mini_train'];
export const YARD_IDS = ['tr_station_clock'];
export const VARIANTS = ['A', 'B', 'C'];
export const REC = { tr_station_bench: 'A', tr_station_clock: 'A', tr_trunk: 'A', tr_mini_train: 'A' };

export const C = {
  green: 0x2f5a44, greenDk: 0x22422f,
  wine: 0x7e2a36, wineDk: 0x5e1f2a,
  brass: 0xc99a48, brassDk: 0x9c7434,
  walnut: 0x6e4a32, walnutDk: 0x4e3424,
  cream: 0xe4d6b4, creamDk: 0xc8b48e,
  steam: 0xd2d6d8, ink: 0x3a3230, leaf: 0x5f8a4e,
};

export const META = {
  tr_station_bench: {
    A: { name: '무쇠 다리 역 벤치', note: '숲색 무쇠 다리·팔걸이 소용돌이 · 호두나무 살 등받이 · 놋쇠 이름판', foot: [1.25, 0.55] },
    B: { name: '객실 좌석', note: '자줏빛 단추 박음 등받이·방석 · 호두나무 옆판 · 크림 머리 덮개', foot: [1.2, 0.55] },
    C: { name: '대합실 긴 의자와 짐', note: '등 없는 호두나무 긴 의자 · 숲색 다리 · 위에 자줏빛 가방과 숲색 모자 상자', foot: [1.25, 0.45] },
  },
  tr_station_clock: {
    A: { name: '기둥 위 양면 시계', note: '숲색 기둥 · 놋쇠 띠 · 둥근 양면 시계 · 놋쇠 꼭지', foot: [0.6, 0.6], posts: [[0, 0, 0.2]] },
    B: { name: '팔 달린 걸이 시계', note: '숲색 기둥에서 뻗은 소용돌이 팔 · 아래 매달린 양면 시계', foot: [1.0, 0.5], posts: [[-0.32, 0, 0.18]] },
    C: { name: '네모 시계탑', note: '호두나무 받침 · 숲색 네모 기둥 · 네 면 시계 · 자줏빛 뾰족 지붕', foot: [0.7, 0.7], posts: [[0, 0, 0.3]] },
  },
  tr_trunk: {
    A: { name: '둥근 뚜껑 여행 트렁크', note: '자줏빛 몸통 · 둥근 뚜껑 · 호두나무 띠 · 놋쇠 모서리와 자물쇠', foot: [0.85, 0.5] },
    B: { name: '가죽띠 납작 트렁크', note: '숲색 납작 트렁크 · 호두나무 가죽띠 둘 · 놋쇠 버클 · 스티커', foot: [0.9, 0.5] },
    C: { name: '쌓아 둔 짐', note: '호두나무 트렁크 위 자줏빛 가방 · 맨 위 숲색 모자 상자', foot: [0.85, 0.5] },
  },
  tr_mini_train: {
    A: { name: '타원 철길 꼬마 기차', note: '놋쇠 레일 타원 철길 · 숲색 기관차 · 자줏빛 객차 · 증기 한 덩이', foot: [1.0, 0.65] },
    B: { name: '둥근 판 위 기차', note: '호두나무 둥근 판 · 원형 철길 · 기관차와 객차 둘 · 작은 나무와 역 표지', foot: [1.0, 1.0] },
    C: { name: '굴 지나는 기차', note: '타원 철길 한쪽 초록 언덕 굴 · 나오는 기관차 · 놋쇠 신호기', foot: [1.05, 0.65] },
  },
};

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

function handleTop(p, x, y, z, w, col, rotY = 0) {
  const g = grp(p, x, y, z); g.rotation.y = rotY;
  part(g, torus(w, w * 0.2, 6, 16, Math.PI), col);
  [-1, 1].forEach(s => part(g, box(w * 0.4, w * 0.25, w * 0.4), C.brass, s * w, 0, 0));
  return g;
}

function sticker(p, x, y, z, r, col, col2, rotX = Math.PI / 2) {
  const g = grp(p, x, y, z); g.rotation.x = rotX;
  part(g, cyl(r, r, 0.006, 20), col);
  part(g, cyl(r * 0.55, r * 0.55, 0.008, 20), col2);
  return g;
}

function suitcaseUpright(p, x, y, z, w, h, d, col, trim, rotY = 0) {
  const g = grp(p, x, y, z); g.rotation.y = rotY;
  roundBox(g, w, h, d, 0.03, col, 0, h / 2, 0);
  part(g, box(w * 1.01, 0.02, d * 1.03), trim, 0, h / 2, 0);
  [-1, 1].forEach(sx => [0.04, h - 0.04].forEach(yy => part(g, box(0.05, 0.05, d * 1.05), C.brass, sx * (w / 2 - 0.02), yy, 0)));
  handleTop(g, 0, h + 0.005, 0, 0.05, C.walnutDk);
  sticker(g, -w * 0.2, h * 0.32, d / 2 + 0.003, 0.045, C.cream, C.green);
  return g;
}

function hatbox(p, x, y, z, r, h, col, lid, rib) {
  part(p, cyl(r, r, h, 28), col, x, y + h / 2, z);
  part(p, cyl(r * 1.04, r * 1.04, h * 0.22, 28), lid, x, y + h * 0.9, z);
  part(p, box(r * 0.2, h * 1.05, r * 2.08), rib, x, y + h / 2, z);
  part(p, torus(r * 0.18, r * 0.05, 6, 14), rib, x, y + h + r * 0.12, z);
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

function tree(p, x, z, s, y = 0) {
  part(p, cyl(0.012 * s, 0.016 * s, 0.06 * s, 8), C.walnut, x, y + 0.03 * s, z);
  part(p, new THREE.ConeGeometry(0.06 * s, 0.12 * s, 10), C.leaf, x, y + 0.11 * s, z);
  part(p, new THREE.ConeGeometry(0.045 * s, 0.1 * s, 10), C.leaf, x, y + 0.17 * s, z);
}

const BUILD = {
  tr_station_bench: {
    A(s) {
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
      return {};
    },
    B(s) {
      part(s, box(1.06, 0.26, 0.46), C.walnut, 0, 0.13, 0);
      part(s, box(1.0, 0.03, 0.02), C.brass, 0, 0.2, 0.232);
      roundBox(s, 1.04, 0.13, 0.48, 0.05, C.wine, 0, 0.32, 0.01).rotation.x = Math.PI / 2;
      roundBox(s, 1.04, 0.62, 0.15, 0.06, C.wine, 0, 0.7, -0.17).rotation.x = -0.06;
      [0.52, 0.7, 0.88].forEach((y, r) => [-0.36, -0.18, 0, 0.18, 0.36].forEach((x, c) => { if ((r + c) % 2 === 0) part(s, sph(0.018, 10, 8), C.brass, x, y, -0.09 - y * 0.06); }));
      [-1, 1].forEach(sx => {
        part(s, box(0.06, 0.58, 0.5), C.walnut, sx * 0.55, 0.29, -0.01);
        roundBox(s, 0.09, 0.05, 0.52, 0.02, C.walnutDk, sx * 0.55, 0.6, -0.01);
      });
      part(s, box(1.16, 0.05, 0.2), C.walnutDk, 0, 1.03, -0.19);
      const lace = part(s, box(0.34, 0.16, 0.012), C.cream, 0, 0.9, -0.085); lace.rotation.x = -0.06;
      part(s, box(0.34, 0.012, 0.014), C.creamDk, 0, 0.83, -0.08).rotation.x = -0.06;
      return {};
    },
    C(s) {
      [-0.12, 0, 0.12].forEach(z => roundBox(s, 1.22, 0.04, 0.11, 0.015, C.walnut, 0, 0.42, z));
      [-0.48, 0.48].forEach(x => {
        part(s, box(0.06, 0.4, 0.06), C.green, x, 0.2, -0.13);
        part(s, box(0.06, 0.4, 0.06), C.green, x, 0.2, 0.13);
        part(s, box(0.06, 0.05, 0.36), C.greenDk, x, 0.38, 0);
        part(s, box(0.08, 0.04, 0.36), C.greenDk, x, 0.02, 0);
      });
      part(s, box(0.96, 0.04, 0.04), C.green, 0, 0.12, 0);
      suitcaseUpright(s, 0.22, 0.44, 0.0, 0.42, 0.28, 0.14, C.wine, C.wineDk, -0.12);
      hatbox(s, -0.3, 0.44, 0.02, 0.12, 0.15, C.green, C.greenDk, C.cream);
      return {};
    },
  },
  tr_station_clock: {
    A(s) {
      part(s, cyl(0.2, 0.22, 0.1, 28), C.greenDk, 0, 0.05, 0);
      part(s, cyl(0.13, 0.17, 0.14, 24), C.green, 0, 0.17, 0);
      part(s, cyl(0.065, 0.075, 1.62, 20), C.green, 0, 1.05, 0);
      [0.26, 0.9, 1.6].forEach(y => part(s, torus(0.075, 0.018, 6, 20), C.brass, 0, y, 0).rotation.x = Math.PI / 2);
      part(s, cyl(0.12, 0.07, 0.12, 20), C.greenDk, 0, 1.9, 0);
      drumClock(s, 0, 2.22, 0, 0.3, 0.14, C.green);
      part(s, sph(0.05, 14, 10), C.brass, 0, 2.58, 0);
      part(s, new THREE.ConeGeometry(0.022, 0.12, 10), C.brass, 0, 2.68, 0);
      return {};
    },
    B(s) {
      const px = -0.32;
      part(s, cyl(0.18, 0.2, 0.1, 24), C.greenDk, px, 0.05, 0);
      part(s, cyl(0.06, 0.07, 2.3, 18), C.green, px, 1.2, 0);
      [0.25, 1.2].forEach(y => part(s, torus(0.07, 0.016, 6, 18), C.brass, px, y, 0).rotation.x = Math.PI / 2);
      part(s, sph(0.07, 14, 10), C.brass, px, 2.4, 0);
      rod(s, [px, 2.2, 0], [0.32, 2.2, 0], 0.025, C.green);
      rod(s, [px, 1.86, 0], [0.0, 2.2, 0], 0.018, C.green);
      const sc = part(s, torus(0.08, 0.016, 6, 20, Math.PI * 1.5), C.green, px + 0.16, 2.06, 0); sc.rotation.z = 0.6;
      part(s, sph(0.035, 12, 8), C.brass, 0.34, 2.2, 0);
      rod(s, [0.2, 2.2, 0], [0.2, 2.06, 0], 0.012, C.brassDk);
      drumClock(s, 0.2, 1.83, 0, 0.22, 0.12, C.green);
      part(s, sph(0.03, 12, 8), C.brass, 0.2, 1.57, 0);
      return {};
    },
    C(s) {
      part(s, box(0.56, 0.18, 0.56), C.walnut, 0, 0.09, 0);
      part(s, box(0.48, 0.04, 0.48), C.walnutDk, 0, 0.2, 0);
      part(s, box(0.32, 1.26, 0.32), C.green, 0, 0.85, 0);
      [0.5, 1.2].forEach(y => part(s, box(0.34, 0.03, 0.34), C.brass, 0, y, 0));
      part(s, box(0.4, 0.06, 0.4), C.greenDk, 0, 1.5, 0);
      part(s, box(0.5, 0.5, 0.5), C.walnut, 0, 1.78, 0);
      [0, 1, 2, 3].forEach(i => { const a = i * Math.PI / 2; clockFace(s, Math.sin(a) * 0.255, 1.78, Math.cos(a) * 0.255, 0.19, a); });
      part(s, box(0.56, 0.05, 0.56), C.walnutDk, 0, 2.05, 0);
      const roof = part(s, new THREE.ConeGeometry(0.42, 0.38, 4), C.wine, 0, 2.26, 0); roof.rotation.y = Math.PI / 4;
      part(s, sph(0.04, 12, 8), C.brass, 0, 2.47, 0);
      part(s, new THREE.ConeGeometry(0.018, 0.1, 8), C.brass, 0, 2.55, 0);
      return {};
    },
  },
  tr_trunk: {
    A(s) {
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
      return {};
    },
    B(s) {
      const w = 0.86, h = 0.32, d = 0.46, y0 = 0.04;
      [-1, 1].forEach(sx => [-1, 1].forEach(sz => part(s, cyl(0.025, 0.03, y0, 12), C.walnutDk, sx * 0.36, y0 / 2, sz * 0.18)));
      roundBox(s, w, h, d, 0.04, C.green, 0, y0 + h / 2, 0);
      part(s, box(w * 1.01, 0.022, d * 1.01), C.greenDk, 0, y0 + h * 0.72, 0);
      [-0.22, 0.22].forEach(x => {
        part(s, box(0.07, h + 0.016, d + 0.016), C.walnut, x, y0 + h / 2, 0);
        part(s, box(0.085, 0.07, 0.02), C.brass, x, y0 + h * 0.55, d / 2 + 0.012);
        part(s, box(0.05, 0.035, 0.024), C.walnutDk, x, y0 + h * 0.55, d / 2 + 0.014);
      });
      handleTop(s, 0, y0 + h + 0.004, 0, 0.07, C.walnutDk);
      sticker(s, 0.0, y0 + h * 0.4, d / 2 + 0.005, 0.06, C.cream, C.wine);
      const st = part(s, box(0.14, 0.006, 0.09), C.cream, 0.3, y0 + h + 0.004, 0.08); st.rotation.y = 0.3;
      part(s, box(0.1, 0.008, 0.02), C.wine, 0.3, y0 + h + 0.006, 0.08).rotation.y = 0.3;
      sticker(s, -0.32, y0 + h + 0.004, -0.06, 0.05, C.wine, C.cream, 0);
      return {};
    },
    C(s) {
      const w = 0.8, h = 0.32, d = 0.44;
      part(s, box(w, h, d), C.walnut, 0, h / 2, 0);
      part(s, box(w + 0.01, 0.025, d + 0.01), C.walnutDk, 0, h * 0.72, 0);
      corners(s, w, h, d, 0);
      part(s, box(0.08, 0.09, 0.02), C.brass, 0, h * 0.62, d / 2 + 0.008);
      const sc = grp(s, -0.04, h, 0.0); sc.rotation.y = 0.14;
      roundBox(sc, 0.6, 0.18, 0.36, 0.035, C.wine, 0, 0.09, 0);
      part(sc, box(0.61, 0.016, 0.365), C.wineDk, 0, 0.1, 0);
      [-1, 1].forEach(sx => [-1, 1].forEach(sz => part(sc, box(0.05, 0.19, 0.05), C.brass, sx * 0.28, 0.095, sz * 0.16)));
      const hd = part(sc, torus(0.05, 0.012, 6, 14, Math.PI), C.walnutDk, 0, 0.09, 0.185); hd.rotation.x = Math.PI / 2;
      sticker(sc, 0.15, 0.18, 0.05, 0.05, C.cream, C.green, 0);
      hatbox(s, -0.1, h + 0.18, -0.02, 0.15, 0.18, C.green, C.greenDk, C.cream);
      return {};
    },
  },
  tr_mini_train: {
    A(s) {
      const a = 0.42, b = 0.24;
      track(s, a, b);
      loco(onTrack(s, a, b, Math.PI / 2 + 0.3));
      coach(onTrack(s, a, b, Math.PI / 2 - 0.36));
      return {};
    },
    B(s) {
      const r = 0.36, y0 = 0.08;
      part(s, cyl(0.48, 0.5, y0, 48), C.walnut, 0, y0 / 2, 0);
      part(s, torus(0.49, 0.012, 6, 48), C.brass, 0, y0, 0).rotation.x = Math.PI / 2;
      part(s, cyl(0.3, 0.3, 0.006, 40), C.leaf, 0, y0 + 0.003, 0);
      track(s, r, r, y0);
      loco(onTrack(s, r, r, Math.PI / 2 - 0.1, y0));
      coach(onTrack(s, r, r, Math.PI / 2 + 0.6, y0), C.wine);
      coach(onTrack(s, r, r, Math.PI / 2 + 1.25, y0), C.green);
      tree(s, -0.1, -0.1, 1.2, y0); tree(s, 0.06, -0.16, 0.9, y0);
      part(s, box(0.2, 0.04, 0.09), C.creamDk, 0.08, y0 + 0.02, 0.06);
      rod(s, [0.15, y0, 0.06], [0.15, y0 + 0.16, 0.06], 0.008, C.brassDk);
      part(s, box(0.1, 0.045, 0.01), C.cream, 0.15, y0 + 0.17, 0.06);
      part(s, box(0.08, 0.008, 0.012), C.green, 0.15, y0 + 0.17, 0.06);
      return {};
    },
    C(s) {
      const a = 0.42, b = 0.24;
      track(s, a, b);
      const hill = part(s, sph(0.24, 28, 16, 0, TAU, 0, Math.PI / 2), C.leaf, a, 0, 0); hill.scale.set(0.9, 1.05, 1.25);
      [-1, 1].forEach(sz => {
        const portal = part(s, torus(0.075, 0.022, 8, 20, Math.PI), C.walnut, a, 0, sz * 0.27); portal.rotation.y = 0;
        part(s, cyl(0.065, 0.065, 0.02, 20, 1, false, -Math.PI / 2, Math.PI), C.ink, a, 0, sz * 0.272).rotation.x = Math.PI / 2;
      });
      tree(s, a + 0.06, -0.06, 0.8, 0.2); tree(s, a - 0.1, 0.05, 0.7, 0.18);
      loco(onTrack(s, a, b, 0.85));
      coach(onTrack(s, a, b, 0.32));
      const sig = grp(s, -0.1, 0, -0.38);
      part(sig, cyl(0.035, 0.04, 0.02, 14), C.walnutDk, 0, 0.01, 0);
      rod(sig, [0, 0, 0], [0, 0.3, 0], 0.01, C.brassDk);
      part(sig, box(0.05, 0.1, 0.03), C.ink, 0, 0.26, 0);
      part(sig, sph(0.014, 10, 8), C.wine, 0, 0.285, 0.016);
      part(sig, sph(0.014, 10, 8), C.green, 0, 0.24, 0.016);
      return {};
    },
  },
};

export function build(id, v) {
  const fn = BUILD[id]?.[v];
  if (!fn) throw new Error(`unknown train pick decor: ${id}/${v}`);
  const solid = new THREE.Group();
  const { k = 1, flat = false, rough = 0.9 } = fn(solid) || {};
  const out = new THREE.Group();
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: flat, roughness: rough, metalness: 0, side: THREE.DoubleSide }));
  body.castShadow = true; body.receiveShadow = true;
  out.add(body);
  out.scale.setScalar(k);
  return out;
}
