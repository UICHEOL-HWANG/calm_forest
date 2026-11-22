import * as THREE from 'three';
import { bakeGroup, part } from '../../js/dream/art.js';

export const IDS = ['xm_mini_tree', 'xm_gift_pile', 'xm_ginger_house', 'xm_wreath_arch'];
export const VARIANTS = ['A', 'B', 'C'];

export const C = {
  cream: 0xe3d4b8, creamDk: 0xcfbd9c, berry: 0xb5363f, berryDk: 0x8e2a32, coal: 0x2a2624,
  green: 0x2f6b4f, greenDk: 0x24503c, greenLt: 0x3f7d55, gold: 0xd9a63a, goldDk: 0xb38630,
  wood: 0x9c6b40, woodLt: 0xc99a62, woodDk: 0x6b4a2e, bark: 0x5e4129, stone: 0x8f887e,
  ginger: 0xa0612f, gingerDk: 0x7a4424, icing: 0xe8dcc6,
  lamp: 0xffd27a, lampRed: 0xff9a6a,
};

export const META = {
  xm_mini_tree: {
    A: { name: '층층 트리', note: '세 단 원뿔 잎 + 빨강·금·크림 방울 + 금별 · 빨간 화분', foot: [0.75, 0.75] },
    B: { name: '나무판 나선 트리', note: '가운데 기둥에 초록 판자를 나선으로 · 판자 끝 방울 · 십자 받침', foot: [0.75, 0.75] },
    C: { name: '바구니 탁상 트리', note: '치마처럼 겹친 잎 + 잎 끝 꼬마전구 · 등나무 바구니', foot: [0.7, 0.7] },
  },
  xm_gift_pile: {
    A: { name: '쌓은 선물', note: '큰 빨강 + 위 초록 + 옆 크림·금 상자 · 리본 십자 + 나비매듭', foot: null },
    B: { name: '선물 줄 + 모자 상자', note: '낮게 늘어놓은 상자 넷 + 둥근 모자 상자', foot: null },
    C: { name: '썰매 위 선물', note: '작은 나무 썰매에 상자 셋', foot: null },
  },
  xm_ginger_house: {
    A: { name: '케이크 받침 진저 집', note: '둥근 받침대 위 박공집 · 지붕 아이싱 + 젤리 · 지팡이 사탕', foot: [0.65, 0.65] },
    B: { name: '낮은 탁자 눈 지붕 집', note: '체크 보 덮은 낮은 탁자 · 두꺼운 눈 지붕 + 굴뚝 + 진저맨', foot: [0.9, 0.65] },
    C: { name: '스툴 위 A자 오두막', note: '세 다리 스툴 위 가파른 A자 지붕 · 동그란 창 · 진저맨 둘', foot: [0.55, 0.55] },
  },
  xm_wreath_arch: {
    A: { name: '둥근 상록 아치', note: '잎 가랜드 반원 아치 + 꼬마전구 · 꼭대기 큰 리스 · 기둥 빨간 리본', foot: [2.1, 0.45] },
    B: { name: '뾰족 상록 아치', note: '잎 감은 두 기둥이 꼭대기에서 만남 · 리스 + 금 종 셋', foot: [2.2, 0.45] },
    C: { name: '지팡이 사탕 하트 아치', note: '큰 지팡이 사탕 둘이 하트로 맞닿음 · 가운데 리스 · 꼬마전구', foot: [2.0, 0.4] },
  },
};

const TAU = Math.PI * 2;
const lathe = (pr, seg = 16) => new THREE.LatheGeometry(pr.map(([x, y]) => new THREE.Vector2(x, y)), seg);
const sph = (r, w = 12, h = 9, ...rest) => new THREE.SphereGeometry(r, w, h, ...rest);
const cyl = (a, b, h, s = 12, ...rest) => new THREE.CylinderGeometry(a, b, h, s, ...rest);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const cone = (r, h, s = 8) => new THREE.ConeGeometry(r, h, s);
const ico = (r) => new THREE.IcosahedronGeometry(r, 0);
const torus = (r, t, rs = 6, ts = 18, arc = TAU) => new THREE.TorusGeometry(r, t, rs, ts, arc);
const flatRing = (p, r, tube, col, y, rs = 5, ts = 24) => { const t = part(p, torus(r, tube, rs, ts), col, 0, y, 0); t.rotation.x = Math.PI / 2; return t; };
const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
const seeded = (seed) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const pathPoints = (fn, n) => Array.from({ length: n + 1 }, (_, i) => fn(i / n));

function starGeo(r1, r2, depth) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + Math.PI / 2, r = i % 2 ? r2 : r1; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  return g;
}

function star(g, x, y, z, r) {
  part(g, starGeo(r, r * 0.45, r * 0.35), C.lamp, x, y, z);
}

function bow(s, x, y, z, k, col, rotY = 0) {
  const b = grp(s, x, y, z); b.scale.setScalar(k); b.rotation.y = rotY;
  [-1, 1].forEach(sx => { const l = part(b, torus(0.05, 0.018, 5, 10), col, sx * 0.05, 0.03, 0); l.scale.set(1, 0.7, 0.6); l.rotation.z = sx * 0.5; });
  part(b, sph(0.024, 8, 6), col, 0, 0.012, 0);
  return b;
}

function gift(s, x, y, z, w, h, d, col, rib, rotY = 0, bowK = 1) {
  const g = grp(s, x, y, z); g.rotation.y = rotY;
  part(g, box(w, h, d), col, 0, h / 2, 0);
  const rw = Math.min(w, d) * 0.16;
  part(g, box(w + 0.012, h + 0.012, rw), rib, 0, h / 2, 0);
  part(g, box(rw, h + 0.02, d + 0.02), rib, 0, h / 2, 0);
  if (bowK) bow(g, 0, h + 0.01, 0, bowK, rib, 0.6);
  return g;
}

function wreath(s, x, y, z, r, bowCol = C.berry) {
  const w = grp(s, x, y, z);
  part(w, torus(r, r * 0.26, 6, 18), C.greenDk);
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, c = part(w, ico(r * 0.24), i % 2 ? C.green : C.greenLt, Math.cos(a) * r, Math.sin(a) * r, r * 0.08);
    c.rotation.set(a, a * 2, a * 0.5);
  }
  [0.6, 1.9, 3.4].forEach(a => [[0, 0], [0.05, 0.03], [-0.03, 0.05]].forEach(([dx, dy]) => part(w, sph(r * 0.075, 6, 5), C.berry, Math.cos(a) * r + dx * r * 2, Math.sin(a) * r + dy * r * 2, r * 0.3)));
  const b = grp(w, 0, -r, r * 0.3);
  [-1, 1].forEach(sx => {
    const l = part(b, torus(r * 0.22, r * 0.07, 5, 10), bowCol, sx * r * 0.22, 0.02, 0); l.scale.set(1, 0.75, 0.6); l.rotation.z = sx * 0.4;
    const t = part(b, box(r * 0.14, r * 0.55, r * 0.04), bowCol, sx * r * 0.14, -r * 0.3, 0); t.rotation.z = sx * 0.3;
  });
  part(b, sph(r * 0.1, 8, 6), bowCol, 0, 0, r * 0.02);
  return w;
}

function bell(s, x, y, z, k) {
  const b = grp(s, x, y, z); b.scale.setScalar(k);
  part(b, lathe([[0, 0.12], [0.03, 0.12], [0.05, 0.08], [0.06, 0.02], [0.08, -0.02], [0, -0.02]], 10), C.gold);
  part(b, sph(0.02, 6, 5), C.goldDk, 0, -0.03, 0);
  part(b, cyl(0.004, 0.004, 0.1, 4), C.woodDk, 0, 0.17, 0);
  return b;
}

function gingerMan(s, x, y, z, k = 1, rotY = 0) {
  const g = grp(s, x, y, z); g.scale.setScalar(k); g.rotation.y = rotY;
  const t = 0.028;
  part(g, cyl(0.05, 0.05, t, 12), C.ginger, 0, 0.22, 0).rotation.x = Math.PI / 2;
  part(g, box(0.08, 0.1, t), C.ginger, 0, 0.13, 0);
  [-1, 1].forEach(sx => {
    part(g, box(0.1, 0.035, t), C.ginger, sx * 0.075, 0.155, 0).rotation.z = sx * 0.4;
    part(g, box(0.035, 0.1, t), C.ginger, sx * 0.03, 0.05, 0).rotation.z = sx * 0.25;
    part(g, sph(0.008, 5, 4), C.coal, sx * 0.017, 0.23, t / 2 + 0.002);
  });
  [0.15, 0.115].forEach(yy => part(g, sph(0.01, 6, 4), C.berry, 0, yy, t / 2 + 0.004));
  part(g, box(0.03, 0.006, 0.006), C.icing, 0, 0.205, t / 2 + 0.003);
  return g;
}

function triPrism(w, rise, d) {
  const tri = new THREE.Shape(); tri.moveTo(-w / 2, 0); tri.lineTo(w / 2, 0); tri.lineTo(0, rise); tri.closePath();
  const g = new THREE.ExtrudeGeometry(tri, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2);
  return g;
}

function gableHouse(s, x, y, z, w, d, wh, pitch, opt = {}) {
  const h = grp(s, x, y, z);
  const { snow = 0.03, chimney = false, gumdrops = true } = opt;
  part(h, box(w, wh, d), C.ginger, 0, wh / 2, 0);
  const over = 0.06, L = (w / 2 + over) / Math.cos(pitch), rise = (w / 2) * Math.tan(pitch);
  part(h, triPrism(w, rise, d), C.ginger, 0, wh, 0);
  [-1, 1].forEach(sx => {
    const r = grp(h, sx * (L / 2) * Math.cos(pitch), wh + rise - (L / 2) * Math.sin(pitch), 0); r.rotation.z = -sx * pitch;
    part(r, box(L, 0.05, d + 0.12), C.gingerDk, 0, 0.035, 0);
    part(r, box(L * 0.96, snow, d + 0.1), C.cream, 0, 0.06 + snow / 2, 0);
    for (let i = 0; i < 6; i++) part(r, sph(0.022, 6, 5), C.icing, -L / 2 + 0.04 + i * (L - 0.08) / 5, 0.01, (d + 0.12) / 2 + 0.006);
  });
  if (gumdrops) [-0.4, -0.2, 0, 0.2, 0.4].forEach((f, i) => part(h, sph(0.032, 8, 6, 0, TAU, 0, Math.PI / 2), [C.berry, C.green, C.gold][i % 3], 0, wh + rise + 0.04 + snow, f * d));
  if (chimney) { part(h, box(0.09, 0.22, 0.09), C.gingerDk, w * 0.22, wh + rise * 0.72, -d * 0.18); part(h, box(0.11, 0.035, 0.11), C.cream, w * 0.22, wh + rise * 0.72 + 0.12, -d * 0.18); }
  const fz = d / 2 + 0.008;
  part(h, box(w * 0.26, wh * 0.62, 0.016), C.gingerDk, 0, wh * 0.31, fz);
  part(h, box(w * 0.3, 0.02, 0.02), C.icing, 0, wh * 0.63, fz + 0.004);
  part(h, sph(0.012, 6, 4), C.gold, w * 0.07, wh * 0.3, fz + 0.012);
  [-1, 1].forEach(sx => {
    const wx = sx * w * 0.32, wy = wh * 0.6;
    part(h, box(w * 0.18, wh * 0.3, 0.012), C.gold, wx, wy, fz);
    [1, -1].forEach(sy => part(h, box(w * 0.2 + 0.02, 0.018, 0.02), C.icing, wx, wy + sy * wh * 0.16, fz + 0.004));
    part(h, box(0.012, wh * 0.3, 0.018), C.icing, wx, wy, fz + 0.006);
  });
  [-1, 1].forEach(sx => [0.25, 0.6, 0.9].forEach((f, i) => part(h, sph(0.016, 6, 4), [C.berry, C.green, C.gold][i], sx * (w / 2 + 0.008), wh * f, d * 0.3)));
  return h;
}

function candyCane(s, x, y, z, len, r, rotY = 0) {
  const c = grp(s, x, y, z); c.rotation.y = rotY;
  const n = 6, hr = len * 0.22;
  for (let i = 0; i < n; i++) part(c, cyl(r, r, len / n, 8), i % 2 ? C.cream : C.berry, 0, len / n * (i + 0.5), 0);
  for (let i = 0; i < 4; i++) part(c, torus(hr, r, 6, 4, Math.PI / 4), i % 2 ? C.berry : C.cream, hr, len, 0).rotation.z = i * Math.PI / 4;
  return c;
}

function garland(s, pts, r, rnd) {
  pts.forEach(([x, y, z], i) => { const c = part(s, ico(r * (0.9 + rnd() * 0.25)), [C.greenLt, C.green, C.greenDk][i % 3], x, y, z); c.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); });
}

function bulbs(g, pts, r) { pts.forEach(([x, y, z], i) => part(g, sph(r, 6, 5), i % 3 === 1 ? C.lampRed : C.lamp, x, y, z)); }

const BUILD = {
  xm_mini_tree: {
    A(s, g) {
      part(s, lathe([[0, 0], [0.17, 0], [0.2, 0.26], [0, 0.26]], 12), C.berry);
      flatRing(s, 0.2, 0.025, C.cream, 0.26, 5, 16);
      part(s, cyl(0.05, 0.06, 0.12, 6), C.bark, 0, 0.32, 0);
      [[0.36, 0.52, 0.56], [0.7, 0.41, 0.48], [1.0, 0.29, 0.42]].forEach(([y0, r, h], ti) => {
        part(s, cone(r, h, 8), ti % 2 ? C.green : C.greenDk, 0, y0 + h / 2, 0);
        const n = 6 - ti;
        for (let i = 0; i < n; i++) {
          const a = (i + 0.5 + ti * 0.3) / n * TAU, t = 0.14 + (i % 2) * 0.14, rr = r * (1 - t) * 0.93 + 0.025;
          part(s, sph(0.045 - ti * 0.004, 10, 8), [C.berry, C.gold, C.cream][(i + ti) % 3], Math.sin(a) * rr, y0 + t * h, Math.cos(a) * rr);
        }
      });
      star(g, 0, 1.5, 0, 0.11);
      return {};
    },
    B(s, g) {
      [0, Math.PI / 2].forEach(a => { part(s, box(0.7, 0.06, 0.1), C.woodDk, 0, 0.03, 0).rotation.y = a; });
      part(s, box(0.08, 1.4, 0.08), C.wood, 0, 0.76, 0);
      for (let i = 0; i < 7; i++) {
        const w = 0.95 - i * 0.12, b = grp(s, 0, 0.28 + i * 0.165, 0); b.rotation.y = i * 0.45;
        part(b, box(w, 0.07, 0.12), i % 2 ? C.green : C.greenDk, 0, 0, 0);
        [-1, 1].forEach(sx => { part(b, cyl(0.004, 0.004, 0.06, 4), C.woodDk, sx * (w / 2 - 0.05), -0.065, 0); part(b, sph(0.035, 8, 6), (i + (sx > 0 ? 1 : 0)) % 2 ? C.berry : C.gold, sx * (w / 2 - 0.05), -0.12, 0); });
      }
      star(g, 0, 1.58, 0, 0.12);
      return {};
    },
    C(s, g) {
      part(s, cyl(0.25, 0.2, 0.3, 12), C.woodLt, 0, 0.15, 0);
      [0.08, 0.16, 0.24].forEach(y => flatRing(s, 0.2 + y * 0.17 + 0.006, 0.014, C.wood, y, 4, 20));
      flatRing(s, 0.255, 0.025, C.woodDk, 0.3, 5, 20);
      part(s, lathe([[0, 0.3], [0.5, 0.36], [0.3, 0.56], [0.42, 0.6], [0.22, 0.8], [0.33, 0.83], [0.14, 1.02], [0.22, 1.05], [0, 1.26]], 9), C.green);
      [[0.5, 0.36, 8], [0.42, 0.6, 7], [0.33, 0.83, 6], [0.22, 1.05, 5]].forEach(([r, y, n], li) => {
        for (let i = 0; i < n; i++) { const a = (i + li * 0.5) / n * TAU; part(g, sph(0.026, 6, 5), (i + li) % 3 === 1 ? C.lampRed : C.lamp, Math.sin(a) * r, y - 0.015, Math.cos(a) * r); }
      });
      star(g, 0, 1.33, 0, 0.085);
      return {};
    },
  },
  xm_gift_pile: {
    A(s) {
      gift(s, -0.05, 0, 0, 0.42, 0.3, 0.36, C.berry, C.gold, 0.15, 0);
      gift(s, -0.06, 0.3, 0.0, 0.28, 0.2, 0.24, C.green, C.cream, 0.6, 1.1);
      gift(s, 0.32, 0, 0.12, 0.22, 0.22, 0.22, C.cream, C.berry, -0.4, 0.9);
      gift(s, -0.36, 0, 0.22, 0.16, 0.1, 0.14, C.gold, C.berry, 0.5, 0.6);
      return {};
    },
    B(s) {
      gift(s, -0.4, 0, 0, 0.2, 0.18, 0.2, C.green, C.gold, 0.3, 0.8);
      gift(s, -0.13, 0, 0.1, 0.24, 0.13, 0.2, C.berry, C.cream, -0.15, 0.8);
      gift(s, 0.42, 0, 0.1, 0.16, 0.24, 0.16, C.cream, C.green, 0.4, 0.7);
      gift(s, -0.12, 0.13, 0.09, 0.14, 0.12, 0.14, C.gold, C.berry, 0.5, 0.7);
      const hb = grp(s, 0.16, 0, -0.06);
      part(hb, cyl(0.17, 0.17, 0.2, 16), C.greenDk, 0, 0.1, 0);
      part(hb, cyl(0.18, 0.18, 0.05, 16), C.berry, 0, 0.215, 0);
      part(hb, cyl(0.173, 0.173, 0.04, 16), C.gold, 0, 0.08, 0);
      bow(hb, 0, 0.24, 0, 1.1, C.gold, 0.3);
      return {};
    },
    C(s) {
      [-1, 1].forEach(sz => {
        part(s, box(0.62, 0.025, 0.035), C.berryDk, -0.02, 0.0125, sz * 0.17);
        const cu = part(s, torus(0.07, 0.017, 5, 8, Math.PI), C.berryDk, 0.29, 0.082, sz * 0.17); cu.rotation.z = -Math.PI / 2;
        [-0.2, 0.15].forEach(x => part(s, box(0.03, 0.09, 0.03), C.berryDk, x, 0.06, sz * 0.17));
      });
      part(s, box(0.6, 0.035, 0.42), C.wood, -0.03, 0.12, 0);
      [-0.2, 0, 0.2].forEach(x => part(s, box(0.025, 0.008, 0.425), C.woodDk, x - 0.03, 0.14, 0));
      gift(s, -0.15, 0.138, 0, 0.22, 0.22, 0.24, C.green, C.berry, 0.1, 0.9);
      gift(s, 0.1, 0.138, 0.05, 0.2, 0.14, 0.2, C.berry, C.gold, -0.25, 0.8);
      gift(s, -0.14, 0.358, -0.01, 0.13, 0.11, 0.13, C.cream, C.green, 0.6, 0.7);
      return {};
    },
  },
  xm_ginger_house: {
    A(s) {
      part(s, cyl(0.2, 0.24, 0.05, 16), C.woodDk, 0, 0.025, 0);
      part(s, lathe([[0, 0.05], [0.07, 0.05], [0.045, 0.2], [0.04, 0.45], [0.07, 0.56], [0, 0.56]], 12), C.wood);
      part(s, cyl(0.38, 0.36, 0.05, 20), C.woodLt, 0, 0.585, 0);
      part(s, cyl(0.34, 0.34, 0.012, 20), C.cream, 0, 0.616, 0);
      gableHouse(s, 0, 0.622, -0.03, 0.44, 0.34, 0.3, 0.62);
      candyCane(s, -0.27, 0.62, 0.2, 0.22, 0.014, 0);
      candyCane(s, 0.27, 0.62, 0.2, 0.22, 0.014, Math.PI);
      return {};
    },
    B(s) {
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => part(s, box(0.06, 0.36, 0.06), C.woodDk, sx * 0.38, 0.18, sz * 0.26));
      part(s, box(0.86, 0.05, 0.62), C.wood, 0, 0.385, 0);
      part(s, box(0.8, 0.012, 0.56), C.cream, 0, 0.416, 0);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2 === 0) part(s, box(0.2, 0.016, 0.186), C.berry, -0.3 + i * 0.2, 0.417, -0.186 + j * 0.186);
      gableHouse(s, -0.06, 0.426, -0.06, 0.48, 0.34, 0.28, 0.5, { snow: 0.06, chimney: true, gumdrops: false });
      [[0.0, 0.15], [-0.04, 0.2], [-0.08, 0.25]].forEach(([x, z], i) => part(s, cyl(0.03, 0.03, 0.012, 10), i % 2 ? C.berry : C.icing, x - 0.02, 0.432, z));
      gingerMan(s, 0.3, 0.426, 0.12, 1.0, -0.4);
      return {};
    },
    C(s) {
      part(s, cyl(0.26, 0.26, 0.05, 18), C.woodLt, 0, 0.6, 0);
      [0, 1, 2].forEach(i => { const a = i / 3 * TAU + 0.5, l = part(s, cyl(0.025, 0.03, 0.6, 6), C.wood, Math.sin(a) * 0.17, 0.3, Math.cos(a) * 0.17); l.rotation.set(-Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12); });
      flatRing(s, 0.17, 0.012, C.woodDk, 0.22, 4, 16);
      const hg = grp(s, 0, 0.625, -0.04);
      const w = 0.34, d = 0.3, pitch = 1.08, L = (w / 2 + 0.03) / Math.cos(pitch), rise = (w / 2) * Math.tan(pitch);
      part(hg, triPrism(w, rise, d), C.ginger, 0, 0, 0);
      [-1, 1].forEach(sx => {
        const r = grp(hg, sx * ((L / 2) * Math.cos(pitch) + 0.012), rise - (L / 2) * Math.sin(pitch) + 0.012, 0); r.rotation.z = -sx * pitch;
        part(r, box(L, 0.04, d + 0.1), C.gingerDk, 0, 0, 0);
        part(r, box(L * 0.97, 0.02, d + 0.08), C.cream, 0, 0.03, 0);
        for (let i = 0; i < 5; i++) part(r, sph(0.018, 6, 5), [C.berry, C.green, C.gold][i % 3], -L / 2 + 0.05 + i * (L - 0.1) / 4, 0.05, 0);
      });
      part(hg, sph(0.035, 8, 6, 0, TAU, 0, Math.PI / 2), C.berry, 0, rise + 0.02, 0);
      const fz = d / 2 + 0.008;
      part(hg, cyl(0.06, 0.06, 0.016, 12, 1, false, -Math.PI / 2, Math.PI), C.gingerDk, 0, 0.07, fz).rotation.x = Math.PI / 2;
      part(hg, box(0.12, 0.07, 0.016), C.gingerDk, 0, 0.035, fz);
      part(hg, cyl(0.045, 0.045, 0.014, 14), C.gold, 0, rise * 0.55, fz).rotation.x = Math.PI / 2;
      part(hg, torus(0.048, 0.011, 5, 14), C.icing, 0, rise * 0.55, fz + 0.006);
      part(hg, box(0.1, 0.01, 0.01), C.icing, 0, rise * 0.55, fz + 0.012);
      gingerMan(s, -0.17, 0.625, 0.17, 0.75, 0.3);
      gingerMan(s, 0.17, 0.625, 0.17, 0.75, -0.3);
      return {};
    },
  },
  xm_wreath_arch: {
    A(s, g) {
      const R = 0.92, cy = 1.32, rnd = seeded(7);
      [-1, 1].forEach(sx => part(s, box(0.24, 0.12, 0.3), C.stone, sx * R, 0.06, 0));
      [-1, 1].forEach(sx => part(s, cyl(0.05, 0.05, cy, 6), C.greenDk, sx * R, cy / 2 + 0.06, 0));
      part(s, torus(R, 0.05, 5, 20, Math.PI), C.greenDk, 0, cy, 0);
      const leg = sx => pathPoints(t => [sx * R, 0.16 + t * (cy - 0.16), 0], 7);
      garland(s, [...leg(-1), ...leg(1), ...pathPoints(t => [Math.cos(t * Math.PI) * R, cy + Math.sin(t * Math.PI) * R, 0], 18)], 0.11, rnd);
      bulbs(g, [...pathPoints(t => [Math.cos(t * Math.PI) * R, cy + Math.sin(t * Math.PI) * R, 0.12], 12), ...[-1, 1].flatMap(sx => pathPoints(t => [sx * R, 0.3 + t * 0.9, 0.12], 4))], 0.03);
      wreath(s, 0, cy + R + 0.02, 0.17, 0.3);
      [-1, 1].forEach(sx => bow(s, sx * R, cy - 0.05, 0.15, 1.8, C.berry, 0));
      return {};
    },
    B(s, g) {
      const rnd = seeded(21), bx = 0.98, top = 2.3, sp = Math.atan2(bx, top);
      [-1, 1].forEach(sx => {
        part(s, box(0.26, 0.1, 0.26), C.stone, sx * bx, 0.05, 0);
        const p = grp(s, sx * bx / 2, top / 2, 0); p.rotation.z = sx * sp;
        part(p, cyl(0.05, 0.06, Math.hypot(bx, top), 6), C.bark, 0, 0, 0);
      });
      const side = sx => pathPoints(t => [sx * bx * (1 - t), 0.15 + t * (top - 0.3), 0], 13);
      garland(s, [...side(-1), ...side(1)], 0.1, rnd);
      bulbs(g, [-1, 1].flatMap(sx => pathPoints(t => [sx * bx * (1 - t), 0.3 + t * (top - 0.65), 0.1], 7)), 0.028);
      part(s, box(0.66, 0.07, 0.08), C.wood, 0, 1.62, 0);
      [-0.18, 0, 0.18].forEach((x, i) => bell(s, x, i === 1 ? 1.38 : 1.43, 0, 1.3));
      wreath(s, 0, top - 0.02, 0.14, 0.27);
      return {};
    },
    C(s, g) {
      const len = 1.55, r = 0.065, hr = 0.42, y0 = 0.08 + len, m = 8;
      [-1, 1].forEach(sx => {
        const c = grp(s, sx * hr * 2, 0, 0);
        part(c, cyl(0.12, 0.14, 0.08, 10), C.greenDk, 0, 0.04, 0);
        for (let i = 0; i < 8; i++) part(c, cyl(r, r, len / 8, 10), i % 2 ? C.cream : C.berry, 0, 0.08 + len / 8 * (i + 0.5), 0);
        for (let i = 0; i < m; i++) part(c, torus(hr, r, 8, 3, Math.PI / m), i % 2 ? C.berry : C.cream, -sx * hr, y0, 0).rotation.z = i * Math.PI / m;
      });
      bulbs(g, [-1, 1].flatMap(sx => pathPoints(t => [sx * hr + Math.cos(t * Math.PI) * (hr + 0.1), y0 + Math.sin(t * Math.PI) * (hr + 0.1), 0], 8).slice(sx < 0 ? 1 : 0, sx < 0 ? 9 : 8)), 0.028);
      wreath(s, 0, y0 + 0.1, 0.12, 0.28);
      return {};
    },
  },
};

export function build(id, v) {
  const fn = BUILD[id]?.[v];
  if (!fn) throw new Error(`unknown xmas pick decor: ${id}/${v}`);
  const solid = new THREE.Group(), glow = new THREE.Group();
  const { k = 1, flat = true, rough = 0.9 } = fn(solid, glow);
  const out = new THREE.Group();
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: flat, roughness: rough, metalness: 0 }));
  body.castShadow = true; body.receiveShadow = true;
  out.add(body);
  if (glow.children.length) { const gm = new THREE.Mesh(bakeGroup(glow), new THREE.MeshBasicMaterial({ vertexColors: true })); gm.userData.flicker = true; out.add(gm); }
  out.traverse(o => { if (o.isMesh && o !== body) o.userData.noShadow = true; });
  out.scale.setScalar(k);
  return out;
}
