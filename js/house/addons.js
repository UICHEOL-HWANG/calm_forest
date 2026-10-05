// =============================================================
//  🧩 집 구성품(애드온) — 코인으로 사서 집 외관에 실제로 붙는 장식 12종
//  ------------------------------------------------------------
//  베타 피드백 "코인 쓸 데가 없다" → 단계별 코인 싱크. 외관 꾸미기 창의 🧩 구성품 섹션에서 산다.
//  · HOUSE_ADDONS[].build(THREE, H, stage) → 모델 로컬 공간(정면 +z, 바닥 y=0)의 Group | null
//    낮은 단계에서 산 구성품은 높은 단계 집에도 그 집에 맞는 자리에 붙는다(단계별 POS 표).
//    그 단계에 어울리는 자리가 없으면 null(상점엔 그대로 '설치됨').
//  · 밤 점등 메시는 userData.role='window' + 재질 userData.nightScale(mountHouseModel 이 덮어쓰지 않음)
//  · 굴뚝 연기처럼 움직이는 구성품은 group.userData.anim(t) — game.js 가 프레임마다 부른다(싸게)
//  · 순수 로직(addonState)은 tests/house-addons.test.mjs 에서 검증
//  좌표는 js/house/{cottage,loft,penthouse,villa,stage7-modern,stage7-hanok}.js 의 치수에서 뽑았다 — 모델을 고치면 여기도 같이.
//  🏡 7단계(정원 저택)는 스타일(모던/한옥)마다 자리가 다르다 — 표 키 '7m'(모던) · '7h'(한옥). K(stage, style) 로 고른다.
//     7단계는 구성품도 mountHouseAddons 가 재질별로 병합한다(드로우콜).
// =============================================================

/** 단계 + 스타일 → 위치 표 키. 7단계만 스타일로 갈린다('7m' 모던 · '7h' 한옥), 나머진 단계 번호 그대로. */
export const K = (stage, style) => (stage === 7 ? (style === 'hanok' ? '7h' : '7m') : stage);

const at = (THREE, [x, y, z], ry = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; return g; };
const ico = (THREE, r, mat, x, y, z, detail = 0) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail), mat); m.position.set(x, y, z); return m; };
const cyl = (THREE, rt, rb, h, mat, x, y, z, seg = 8) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); return m; };
// 밤에 빛나는 재질 — 자기 emissive 색과 세기(nightScale)를 갖는다
const lit = (H, color, emissive, nightScale) => { const m = H.clay(color, { emissive, emissiveIntensity: 0 }); m.userData.nightScale = nightScale; return m; };
const glow = (mesh) => { mesh.userData.role = 'window'; mesh.castShadow = false; return mesh; };
const cone = (THREE, r, h, mat, x, y, z, seg = 8) => { const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat); m.position.set(x, y, z); return m; };
const rnd = (i) => { const v = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); };   // 결정적 난수(같은 집이 늘 같은 모양)

// ── 💨 굴뚝 연기: 굴뚝 꼭대기에서 몽글몽글 올라가는 회색 구 4개(anim) ──
const SMOKE_POS = { 3: [-1.15, 4.15, 0.15], 4: [0.32, 4.25, -0.9], 5: [2.0, 5.22, -1.7] };   // 빌라는 굴뚝이 없다
function buildSmoke(THREE, H, stage, style) {
  const p = SMOKE_POS[K(stage, style)]; if (!p) return null;
  const g = at(THREE, p);
  const puffs = [];
  const tints = [0xd9dcdf, 0xe6e8ea, 0xc9ccd0];
  for (let i = 0; i < 6; i++) {
    const m = ico(THREE, 0.12, H.clay(tints[i % 3], { transparent: true, opacity: 0.7 }), 0, 0, 0, 1);
    m.castShadow = m.receiveShadow = false; m.userData.phase = i / 6; g.add(m); puffs.push(m);
  }
  g.userData.anim = (t) => {
    for (const m of puffs) {
      const ph = m.userData.phase, k = (t * 0.26 + ph) % 1;          // 0 → 1: 굴뚝에서 나와 흩어짐
      m.position.set(Math.sin(t * 1.1 + ph * 7) * (0.04 + k * 0.2), 0.1 + k * 1.3, Math.cos(t * 0.9 + ph * 5) * 0.06);
      m.scale.setScalar(0.5 + k * 1.3);
      m.material.opacity = 0.72 * (1 - k) * Math.min(1, k * 6);
    }
  };
  g.userData.anim(0);
  return g;
}

// ── 🏮 정원등 2개: 문 앞 양쪽 기둥등(머리가 밤에 켜짐) ──
const LAMP_POS = { '7m': [[-1.35, 0.28, 3.1], [1.35, 0.28, 3.1]], '7h': [[-1.35, 0.04, 3.1], [1.35, 0.04, 3.1]], 3: [[-1.05, 0.08, 2.0], [0.15, 0.08, 2.0]], 4: [[-0.7, 0.06, 2.0], [0.7, 0.06, 2.0]], 5: [[-1.5, 0.06, 2.05], [-0.62, 0.06, 2.12]], 6: [[-2.35, 0.1, 0.95], [-1.05, 0.1, 0.95]] };
function buildLamps(THREE, H, stage, style) {
  const ps = LAMP_POS[K(stage, style)]; if (!ps) return null;
  const g = new THREE.Group();
  const post = H.clay(0x3b3d45), cap = H.clay(0x2a2c33), head = lit(H, 0xfff0c0, 0xffc46a, 1.0), rock = H.clay(0x9a9a92), tuft = H.clay(0x6b9a4c);
  for (const [x, y, z] of ps) {
    g.add(cyl(THREE, 0.13, 0.16, 0.08, post, x, y + 0.04, z, 8));                 // 받침
    g.add(cyl(THREE, 0.04, 0.055, 0.62, post, x, y + 0.39, z, 8));                // 기둥(아래가 굵다)
    g.add(cyl(THREE, 0.075, 0.075, 0.03, cap, x, y + 0.7, z, 8));                 // 목 장식 고리
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(H.box(0.025, 0.24, 0.025, post, x + sx * 0.09, y + 0.84, z + sz * 0.09));   // 등 틀 모서리 4
    g.add(glow(H.box(0.15, 0.2, 0.15, head, x, y + 0.84, z)));                    // 불빛 심지
    g.add(H.box(0.24, 0.035, 0.24, cap, x, y + 0.97, z));                          // 지붕 판
    g.add(cone(THREE, 0.17, 0.13, cap, x, y + 1.05, z, 4));                       // 뾰족 지붕
    g.add(ico(THREE, 0.03, cap, x, y + 1.14, z));                                   // 꼭지
    for (let i = 0; i < 5; i++) { const a = i * 1.26 + 0.4; g.add(ico(THREE, 0.04, rock, x + Math.cos(a) * 0.2, y + 0.03, z + Math.sin(a) * 0.2)); }   // 발치 돌
    g.add(cone(THREE, 0.05, 0.12, tuft, x + 0.17, y + 0.06, z - 0.12, 5)); g.add(cone(THREE, 0.04, 0.09, tuft, x - 0.16, y + 0.05, z + 0.13, 5));   // 풀잎
  }
  return g;
}

// ── 📮 깃발 우편함: 파란 함 + 둥근 뚜껑 + 빨간 깃발 ──
const MAIL_POS = { '7m': [1.5, 0, 4.05], '7h': [1.45, 0, 4.05], 3: [-2.0, 0.08, 2.0], 4: [2.25, 0.06, 1.55], 5: [2.85, 0, 1.6], 6: [0.05, 0.1, 0.95] };
function buildMailbox(THREE, H, stage, style) {
  const p = MAIL_POS[K(stage, style)]; if (!p) return null;
  const g = at(THREE, p);
  const wood = H.clay(0x8a5a36), woodL = H.clay(0xa87548), blue = H.clay(0x4a6fa5), blueD = H.clay(0x3a5a8a), red = H.clay(0xd9403a), white = H.clay(0xf4f3ee), soil = H.clay(0x6b4a30), leaf = H.clay(0x6b9a4c);
  const petal = [H.clay(0xf07a8a), H.clay(0xf7d15a), H.clay(0xffffff)];
  g.add(H.box(0.09, 0.82, 0.09, wood, 0, 0.41, 0));                                  // 기둥
  g.add(H.box(0.34, 0.06, 0.07, woodL, 0.13, 0.78, 0));                              // 받침 팔
  g.add(H.box(0.42, 0.2, 0.28, blue, 0.18, 0.9, 0));                                 // 함 몸통
  const capGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.42, 12, 1, false, 0, Math.PI); capGeo.rotateZ(Math.PI / 2); capGeo.rotateY(Math.PI / 2);
  const capM = new THREE.Mesh(capGeo, blue); capM.position.set(0.18, 1.0, 0); g.add(capM);   // 둥근 뚜껑(반원통)
  g.add(H.box(0.02, 0.17, 0.22, blueD, 0.4, 0.93, 0));                               // 앞 문
  g.add(H.box(0.03, 0.04, 0.04, white, 0.42, 0.93, 0));                              // 손잡이
  g.add(H.box(0.2, 0.07, 0.01, white, 0.18, 0.9, 0.145));                            // 문패
  g.add(H.box(0.02, 0.24, 0.02, red, 0.38, 1.12, -0.12));                            // 깃대
  g.add(H.box(0.03, 0.12, 0.2, red, 0.38, 1.22, -0.03));                             // 깃발
  g.add(H.box(0.5, 0.12, 0.3, wood, -0.02, 0.06, 0));                                // 발치 화단 틀
  g.add(H.box(0.44, 0.06, 0.24, soil, -0.02, 0.14, 0));
  [[-0.16, 0], [0.0, 0.06], [0.14, -0.04]].forEach(([dx, dz], i) => { g.add(cone(THREE, 0.04, 0.16, leaf, dx, 0.25, dz, 5)); g.add(ico(THREE, 0.055, petal[i], dx, 0.35, dz)); });
  return g;
}

// ── 🌿 덩굴 장식: 벽을 타고 오르는 줄기 + 잎 8장 ──
const IVY_POS = { '7m': [[-3.3, 0.25, -1.4], 2.2], '7h': [[-2.6, 0.55, 3.45], 0.9], 4: [[2.25, 0, 1.33], 2.0], 5: [[-0.25, 0, 1.23], 2.25], 6: [[-2.45, 0, 0.52], 2.3] };
function buildIvy(THREE, H, stage, style) {
  const e = IVY_POS[K(stage, style)]; if (!e) return null;
  const [p, h] = e; const g = at(THREE, p);
  const stem = H.clay(0x3f6b2e), leaf = [H.clay(0x4f8a3a), H.clay(0x5c9c44), H.clay(0x7cb85a)], bloom = [H.clay(0xffffff), H.clay(0xf3b6c8)];
  // 줄기: 살짝 휘며 올라가는 4마디 + 곁가지 2
  let x = 0;
  for (let i = 0; i < 4; i++) { const seg = H.box(0.035, h / 4 + 0.02, 0.03, stem, x, (h / 4) * (i + 0.5), 0.02); seg.rotation.z = (i % 2 ? -1 : 1) * 0.1; g.add(seg); x += (i % 2 ? -1 : 1) * 0.02; }
  for (const [y, side] of [[h * 0.4, 1], [h * 0.7, -1]]) { const b = H.box(0.3, 0.025, 0.025, stem, side * 0.15, y, 0.03); b.rotation.z = side * 0.4; g.add(b); }
  for (let i = 0; i < 22; i++) {                                                         // 잎 22장 — 크기·색·방향이 제각각
    const t = i / 21, y = 0.2 + (h - 0.35) * t, side = rnd(i) > 0.5 ? 1 : -1, off = side * (0.06 + rnd(i + 9) * 0.2);
    g.add(ico(THREE, 0.1 - t * 0.03 + rnd(i + 3) * 0.03, leaf[i % 3], off, y, 0.05));
  }
  for (let i = 0; i < 5; i++) g.add(ico(THREE, 0.035, bloom[i % 2], (rnd(i + 30) - 0.5) * 0.4, 0.5 + rnd(i + 50) * (h - 0.8), 0.1));   // 작은 꽃
  return g;
}

// ── 🪑 앞마당 벤치: 앉는 판 + 등받이 + 다리 2 ──
const BENCH_POS = { '7m': [[1.25, 0.28, 0.1], -Math.PI / 2], '7h': [[1.3, 0.02, 1.2], -Math.PI / 2], 4: [[1.35, 0.06, 2.0], 0], 5: [[-2.05, 0.06, 2.25], 0], 6: [[1.45, 0, 2.75], Math.PI] };
function buildBench(THREE, H, stage, style) {
  const e = BENCH_POS[K(stage, style)]; if (!e) return null;
  const g = at(THREE, e[0], e[1]);
  const wood = H.clay(0xa87548), woodD = H.clay(0x8a5a36), iron = H.clay(0x4a4a4a), cush = H.clay(0xd9644f);
  for (let i = 0; i < 5; i++) g.add(H.box(0.92, 0.035, 0.055, wood, 0, 0.43, -0.12 + i * 0.06));     // 앉는 판 5장
  for (let i = 0; i < 3; i++) { const b = H.box(0.92, 0.07, 0.03, wood, 0, 0.58 + i * 0.1, -0.2); b.rotation.x = -0.15; g.add(b); }   // 등받이 판 3장
  for (const x of [-0.42, 0.42]) {
    g.add(H.box(0.05, 0.43, 0.05, iron, x, 0.215, 0.12)); g.add(H.box(0.05, 0.43, 0.05, iron, x, 0.215, -0.14));      // 다리
    const arm = H.box(0.05, 0.04, 0.34, woodD, x, 0.62, -0.02); g.add(arm);                                           // 팔걸이
    g.add(H.box(0.04, 0.2, 0.04, iron, x, 0.52, 0.12));                                                               // 팔걸이 기둥
    const side = H.box(0.04, 0.03, 0.3, iron, x, 0.3, -0.01); g.add(side);                                            // 다리 연결 가로대
  }
  g.add(H.box(0.3, 0.07, 0.26, cush, -0.22, 0.48, 0.0));                                                              // 쿠션
  return g;
}

// ── 🔆 천창 조명: 천창 유리 위에 살짝 띄운 판이 밤에 은은하게 ──
function buildSkylight(THREE, H, stage, style) {
  const g = new THREE.Group();
  const mat = lit(H, 0xdcedf8, 0xffc06a, 1.0);   // 낮엔 유리처럼 연한 하늘빛, 밤엔 따뜻하게
  if (stage === 4) {                                   // 로프트: 양쪽 윙 바깥 경사면의 천창 격자 위
    const A = Math.atan2(0.55, 0.875), nx = Math.sin(A), ny = Math.cos(A);
    for (const s of [-1, 1]) {
      const m = glow(H.box(0.66, 0.03, 1.15, mat, s * (2.0175 + nx * 0.135), 2.535 + ny * 0.135, -0.35));
      m.rotation.z = -s * A; g.add(m);
    }
  } else if (stage === 5) g.add(glow(H.box(0.7, 0.04, 0.7, mat, 0.7, 4.87, -1.0)));
  else if (stage === 6) g.add(glow(H.box(0.64, 0.04, 0.64, mat, 1.0, 4.73, -1.4)));
  else if (stage === 7) g.add(glow(style === 'hanok' ? H.box(0.7, 0.04, 0.7, mat, 0, 3.14, -2.5) : H.box(0.64, 0.04, 0.64, mat, 0.9, 6.83, -2.8)));
  else return null;
  return g;
}

// ── 🪴 발코니 화분 3개: 펜트하우스 발코니 난간 안쪽 · 빌라는 루프탑 테라스 앞 난간 ──
const PLANTER_POS = { '7m': [[-1.35, 0.3, -1.15], [-1.05, 0.3, -1.15], [1.2, 0.3, -1.15]], '7h': [[-1.7, 0.52, -0.7], [-1.3, 0.52, -0.7], [1.5, 0.52, -0.7]], 5: [[0.625, 2.3, 1.38], [1.225, 2.3, 1.38], [1.825, 2.3, 1.38]], 6: [[-2.2, 2.62, 0.3], [-1.5, 2.62, 0.3], [-0.6, 2.62, 0.3]] };
function buildPlanters(THREE, H, stage, style) {
  const ps = PLANTER_POS[K(stage, style)]; if (!ps) return null;
  const g = new THREE.Group();
  const pot = H.clay(0xc4714c), rim = H.clay(0xd9855e), soil = H.clay(0x5a3d28), leaf = [H.clay(0x6b9a4c), H.clay(0x4f8a3a), H.clay(0x8bb85a)], petal = [H.clay(0xf07a8a), H.clay(0xf7d15a), H.clay(0xffffff)];
  ps.forEach(([x, y, z], i) => {
    g.add(cyl(THREE, 0.12, 0.09, 0.2, pot, x, y + 0.1, z, 8));                    // 화분
    g.add(cyl(THREE, 0.135, 0.135, 0.035, rim, x, y + 0.215, z, 8));              // 테두리
    g.add(cyl(THREE, 0.1, 0.1, 0.02, soil, x, y + 0.235, z, 8));                  // 흙
    for (let k = 0; k < 4; k++) { const a = k * 1.57 + i; g.add(ico(THREE, 0.1, leaf[k % 3], x + Math.cos(a) * 0.07, y + 0.32 + (k % 2) * 0.05, z + Math.sin(a) * 0.07)); }   // 잎 4
    for (let k = 0; k < 3; k++) { const a = k * 2.1 + 0.6; g.add(cyl(THREE, 0.008, 0.008, 0.1, leaf[1], x + Math.cos(a) * 0.05, y + 0.4, z + Math.sin(a) * 0.05, 4)); g.add(ico(THREE, 0.05, petal[(i + k) % 3], x + Math.cos(a) * 0.05, y + 0.47 + k * 0.02, z + Math.sin(a) * 0.05)); }   // 꽃 3
  });
  return g;
}

// ── 💡 처마 조명: 지붕 슬래브 밑에 붙는 작은 등 ──
const EAVE_POS = {
  '7m': [[-2.6, 2.58, 3.05], [2.6, 2.58, 3.05], [-2.7, 2.58, -1.4], [-1.6, 2.58, -1.4], [1.6, 2.58, -1.4], [2.7, 2.58, -1.4]],
  '7h': [[-2.2, 2.48, -1.05], [-0.8, 2.48, -1.05], [0.8, 2.48, -1.05], [2.2, 2.48, -1.05], [-2.75, 2.08, 2.85], [2.75, 2.08, 2.85]],
  5: [[-2.2, 2.32, 1.16], [-1.6, 2.32, 1.16], [-1.0, 2.32, 1.16], [-0.4, 2.32, 1.16], [2.56, 4.37, -1.5], [2.56, 4.37, -0.2]],
  6: [[0.5, 4.36, 0.42], [1.3, 4.36, 0.42], [2.1, 4.36, 0.42], [-2.3, 2.4, 0.52], [-1.2, 2.4, 0.52], [-0.1, 2.4, 0.52]],
};
function buildEaveLights(THREE, H, stage, style) {
  const ps = EAVE_POS[K(stage, style)]; if (!ps) return null;
  const g = new THREE.Group();
  const mat = lit(H, 0xfff3cc, 0xffc46a, 1.0), metal = H.clay(0x3b3d45);
  for (const [x, y, z] of ps) {
    g.add(H.box(0.05, 0.03, 0.12, metal, x, y + 0.045, z));                         // 부착 브래킷
    g.add(cone(THREE, 0.08, 0.07, metal, x, y + 0.0, z, 8));                       // 갓
    g.add(glow(ico(THREE, 0.045, mat, x, y - 0.05, z, 1)));                        // 전구(동그란 빛)
    g.add(glow(H.box(0.1, 0.012, 0.1, mat, x, y - 0.1, z)));                       // 바닥으로 번지는 빛 판
  }
  return g;
}

// ── ⛱️ 차양: 현관 위 줄무늬 천 + 앞단 스캘럽 + 옆 받침대 ──
const AWNING_POS = { '7m': [[-0.6, 2.25, -1.15], 1.5], '7h': [[0, 2.1, -1.15], 1.3], 5: [[-1.05, 2.08, 1.5], 1.5], 6: [[-1.7, 2.26, 0.82], 1.3] };
function buildAwning(THREE, H, stage, style) {
  const e = AWNING_POS[K(stage, style)]; if (!e) return null;
  const [p, w] = e; const g = at(THREE, p); g.rotation.x = 0.3;      // 앞(+z)이 낮아지게 기울임
  const stripe = [H.clay(0xf6f1e8), H.clay(0xd9534f)], rod = H.clay(0x3b3d45), tassel = H.clay(0xf3c34e);
  const n = 7, sw = w / n;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + sw * (i + 0.5), m = stripe[i % 2];
    g.add(H.box(sw, 0.03, 0.62, m, x, 0, 0));
    g.add(H.box(sw - 0.01, 0.1, 0.02, m, x, -0.05, 0.31));                         // 앞 주름
    g.add(cone(THREE, sw * 0.5, 0.07, m, x, -0.12, 0.31, 3));                      // 스캘럽 끝(삼각 장식)
    if (i % 2 === 0) g.add(ico(THREE, 0.02, tassel, x, -0.17, 0.31));              // 술
  }
  for (const s of [-1, 1]) {
    g.add(H.box(0.03, 0.03, 0.66, rod, s * (w / 2 + 0.01), 0, 0));                 // 옆 받침대
    const arm = H.box(0.03, 0.34, 0.03, rod, s * (w / 2 + 0.01), 0.15, -0.3); arm.rotation.x = -0.4; g.add(arm);   // 벽 쪽 지지대
  }
  g.add(H.box(w + 0.06, 0.035, 0.035, rod, 0, 0.02, -0.3));                        // 벽 쪽 가로대
  return g;
}

// ── 🌴 야자수 2그루: 수영장 오른쪽, 살짝 기운 줄기 + 잎 5장 + 코코넛 ──
const PALM_POS = { '7m': [[-2.6, 0, 4.2], [2.7, 0, 4.3]], '7h': [[-3.4, 0, 4.4], [3.0, 0, 4.5]], 6: [[2.9, 0, 0.75], [2.95, 0, 2.3]] };
function buildPalms(THREE, H, stage, style) {
  const ps = PALM_POS[K(stage, style)]; if (!ps) return null;
  const g = new THREE.Group();
  const bark = H.clay(0x9a6b45), barkD = H.clay(0x7e5434), frond = [H.clay(0x4f9a3d), H.clay(0x6bb04a)], nut = H.clay(0x6b4a2a), mound = H.clay(0x86b862);
  ps.forEach((p, k) => {
    const tree = at(THREE, p, k * 1.3); tree.rotation.z = 0.12;         // 수영장(연못) 쪽(-x)으로 기움
    const m0 = ico(THREE, 0.3, mound, 0, 0.05, 0); m0.scale.y = 0.35; tree.add(m0);   // 발치 흙무더기
    for (let i = 0; i < 7; i++) {                                         // 줄기 7마디 — 위로 갈수록 가늘고 번갈아 어둡다
      const r0 = 0.11 - i * 0.008, h = 0.34; tree.add(cyl(THREE, r0 - 0.008, r0, h, i % 2 ? barkD : bark, Math.sin(i * 0.5) * 0.02, 0.17 + i * 0.32, 0, 7));
    }
    for (let i = 0; i < 9; i++) {                                         // 잎 9장 — 2마디로 꺾이며 처진다
      const piv = new THREE.Group(); piv.position.y = 2.35; piv.rotation.y = i * Math.PI * 2 / 9 + k;
      const f1 = H.box(0.6, 0.03, 0.2, frond[i % 2], 0.3, 0.04, 0); f1.rotation.z = -0.25; piv.add(f1);
      const f2 = H.box(0.5, 0.03, 0.16, frond[(i + 1) % 2], 0.78, -0.08, 0); f2.rotation.z = -0.75; piv.add(f2);
      tree.add(piv);
    }
    for (let i = 0; i < 3; i++) tree.add(ico(THREE, 0.075, nut, 0.07 + i * 0.07, 2.25, 0.05 - i * 0.05, 1));   // 코코넛 송이
    g.add(tree);
  });
  return g;
}

// ── 🌊 수영장 야간 조명: 수면 아래 파란 빛판 + 벽 등 4개 ──
const POOL = { 6: [1.45, 0.045, 1.55, 1.9, 1.3, 0.9, 0.6], '7m': [-0.3, 0.34, 2.1, 1.5, 1.0, 0.7, 0.45], '7h': [-0.5, 0.06, 1.5, 1.5, 1.0, 0.7, 0.45] };   // [중심 x,y,z · 빛판 w,d · 전구 dx,dz] — 7단계는 중정 연못
function buildPoolLights(THREE, H, stage, style) {
  const p = POOL[K(stage, style)]; if (!p) return null;
  const [PX, PY, PZ, W, D, BX, BZ] = p;
  const g = new THREE.Group();
  g.add(glow(H.box(W, 0.02, D, lit(H, 0x7fe0f0, 0x37b8ff, 1.3), PX, PY, PZ)));
  g.add(glow(H.box(W * 0.6, 0.022, D * 0.6, lit(H, 0xc6f6ff, 0x6fd8ff, 1.5), PX, PY + 0.003, PZ)));   // 가운데 더 밝은 코어(깊이감)
  const bulb = lit(H, 0xe8fbff, 0x8fdfff, 1.5);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(glow(ico(THREE, 0.05, bulb, PX + sx * BX, PY + 0.015, PZ + sz * BZ, 1)));
  for (const sx of [-1, 1]) g.add(glow(ico(THREE, 0.04, bulb, PX + sx * BX, PY + 0.015, PZ, 1)));
  for (const sz of [-1, 1]) g.add(glow(ico(THREE, 0.04, bulb, PX, PY + 0.015, PZ + sz * BZ, 1)));      // 변 가운데 전구 4 — 총 8
  return g;
}

// ── 🏖️ 옥상 파라솔 세트: 루프탑 테라스 뒤쪽에 파라솔 + 라운지 체어 + 사이드 테이블 ──
const ROOFTOP = { 6: [-2.0, 2.62, -1.6], '7m': [2.25, 2.87, -0.9], '7h': [-2.0, 0.02, 4.6] };   // 파라솔 기준점 — 7단계 모던은 날개 지붕, 한옥은 대문 밖 앞마당
function buildRooftopSet(THREE, H, stage, style) {
  const o = ROOFTOP[K(stage, style)]; if (!o) return null;
  const [ox, TY, oz] = o, g = new THREE.Group();
  const dx = ox + 2.0, dz = oz + 1.6;   // 6단계 좌표(-2.0,-1.6 기준)를 기준점만큼 옮긴다
  const P = (x, y, z) => [x + dx, TY + y, z + dz];
  const white = H.clay(0xf4f3ee), sunny = H.clay(0xf3c34e), cream = H.clay(0xfff2c2), chrome = H.clay(0xd8dde0, { roughness: 0.4, metalness: 0.4 }), cushion = H.clay(0x6fd3e3), glassM = H.glass(0xcfeef7), straw = H.clay(0xd9a441), green = H.clay(0x6b9a4c);
  // 파라솔: 기둥 + 8조각 우산(노랑/크림 번갈아) + 꼭지 + 받침 추
  const pole = P(-2.0, 0, -1.6);
  g.add(cyl(THREE, 0.14, 0.17, 0.1, white, pole[0], pole[1] + 0.05, pole[2], 8));
  g.add(cyl(THREE, 0.025, 0.025, 1.6, chrome, pole[0], pole[1] + 0.8, pole[2], 6));
  for (let i = 0; i < 8; i++) {
    const th = new THREE.CylinderGeometry(0.02, 0.74, 0.22, 8, 1, false, (i * Math.PI * 2) / 8, (Math.PI * 2) / 8);
    const m = new THREE.Mesh(th, i % 2 ? cream : sunny); m.position.set(pole[0], pole[1] + 1.62, pole[2]); g.add(m);
  }
  g.add(ico(THREE, 0.045, white, pole[0], pole[1] + 1.78, pole[2], 1));
  // 라운지 체어: 프레임 + 쿠션 + 베개 + 기울어진 등받이 + 다리
  const lc = P(-1.2, 0, -1.6);
  g.add(H.box(0.5, 0.06, 1.1, white, lc[0], lc[1] + 0.2, lc[2]));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(H.box(0.04, 0.2, 0.04, chrome, lc[0] + sx * 0.2, lc[1] + 0.1, lc[2] + sz * 0.5));
  g.add(H.box(0.44, 0.07, 0.8, cushion, lc[0], lc[1] + 0.27, lc[2] + 0.15));
  const back = H.box(0.44, 0.07, 0.5, cushion, lc[0], lc[1] + 0.5, lc[2] - 0.5); back.rotation.x = -0.65; g.add(back);
  g.add(H.box(0.3, 0.1, 0.14, white, lc[0], lc[1] + 0.34, lc[2] - 0.38));                                       // 베개
  g.add(H.box(0.4, 0.015, 0.3, sunny, lc[0], lc[1] + 0.32, lc[2] + 0.55));                                      // 수건
  // 사이드 테이블 + 음료 + 작은 화분
  const tb = P(-1.65, 0, -1.95);
  g.add(cyl(THREE, 0.2, 0.2, 0.04, white, tb[0], tb[1] + 0.34, tb[2], 10));
  g.add(cyl(THREE, 0.03, 0.03, 0.3, chrome, tb[0], tb[1] + 0.17, tb[2], 6));
  g.add(cyl(THREE, 0.15, 0.15, 0.02, white, tb[0], tb[1] + 0.02, tb[2], 10));
  g.add(cyl(THREE, 0.04, 0.035, 0.12, glassM, tb[0] + 0.07, tb[1] + 0.42, tb[2] + 0.03, 8));                    // 유리잔
  g.add(cone(THREE, 0.025, 0.05, straw, tb[0] + 0.07, tb[1] + 0.5, tb[2] + 0.03, 5));                           // 빨대 장식
  g.add(cyl(THREE, 0.08, 0.06, 0.1, straw, tb[0] - 0.08, tb[1] + 0.41, tb[2] - 0.05, 8)); g.add(ico(THREE, 0.08, green, tb[0] - 0.08, tb[1] + 0.52, tb[2] - 0.05));
  return g;
}

/** 카탈로그(고정) — 한국어 문구는 검수 완료본 그대로. 단계 오름차순. */
export const HOUSE_ADDONS = [
  { id: 'chimney_smoke', stage: 3, ico: '💨', name: '굴뚝 연기', desc: '굴뚝에서 연기가 몽글몽글', coins: 40, build: buildSmoke },
  { id: 'garden_lamps', stage: 3, ico: '🏮', name: '정원등 2개', desc: '문 앞 양쪽, 밤에 켜져요', coins: 60, build: buildLamps },
  { id: 'mailbox_flag', stage: 3, ico: '📮', name: '깃발 우편함', desc: '빨간 깃발이 달린 우편함', coins: 80, build: buildMailbox },
  { id: 'ivy', stage: 4, ico: '🌿', name: '덩굴 장식', desc: '벽을 타고 오르는 덩굴', coins: 120, build: buildIvy },
  { id: 'yard_bench', stage: 4, ico: '🪑', name: '앞마당 벤치', desc: '마당에 앉을 자리', coins: 150, build: buildBench },
  { id: 'skylight_glow', stage: 4, ico: '🔆', name: '천창 조명', desc: '밤에 천창이 은은하게', coins: 200, build: buildSkylight },
  { id: 'balcony_planters', stage: 5, ico: '🪴', name: '발코니 화분', desc: '발코니 난간에 화분 3개', coins: 250, build: buildPlanters },
  { id: 'eave_lights', stage: 5, ico: '💡', name: '처마 조명', desc: '밤에 처마 아래가 환해요', coins: 300, build: buildEaveLights },
  { id: 'awning', stage: 5, ico: '⛱️', name: '차양', desc: '현관 위 줄무늬 차양', coins: 400, build: buildAwning },
  { id: 'palms', stage: 6, ico: '🌴', name: '야자수 2그루', desc: '수영장 옆 야자수', coins: 500, build: buildPalms },
  { id: 'pool_lights', stage: 6, ico: '🌊', name: '수영장 야간 조명', desc: '밤에 물이 파랗게 빛나요', coins: 700, build: buildPoolLights },
  { id: 'rooftop_set', stage: 6, ico: '🏖️', name: '옥상 파라솔 세트', desc: '옥상 파라솔·라운지 체어', coins: 900, build: buildRooftopSet },
];

/**
 * 상점 렌더용 상태(순수) — build 를 뺀 정의 + owned / locked / affordable
 *   locked: 집 단계가 모자람 · affordable: 안 샀고 안 잠겼고 코인이 충분
 */
export function addonState(defs, ownedIds, stage, coins) {
  const owned = new Set(ownedIds || []);
  return defs.map(({ build, ...d }) => {
    const isOwned = owned.has(d.id), locked = stage < d.stage;
    return { ...d, owned: isOwned, locked, affordable: !isOwned && !locked && (coins || 0) >= d.coins };
  });
}
