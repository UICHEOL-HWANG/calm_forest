import * as THREE from 'three';
import { bakeGroup, part } from '../../js/dream/art.js';

export const IDS = ['bk_bookshelf', 'bk_reading_lamp', 'bk_reading_chair', 'bk_globe'];
export const VARIANTS = ['A', 'B', 'C'];
export const REC = { bk_bookshelf: 'A', bk_reading_lamp: 'A', bk_reading_chair: 'A', bk_globe: 'B' };

export const C = {
  walnut: 0x6e4a32, walnutDk: 0x4e3424,
  green: 0x3f6a4e, greenDk: 0x2c4c38,
  wine: 0x8e2f3c, wineDk: 0x6a2230,
  cream: 0xe2d4b6, creamDk: 0xc8b48e,
  brass: 0xc99a48, brassDk: 0x9c7434,
  pot: 0xb0704a, leaf: 0x6f9a58,
  lampCream: 0xecd4a2, lampWarm: 0xf0c070,
};

export const META = {
  bk_bookshelf: {
    A: { name: '키 큰 호두나무 책장', note: '세 칸 책장 · 칸마다 색 책 · 기운 책·눕힌 책·작은 화분', foot: [0.85, 0.35] },
    B: { name: '낮고 넓은 책장', note: '두 칸 낮은 책장 · 놋쇠 책받침 · 위에 눕힌 책·찻잔·화분', foot: [1.15, 0.35] },
    C: { name: '둥근 지붕 오두막 책장', note: '숲색 아치 책장 · 위 두 칸 책 · 아래 놋쇠 손잡이 문 둘', foot: [0.8, 0.38] },
  },
  bk_reading_lamp: {
    A: { name: '숲색 갓 스탠드', note: '호두나무 받침 · 놋쇠 기둥 · 숲색 종 갓 아래 빛', foot: [0.4, 0.4] },
    B: { name: '휘어진 독서 등', note: '무거운 둥근 받침 · 앞으로 휜 놋쇠 팔 · 크림 천 갓이 빛남', foot: [0.45, 0.6] },
    C: { name: '협탁 위 은행원 등', note: '호두나무 협탁 · 숲색 반원 갓 등 · 책', foot: [0.5, 0.45] },
  },
  bk_reading_chair: {
    A: { name: '자줏빛 날개 의자', note: '높은 등받이 양옆 날개 · 크림 방석 · 놋쇠 징 · 호두나무 다리', foot: [0.75, 0.7] },
    B: { name: '숲색 둥근 안락의자', note: '감싸는 둥근 등받이 · 놋쇠 단추 · 크림 방석 · 자줏빛 쿠션', foot: [0.75, 0.75] },
    C: { name: '흔들의자', note: '호두나무 흔들의자 · 자줏빛 방석 둘 · 숲색 무릎 담요', foot: [0.6, 0.85] },
  },
  bk_globe: {
    A: { name: '탁상 지구본', note: '호두나무 기둥 받침 · 놋쇠 자오선 · 숲색 바다 크림 대륙', foot: [0.45, 0.45] },
    B: { name: '세 다리 바닥 지구본', note: '휜 호두나무 다리 셋 · 놋쇠 지평 고리 · 크림 바다 숲색·자줏빛 대륙', foot: [0.6, 0.6] },
    C: { name: '책 더미 위 지구본', note: '쌓은 책 위 작은 지구본 · 놋쇠 반고리', foot: [0.55, 0.4] },
  },
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

function bellShade(p, g, x, y, z, rTop, rBot, h, col) {
  part(p, lathe([[rBot, 0], [rBot * 0.92, h * 0.3], [rTop * 1.3, h * 0.8], [rTop, h], [rTop * 0.9, h], [rTop * 1.2, h * 0.8], [rBot * 0.86, h * 0.3], [rBot * 0.94, 0]], 32), col, x, y, z);
  part(g, sph(rBot * 0.36, 16, 12), C.lampWarm, x, y - 0.025, z);
  part(g, cyl(rBot * 1.01, rBot * 1.03, 0.035, 36, 1, true), C.lampCream, x, y + 0.012, z);
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
  bk_bookshelf: {
    A(s) {
      const w = 0.8, h = 1.05, d = 0.3;
      carcass(s, w, h, d, C.walnut, [0.38, 0.72]);
      part(s, box(w + 0.04, 0.04, d + 0.03), C.walnutDk, 0, h + 0.02, 0.005);
      bookRow(s, -0.36, 0.36, 0.07, 0.02, 0.22, 0.26, 0, 5);
      bookRow(s, -0.36, 0.12, 0.395, 0.02, 0.22, 0.25, 3);
      lyingStack(s, 0.24, 0.395, 0.02, 3, 0.2, 0.18);
      bookRow(s, -0.1, 0.36, 0.735, 0.02, 0.22, 0.24, 6, 3);
      plant(s, -0.25, 0.735, 0.03, 1.1);
      return {};
    },
    B(s) {
      const w = 1.1, h = 0.62, d = 0.3;
      carcass(s, w, h, d, C.walnut, [0.32]);
      part(s, box(w + 0.04, 0.04, d + 0.03), C.walnutDk, 0, h + 0.02, 0.005);
      part(s, box(0.03, 0.25, d - 0.04), C.walnut, 0.06, 0.195, 0.01);
      bookRow(s, -0.5, 0.04, 0.07, 0.02, 0.22, 0.22, 1, 6);
      bookRow(s, 0.08, 0.5, 0.07, 0.02, 0.22, 0.2, 9);
      bookRow(s, -0.5, -0.06, 0.335, 0.02, 0.22, 0.22, 4);
      [[-0.04, 1], [0.44, -1]].forEach(([x, sd]) => { const be = grp(s, x, 0.335, 0.03); part(be, box(0.015, 0.16, 0.14), C.brass, 0, 0.08, 0); part(be, box(0.08, 0.01, 0.14), C.brassDk, -sd * 0.04, 0.005, 0); });
      bookRow(s, -0.02, 0.43, 0.335, 0.02, 0.22, 0.2, 12);
      const top = lyingStack(s, -0.3, h + 0.04, 0.0, 3, 0.26, 0.18);
      part(s, cyl(0.05, 0.04, 0.07, 18), C.cream, -0.3, top + 0.035, 0.0);
      part(s, torus(0.025, 0.008, 6, 14), C.cream, -0.3 + 0.055, top + 0.04, 0.0);
      plant(s, 0.34, h + 0.04, 0.0, 1.3);
      return {};
    },
    C(s) {
      const w = 0.76, d = 0.34, body = 0.7;
      carcass(s, w, body, d, C.green, [0.38], C.greenDk);
      const arch = grp(s, 0, body, 0);
      part(arch, cyl(w / 2, w / 2, d, 40, 1, false, -Math.PI / 2, Math.PI), C.green).rotation.x = -Math.PI / 2;
      part(arch, torus(w / 2 + 0.005, 0.015, 6, 40, Math.PI), C.brass, 0, 0, d / 2 + 0.005);
      part(arch, cyl(w / 2 - 0.07, w / 2 - 0.07, 0.01, 40, 1, false, -Math.PI / 2, Math.PI), C.greenDk, 0, 0, d / 2 + 0.004).rotation.x = -Math.PI / 2;
      part(arch, cyl(0.08, 0.08, 0.012, 24), C.cream, 0, 0.16, d / 2 + 0.01).rotation.x = Math.PI / 2;
      part(arch, torus(0.08, 0.01, 6, 24), C.brass, 0, 0.16, d / 2 + 0.014);
      [-1, 1].forEach(sx => {
        const door = grp(s, sx * w * 0.235, 0.215, d / 2 + 0.01);
        part(door, box(w * 0.45, 0.27, 0.02), C.green);
        part(door, box(w * 0.36, 0.2, 0.02), C.greenDk, 0, 0, 0.008);
        part(door, sph(0.018), C.brass, -sx * w * 0.17, 0, 0.025);
      });
      bookRow(s, -0.33, 0.12, 0.395, 0.03, 0.22, 0.26, 2, 4);
      plant(s, 0.22, 0.395, 0.03, 1.0);
      return {};
    },
  },
  bk_reading_lamp: {
    A(s, g) {
      part(s, lathe([[0, 0], [0.17, 0], [0.18, 0.025], [0.14, 0.05], [0.05, 0.07], [0, 0.07]], 32), C.walnut);
      part(s, cyl(0.016, 0.02, 0.76, 12), C.brass, 0, 0.45, 0);
      [0.2, 0.8].forEach(y => part(s, sph(0.03), C.brassDk, 0, y, 0));
      bellShade(s, g, 0, 0.78, 0, 0.05, 0.2, 0.2, C.green);
      part(s, sph(0.025), C.brass, 0, 0.99, 0);
      rod(s, [0.06, 0.86, 0.03], [0.07, 0.7, 0.04], 0.004, C.brassDk, 6);
      part(s, sph(0.012), C.brass, 0.07, 0.7, 0.04);
      return {};
    },
    B(s, g) {
      part(s, cyl(0.17, 0.19, 0.06, 32), C.walnutDk, 0, 0.03, -0.14);
      part(s, torus(0.18, 0.012, 6, 36), C.brass, 0, 0.06, -0.14).rotation.x = Math.PI / 2;
      part(s, tube([[0, 0.06, -0.14], [0, 0.6, -0.16], [0.0, 0.94, -0.08], [0.0, 1.02, 0.08], [0, 0.98, 0.22]], 0.016, 40, 10), C.brass);
      const top = 0.74;
      rod(s, [0, 0.98, 0.22], [0, top + 0.13, 0.22], 0.008, C.brassDk, 8);
      part(g, lathe([[0.14, 0.0], [0.12, 0.14], [0.115, 0.14], [0.135, 0.0]], 32), C.lampCream, 0, top, 0.22);
      part(g, sph(0.05, 14, 10), C.lampWarm, 0, top + 0.06, 0.22);
      part(s, torus(0.14, 0.008, 6, 36), C.wine, 0, top, 0.22).rotation.x = Math.PI / 2;
      part(s, torus(0.12, 0.008, 6, 36), C.wine, 0, top + 0.14, 0.22).rotation.x = Math.PI / 2;
      return {};
    },
    C(s, g) {
      roundSlab(s, 0.44, 0.38, 0.04, 0.05, C.walnut, 0.5);
      legs(s, [-0.17, 0.17], [-0.14, 0.14], 0.5, C.walnutDk, 0.022, null);
      part(s, box(0.36, 0.03, 0.3), C.walnutDk, 0, 0.16, 0);
      lyingStack(s, 0.0, 0.175, 0.0, 2, 0.22, 0.16);
      const L = grp(s, 0.04, 0.54, -0.06);
      part(L, cyl(0.07, 0.08, 0.025, 24), C.brass, 0, 0.0125, 0);
      part(L, cyl(0.012, 0.012, 0.22, 10), C.brass, 0, 0.13, 0);
      const sh = grp(L, 0, 0.25, 0.03); sh.rotation.x = -0.12;
      part(sh, cyl(0.075, 0.075, 0.26, 24, 1, true, -Math.PI / 2, Math.PI), C.green).rotation.z = Math.PI / 2;
      [-1, 1].forEach(sx => part(sh, cyl(0.076, 0.076, 0.008, 24, 1, false, -Math.PI / 2, Math.PI), C.brassDk, sx * 0.13, 0, 0).rotation.z = Math.PI / 2);
      part(g, cyl(0.04, 0.04, 0.22, 12), C.lampWarm, 0.04, 0.73, -0.01).rotation.z = Math.PI / 2;
      part(s, box(0.16, 0.035, 0.11), C.wine, -0.12, 0.557, 0.08).rotation.y = 0.3;
      part(s, box(0.15, 0.025, 0.1), C.cream, -0.12, 0.557, 0.08).rotation.y = 0.3;
      return {};
    },
  },
  bk_reading_chair: {
    A(s) {
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
      return {};
    },
    B(s) {
      part(s, cyl(0.28, 0.3, 0.08, 36), C.walnutDk, 0, 0.04, 0);
      part(s, cyl(0.34, 0.3, 0.2, 40), C.green, 0, 0.18, 0);
      part(s, cyl(0.3, 0.3, 0.1, 40), C.cream, 0, 0.32, 0.02);
      const pr = [[0.36, 0], [0.38, 0.2], [0.37, 0.4], [0.33, 0.48], [0.27, 0.46], [0.29, 0.38], [0.3, 0.2], [0.3, 0]];
      part(s, lathe(pr, 40, Math.PI * 0.35, Math.PI * 1.3), C.green, 0, 0.26, 0);
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * 0.42 + i * (Math.PI * 1.16 / 8);
        part(s, sph(0.016, 8, 6), C.brass, Math.sin(a) * 0.295, 0.56, Math.cos(a) * 0.295);
        if (i % 2 === 0) part(s, sph(0.016, 8, 6), C.brass, Math.sin(a) * 0.3, 0.44, Math.cos(a) * 0.3);
      }
      const pil = part(s, sph(0.15, 18, 12), C.wine, 0.0, 0.5, -0.17); pil.scale.set(1.2, 0.85, 0.4); pil.rotation.x = -0.25;
      part(s, sph(0.018, 8, 6), C.brass, 0, 0.5, -0.11);
      return {};
    },
    C(s) {
      [-1, 1].forEach(sx => {
        part(s, tube([[sx * 0.24, 0.08, 0.4], [sx * 0.24, 0.015, 0.18], [sx * 0.24, 0.015, -0.12], [sx * 0.24, 0.06, -0.38]], 0.02, 30, 8), C.walnutDk);
        rod(s, [sx * 0.24, 0.02, 0.18], [sx * 0.24, 0.38, 0.18], 0.02, C.walnut);
        rod(s, [sx * 0.24, 0.02, -0.16], [sx * 0.24, 0.38, -0.16], 0.02, C.walnut);
        rod(s, [sx * 0.24, 0.36, -0.17], [sx * 0.24, 1.0, -0.32], 0.022, C.walnut);
        rod(s, [sx * 0.24, 0.56, 0.2], [sx * 0.24, 0.58, -0.22], 0.018, C.walnut);
        rod(s, [sx * 0.24, 0.38, 0.18], [sx * 0.24, 0.56, 0.18], 0.016, C.walnut);
      });
      roundSlab(s, 0.52, 0.42, 0.04, 0.04, C.walnut, 0.36);
      roundSlab(s, 0.42, 0.36, 0.07, 0.05, C.wine, 0.4);
      const back = grp(s, 0, 0.72, -0.255); back.rotation.x = -0.22;
      for (let i = 0; i < 5; i++) part(back, box(0.035, 0.5, 0.025), C.walnut, -0.16 + i * 0.08, 0, 0);
      part(back, box(0.5, 0.06, 0.04), C.walnut, 0, 0.27, 0);
      const bc = grp(back, 0, -0.06, 0.05); bc.rotation.x = Math.PI / 2;
      roundSlab(bc, 0.34, 0.3, 0.06, 0.05, C.wine, -0.03);
      const bl = grp(s, 0.05, 0.48, 0.06); bl.rotation.set(0, 0.2, -0.05);
      part(bl, box(0.3, 0.03, 0.34), C.green);
      part(bl, box(0.03, 0.2, 0.32), C.green, 0.16, -0.09, 0).rotation.z = 0.12;
      [-0.1, 0, 0.1].forEach(z => part(bl, box(0.31, 0.034, 0.012), C.greenDk, 0, 0, z));
      return {};
    },
  },
  bk_globe: {
    A(s) {
      part(s, lathe([[0, 0], [0.16, 0], [0.17, 0.03], [0.12, 0.06], [0.04, 0.08], [0.03, 0.3], [0.05, 0.36], [0.03, 0.42], [0.05, 0.46], [0, 0.46]], 28), C.walnut);
      part(s, torus(0.165, 0.01, 6, 32), C.brass, 0, 0.03, 0).rotation.x = Math.PI / 2;
      part(s, cyl(0.03, 0.04, 0.05, 14), C.brassDk, 0, 0.48, 0);
      globe(s, 0, 0.74, 0, 0.21, C.green, [C.cream, C.creamDk]);
      return {};
    },
    B(s) {
      const R = 0.25, cy = 0.56 + R;
      [0, 1, 2].forEach(i => {
        const a = i / 3 * TAU + Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
        part(s, tube([[ca * R * 1.18, cy, sa * R * 1.18], [ca * 0.24, 0.45, sa * 0.24], [ca * 0.22, 0.2, sa * 0.22], [ca * 0.29, 0.02, sa * 0.29]], 0.022, 30, 8), C.walnut);
        part(s, sph(0.026), C.brass, ca * 0.29, 0.02, sa * 0.29);
      });
      part(s, torus(0.215, 0.012, 6, 30), C.walnutDk, 0, 0.2, 0).rotation.x = Math.PI / 2;
      globe(s, 0, cy, 0, R, C.cream, [C.green, C.wine, C.greenDk]);
      part(s, torus(R * 1.18, 0.02, 6, 48), C.brass, 0, cy, 0).rotation.x = Math.PI / 2;
      return {};
    },
    C(s) {
      const top = lyingStack(s, 0, 0, 0, 3, 0.4, 0.3);
      lyingStack(s, 0.33, 0, 0.06, 1, 0.22, 0.17);
      part(s, cyl(0.06, 0.08, 0.04, 20), C.brassDk, 0, top + 0.02, 0);
      const R = 0.15;
      part(s, cyl(0.012, 0.012, 0.06, 8), C.brass, 0, top + 0.06, 0);
      globe(s, 0, top + 0.06 + R + 0.02, 0, R, C.greenDk, [C.cream, C.brass], C.brass, 0.41).rotation.y = 0.5;
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
  if (!fn) throw new Error(`unknown book pick decor: ${id}/${v}`);
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
