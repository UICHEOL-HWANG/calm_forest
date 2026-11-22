import * as THREE from 'three';
import { bakeGroup, part } from '../../js/dream/art.js';

export const IDS = ['kn_rocking_chair', 'kn_yarn_basket', 'kn_patch_rug', 'kn_knit_pot'];
export const VARIANTS = ['A', 'B', 'C'];
export const REC = { kn_rocking_chair: 'A', kn_yarn_basket: 'A', kn_patch_rug: 'B', kn_knit_pot: 'C' };

export const C = {
  cream: 0xe6d6b8, creamDk: 0xcdb48c,
  mustard: 0xd29a3a, mustardDk: 0xa87828,
  rose: 0xc8707a, roseDk: 0x9c4c58,
  sage: 0x8aa07a, sageDk: 0x667f5c,
  wood: 0xb8834e, woodDk: 0x7e5432, walnut: 0x5e3e2a,
  wicker: 0xc49a5c, wickerDk: 0x98713f,
  terra: 0xb86a48, leaf: 0x5f8a55, leafDk: 0x476e45,
};

export const META = {
  kn_rocking_chair: {
    A: { name: '살대 흔들의자', note: '나무 살대 등받이 · 크림 골지 방석 · 장미·겨자 줄무늬 담요를 걸침', foot: [0.6, 0.85] },
    B: { name: '둥근 통 흔들의자', note: '장미색 통 의자 · 크림 방석 · 겨자 꽈배기 쿠션 · 나무 흔들 다리', foot: [0.7, 0.85] },
    C: { name: '사다리 등 흔들의자', note: '굽은 가로대 셋 · 겨자 짚 엮음 자리 · 앞으로 늘어진 할머니 사각 담요', foot: [0.6, 0.85] },
  },
  kn_yarn_basket: {
    A: { name: '등나무 털실 바구니', note: '둥근 바구니에 털실 다섯 · 대바늘 둘 꽂음', foot: [0.5, 0.5] },
    B: { name: '털실 칸 상자', note: '나무 상자 여섯 칸 · 칸마다 털실', foot: [0.65, 0.4] },
    C: { name: '뜨개 받침대 가방', note: 'X자 나무 다리 · 장미색 천 가방 · 뜨다 만 겨자 뜨개', foot: [0.6, 0.4] },
  },
  kn_patch_rug: {
    A: { name: '조각보 러그', note: '네모 조각 열둘 · 크림 바느질 테 · 땀 자국', foot: [1.4, 1.05] },
    B: { name: '땋은 타원 러그', note: '장미·겨자·크림·세이지 땋은 줄을 둥글게 감음', foot: [1.5, 1.1] },
    C: { name: '할머니 사각 러그', note: '네 겹 색 테 사각 여섯 장을 크림으로 이음', foot: [1.4, 0.95] },
  },
  kn_knit_pot: {
    A: { name: '골지 옷 입은 화분', note: '테라코타 화분에 겨자 골지 덧옷 · 둥근 잎 화초', foot: [0.45, 0.45] },
    B: { name: '털모자 선인장', note: '크림 뜨개 화분 · 장미 줄 · 방울 털모자 쓴 둥근 선인장', foot: [0.4, 0.4] },
    C: { name: '방울꽃 화분', note: '장미·크림 줄무늬 덧옷 · 방울 꽃 다섯 송이 · 뜨개 잎', foot: [0.45, 0.45] },
  },
};

const TAU = Math.PI * 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sph = (r, w = 20, h = 14) => new THREE.SphereGeometry(r, w, h);
const cyl = (a, b, h, s = 24, open = false, t0 = 0, tl = TAU) => new THREE.CylinderGeometry(a, b, h, s, 1, open, t0, tl);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const torus = (r, t, rs = 8, ts = 28, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc);
const lathe = (pr, seg = 28) => new THREE.LatheGeometry(pr.map(([x, y]) => new THREE.Vector2(x, y)), seg);
const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
const tube = (pts, r, seg = 30, rad = 8, closed = false) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V(...p)), closed), seg, r, rad, closed);

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

function ribbed(geo, n, amp) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), f = 1 + amp * Math.cos(Math.atan2(z, x) * n);
    pos.setX(i, x * f); pos.setZ(i, z * f);
  }
  geo.computeVertexNormals();
  return geo;
}

function yarnBall(p, r, c, cDk, x, y, z, seed = 1) {
  const b = grp(p, x, y, z);
  part(b, sph(r), c);
  for (let i = 0; i < 6; i++) part(b, torus(r, r * 0.07, 5, 28), i % 2 ? cDk : c).rotation.set(seed * 0.7 + i * 1.1, seed + i * 0.6, i * 0.9);
  return b;
}

function needle(p, a, b, r, col = C.woodDk, bead = C.rose) {
  rod(p, a, b, r, col, 8, r * 0.6);
  part(p, sph(r * 2.2, 10, 8), bead, ...b);
}

function pompom(p, r, col, x, y, z, puffs = 9) {
  part(p, new THREE.IcosahedronGeometry(r, 2), col, x, y, z);
  for (let i = 0; i < puffs; i++) {
    const a = i * 2.39996, t = (i + 0.5) / puffs, ry = 1 - 2 * t, rr = Math.sqrt(1 - ry * ry);
    part(p, new THREE.IcosahedronGeometry(r * 0.42, 1), col, x + Math.cos(a) * rr * r * 0.85, y + ry * r * 0.85, z + Math.sin(a) * rr * r * 0.85);
  }
}

function rockers(s, half, len, col, lift = 0.03) {
  [-1, 1].forEach(sx => part(s, tube([[sx * half, lift + 0.09, -len * 0.55], [sx * half, lift + 0.02, -len * 0.25], [sx * half, lift, 0.05], [sx * half, lift + 0.03, len * 0.35], [sx * half, lift + 0.11, len * 0.5]], 0.026, 30, 8), col));
}

function stripes(p, w, h, d, cols, n, x, y, z, rx = 0) {
  const g = grp(p, x, y, z); g.rotation.x = rx;
  for (let i = 0; i < n; i++) part(g, box(w, h / n + 0.002, d), cols[i % cols.length], 0, -h / 2 + (i + 0.5) * h / n, 0);
  return g;
}

function cableBolster(p, len, r, col, colDk, x, y, z, ry = 0) {
  const g = grp(p, x, y, z); g.rotation.y = ry;
  const b = part(g, cyl(r, r, len, 20), col); b.rotation.z = Math.PI / 2;
  [-1, 1].forEach(sx => part(g, sph(r, 16, 10), col, sx * len / 2, 0, 0).scale.set(0.35, 1, 1));
  for (let k = 0; k < 3; k++) [0, Math.PI].forEach(ph => {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24, a = (k / 3) * TAU, w = r * 0.18 * Math.sin(t * Math.PI * 4 + ph);
      pts.push([-len / 2 + len * t, Math.cos(a + w / r) * r * 1.02, Math.sin(a + w / r) * r * 1.02]);
    }
    part(g, tube(pts, r * 0.1, 40, 6), colDk);
  });
  return g;
}

function grannySquare(p, s, cols, x, y, z, h = 0.02) {
  const g = grp(p, x, y, z);
  cols.forEach((c, i) => part(g, box(s * (1 - i / cols.length), h + i * 0.002, s * (1 - i / cols.length)), c, 0, (h + i * 0.002) / 2, 0));
  return g;
}

const BUILD = {
  kn_rocking_chair: {
    A(s) {
      rockers(s, 0.24, 0.85, C.woodDk);
      [[-0.22, 0.2], [0.22, 0.2], [-0.22, -0.18], [0.22, -0.18]].forEach(([x, z]) => rod(s, [x, 0.06, z], [x, 0.42, z], 0.025, C.wood));
      roundSlab(s, 0.54, 0.48, 0.05, 0.06, C.wood, 0.4);
      [-1, 1].forEach(sx => {
        rod(s, [sx * 0.23, 0.42, -0.2], [sx * 0.25, 1.08, -0.32], 0.03, C.woodDk);
        rod(s, [sx * 0.23, 0.42, 0.2], [sx * 0.25, 0.68, 0.2], 0.025, C.wood);
        rod(s, [sx * 0.25, 0.7, -0.24], [sx * 0.26, 0.7, 0.24], 0.03, C.woodDk);
      });
      part(s, tube([[-0.27, 1.06, -0.31], [0, 1.12, -0.35], [0.27, 1.06, -0.31]], 0.035, 20, 8), C.woodDk);
      [-0.14, -0.07, 0, 0.07, 0.14].forEach(x => rod(s, [x, 0.46, -0.21], [x, 1.08, -0.33], 0.014, C.wood));
      roundSlab(s, 0.46, 0.42, 0.07, 0.08, C.cream, 0.45);
      for (let i = -3; i <= 3; i++) part(s, box(0.012, 0.012, 0.36), C.creamDk, i * 0.06, 0.525, 0);
      const bl = grp(s, 0, 0.88, -0.29); bl.rotation.x = -0.19;
      stripes(bl, 0.46, 0.38, 0.03, [C.rose, C.rose, C.mustard, C.cream], 8, 0, 0, 0.03);
      stripes(bl, 0.46, 0.16, 0.03, [C.rose, C.mustard], 4, 0, 0.12, -0.04);
      for (let i = 0; i < 9; i++) part(bl, box(0.016, 0.06, 0.016), C.roseDk, -0.2 + i * 0.05, -0.22, 0.03);
      return { flat: false };
    },
    B(s) {
      rockers(s, 0.28, 0.9, C.woodDk);
      [[-0.26, 0.16], [0.26, 0.16], [-0.26, -0.18], [0.26, -0.18]].forEach(([x, z]) => rod(s, [x, 0.06, z], [x * 0.9, 0.3, z * 0.9], 0.026, C.wood));
      part(s, cyl(0.33, 0.3, 0.12, 36), C.roseDk, 0, 0.34, 0);
      part(s, cyl(0.35, 0.33, 0.5, 40, true, Math.PI / 2 - 0.55, Math.PI + 1.1), C.rose, 0, 0.62, 0);
      const rim = [];
      for (let i = 0; i <= 20; i++) { const a = Math.PI / 2 - 0.55 + (Math.PI + 1.1) * i / 20; rim.push([Math.sin(a) * 0.35, 0.87, Math.cos(a) * 0.35]); }
      part(s, tube(rim, 0.045, 40, 10), C.roseDk);
      [-1, 1].forEach(sx => { const a = Math.PI / 2 - 0.55; part(s, cyl(0.045, 0.045, 0.5, 10), C.roseDk, sx * Math.sin(a) * 0.35, 0.62, Math.cos(a) * 0.35); });
      for (let i = 0; i < 9; i++) { const a = Math.PI / 2 + i / 8 * Math.PI; rod(s, [Math.sin(a) * 0.34, 0.4, Math.cos(a) * 0.34], [Math.sin(a) * 0.36, 0.85, Math.cos(a) * 0.36], 0.012, C.roseDk); }
      part(s, cyl(0.3, 0.3, 0.08, 36), C.cream, 0, 0.44, 0.02);
      part(s, torus(0.3, 0.02, 6, 40), C.creamDk, 0, 0.48, 0.02).rotation.x = Math.PI / 2;
      cableBolster(s, 0.4, 0.1, C.mustard, C.mustardDk, 0, 0.6, -0.18, 0);
      return { flat: false };
    },
    C(s) {
      rockers(s, 0.24, 0.85, C.walnut);
      [[-0.22, 0.2], [0.22, 0.2], [-0.22, -0.18], [0.22, -0.18]].forEach(([x, z]) => rod(s, [x, 0.06, z], [x, 0.44, z], 0.026, C.walnut));
      [-1, 1].forEach(sx => {
        rod(s, [sx * 0.22, 0.42, -0.19], [sx * 0.23, 1.2, -0.3], 0.032, C.walnut);
        part(s, sph(0.04), C.walnut, sx * 0.23, 1.22, -0.3);
        rod(s, [sx * 0.22, 0.42, 0.2], [sx * 0.23, 0.66, 0.2], 0.028, C.walnut);
        rod(s, [sx * 0.23, 0.68, -0.22], [sx * 0.24, 0.68, 0.24], 0.028, C.walnut);
      });
      [0.68, 0.88, 1.08].forEach(y => {
        const z = -0.19 - (y - 0.42) * 0.14;
        part(s, tube([[-0.22, y, z], [0, y + 0.02, z - 0.04], [0.22, y, z]], 0.024, 16, 6), C.wood);
        part(s, box(0.4, 0.07, 0.025), C.wood, 0, y - 0.02, z - 0.02);
      });
      roundSlab(s, 0.48, 0.44, 0.03, 0.02, C.walnut, 0.41);
      for (let i = 0; i < 8; i++) {
        part(s, box(0.042, 0.02, 0.42), i % 2 ? C.mustard : C.mustardDk, -0.175 + i * 0.05, 0.45, 0);
        part(s, box(0.44, 0.016, 0.042), i % 2 ? C.mustardDk : C.mustard, 0, 0.457, -0.175 + i * 0.05);
      }
      const cols = [[C.rose, C.mustard, C.cream, C.sage], [C.mustard, C.sage, C.cream, C.rose], [C.sage, C.rose, C.cream, C.mustard]];
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) grannySquare(s, 0.12, cols[(r + c) % 3], -0.13 + c * 0.13, 0.465, -0.02 + r * 0.13, 0.012);
      const hang = grp(s, 0, 0.47, 0.25); hang.rotation.x = Math.PI / 2 - 0.12;
      for (let c = 0; c < 3; c++) for (let r = 0; r < 2; r++) {
        const q = grannySquare(hang, 0.12, cols[(r + c + 1) % 3], -0.13 + c * 0.13, 0, 0.07 + r * 0.13, 0.012);
        q.rotation.x = Math.PI;
      }
      return { flat: false };
    },
  },
  kn_yarn_basket: {
    A(s) {
      part(s, ribbed(lathe([[0.2, 0], [0.24, 0.04], [0.25, 0.2], [0.27, 0.3]], 36), 18, 0.03), C.wicker);
      part(s, cyl(0.2, 0.2, 0.03, 30), C.wickerDk, 0, 0.015, 0);
      [0.08, 0.16, 0.24].forEach(y => part(s, torus(0.24 + y * 0.1, 0.012, 5, 36), C.wickerDk, 0, y, 0).rotation.x = Math.PI / 2);
      part(s, torus(0.27, 0.025, 6, 36), C.wickerDk, 0, 0.3, 0).rotation.x = Math.PI / 2;
      yarnBall(s, 0.11, C.rose, C.roseDk, -0.1, 0.3, 0.06, 1);
      yarnBall(s, 0.1, C.mustard, C.mustardDk, 0.1, 0.29, 0.08, 2);
      yarnBall(s, 0.1, C.cream, C.creamDk, 0.0, 0.31, -0.1, 3);
      yarnBall(s, 0.09, C.sage, C.sageDk, 0.13, 0.3, -0.09, 4);
      yarnBall(s, 0.08, C.rose, C.roseDk, -0.14, 0.29, -0.11, 5);
      needle(s, [0.02, 0.28, -0.02], [-0.12, 0.62, -0.14], 0.012);
      needle(s, [0.04, 0.28, -0.02], [0.04, 0.6, -0.2], 0.012);
      part(s, tube([[0.1, 0.3, 0.17], [0.2, 0.22, 0.27], [0.27, 0.06, 0.3], [0.33, 0.012, 0.33]], 0.01, 20, 5), C.mustardDk);
      return { flat: false };
    },
    B(s) {
      roundSlab(s, 0.64, 0.38, 0.04, 0.03, C.woodDk, 0);
      [-1, 1].forEach(sx => part(s, box(0.03, 0.4, 0.38), C.wood, sx * 0.305, 0.22, 0));
      part(s, box(0.64, 0.4, 0.03), C.wood, 0, 0.22, -0.175);
      [-0.1, 0.1].forEach(x => part(s, box(0.02, 0.38, 0.36), C.wood, x, 0.22, 0));
      part(s, box(0.6, 0.02, 0.36), C.wood, 0, 0.22, 0);
      part(s, box(0.64, 0.06, 0.03), C.woodDk, 0, 0.4, 0.175);
      part(s, box(0.64, 0.05, 0.03), C.woodDk, 0, 0.06, 0.175);
      const cols = [[C.rose, C.roseDk], [C.mustard, C.mustardDk], [C.cream, C.creamDk], [C.sage, C.sageDk], [C.mustard, C.mustardDk], [C.rose, C.roseDk]];
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
        const [a, b] = cols[r * 3 + c];
        yarnBall(s, 0.085, a, b, -0.2 + c * 0.2, 0.13 + r * 0.19, 0.02, r * 3 + c);
      }
      [-0.21, 0.21].forEach(x => part(s, cyl(0.025, 0.025, 0.02, 12), C.creamDk, x, 0.4, 0.192).rotation.x = Math.PI / 2);
      return { flat: false };
    },
    C(s) {
      [-1, 1].forEach(sx => {
        rod(s, [sx * 0.24, 0.02, -0.17], [sx * 0.24, 0.62, 0.17], 0.022, C.woodDk);
        rod(s, [sx * 0.24, 0.02, 0.17], [sx * 0.24, 0.62, -0.17], 0.022, C.woodDk);
        part(s, sph(0.03), C.wood, sx * 0.24, 0.32, 0);
      });
      [-0.17, 0.17].forEach(z => rod(s, [-0.27, 0.62, z], [0.27, 0.62, z], 0.022, C.wood));
      rod(s, [-0.26, 0.12, 0], [0.26, 0.12, 0], 0.016, C.woodDk);
      const bag = part(s, cyl(0.17, 0.17, 0.48, 28, false, Math.PI, Math.PI), C.rose, 0, 0.6, 0);
      bag.rotation.z = Math.PI / 2; bag.scale.set(1.2, 1, 1);
      [-0.17, 0.17].forEach(z => part(s, tube([[-0.24, 0.61, z], [0, 0.6, z], [0.24, 0.61, z]], 0.02, 12, 6), C.roseDk));
      yarnBall(s, 0.09, C.cream, C.creamDk, -0.1, 0.62, 0.0, 2);
      yarnBall(s, 0.08, C.sage, C.sageDk, 0.03, 0.62, -0.04, 3);
      const wip = grp(s, 0.12, 0.66, 0.06); wip.rotation.set(-0.5, 0, 0.3);
      const k = part(wip, ribbed(cyl(0.08, 0.08, 0.16, 20), 14, 0.04), C.mustard); k.scale.set(1, 1, 0.25);
      needle(wip, [-0.12, 0.08, 0], [0.16, 0.1, 0.02], 0.009);
      needle(wip, [-0.1, 0.07, 0.01], [0.14, 0.18, 0], 0.009, C.woodDk, C.mustardDk);
      return { flat: false };
    },
  },
  kn_patch_rug: {
    A(s) {
      const cols = [C.rose, C.mustard, C.cream, C.sage, C.cream, C.rose, C.sage, C.mustard, C.mustard, C.sage, C.rose, C.cream];
      roundSlab(s, 1.4, 1.05, 0.02, 0.04, C.creamDk, 0);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
        roundSlab(s, 0.31, 0.31, 0.02, 0.02, cols[r * 4 + c], 0.012).position.set(-0.495 + c * 0.33, 0.012, -0.33 + r * 0.33);
        for (let i = 0; i < 4; i++) part(s, box(0.035, 0.006, 0.01), C.creamDk, -0.495 + c * 0.33 - 0.09 + i * 0.06, 0.034, -0.33 + r * 0.33 + 0.13);
      }
      return { flat: false };
    },
    B(s) {
      const rings = [C.rose, C.mustard, C.cream, C.sage, C.rose, C.mustard, C.cream, C.roseDk];
      const g = grp(s); g.scale.set(1.32, 1, 1);
      part(g, cyl(0.1, 0.1, 0.03, 20), C.mustard, 0, 0.015, 0);
      rings.forEach((c, i) => {
        const t = part(g, torus(0.13 + i * 0.054, 0.03, 6, 64), c, 0, 0.022, 0);
        t.rotation.x = Math.PI / 2; t.scale.z = 0.55;
      });
      return { flat: false };
    },
    C(s) {
      roundSlab(s, 1.4, 0.95, 0.018, 0.03, C.cream, 0);
      const sets = [[C.mustard, C.rose, C.cream, C.sage], [C.sage, C.mustard, C.cream, C.rose], [C.rose, C.sage, C.cream, C.mustard]];
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) grannySquare(s, 0.42, sets[(r + c) % 3], -0.45 + c * 0.45, 0.012, -0.225 + r * 0.45, 0.014);
      return { flat: false };
    },
  },
  kn_knit_pot: {
    A(s) {
      part(s, lathe([[0.001, 0], [0.13, 0], [0.16, 0.26], [0.18, 0.3], [0.18, 0.33], [0.15, 0.33], [0.14, 0.3]], 28), C.terra);
      part(s, ribbed(lathe([[0.135, 0.04], [0.16, 0.06], [0.175, 0.24], [0.17, 0.26]], 40), 20, 0.04), C.mustard);
      part(s, torus(0.17, 0.018, 6, 36), C.mustardDk, 0, 0.255, 0).rotation.x = Math.PI / 2;
      part(s, cyl(0.15, 0.15, 0.02, 24), C.walnut, 0, 0.31, 0);
      for (let i = 0; i < 9; i++) {
        const a = i * 2.4, rr = 0.04 + (i % 3) * 0.03, top = 0.5 + (i % 4) * 0.06;
        const x = Math.cos(a) * rr * 2.2, z = Math.sin(a) * rr * 2.2;
        rod(s, [Math.cos(a) * 0.02, 0.31, Math.sin(a) * 0.02], [x, top, z], 0.008, C.leafDk);
        const lf = part(s, sph(0.075, 14, 10), i % 2 ? C.leaf : C.sage, x, top + 0.02, z);
        lf.scale.set(1, 0.32, 0.8); lf.rotation.set(0.3 * Math.sin(a), a, 0.4 * Math.cos(a));
      }
      return { flat: false };
    },
    B(s) {
      part(s, ribbed(lathe([[0.001, 0], [0.13, 0], [0.16, 0.04], [0.17, 0.2], [0.16, 0.26], [0.13, 0.27]], 40), 22, 0.035), C.cream);
      part(s, torus(0.172, 0.022, 6, 40), C.rose, 0, 0.12, 0).rotation.x = Math.PI / 2;
      part(s, torus(0.165, 0.018, 6, 40), C.rose, 0, 0.18, 0).rotation.x = Math.PI / 2;
      part(s, torus(0.14, 0.03, 6, 36), C.creamDk, 0, 0.265, 0).rotation.x = Math.PI / 2;
      const cac = part(s, ribbed(sph(0.14, 28, 18), 10, 0.06), C.leaf, 0, 0.37, 0);
      cac.scale.set(1, 1.08, 1);
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; part(s, sph(0.008, 6, 4), C.cream, Math.cos(a) * 0.15, 0.37, Math.sin(a) * 0.15); }
      part(s, lathe([[0.11, 0], [0.105, 0.04], [0.08, 0.08], [0.001, 0.1]], 28), C.rose, 0, 0.45, 0);
      part(s, torus(0.11, 0.018, 6, 30), C.roseDk, 0, 0.455, 0).rotation.x = Math.PI / 2;
      pompom(s, 0.045, C.cream, 0, 0.57, 0, 7);
      return { flat: false };
    },
    C(s) {
      part(s, lathe([[0.001, 0], [0.14, 0], [0.17, 0.32], [0.18, 0.34], [0.15, 0.34]], 28), C.terra);
      for (let i = 0; i < 6; i++) {
        const y0 = 0.03 + i * 0.05, r0 = 0.142 + 0.03 * (y0 + 0.025) / 0.32;
        part(s, ribbed(cyl(r0 + 0.012, r0 + 0.01, 0.052, 36), 18, 0.03), i % 2 ? C.cream : C.rose, 0, y0 + 0.025, 0);
      }
      part(s, cyl(0.16, 0.16, 0.02, 24), C.walnut, 0, 0.33, 0);
      const flowers = [[0, 0.82, 0, C.mustard], [0.1, 0.7, 0.06, C.rose], [-0.1, 0.72, 0.05, C.cream], [0.06, 0.64, -0.1, C.cream], [-0.08, 0.66, -0.08, C.rose]];
      flowers.forEach(([x, y, z, c], i) => {
        part(s, tube([[x * 0.2, 0.33, z * 0.2], [x * 0.6, (0.33 + y) / 2, z * 0.6], [x, y, z]], 0.008, 12, 5), C.leafDk);
        pompom(s, 0.055, c, x, y, z, 8);
        const lf = part(s, ribbed(sph(0.05, 12, 8), 6, 0.08), C.sage, x * 0.6 + (i % 2 ? 0.04 : -0.04), (0.33 + y) / 2, z * 0.6);
        lf.scale.set(1, 0.3, 0.55); lf.rotation.y = i;
      });
      return { flat: false };
    },
  },
};

export function build(id, v) {
  const fn = BUILD[id]?.[v];
  if (!fn) throw new Error(`unknown knit pick decor: ${id}/${v}`);
  const solid = new THREE.Group();
  const { k = 1, flat = true, rough = 0.9 } = fn(solid) || {};
  const out = new THREE.Group();
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: flat, roughness: rough, metalness: 0, side: THREE.DoubleSide }));
  body.castShadow = true; body.receiveShadow = true;
  out.add(body);
  out.scale.setScalar(k);
  return out;
}
