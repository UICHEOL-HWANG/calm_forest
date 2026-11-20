import * as THREE from 'three';
import { bakeGroup, part } from '../../js/dream/art.js';

export const IDS = ['ds_cake_case', 'ds_pudding_chair', 'ds_waffle_rug', 'ds_icecream_cart'];
export const VARIANTS = ['A', 'B', 'C'];

export const C = {
  pink: 0xff7aa8, pinkLt: 0xffa6c9, pinkDk: 0xe0507e, berry: 0xf03a5a, berryDk: 0xc22445,
  cream: 0xffcadc, vanilla: 0xfad29a, mint: 0x5fdcb0, mintDk: 0x2fb88a,
  butter: 0xffd040, butterDk: 0xf0a82a, lilac: 0xbf94ff, lilacDk: 0x9a6ae8, sky: 0x7cc8ff,
  cocoa: 0x8a4a2a, cocoaDk: 0x5e2f1a, leaf: 0x4cc25a,
  wafer: 0xf0a640, waferDk: 0xc97a24, custard: 0xffc845, caramel: 0xc8642a, caramelDk: 0x9a4418,
  wood: 0xd08a4e, woodDk: 0x9a5a30, ink: 0x2b1d1a, blush: 0xff6f91,
};

export const META = {
  ds_cake_case: {
    A: { name: '딸기 카운터 진열장', note: '분홍 줄무늬 카운터 + 크림 물결 테 · 민트 지붕 위 웃는 컵케이크 · 안에 웃는 컵케이크와 케이크', foot: [1.1, 0.6] },
    B: { name: '민트 케이크 찬장', note: '민트 찬장 유리문 · 분홍 물결 차양 · 세 칸 가득 알록달록 케이크 · 꼭대기 웃는 컵케이크', foot: [0.8, 0.5] },
    C: { name: '3단 스탠드 + 유리 종', note: '분홍 받침 3단 접시에 웃는 컵케이크·마카롱 · 큰 유리 종 + 딸기 손잡이', foot: [0.6, 0.6] },
  },
  ds_pudding_chair: {
    A: { name: '웃는 푸딩 스툴', note: '노란 푸딩에 웃는 얼굴 · 캐러멜이 흘러내림 · 크림과 체리 · 민트 물결 접시', foot: [0.6, 0.6] },
    B: { name: '푸딩 컵 소파', note: '물결 테 분홍 컵 · 웃는 푸딩 방석 · 크림 꼬깔 등쿠션 + 체리', foot: [0.8, 0.75] },
    C: { name: '숟가락 등받이 의자', note: '분홍 다리 의자 · 푸딩 방석 · 라벤더 큰 숟가락 등받이 · 하트', foot: [0.6, 0.6] },
  },
  ds_waffle_rug: {
    A: { name: '딸기 와플 러그', note: '네모 황금 와플 · 버터 · 시럽 줄기 · 딸기 조각과 분홍 크림', foot: [1.4, 1.0] },
    B: { name: '둥근 딸기 와플 러그', note: '둥근 와플 둘레에 딸기 조각과 크림 · 가운데 버터 + 분홍 시럽', foot: [1.3, 1.3] },
    C: { name: '하트 꽃 와플 러그', note: '하트 다섯 장 꽃 와플 · 가운데 딸기잼 · 알록달록 스프링클', foot: [1.4, 1.35] },
  },
  ds_icecream_cart: {
    A: { name: '파라솔 수레', note: '민트 수레 + 분홍 물결 치마 · 아이스크림 셋 · 분홍·노랑 파라솔 · 웃는 콘 간판', foot: [1.6, 0.8] },
    B: { name: '세발자전거 수레', note: '웃는 분홍 냉동 상자 + 노란 띠 · 민트 줄무늬 물결 차양 · 콘 셋', foot: [1.5, 0.8] },
    C: { name: '큰 콘 조형 수레', note: '분홍 짐수레 위 3단 큰 콘 · 아래 덩이에 웃는 얼굴 · 스프링클 · 체리', foot: [1.3, 0.7] },
  },
};

export const REC = { ds_cake_case: 'A', ds_pudding_chair: 'A', ds_waffle_rug: 'C', ds_icecream_cart: 'A' };

const TAU = Math.PI * 2;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sph = (r, w = 12, h = 9, ...rest) => new THREE.SphereGeometry(r, w, h, ...rest);
const cyl = (a, b, h, s = 12, ...rest) => new THREE.CylinderGeometry(a, b, h, s, ...rest);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const cone = (r, h, s = 8, ...rest) => new THREE.ConeGeometry(r, h, s, ...rest);
const torus = (r, t, rs = 6, ts = 18, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc);
const lathe = (pr, seg = 16) => new THREE.LatheGeometry(pr.map(([x, y]) => new THREE.Vector2(x, y)), seg);
const capsule = (r, l) => new THREE.CapsuleGeometry(r, l, 3, 6);
const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
const SPR = [C.berry, C.mint, C.butter, C.lilac, C.sky];

function rod(p, a, b, r, col, seg = 6, r2 = r) {
  const A = V(...a), B = V(...b), d = B.clone().sub(A);
  const m = part(p, cyl(r2, r, d.length(), seg), col, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  return m;
}

function face(p, x, y, z, s, rotY = 0) {
  const f = grp(p, x, y, z); f.rotation.y = rotY;
  [-1, 1].forEach(sx => {
    part(f, sph(s * 0.14, 10, 8), C.ink, sx * s * 0.34, s * 0.06, 0).scale.set(1, 1.2, 0.5);
    part(f, sph(s * 0.13, 10, 8), C.blush, sx * s * 0.62, -s * 0.16, -s * 0.02).scale.set(1.3, 0.75, 0.35);
  });
  part(f, torus(s * 0.1, s * 0.03, 4, 10, Math.PI), C.ink, 0, -s * 0.07, 0).rotation.z = Math.PI;
  return f;
}

function dollop(p, x, y, z, r, col = C.cream, turns = 3) {
  for (let i = 0; i < turns; i++) {
    const rr = r * (1 - (i / turns) * 0.62);
    part(p, torus(rr * 0.62, rr * 0.38, 6, 12), col, x, y + r * 0.42 * i, z).rotation.x = Math.PI / 2;
  }
  part(p, cone(r * 0.28, r * 0.42, 8), col, x, y + r * 0.42 * turns - r * 0.05, z);
}

function berry(p, x, y, z, s) {
  part(p, sph(s * 0.5, 10, 8), C.berry, x, y + s * 0.45, z).scale.set(1, 1.15, 1);
  part(p, cone(s * 0.42, s * 0.4, 10), C.berry, x, y + s * 0.1, z).rotation.x = Math.PI;
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; part(p, sph(s * 0.06, 4, 3), C.butter, x + Math.cos(a) * s * 0.46, y + s * 0.45, z + Math.sin(a) * s * 0.46); }
  part(p, cone(s * 0.36, s * 0.14, 5), C.leaf, x, y + s * 1.0, z);
}

function scallops(p, x, y, z, w, n, r, col, rotY = 0) {
  const g = grp(p, x, y, z); g.rotation.y = rotY;
  for (let i = 0; i < n; i++) part(g, sph(r, 10, 6, 0, TAU, Math.PI / 2, Math.PI / 2), col, -w / 2 + w / n * (i + 0.5), 0, 0).scale.set(w / n / (2 * r), 1, 0.45);
}

function sprinkles(p, cx, cy, cz, rad, n, ry = 0.02) {
  for (let i = 0; i < n; i++) {
    const a = i * 2.39996, rr = rad * Math.sqrt((i + 0.5) / n);
    part(p, capsule(0.009, 0.03), SPR[i % SPR.length], cx + Math.cos(a) * rr, cy + (i % 3) * ry * 0.3, cz + Math.sin(a) * rr).rotation.set(Math.PI / 2, 0, a * 1.7);
  }
}

function roundCake(p, x, y, z, r, h, sponge = C.vanilla, frost = C.pink) {
  part(p, cyl(r, r, h * 0.4, 18), sponge, x, y + h * 0.2, z);
  part(p, cyl(r * 1.01, r * 1.01, h * 0.14, 18), C.cream, x, y + h * 0.47, z);
  part(p, cyl(r, r, h * 0.3, 18), sponge, x, y + h * 0.69, z);
  part(p, cyl(r * 1.03, r * 1.03, h * 0.18, 18), frost, x, y + h * 0.93, z);
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, L = h * (0.12 + 0.12 * (i % 3) / 2); part(p, capsule(r * 0.08, L), frost, x + Math.cos(a) * r * 1.02, y + h * 0.86 - L / 2, z + Math.sin(a) * r * 1.02); }
  for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; dollop(p, x + Math.cos(a) * r * 0.74, y + h * 1.02, z + Math.sin(a) * r * 0.74, r * 0.16, C.cream, 2); }
  berry(p, x, y + h * 1.02, z, r * 0.5);
}

function slice(p, x, y, z, r, h, rotY, cols = [C.vanilla, C.cream, C.berry, C.vanilla, C.pink]) {
  const g = grp(p, x, y, z); g.rotation.y = rotY;
  let yy = 0;
  cols.forEach(c => {
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.absarc(0, 0, r, -0.5, 0.5, false); sh.lineTo(0, 0);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: h / cols.length, bevelEnabled: false, curveSegments: 6 }); geo.rotateX(-Math.PI / 2);
    part(g, geo, c, -r * 0.5, yy, 0); yy += h / cols.length;
  });
  berry(g, r * 0.2, yy, 0, r * 0.32);
}

function cupcake(p, x, y, z, s, cup, frost, withFace = false) {
  part(p, cyl(s * 0.82, s * 0.62, s * 0.85, 14), cup, x, y + s * 0.425, z);
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; part(p, box(s * 0.08, s * 0.82, s * 0.08), C.cream, x + Math.cos(a) * s * 0.73, y + s * 0.425, z + Math.sin(a) * s * 0.73).rotation.set(Math.sin(a) * 0.23, 0, -Math.cos(a) * 0.23); }
  dollop(p, x, y + s * 0.9, z, s * 0.86, frost, 3);
  part(p, sph(s * 0.18, 8, 6), C.berry, x, y + s * 0.9 + s * 1.12, z);
  if (withFace) face(p, x, y + s * 0.45, z + s * 0.74, s * 0.9);
}

function plate(p, x, y, z, r, col = C.sky) {
  part(p, cyl(r, r * 0.8, r * 0.1, 18), col, x, y + r * 0.05, z);
  for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; part(p, sph(r * 0.1, 6, 4), col, x + Math.cos(a) * r, y + r * 0.08, z + Math.sin(a) * r).scale.y = 0.6; }
}

function stripeRoof(p, x, y, z, w, d, n, cols) {
  for (let i = 0; i < n; i++) part(p, box(w / n, 0.045, d), cols[i % cols.length], x - w / 2 + w / n * (i + 0.5), y, z);
  for (let i = 0; i < n; i++) part(p, sph(w / n * 0.5, 10, 6, 0, TAU, Math.PI / 2, Math.PI / 2), cols[i % cols.length], x - w / 2 + w / n * (i + 0.5), y - 0.02, z + d / 2).scale.set(1, 1.1, 0.5);
}

function wheel(p, x, y, z, r, rim = C.pinkDk, spoke = C.cream, hub = C.butter) {
  part(p, torus(r * 0.85, r * 0.15, 6, 20), rim, x, y, z);
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; rod(p, [x + Math.cos(a) * r * 0.1, y + Math.sin(a) * r * 0.1, z], [x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75, z], r * 0.06, spoke, 4); }
  part(p, cyl(r * 0.2, r * 0.2, r * 0.28, 10), hub, x, y, z).rotation.x = Math.PI / 2;
}

function parasol(p, x, y, z, r, h, cols) {
  const n = 10;
  for (let i = 0; i < n; i++) part(p, cone(r, h, 3, 1, true, i / n * TAU, TAU / n), cols[i % cols.length], x, y, z);
  part(p, cyl(r * 0.98, r * 0.98, 0.012, 20), cols[1], x, y - h / 2 - 0.006, z);
  for (let i = 0; i < n * 2; i++) { const a = (i + 0.5) / (n * 2) * TAU; part(p, sph(r * 0.075, 8, 5, 0, TAU, Math.PI / 2, Math.PI / 2), cols[Math.floor(i / 2) % cols.length], x + Math.sin(a) * r, y - h / 2, z + Math.cos(a) * r); }
  berry(p, x, y + h / 2 - 0.01, z, 0.08);
}

function waffleGrid(p, inside, w, d, cell, ridge, h) {
  const run = (n, len, at, put) => {
    let s0 = null;
    const step = len / (n * 4);
    for (let j = 0; j <= n * 4; j++) {
      const t = -len / 2 + j * step, on = at(t);
      if (on && s0 === null) s0 = t;
      if ((!on || j === n * 4) && s0 !== null) { const s1 = on ? t : t - step; if (s1 - s0 > 0.02) put(s0, s1); s0 = null; }
    }
  };
  const nx = Math.round(w / cell), nz = Math.round(d / cell);
  for (let i = 0; i <= nx; i++) { const x = -w / 2 + i * w / nx; run(nz, d, z => inside(x, z), (a, b) => part(p, box(cell * 0.3, h, b - a), ridge, x, h / 2 + 0.01, (a + b) / 2)); }
  for (let j = 0; j <= nz; j++) { const z = -d / 2 + j * d / nz; run(nx, w, x => inside(x, z), (a, b) => part(p, box(b - a, h, cell * 0.3), ridge, (a + b) / 2, h / 2 + 0.01, z)); }
}

function heartShape(s) {
  const sh = new THREE.Shape();
  sh.moveTo(0, -s);
  sh.bezierCurveTo(s * 0.9, -s * 0.3, s * 1.1, s * 0.55, s * 0.5, s * 0.7);
  sh.bezierCurveTo(s * 0.2, s * 0.8, 0, s * 0.55, 0, s * 0.4);
  sh.bezierCurveTo(0, s * 0.55, -s * 0.2, s * 0.8, -s * 0.5, s * 0.7);
  sh.bezierCurveTo(-s * 1.1, s * 0.55, -s * 0.9, -s * 0.3, 0, -s);
  return sh;
}

function flatHeart(p, s, depth, col, y) {
  const geo = new THREE.ExtrudeGeometry(heartShape(s), { depth, bevelEnabled: false, curveSegments: 10 });
  geo.rotateX(Math.PI / 2);
  return part(p, geo, col, 0, y + depth, 0);
}

function berrySlice(p, x, y, z, r, rotY) {
  const a = part(p, cyl(r, r, 0.022, 14), C.berry, x, y, z); a.scale.set(0.85, 1, 1.15); a.rotation.y = rotY;
  const b = part(p, cyl(r * 0.55, r * 0.55, 0.024, 12), C.pinkLt, x, y + 0.001, z); b.scale.set(0.85, 1, 1.25); b.rotation.y = rotY;
}

function pudding(p, x, y, z, r, h, withFace) {
  part(p, lathe([[0, y], [r, y], [r * 1.02, y + h * 0.12], [r * 0.86, y + h * 0.9], [r * 0.8, y + h], [0, y + h]], 22), C.custard, x, 0, z);
  part(p, lathe([[0, y + h * 0.88], [r * 0.84, y + h * 0.88], [r * 0.8, y + h], [r * 0.7, y + h * 1.08], [0, y + h * 1.1]], 22), C.caramel, x, 0, z);
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, L = h * (0.12 + 0.1 * ((i * 7) % 3)); part(p, capsule(r * 0.08, L), C.caramel, x + Math.cos(a) * r * 0.84, y + h * 0.92 - L / 2, z + Math.sin(a) * r * 0.84); }
  if (withFace) face(p, x, y + h * 0.45, z + r * 0.93, r * 0.62, 0).rotation.x = -0.12;
  dollop(p, x, y + h * 1.06, z, r * 0.26, C.cream, 2);
  part(p, sph(r * 0.12, 10, 8), C.berry, x, y + h * 1.06 + r * 0.3, z);
}

const BUILD = {
  ds_cake_case: {
    A(s, gl) {
      const W = 1.05, D = 0.52, H = 0.55;
      part(s, box(W, 0.06, D), C.pinkDk, 0, 0.03, 0);
      part(s, box(W - 0.04, H - 0.06, D - 0.04), C.pink, 0, 0.06 + (H - 0.06) / 2, 0);
      for (let i = 0; i < 5; i++) part(s, box(0.1, H - 0.16, 0.02), C.pinkLt, -W / 2 + 0.14 + i * (W - 0.28) / 4, 0.03 + (H - 0.06) / 2, D / 2 - 0.01);
      part(s, box(W + 0.04, 0.05, D + 0.04), C.mint, 0, H + 0.025, 0);
      scallops(s, 0, H, D / 2 + 0.02, W + 0.04, 10, 0.06, C.cream);
      const gy = H + 0.05, GH = 0.46;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => part(s, box(0.035, GH, 0.035), C.mintDk, sx * (W / 2 - 0.02), gy + GH / 2, sz * (D / 2 - 0.02)));
      part(s, box(W - 0.06, 0.02, D - 0.06), C.cream, 0, gy + GH * 0.5, 0);
      part(s, box(W + 0.06, 0.05, D + 0.06), C.mint, 0, gy + GH + 0.025, 0);
      scallops(s, 0, gy + GH, D / 2 + 0.035, W + 0.06, 10, 0.055, C.pinkLt);
      part(gl, box(W - 0.04, GH, D - 0.04), 0, 0, gy + GH / 2, 0);
      plate(s, -0.28, gy, 0, 0.14); roundCake(s, -0.28, gy + 0.014, 0, 0.11, 0.12);
      plate(s, 0.06, gy, 0.02, 0.1, C.butter); slice(s, 0.06, gy + 0.014, 0.02, 0.12, 0.1, 0.4);
      cupcake(s, 0.32, gy, 0.02, 0.07, C.mint, C.pink, true);
      const ty = gy + GH * 0.5 + 0.01;
      [[-0.34, C.pink, C.cream], [-0.17, C.butter, C.cocoa], [0.0, C.lilac, C.mint]].forEach(([x, cup, fr], i) => cupcake(s, x, ty, 0.04, 0.055, cup, fr, i !== 1));
      plate(s, 0.28, ty, 0, 0.13, C.lilac); roundCake(s, 0.28, ty + 0.013, 0, 0.1, 0.1, C.cocoa, C.mint);
      cupcake(s, 0, gy + GH + 0.05, 0, 0.11, C.pink, C.cream, true);
    },
    B(s, gl) {
      const W = 0.74, D = 0.42, H = 1.42;
      part(s, box(W, 0.1, D), C.mintDk, 0, 0.05, 0);
      [-1, 1].forEach(sx => part(s, box(0.05, H, D), C.mint, sx * (W / 2 - 0.025), H / 2, 0));
      part(s, box(W, H, 0.03), C.mint, 0, H / 2, -D / 2 + 0.015);
      part(s, box(W - 0.06, H - 0.1, 0.01), C.pinkLt, 0, H / 2, -D / 2 + 0.035);
      part(s, box(W, 0.06, D + 0.04), C.mintDk, 0, H, 0);
      part(s, box(W - 0.1, 0.32, D - 0.04), C.mint, 0, 0.26, 0);
      [-1, 1].forEach(sx => { part(s, box(W / 2 - 0.1, 0.22, 0.02), C.pinkLt, sx * (W / 4 - 0.02), 0.26, D / 2 - 0.015); part(s, sph(0.035, 8, 6), C.butter, sx * 0.06, 0.27, D / 2 + 0.005); });
      [0.44, 0.8, 1.12].forEach(y => { part(s, box(W - 0.1, 0.025, D - 0.06), C.cream, 0, y, 0); scallops(s, 0, y - 0.012, (D - 0.06) / 2 + 0.005, W - 0.1, 8, 0.03, C.pink); });
      part(gl, box(W - 0.1, H - 0.48, 0.02), 0, 0, 0.42 + (H - 0.48) / 2, D / 2 - 0.02);
      part(s, box(0.025, H - 0.46, 0.03), C.mintDk, 0, 0.42 + (H - 0.48) / 2, D / 2 - 0.01);
      plate(s, -0.14, 0.455, 0, 0.12); roundCake(s, -0.14, 0.468, 0, 0.1, 0.13);
      cupcake(s, 0.16, 0.455, 0.03, 0.065, C.butter, C.pink, true);
      [[C.vanilla, C.cream, C.berry, C.vanilla, C.pink], [C.cocoa, C.cream, C.cocoa, C.cream, C.cocoaDk], [C.vanilla, C.mint, C.vanilla, C.mint, C.lilac]].forEach((cols, i) => slice(s, -0.18 + i * 0.18, 0.815, 0, 0.1, 0.09, 0.3 + i, cols));
      plate(s, 0, 1.135, 0, 0.16, C.lilac);
      [[-0.07, -0.02, C.pink], [0.07, -0.02, C.mint], [0, 0.07, C.butter], [-0.02, -0.08, C.sky]].forEach(([x, z, c]) => { part(s, sph(0.045, 10, 8), c, x, 1.17, z).scale.set(1, 0.6, 1); part(s, cyl(0.04, 0.04, 0.012, 10), C.cream, x, 1.17, z); });
      stripeRoof(s, 0, H + 0.07, 0.02, W + 0.12, D + 0.14, 7, [C.pink, C.cream]);
      cupcake(s, 0, H + 0.1, 0, 0.12, C.mint, C.pink, true);
    },
    C(s, gl) {
      part(s, cyl(0.24, 0.28, 0.05, 18), C.pinkDk, 0, 0.025, 0);
      rod(s, [0, 0.05, 0], [0, 0.5, 0], 0.05, C.pink, 10, 0.07);
      part(s, cyl(0.3, 0.26, 0.05, 20), C.pink, 0, 0.525, 0);
      for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; part(s, sph(0.035, 6, 5), C.cream, Math.cos(a) * 0.29, 0.53, Math.sin(a) * 0.29).scale.y = 0.7; }
      const y0 = 0.55;
      rod(s, [0, y0, 0], [0, y0 + 0.47, 0], 0.014, C.butter, 8);
      [[0.26, y0 + 0.01, C.mint], [0.19, y0 + 0.24, C.butter], [0.12, y0 + 0.45, C.lilac]].forEach(([r, y, c]) => part(s, cyl(r, r * 0.86, 0.025, 20), c, 0, y + 0.012, 0));
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + 0.6; cupcake(s, Math.cos(a) * 0.17, y0 + 0.025, Math.sin(a) * 0.17, 0.05, [C.pink, C.butter, C.lilac, C.sky, C.pink][i], i % 2 ? C.cocoa : C.cream, Math.sin(a) > 0); }
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + 0.4; const m = part(s, sph(0.05, 12, 8), [C.pink, C.mint, C.lilac, C.butter, C.sky][i], Math.cos(a) * 0.12, y0 + 0.28, Math.sin(a) * 0.12); m.scale.set(1, 0.55, 1); part(s, cyl(0.045, 0.045, 0.012, 10), C.cream, Math.cos(a) * 0.12, y0 + 0.28, Math.sin(a) * 0.12); }
      roundCake(s, 0, y0 + 0.47, 0, 0.08, 0.08);
      part(gl, sph(0.32, 20, 12, 0, TAU, 0, Math.PI / 2), 0, 0, y0 + 0.02, 0).scale.set(1, 2.0, 1);
      part(s, torus(0.32, 0.02, 4, 28), C.pinkLt, 0, y0 + 0.03, 0).rotation.x = Math.PI / 2;
      berry(s, 0, y0 + 0.64, 0, 0.1);
    },
  },
  ds_pudding_chair: {
    A(s) {
      part(s, cyl(0.31, 0.31, 0.035, 20), C.mint, 0, 0.0175, 0);
      for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; part(s, sph(0.035, 6, 4), C.mint, Math.cos(a) * 0.31, 0.03, Math.sin(a) * 0.31).scale.y = 0.6; }
      pudding(s, 0, 0.035, 0, 0.26, 0.38, true);
    },
    B(s) {
      const R = 0.38, H = 0.5, ang0 = 0.85, arc = TAU - 2 * ang0;
      part(s, cyl(R * 0.8, R * 0.85, 0.06, 20), C.pinkDk, 0, 0.03, 0);
      part(s, cyl(R, R * 0.78, H, 24, 1, true, ang0, arc), C.pink, 0, 0.06 + H / 2, 0);
      for (let i = 0; i <= 16; i++) { const a = ang0 + arc * i / 16; part(s, sph(0.05, 8, 6), i % 2 ? C.pinkLt : C.pink, Math.sin(a) * R, 0.06 + H + 0.01, Math.cos(a) * R); }
      for (let i = 0; i <= 10; i++) { const a = ang0 + arc * i / 10; part(s, sph(0.03, 6, 5), C.cream, Math.sin(a) * R * 0.9, 0.06 + H * 0.5, Math.cos(a) * R * 0.9); }
      [-1, 1].forEach(sx => { const a = sx * ang0; rod(s, [Math.sin(a) * R * 0.8, 0.06, Math.cos(a) * R * 0.8], [Math.sin(a) * R, 0.06 + H, Math.cos(a) * R], 0.03, C.pinkDk, 6); });
      pudding(s, 0, 0.06, 0.02, R * 0.72, 0.22, true);
      const back = grp(s, 0, 0.33, -R * 0.52); back.rotation.x = -0.25;
      for (let i = 0; i < 3; i++) { const rr = 0.2 * (1 - i * 0.28); part(back, torus(rr * 0.62, rr * 0.38, 7, 14), C.cream, 0, rr * 0.4 + i * 0.09, 0).rotation.x = Math.PI / 2; }
      part(back, cone(0.05, 0.08, 8), C.cream, 0, 0.32, 0);
      part(back, sph(0.07, 10, 8), C.berry, 0, 0.4, 0);
      [[-0.2, 0.42, 0.0, C.mint], [0.21, 0.42, 0.0, C.butter]].forEach(([x, y, z, c]) => part(s, sph(0.08, 10, 8), c, x, y, z).scale.set(1, 0.6, 1));
    },
    C(s) {
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => rod(s, [sx * 0.2, 0, sz * 0.2], [sx * 0.19, 0.32, sz * 0.19], 0.025, C.pink, 6, 0.032));
      part(s, box(0.5, 0.05, 0.5), C.pinkDk, 0, 0.335, 0);
      scallops(s, 0, 0.31, 0.26, 0.5, 6, 0.042, C.pinkLt);
      pudding(s, 0, 0.36, 0.02, 0.22, 0.12, false);
      [-1, 1].forEach(sx => rod(s, [sx * 0.19, 0.33, -0.19], [sx * 0.16, 0.62, -0.21], 0.024, C.pink, 6));
      part(s, box(0.4, 0.035, 0.045), C.pinkDk, 0, 0.6, -0.21);
      rod(s, [0, 0.36, -0.22], [0, 0.66, -0.23], 0.04, C.lilac, 8);
      part(s, sph(0.21, 16, 10), C.lilac, 0, 0.86, -0.23).scale.set(1, 1.2, 0.3);
      part(s, sph(0.17, 14, 8), C.lilacDk, 0, 0.86, -0.2).scale.set(1, 1.18, 0.12);
      const hg = grp(s, 0, 0.88, -0.17); hg.rotation.x = -Math.PI / 2; flatHeart(hg, 0.07, 0.02, C.pink, 0);
    },
  },
  ds_waffle_rug: {
    A(s) {
      const W = 1.4, D = 1.0;
      part(s, box(W, 0.02, D), C.waferDk, 0, 0.01, 0);
      [[0, D / 2, W + 0.04, 0.05], [0, -D / 2, W + 0.04, 0.05]].forEach(([x, z, w, d]) => part(s, box(w, 0.045, d), C.wafer, x, 0.022, z));
      [W / 2, -W / 2].forEach(x => part(s, box(0.05, 0.045, D), C.wafer, x, 0.022, 0));
      waffleGrid(s, () => true, W - 0.04, D - 0.04, 0.12, C.wafer, 0.032);
      part(s, box(0.24, 0.05, 0.18), C.butter, 0.12, 0.068, 0.04).rotation.y = 0.3;
      const pts = [V(-0.55, 0.055, -0.32), V(-0.2, 0.055, -0.1), V(0.0, 0.055, 0.15), V(0.3, 0.055, 0.05), V(0.56, 0.055, 0.3)];
      part(s, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.04, 6, false), C.caramel).scale.y = 0.7;
      [[-0.45, -0.38], [0.6, 0.36], [-0.1, 0.0]].forEach(([x, z]) => part(s, sph(0.05, 8, 5), C.caramel, x, 0.04, z).scale.set(1, 0.35, 1.3));
      [[-0.45, 0.25, 0.3], [-0.28, 0.33, 1.2], [0.45, -0.25, 2.0], [0.28, -0.33, 0.6], [-0.52, -0.05, 2.6]].forEach(([x, z, r]) => berrySlice(s, x, 0.055, z, 0.075, r));
      [[0.5, 0.12, C.pink], [-0.2, -0.3, C.cream], [0.35, 0.35, C.cream], [-0.55, 0.42, C.pink]].forEach(([x, z, c]) => dollop(s, x, 0.04, z, 0.065, c, 2));
    },
    B(s) {
      const R = 0.65;
      part(s, cyl(R, R, 0.02, 32), C.waferDk, 0, 0.01, 0);
      part(s, torus(R, 0.04, 5, 40), C.wafer, 0, 0.035, 0).rotation.x = Math.PI / 2;
      waffleGrid(s, (x, z) => x * x + z * z < (R - 0.03) ** 2, 2 * R, 2 * R, 0.13, C.wafer, 0.032);
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * TAU, x = Math.cos(a) * R * 0.78, z = Math.sin(a) * R * 0.78;
        if (i % 2) { dollop(s, x, 0.04, z, 0.075, C.cream, 2); continue; }
        berrySlice(s, x, 0.06, z, 0.085, -a);
      }
      part(s, cyl(0.13, 0.13, 0.035, 16), C.butter, 0, 0.06, 0);
      [0.4, 1.9, 3.6, 5.0].forEach(a => part(s, sph(0.07, 8, 5), C.pink, Math.cos(a) * 0.2, 0.045, Math.sin(a) * 0.2).scale.set(1.3, 0.3, 0.8));
    },
    C(s) {
      const sz = 0.38, n = 5;
      for (let i = 0; i < n; i++) {
        const a = i / n * TAU;
        const hg = grp(s, Math.sin(a) * sz * 1.05, 0, Math.cos(a) * sz * 1.05); hg.rotation.y = a;
        flatHeart(hg, sz, 0.035, C.wafer, 0);
        flatHeart(hg, sz * 0.8, 0.012, C.waferDk, 0.03).position.z = sz * 0.04;
        for (let k = 0; k < 6; k++) { const px = ((k % 3) - 1) * sz * 0.34, pz = -sz * 0.05 + Math.floor(k / 3) * sz * 0.38; part(hg, box(sz * 0.2, 0.022, sz * 0.2), C.wafer, px, 0.05, pz); }
        sprinkles(hg, 0, 0.065, sz * 0.15, sz * 0.5, 6);
      }
      part(s, cyl(0.22, 0.22, 0.045, 20), C.wafer, 0, 0.022, 0);
      part(s, cyl(0.17, 0.17, 0.035, 18), C.berry, 0, 0.055, 0);
      for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; part(s, sph(0.035, 6, 5), C.berryDk, Math.cos(a) * 0.09, 0.072, Math.sin(a) * 0.09); }
      part(s, sph(0.05, 8, 6), C.pinkLt, 0, 0.075, 0).scale.y = 0.5;
    },
  },
  ds_icecream_cart: {
    A(s) {
      const W = 1.0, D = 0.55, y0 = 0.32, H = 0.5;
      part(s, box(W, H, D), C.mint, 0.05, y0 + H / 2, 0);
      part(s, box(W + 0.02, 0.08, D + 0.02), C.pinkLt, 0.05, y0 + H * 0.62, 0);
      scallops(s, 0.05, y0 + H * 0.58, D / 2 + 0.015, W, 9, 0.05, C.pinkLt);
      part(s, box(W + 0.06, 0.05, D + 0.06), C.mintDk, 0.05, y0 + H + 0.025, 0);
      [[-0.2, C.pink], [0.05, C.butter], [0.3, C.cocoa]].forEach(([x, c]) => { part(s, cyl(0.1, 0.1, 0.03, 14), C.pinkDk, x, y0 + H + 0.06, 0); part(s, sph(0.095, 12, 8, 0, TAU, 0, Math.PI / 2), c, x, y0 + H + 0.07, 0); sprinkles(s, x, y0 + H + 0.14, 0, 0.06, 4); });
      [-1, 1].forEach(sz => wheel(s, -0.18, 0.28, sz * (D / 2 + 0.04), 0.28));
      rod(s, [-0.18, 0.28, -D / 2 - 0.04], [-0.18, 0.28, D / 2 + 0.04], 0.02, C.pinkDk);
      [-1, 1].forEach(sz => rod(s, [0.5, y0 + 0.02, sz * 0.2], [0.52, 0, sz * 0.22], 0.025, C.mintDk));
      [-1, 1].forEach(sz => rod(s, [0.55, y0 + H * 0.6, sz * 0.22], [0.78, y0 + H * 0.95, sz * 0.22], 0.02, C.mintDk));
      rod(s, [0.78, y0 + H * 0.95, -0.24], [0.78, y0 + H * 0.95, 0.24], 0.035, C.pink);
      rod(s, [-0.35, y0 + H, -0.15], [-0.35, 1.72, -0.15], 0.022, C.pinkLt);
      parasol(s, -0.35, 1.72, -0.15, 0.64, 0.22, [C.pink, C.butter]);
      const sg = grp(s, 0.12, y0 + H * 0.28, D / 2 + 0.02);
      part(sg, cone(0.09, 0.22, 10), C.wafer, 0, -0.02, 0).rotation.x = Math.PI;
      part(sg, sph(0.1, 12, 10), C.pink, 0, 0.12, 0);
      face(sg, 0, 0.12, 0.09, 0.11);
      part(sg, sph(0.03, 6, 5), C.berry, 0, 0.23, 0);
    },
    B(s) {
      const W = 0.7, D = 0.6, y0 = 0.3, H = 0.42, bx = 0.32;
      part(s, box(W, H, D), C.pink, bx, y0 + H / 2, 0);
      part(s, box(W + 0.02, 0.08, D + 0.02), C.butter, bx, y0 + H * 0.55, 0);
      face(s, bx, y0 + H * 0.28, D / 2 + 0.01, 0.16);
      part(s, box(W + 0.04, 0.04, D + 0.04), C.pinkDk, bx, y0 + H + 0.02, 0);
      [-1, 1].forEach(sz => wheel(s, bx, 0.24, sz * (D / 2 + 0.05), 0.24, C.mintDk));
      wheel(s, -0.62, 0.24, 0, 0.24, C.mintDk);
      rod(s, [bx - W / 2, y0 + 0.1, 0], [-0.62, 0.24, 0], 0.03, C.mintDk);
      rod(s, [-0.3, 0.3, 0], [-0.32, 0.72, 0], 0.03, C.mintDk);
      part(s, box(0.2, 0.06, 0.14), C.berry, -0.33, 0.75, 0);
      rod(s, [-0.62, 0.24, 0], [-0.33, 0.72, 0], 0.025, C.mintDk);
      rod(s, [bx - W / 2, y0 + H * 0.85, 0], [-0.1, 0.86, 0], 0.025, C.mintDk);
      rod(s, [-0.1, 0.86, -0.2], [-0.1, 0.86, 0.2], 0.022, C.mintDk);
      [-1, 1].forEach(sz => part(s, cyl(0.03, 0.03, 0.08, 8), C.pink, -0.1, 0.86, sz * 0.22).rotation.x = Math.PI / 2);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => rod(s, [bx + sx * (W / 2 - 0.03), y0 + H, sz * (D / 2 - 0.03)], [bx + sx * (W / 2 - 0.03), y0 + H + 0.62, sz * (D / 2 - 0.03)], 0.016, C.pinkLt));
      stripeRoof(s, bx, y0 + H + 0.64, 0, W + 0.18, D + 0.18, 6, [C.mint, C.cream]);
      [[-0.12, C.pink], [0.08, C.mint], [0.24, C.butter]].forEach(([x, c], i) => {
        part(s, cone(0.055, 0.14, 10), C.wafer, bx + x, y0 + H + 0.1, 0.1 - i * 0.08).rotation.x = Math.PI;
        part(s, sph(0.065, 12, 8), c, bx + x, y0 + H + 0.2, 0.1 - i * 0.08);
        part(s, sph(0.018, 6, 5), C.berry, bx + x, y0 + H + 0.27, 0.1 - i * 0.08);
      });
    },
    C(s) {
      const W = 0.9, D = 0.5, y0 = 0.18, H = 0.28;
      part(s, box(W, H, D), C.pink, 0, y0 + H / 2, 0);
      part(s, box(W + 0.04, 0.04, D + 0.04), C.pinkDk, 0, y0 + H, 0);
      for (let i = 0; i < 4; i++) part(s, box(0.06, H - 0.06, D + 0.01), C.pinkLt, -W / 2 + 0.18 + i * 0.18, y0 + H / 2, 0);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => wheel(s, sx * 0.3, 0.13, sz * (D / 2 + 0.03), 0.13, C.mintDk, C.cream, C.butter));
      rod(s, [W / 2, y0 + 0.1, 0], [W / 2 + 0.35, y0 + 0.3, 0], 0.025, C.mintDk);
      part(s, torus(0.06, 0.02, 5, 12), C.mintDk, W / 2 + 0.4, y0 + 0.33, 0).rotation.y = Math.PI / 2;
      const cy = y0 + H + 0.02, coneH = 0.6;
      part(s, cyl(0.2, 0.2, 0.04, 16), C.butter, 0, cy + 0.02, 0);
      part(s, cone(0.2, coneH, 14), C.wafer, 0, cy + 0.04 + coneH / 2, 0).rotation.x = Math.PI;
      for (let i = 0; i < 5; i++) { const t = (i + 0.5) / 5; part(s, torus(0.2 * t + 0.003, 0.009, 4, 16), C.waferDk, 0, cy + 0.04 + coneH * t, 0).rotation.x = Math.PI / 2; }
      const top = cy + 0.04 + coneH;
      part(s, sph(0.22, 16, 12), C.pink, 0, top + 0.08, 0);
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; part(s, sph(0.06, 8, 6), C.pink, Math.cos(a) * 0.2, top, Math.sin(a) * 0.2); }
      face(s, 0, top + 0.07, 0.2, 0.2).rotation.x = -0.1;
      part(s, sph(0.18, 16, 12), C.mint, 0.02, top + 0.32, 0);
      part(s, sph(0.14, 14, 10), C.butter, -0.01, top + 0.52, 0);
      part(s, sph(0.05, 8, 6), C.berry, 0, top + 0.68, 0);
      rod(s, [0, top + 0.72, 0], [0.05, top + 0.8, 0], 0.008, C.leaf, 4);
      for (let i = 0; i < 16; i++) {
        const a = i * 2.39996, yy = top + 0.22 + (i / 16) * 0.38, rr = yy < top + 0.42 ? 0.18 : 0.14;
        part(s, capsule(0.012, 0.04), SPR[i % SPR.length], Math.cos(a) * rr, yy, Math.sin(a) * rr).rotation.set(1 + i, 0.5 * i, 0);
      }
    },
  },
};

export function build(id, v) {
  const fn = BUILD[id]?.[v];
  if (!fn) throw new Error(`unknown dessert pick v2 decor: ${id}/${v}`);
  const solid = new THREE.Group(), glass = new THREE.Group();
  fn(solid, glass);
  const out = new THREE.Group();
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }));
  body.castShadow = true; body.receiveShadow = true;
  out.add(body);
  if (glass.children.length) {
    const gm = new THREE.Mesh(bakeGroup(glass), new THREE.MeshStandardMaterial({ color: 0xcfe3e8, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.2, depthWrite: false }));
    gm.userData.noShadow = true; gm.renderOrder = 1; out.add(gm);
  }
  return out;
}
