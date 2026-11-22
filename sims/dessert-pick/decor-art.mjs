import * as THREE from 'three';
import { bakeGroup, part } from '../../js/dream/art.js';

export const IDS = ['ds_cake_case', 'ds_pudding_chair', 'ds_waffle_rug', 'ds_icecream_cart'];
export const VARIANTS = ['A', 'B', 'C'];

export const C = {
  cream: 0xe6d6bc, creamDk: 0xcdb896, sponge: 0xdcb377, spongeDk: 0xb98e55,
  berry: 0xd2414f, berryDk: 0xa52f3c, leaf: 0x5f9a4e,
  pink: 0xe8a2ad, pinkDk: 0xc97885, mint: 0x93cdb4, mintDk: 0x6aa98f,
  lilac: 0xb9a3d6, lilacDk: 0x9580b8, lemon: 0xe6cc6c,
  choc: 0x6b4430, chocDk: 0x4a2e20, wafer: 0xc99a58, waferDk: 0xa27840,
  custard: 0xe3be62, caramel: 0x9a5a2a, caramelDk: 0x7a4420,
  wood: 0xb07c4a, woodDk: 0x7d5534, metal: 0x8c8f96, metalDk: 0x5d6068, butter: 0xe8d27a,
};

export const META = {
  ds_cake_case: {
    A: { name: '빵집 카운터 진열장', note: '분홍 판 카운터 + 유리 상자 두 칸 · 홀케이크·조각 케이크·컵케이크', foot: [1.1, 0.6] },
    B: { name: '키 큰 유리 찬장', note: '민트 찬장 유리문 · 세 칸 선반에 케이크 · 꼭대기 줄무늬 차양', foot: [0.8, 0.5] },
    C: { name: '3단 스탠드 + 유리 덮개', note: '둥근 받침대 위 3단 케이크 접시 · 큰 유리 종 덮개', foot: [0.6, 0.6] },
  },
  ds_pudding_chair: {
    A: { name: '푸딩 스툴', note: '통째 푸딩 모양 등받이 없는 의자 · 위 캐러멜이 흘러내림 · 접시 받침', foot: [0.6, 0.6] },
    B: { name: '숟가락 등받이 의자', note: '나무 다리 의자 · 앉는 곳은 푸딩 방석 · 등받이가 큰 나무 숟가락', foot: [0.6, 0.6] },
    C: { name: '푸딩 컵 소파', note: '앞이 트인 라벤더 푸딩 컵 · 안에 푸딩 방석 + 크림·체리 등쿠션', foot: [0.8, 0.75] },
  },
  ds_waffle_rug: {
    A: { name: '네모 와플 러그', note: '격자 네모 와플 · 버터 한 조각 + 시럽 줄기', foot: [1.4, 1.0] },
    B: { name: '둥근 와플 러그', note: '둥근 와플 · 가장자리에 딸기 조각과 크림 꽃', foot: [1.3, 1.3] },
    C: { name: '하트 꽃 와플 러그', note: '하트 다섯 장이 모인 꽃 와플 · 가운데 딸기잼', foot: [1.4, 1.35] },
  },
  ds_icecream_cart: {
    A: { name: '파라솔 수레', note: '민트 수레 + 큰 바퀴 둘 · 아이스크림 통 셋 · 분홍 줄무늬 파라솔 + 콘 간판', foot: [1.6, 0.8] },
    B: { name: '세발자전거 수레', note: '앞 바퀴 둘 냉동 상자 + 뒤 안장·핸들 · 줄무늬 차양 지붕', foot: [1.5, 0.8] },
    C: { name: '큰 콘 조형 수레', note: '분홍 짐수레 위에 세 덩이 큰 아이스크림 콘 · 체리', foot: [1.3, 0.7] },
  },
};

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

function rod(p, a, b, r, col, seg = 6, r2 = r) {
  const A = V(...a), B = V(...b), d = B.clone().sub(A);
  const m = part(p, cyl(r2, r, d.length(), seg), col, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  return m;
}

function dollop(p, x, y, z, r, col = C.cream, turns = 3) {
  for (let i = 0; i < turns; i++) {
    const rr = r * (1 - (i / turns) * 0.62);
    part(p, torus(rr * 0.62, rr * 0.38, 6, 12), col, x, y + r * 0.42 * i, z).rotation.x = Math.PI / 2;
  }
  part(p, cone(r * 0.28, r * 0.42, 8), col, x, y + r * 0.42 * turns - r * 0.05, z);
}

function berry(p, x, y, z, s) {
  part(p, sph(s * 0.5, 8, 6), C.berry, x, y + s * 0.45, z).scale.set(1, 1.15, 1);
  part(p, cone(s * 0.42, s * 0.4, 8), C.berry, x, y + s * 0.1, z).rotation.x = Math.PI;
  part(p, cone(s * 0.32, s * 0.12, 5), C.leaf, x, y + s * 1.0, z);
}

function roundCake(p, x, y, z, r, h, cols = [C.sponge, C.cream, C.sponge, C.cream]) {
  let yy = y;
  cols.forEach(c => { const hh = h / cols.length; part(p, cyl(r, r, hh, 16), c, x, yy + hh / 2, z); yy += hh; });
  for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; part(p, sph(r * 0.13, 6, 5), C.cream, x + Math.cos(a) * r * 0.78, yy + r * 0.04, z + Math.sin(a) * r * 0.78); }
  berry(p, x, yy, z, r * 0.45);
}

function slice(p, x, y, z, r, h, rotY, cols = [C.choc, C.cream, C.choc, C.pink]) {
  const g = grp(p, x, y, z); g.rotation.y = rotY;
  let yy = 0;
  cols.forEach(c => {
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.absarc(0, 0, r, -0.5, 0.5, false); sh.lineTo(0, 0);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: h / cols.length, bevelEnabled: false, curveSegments: 6 }); geo.rotateX(-Math.PI / 2);
    part(g, geo, c, -r * 0.5, yy, 0); yy += h / cols.length;
  });
  berry(g, r * 0.2, yy, 0, r * 0.3);
}

function cupcake(p, x, y, z, s, cup, frost) {
  part(p, cyl(s * 0.82, s * 0.62, s * 0.85, 12), cup, x, y + s * 0.425, z);
  dollop(p, x, y + s * 0.9, z, s * 0.8, frost, 3);
  part(p, sph(s * 0.16, 6, 5), C.berry, x, y + s * 0.9 + s * 1.05, z);
}

function plate(p, x, y, z, r, col = C.cream) {
  part(p, cyl(r, r * 0.8, r * 0.1, 18), col, x, y + r * 0.05, z);
}

function stripeRoof(p, x, y, z, w, d, n, cols) {
  for (let i = 0; i < n; i++) part(p, box(w / n, 0.04, d), cols[i % cols.length], x - w / 2 + w / n * (i + 0.5), y, z);
  for (let i = 0; i < n; i++) part(p, sph(w / n * 0.5, 8, 5, 0, TAU, Math.PI / 2, Math.PI / 2), cols[i % cols.length], x - w / 2 + w / n * (i + 0.5), y - 0.02, z + d / 2).scale.set(1, 0.9, 0.5);
}

function wheel(p, x, y, z, r, col = C.cream, hub = C.pinkDk) {
  part(p, torus(r * 0.85, r * 0.15, 6, 18), C.chocDk, x, y, z);
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; rod(p, [x + Math.cos(a) * r * 0.1, y + Math.sin(a) * r * 0.1, z], [x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75, z], r * 0.05, col, 4); }
  part(p, cyl(r * 0.16, r * 0.16, r * 0.25, 10), hub, x, y, z).rotation.x = Math.PI / 2;
}

function parasol(p, x, y, z, r, h, cols) {
  const n = 10;
  for (let i = 0; i < n; i++) part(p, cone(r, h, 3, 1, true, i / n * TAU, TAU / n), cols[i % cols.length], x, y, z);
  part(p, cyl(r * 0.98, r * 0.98, 0.012, 20), cols[1], x, y - h / 2 - 0.006, z);
  for (let i = 0; i < n; i++) { const a = (i + 0.5) / n * TAU; part(p, sph(r * 0.06, 6, 4), cols[i % cols.length], x + Math.sin(a) * r, y - h / 2 - 0.02, z + Math.cos(a) * r); }
  part(p, sph(0.035, 8, 6), C.berry, x, y + h / 2 + 0.02, z);
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
  for (let i = 0; i <= nx; i++) { const x = -w / 2 + i * w / nx; run(nz, d, z => inside(x, z), (a, b) => part(p, box(cell * 0.28, h, b - a), ridge, x, h / 2 + 0.01, (a + b) / 2)); }
  for (let j = 0; j <= nz; j++) { const z = -d / 2 + j * d / nz; run(nx, w, x => inside(x, z), (a, b) => part(p, box(b - a, h, cell * 0.28), ridge, (a + b) / 2, h / 2 + 0.01, z)); }
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

const BUILD = {
  ds_cake_case: {
    A(s, gl) {
      const W = 1.05, D = 0.52, H = 0.55;
      part(s, box(W, 0.06, D), C.woodDk, 0, 0.03, 0);
      part(s, box(W - 0.04, H - 0.06, D - 0.04), C.pink, 0, 0.06 + (H - 0.06) / 2, 0);
      for (let i = 0; i < 5; i++) part(s, box(0.025, H - 0.14, 0.02), C.pinkDk, -W / 2 + 0.12 + i * (W - 0.24) / 4, 0.06 + (H - 0.06) / 2, D / 2 - 0.01);
      part(s, box(W + 0.04, 0.05, D + 0.04), C.cream, 0, H + 0.025, 0);
      const gy = H + 0.05, GH = 0.46;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => part(s, box(0.03, GH, 0.03), C.woodDk, sx * (W / 2 - 0.02), gy + GH / 2, sz * (D / 2 - 0.02)));
      part(s, box(W - 0.06, 0.02, D - 0.06), C.creamDk, 0, gy + GH * 0.5, 0);
      part(s, box(W, 0.04, D), C.wood, 0, gy + GH + 0.02, 0);
      part(gl, box(W - 0.04, GH, D - 0.04), 0, 0, gy + GH / 2, 0);
      plate(s, -0.3, gy, 0, 0.13); roundCake(s, -0.3, gy + 0.013, 0, 0.11, 0.12);
      plate(s, 0.05, gy, 0.02, 0.1); slice(s, 0.05, gy + 0.01, 0.02, 0.12, 0.1, 0.4);
      cupcake(s, 0.3, gy, -0.05, 0.06, C.mint, C.pink); cupcake(s, 0.38, gy, 0.08, 0.06, C.lilac, C.cream);
      const ty = gy + GH * 0.5 + 0.01;
      [[-0.32, C.pink, C.cream], [-0.17, C.lemon, C.choc], [-0.02, C.mint, C.cream]].forEach(([x, cup, fr]) => cupcake(s, x, ty, 0, 0.05, cup, fr));
      plate(s, 0.28, ty, 0, 0.13, C.lilac); roundCake(s, 0.28, ty + 0.013, 0, 0.1, 0.1, [C.choc, C.cream, C.choc]);
    },
    B(s, gl) {
      const W = 0.74, D = 0.42, H = 1.42;
      part(s, box(W, 0.1, D), C.mintDk, 0, 0.05, 0);
      [-1, 1].forEach(sx => part(s, box(0.05, H, D), C.mint, sx * (W / 2 - 0.025), H / 2, 0));
      part(s, box(W, H, 0.03), C.mint, 0, H / 2, -D / 2 + 0.015);
      part(s, box(W, 0.06, D + 0.04), C.mintDk, 0, H, 0);
      part(s, box(W - 0.1, 0.32, D - 0.04), C.mint, 0, 0.26, 0);
      [-1, 1].forEach(sx => part(s, box(0.025, 0.24, 0.02), C.mintDk, sx * (W / 4 - 0.01), 0.26, D / 2 - 0.015));
      [-1, 1].forEach(sx => part(s, sph(0.03, 8, 6), C.lemon, sx * 0.07, 0.27, D / 2 - 0.01));
      [0.44, 0.8, 1.12].forEach(y => part(s, box(W - 0.1, 0.025, D - 0.06), C.cream, 0, y, 0));
      part(gl, box(W - 0.1, H - 0.48, 0.02), 0, 0, 0.42 + (H - 0.48) / 2, D / 2 - 0.02);
      part(s, box(0.025, H - 0.46, 0.03), C.mintDk, 0, 0.42 + (H - 0.48) / 2, D / 2 - 0.01);
      plate(s, -0.14, 0.455, 0, 0.12); roundCake(s, -0.14, 0.468, 0, 0.1, 0.13);
      cupcake(s, 0.15, 0.455, 0.02, 0.06, C.pink, C.cream);
      [[C.choc, C.cream, C.choc, C.pink], [C.sponge, C.cream, C.sponge, C.cream], [C.choc, C.mint, C.choc, C.mint]].forEach((cols, i) => slice(s, -0.18 + i * 0.18, 0.815, 0, 0.1, 0.09, 0.3 + i, cols));
      plate(s, 0, 1.135, 0, 0.16, C.lilac);
      [[-0.07, -0.02, C.pink], [0.07, -0.02, C.mint], [0, 0.07, C.lemon]].forEach(([x, z, c]) => part(s, sph(0.045, 10, 8), c, x, 1.17, z).scale.set(1, 0.6, 1));
      stripeRoof(s, 0, H + 0.07, 0.02, W + 0.1, D + 0.12, 7, [C.pink, C.cream]);
      dollop(s, 0, H + 0.09, 0, 0.09, C.cream, 3); berry(s, 0, H + 0.2, 0, 0.07);
    },
    C(s, gl) {
      part(s, cyl(0.24, 0.28, 0.05, 16), C.woodDk, 0, 0.025, 0);
      rod(s, [0, 0.05, 0], [0, 0.5, 0], 0.05, C.wood, 10, 0.07);
      part(s, cyl(0.3, 0.26, 0.05, 20), C.pink, 0, 0.525, 0);
      part(s, torus(0.3, 0.02, 4, 24), C.cream, 0, 0.55, 0).rotation.x = Math.PI / 2;
      const y0 = 0.55;
      rod(s, [0, y0, 0], [0, y0 + 0.47, 0], 0.012, C.lemon, 8);
      [[0.26, y0 + 0.01], [0.19, y0 + 0.24], [0.12, y0 + 0.45]].forEach(([r, y]) => part(s, cyl(r, r * 0.86, 0.02, 20), C.cream, 0, y + 0.01, 0));
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; cupcake(s, Math.cos(a) * 0.17, y0 + 0.02, Math.sin(a) * 0.17, 0.045, [C.pink, C.mint, C.lilac, C.lemon, C.pink][i], i % 2 ? C.choc : C.cream); }
      for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.4; part(s, sph(0.05, 10, 6), [C.pink, C.mint, C.lilac, C.lemon][i], Math.cos(a) * 0.12, y0 + 0.27, Math.sin(a) * 0.12).scale.set(1, 0.55, 1); }
      roundCake(s, 0, y0 + 0.47, 0, 0.08, 0.08);
      part(gl, sph(0.32, 20, 12, 0, TAU, 0, Math.PI / 2), 0, 0, y0 + 0.02, 0).scale.set(1, 2.0, 1);
      part(s, torus(0.32, 0.015, 4, 28), C.lemon, 0, y0 + 0.03, 0).rotation.x = Math.PI / 2;
      part(s, sph(0.04, 8, 6), C.lemon, 0, y0 + 0.68, 0);
    },
  },
  ds_pudding_chair: {
    A(s) {
      part(s, cyl(0.3, 0.3, 0.035, 20), C.cream, 0, 0.0175, 0);
      part(s, torus(0.3, 0.02, 4, 24), C.lilac, 0, 0.035, 0).rotation.x = Math.PI / 2;
      part(s, lathe([[0, 0.03], [0.25, 0.03], [0.255, 0.07], [0.22, 0.36], [0.2, 0.4], [0, 0.4]], 18), C.custard);
      part(s, lathe([[0, 0.36], [0.215, 0.36], [0.207, 0.40], [0.18, 0.44], [0, 0.445]], 18), C.caramel);
      for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, L = 0.05 + ((i * 5) % 3) * 0.035; part(s, capsule(0.025, L), C.caramel, Math.cos(a) * 0.218, 0.37 - L / 2, Math.sin(a) * 0.218); }
      dollop(s, 0.1, 0.44, -0.08, 0.05, C.cream, 2);
      part(s, sph(0.03, 8, 6), C.berry, 0.1, 0.5, -0.08);
    },
    B(s) {
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => rod(s, [sx * 0.2, 0, sz * 0.2], [sx * 0.19, 0.32, sz * 0.19], 0.025, C.wood, 6, 0.03));
      part(s, box(0.5, 0.05, 0.5), C.woodDk, 0, 0.335, 0);
      part(s, lathe([[0, 0.36], [0.24, 0.36], [0.24, 0.38], [0.215, 0.45], [0, 0.46]], 18), C.custard);
      part(s, lathe([[0, 0.44], [0.218, 0.44], [0.19, 0.47], [0, 0.475]], 18), C.caramel);
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, L = 0.03 + (i % 3) * 0.02; part(s, capsule(0.018, L), C.caramel, Math.cos(a) * 0.22, 0.445 - L / 2, Math.sin(a) * 0.22); }
      [-1, 1].forEach(sx => rod(s, [sx * 0.19, 0.33, -0.19], [sx * 0.16, 0.62, -0.21], 0.022, C.wood, 6));
      part(s, box(0.4, 0.03, 0.04), C.woodDk, 0, 0.6, -0.21);
      rod(s, [0, 0.36, -0.22], [0, 0.66, -0.23], 0.035, C.wood, 8);
      part(s, sph(0.2, 16, 10), C.wood, 0, 0.84, -0.23).scale.set(1, 1.2, 0.3);
      part(s, sph(0.17, 14, 8), C.woodDk, 0, 0.84, -0.2).scale.set(1, 1.18, 0.12);
      dollop(s, 0, 0.475, 0, 0.06, C.cream, 2);
      part(s, sph(0.035, 8, 6), C.berry, 0, 0.55, 0);
    },
    C(s) {
      const R = 0.38, H = 0.5, ang0 = 0.85, arc = TAU - 2 * ang0;
      part(s, cyl(R * 0.8, R * 0.85, 0.06, 20), C.lilacDk, 0, 0.03, 0);
      part(s, cyl(R, R * 0.78, H, 24, 1, true, ang0, arc), C.lilac, 0, 0.06 + H / 2, 0);
      for (let i = 0; i <= 14; i++) { const a = ang0 + arc * i / 14; part(s, sph(0.045, 8, 6), C.lilac, Math.sin(a) * R, 0.06 + H + 0.01, Math.cos(a) * R); }
      part(s, torus(R, 0.03, 5, 24, arc), C.lilacDk, 0, 0.06 + H, 0).rotation.set(Math.PI / 2, 0, Math.PI / 2 + ang0);
      [-1, 1].forEach(sx => { const a = sx * ang0; rod(s, [Math.sin(a) * R * 0.8, 0.06, Math.cos(a) * R * 0.8], [Math.sin(a) * R, 0.06 + H, Math.cos(a) * R], 0.03, C.lilacDk, 6); });
      part(s, lathe([[0, 0.06], [R * 0.72, 0.06], [R * 0.8, 0.28], [R * 0.78, 0.3], [0, 0.31]], 20), C.custard);
      part(s, lathe([[0, 0.29], [R * 0.79, 0.29], [R * 0.75, 0.33], [0, 0.335]], 20), C.caramel);
      for (let i = 0; i < 7; i++) { const a = -0.9 + i * 0.3; part(s, capsule(0.02, 0.05 + (i % 2) * 0.04), C.caramel, Math.sin(a) * R * 0.79, 0.26, Math.cos(a) * R * 0.79); }
      const back = grp(s, 0, 0.33, -R * 0.5); back.rotation.x = -0.25;
      for (let i = 0; i < 3; i++) { const rr = 0.2 * (1 - i * 0.28); part(back, torus(rr * 0.62, rr * 0.38, 7, 14), C.cream, 0, rr * 0.4 + i * 0.09, 0).rotation.x = Math.PI / 2; }
      part(back, cone(0.05, 0.08, 8), C.cream, 0, 0.32, 0);
      part(back, sph(0.07, 10, 8), C.berry, 0, 0.4, 0);
      [[-0.17, 0.36, 0.06, C.pink], [0.19, 0.37, 0.05, C.mint]].forEach(([x, y, z, c]) => part(s, sph(0.08, 10, 8), c, x, y, z).scale.set(1, 0.6, 1));
    },
  },
  ds_waffle_rug: {
    A(s) {
      const W = 1.4, D = 1.0;
      part(s, box(W, 0.02, D), C.waferDk, 0, 0.01, 0);
      [[0, D / 2, W + 0.04, 0.05], [0, -D / 2, W + 0.04, 0.05]].forEach(([x, z, w, d]) => part(s, box(w, 0.04, d), C.wafer, x, 0.02, z));
      [W / 2, -W / 2].forEach(x => part(s, box(0.05, 0.04, D), C.wafer, x, 0.02, 0));
      waffleGrid(s, () => true, W - 0.04, D - 0.04, 0.12, C.wafer, 0.03);
      part(s, box(0.22, 0.05, 0.16), C.butter, 0.15, 0.065, 0.05).rotation.y = 0.3;
      const pts = [V(-0.5, 0.06, -0.3), V(-0.2, 0.06, -0.1), V(0.0, 0.06, 0.15), V(0.3, 0.06, 0.05), V(0.55, 0.06, 0.3)];
      part(s, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.04, 6, false), C.caramel).scale.y = 0.7;
      [[-0.45, -0.38], [0.6, 0.36]].forEach(([x, z]) => part(s, sph(0.05, 8, 5), C.caramel, x, 0.035, z).scale.set(1, 0.35, 1.3));
    },
    B(s) {
      const R = 0.65;
      part(s, cyl(R, R, 0.02, 32), C.waferDk, 0, 0.01, 0);
      part(s, torus(R, 0.035, 5, 40), C.wafer, 0, 0.035, 0).rotation.x = Math.PI / 2;
      waffleGrid(s, (x, z) => x * x + z * z < (R - 0.03) ** 2, 2 * R, 2 * R, 0.13, C.wafer, 0.03);
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU, x = Math.cos(a) * R * 0.78, z = Math.sin(a) * R * 0.78;
        if (i % 2) { dollop(s, x, 0.04, z, 0.07, C.cream, 2); continue; }
        const sl = part(s, cyl(0.08, 0.08, 0.025, 12), C.berry, x, 0.055, z); sl.scale.set(0.85, 1, 1.15); sl.rotation.y = -a;
        const c2 = part(s, cyl(0.04, 0.04, 0.027, 10), C.pink, x, 0.056, z); c2.scale.set(0.85, 1, 1.25); c2.rotation.y = -a;
      }
      part(s, cyl(0.12, 0.12, 0.03, 16), C.butter, 0, 0.055, 0);
    },
    C(s) {
      const sz = 0.38, n = 5;
      for (let i = 0; i < n; i++) {
        const a = i / n * TAU;
        const hg = grp(s, Math.sin(a) * sz * 1.05, 0, Math.cos(a) * sz * 1.05); hg.rotation.y = a;
        flatHeart(hg, sz, 0.035, C.wafer, 0);
        flatHeart(hg, sz * 0.8, 0.012, C.waferDk, 0.03).position.z = sz * 0.04;
        for (let k = 0; k < 6; k++) { const px = ((k % 3) - 1) * sz * 0.34, pz = -sz * 0.05 + Math.floor(k / 3) * sz * 0.38; part(hg, box(sz * 0.2, 0.02, sz * 0.2), C.wafer, px, 0.05, pz); }
      }
      part(s, cyl(0.2, 0.2, 0.04, 20), C.wafer, 0, 0.02, 0);
      part(s, cyl(0.15, 0.15, 0.03, 16), C.berry, 0, 0.05, 0);
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; part(s, sph(0.03, 6, 5), C.berryDk, Math.cos(a) * 0.07, 0.065, Math.sin(a) * 0.07); }
    },
  },
  ds_icecream_cart: {
    A(s) {
      const W = 1.0, D = 0.55, y0 = 0.32, H = 0.5;
      part(s, box(W, H, D), C.mint, 0.05, y0 + H / 2, 0);
      part(s, box(W + 0.02, 0.08, D + 0.02), C.cream, 0.05, y0 + H * 0.55, 0);
      part(s, box(W + 0.06, 0.05, D + 0.06), C.mintDk, 0.05, y0 + H + 0.025, 0);
      [[-0.2, C.pink], [0.05, C.cream], [0.3, C.choc]].forEach(([x, c]) => { part(s, cyl(0.1, 0.1, 0.03, 14), C.metal, x, y0 + H + 0.06, 0); part(s, sph(0.09, 10, 6, 0, TAU, 0, Math.PI / 2), c, x, y0 + H + 0.07, 0); });
      [-1, 1].forEach(sz => wheel(s, -0.18, 0.28, sz * (D / 2 + 0.04), 0.28));
      rod(s, [-0.18, 0.28, -D / 2 - 0.04], [-0.18, 0.28, D / 2 + 0.04], 0.02, C.metalDk);
      [-1, 1].forEach(sz => rod(s, [0.5, y0 + 0.02, sz * 0.2], [0.52, 0, sz * 0.22], 0.025, C.metalDk));
      [-1, 1].forEach(sz => rod(s, [0.55, y0 + H * 0.6, sz * 0.22], [0.78, y0 + H * 0.95, sz * 0.22], 0.02, C.metalDk));
      rod(s, [0.78, y0 + H * 0.95, -0.24], [0.78, y0 + H * 0.95, 0.24], 0.03, C.pinkDk);
      rod(s, [-0.35, y0 + H, -0.15], [-0.35, 1.72, -0.15], 0.02, C.cream);
      parasol(s, -0.35, 1.72, -0.15, 0.62, 0.22, [C.pink, C.cream]);
      const sg = grp(s, 0.05, y0 + H * 0.3, D / 2 + 0.012);
      part(sg, cone(0.08, 0.2, 8), C.wafer, 0, -0.02, 0).rotation.x = Math.PI;
      part(sg, sph(0.08, 10, 8), C.pink, 0, 0.1, 0);
      part(sg, sph(0.03, 6, 5), C.berry, 0, 0.18, 0);
    },
    B(s) {
      const W = 0.7, D = 0.6, y0 = 0.3, H = 0.42, bx = 0.32;
      part(s, box(W, H, D), C.cream, bx, y0 + H / 2, 0);
      part(s, box(W + 0.02, 0.1, D + 0.02), C.pink, bx, y0 + 0.08, 0);
      part(s, box(W * 0.5, 0.14, 0.02), C.pinkDk, bx, y0 + H * 0.62, D / 2 + 0.01);
      part(s, box(W + 0.04, 0.04, D + 0.04), C.pinkDk, bx, y0 + H + 0.02, 0);
      [-1, 1].forEach(sz => wheel(s, bx, 0.24, sz * (D / 2 + 0.05), 0.24));
      wheel(s, -0.62, 0.24, 0, 0.24);
      rod(s, [bx - W / 2, y0 + 0.1, 0], [-0.62, 0.24, 0], 0.03, C.metalDk);
      rod(s, [-0.3, 0.3, 0], [-0.32, 0.72, 0], 0.03, C.metalDk);
      part(s, box(0.2, 0.06, 0.14), C.chocDk, -0.33, 0.75, 0);
      rod(s, [-0.62, 0.24, 0], [-0.33, 0.72, 0], 0.025, C.metalDk);
      rod(s, [bx - W / 2, y0 + H * 0.85, 0], [-0.1, 0.86, 0], 0.025, C.metalDk);
      rod(s, [-0.1, 0.86, -0.2], [-0.1, 0.86, 0.2], 0.022, C.metalDk);
      [-1, 1].forEach(sz => part(s, cyl(0.03, 0.03, 0.08, 8), C.pinkDk, -0.1, 0.86, sz * 0.22).rotation.x = Math.PI / 2);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => rod(s, [bx + sx * (W / 2 - 0.03), y0 + H, sz * (D / 2 - 0.03)], [bx + sx * (W / 2 - 0.03), y0 + H + 0.62, sz * (D / 2 - 0.03)], 0.015, C.cream));
      stripeRoof(s, bx, y0 + H + 0.64, 0, W + 0.16, D + 0.16, 6, [C.mint, C.cream]);
      [[-0.12, C.pink], [0.08, C.mint], [0.24, C.lemon]].forEach(([x, c], i) => {
        part(s, cone(0.05, 0.13, 8), C.wafer, bx + x, y0 + H + 0.1, 0.1 - i * 0.08).rotation.x = Math.PI;
        part(s, sph(0.055, 10, 8), c, bx + x, y0 + H + 0.19, 0.1 - i * 0.08);
      });
    },
    C(s) {
      const W = 0.9, D = 0.5, y0 = 0.18, H = 0.28;
      part(s, box(W, H, D), C.pink, 0, y0 + H / 2, 0);
      part(s, box(W + 0.04, 0.04, D + 0.04), C.pinkDk, 0, y0 + H, 0);
      for (let i = 0; i < 4; i++) part(s, box(0.02, H - 0.06, D + 0.01), C.pinkDk, -W / 2 + 0.18 + i * 0.18, y0 + H / 2, 0);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => wheel(s, sx * 0.3, 0.13, sz * (D / 2 + 0.03), 0.13, C.cream, C.mintDk));
      rod(s, [W / 2, y0 + 0.1, 0], [W / 2 + 0.35, y0 + 0.3, 0], 0.025, C.woodDk);
      part(s, torus(0.06, 0.02, 5, 12), C.woodDk, W / 2 + 0.4, y0 + 0.33, 0).rotation.y = Math.PI / 2;
      const cy = y0 + H + 0.02, coneH = 0.6;
      part(s, cyl(0.2, 0.2, 0.04, 16), C.cream, 0, cy + 0.02, 0);
      part(s, cone(0.2, coneH, 12), C.wafer, 0, cy + 0.04 + coneH / 2, 0).rotation.x = Math.PI;
      for (let i = 0; i < 5; i++) { const t = (i + 0.5) / 5; part(s, torus(0.2 * t + 0.003, 0.008, 4, 16), C.waferDk, 0, cy + 0.04 + coneH * t, 0).rotation.x = Math.PI / 2; }
      const top = cy + 0.04 + coneH;
      part(s, sph(0.22, 14, 10), C.pink, 0, top + 0.08, 0);
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; part(s, sph(0.06, 8, 6), C.pink, Math.cos(a) * 0.2, top, Math.sin(a) * 0.2); }
      part(s, sph(0.18, 14, 10), C.mint, 0.03, top + 0.32, 0);
      part(s, sph(0.14, 14, 10), C.cream, -0.01, top + 0.52, 0);
      part(s, sph(0.05, 8, 6), C.berry, 0, top + 0.68, 0);
      rod(s, [0, top + 0.72, 0], [0.05, top + 0.8, 0], 0.008, C.leaf, 4);
      [[0.15, top + 0.2, 0.12, C.lemon], [-0.12, top + 0.45, 0.08, C.berry], [0.1, top + 0.55, -0.06, C.lilac]].forEach(([x, y, z, c]) => part(s, capsule(0.012, 0.04), c, x, y, z).rotation.set(1, 0.5, 0));
    },
  },
};

export function build(id, v) {
  const fn = BUILD[id]?.[v];
  if (!fn) throw new Error(`unknown dessert pick decor: ${id}/${v}`);
  const solid = new THREE.Group(), glass = new THREE.Group();
  fn(solid, glass);
  const out = new THREE.Group();
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }));
  body.castShadow = true; body.receiveShadow = true;
  out.add(body);
  if (glass.children.length) {
    const gm = new THREE.Mesh(bakeGroup(glass), new THREE.MeshStandardMaterial({ color: 0xcfe3e8, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.22, depthWrite: false }));
    gm.userData.noShadow = true; gm.renderOrder = 1; out.add(gm);
  }
  return out;
}
