// js/spaces/friend-arch-art.js
// =============================================================
//  calm forest · 🌈 무지개 우정 아치(friendarch) — 🤝 친구 3명 초대 보상 야외 장식 조형
//  ------------------------------------------------------------
//  ▶ 시안·확정: sims/referral-reward-sim.html 아치 B안(꽃 덩굴 아치, 2026-10-08 사용자 선택).
//    시안은 **이 파일을 import 한다**(복제본 없음).
//  ▶ 원점 = 바닥 중심, 걸어서 통과하는 크기(폭 ~2.3 · 높이 ~2.5, 안쪽 폭 ~2.0). 충돌체 없음(webarch 와 같다).
//  ▶ ⚡ 드로우콜 3: 불투명 몸체 정점색 한 덩이 · 리본(양면) 정점색 한 덩이 · 반짝이 발광 1.
//  ▶ ⚠️ 블룸 임계 0.85 — 크림 격자·레몬이 넓어서 luma 0.83 아래로 낮췄다(시안 1차 0xf6e7d0 은 0.91).
//    발광은 꼭대기 작은 반짝이 하나뿐, 밤에만 켠다(onNight → game.js houseWindows).
//  ▶ 리본 흔들림은 없다 — 야외 장식에 공용 애니메이션 훅이 없다(화덕 불꽃은 전용 목록). 정지 자세.
//  ▶ THREE 를 인자로 받는다(node 테스트는 소스 검사만 — tests/referral-art.test.mjs).
// =============================================================

export const FRIEND_ARCH_ID = 'friendarch';
const AB = Object.freeze({ wood: 0xe2cfb2, leaf: 0x86bf6a, pink: 0xf5a0bf, lemon: 0xf6d77e, sky: 0xa2c9f2, heart: 0xff86b4 });

function shapesOf(T) {
  const ext = (shape, depth, bev = 0.01, seg = 12, bevSeg = 2, bevSize = bev) => {
    const g = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bevSize, bevelSegments: bevSeg, curveSegments: seg });
    g.translate(0, 0, -depth / 2); return g;
  };
  const petal = (w, h) => { const s = new T.Shape(); s.moveTo(0, 0); s.bezierCurveTo(w * 1.1, h * 0.22, w * 0.95, h * 0.8, 0, h); s.bezierCurveTo(-w * 0.95, h * 0.8, -w * 1.1, h * 0.22, 0, 0); return s; };
  const heart = r => {
    const s = new T.Shape(); s.moveTo(0, -r * 0.95);
    s.bezierCurveTo(r * 0.35, -r * 0.6, r * 1.1, -r * 0.2, r * 1.0, r * 0.32); s.bezierCurveTo(r * 0.92, r * 0.92, r * 0.2, r * 0.98, 0, r * 0.5);
    s.bezierCurveTo(-r * 0.2, r * 0.98, -r * 0.92, r * 0.92, -r * 1.0, r * 0.32); s.bezierCurveTo(-r * 1.1, -r * 0.2, -r * 0.35, -r * 0.6, 0, -r * 0.95);
    return s;
  };
  const star4 = r => { const s = new T.Shape(); for (let i = 0; i < 8; i++) { const a = Math.PI / 2 + i * Math.PI / 4, rr = i % 2 ? r * 0.32 : r; i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } s.closePath(); return s; };
  const ribbon = (len, w, waves = 1.5, amp = 0.04) => {
    const g = new T.PlaneGeometry(w, len, 1, 14), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), t = (len / 2 - y) / len; p.setZ(i, Math.sin(t * Math.PI * 2 * waves) * amp * t); p.setY(i, y - len / 2); }
    g.computeVertexNormals(); return g;
  };
  return { ext, petal, heart, star4, ribbon };
}

/** 조립 — 파츠마다 kind('body'|'ribbon'|'glow')를 붙여 모은다(그룹 행렬은 굽기에서 반영) */
function assemble(T, root) {
  const { ext, petal, heart, star4, ribbon } = shapesOf(T);
  const kinds = new Map();
  const mk = (geo, color, kind, x = 0, y = 0, z = 0, parent = root) => { const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color })); m.position.set(x, y, z); parent.add(m); kinds.set(m, kind); return m; };
  const grp = (x, y, z, parent = root) => { const g = new T.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const flower = (x, y, z, s, petalC, centerC) => {
    const gr = grp(x, y, z); gr.scale.setScalar(s);
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; mk(new T.SphereGeometry(0.075, 7, 5), petalC, 'body', Math.cos(a) * 0.07, Math.sin(a) * 0.07, 0, gr).scale.set(1, 1, 0.45); }
    mk(new T.SphereGeometry(0.045, 6, 5), centerC, 'body', 0, 0, 0.02, gr);
  };
  const R = 1.05, H = 1.15;
  [-1, 1].forEach(s => {
    [-0.13, 0.13].forEach(z => mk(new T.BoxGeometry(0.07, H - 0.02, 0.07), AB.wood, 'body', s * R, 0.02 + (H - 0.02) / 2, z));
    [0.32, 0.64, 0.96].forEach(y => mk(new T.BoxGeometry(0.05, 0.05, 0.26), AB.wood, 'body', s * R, y, 0));
    mk(new T.BoxGeometry(0.24, 0.06, 0.4), AB.wood, 'body', s * R, 0.05, 0);
    // 기둥 위 리본 매듭 + 무지개 꼬리 셋(분홍·레몬·하늘)
    const bow = grp(s * R, H - 0.02, 0.2);
    [-1, 1].forEach(sx => mk(new T.TorusGeometry(0.08, 0.028, 5, 10), AB.pink, 'body', sx * 0.09, 0.02, 0, bow).scale.set(1.15, 0.75, 1));
    mk(new T.SphereGeometry(0.04, 6, 5), AB.pink, 'body', 0, 0, 0, bow);
    [[AB.pink, -0.065], [AB.lemon, 0], [AB.sky, 0.065]].forEach(([c, x], k) => mk(ribbon(0.62 - Math.abs(k - 1) * 0.08, 0.06, 1.3, 0.05), c, 'ribbon', x, -0.03, 0.02 + k * 0.016, bow));
  });
  [-0.13, 0.13].forEach(z => mk(new T.TorusGeometry(R, 0.04, 6, 30, Math.PI), AB.wood, 'body', 0, H, z));
  for (let i = 1; i < 8; i++) { const a = Math.PI * i / 8; mk(new T.BoxGeometry(0.05, 0.05, 0.26), AB.wood, 'body', Math.cos(a) * R, H + Math.sin(a) * R, 0); }
  [0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 0.82, 0.92].forEach((t, i) => {
    const a = Math.PI * t, x = Math.cos(a) * R, y = H + Math.sin(a) * R;
    for (let j = 0; j < 2; j++) mk(ext(petal(0.07, 0.2), 0.012, 0.005, 6), AB.leaf, 'body', x, y, 0.17 - j * 0.34).rotation.set(0, j * Math.PI, a + (j ? -0.6 : 0.6) + (i % 2 ? 0.5 : -0.5));
    if (i !== 4) flower(x * 1.04, y + 0.02, 0.17, 1.45, i % 3 === 1 ? AB.lemon : AB.pink, i % 3 === 1 ? AB.pink : AB.lemon);
  });
  [[-1, 0.8], [-1, 0.42], [1, 0.62]].forEach(([s, y], k) => flower(s * (R + 0.04), y, 0.24, 1.3, k === 1 ? AB.lemon : AB.pink, k === 1 ? AB.pink : AB.lemon));
  // 꼭대기 — 리본 고리 + 통통한 하트 + 늘어진 무지개 꼬리 + 작은 반짝이(밤에만 발광)
  const top = grp(0, H + R + 0.02, 0.2);
  [-1, 1].forEach(sx => mk(new T.TorusGeometry(0.11, 0.035, 5, 12), AB.pink, 'body', sx * 0.13, 0, 0, top).scale.set(1.2, 0.8, 0.6));
  mk(ext(heart(0.19), 0.19 * 0.3, 0.19 * 0.22, 10, 3, 0.19 * 0.1), AB.heart, 'body', 0, 0.02, 0.06, top);
  [[AB.pink, -0.09], [AB.lemon, 0], [AB.sky, 0.09]].forEach(([c, x]) => mk(ribbon(0.5, 0.07, 1.2, 0.05), c, 'ribbon', x, -0.06, -0.02, top));
  mk(ext(star4(0.04), 0.04 * 0.18, 0.04 * 0.06, 2, 1), AB.lemon, 'glow', 0.22, 0.16, 0.05, top);
  return kinds;
}

/** 굽기 — 파츠 행렬을 지오메트리에 굽고 색을 정점에 싣는다 */
function bakeKinds(T, root, kinds) {
  root.updateMatrixWorld(true);
  const out = { body: [], ribbon: [], glow: [] };
  for (const [m, kind] of kinds) {
    const geo = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrixWorld);
    for (const name of Object.keys(geo.attributes)) if (name !== 'position' && name !== 'normal') geo.deleteAttribute(name);
    const c = m.material.color, n = geo.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    out[kind].push(geo);
    m.geometry.dispose(); m.material.dispose();
  }
  return out;
}
function mergeGeos(T, geos) {
  const outGeo = new T.BufferGeometry();
  for (const name of ['position', 'normal', 'color']) {
    let total = 0; for (const g of geos) total += g.attributes[name].array.length;
    const arr = new Float32Array(total); let off = 0;
    for (const g of geos) { arr.set(g.attributes[name].array, off); off += g.attributes[name].array.length; }
    outGeo.setAttribute(name, new T.BufferAttribute(arr, 3));
  }
  for (const g of geos) g.dispose();
  return outGeo;
}

/** 아치 한 점(드로우콜 3). onNight(mat) — 밤에 켤 재질을 등록(game.js 는 houseWindows.push) */
export function buildFriendArch(T, onNight = null) {
  const src = new T.Group(), parts = bakeKinds(T, src, assemble(T, src)), g = new T.Group();
  const body = new T.Mesh(mergeGeos(T, parts.body), new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true }));
  body.castShadow = true; body.receiveShadow = true; g.add(body);
  const rib = new T.Mesh(mergeGeos(T, parts.ribbon), new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true, side: T.DoubleSide }));
  rib.castShadow = true; g.add(rib);
  const glowMat = new T.MeshStandardMaterial({ color: AB.lemon, emissive: AB.lemon, emissiveIntensity: onNight ? 0 : 0.4, roughness: 0.5 });   // 레몬 luma≈0.83 — 블룸 임계 0.85 아래로
  glowMat.userData.nightScale = 0.4;   // houseWindows 는 nightAmt × 2.1 — 작은 반짝이라 낮춘다
  if (onNight) onNight(glowMat);
  g.add(new T.Mesh(mergeGeos(T, parts.glow), glowMat));
  return g;
}
