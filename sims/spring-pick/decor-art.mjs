import * as THREE from 'three';
import { bakeGroup, part } from '../../js/dream/art.js';

export const IDS = ['sb_blossom_pot', 'sb_picnic_mat', 'sb_petal_swing', 'sb_blossom_arch'];
export const VARIANTS = ['A', 'B', 'C'];

export const C = {
  sakura: 0xf592b6, sakuraDk: 0xe0739c, sakuraLt: 0xf9bad2, rose: 0xc95a7a,
  cream: 0xe6d6ba, creamDk: 0xcdb894, leaf: 0x8cc06a, leafDk: 0x689e50,
  wood: 0xc99a64, woodDk: 0x9c7046, bark: 0x7a5a44, barkDk: 0x5e4434,
  soil: 0x6b5240, rope: 0xd8c49a, butter: 0xeac25a, stone: 0x9a948a,
};

export const META = {
  sb_blossom_pot: {
    A: { name: '크림 화분 벚나무', note: '둥근 크림 화분 · 굽은 줄기 · 분홍 꽃송이 셋', foot: [0.7, 0.7] },
    B: { name: '나무 상자 분재', note: '나무 화분 상자 · 비스듬한 줄기 · 납작한 꽃구름 셋', foot: [0.8, 0.55] },
    C: { name: '분홍 꽃병 가지', note: '길쭉한 분홍 꽃병 · 벚꽃 가지 셋', foot: [0.5, 0.5] },
  },
  sb_picnic_mat: {
    A: { name: '체크 돗자리', note: '분홍·크림 체크 · 연두 테두리', foot: null },
    B: { name: '벚꽃 모양 돗자리', note: '다섯 잎 벚꽃 모양 · 연분홍 안쪽 · 진분홍 가운데', foot: null },
    C: { name: '체크 돗자리 한 상', note: '체크 돗자리 · 구석에 작은 바구니 · 찻잔 둘', foot: null },
  },
  sb_petal_swing: {
    A: { name: '나무 그네', note: '나무 A자 틀 · 위 가로대에 꽃 덩굴 · 분홍 자리', foot: [2.0, 0.9], posts: [[-0.85, -0.38, 0.1], [-0.85, 0.38, 0.1], [0.85, -0.38, 0.1], [0.85, 0.38, 0.1]] },
    B: { name: '벚나무 가지 그네', note: '벚나무 가지에 매단 크림 자리 그네', foot: [1.9, 1.3], posts: [[-0.6, 0, 0.2]] },
    C: { name: '꽃 아치 그네', note: '둥근 꽃 아치 아래 매단 분홍 자리', foot: [1.8, 0.7], posts: [[-0.8, 0, 0.12], [0.8, 0, 0.12]] },
  },
  sb_blossom_arch: {
    A: { name: '꽃구름 아치', note: '나무 기둥 · 반원 위로 분홍 꽃송이를 촘촘히', foot: [2.0, 0.4], posts: [[-0.9, 0, 0.15], [0.9, 0, 0.15]] },
    B: { name: '나무 문 꽃 줄', note: '밝은 나무 문 · 가로대 아래 처진 벚꽃 줄', foot: [2.0, 0.4], posts: [[-0.9, 0, 0.12], [0.9, 0, 0.12]] },
    C: { name: '두 벚나무 아치', note: '양쪽 벚나무 둘이 휘어 위에서 만남', foot: [2.0, 0.6], posts: [[-0.9, 0, 0.16], [0.9, 0, 0.16]] },
  },
};

export const REC = { sb_blossom_pot: 'A', sb_picnic_mat: 'A', sb_petal_swing: 'A', sb_blossom_arch: 'A' };

const TAU = Math.PI * 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sph = (r, w = 12, h = 9, ...rest) => new THREE.SphereGeometry(r, w, h, ...rest);
const ico = (r, d = 1) => new THREE.IcosahedronGeometry(r, d);
const cyl = (a, b, h, s = 12, ...rest) => new THREE.CylinderGeometry(a, b, h, s, ...rest);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const torus = (r, t, rs = 6, ts = 18, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc);
const lathe = (pr, seg = 20) => new THREE.LatheGeometry(pr.map(([x, y]) => new THREE.Vector2(x, y)), seg);
const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
const tube = (pts, r, seg = 30, rad = 6) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V(...p))), seg, r, rad, false);
const PINKS = [C.sakura, C.sakuraLt, C.sakura, C.sakuraDk];

function rod(p, a, b, r, col, seg = 6, r2 = r) {
  const A = V(...a), B = V(...b), d = B.clone().sub(A);
  const m = part(p, cyl(r2, r, d.length(), seg), col, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  return m;
}

function petalShape(s) {
  const sh = new THREE.Shape();
  sh.moveTo(0, 0);
  sh.bezierCurveTo(s * 0.44, s * 0.16, s * 0.46, s * 0.84, s * 0.18, s);
  sh.lineTo(0, s * 0.86);
  sh.lineTo(-s * 0.18, s);
  sh.bezierCurveTo(-s * 0.46, s * 0.84, -s * 0.44, s * 0.16, 0, 0);
  return sh;
}

function flatPetal(p, s, depth, col, x, y, z, rot) {
  const geo = new THREE.ExtrudeGeometry(petalShape(s), { depth, bevelEnabled: false, curveSegments: 8 });
  geo.rotateX(-Math.PI / 2);
  const m = part(p, geo, col, x, y, z); m.rotation.y = rot;
  return m;
}

function flatBlossom(p, s, depth, col, x, y, z, rot = 0, center = C.rose) {
  for (let i = 0; i < 5; i++) flatPetal(p, s, depth, col, x, y, z, rot + i / 5 * TAU);
  part(p, cyl(s * 0.18, s * 0.18, depth * 1.4, 12), center, x, y + depth * 0.7, z);
}

function clump(p, x, y, z, r, n = 6, seed = 0, sq = 1) {
  const g = grp(p, x, y, z); g.scale.y = sq;
  part(g, ico(r), PINKS[seed % 4]);
  for (let i = 0; i < n; i++) {
    const a = i * 2.39996 + seed, t = (i + 0.5) / n, yy = 1 - 1.6 * t, rr = Math.sqrt(Math.max(0, 1 - yy * yy));
    part(g, ico(r * (0.5 + 0.12 * ((i + seed) % 3))), PINKS[(i + seed + 1) % 4], Math.cos(a) * rr * r * 0.85, yy * r * 0.7, Math.sin(a) * rr * r * 0.85);
  }
  return g;
}

function gingham(p, w, d, n, m, y, base, check, t = 0.02) {
  part(p, box(w, t, d), base, 0, y + t / 2, 0);
  const cw = w / n, cd = d / m;
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) if ((i + j) % 2 === 0)
    part(p, box(cw, t * 0.4, cd), check, -w / 2 + cw * (i + 0.5), y + t + t * 0.2, -d / 2 + cd * (j + 0.5));
}

function cup(p, x, y, z, r) {
  part(p, lathe([[0, 0], [r * 0.7, 0], [r, r * 1.1], [r * 0.9, r * 1.1], [0, r * 0.2]], 16), C.cream, x, y, z);
  part(p, cyl(r * 0.85, r * 0.85, 0.006, 14), C.butter, x, y + r * 0.9, z);
  part(p, torus(r * 0.35, r * 0.1, 5, 10), C.cream, x + r * 1.05, y + r * 0.55, z);
}

function miniBasket(p, x, y, z, w, h, d) {
  const g = grp(p, x, y, z);
  part(g, box(w, h, d), C.wood, 0, h / 2, 0);
  [0.25, 0.5, 0.75].forEach(t => part(g, box(w * 1.01, h * 0.08, d * 1.01), C.woodDk, 0, h * t, 0));
  part(g, box(w * 1.04, h * 0.1, d * 1.04), C.woodDk, 0, h, 0);
  const hd = part(g, torus(w * 0.32, 0.012, 5, 16, Math.PI), C.woodDk, 0, h, 0); hd.scale.y = 1.1;
  gingham(g, w * 0.7, d * 0.9, 3, 3, h, C.sakura, C.cream, 0.012);
  return g;
}

function flatBlossomV(p, s, x, y, z, seed = 0) {
  const g = grp(p, x, y, z); g.rotation.x = Math.PI / 2;
  flatBlossom(g, s, 0.012, seed % 2 ? C.sakuraLt : C.sakura, 0, 0, 0, seed);
  return g;
}

function swingSeat(p, x, y, z, w, d, col, top, ropeX = w * 0.42) {
  part(p, box(w, 0.05, d), col, x, y, z);
  part(p, box(w * 1.02, 0.02, d * 1.02), C.woodDk, x, y - 0.03, z);
  [-1, 1].forEach(s => {
    rod(p, [x + s * ropeX, y, z], [x + s * ropeX, top, z], 0.012, C.rope, 5);
    [0.3, 0.62].forEach((t, i) => flatBlossomV(p, 0.05, x + s * ropeX, y + (top - y) * t, z + 0.015, i));
  });
}

function checkMat(s) {
  gingham(s, 1.4, 1.0, 7, 5, 0, C.sakura, C.cream, 0.022);
  [-0.51, 0.51].forEach(z => part(s, box(1.44, 0.03, 0.04), C.leafDk, 0, 0.015, z));
  [-0.71, 0.71].forEach(x => part(s, box(0.04, 0.03, 1.06), C.leafDk, x, 0.015, 0));
}

const BUILD = {
  sb_blossom_pot: {
    A(s) {
      part(s, lathe([[0, 0], [0.16, 0], [0.22, 0.06], [0.25, 0.2], [0.23, 0.34], [0.25, 0.37], [0.25, 0.4], [0.2, 0.4], [0, 0.36]]), C.cream);
      part(s, torus(0.24, 0.018, 5, 22), C.sakuraDk, 0, 0.3, 0).rotation.x = Math.PI / 2;
      part(s, cyl(0.21, 0.21, 0.02, 20), C.soil, 0, 0.37, 0);
      part(s, tube([[0, 0.36, 0], [0.04, 0.6, 0.02], [-0.05, 0.82, 0], [0.02, 1.0, -0.02]], 0.04, 24, 7), C.bark);
      part(s, tube([[-0.04, 0.78, 0], [-0.2, 0.92, 0.04], [-0.3, 1.02, 0.02]], 0.022, 16, 5), C.bark);
      part(s, tube([[0.0, 0.88, 0], [0.18, 0.98, -0.02], [0.28, 1.06, 0]], 0.02, 16, 5), C.bark);
      clump(s, 0.02, 1.16, 0, 0.17, 8, 0);
      clump(s, -0.3, 1.06, 0.04, 0.13, 6, 1);
      clump(s, 0.3, 1.1, -0.02, 0.13, 6, 2);
      [[0.12, 0.42, 0.1, 0.4], [-0.1, 0.4, -0.06, 2.1]].forEach(([x, y, z, r]) => flatPetal(s, 0.05, 0.006, C.sakuraLt, x, y, z, r));
    },
    B(s) {
      part(s, box(0.62, 0.22, 0.4), C.wood, 0, 0.11, 0);
      part(s, box(0.66, 0.04, 0.44), C.woodDk, 0, 0.22, 0);
      [-1, 1].forEach(x => part(s, box(0.06, 0.04, 0.42), C.woodDk, x * 0.26, 0.02, 0));
      part(s, box(0.56, 0.02, 0.34), C.soil, 0, 0.23, 0);
      part(s, sph(0.06, 10, 8), C.stone, 0.18, 0.24, 0.08).scale.y = 0.6;
      part(s, tube([[-0.08, 0.22, 0], [-0.04, 0.42, 0], [0.1, 0.58, 0], [0.04, 0.78, 0], [-0.12, 0.92, 0]], 0.045, 24, 7), C.bark);
      part(s, tube([[0.08, 0.56, 0], [0.24, 0.66, 0.02], [0.3, 0.7, 0]], 0.022, 12, 5), C.bark);
      clump(s, -0.14, 0.98, 0, 0.2, 8, 0, 0.55);
      clump(s, 0.28, 0.74, 0.02, 0.15, 6, 1, 0.55);
      clump(s, -0.26, 0.76, -0.04, 0.12, 5, 3, 0.55);
    },
    C(s) {
      part(s, lathe([[0, 0], [0.12, 0], [0.16, 0.12], [0.15, 0.3], [0.09, 0.46], [0.07, 0.52], [0.1, 0.56], [0.06, 0.56], [0, 0.5]]), C.sakura);
      part(s, torus(0.155, 0.014, 5, 20), C.cream, 0, 0.2, 0).rotation.x = Math.PI / 2;
      [[[0, 0.54, 0], [-0.08, 0.8, 0.02], [-0.22, 1.1, 0], [-0.3, 1.24, 0]], [[0, 0.54, 0], [0.06, 0.86, 0], [0.1, 1.2, -0.02], [0.08, 1.38, 0]], [[0, 0.54, 0], [0.12, 0.7, 0.04], [0.32, 0.88, 0.04]]].forEach((pts, bi) => {
        part(s, tube(pts, 0.014, 20, 5), C.bark);
        const c = new THREE.CatmullRomCurve3(pts.map(p => V(...p)));
        [0.45, 0.7, 0.95].forEach((t, i) => {
          const q = c.getPoint(t);
          clump(s, q.x + (i % 2 ? 0.04 : -0.04), q.y, q.z + 0.02, 0.055 + 0.01 * i, 4, bi + i);
        });
      });
    },
  },
  sb_picnic_mat: {
    A(s) {
      checkMat(s);
      [[-0.55, -0.32, 0.4], [0.5, 0.36, 2.5], [0.2, -0.3, 4.2]].forEach(([x, z, r], i) => flatPetal(s, 0.07, 0.006, i % 2 ? C.sakuraLt : C.rose, x, 0.04, z, r));
    },
    B(s) {
      for (let i = 0; i < 5; i++) {
        const g = grp(s); g.rotation.y = i / 5 * TAU;
        flatPetal(g, 0.78, 0.025, C.sakura, 0, 0, 0, 0);
        flatPetal(g, 0.5, 0.012, C.sakuraLt, 0, 0.025, 0.08, 0);
      }
      part(s, cyl(0.16, 0.16, 0.045, 24), C.rose, 0, 0.022, 0);
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; part(s, sph(0.025, 8, 6), C.butter, Math.cos(a) * 0.1, 0.05, Math.sin(a) * 0.1).scale.y = 0.5; }
    },
    C(s) {
      checkMat(s);
      miniBasket(s, -0.42, 0.03, -0.24, 0.3, 0.16, 0.22).rotation.y = 0.3;
      cup(s, 0.32, 0.03, 0.18, 0.05);
      cup(s, 0.46, 0.03, 0.06, 0.05);
      part(s, cyl(0.12, 0.1, 0.02, 18), C.cream, 0.0, 0.035, 0.2);
      [[-0.02, 0.2], [0.04, 0.24], [0.05, 0.16]].forEach(([x, z], i) => part(s, sph(0.03, 8, 6), i % 2 ? C.sakuraLt : C.leaf, x, 0.06, z).scale.y = 0.7);
    },
  },
  sb_petal_swing: {
    A(s) {
      const top = 1.75, px = 0.85;
      [-1, 1].forEach(sx => {
        rod(s, [sx * px, 0, -0.38], [sx * px, top, 0], 0.045, C.wood, 7);
        rod(s, [sx * px, 0, 0.38], [sx * px, top, 0], 0.045, C.wood, 7);
        part(s, box(0.06, 0.05, 0.5), C.woodDk, sx * px, 0.5, 0);
      });
      rod(s, [-px - 0.1, top, 0], [px + 0.1, top, 0], 0.05, C.woodDk, 8);
      for (let i = 0; i < 7; i++) clump(s, -0.72 + i * 0.24, top + 0.04, i % 2 ? 0.05 : -0.05, 0.1 + (i % 3) * 0.015, 5, i, 0.8);
      part(s, tube([[-0.6, top, 0.05], [-0.4, top - 0.18, 0.08], [-0.2, top - 0.05, 0.07], [0.05, top - 0.2, 0.08], [0.3, top - 0.06, 0.07], [0.55, top - 0.17, 0.08], [0.7, top - 0.02, 0.06]], 0.014, 40, 5), C.leafDk);
      swingSeat(s, 0, 0.45, 0, 0.7, 0.3, C.sakura, top);
    },
    B(s) {
      part(s, tube([[-0.6, 0, 0], [-0.58, 0.8, 0], [-0.5, 1.5, 0], [-0.42, 1.9, 0]], 0.11, 24, 8), C.bark);
      part(s, cyl(0.2, 0.26, 0.12, 10), C.barkDk, -0.6, 0.06, 0);
      part(s, tube([[-0.5, 1.6, 0], [-0.1, 1.82, 0], [0.4, 1.86, 0], [0.75, 1.96, 0]], 0.05, 24, 6), C.bark);
      clump(s, -0.45, 2.15, 0, 0.42, 10, 0);
      clump(s, 0.15, 2.1, 0.05, 0.32, 8, 1);
      clump(s, 0.7, 2.06, -0.04, 0.26, 7, 2);
      clump(s, -0.85, 1.9, 0.1, 0.22, 6, 3);
      swingSeat(s, 0.2, 0.45, 0, 0.6, 0.28, C.cream, 1.84, 0.26);
      [[0.4, 0.4, 0.3], [-0.2, 0.5, 1.4], [0.7, -0.2, 2.6], [0.0, -0.4, 3.7]].forEach(([x, z, r], i) => flatPetal(s, 0.07, 0.006, i % 2 ? C.sakuraLt : C.sakura, x, 0.002, z, r));
    },
    C(s) {
      const px = 0.8, cy = 1.15;
      [-1, 1].forEach(sx => {
        part(s, cyl(0.1, 0.12, 0.08, 10), C.stone, sx * px, 0.04, 0);
        part(s, cyl(0.04, 0.045, cy, 8), C.wood, sx * px, cy / 2 + 0.06, 0);
      });
      part(s, torus(px, 0.035, 6, 32, Math.PI), C.wood, 0, cy + 0.06, 0);
      for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI; clump(s, Math.cos(a) * px, cy + 0.06 + Math.sin(a) * px, 0, 0.11 + (i % 2) * 0.02, 5, i, 0.9); }
      swingSeat(s, 0, 0.42, 0, 0.6, 0.28, C.sakura, cy + 0.06 + px - 0.06, 0.24);
    },
  },
  sb_blossom_arch: {
    A(s) {
      const px = 0.9, cy = 1.25;
      [-1, 1].forEach(sx => {
        part(s, cyl(0.12, 0.14, 0.1, 10), C.stone, sx * px, 0.05, 0);
        part(s, box(0.09, cy, 0.09), C.wood, sx * px, cy / 2 + 0.05, 0);
        [0.35, 0.75].forEach((t, i) => clump(s, sx * (px + 0.02), 0.05 + cy * t, 0.05, 0.08, 4, i + (sx > 0 ? 2 : 0)));
        part(s, tube([[sx * px, 0.1, 0.05], [sx * (px + 0.06), 0.5, 0.06], [sx * (px - 0.05), 0.9, 0.06], [sx * px, cy, 0.05]], 0.014, 20, 5), C.leafDk);
      });
      part(s, torus(px, 0.045, 6, 32, Math.PI), C.wood, 0, cy + 0.05, 0);
      for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI; clump(s, Math.cos(a) * px, cy + 0.05 + Math.sin(a) * px, i % 2 ? 0.04 : -0.04, 0.14 + ((i + 1) % 3) * 0.02, 6, i); }
    },
    B(s) {
      const px = 0.9, h = 1.95;
      [-1, 1].forEach(sx => {
        part(s, box(0.12, h, 0.12), C.wood, sx * px, h / 2, 0);
        part(s, box(0.18, 0.08, 0.18), C.woodDk, sx * px, 0.04, 0);
      });
      part(s, box(2.2, 0.1, 0.16), C.wood, 0, h + 0.05, 0);
      part(s, box(2.0, 0.07, 0.1), C.woodDk, 0, h - 0.22, 0);
      const sag = t => [-px + 0.06 + t * (2 * px - 0.12), h - 0.26 - Math.sin(t * Math.PI) * 0.28, 0.09];
      part(s, tube(Array.from({ length: 11 }, (_, i) => sag(i / 10)), 0.015, 30, 5), C.leafDk);
      for (let i = 1; i < 9; i++) { const [x, y, z] = sag(i / 9); clump(s, x, y - 0.03, z, 0.075 + (i % 2) * 0.02, 4, i); }
      [-0.45, 0, 0.45].forEach((x, i) => {
        const [, y] = sag((x + px - 0.06) / (2 * px - 0.12)), L = i === 1 ? 0.34 : 0.26;
        rod(s, [x, y - 0.06, 0.09], [x, y - L, 0.09], 0.006, C.leafDk, 4);
        clump(s, x, y - L - 0.04, 0.09, 0.06, 3, i + 4);
      });
      [-1, 1].forEach(sx => clump(s, sx * (px - 0.05), h + 0.14, 0.02, 0.14, 6, sx > 0 ? 5 : 6));
    },
    C(s) {
      [-1, 1].forEach(sx => {
        part(s, cyl(0.16, 0.22, 0.12, 10), C.barkDk, sx * 0.9, 0.06, 0);
        part(s, tube([[sx * 0.9, 0, 0], [sx * 0.92, 0.7, 0], [sx * 0.78, 1.4, 0], [sx * 0.45, 1.9, 0], [sx * 0.05, 2.1, 0]], 0.08, 30, 8), C.bark);
        part(s, tube([[sx * 0.86, 1.2, 0], [sx * 1.1, 1.55, 0.05], [sx * 1.15, 1.75, 0.02]], 0.03, 12, 5), C.bark);
        clump(s, sx * 1.1, 1.78, 0.05, 0.24, 7, sx > 0 ? 0 : 1);
        clump(s, sx * 0.72, 1.92, -0.06, 0.28, 8, sx > 0 ? 2 : 3);
        clump(s, sx * 0.34, 2.16, 0.04, 0.26, 8, sx > 0 ? 4 : 5);
      });
      clump(s, 0, 2.28, 0, 0.24, 7, 6);
      [[0.3, 0.4, 0.3], [-0.4, -0.3, 1.5], [0.6, -0.2, 2.6], [-0.1, 0.3, 3.9]].forEach(([x, z, r], i) => flatPetal(s, 0.07, 0.006, i % 2 ? C.sakuraLt : C.sakura, x, 0.002, z, r));
    },
  },
};

export function build(id, v) {
  const fn = BUILD[id]?.[v];
  if (!fn) throw new Error(`unknown spring decor: ${id}/${v}`);
  const solid = new THREE.Group();
  fn(solid);
  const out = new THREE.Group();
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, metalness: 0 }));
  body.castShadow = true; body.receiveShadow = true;
  out.add(body);
  return out;
}
