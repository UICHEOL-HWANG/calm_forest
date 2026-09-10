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
//  좌표는 js/house/{cottage,loft,penthouse,villa}.js 의 치수에서 뽑았다 — 모델을 고치면 여기도 같이.
// =============================================================

const at = (THREE, [x, y, z], ry = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; return g; };
const ico = (THREE, r, mat, x, y, z, detail = 0) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail), mat); m.position.set(x, y, z); return m; };
const cyl = (THREE, rt, rb, h, mat, x, y, z, seg = 8) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); return m; };
// 밤에 빛나는 재질 — 자기 emissive 색과 세기(nightScale)를 갖는다
const lit = (H, color, emissive, nightScale) => { const m = H.clay(color, { emissive, emissiveIntensity: 0 }); m.userData.nightScale = nightScale; return m; };
const glow = (mesh) => { mesh.userData.role = 'window'; mesh.castShadow = false; return mesh; };

// ── 💨 굴뚝 연기: 굴뚝 꼭대기에서 몽글몽글 올라가는 회색 구 4개(anim) ──
const SMOKE_POS = { 3: [-1.15, 4.15, 0.15], 4: [0.32, 4.25, -0.9], 5: [2.0, 5.22, -1.7] };   // 빌라는 굴뚝이 없다
function buildSmoke(THREE, H, stage) {
  const p = SMOKE_POS[stage]; if (!p) return null;
  const g = at(THREE, p);
  const puffs = [];
  for (let i = 0; i < 4; i++) {
    const m = ico(THREE, 0.13, H.clay(0xd9dcdf, { transparent: true, opacity: 0.7 }), 0, 0, 0, 1);
    m.castShadow = m.receiveShadow = false; m.userData.phase = i / 4; g.add(m); puffs.push(m);
  }
  g.userData.anim = (t) => {
    for (const m of puffs) {
      const ph = m.userData.phase, k = (t * 0.28 + ph) % 1;          // 0 → 1: 굴뚝에서 나와 흩어짐
      m.position.set(Math.sin(t * 1.1 + ph * 7) * (0.04 + k * 0.14), 0.1 + k * 1.05, Math.cos(t * 0.9 + ph * 5) * 0.05);
      m.scale.setScalar(0.55 + k * 1.1);
      m.material.opacity = 0.7 * (1 - k) * Math.min(1, k * 6);
    }
  };
  g.userData.anim(0);
  return g;
}

// ── 🏮 정원등 2개: 문 앞 양쪽 기둥등(머리가 밤에 켜짐) ──
const LAMP_POS = { 3: [[-1.05, 0.08, 2.0], [0.15, 0.08, 2.0]], 4: [[-0.7, 0.06, 2.0], [0.7, 0.06, 2.0]], 5: [[-1.5, 0.06, 2.05], [-0.62, 0.06, 2.12]], 6: [[-2.35, 0.1, 0.95], [-1.05, 0.1, 0.95]] };
function buildLamps(THREE, H, stage) {
  const ps = LAMP_POS[stage]; if (!ps) return null;
  const g = new THREE.Group();
  const post = H.clay(0x3b3d45), cap = H.clay(0x2a2c33), head = lit(H, 0xfff0c0, 0xffc46a, 1.0);
  for (const [x, y, z] of ps) {
    g.add(H.box(0.06, 0.62, 0.06, post, x, y + 0.31, z));
    g.add(glow(H.box(0.16, 0.16, 0.16, head, x, y + 0.7, z)));
    g.add(H.box(0.22, 0.04, 0.22, cap, x, y + 0.8, z));
  }
  return g;
}

// ── 📮 깃발 우편함: 파란 함 + 둥근 뚜껑 + 빨간 깃발 ──
const MAIL_POS = { 3: [-2.0, 0.08, 2.0], 4: [2.25, 0.06, 1.55], 5: [2.85, 0, 1.6], 6: [0.05, 0.1, 0.95] };
function buildMailbox(THREE, H, stage) {
  const p = MAIL_POS[stage]; if (!p) return null;
  const g = at(THREE, p);
  const wood = H.clay(0x8a5a36), blue = H.clay(0x4a6fa5), red = H.clay(0xd9403a);
  g.add(H.box(0.08, 0.8, 0.08, wood, 0, 0.4, 0));
  g.add(H.box(0.42, 0.22, 0.26, blue, 0, 0.9, 0));
  const capGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.42, 10); capGeo.rotateZ(Math.PI / 2);
  const cap = new THREE.Mesh(capGeo, blue); cap.position.set(0, 1.01, 0); g.add(cap);
  g.add(H.box(0.03, 0.22, 0.03, red, 0.23, 1.12, -0.08));
  g.add(H.box(0.03, 0.12, 0.18, red, 0.23, 1.2, -0.0));
  return g;
}

// ── 🌿 덩굴 장식: 벽을 타고 오르는 줄기 + 잎 8장 ──
const IVY_POS = { 4: [[2.25, 0, 1.33], 2.0], 5: [[-0.25, 0, 1.23], 2.25], 6: [[-2.45, 0, 0.52], 2.3] };
function buildIvy(THREE, H, stage) {
  const e = IVY_POS[stage]; if (!e) return null;
  const [p, h] = e; const g = at(THREE, p);
  const stem = H.clay(0x3f6b2e), leaf = [H.clay(0x5c9c44), H.clay(0x7cb85a)];
  g.add(H.box(0.04, h, 0.03, stem, 0, h / 2, 0));
  for (let i = 0; i < 8; i++) {
    const y = 0.25 + (h - 0.4) * (i / 7), r = 0.14 - i * 0.008;
    g.add(ico(THREE, r, leaf[i % 2], Math.sin(i * 1.7) * 0.13, y, 0.04));
  }
  return g;
}

// ── 🪑 앞마당 벤치: 앉는 판 + 등받이 + 다리 2 ──
const BENCH_POS = { 4: [[1.35, 0.06, 2.0], 0], 5: [[-2.05, 0.06, 2.25], 0], 6: [[1.45, 0, 2.75], Math.PI] };
function buildBench(THREE, H, stage) {
  const e = BENCH_POS[stage]; if (!e) return null;
  const g = at(THREE, e[0], e[1]);
  const wood = H.clay(0xa87548), iron = H.clay(0x4a4a4a);
  g.add(H.box(0.9, 0.06, 0.32, wood, 0, 0.42, 0));
  const back = H.box(0.9, 0.3, 0.05, wood, 0, 0.66, -0.16); back.rotation.x = -0.15; g.add(back);
  for (const x of [-0.38, 0.38]) g.add(H.box(0.06, 0.42, 0.3, iron, x, 0.21, 0));
  return g;
}

// ── 🔆 천창 조명: 천창 유리 위에 살짝 띄운 판이 밤에 은은하게 ──
function buildSkylight(THREE, H, stage) {
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
  else return null;
  return g;
}

// ── 🪴 발코니 화분 3개: 펜트하우스 발코니 난간 안쪽 · 빌라는 루프탑 테라스 앞 난간 ──
const PLANTER_POS = { 5: [[0.625, 2.3, 1.38], [1.225, 2.3, 1.38], [1.825, 2.3, 1.38]], 6: [[-2.2, 2.62, 0.3], [-1.5, 2.62, 0.3], [-0.6, 2.62, 0.3]] };
function buildPlanters(THREE, H, stage) {
  const ps = PLANTER_POS[stage]; if (!ps) return null;
  const g = new THREE.Group();
  const pot = H.clay(0xc4714c), leaf = H.clay(0x6b9a4c), petal = [H.clay(0xf07a8a), H.clay(0xf7d15a), H.clay(0xffffff)];
  ps.forEach(([x, y, z], i) => {
    g.add(cyl(THREE, 0.11, 0.09, 0.2, pot, x, y + 0.1, z, 6));
    g.add(ico(THREE, 0.15, leaf, x, y + 0.3, z));
    g.add(ico(THREE, 0.055, petal[i], x + 0.04, y + 0.42, z + 0.05));
  });
  return g;
}

// ── 💡 처마 조명: 지붕 슬래브 밑에 붙는 작은 등 ──
const EAVE_POS = {
  5: [[-2.2, 2.32, 1.16], [-1.6, 2.32, 1.16], [-1.0, 2.32, 1.16], [-0.4, 2.32, 1.16], [2.56, 4.37, -1.5], [2.56, 4.37, -0.2]],
  6: [[0.5, 4.36, 0.42], [1.3, 4.36, 0.42], [2.1, 4.36, 0.42], [-2.3, 2.4, 0.52], [-1.2, 2.4, 0.52], [-0.1, 2.4, 0.52]],
};
function buildEaveLights(THREE, H, stage) {
  const ps = EAVE_POS[stage]; if (!ps) return null;
  const g = new THREE.Group();
  const mat = lit(H, 0xfff3cc, 0xffc46a, 1.0);
  for (const [x, y, z] of ps) g.add(glow(H.box(0.12, 0.06, 0.1, mat, x, y, z)));
  return g;
}

// ── ⛱️ 차양: 현관 위 줄무늬 천 + 앞단 스캘럽 + 옆 받침대 ──
const AWNING_POS = { 5: [[-1.05, 2.08, 1.5], 1.5], 6: [[-1.7, 2.26, 0.82], 1.3] };
function buildAwning(THREE, H, stage) {
  const e = AWNING_POS[stage]; if (!e) return null;
  const [p, w] = e; const g = at(THREE, p); g.rotation.x = 0.3;      // 앞(+z)이 낮아지게 기울임
  const stripe = [H.clay(0xf6f1e8), H.clay(0xd9534f)], rod = H.clay(0x3b3d45);
  const n = 5, sw = w / n;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + sw * (i + 0.5);
    g.add(H.box(sw, 0.03, 0.6, stripe[i % 2], x, 0, 0));
    g.add(H.box(sw - 0.02, 0.1, 0.02, stripe[i % 2], x, -0.05, 0.3));
  }
  for (const s of [-1, 1]) g.add(H.box(0.03, 0.03, 0.6, rod, s * (w / 2 + 0.01), 0, 0));
  return g;
}

// ── 🌴 야자수 2그루: 수영장 오른쪽, 살짝 기운 줄기 + 잎 5장 + 코코넛 ──
const PALM_POS = { 6: [[2.9, 0, 0.75], [2.95, 0, 2.3]] };
function buildPalms(THREE, H, stage) {
  const ps = PALM_POS[stage]; if (!ps) return null;
  const g = new THREE.Group();
  const bark = H.clay(0x9a6b45), frond = H.clay(0x4f9a3d), nut = H.clay(0x6b4a2a);
  ps.forEach((p, k) => {
    const tree = at(THREE, p, k * 1.3); tree.rotation.z = 0.12;         // 수영장 쪽(-x)으로 기움
    tree.add(cyl(THREE, 0.07, 0.11, 2.3, bark, 0, 1.15, 0, 6));
    for (let i = 0; i < 5; i++) {
      const piv = new THREE.Group(); piv.position.y = 2.3; piv.rotation.y = i * Math.PI * 2 / 5 + k;
      const f = H.box(0.95, 0.03, 0.2, frond, 0.42, 0, 0); f.rotation.z = -0.5; piv.add(f); tree.add(piv);
    }
    tree.add(ico(THREE, 0.07, nut, 0.08, 2.2, 0.06, 1));
    g.add(tree);
  });
  return g;
}

// ── 🌊 수영장 야간 조명: 수면 아래 파란 빛판 + 벽 등 4개 ──
function buildPoolLights(THREE, H, stage) {
  if (stage !== 6) return null;
  const g = new THREE.Group();
  const PX = 1.45, PZ = 1.55;
  g.add(glow(H.box(1.9, 0.02, 1.3, lit(H, 0x7fe0f0, 0x37b8ff, 1.3), PX, 0.045, PZ)));
  const bulb = lit(H, 0xe8fbff, 0x8fdfff, 1.5);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(glow(ico(THREE, 0.045, bulb, PX + sx * 0.9, 0.06, PZ + sz * 0.6, 1)));
  return g;
}

// ── 🏖️ 옥상 파라솔 세트: 루프탑 테라스 뒤쪽에 파라솔 + 라운지 체어 + 사이드 테이블 ──
function buildRooftopSet(THREE, H, stage) {
  if (stage !== 6) return null;
  const TY = 2.62, g = new THREE.Group();
  const white = H.clay(0xf4f3ee), sunny = H.clay(0xf3c34e), chrome = H.clay(0xd8dde0, { roughness: 0.4, metalness: 0.4 });
  g.add(cyl(THREE, 0.025, 0.025, 1.55, chrome, -2.0, TY + 0.78, -1.6, 6));
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.72, 0.22, 8), sunny); cone.position.set(-2.0, TY + 1.62, -1.6); g.add(cone);
  g.add(ico(THREE, 0.04, white, -2.0, TY + 1.76, -1.6, 1));
  g.add(H.box(0.5, 0.12, 1.1, white, -1.2, TY + 0.16, -1.6));
  g.add(H.box(0.44, 0.06, 0.8, sunny, -1.2, TY + 0.25, -1.45));
  const back = H.box(0.44, 0.55, 0.06, white, -1.2, TY + 0.45, -2.1); back.rotation.x = -0.55; g.add(back);
  g.add(H.box(0.4, 0.05, 0.4, white, -1.65, TY + 0.32, -1.95));
  g.add(cyl(THREE, 0.03, 0.03, 0.3, chrome, -1.65, TY + 0.15, -1.95, 6));
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
