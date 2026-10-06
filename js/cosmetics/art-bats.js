// js/cosmetics/art-bats.js
// =============================================================
//  calm forest · 🦇 할로윈 등 장식 2종 — 펼친 박쥐 날개(bat_wing) · 박쥐 망토(bat_cape)
//  ------------------------------------------------------------
//  ▶ 시안·확정: sims/halloween-tools-sim.html 망토 탭(2026-10-06) — A 펼친 박쥐 날개 · C 일반 망토 + 꼬마 박쥐.
//    조형 수치는 시안 capeKit·wingCape·roundCape·batsCape 에서 그대로 옮겼다. 시안을 고치면 여기도 같이 고친다.
//  ▶ art.js 를 import 하지 않는다(순환). 재질·천 껍질은 art.js 가 h = { clay, put, P, clothShell } 로 넘긴다.
//  ▶ 좌표는 등 앵커 로컬 — art.js BACK.cape 와 같은 규약(anchors.backAnchor: y = bodyY + 0.30R, z = −0.98·R·bs[2]).
//  ▶ ⚡ 병합: mergeStatics(g) 는 **g 의 직계 자식만** 본다. 그룹으로 조립한 파츠는 flatten() 으로
//    행렬을 지오메트리에 구워 g 바로 아래로 올린다. 재질 버킷은 천(정점색) · flat clay · smooth clay.
//  ▶ ⚠️ 블룸 임계 0.85 — 넓은 면 색은 그 아래다.
// =============================================================

// ── 팔레트(시안 CAPE_C) — PALETTE 는 건드리지 않는다 ──────────────
//  face = 겉에서 보이는 색 · lining = 안감.
const CAPE_C = Object.freeze({
  wing: Object.freeze({ face: 0x5a4693, lining: 0xe0803a, bone: 0x3b2d70, trim: 0xf59a3a }),
  bats: Object.freeze({ face: 0x7a62c0, lining: 0x4c3d85, bone: 0x2f2554, trim: 0xe9a24a }),
});
const BAT_BODY = 0x2f2554, BAT_EYE = 0xffe27a;
const BROOCH = 0xf0893a, BROOCH_STEM = 0x6f8a3a;

//  ⚠️ clothShell 의 out/inn 은 겉면 삼각형 감김이 안쪽을 보게 돼 있어 **바깥에서는 inn 색이 보인다**
//     (기존 🦸 망토도 P.capeIn 이 겉으로 나온다). 시안처럼 face 를 inn 에 넣어 맞춘다.
const shellColors = c => ({ out: c.lining, inn: c.face });

const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t * t * (3 - 2 * t);
const smooth = (a, b, t) => ease(Math.min(1, Math.max(0, (t - a) / (b - a))));

/** 꼬리 종류 — 게임(game.js charK)은 { type } 객체, 시뮬(cosmetic-sim)은 문자열을 넘긴다 */
const tailType = t => (typeof t === 'string' ? t : t?.type);

/** 시안 capeKit — k = { R, HR, HY, bs, bodyY, tail } 에서 망토 공통 수치를 푼다(art.js BACK.cape 와 같은 식) */
function capeKit(k) {
  const R = k.R, bs = k.bs, zc = R * bs[2] * 0.98, anchorY = k.bodyY + R * 0.30;
  const yTop = (k.HY - k.HR * 0.58) - anchorY, rNeck = k.HR * 0.92 * 1.02;
  const hAt = y => { const dy = (y + anchorY - k.bodyY) / (R * bs[1]); return R * bs[0] * Math.sqrt(Math.max(0.02, 1 - dy * dy)); };
  const bodyMax = R * Math.max(bs[0], bs[2]);
  const tail = tailType(k.tail);
  const BIG = tail === 'bushy' || tail === 'long';
  return { R, bs, zc, anchorY, yTop, rNeck, hAt, bodyMax, BIG, tail, ARC: Math.PI * 1.06 };
}

/** 그룹으로 조립한 메시의 행렬을 지오메트리에 굽고 g 바로 아래로 올린다(mergeStatics 가 직계 자식만 본다) */
function flatten(g) {
  g.updateMatrixWorld(true);
  const nested = [];
  g.traverse(o => { if (o.isMesh && o.parent !== g) nested.push(o); });
  for (const m of nested) {
    m.geometry.applyMatrix4(m.matrixWorld);
    m.position.set(0, 0, 0); m.quaternion.identity(); m.scale.set(1, 1, 1);
    g.add(m);
  }
  [...g.children].filter(o => !o.isMesh).forEach(o => g.remove(o));
}

/** 인덱스 있는 천 껍질 여러 장을 한 지오메트리로 — 날개 두 장이 정점색 천 한 콜이 된다 */
function mergeShells(THREE, geos) {
  const out = new THREE.BufferGeometry(), idx = [];
  for (const name of ['position', 'color', 'normal']) {
    const arr = [];
    geos.forEach(g => arr.push(...g.attributes[name].array));
    out.setAttribute(name, new THREE.Float32BufferAttribute(arr, 3));
  }
  let off = 0;
  geos.forEach(g => { g.index.array.forEach(i => idx.push(i + off)); off += g.attributes.position.count; });
  out.setIndex(idx);
  return out;
}

const clothMat = THREE => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });

// ── 공통 조형 ───────────────────────────────────────────────
// 박쥐 날개 윤곽 — 어깨 (0,.05) → 바깥 +x, 끝이 뾰족한 손가락 셋(tool-skins-halloween.js 와 같은 점)
function batWingShape(THREE, sc = 1) {
  const P = (x, y) => [x * sc, y * sc], s = new THREE.Shape();
  s.moveTo(...P(0, 0.05));
  s.quadraticCurveTo(...P(0.10, 0.17), ...P(0.27, 0.11));
  [[0.21, 0.015], [0.245, -0.075], [0.15, -0.025], [0.165, -0.115], [0.09, -0.05], [0.075, -0.125], [0, -0.06]].forEach(p => s.lineTo(...P(...p)));
  s.closePath(); return s;
}
const ext = (THREE, shape, depth, bev = 0.01, seg = 12) => {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: seg });
  g.translate(0, 0, -depth / 2); return g;
};
// 호박: 결 있는 납작 구 + 꼭지
function pumpkinGeo(THREE, r, ribs = 6, amp = 0.09, squash = 0.82) {
  const g = new THREE.SphereGeometry(r, ribs * 4, 9), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), phi = Math.atan2(z, x);
    const f = 1 + amp * Math.cos(ribs * phi) * Math.sqrt(Math.max(0, 1 - (y / r) ** 2));
    p.setXYZ(i, x * f, y * squash, z * f);
  }
  g.computeVertexNormals(); return g;
}

/** 깃 + 여밈끈 + 꼬마 호박 브로치(시안 collar).
 *  ▶ 호박은 시안에서 smooth 였지만 **flat** 으로 둔다 — 깃·끈과 한 버킷이 돼 드로우콜이 하나 준다
 *    (지름 ≈0.1 라 면이 거의 안 읽힌다). */
function collar(THREE, g, K, trim, h) {
  const { R, rNeck, yTop, zc, ARC } = K, tube = R * 0.062;
  const band = h.put(g, new THREE.Mesh(new THREE.TorusGeometry(rNeck, tube, 5, 30, ARC), h.clay(trim)), 0, yTop + R * 0.04, zc);
  band.rotation.x = Math.PI / 2; band.rotation.z = -Math.PI / 2 - ARC / 2;   // 토러스는 +x 에서 시작 — 호의 가운데를 등(−z)으로
  const cord = h.put(g, new THREE.Mesh(new THREE.TorusGeometry(rNeck * 0.82, tube * 0.42, 4, 16, Math.PI * 2 - ARC), h.clay(trim)), 0, yTop + R * 0.02, zc);
  cord.rotation.x = Math.PI / 2; cord.rotation.z = -Math.PI / 2 + ARC / 2;
  const pr = R * 0.1, sq = 0.82;
  const pk = new THREE.Group(); pk.position.set(0, yTop - R * 0.02, zc + rNeck * 0.9); g.add(pk);
  h.put(pk, new THREE.Mesh(pumpkinGeo(THREE, pr, 6, 0.09, sq), h.clay(BROOCH)), 0, 0, 0);
  const st = h.put(pk, new THREE.Mesh(new THREE.CylinderGeometry(pr * 0.13, pr * 0.2, pr * 0.42, 5), h.clay(BROOCH_STEM)), 0, pr * sq * 0.98 + pr * 0.08, 0);
  st.rotation.z = 0.2;
}

// =============================================================
//  A 🦇 펼친 박쥐 날개 — 시안 wingCape
// =============================================================
//  ▶ 날개 두 장이 등에서 양옆으로 펴진다. 막은 몸 타원체를 따라 붙되 gap 만큼 띄워 뚫지 않는다.
//  ▶ 꼬리가 있는 종(🦊🐱🐰…)은 날개 뿌리를 ±0.42R 로 벌려 **두 날개 사이로 꼬리가 지나간다**.
//    🐻🐼 그루터기 꼬리만 ±0.06R 로 붙인다.
//  ▶ 날개 끝(P1)은 ±1.95R · 뒤로 0.78R — 시안에서 휘두르기 자세의 팔과 팔 굵기 109~184% 떨어진 자리다.
//    이 점들을 바꾸면 팔 간격을 다시 재야 한다.
export function buildBatWing(THREE, g, k, h) {
  const C = CAPE_C.wing, K = capeKit(k), { R, bs, zc, anchorY } = K;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const bodyY = k.bodyY, toLocal = (x, y, z) => ({ x, y: y + bodyY - anchorY, z: z + zc });
  const zBody = (x, y) => { const d = 1 - (x / (R * bs[0])) ** 2 - (y / (R * bs[1])) ** 2; return d > 0.001 ? -R * bs[2] * Math.sqrt(d) : null; };
  const gap = R * 0.05, yN = (k.HY - k.HR * 0.58) - bodyY;
  const rx = K.tail === 'stub' ? 0.06 : 0.42;
  const shells = [];
  const wing = s => {
    const P0 = V3(s * R * rx, yN - R * 0.05, 0), P1 = V3(s * R * 1.95, R * 0.02, -R * 0.78), CC = V3(s * R * 0.95, yN + R * 0.62, -R * 0.62);
    const lead = u => V3((1 - u) ** 2 * P0.x + 2 * u * (1 - u) * CC.x + u * u * P1.x, (1 - u) ** 2 * P0.y + 2 * u * (1 - u) * CC.y + u * u * P1.y, (1 - u) ** 2 * P0.z + 2 * u * (1 - u) * CC.z + u * u * P1.z);
    const base = u => V3(s * R * lerp(rx, 1.95, u), lerp(-R * 0.62, R * 0.02, ease(u)), lerp(-R * 0.1, -R * 0.78, u));
    const sc = u => 0.34 * Math.abs(Math.cos(3.5 * Math.PI * u));          // 손가락 끝 u=.14 .43 .71 1.0 / 골짜기 사이
    const trail = u => base(u).lerp(lead(u), sc(u));
    const surf = (u, v) => {
      const p = lead(u).lerp(trail(u), v);
      p.z -= R * 0.07 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v);                 // 막이 불룩
      const zb = zBody(p.x, p.y); if (zb != null && p.z > zb - gap) p.z = zb - gap;    // 몸에 붙어 따라가되 뚫지 않는다
      return toLocal(p.x, p.y, p.z);
    };
    //  왼날개는 u 를 뒤집어 감김을 맞춘다 — 그래야 두 장의 겉·안이 같은 쪽을 본다
    shells.push(h.clothShell(THREE, s > 0 ? surf : (u, v) => surf(1 - u, v), { segU: 28, segV: 10, thick: R * 0.03, ...shellColors(C) }));
    const bone = (pts, r) => {
      const cv = new THREE.CatmullRomCurve3(pts.map(p => { const q = toLocal(p.x, p.y, p.z - gap * 0.6); return V3(q.x, q.y, q.z); }));
      h.put(g, new THREE.Mesh(new THREE.TubeGeometry(cv, 10, r, 4), h.clay(C.bone)), 0, 0, 0);
    };
    bone(Array.from({ length: 7 }, (_, i) => lead(i / 6)), R * 0.016);                  // 앞 뼈대
    [0.43, 0.71].forEach(uf => bone([lead(uf * 0.55), lead(uf * 0.8).lerp(trail(uf), 0.5), trail(uf)], R * 0.011));   // 손가락 뼈
  };
  wing(1); wing(-1);
  h.put(g, new THREE.Mesh(mergeShells(THREE, shells), clothMat(THREE)), 0, 0, 0);
  collar(THREE, g, K, C.trim, h);
  flatten(g);
}

// =============================================================
//  C 🧛 박쥐 망토 — 시안 roundCape + batsCape(일반 긴 망토 + 천에 꼬마 박쥐 셋)
// =============================================================
//  ▶ 천은 art.js BACK.cape 와 같은 식(주름 8 · 자락 무릎께 · 팔 앞에서 끊는 ARC · 꼬리 종류별 뒤트임).
function roundCape(THREE, g, K, h, o) {
  const { R, zc, yTop, rNeck, hAt, bodyMax, ARC } = K;
  const yBot = R * o.bot;
  const rShoulder = Math.max(hAt(yTop - R * 0.45), bodyMax) * (1.10 + o.foldAmt), rHem = rShoulder * o.flare;
  const VENT = K.BIG ? 0.26 : 0.06, VENT_TOP = K.BIG ? 0.45 : 0.30;
  const surf = (u, v) => {
    const vent = VENT * (VENT_TOP + (1 - VENT_TOP) * smooth(0.04, 0.42, v));
    const s = u < 0.5 ? -1 : 1, t = u < 0.5 ? (0.5 - u) * 2 : (u - 0.5) * 2, th = s * (vent + (ARC / 2 - vent) * t);
    const r = (rNeck + (rShoulder - rNeck) * smooth(0, 0.30, v) + (rHem - rShoulder) * smooth(0.30, 1, v)) * (1 + o.foldAmt * smooth(0.12, 1, v) * Math.cos(o.folds * th));
    const y = yTop + (yBot - yTop) * v + o.hem * R * v * v * Math.cos(o.folds * th + Math.PI);
    return { x: Math.sin(th) * r, y, z: zc - Math.cos(th) * r - 0.10 * R * v * v };
  };
  //  ⚠️ segU 는 짝수 — u=0.5(좌·우 폭 경계)가 열 경계에 와야 split 으로 뒤트임이 갈린다
  h.put(g, new THREE.Mesh(h.clothShell(THREE, surf, { segU: 40, segV: 13, split: 20, thick: R * 0.035, ...shellColors(o) }), clothMat(THREE)), 0, 0, 0);
  collar(THREE, g, K, o.trim, h);
  return surf;
}

/** 꼬마 박쥐 하나 — s = 크기 기준. 눈은 발광 없이 노랑(꾸미기엔 밤 발광 경로가 없다) */
function bat(THREE, parent, s, h) {
  const gr = new THREE.Group(); parent.add(gr);
  const bm = h.clay(BAT_BODY, false);
  h.put(gr, new THREE.Mesh(new THREE.SphereGeometry(s * 0.17, 8, 6), bm), 0, 0, s * 0.02);
  h.put(gr, new THREE.Mesh(new THREE.SphereGeometry(s * 0.13, 8, 6), bm), 0, s * 0.19, s * 0.02);
  [-1, 1].forEach(sx => {
    h.put(gr, new THREE.Mesh(new THREE.ConeGeometry(s * 0.05, s * 0.12, 4), bm), sx * s * 0.07, s * 0.32, s * 0.02);
    const w = new THREE.Group(); w.position.set(sx * s * 0.1, 0, 0); w.rotation.y = sx > 0 ? 0 : Math.PI; gr.add(w);
    h.put(w, new THREE.Mesh(ext(THREE, batWingShape(THREE, s * 3.2), s * 0.04, s * 0.01, 8), bm), 0, 0, 0);
    h.put(gr, new THREE.Mesh(new THREE.SphereGeometry(s * 0.026, 5, 4), h.clay(BAT_EYE, false)), sx * s * 0.055, s * 0.21, s * 0.13);
  });
  return gr;
}

export function buildBatCape(THREE, g, k, h) {
  const C = CAPE_C.bats, K = capeKit(k), R = K.R;
  const surf = roundCape(THREE, g, K, h, { ...C, bot: -1.05, flare: 1.22, folds: 8, foldAmt: 0.075, hem: 0.09 });
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const pin = (u, v, sc, roll = 0) => {   // 천 위에 납작하게 핀으로 꽂는다
    const p = surf(u, v), du = surf(Math.min(1, u + 0.02), v), dv = surf(u, Math.min(1, v + 0.03));
    const P = V3(p.x, p.y, p.z), tu = V3(du.x - p.x, du.y - p.y, du.z - p.z).normalize(), tv = V3(dv.x - p.x, dv.y - p.y, dv.z - p.z).normalize();
    const n = tu.clone().cross(tv).normalize(); if (n.z > 0) n.negate();   // 법선이 몸 바깥(−z)을 보게
    const up = tv.clone().negate(), right = up.clone().cross(n).normalize(), up2 = n.clone().cross(right).normalize();
    const gr = new THREE.Group(); gr.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up2, n)); gr.rotateZ(roll);
    gr.position.copy(P).addScaledVector(n, R * 0.04); g.add(gr); bat(THREE, gr, R * sc, h);
  };
  pin(0.36, 0.80, 0.46, 0.12); pin(0.68, 0.50, 0.34, -0.2); pin(0.60, 0.92, 0.24, 0.3);
  flatten(g);
}
