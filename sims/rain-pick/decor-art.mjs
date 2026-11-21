import * as THREE from 'three';
import { bakeGroup, part } from '../../js/dream/art.js';

export const IDS = ['rn_rain_planter', 'rn_umbrella_stand', 'rn_rain_curtain', 'rn_snail_garden'];
export const VARIANTS = ['A', 'B', 'C'];
export const REC = { rn_rain_planter: 'A', rn_umbrella_stand: 'A', rn_rain_curtain: 'B', rn_snail_garden: 'A' };

export const C = {
  yellow: 0xf0cc48, yellowDk: 0xd2a838, blue: 0x5f8fc8, blueDk: 0x46709f, blueLt: 0x9cc2e4, water: 0x7fa9d6,
  frog: 0x7fb85a, frogDk: 0x5e9440, leaf: 0x8cc266, moss: 0x86a860,
  grey: 0x9aa3ad, greyDk: 0x6f7880, stone: 0xa8aaa4, stoneDk: 0x8a8c86,
  cream: 0xdcd6c4, ink: 0x2b2f36, pink: 0xeea0a6, pinkDk: 0xd47f8a,
  wood: 0xa87a4e, woodDk: 0x7a5636, woodLt: 0xc49a68,
  shell: 0xe0a65a, shellDk: 0xb57c3e, snail: 0xcfc4a6,
};

export const META = {
  rn_rain_planter: {
    A: { name: '토란잎 빗물 화분', note: '하늘색 둥근 화분 · 넓은 토란잎 셋 · 잎마다 빗방울 한 알', foot: [1.1, 1.0] },
    B: { name: '노란 양동이 화분', note: '노란 양동이에 빗물 · 떠 있는 잎 · 분홍 튤립 둘', foot: [1.0, 0.9] },
    C: { name: '빗물 통과 개구리', note: '나무 빗물 통 · 물풀 · 테두리에 앉은 작은 개구리', foot: [1.1, 0.9] },
  },
  rn_umbrella_stand: {
    A: { name: '하늘색 우산꽂이', note: '하늘색 둥근 통 · 노랑·연두 우산 둘', foot: [0.5, 0.5] },
    B: { name: '노란 장화 우산꽂이', note: '노란 장화 모양 통 · 하늘색 우산 하나', foot: [0.55, 0.45] },
    C: { name: '나무 우산 받침', note: '나무 틀 · 우산 셋(노랑·하늘·연두) · 아래 물받이', foot: [0.7, 0.45] },
  },
  rn_rain_curtain: {
    A: { name: '빗방울 구슬 발', note: '나무 틀에 하늘색 빗방울 구슬 줄 · 가운데 작은 구름', foot: [1.3, 0.35] },
    B: { name: '구름 빗방울 모빌', note: '굽은 나무 걸이 · 크림 구름 · 아래 빗방울 다섯', foot: [0.7, 0.45] },
    C: { name: '창가 빗방울 커튼', note: '하늘 창틀 · 노란 커튼 끈 · 앞에 빗방울 구슬 줄', foot: [1.1, 0.4] },
  },
  rn_snail_garden: {
    A: { name: '이끼 돌 달팽이', note: '이끼 덮인 둥근 돌 · 노란 달팽이 · 작은 버섯 둘 · 웅덩이', foot: [1.4, 1.1] },
    B: { name: '큰 잎 위 달팽이 둘', note: '바닥에 누운 큰 연두 잎 · 달팽이 둘 · 이슬방울', foot: [1.5, 0.8] },
    C: { name: '엎은 화분 달팽이', note: '엎어 둔 하늘색 화분 · 위에 달팽이 · 새싹과 웅덩이', foot: [1.2, 1.0] },
  },
};

const TAU = Math.PI * 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sph = (r, w = 12, h = 9, ...rest) => new THREE.SphereGeometry(r, w, h, ...rest);
const cyl = (a, b, h, s = 12, ...rest) => new THREE.CylinderGeometry(a, b, h, s, ...rest);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const torus = (r, t, rs = 6, ts = 18, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc);
const cone = (r, h, s = 12) => new THREE.ConeGeometry(r, h, s);
const lathe = (pts, s = 20) => new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), s);
const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
const tube = (pts, r, seg = 40, rad = 6) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V(...p))), seg, r, rad, false);
const stick = (p, a, b, r, col, r2 = r) => {
  const A = V(...a), B = V(...b);
  const m = part(p, cyl(r2, r, A.distanceTo(B), 6), col, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), B.sub(A).normalize());
  return m;
};

const DROP = [[0, -1], [0.42, -0.86], [0.62, -0.5], [0.56, -0.1], [0.34, 0.36], [0.12, 0.76], [0, 1]];
const drop = (p, s, col, x, y, z) => part(p, lathe(DROP.map(([a, b]) => [a * s, b * s]), 12), col, x, y, z);

function puddle(p, r, x, z, sx = 1, sz = 0.7) {
  const m = part(p, cyl(r, r, 0.012, 24), C.water, x, 0.006, z); m.scale.set(sx, 1, sz);
  const ring = part(p, torus(r * 0.55, 0.008, 4, 22), C.blueLt, x + r * 0.15, 0.014, z); ring.rotation.x = Math.PI / 2; ring.scale.set(sx, sz, 1);
}

function cloud(p, s, col, x, y, z) {
  const g = grp(p, x, y, z);
  [[0, 0.05, 0.36], [-0.34, -0.04, 0.27], [0.34, -0.04, 0.27], [0.15, 0.22, 0.24], [-0.14, 0.18, 0.2]].forEach(([cx, cy, r]) => part(g, sph(s * r, 14, 10), col, cx * s, cy * s, 0).scale.z = 0.7);
  return g;
}

function taroLeaf(p, s, col, rib, x, y, z, ry, tilt) {
  const g = grp(p, x, y, z); g.rotation.set(0, ry, 0);
  const h = grp(g); h.rotation.x = tilt;
  const cap = part(h, sph(s, 18, 8, 0, TAU, Math.PI * 0.62, Math.PI * 0.38), col, 0, s * 0.82, 0);
  cap.scale.set(1, 0.6, 1.25);
  part(h, cyl(0.006, 0.006, s * 2.2, 4), rib, 0, s * 0.33, 0).rotation.x = Math.PI / 2;
  return { g, h };
}

function tulip(p, x, y, z, hh, col, colDk) {
  stick(p, [x, y, z], [x, y + hh, z], 0.01, C.frogDk);
  const g = grp(p, x, y + hh, z);
  part(g, sph(0.055, 10, 8), col, 0, 0.04, 0).scale.set(1, 1.3, 1);
  [0, 1, 2].forEach(i => { const a = i / 3 * TAU; const m = part(g, cone(0.03, 0.06, 5), colDk, Math.cos(a) * 0.04, 0.1, Math.sin(a) * 0.04); m.scale.z = 0.6; });
  const lf = part(p, sph(0.06, 8, 6), C.leaf, x + 0.04, y + hh * 0.35, z); lf.scale.set(0.35, 1.4, 0.15); lf.rotation.z = -0.4;
}

function frog(p, s, x, y, z, ry = 0) {
  const g = grp(p, x, y, z); g.rotation.y = ry;
  part(g, sph(s, 14, 10), C.frog, 0, s * 0.7, 0).scale.set(1.15, 0.75, 1);
  [-1, 1].forEach(sx => {
    part(g, sph(s * 0.38, 10, 8), C.frog, sx * s * 0.48, s * 1.2, s * 0.35);
    part(g, sph(s * 0.24, 8, 6), C.cream, sx * s * 0.5, s * 1.25, s * 0.56);
    part(g, sph(s * 0.13, 6, 5), C.ink, sx * s * 0.5, s * 1.27, s * 0.68);
    part(g, sph(s * 0.3, 8, 6), C.frogDk, sx * s * 0.75, s * 0.2, s * 0.35).scale.set(1, 0.5, 1.4);
    part(g, sph(s * 0.14, 6, 5), C.pink, sx * s * 0.72, s * 0.8, s * 0.72).scale.z = 0.4;
  });
  const m = part(g, torus(s * 0.32, s * 0.04, 4, 12, Math.PI * 0.8), C.frogDk, 0, s * 0.82, s * 0.85); m.rotation.z = Math.PI + Math.PI * 0.1;
  return g;
}

function umbrella(p, x, z, H, col, colDk, tiltX, tiltZ, handle = C.wood) {
  const g = grp(p, x, 0, z); g.rotation.set(tiltX, 0, tiltZ);
  part(g, cone(0.012, 0.06, 6), C.greyDk, 0, 0.05, 0).rotation.x = Math.PI;
  part(g, cyl(0.01, 0.01, H, 6), C.greyDk, 0, H / 2, 0);
  part(g, lathe([[0, 0.12], [0.06, 0.2], [0.1, H * 0.48], [0.085, H * 0.68], [0.03, H * 0.8], [0, H * 0.82]], 8), col);
  part(g, torus(0.095, 0.014, 4, 14), colDk, 0, H * 0.5, 0).rotation.x = Math.PI / 2;
  part(g, cyl(0.016, 0.016, 0.08, 8), handle, 0, H + 0.02, 0);
  part(g, torus(0.05, 0.016, 6, 14, Math.PI), handle, 0.05, H + 0.06, 0);
  return g;
}

function bead(p, x, y0, z, n, gap, s, cols) {
  stick(p, [x, y0, z], [x, y0 - gap * n, z], 0.004, C.greyDk);
  for (let i = 0; i < n; i++) drop(p, s, cols[i % cols.length], x, y0 - gap * (i + 0.6), z);
}

function snail(p, s, x, y, z, ry = 0, shell = C.shell, shellDk = C.shellDk) {
  const g = grp(p, x, y, z); g.rotation.y = ry;
  const b = part(g, sph(s * 0.32, 12, 8), C.snail, s * 0.05, s * 0.16, 0); b.scale.set(2.4, 0.6, 0.9);
  part(g, sph(s * 0.2, 10, 8), C.snail, s * 0.62, s * 0.3, 0).scale.set(1, 1.15, 0.9);
  [-1, 1].forEach(sz => {
    stick(g, [s * 0.66, s * 0.42, sz * s * 0.06], [s * 0.78, s * 0.7, sz * s * 0.12], s * 0.025, C.snail);
    part(g, sph(s * 0.05, 6, 5), C.ink, s * 0.78, s * 0.72, sz * s * 0.12);
  });
  const sh = part(g, sph(s * 0.38, 16, 12), shell, -s * 0.08, s * 0.52, 0); sh.scale.set(1, 1, 0.72);
  const pts = [];
  for (let i = 0; i <= 48; i++) { const t = i / 48, a = t * TAU * 2.2, r = s * (0.3 - 0.27 * t); pts.push([-s * 0.08 + Math.cos(a) * r, s * 0.52 + Math.sin(a) * r, s * 0.28]); }
  part(g, tube(pts, s * 0.03, 60, 4), shellDk);
  part(g, sph(s * 0.07, 8, 6), C.pink, s * 0.7, s * 0.26, s * 0.14).scale.z = 0.4;
  return g;
}

function mushroom(p, x, z, s, cap, ry = 0) {
  part(p, cyl(s * 0.18, s * 0.22, s * 0.6, 8), C.cream, x, s * 0.3, z);
  const c = part(p, sph(s * 0.45, 12, 8, 0, TAU, 0, Math.PI / 2), cap, x, s * 0.55, z); c.scale.y = 0.75; c.rotation.y = ry;
  [[0.2, 0.1], [-0.15, 0.2]].forEach(([u, v]) => part(p, sph(s * 0.07, 6, 5), C.cream, x + u * s, s * 0.82, z + v * s));
}

function curtainStrands(s, x0, x1, n, top, z, lens) {
  for (let i = 0; i < n; i++) {
    const x = x0 + (x1 - x0) * i / (n - 1), k = lens[i % lens.length];
    bead(s, x, top, z, k, 0.14, 0.052, i % 2 ? [C.blueLt, C.blue] : [C.blue, C.blueLt]);
  }
}

const BUILD = {
  rn_rain_planter: {
    A(s) {
      part(s, lathe([[0, 0], [0.2, 0], [0.24, 0.04], [0.27, 0.3], [0.3, 0.33], [0.29, 0.36], [0.26, 0.34], [0, 0.3]], 22), C.blue);
      part(s, torus(0.25, 0.018, 5, 22), C.blueDk, 0, 0.16, 0).rotation.x = Math.PI / 2;
      part(s, cyl(0.26, 0.26, 0.02, 20), C.woodDk, 0, 0.32, 0);
      [[0, 0.34, 0.72, 0.17], [2.2, 0.26, 0.62, 0.15], [4.2, 0.3, 0.5, 0.15]].forEach(([a, tilt, hh, ls], i) => {
        const x = Math.sin(a) * 0.07, z = Math.cos(a) * 0.07;
        stick(s, [x, 0.3, z], [x + Math.sin(a) * 0.12, 0.3 + hh, z + Math.cos(a) * 0.12], 0.014, C.frogDk);
        const { h } = taroLeaf(s, ls, i === 1 ? C.leaf : C.frog, C.frogDk, x + Math.sin(a) * 0.12, 0.3 + hh - ls * 0.5, z + Math.cos(a) * 0.12, a, tilt);
        drop(h, 0.035, C.blue, 0, ls * 0.62, 0).scale.set(1, 0.8, 1);
      });
      puddle(s, 0.16, 0.3, 0.26);
      return { k: 1.4 };
    },
    B(s) {
      part(s, lathe([[0, 0], [0.18, 0], [0.2, 0.02], [0.25, 0.36], [0.27, 0.38], [0.26, 0.4], [0.23, 0.38], [0.18, 0.04], [0, 0.04]], 22), C.yellow);
      [0.12, 0.26].forEach(y => part(s, torus(0.2 + y * 0.18, 0.01, 4, 22), C.yellowDk, 0, y, 0).rotation.x = Math.PI / 2);
      part(s, cyl(0.24, 0.24, 0.01, 22), C.water, 0, 0.34, 0);
      const hd = part(s, torus(0.26, 0.01, 4, 22, Math.PI), C.greyDk, 0, 0.4, 0); hd.rotation.y = Math.PI / 2; hd.rotation.x = -0.35;
      part(s, cyl(0.08, 0.08, 0.008, 14, 1, false, 0.3, TAU - 0.6), C.frog, -0.08, 0.35, 0.08).rotation.y = 0.4;
      tulip(s, 0.05, 0.34, -0.04, 0.3, C.pink, C.pinkDk);
      tulip(s, 0.12, 0.34, 0.06, 0.22, C.pink, C.pinkDk);
      drop(s, 0.03, C.blue, -0.26, 0.42, 0.04);
      puddle(s, 0.14, -0.26, 0.24);
      return { k: 1.5 };
    },
    C(s) {
      part(s, cyl(0.28, 0.25, 0.46, 18, 1, true), C.wood, 0, 0.23, 0);
      part(s, cyl(0.25, 0.25, 0.02, 18), C.woodDk, 0, 0.01, 0);
      [0.08, 0.38].forEach(y => part(s, torus(0.27 - (y - 0.23) * 0.06, 0.016, 5, 22), C.greyDk, 0, y, 0).rotation.x = Math.PI / 2);
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; part(s, box(0.006, 0.46, 0.02), C.woodDk, Math.cos(a) * 0.268, 0.23, Math.sin(a) * 0.268).rotation.y = -a; }
      part(s, cyl(0.25, 0.25, 0.01, 22), C.water, 0, 0.43, 0);
      [[0.08, -0.06, 0.18], [0.12, -0.01, 0.24], [0.04, -0.12, 0.14]].forEach(([x, z, hh]) => stick(s, [x, 0.42, z], [x + 0.02, 0.42 + hh, z - 0.02], 0.008, C.frogDk));
      part(s, cyl(0.07, 0.07, 0.008, 14, 1, false, 0.3, TAU - 0.6), C.frog, -0.1, 0.44, 0.06).rotation.y = 1.2;
      frog(s, 0.075, 0.05, 0.43, 0.22, 0.2);
      puddle(s, 0.15, 0.32, 0.22);
      return { k: 1.4 };
    },
  },
  rn_umbrella_stand: {
    A(s) {
      part(s, lathe([[0, 0], [0.15, 0], [0.16, 0.02], [0.15, 0.48], [0.17, 0.5], [0.165, 0.53], [0.135, 0.51], [0.135, 0.04], [0, 0.04]], 20), C.blue);
      [0.14, 0.38].forEach(y => part(s, torus(0.153, 0.008, 4, 20), C.blueDk, 0, y, 0).rotation.x = Math.PI / 2);
      drop(s, 0.035, C.blueLt, 0, 0.26, 0.153).scale.z = 0.3;
      umbrella(s, -0.04, 0.02, 0.92, C.yellow, C.yellowDk, 0.05, 0.12);
      umbrella(s, 0.05, -0.02, 0.84, C.frog, C.frogDk, -0.06, -0.16, C.woodDk);
      return { k: 1 };
    },
    B(s) {
      part(s, box(0.42, 0.05, 0.26), C.yellowDk, 0.06, 0.025, 0);
      part(s, cyl(0.12, 0.13, 0.5, 18), C.yellow, -0.02, 0.29, 0);
      part(s, sph(0.13, 16, 10), C.yellow, 0.09, 0.1, 0).scale.set(1.5, 0.78, 0.98);
      part(s, torus(0.12, 0.018, 5, 20), C.yellowDk, -0.02, 0.54, 0).rotation.x = Math.PI / 2;
      part(s, torus(0.13, 0.012, 4, 20), C.blue, -0.02, 0.4, 0).rotation.x = Math.PI / 2;
      umbrella(s, -0.03, 0, 0.9, C.blue, C.blueDk, 0.04, 0.1);
      return { k: 1 };
    },
    C(s) {
      part(s, box(0.62, 0.04, 0.36), C.blue, 0, 0.02, 0);
      part(s, box(0.56, 0.02, 0.3), C.blueLt, 0, 0.045, 0);
      [[-0.28, -0.15], [0.28, -0.15], [-0.28, 0.15], [0.28, 0.15]].forEach(([x, z]) => part(s, box(0.04, 0.56, 0.04), C.wood, x, 0.3, z));
      [0.32, 0.56].forEach(y => { part(s, box(0.6, 0.04, 0.04), C.woodDk, 0, y, -0.15); part(s, box(0.6, 0.04, 0.04), C.woodDk, 0, y, 0.15); part(s, box(0.04, 0.04, 0.34), C.woodDk, -0.28, y, 0); part(s, box(0.04, 0.04, 0.34), C.woodDk, 0.28, y, 0); });
      part(s, box(0.04, 0.04, 0.3), C.woodDk, -0.09, 0.56, 0);
      part(s, box(0.04, 0.04, 0.3), C.woodDk, 0.09, 0.56, 0);
      umbrella(s, -0.18, 0, 0.88, C.yellow, C.yellowDk, 0, 0.08);
      umbrella(s, 0, 0, 0.94, C.blue, C.blueDk, 0, -0.04, C.woodDk);
      umbrella(s, 0.18, 0, 0.84, C.frog, C.frogDk, 0, -0.1);
      return { k: 1 };
    },
  },
  rn_rain_curtain: {
    A(s) {
      [-0.6, 0.6].forEach(x => { part(s, box(0.06, 1.5, 0.06), C.wood, x, 0.75, 0); part(s, box(0.22, 0.04, 0.24), C.woodDk, x, 0.02, 0); });
      part(s, box(1.32, 0.06, 0.07), C.woodDk, 0, 1.52, 0);
      curtainStrands(s, -0.48, 0.48, 7, 1.49, 0.01, [5, 4, 3, 4, 3, 4, 5]);
      cloud(s, 0.36, C.cream, 0, 1.6, 0.04);
      return { k: 1 };
    },
    B(s) {
      part(s, cyl(0.2, 0.22, 0.04, 20), C.woodDk, 0, 0.02, 0);
      part(s, cyl(0.025, 0.03, 1.5, 8), C.wood, -0.18, 0.77, 0);
      part(s, tube([[-0.18, 1.5, 0], [-0.14, 1.62, 0], [0.04, 1.68, 0], [0.18, 1.62, 0], [0.22, 1.55, 0]], 0.022, 30, 6), C.wood);
      stick(s, [0.22, 1.55, 0], [0.22, 1.42, 0], 0.004, C.greyDk);
      cloud(s, 0.4, C.cream, 0.22, 1.34, 0);
      [[-0.12, 3], [0.02, 2], [0.16, 3], [0.3, 2], [0.44, 3]].forEach(([dx, n], i) => bead(s, 0.22 + dx * 0.66 - 0.04, 1.24, 0, n, 0.13, 0.055, i % 2 ? [C.blue, C.blueLt] : [C.blueLt, C.blue]));
      return { k: 1 };
    },
    C(s) {
      part(s, box(1.0, 0.36, 0.3), C.wood, 0, 0.18, 0);
      part(s, box(1.02, 0.03, 0.32), C.woodDk, 0, 0.375, 0);
      const fw = 0.92, fh = 1.0, y0 = 0.4;
      part(s, box(fw - 0.1, fh - 0.1, 0.02), C.blueLt, 0, y0 + fh / 2, -0.08);
      [[0, y0 + 0.03, fw, 0.06], [0, y0 + fh - 0.03, fw, 0.06], [0, y0 + fh / 2, 0.04, fh]].forEach(([x, y, w, h]) => part(s, box(w, h, 0.06), C.cream, x, y, -0.06));
      [-1, 1].forEach(sx => part(s, box(0.06, fh, 0.06), C.cream, sx * (fw / 2 - 0.03), y0 + fh / 2, -0.06));
      cloud(s, 0.16, C.cream, -0.2, y0 + fh * 0.72, -0.065).scale.z = 0.2;
      part(s, box(fw + 0.08, 0.05, 0.08), C.woodDk, 0, y0 + fh + 0.04, 0.01);
      curtainStrands(s, -0.36, 0.36, 5, y0 + fh + 0.01, 0.03, [5, 4, 3, 4, 5]);
      [-1, 1].forEach(sx => part(s, torus(0.04, 0.012, 4, 12), C.yellow, sx * 0.4, y0 + 0.5, 0.03).rotation.y = Math.PI / 2);
      return { k: 1 };
    },
  },
  rn_snail_garden: {
    A(s) {
      part(s, sph(0.24, 14, 10), C.stone, 0, 0.1, 0).scale.set(1.3, 0.6, 1.0);
      part(s, sph(0.235, 14, 8, 0, TAU, 0, Math.PI * 0.38), C.moss, 0, 0.11, 0).scale.set(1.31, 0.62, 1.01);
      snail(s, 0.3, -0.04, 0.2, 0.02, 0.3);
      mushroom(s, 0.3, -0.12, 0.14, C.pink, 0.4);
      mushroom(s, 0.38, 0.0, 0.1, C.yellow, 1.1);
      puddle(s, 0.14, -0.32, 0.24);
      [[-0.3, -0.18], [0.26, 0.22]].forEach(([x, z]) => part(s, sph(0.05, 8, 6), C.leaf, x, 0.03, z).scale.set(1, 0.4, 1.6));
      return { k: 1.6 };
    },
    B(s) {
      const sh = new THREE.Shape();
      sh.moveTo(-0.45, 0); sh.bezierCurveTo(-0.3, 0.3, 0.25, 0.32, 0.45, 0); sh.bezierCurveTo(0.25, -0.32, -0.3, -0.3, -0.45, 0);
      part(s, new THREE.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: false, curveSegments: 14 }), C.leaf, 0, 0.03, 0).rotation.x = -Math.PI / 2;
      part(s, box(0.86, 0.008, 0.012), C.frogDk, -0.02, 0.052, 0);
      [-0.24, -0.04, 0.16].forEach(x => [-1, 1].forEach(sz => { part(s, box(0.16, 0.006, 0.01), C.frogDk, x + 0.05, 0.052, sz * 0.05).rotation.y = sz * 0.6; }));
      stick(s, [-0.45, 0.03, 0], [-0.56, 0.02, 0.05], 0.012, C.frogDk);
      snail(s, 0.24, -0.16, 0.05, 0.06, 0.2);
      snail(s, 0.18, 0.2, 0.05, -0.08, Math.PI + 0.5, C.pink, C.pinkDk);
      [[0.04, 0.12], [0.3, 0.08], [-0.3, -0.12]].forEach(([x, z]) => drop(s, 0.025, C.blueLt, x, 0.075, z).scale.y = 0.7);
      return { k: 1.5 };
    },
    C(s) {
      part(s, cyl(0.12, 0.17, 0.24, 18), C.blue, 0, 0.12, 0);
      part(s, cyl(0.125, 0.125, 0.04, 18), C.blueDk, 0, 0.22, 0);
      snail(s, 0.24, 0, 0.24, 0, -0.4);
      [[0.24, 0.12], [0.3, 0.02]].forEach(([x, z], i) => {
        stick(s, [x, 0, z], [x, 0.1 + i * 0.03, z], 0.008, C.frogDk);
        [-1, 1].forEach(sx => { const l = part(s, sph(0.03, 8, 6), C.leaf, x + sx * 0.025, 0.1 + i * 0.03, z); l.scale.set(1.2, 0.35, 0.8); l.rotation.z = sx * 0.4; });
      });
      [[-0.24, 0.16], [-0.3, -0.02], [-0.2, -0.16]].forEach(([x, z], i) => part(s, sph(0.06, 8, 6), i % 2 ? C.stone : C.stoneDk, x, 0.02, z).scale.set(1.2, 0.4, 1));
      puddle(s, 0.13, 0.12, 0.26);
      return { k: 1.6 };
    },
  },
};

export function build(id, v) {
  const fn = BUILD[id]?.[v];
  if (!fn) throw new Error(`unknown rain pick decor: ${id}/${v}`);
  const solid = new THREE.Group();
  const { k = 1, flat = true, rough = 0.9 } = fn(solid);
  const out = new THREE.Group();
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: flat, roughness: rough, metalness: 0, side: THREE.DoubleSide }));
  body.castShadow = true; body.receiveShadow = true;
  out.add(body);
  out.scale.setScalar(k);
  return out;
}
