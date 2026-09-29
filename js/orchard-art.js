// =============================================================
//  calm forest · 🍎 과수원 외관 — 입구(잔디 판·노란 울타리·사과 명판) · 안쪽 소품 · 과일나무 모양
//  (THREE 전용, 게임 상태 없음 — 배치·충돌 등록은 호출부 몫)
//  ------------------------------------------------------------
//  왜: 과수원이 "들판에 나무가 흩어진" 느낌이라 가꾼 공간으로 안 읽혔다(2026-09-29 사용자 "밤티").
//      입구 온실은 안쪽(시냇물·나무)과 결이 안 맞아 뺐다. 시안 A·B·C 비교 → 안쪽 C(돌담) +
//      사용자 레퍼런스(노란 뾰족 울타리·조약돌 흙길·벤치·몽실한 나무 디오라마) 입구 + ① 사과 명판으로 확정.
//  ▶ 색은 정점에 싣고 한 덩이로 합친다 — 입구·안쪽 소품이 각각 드로우콜 2(그림자 있음/없음)
//    (js/game.js paintGeo·mergeGeos 와 같은 수법). 글씨판만 캔버스 텍스처라 따로(호출부).
//  ▶ 좌표: 입구는 **국소**(원점=문, -x=문 앞/걸어오는 쪽, ±z=좌우) — mist.js 가 그룹을 돌려 놓는다.
//          안쪽은 ORCHARD 중심 기준 국소(x·z), 시냇물은 x≈-4~-7 로 남북을 가로지르고 입구는 +z(남).
//  ▶ 몸 충돌은 solids([x,z,r]) 로 돌려준다 — 울타리는 0.5 간격으로 촘촘히(틈으로 빠져나가지 않게).
// =============================================================
import * as THREE from 'three';

const C = {
  wood: 0x9a7248, woodDark: 0x7d5a38, plank: 0xb58657, plankLight: 0xc99a68,
  stone: 0xb9b3a6, stoneDark: 0x9aa1ad, stoneLight: 0xd3cdc0,
  leaf: 0x5f9e52, red: 0xd64a42, appleSign: 0xef4f43, pear: 0xd9cf7a, peach: 0xef9aad, persimmon: 0xe08a30, chestnut: 0x7a5433,
  awnRed: 0xd9574f, soil: 0x7a5534, straw: 0xe0c47a, can: 0xe8b53a, cloth: 0xe7d3b0,
  picket: 0xffd466, picketDark: 0xf6c052, pRail: 0xe3a444, bench: 0xc0703a, benchDark: 0x94532a,
  grass: 0x6cbf45, grassDark: 0x57a83a, grassLight: 0x8fd25a, turf: 0x8a6440,
  pebble: 0xf6f3ea, pebbleDark: 0xe2ddd2, trench: 0xa9825a, lime: 0x98d44a, limeDark: 0x74b83a, limeLight: 0xb8e26c,
};
const FRUIT_COLORS = [C.red, C.pear, C.peach, C.persimmon, C.chestnut];

// ── 정점색 + 합치기 ───────────────────────────────────────────
function paint(geo, hex) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const c = new THREE.Color(hex), n = g.attributes.position.count, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}
function merge(geos, names = ['position', 'normal', 'color']) {
  const out = new THREE.BufferGeometry();
  for (const name of names) {
    let total = 0; for (const g of geos) total += g.attributes[name].count;
    const arr = new Float32Array(total * 3); let off = 0;
    for (const g of geos) { arr.set(g.attributes[name].array, off); off += g.attributes[name].count * 3; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, 3));
  }
  return out;
}
const vtxMat = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true });

/** 조각을 모았다가 두 덩이(그림자 있음 / 작은 소품·바닥은 그림자 없음)로 굽는다 */
function kit() {
  const big = [], small = [];
  return {
    box(hex, x, y, z, w, h, d, ry = 0, rz = 0, rx = 0, sm = false) {
      const g = new THREE.BoxGeometry(w, h, d);
      if (rz) g.rotateZ(rz); if (rx) g.rotateX(rx); if (ry) g.rotateY(ry);
      (sm ? small : big).push(paint(g.translate(x, y, z), hex));
    },
    cyl(hex, x, y, z, r0, r1, h, seg = 7, sm = false) {
      (sm ? small : big).push(paint(new THREE.CylinderGeometry(r0, r1, h, seg).translate(x, y, z), hex));
    },
    ball(hex, x, y, z, r, detail = 0, sm = false, sy = 1) {
      const g = new THREE.IcosahedronGeometry(r, detail); if (sy !== 1) g.scale(1, sy, 1);
      (sm ? small : big).push(paint(g.translate(x, y, z), hex));
    },
    geo(hex, g, sm = false) { (sm ? small : big).push(paint(g, hex)); },
    build() {
      const grp = new THREE.Group();
      if (big.length) { const m = new THREE.Mesh(merge(big), vtxMat()); m.castShadow = true; m.receiveShadow = true; grp.add(m); }
      if (small.length) { const m = new THREE.Mesh(merge(small), vtxMat()); m.receiveShadow = true; grp.add(m); }   // 작은 소품은 그림자가 지글거린다
      return grp;
    },
  };
}

// 선분을 따라 몸 충돌 원을 촘촘히 — 끝점에만 두면 사이로 빠져나간다
function solidLine(solids, x0, z0, x1, z1, r = 0.3, step = 0.5) {
  const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(L / step));
  for (let i = 0; i <= n; i++) solids.push([x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n, r]);
}

// ── 부품 ─────────────────────────────────────────────────────
// 돌담 한 칸 — 높이를 들쭉날쭉하게(난수 없이 i 로)
function stoneSpan(k, x0, z0, x1, z1, i) {
  const L = Math.hypot(x1 - x0, z1 - z0), ry = -Math.atan2(z1 - z0, x1 - x0);
  const n = Math.max(1, Math.round(L / 0.62));
  for (let j = 0; j < n; j++) {
    const u = (j + 0.5) / n, x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * u;
    const h = 0.42 + ((i + j) % 3) * 0.08, hex = (i + j) % 4 === 0 ? C.stoneLight : ((i + j) % 3 === 0 ? C.stoneDark : C.stone);
    k.box(hex, x, h / 2, z, L / n + 0.04, h, 0.5, ry + ((j % 2) ? 0.05 : -0.04));
  }
}
function basket(k, x, z, fruit = C.red, s = 1, y0 = 0) {
  k.cyl(C.straw, x, y0 + 0.2 * s, z, 0.34 * s, 0.26 * s, 0.4 * s, 9);
  for (const [dx, dz] of [[0, 0], [0.15, 0.1], [-0.14, 0.08], [0.05, -0.15], [-0.08, -0.1]]) k.ball(fruit, x + dx * s, y0 + 0.44 * s, z + dz * s, 0.12 * s, 1, true);
}
// 뾰족 울타리 한 칸 — 위에서 내려다보는 카메라라 가늘면 선으로만 읽힌다. 판을 두껍고 넓게, 사이는 성기게
function picketSpan(k, x0, z0, x1, z1, i0 = 0) {
  const L = Math.hypot(x1 - x0, z1 - z0), ry = -Math.atan2(z1 - z0, x1 - x0);
  const n = Math.max(1, Math.round(L / 0.36)), back = 0.09;
  for (const y of [0.34, 0.78]) k.box(C.pRail, (x0 + x1) / 2 + back, y, (z0 + z1) / 2, L + 0.06, 0.13, 0.08, ry);
  for (let j = 0; j < n; j++) {
    const u = (j + 0.5) / n, x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * u, h = 1.05 + ((i0 + j) % 3) * 0.04;
    const hex = (i0 + j) % 2 ? C.picket : C.picketDark;
    k.box(hex, x, h / 2, z, 0.09, h, 0.26, ry);
    const tip = new THREE.ConeGeometry(0.185, 0.24, 4); tip.rotateY(Math.PI / 4); tip.scale(0.5, 1, 1); tip.rotateY(ry); tip.translate(x, h + 0.12, z);
    k.geo(hex, tip);
  }
}
// 몽실한 나무 — 잎 뭉치를 모은다(레퍼런스의 복슬복슬한 머리). 촘촘하면 환공포증이라 9덩이로 멈춘다.
//   ⚠️ 장식이다 — 숲 나무(spawnTree)와 별개 메시라 벌목 대상이 아니다.
function fluffyTree(k, x, z, s = 1) {
  k.cyl(C.woodDark, x, 0.9 * s, z, 0.12 * s, 0.2 * s, 1.8 * s, 7);
  [[0, 2.3, 0, 0.75], [0.55, 2.05, 0.2, 0.55], [-0.5, 2.1, -0.25, 0.58], [0.15, 2.75, -0.2, 0.55], [-0.3, 2.6, 0.4, 0.5],
   [0.45, 2.55, -0.45, 0.48], [-0.2, 1.8, 0.45, 0.45], [0.35, 1.75, -0.35, 0.42], [0, 3.1, 0.1, 0.38]]
    .forEach(([dx, dy, dz, r], i) => k.ball(i % 3 === 0 ? C.limeDark : (i % 3 === 1 ? C.lime : C.limeLight), x + dx * s, dy * s, z + dz * s, r * s * 1.12, 1));
}
// 잔디 판 — 레퍼런스의 디오라마 느낌. 마을의 흐린 평지 위에 진한 잔디를 한 겹 깔고 가장자리에 흙 띠를 보인다.
//   캐릭터가 파묻히지 않게 얇게(윗면 0.145). 가장자리는 난수 없이 사인으로 들쭉날쭉.
export const GATE_PATCH = { cx: -1.2, cz: 0, rx: 5.4, rz: 7.4 };   // 국소 — 숲 나무 금지 구역도 이 값에서 파생(js/game.js)
function grassPatch(k, { cx, cz, rx, rz }) {
  const sh = new THREE.Shape(), N = 40;
  for (let i = 0; i <= N; i++) {
    const a = i / N * Math.PI * 2, w = 1 + Math.sin(a * 3 + 0.7) * 0.07 + Math.sin(a * 7) * 0.035;
    const px = Math.cos(a) * rx * w, pz = Math.sin(a) * rz * w;
    i ? sh.lineTo(px, pz) : sh.moveTo(px, pz);
  }
  const top = new THREE.ExtrudeGeometry(sh, { depth: 0.07, bevelEnabled: false, curveSegments: 1 });
  top.rotateX(Math.PI / 2); top.translate(cx, 0.075, cz); k.geo(C.grass, top, true);
  const base = new THREE.ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: false, curveSegments: 1 });
  base.scale(1.03, 1.03, 1); base.rotateX(Math.PI / 2); base.translate(cx, 0.03, cz); k.geo(C.turf, base, true);
  for (let i = 0; i < 22; i++) {   // 풀 포기 — 성기게(환공포증 금지). 세 갈래 뾰족 잎
    const a = i * 2.39996, r = 0.35 + (i % 7) / 7 * 0.6, px = cx + Math.cos(a) * rx * r, pz = cz + Math.sin(a) * rz * r;
    if (Math.abs(pz - cz) < 1.1 && px < cx + rx * 0.2) continue;   // 길 자리는 비운다
    for (const [dx, dz, h] of [[0, 0, 0.32], [0.07, 0.05, 0.24], [-0.06, 0.04, 0.26]]) {
      const bl = new THREE.ConeGeometry(0.05, h, 3); bl.translate(px + dx, 0.14 + h / 2, pz + dz); k.geo(i % 2 ? C.grassDark : C.grassLight, bl, true);
    }
  }
}
// 흙길 + 흰 조약돌 — 잔디 판 바로 위, 조약돌은 성기게 양옆에
function pebbleTrench(k, x0, x1, w = 1.3) {
  const wig = x => Math.sin(x * 0.7) * 0.35;
  const g = new THREE.PlaneGeometry(Math.abs(x1 - x0), w, 16, 1); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + wig(p.getX(i) + (x0 + x1) / 2));
  g.computeVertexNormals(); g.translate((x0 + x1) / 2, 0.16, 0); k.geo(C.trench, g, true);
  let i = 0;
  for (let x = x0 - 0.25; x > x1; x -= 0.55, i++) {
    for (const side of [-1, 1]) {
      if ((i + (side > 0 ? 1 : 0)) % 3 === 2) continue;
      k.ball(i % 2 ? C.pebble : C.pebbleDark, x + (side > 0 ? 0.1 : -0.1), 0.19, wig(x) + side * (w / 2 - 0.05), 0.17 + (i % 3) * 0.05, 1, true, 0.55);
    }
    if (i % 4 === 1) k.ball(C.pebble, x - 0.2, 0.18, wig(x) + 0.15, 0.13, 1, true, 0.5);
  }
}
// 벤치 — 앉는 판 3 + 등받이 판 2 + 굵은 다리. (x,z) 에 놓고 ry 로 돌린다
function benchAt(k, x, z, ry, s = 1.2) {
  const c = Math.cos(ry), sn = Math.sin(ry), at = (lx, lz) => [x + (lx * c + lz * sn) * s, z + (-lx * sn + lz * c) * s];
  const L = 1.5;
  for (let i = 0; i < 3; i++) { const [px, pz] = at(-0.18 + i * 0.17, 0); k.box(C.bench, px, 0.5 * s, pz, 0.15 * s, 0.07 * s, L * s, ry); }
  for (let i = 0; i < 2; i++) { const [px, pz] = at(0.3 + i * 0.05, 0); k.box(C.bench, px, (0.72 + i * 0.22) * s, pz, 0.06 * s, 0.16 * s, L * s, ry); }
  for (const lz of [-0.62, 0.62]) {
    const [fx, fz] = at(-0.2, lz), [bx, bz] = at(0.3, lz);
    k.box(C.benchDark, fx, 0.24 * s, fz, 0.1 * s, 0.48 * s, 0.1 * s, ry);
    k.box(C.benchDark, bx, 0.5 * s, bz, 0.1 * s, 1.0 * s, 0.1 * s, ry);
  }
}
// 사과 모양 판 — 입체(Shape 압출). 앞면은 -x(걸어오는 쪽)
function appleShape(r) {
  const s = new THREE.Shape();
  s.moveTo(0, -r);
  s.bezierCurveTo(0.7 * r, -1.1 * r, 1.1 * r, -0.4 * r, r, 0.2 * r);
  s.bezierCurveTo(0.9 * r, 0.8 * r, 0.4 * r, r, 0, 0.76 * r);
  s.bezierCurveTo(-0.4 * r, r, -0.9 * r, 0.8 * r, -r, 0.2 * r);
  s.bezierCurveTo(-1.1 * r, -0.4 * r, -0.7 * r, -1.1 * r, 0, -r);
  return s;
}
function appleBoard(k, x, y, z, r, hex) {
  const g = new THREE.ExtrudeGeometry(appleShape(r), { depth: 0.1, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1, curveSegments: 10 });
  g.translate(0, 0, -0.05); g.rotateY(-Math.PI / 2); g.translate(x, y, z); k.geo(hex, g);
  k.cyl(C.woodDark, x, y + 0.86 * r, z, 0.035, 0.045, 0.3 * r + 0.1, 5);                       // 꼭지
  const leaf = new THREE.IcosahedronGeometry(0.4 * r, 0); leaf.scale(0.35, 0.5, 1.2); leaf.rotateX(-0.6); leaf.translate(x, y + 0.95 * r, z + 0.44 * r);
  k.geo(C.leaf, leaf);
}

// ── 입구 ─────────────────────────────────────────────────────
//  반환: { group, solids:[[lx,lz,r]], labels:[{x,y,z,w,h}] } — 모두 국소. labels 는 글씨 자리(mist.js 가 캔버스로 얹는다)
export const GATE_W = 1.45;   // 문 기둥 반폭 — 잠금 가로대(2.9)가 이 폭을 막는다
export function buildGateArt() {
  const k = kit(), solids = [], labels = [], W = GATE_W;
  grassPatch(k, GATE_PATCH);
  for (const z of [-W, W]) { k.box(C.picketDark, 0, 0.75, z, 0.26, 1.5, 0.26); k.ball(C.picket, 0, 1.58, z, 0.16, 1); solids.push([0, z, 0.3]); }
  for (const sgn of [-1, 1]) {   // 울타리 날개 — 뒤(+x)로 휘어 과수원을 감싼다
    const pts = [[0, sgn * (W + 0.15)], [0.25, sgn * 2.8], [0.8, sgn * 4.2], [1.7, sgn * 5.5], [2.9, sgn * 6.5]];
    for (let i = 0; i < pts.length - 1; i++) { picketSpan(k, ...pts[i], ...pts[i + 1], i * 5); solidLine(solids, ...pts[i], ...pts[i + 1]); }
  }
  pebbleTrench(k, -0.2, -5.6, 1.35);
  benchAt(k, -2.3, -2.3, Math.PI / 2 + 0.25); solidLine(solids, -3.15, -2.1, -1.45, -2.5, 0.45);   // 벤치 긴 축(ry 로 돌린 z)을 따라
  fluffyTree(k, 2.2, -3.4, 0.95); fluffyTree(k, 2.6, 3.0, 1.1); solids.push([2.2, -3.4, 0.35], [2.6, 3.0, 0.38]);
  basket(k, -1.1, 2.1, C.red, 0.9, 0.14); solids.push([-1.1, 2.1, 0.32]);
  // 🍎 사과 명판 — 오른쪽 기둥에서 한 뼘 바깥 말뚝 위 큰 사과 판, 그 위에 글씨(사용자 확정 2026-09-29)
  const az = W + 0.95;
  k.cyl(C.woodDark, -0.35, 0.85, az, 0.08, 0.1, 1.7, 6);
  appleBoard(k, -0.42, 2.1, az, 0.72, C.appleSign);
  labels.push({ x: -0.56, y: 2.06, z: az, w: 1.2, h: 0.56 });
  solids.push([-0.35, az, 0.22]);
  return { group: k.build(), solids, labels };
}

// ── 안쪽 소품 ────────────────────────────────────────────────
//  돌담 테두리(시냇물·오솔길 자리는 비움) · 시냇물 나무다리 · 입구 안쪽 돗자리 소풍 + 과일색 깃발 줄
//  half: 걸을 수 있는 반경 · stream·path: [[x,z]...] 국소 중심선
export function buildOrchardDecor({ half, stream, path }) {
  const k = kit(), solids = [];
  const R = half + 0.2, N = 44;   // 걸을 수 있는 범위(half-0.8) 바깥 — 안쪽에 두면 테두리를 따라 걷다 걸린다
  const nearLine = (x, z, line, r) => line.some(([lx, lz]) => Math.hypot(lx - x, lz - z) < r);
  const streamExt = [...stream, [stream[0][0] - 0.6, stream[0][1] - 4], [stream.at(-1)[0] + 0.4, stream.at(-1)[1] + 4]];
  for (let i = 0; i < N; i++) {
    const a0 = i / N * Math.PI * 2, a1 = (i + 1) / N * Math.PI * 2;
    const x0 = Math.cos(a0) * R, z0 = Math.sin(a0) * R, x1 = Math.cos(a1) * R, z1 = Math.sin(a1) * R;
    if (nearLine((x0 + x1) / 2, (z0 + z1) / 2, streamExt, 3.2) || nearLine((x0 + x1) / 2, (z0 + z1) / 2, path, 2.6)) continue;
    stoneSpan(k, x0, z0, x1, z1, i);
  }
  // 시냇물 나무다리 — 보기만(시냇물 충돌체는 그대로라 건너진 않는다)
  const bx = -4.3, bz = 0;
  for (let i = 0; i < 7; i++) {
    const u = (i + 0.5) / 7, x = bx - 1.6 + u * 3.2, y = 0.1 + Math.sin(u * Math.PI) * 0.25;
    k.box(i % 2 ? C.plank : C.plankLight, x, y, bz, 3.2 / 7 - 0.03, 0.08, 1.5, 0, -Math.cos(u * Math.PI) * 0.3);
  }
  for (const z of [-0.8, 0.8]) {
    for (const u of [0, 0.5, 1]) k.cyl(C.woodDark, bx - 1.6 + u * 3.2, 0.4 + Math.sin(u * Math.PI) * 0.25, bz + z, 0.05, 0.06, 0.62, 5);
    k.box(C.wood, bx - 0.8, 0.9, bz + z, 1.65, 0.07, 0.07, 0, 0.15); k.box(C.wood, bx + 0.8, 0.9, bz + z, 1.65, 0.07, 0.07, 0, -0.15);
  }
  // 돗자리 소풍 + 등불 기둥 둘 사이 과일색 깃발 줄(입구 안쪽, 오솔길 옆)
  const mx = 6.2, mz = 16.2;   // 나무 자리 (3,15)·(8,11) 과 안 겹치게
  k.box(C.cloth, mx, 0.04, mz, 2.0, 0.03, 1.5, 0.2, 0, 0, true);
  for (let i = 0; i < 4; i++) k.box(C.awnRed, mx - 0.75 + i * 0.5, 0.045, mz, 0.12, 0.03, 1.52, 0.2, 0, 0, true);
  basket(k, mx + 0.4, mz - 0.3, C.peach, 0.8); k.ball(C.red, mx - 0.4, 0.14, mz + 0.3, 0.13, 1, true); k.ball(C.pear, mx - 0.2, 0.14, mz + 0.5, 0.13, 1, true);
  for (const x of [-2.6, 3.2]) { k.cyl(C.woodDark, x, 1.3, 17.2, 0.07, 0.09, 2.6, 6); k.box(C.can, x, 2.45, 17.2, 0.22, 0.28, 0.22); }
  for (let i = 0; i < 9; i++) {
    const u = (i + 0.5) / 9, x = -2.6 + u * 5.8, y = 2.4 - Math.sin(u * Math.PI) * 0.45;
    const tri = new THREE.ConeGeometry(0.16, 0.34, 3); tri.rotateX(Math.PI); tri.translate(x, y - 0.18, 17.2);
    k.geo(FRUIT_COLORS[i % 5], tri, true);
  }
  solids.push([-2.6, 17.2, 0.2], [3.2, 17.2, 0.2], [mx + 0.4, mz - 0.3, 0.3]);
  return { group: k.build(), solids };
}

// ── 과일나무 모양 — 우산 머리(넓고 납작한 두 층) ────────────────
//  기존(4덩이 각진 캐노피)은 숲 나무와 같아 과일나무로 안 읽혔다.
const mergePN = parts => merge(parts.map(g => (g.index ? g.toNonIndexed() : g)), ['position', 'normal']);
export const ORCHARD_TREE = {
  trunk: () => new THREE.CylinderGeometry(0.18, 0.28, 1.7, 7), trunkY: 0.85,
  canopy: () => {
    const a = new THREE.IcosahedronGeometry(1.45, 1); a.scale(1, 0.55, 1);
    const b = new THREE.IcosahedronGeometry(0.95, 1); b.scale(1, 0.6, 1); b.translate(0.1, 0.55, -0.1);
    return mergePN([a, b]);
  },
  canopyY: 2.15, fruitR: 1.32, fruitSquash: 0.5,
  fruit: () => new THREE.IcosahedronGeometry(0.24, 1),
};

/** 열매 자리 — 캐노피 겉면에 고르게(6자리, 한 나무 최대 열매 수와 같다) */
export function fruitSpots(tl = ORCHARD_TREE) {
  const dirs = [[-0.75, -0.1, 0.55], [0.8, -0.2, -0.35], [0.25, 0.2, 0.9], [-0.4, -0.35, -0.8], [0.7, 0.25, 0.45], [-0.9, 0.2, -0.3]];
  return dirs.map(([dx, dy, dz]) => {
    const L = Math.hypot(dx, dy, dz) || 1;
    return [dx / L * tl.fruitR, tl.canopyY + dy / L * tl.fruitR * tl.fruitSquash, dz / L * tl.fruitR];
  });
}

/** 나무 밑 흙 원판 — 가꾼 나무라는 표시. 월드 좌표 나무 목록으로 한 덩이(드로우콜 1).
 *  stream: 시냇물 중심선(월드) — 시냇가 자리는 원판이 물을 덮지 않게 줄인다(여울 반폭+흔들림 ≈ 2.6) */
export function buildTreeSoil(trees, stream = []) {
  if (!trees.length) return null;
  const k = kit();
  trees.forEach((t, i) => {
    const d = stream.length ? Math.min(...stream.map(p => Math.hypot(p.x - t.x, p.z - t.z))) : Infinity;
    const r = Math.max(0.55, Math.min(1.0 + (i % 2) * 0.1, d - 2.75));
    const g = new THREE.CircleGeometry(r, 12); g.rotateX(-Math.PI / 2); g.translate(t.x, 0.04, t.z);
    k.geo(C.soil, g, true);
  });
  const grp = k.build(); grp.userData.ownGeo = true;   // rebuild 마다 새로 굽는다 → disposeOwned 로 푼다
  return grp;
}

/** ownGeo 표식이 있는 그룹만 지오메트리·재질을 푼다 — shared() 캐시(나무·지면)는 절대 건드리지 않는다 */
export function disposeOwned(obj) {
  if (!obj?.userData?.ownGeo) return;
  obj.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
}
