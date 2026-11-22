import * as THREE from 'three';
import { bakeGroup, part } from '../../js/dream/art.js';

export const IDS = ['tc_tea_table', 'tc_floor_cushion', 'tc_teaware_shelf', 'tc_bamboo_basin'];
export const VARIANTS = ['A', 'B', 'C'];
export const REC = { tc_tea_table: 'C', tc_floor_cushion: 'A', tc_teaware_shelf: 'A', tc_bamboo_basin: 'A' };

export const C = {
  matcha: 0x8fb45a, matchaDk: 0x67904a, celadon: 0x9cc6b2, celadonDk: 0x74a390,
  cream: 0xe2d4b6, creamDk: 0xcab994, wood: 0xc2905c, woodDk: 0x8e6440, walnut: 0x6e4c34,
  persimmon: 0xe57c48, persimDk: 0xc45f36, stone: 0xaaa699, stoneDk: 0x7b786e, stoneLt: 0xb4b0a4,
  moss: 0x7ea35a, water: 0x8cc4d0, stream: 0xa8d4de, bamboo: 0xa2bf66, bambooDk: 0x7a9a48,
};

export const META = {
  tc_tea_table: {
    A: { name: '나무 찻상 한 벌', note: '낮은 나무 찻상 · 크림 상보 · 청자 주전자와 찻잔 둘', foot: [1.0, 0.7] },
    B: { name: '둥근 말차 상', note: '둥근 호두나무 상 · 말차 사발과 차선 · 감 둘', foot: [0.9, 0.9] },
    C: { name: '개다리 소반', note: '굽은 다리 열두 모 소반 · 크림 주전자 · 찻잔 둘 · 감 하나', foot: [0.9, 0.9] },
  },
  tc_floor_cushion: {
    A: { name: '말차 네모 방석', note: '도톰한 말차 방석 · 크림 테두리 · 가운데 감빛 매듭', foot: null },
    B: { name: '청자 둥근 방석', note: '둥근 청자 방석 · 크림 띠 · 감빛 단추와 술', foot: null },
    C: { name: '방석 두 장', note: '말차와 크림 방석 둘을 나란히 · 모서리 감빛 술', foot: null },
  },
  tc_teaware_shelf: {
    A: { name: '열린 다기 선반', note: '나무 세 칸 선반 · 주전자·찻잔·차통 · 감 한 접시', foot: [1.1, 0.4] },
    B: { name: '미닫이 다기장', note: '아래 크림 창호 미닫이 · 위 열린 칸에 다기', foot: [1.1, 0.4] },
    C: { name: '엇갈린 선반', note: '높이가 엇갈린 두 판 · 주전자와 차통 · 아래 작은 장', foot: [1.1, 0.4] },
  },
  tc_bamboo_basin: {
    A: { name: '둥근 돌확', note: '둥근 돌 물확 · 대나무 대롱에서 떨어지는 물줄기 · 물바가지 · 이끼', foot: [1.2, 0.9] },
    B: { name: '네모 돌 물통', note: '긴 네모 돌 물통 · 대롱 물줄기 · 고사리 둘 · 자갈', foot: [1.3, 0.8] },
    C: { name: '대나무 물레 연못', note: '돌 두른 작은 연못 · 기울어진 대나무 통 · 대롱 물줄기', foot: [1.3, 1.0] },
  },
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

function fern(p, x, z, s, rot = 0) {
  const g = grp(p, x, 0, z); g.rotation.y = rot;
  for (let i = 0; i < 5; i++) {
    const f = grp(g); f.rotation.y = i / 5 * TAU;
    part(f, tube([[0, 0, 0], [s * 0.15, s * 0.3, 0], [s * 0.38, s * 0.42, 0], [s * 0.55, s * 0.36, 0]], s * 0.035, 16, 6), C.matchaDk);
    for (let j = 1; j <= 3; j++) {
      const l = part(f, sph(s * 0.07, 10, 8), i % 2 ? C.moss : C.matcha, s * (0.12 + j * 0.12), s * (0.22 + 0.12 * Math.sin(j)), 0);
      l.scale.set(1.4, 0.3, 0.8);
    }
  }
  return g;
}

function cushionSq(p, x, z, s, top, edge, knot, rot = 0) {
  const g = grp(p, x, 0, z); g.rotation.y = rot;
  roundSlab(g, s, s, 0.12, 0.1, top, 0);
  roundSlab(g, s * 1.02, s * 1.02, 0.018, 0.1, edge, 0.052);
  part(g, sph(0.035), knot, 0, 0.125, 0).scale.y = 0.6;
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([a, b]) => part(g, sph(0.012), C.creamDk, a * s * 0.18, 0.121, b * s * 0.18).scale.y = 0.4);
  return g;
}

function tassel(p, x, y, z, s = 0.04, rot = 0) {
  const g = grp(p, x, y, z); g.rotation.y = rot;
  part(g, sph(s * 0.45), C.persimmon, 0, 0, 0);
  part(g, cyl(s * 0.28, s * 0.5, s * 1.3, 12), C.persimDk, 0, -s * 0.9, 0);
  return g;
}

function shelfFrame(s, w, d, h, boards) {
  [-1, 1].forEach(sx => part(s, box(0.06, h, d), C.wood, sx * (w / 2 - 0.03), h / 2, 0));
  part(s, box(w, h, 0.02), C.creamDk, 0, h / 2, -d / 2 + 0.01);
  boards.forEach(y => part(s, box(w - 0.06, 0.04, d), C.wood, 0, y, 0));
  part(s, box(w + 0.06, 0.05, d + 0.04), C.woodDk, 0, h + 0.025, 0);
  part(s, box(w, 0.06, d), C.woodDk, 0, 0.03, 0);
}

function basinStones(s, list) {
  list.forEach(([x, z, r, c]) => pebble(s, x, z, r, c ?? C.stoneLt));
}

function kakei(s, px, pz, ph, tipX, tipZ, tipY) {
  bambooRod(s, [px, 0, pz], [px, ph, pz], 0.045, 3);
  part(s, sph(0.046, 16, 8, 0, TAU, 0, Math.PI / 2), C.bambooDk, px, ph, pz).scale.y = 0.3;
  bambooRod(s, [px, ph - 0.06, pz], [tipX, tipY, tipZ], 0.028, 2);
}

const BUILD = {
  tc_tea_table: {
    A(s) {
      roundSlab(s, 1.0, 0.66, 0.06, 0.06, C.wood, 0.26);
      roundSlab(s, 0.92, 0.58, 0.04, 0.05, C.woodDk, 0.24);
      [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([a, b]) => part(s, box(0.08, 0.26, 0.08), C.woodDk, a * 0.4, 0.13, b * 0.23));
      part(s, box(0.36, 0.006, 0.68), C.cream, -0.06, 0.323, 0);
      [-1, 1].forEach(b => part(s, box(0.36, 0.008, 0.04), C.matcha, -0.06, 0.325, b * 0.3));
      teapot(s, -0.06, 0.326, -0.04, 0.14, C.celadon, C.celadon, C.persimmon, 0.5);
      cup(s, 0.27, 0.32, 0.12, 0.078);
      cup(s, 0.3, 0.32, -0.14, 0.078);
      return { flat: false };
    },
    B(s) {
      part(s, cyl(0.46, 0.46, 0.06, 40), C.walnut, 0, 0.29, 0);
      part(s, torus(0.46, 0.022, 8, 48), C.woodDk, 0, 0.29, 0).rotation.x = Math.PI / 2;
      [0, 1, 2].forEach(i => { const a = i / 3 * TAU + 0.5; part(s, cyl(0.045, 0.055, 0.27, 14), C.woodDk, Math.cos(a) * 0.3, 0.135, Math.sin(a) * 0.3); });
      const bowl = grp(s, -0.06, 0.32, 0.02);
      part(bowl, lathe([[0, 0], [0.06, 0], [0.07, 0.02], [0.13, 0.05], [0.15, 0.12], [0.14, 0.12], [0.12, 0.06], [0, 0.04]], 28), C.celadonDk);
      part(bowl, cyl(0.135, 0.135, 0.004, 28), C.matcha, 0, 0.1, 0);
      const w = grp(s, 0.2, 0.32, -0.12);
      part(w, cyl(0.035, 0.035, 0.06, 16), C.bambooDk, 0, 0.03, 0);
      part(w, lathe([[0.03, 0.06], [0.05, 0.08], [0.055, 0.12], [0.04, 0.15], [0.015, 0.16]], 18), C.cream);
      plate(s, 0.16, 0.32, 0.2, 0.12);
      persimmon(s, 0.12, 0.335, 0.2, 0.048);
      persimmon(s, 0.21, 0.335, 0.18, 0.042);
      return { flat: false };
    },
    C(s) {
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
      return { flat: false };
    },
  },
  tc_floor_cushion: {
    A(s) {
      cushionSq(s, 0, 0, 0.66, C.matcha, C.cream, C.persimmon);
      return { flat: false };
    },
    B(s) {
      part(s, sph(0.35, 48, 24), C.celadon, 0, 0.075, 0).scale.y = 0.24;
      part(s, torus(0.335, 0.02, 8, 56), C.cream, 0, 0.075, 0).rotation.x = Math.PI / 2;
      part(s, sph(0.035), C.persimmon, 0, 0.158, 0).scale.y = 0.6;
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; part(s, sph(0.01), C.celadonDk, Math.cos(a) * 0.17, 0.148, Math.sin(a) * 0.17).scale.y = 0.4; }
      tassel(s, 0.34, 0.075, 0.1, 0.045);
      return { flat: false };
    },
    C(s) {
      cushionSq(s, -0.34, 0.02, 0.58, C.matcha, C.cream, C.persimmon, 0.08);
      cushionSq(s, 0.34, -0.02, 0.58, C.cream, C.matcha, C.persimmon, -0.08);
      tassel(s, -0.6, 0.06, 0.28, 0.035, 0.1);
      tassel(s, 0.6, 0.06, -0.28, 0.035, -0.1);
      return { flat: false };
    },
  },
  tc_teaware_shelf: {
    A(s) {
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
      return { flat: false };
    },
    B(s) {
      const w = 1.0, d = 0.32, h = 1.18;
      shelfFrame(s, w, d, h, [0.56]);
      [-1, 1].forEach(sx => {
        part(s, box(0.44, 0.44, 0.02), C.cream, sx * 0.22, 0.31, d / 2 - 0.01);
        part(s, box(0.46, 0.03, 0.03), C.woodDk, sx * 0.22, 0.31 + 0.22, d / 2);
        part(s, box(0.46, 0.03, 0.03), C.woodDk, sx * 0.22, 0.31 - 0.22, d / 2);
        [-0.21, 0.21].forEach(xx => part(s, box(0.03, 0.44, 0.03), C.woodDk, sx * 0.22 + xx, 0.31, d / 2));
        [0.17, 0.31, 0.45].forEach(y => part(s, box(0.42, 0.012, 0.025), C.woodDk, sx * 0.22, y, d / 2));
        [-0.07, 0.07].forEach(xx => part(s, box(0.012, 0.42, 0.025), C.woodDk, sx * 0.22 + xx, 0.31, d / 2));
        part(s, cyl(0.02, 0.02, 0.012, 14), C.persimmon, sx * 0.04, 0.31, d / 2 + 0.012).rotation.x = Math.PI / 2;
      });
      teapot(s, -0.22, 0.58, 0, 0.11, C.celadon, C.celadon, C.persimmon, 0.4);
      cup(s, 0.08, 0.58, 0.04, 0.05); cup(s, 0.2, 0.58, -0.04, 0.05, C.cream);
      caddy(s, 0.36, 0.58, 0, 0.06, 0.16, C.matcha, C.woodDk);
      caddy(s, -0.32, h + 0.05, 0, 0.06, 0.14, C.cream, C.matchaDk);
      plate(s, 0.2, h + 0.05, 0, 0.12);
      persimmon(s, 0.2, h + 0.065, 0.0, 0.05);
      return { flat: false };
    },
    C(s) {
      const w = 1.0, d = 0.32, h = 1.2;
      [-1, 1].forEach(sx => part(s, box(0.06, h, d), C.wood, sx * (w / 2 - 0.03), h / 2, 0));
      part(s, box(w, h, 0.02), C.creamDk, 0, h / 2, -d / 2 + 0.01);
      part(s, box(w + 0.06, 0.05, d + 0.04), C.woodDk, 0, h + 0.025, 0);
      part(s, box(w, 0.36, d), C.wood, 0, 0.18, 0);
      [-1, 1].forEach(sx => {
        part(s, box(0.44, 0.28, 0.01), C.woodDk, sx * 0.235, 0.19, d / 2 + 0.002);
        part(s, box(0.4, 0.24, 0.012), C.wood, sx * 0.235, 0.19, d / 2 + 0.006);
        part(s, sph(0.018), C.persimmon, sx * 0.05, 0.19, d / 2 + 0.014);
      });
      part(s, box(0.52, 0.04, d), C.walnut, -0.21, 0.66, 0);
      part(s, box(0.52, 0.04, d), C.walnut, 0.21, 0.84, 0);
      part(s, box(0.04, 0.18, d), C.walnut, 0.0, 0.75, 0);
      teapot(s, -0.24, 0.68, 0, 0.1, C.celadon, C.celadon, C.persimmon, 0.4);
      cup(s, -0.09, 0.38, 0.04, 0.05);
      cup(s, 0.1, 0.86, 0.02, 0.05, C.cream); cup(s, 0.24, 0.86, -0.02, 0.05);
      caddy(s, 0.38, 0.86, 0, 0.06, 0.16, C.matcha, C.woodDk);
      caddy(s, 0.3, 0.38, 0, 0.07, 0.2, C.cream, C.matchaDk);
      persimmon(s, -0.28, 0.38, 0.02, 0.055);
      return { flat: false };
    },
  },
  tc_bamboo_basin: {
    A(s) {
      const bx = 0.1, bz = 0.08;
      part(s, lathe([[0, 0], [0.2, 0], [0.3, 0.06], [0.34, 0.18], [0.33, 0.3], [0.3, 0.34], [0.26, 0.34], [0.25, 0.3], [0, 0.26]], 36), C.stone, bx, 0, bz);
      part(s, cyl(0.255, 0.255, 0.01, 36), C.water, bx, 0.305, bz);
      stream(s, bx - 0.08, 0.62, 0.31, bz - 0.04);
      kakei(s, -0.42, -0.24, 0.8, bx - 0.08, bz - 0.04, 0.63);
      basinStones(s, [[-0.32, 0.22, 0.1], [0.46, -0.08, 0.12, C.stone], [0.42, 0.3, 0.07], [-0.12, 0.42, 0.06, C.stoneDk], [-0.48, -0.02, 0.08]]);
      part(s, cyl(0.5, 0.52, 0.02, 40), C.moss, 0.02, 0.01, 0.06).scale.z = 0.8;
      const lad = grp(s, bx + 0.1, 0.35, bz + 0.05); lad.rotation.set(0, 0.6, -0.08);
      part(lad, cyl(0.012, 0.012, 0.46, 10), C.wood, 0, 0, 0).rotation.z = Math.PI / 2;
      part(lad, cyl(0.04, 0.035, 0.06, 18), C.bamboo, -0.24, -0.01, 0);
      return { flat: false };
    },
    B(s) {
      roundSlab(s, 0.7, 0.38, 0.3, 0.06, C.stone, 0);
      roundSlab(s, 0.58, 0.26, 0.012, 0.04, C.water, 0.296);
      part(s, box(0.72, 0.02, 0.4), C.stoneDk, 0, 0.01, 0);
      stream(s, -0.18, 0.6, 0.29, 0.0);
      kakei(s, -0.5, -0.24, 0.76, -0.18, 0.0, 0.61);
      fern(s, 0.44, -0.18, 0.4, 0.3);
      fern(s, -0.5, 0.2, 0.32, 1.2);
      basinStones(s, [[0.2, 0.3, 0.06], [0.32, 0.26, 0.05, C.stone], [-0.1, 0.3, 0.05], [0.5, 0.12, 0.06, C.stoneDk], [-0.3, 0.3, 0.045]]);
      return { flat: false };
    },
    C(s) {
      part(s, cyl(0.36, 0.36, 0.03, 40), C.water, 0.06, 0.05, 0.08);
      for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; pebble(s, 0.06 + Math.cos(a) * 0.4, 0.08 + Math.sin(a) * 0.4, 0.07 + (i % 3) * 0.015, i % 2 ? C.stone : C.stoneLt, 0.8); }
      [-1, 1].forEach(sz => rod(s, [-0.12, 0, -0.12 + sz * 0.08], [-0.12, 0.34, -0.12 + sz * 0.08], 0.025, C.wood));
      rod(s, [-0.12, 0.3, -0.22], [-0.12, 0.3, -0.02], 0.012, C.woodDk);
      const piv = grp(s, -0.12, 0.3, -0.12); piv.rotation.z = -0.35;
      bambooRod(piv, [-0.34, 0, 0], [0.32, 0, 0], 0.045, 1);
      part(piv, torus(0.045, 0.008, 6, 18), C.bambooDk, 0.32, 0, 0).rotation.y = Math.PI / 2;
      part(s, sph(0.05, 18, 12), C.stoneDk, -0.42, 0.05, -0.12).scale.y = 0.6;
      stream(s, 0.18, 0.62, 0.22, -0.12, 0.018);
      kakei(s, 0.5, -0.32, 0.78, 0.18, -0.12, 0.63);
      fern(s, -0.42, 0.34, 0.3, 0.5);
      return { flat: false };
    },
  },
};

export function build(id, v) {
  const fn = BUILD[id]?.[v];
  if (!fn) throw new Error(`unknown tea pick decor: ${id}/${v}`);
  const solid = new THREE.Group();
  const { k = 1, flat = true, rough = 0.9 } = fn(solid) || {};
  const out = new THREE.Group();
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: flat, roughness: rough, metalness: 0, side: THREE.DoubleSide }));
  body.castShadow = true; body.receiveShadow = true;
  out.add(body);
  out.scale.setScalar(k);
  return out;
}
