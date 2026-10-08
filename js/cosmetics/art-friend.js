// js/cosmetics/art-friend.js
// =============================================================
//  calm forest · 🤝 친구 초대 보상 꾸미기 2종 — 🦋 별빛 우정 날개(friend_wing) · 💗 우정 하트핀(friend_pin)
//  ------------------------------------------------------------
//  ▶ 시안·확정: sims/referral-reward-sim.html — 날개 A(스테인드글라스 나비) · 하트핀 B(수정 하트 + 별 방울),
//    2026-10-08 사용자 선택. 시안은 **이 파일을 import 한다**(복제본 없음).
//  ▶ art.js 를 import 하지 않는다(순환). 재질·put 은 art.js 가 h = { clay, put, P, clothShell } 로 넘긴다(art-bats.js 와 같은 규약).
//  ▶ 좌표: 날개 = 등 앵커 로컬(anchors.backAnchor), 하트핀 = 머리 중심(anchors.headAnchor).
//  ▶ ⚡ 병합: art.js mergeStatics 는 g 의 **직계 자식**만 본다 → flatten() 으로 행렬을 지오메트리에 굽는다.
//    반투명 유리(날개 4장)는 mergeStatics 가 건너뛰므로 여기서 정점색 한 덩이로 직접 합친다.
//  ▶ 🌙 꾸미기엔 밤 발광 경로가 없다 — 보석은 발광 없이 색만(블룸 임계 0.85 아래로 둔다).
//  ▶ 날갯짓: 게임 꾸미기는 앵커 자식을 통째로 갈아끼울 뿐 매 프레임 움직이지 않는다(art.js 주석) → 정지 자세.
//    시안의 펄럭임은 시안 전용 연출이다.
// =============================================================

const WA = Object.freeze({ gold: 0xf0c95a, paneU: 0xf6a9cf, paneL: 0xa9d2f6, eyeU: 0xc9b2f5, eyeL: 0xa8e6cc, gem: 0xf6dc78 });
const PA = Object.freeze({ gold: 0xf2cd5c, quartz: 0xf8b6d2, core: 0xec6aa3, star: 0xf6dc78 });

/** 하트핀 자리 — 옆머리 **앞쪽** 낮게(star_pin 과 같은 문법). 귀(뒤쪽 x≈0.6·HR, z≤0.04·HR)보다 앞, 눈(z≈0.86)보다 옆 */
export const PIN_DIR = Object.freeze({ x: 0.80, y: 0.38, z: 0.46 });
/** 하트핀 배율(× HR) — 시안 1.3 은 작아서 구분이 안 됐다(사용자 피드백 2026-10-08) */
export const PIN_SCALE = 1.55;
/** 날개 크기 — 여우(R .52) 기준 × R/.52 × WING_K */
export const WING_K = 0.86;

const WING_UP = [[0.03, 0.05], [0.16, 0.3], [0.42, 0.56], [0.74, 0.64], [0.9, 0.46], [0.8, 0.2], [0.46, 0.05]];
const WING_LO = [[0.03, -0.02], [0.38, -0.05], [0.6, -0.22], [0.54, -0.46], [0.32, -0.52], [0.11, -0.3]];

function shapes(THREE) {
  const ext = (shape, depth, bev = 0.01, seg = 12, bevSeg = 2, bevSize = bev) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bevSize, bevelSegments: bevSeg, curveSegments: seg });
    g.translate(0, 0, -depth / 2); return g;
  };
  const starShape = (r, k = 0.46, n = 5) => {
    const s = new THREE.Shape();
    for (let i = 0; i < n * 2; i++) { const a = Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r * k : r; i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    s.closePath(); return s;
  };
  const heartShape = r => {
    const s = new THREE.Shape();
    s.moveTo(0, -r * 0.95);
    s.bezierCurveTo(r * 0.35, -r * 0.6, r * 1.1, -r * 0.2, r * 1.0, r * 0.32);
    s.bezierCurveTo(r * 0.92, r * 0.92, r * 0.2, r * 0.98, 0, r * 0.5);
    s.bezierCurveTo(-r * 0.2, r * 0.98, -r * 0.92, r * 0.92, -r * 1.0, r * 0.32);
    s.bezierCurveTo(-r * 1.1, -r * 0.2, -r * 0.35, -r * 0.6, 0, -r * 0.95);
    return s;
  };
  // 날개 잎(로브) — 점들을 매끈하게 잇고, k 로 무게중심 쪽으로 줄인다(테의 구멍·유리판)
  const lobeShape = (pts, k = 1, path = null) => {
    const c = pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length], [0, 0]);
    const P = pts.map(([x, y]) => new THREE.Vector2(c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k));
    const s = path || new THREE.Shape(); s.moveTo(P[0].x, P[0].y); s.splineThru([...P.slice(1), P[0]]);
    return { s, c };
  };
  const puffStar = (r, k = 0.5) => ext(starShape(r, k), r * 0.3, r * 0.2, 4, 3, r * 0.1);
  return { ext, starShape, heartShape, lobeShape, puffStar };
}

/** 그룹으로 조립한 메시의 행렬을 지오메트리에 굽고 g 바로 아래로 올린다.
 *  ⚠️ 거울(scale.x<0) 날개는 행렬식이 음수 — 구우면 삼각형 감김이 뒤집혀 앞면이 컬링된다. 감김을 뒤집어 맞춘다. */
function flatten(g) {
  g.updateMatrixWorld(true);
  const inv = g.matrixWorld.clone().invert(), nested = [];
  g.traverse(o => { if (o.isMesh && o.parent !== g) nested.push(o); });
  for (const m of nested) {
    const mat = inv.clone().multiply(m.matrixWorld);
    const geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    geo.applyMatrix4(mat);
    if (mat.determinant() < 0) {
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i += 3) for (let c = 0; c < 3; c++) { const a = p.getComponent(i + 1, c); p.setComponent(i + 1, c, p.getComponent(i + 2, c)); p.setComponent(i + 2, c, a); }
      geo.computeVertexNormals();
    }
    m.geometry.dispose(); m.geometry = geo;
    m.position.set(0, 0, 0); m.quaternion.identity(); m.scale.set(1, 1, 1);
    g.add(m);
  }
  [...g.children].filter(o => !o.isMesh).forEach(o => g.remove(o));
}

/** g 의 반투명 메시들을 정점색 한 덩이로(드로우콜 1) */
function mergeGlass(THREE, g, opacity) {
  const glass = g.children.filter(o => o.isMesh && o.material.transparent);
  if (glass.length < 2) return;
  const pos = [], nor = [], col = [];
  for (const m of glass) {
    const geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry, c = m.material.color;
    pos.push(...geo.attributes.position.array); nor.push(...geo.attributes.normal.array);
    for (let i = 0; i < geo.attributes.position.count; i++) col.push(c.r, c.g, c.b);
    g.remove(m); m.geometry.dispose(); m.material.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false }));
  mesh.castShadow = false; g.add(mesh);
}

const glassMat = (THREE, color, opacity, side) => new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0, flatShading: true, transparent: true, opacity, side });

// =============================================================
//  🦋 별빛 우정 날개 — 금 테 + 반투명 파스텔 유리 + 눈무늬 보석 (시안 wingButterfly)
// =============================================================
export function buildFriendWing(THREE, g, k, h) {
  const { ext, lobeShape, puffStar } = shapes(THREE), S = k.R / 0.52 * WING_K;
  [1, -1].forEach(s => {
    const root = new THREE.Group(); root.position.set(s * k.R * 0.1, k.R * 0.02, -k.R * 0.12); root.scale.set(s * S, S, S); g.add(root);
    const tilt = new THREE.Group(); tilt.rotation.z = 0.12; root.add(tilt);
    const side = new THREE.Group(); side.rotation.y = 0.22; tilt.add(side);   // 살짝 뒤로 젖힌 정지 자세
    [[WING_UP, WA.paneU, WA.eyeU, 0.09], [WING_LO, WA.paneL, WA.eyeL, 0.065]].forEach(([pts, pc, ec, er]) => {
      const fr = lobeShape(pts).s, hole = lobeShape(pts, 0.8, new THREE.Path()); fr.holes.push(hole.s);
      h.put(side, new THREE.Mesh(ext(fr, 0.03, 0.007, 20), h.clay(WA.gold)), 0, 0, 0);
      h.put(side, new THREE.Mesh(ext(lobeShape(pts, 0.86).s, 0.012, 0, 20), glassMat(THREE, pc, 0.74, THREE.DoubleSide)), 0, 0, 0, false);
      const c = hole.c;
      h.put(side, new THREE.Mesh(ext(new THREE.Shape().absarc(0, 0, er, 0, Math.PI * 2), 0.046, 0.006, 14), h.clay(ec)), c[0] + (c[0] - 0.05) * 0.25, c[1] + c[1] * 0.2, 0, false);   // 작은 부품은 그림자 안 드리움(지글거림)
      const ang = Math.atan2(c[1], c[0]), len = Math.hypot(c[0], c[1]) * 0.9;   // 금 잎맥 — 뿌리에서 눈무늬로
      const vein = h.put(side, new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, len, 5), h.clay(WA.gold)), Math.cos(ang) * len / 2 + 0.02, Math.sin(ang) * len / 2, 0, false);
      vein.rotation.z = ang - Math.PI / 2;
    });
    h.put(side, new THREE.Mesh(puffStar(0.035), h.clay(WA.gem)), 0.74, 0.64, 0.02, false);
  });
  flatten(g);
  mergeGlass(THREE, g, 0.74);
}

// =============================================================
//  💗 우정 하트핀 — 깎은 장밋빛 수정 하트(속 하트 비침) + 금별 방울 (시안 PINS.crystal)
// =============================================================
export function buildFriendPin(THREE, g, k, h) {
  const { ext, heartShape, puffStar } = shapes(THREE), HR = k.HR;
  const d = new THREE.Vector3(PIN_DIR.x, PIN_DIR.y, PIN_DIR.z).normalize();
  const f = new THREE.Group(); f.position.copy(d).multiplyScalar(HR * 0.99);
  f.lookAt(d.clone().multiplyScalar(HR * 3)); f.scale.setScalar(HR * PIN_SCALE); g.add(f);   // +z = 머리 바깥, 단위 = HR
  h.put(f, new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.055, 0.05), h.clay(PA.gold)), 0, 0, 0.03, false);
  h.put(f, new THREE.Mesh(ext(heartShape(0.21), 0.07, 0.04, 3, 1, 0.02), glassMat(THREE, PA.quartz, 0.8, THREE.FrontSide)), 0, 0.06, 0.13, false);
  h.put(f, new THREE.Mesh(ext(heartShape(0.11), 0.05, 0.02, 3, 1), h.clay(PA.core)), 0, 0.07, 0.13, false);
  [-0.2, -0.26].forEach(y => h.put(f, new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 5), h.clay(PA.gold)), 0, y, 0.15, false));
  h.put(f, new THREE.Mesh(puffStar(0.065), h.clay(PA.star)), 0, -0.33, 0.16, false);
  flatten(g);
}
