// =============================================================
//  calm forest · 🦋🐦🦔🐸 텃밭 방문객 조형 4종
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-17-habitat-design.md
//  ▶ 2차 문법(2026-09-29 사용자 확정 — 🦋N1 · 🐦P1 · 🦔Q1 · 🐸Q1, 시안 sims 비교):
//      · **캐릭터 얼굴(흰 왕눈·입 곡선·볼터치)을 쓰지 않는다.** 실제 동물의 표지로 읽히게 한다.
//      · 몸이 주인공, 머리는 몸 앞에 작게 파묻는다(목이 안 보이게).
//  ▶ ⚠️ 1차(2026-09-18)는 🐸 사양의 "몸통 없는 둥근 머리 하나" 를 4종에 썼다. 게임 카메라(위에서 41°)에선
//      밭 위를 굴러다니는 공으로 읽혔고, 🦋 는 분홍 공 + 귀 = **쥐**, 🐦 는 흰 왕눈 + 빨간 관모 = 닭으로 보였다
//      (사용자: "개밤티", "처음에 쥐인 줄 알았어"). 캐릭터 얼굴로 되돌리지 말 것.
//  ▶ ⚠️ 재질을 공유하지 않는다 — farm-visitors 가 페이드에 material.opacity 를 직접 건드리므로
//    공유하면 다른 방문객·지형까지 같이 투명해진다(장식 고스트에서 겪은 사고와 같은 유형).
//  ▶ ⚡ 부품은 읽기 좋게 따로 만들고, 내보낼 때 bake() 로 2덩어리로 굽는다(드로우콜).
//  ▶ 원점 = 발바닥. 흙 칸(윗면 0.2) 위에 올리는 건 호출부 몫(farm-visitors groundAt).
// =============================================================

/** 재질은 매번 새로 만든다(페이드가 opacity 를 직접 건드린다) */
const mat = (THREE, color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...extra });

/**
 * 같은 지오메트리·재질을 여러 자리에 놓을 때 InstancedMesh 로 묶는다 — **드로우콜 1개**.
 * ⚠️ 눈·가시 같은 짝·무리를 낱개 Mesh 로 두면 🦔 하나가 36콜이었다(2026-09-18 실측).
 * @param {Array<{p:[x,y,z], r?:[x,y,z], s?:[x,y,z]}>} at 놓을 자리들 — s 의 음수 x 는 좌우 거울(양면 재질에만)
 */
function cluster(THREE, geo, material, at, shadow = false) {
  const m = new THREE.InstancedMesh(geo, material, at.length);
  const pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3(), eul = new THREE.Euler();
  at.forEach((a, i) => {
    pos.set(...a.p);
    eul.set(...(a.r || [0, 0, 0]));
    quat.setFromEuler(eul);
    scl.set(...(a.s || [1, 1, 1]));
    m.setMatrixAt(i, new THREE.Matrix4().compose(pos, quat, scl));
  });
  m.instanceMatrix.needsUpdate = true;
  // 그림자는 실루엣에 보이는 것만 — 작은 무늬는 섀도 패스에서 한 번 더 그려질 뿐이다(드로우콜 2배)
  m.castShadow = shadow;
  return m;
}

const mesh = (THREE, geo, material, shadow = false) => { const m = new THREE.Mesh(geo, material); m.castShadow = shadow; return m; };
const pair = (fn) => [-1, 1].map(fn);

/**
 * 뒤(−z)로 가늘어지는 물방울 — 공이 아니라 "몸 → 꼬리" 가 하나로 이어진 형태(🌰밤 함정 회피).
 * @param tip 뒤끝 굵기(0~1) · flatBottom 아래쪽 눌림
 */
function teardrop(THREE, r, len, tip = 0.25, flatBottom = 0.35) {
  const g = new THREE.SphereGeometry(r, 18, 14);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const zN = v.z / r, back = Math.max(0, -zN);
    const k = 1 - (1 - tip) * Math.pow(back, 1.4);
    v.x *= k; v.y *= k;
    if (v.y < 0) v.y *= 1 - flatBottom;
    v.z = zN * len / 2;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * 🦔 **가시끼리 이어진 껍질** — 낱개 바늘을 꽂는 게 아니라 하나의 지오메트리다.
 *   정이십면체의 각 면을 꼭짓점 하나로 뽑아올려, 이웃 가시와 **변을 공유**하게 만든다.
 *   ⚠️ 공에 바늘을 꽂는 방식은 7차까지 시도했고 전부 🌰밤 으로 읽혔다(2026-09-18).
 *   ⚠️ detail 을 1 이상으로 올리면 가시가 촘촘해진다 → 환공포증. 0 을 유지한다.
 * @param {(c:{x,y,z}) => boolean} keep 그 면을 가시로 뽑을지
 */
function spikyShell(THREE, radius, spikeLen, keep) {
  const base = new THREE.IcosahedronGeometry(radius, 0).toNonIndexed();
  const pos = base.attributes.position;
  const out = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    const cen = a.clone().add(b).add(c).multiplyScalar(1 / 3);
    if (!keep(cen)) continue;
    const apex = cen.clone().normalize().multiplyScalar(radius + spikeLen);
    for (const [p, q] of [[a, b], [b, c], [c, a]]) out.push(p.x, p.y, p.z, q.x, q.y, q.z, apex.x, apex.y, apex.z);
  }
  base.dispose();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  g.computeVertexNormals();   // 평면 음영 — 저폴리 톤에 맞는다
  return g;
}

// ── 🦋 호랑나비 ─────────────────────────────────────────────
//   도감 이름이 '호랑나비' — 노랑 + 검은 테두리·줄무늬 + 뒷날개 꼬리. 흙에 앉아 날개를 편다(N1).
//   날개는 원판이 아니라 **나비 날개 윤곽**(앞날개 삼각 · 뒷날개 둥근 + 꼬리). 머리는 작은 검은 구 + 곤봉 더듬이.
function wingShapes(THREE) {
  const fore = new THREE.Shape();                         // x 바깥 · y 앞
  fore.moveTo(0.02, 0.02); fore.bezierCurveTo(0.18, 0.26, 0.40, 0.36, 0.58, 0.34);
  fore.bezierCurveTo(0.62, 0.24, 0.58, 0.10, 0.50, 0.00); fore.bezierCurveTo(0.34, -0.06, 0.16, -0.08, 0.02, -0.04);
  const hind = new THREE.Shape();
  hind.moveTo(0.02, -0.04); hind.bezierCurveTo(0.22, -0.02, 0.40, -0.08, 0.40, -0.22);
  hind.bezierCurveTo(0.40, -0.34, 0.32, -0.40, 0.27, -0.42);
  hind.lineTo(0.25, -0.58); hind.lineTo(0.20, -0.44);      // 호랑나비 꼬리
  hind.bezierCurveTo(0.12, -0.42, 0.05, -0.30, 0.02, -0.10);
  const stripe = (x0, w0) => {
    const st = new THREE.Shape(); st.moveTo(x0, 0.0); st.lineTo(x0 + w0, 0.0); st.lineTo(x0 + w0 + 0.06, 0.28); st.lineTo(x0 + 0.06, 0.30);
    return st;
  };
  return { fore, hind, stripes: [stripe(0.14, 0.05), stripe(0.30, 0.045)] };   // 줄무늬 두 줄(촘촘한 반복 금지)
}
// 윤곽(x,y) → 날개 면(x,z). k 배율 · lift 면 위로 띄움 · dx 뿌리 쪽 이동
function flatGeo(THREE, shapes, { k = 1, lift = 0, dx = 0 } = {}) {
  const g = new THREE.ShapeGeometry(shapes, 14);
  g.scale(k, k, 1); g.translate(dx, 0, 0); g.rotateX(Math.PI / 2); g.translate(0, lift, 0);
  return g;
}
function makeButterfly(THREE) {
  const K = { WING: 0xf4cf4e, EDGE: 0x2b2522, SPOT1: 0xe8733a, SPOT2: 0x5f86c9, BODY: 0x2b2522 };
  const LIFT = 0.14;                                        // 날개를 수평에서 살짝 든다
  const root = new THREE.Group(), bug = new THREE.Group();
  bug.rotation.y = 0.35; bug.position.y = 0.05; bug.scale.setScalar(1.2);   // 1.2 — 폰 세로에서 손톱만 해지지 않게
  root.add(bug);
  const wm = (c) => mat(THREE, c, { roughness: 0.9, side: THREE.DoubleSide });
  const { fore, hind, stripes } = wingShapes(THREE);
  // 좌우 날개 = 같은 지오메트리의 거울 인스턴스 두 개(부위당 1콜)
  const sides = pair(s => ({ p: [0, 0, 0], r: [0, 0, s * LIFT], s: [s, 1, 1] }));
  // 테두리 = 같은 윤곽을 1.10 배로 키워 밑에 깐다(선 두께가 일정하게 보인다)
  bug.add(cluster(THREE, flatGeo(THREE, [fore, hind], { k: 1.10, lift: -0.004, dx: -0.02 }), wm(K.EDGE), sides, true));
  bug.add(cluster(THREE, flatGeo(THREE, [fore, hind]), wm(K.WING), sides));
  bug.add(cluster(THREE, flatGeo(THREE, stripes, { lift: 0.004 }), wm(K.EDGE), sides));
  // 뒷날개 끝 무늬 한 쌍(윤곽 y → 날개 면 z)
  for (const [c, x, z, r] of [[K.SPOT1, 0.24, -0.36, 0.04], [K.SPOT2, 0.33, -0.25, 0.035]]) {
    const g = new THREE.CircleGeometry(r, 12); g.rotateX(-Math.PI / 2); g.translate(x, 0.006, z);
    bug.add(cluster(THREE, g, wm(c), sides));
  }
  // 몸 — 가슴 + 가는 배. 날개 뿌리 사이에 눕는다
  const thorax = mesh(THREE, new THREE.SphereGeometry(0.075, 10, 8), mat(THREE, K.BODY), true);
  thorax.scale.z = 1.3; thorax.position.y = 0.03; bug.add(thorax);
  const abd = mesh(THREE, teardrop(THREE, 0.055, 0.40, 0.30, 0), mat(THREE, K.BODY), true);
  abd.position.set(0, 0.03, -0.22); bug.add(abd);
  // 머리 — 작은 검은 구 + 옆으로 붙은 겹눈 두 알. ⚠️ 캐릭터 얼굴을 붙이면 쥐·공이 된다
  const head = mesh(THREE, new THREE.SphereGeometry(0.055, 10, 8), mat(THREE, K.BODY), true);
  head.position.set(0, 0.04, 0.13); bug.add(head);
  bug.add(cluster(THREE, new THREE.SphereGeometry(0.028, 8, 6), mat(THREE, 0x4a3b2a), pair(s => ({ p: [0.042 * s, 0.05, 0.15] }))));
  // 더듬이 — 가는 대 + 끝이 뭉툭한 곤봉(나비의 표지). 위·바깥으로 세운다(카메라 쪽으로 뻗으면 안 보인다)
  //   방향 = Rz(−0.45s) 다음 Rx(0.7) 로 돌린 +Y ≈ (0.43s, 0.69, 0.58)
  const ANT = 0.36, AD = [0.43, 0.69, 0.58], AB = [0.03, 0.07, 0.16];
  bug.add(cluster(THREE, new THREE.CylinderGeometry(0.009, 0.009, ANT, 5), mat(THREE, K.BODY), pair(s => ({
    p: [(AB[0] + AD[0] * ANT / 2) * s, AB[1] + AD[1] * ANT / 2, AB[2] + AD[2] * ANT / 2], r: [0.7, 0, -0.45 * s] }))));
  bug.add(cluster(THREE, new THREE.SphereGeometry(0.026, 8, 6), mat(THREE, K.BODY), pair(s => ({
    p: [(AB[0] + AD[0] * ANT) * s, AB[1] + AD[1] * ANT, AB[2] + AD[2] * ANT] }))));
  return root;
}

// ── 🐦 참새 ─────────────────────────────────────────────────
//   표지 5가지: 밤색 머리 · 흰 뺨의 검은 점 · 부리 밑 검은 턱받이 · 갈색 등 + 흰 날개띠 · 짧고 굵은 부리.
//   동그랗게 앉은 3/4(P1). 머리는 몸 반지름의 약 0.7 로 앞 위에 파묻는다.
function makeSparrow(THREE) {
  const K = { CAP: 0x8a4a2a, CHEEK: 0xf3eee4, SPOT: 0x221c18, BACK: 0x9a6b45, TAIL: 0x4e3524, BELLY: 0xd8cfc0,
              WING: 0x7a5236, BAR: 0xf3ecdf, BEAK: 0x3b3431, LEG: 0xc99a74 };
  const R = 0.22, LEN = 0.62, TAIL_UP = 0.25;
  const root = new THREE.Group(), bird = new THREE.Group();
  bird.rotation.y = 0.65; bird.scale.setScalar(1.2); root.add(bird);
  const bp = new THREE.Group(); bp.position.set(0, 0.25, -0.02); bp.rotation.x = -0.05; bird.add(bp);
  const body = mesh(THREE, teardrop(THREE, R, LEN, 0.28), mat(THREE, K.BACK), true); body.scale.x = 0.95; bp.add(body);
  const belly = mesh(THREE, teardrop(THREE, R * 0.94, LEN * 0.78, 0.45), mat(THREE, K.BELLY));
  belly.position.set(0, -R * 0.20, LEN * 0.06); belly.scale.x = 0.92; bp.add(belly);
  // (등 줄무늬는 뺐다 — 물방울 등이 뒤로 낮아져 막대가 몸 위로 떠 보였다)
  // 접은 날개 + 흰 날개띠(날개 면 안쪽에 붙인다 — 바깥에 두면 몸 밖에 뜬다)
  const wingR = (s) => [-0.18, -0.14 * s, 0.30 * s];
  bp.add(cluster(THREE, teardrop(THREE, R * 0.62, LEN * 0.72, 0.15, 0), mat(THREE, K.WING), pair(s => ({
    p: [R * 0.78 * s, R * 0.18, -LEN * 0.10], r: wingR(s), s: [0.42, 0.78, 1] })), true));
  bp.add(cluster(THREE, new THREE.BoxGeometry(0.02, 0.028, 0.14), mat(THREE, K.BAR), pair(s => ({
    p: [R * 0.86 * s, R * 0.30, -LEN * 0.04], r: wingR(s), s: [0.6, 0.7, 1] }))));
  // 꼬리 — 좁은 뿌리 · 넓은 끝의 납작한 사각뿔
  const TL = 0.30, tg = new THREE.ConeGeometry(R * 0.50, TL, 4, 1); tg.rotateY(Math.PI / 4); tg.translate(0, -TL / 2, 0);
  const tail = mesh(THREE, tg, mat(THREE, K.TAIL), true); tail.scale.set(1, 1, 0.28);
  tail.rotation.x = Math.PI / 2 + TAIL_UP; tail.position.set(0, R * 0.15, -LEN * 0.42); bp.add(tail);
  // 다리 — 몸 밑 중심 쪽으로(발이 뜨지 않게)
  bird.add(cluster(THREE, new THREE.CylinderGeometry(0.018, 0.016, 0.14, 5), mat(THREE, K.LEG), pair(s => ({ p: [0.07 * s, 0.07, 0.0] }))));
  bird.add(cluster(THREE, new THREE.ConeGeometry(0.05, 0.12, 3), mat(THREE, K.LEG), pair(s => ({ p: [0.07 * s, 0.012, 0.05], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.25] }))));
  // 머리 — 흰 바탕 + 밤색 모자(정수리~뒷목) + 검은 뺨 점 + 턱받이 + 작은 검은 눈 + 짧은 부리
  const HR = 0.155, hg = new THREE.Group(); hg.position.set(0, 0.40, 0.19); hg.rotation.x = 0.05; bird.add(hg);
  hg.add(mesh(THREE, new THREE.SphereGeometry(HR, 16, 12), mat(THREE, K.CHEEK), true));
  const cap = mesh(THREE, new THREE.SphereGeometry(HR * 1.04, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), mat(THREE, K.CAP));
  cap.rotation.x = -0.45; hg.add(cap);                    // 앞이마보다 뒷목을 더 덮는다
  hg.add(cluster(THREE, new THREE.SphereGeometry(HR * 0.26, 10, 8), mat(THREE, K.SPOT), pair(s => ({
    p: [HR * 0.86 * s, -HR * 0.10, -HR * 0.05], s: [0.35, 1, 1] }))));    // 뺨 점
  const bib = mesh(THREE, new THREE.SphereGeometry(HR * 0.42, 10, 8), mat(THREE, K.SPOT));
  bib.position.set(0, -HR * 0.62, HR * 0.60); bib.scale.set(0.9, 0.55, 0.5); hg.add(bib);
  hg.add(cluster(THREE, new THREE.SphereGeometry(HR * 0.14, 8, 6), mat(THREE, K.SPOT), pair(s => ({ p: [HR * 0.62 * s, HR * 0.18, HR * 0.72] }))));
  hg.add(cluster(THREE, new THREE.SphereGeometry(HR * 0.05, 6, 4), mat(THREE, 0xffffff), pair(s => ({ p: [HR * 0.66 * s, HR * 0.24, HR * 0.84] }))));
  const beak = mesh(THREE, new THREE.ConeGeometry(HR * 0.26, HR * 0.52, 6), mat(THREE, K.BEAK));
  beak.rotation.x = Math.PI / 2; beak.position.set(0, -HR * 0.08, HR * 1.12); hg.add(beak);
  return root;
}

// ── 🦔 고슴도치 ─────────────────────────────────────────────
//   표지: 몸 전체를 덮는 가시 덩어리 · 베이지 얼굴 · 뾰족 주둥이 + 검은 코끝 · 작은 귀. 걸어가는 3/4(Q1).
function makeHedgehog(THREE) {
  const K = { QUILL: 0x7a6d62, FACE: 0xdcc6a6, DARK: 0x1d1815, EAR: 0xc4ab8a, FOOT: 0x8a6f5a };
  const root = new THREE.Group(), hog = new THREE.Group();
  hog.rotation.y = 0.55; hog.scale.setScalar(1.2); root.add(hog);
  // 가시 덩어리 — 큰 껍질 한 장을 몸 크기로 늘리면 면이 커져 '지붕·솔방울' 이 된다(시안 1차).
  //   detail 을 올리면 촘촘해져 환공포증. → **작은 껍질 3개를 앞→뒤로 겹쳐** 가시가 뒤로 누운 결을 만든다(1콜).
  const QR = 0.19;
  hog.add(cluster(THREE, spikyShell(THREE, QR, QR * 0.75, (c) => c.y > -QR * 0.2),
    mat(THREE, K.QUILL, { roughness: 0.9, side: THREE.DoubleSide }), [
      { p: [0, 0.24, 0.10], r: [-0.35, 0.3, 0], s: [1.05, 0.78, 1.0] },
      { p: [0, 0.27, -0.08], r: [-0.30, -0.5, 0.1], s: [1.2, 0.85, 1.05] },
      { p: [0, 0.22, -0.26], r: [-0.45, 0.9, 0], s: [1.0, 0.75, 1.0] },
    ], true));
  const under = mesh(THREE, new THREE.SphereGeometry(0.24, 14, 10), mat(THREE, K.FACE));   // 가시 아래를 막는 배
  under.scale.set(1, 0.45, 1.25); under.position.set(0, 0.17, -0.04); hog.add(under);
  hog.add(cluster(THREE, new THREE.SphereGeometry(0.06, 8, 6), mat(THREE, K.FOOT), [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sz]) => ({
    p: [sx * 0.15, 0.03, -0.04 + sz * 0.18], s: [1, 0.6, 1.3] }))));
  // 얼굴 — 베이지 머리 + 짧은 주둥이(0.22 는 쥐 주둥이였다) + 검은 코끝 + 작은 검은 눈 + 둥근 귀
  const hg = new THREE.Group(); hg.position.set(0, 0.19, 0.30); hg.rotation.x = 0.10; hog.add(hg);
  const head = mesh(THREE, new THREE.SphereGeometry(0.13, 14, 10), mat(THREE, K.FACE), true); head.scale.set(1, 0.9, 1); hg.add(head);
  const snout = mesh(THREE, new THREE.ConeGeometry(0.085, 0.16, 10), mat(THREE, K.FACE));
  snout.rotation.x = Math.PI / 2; snout.position.set(0, -0.02, 0.15); hg.add(snout);
  const nose = mesh(THREE, new THREE.SphereGeometry(0.032, 8, 6), mat(THREE, K.DARK)); nose.position.set(0, -0.02, 0.23); hg.add(nose);
  hg.add(cluster(THREE, new THREE.SphereGeometry(0.024, 8, 6), mat(THREE, K.DARK), pair(s => ({ p: [0.075 * s, 0.045, 0.095] }))));
  hg.add(cluster(THREE, new THREE.SphereGeometry(0.008, 6, 4), mat(THREE, 0xffffff), pair(s => ({ p: [0.08 * s, 0.055, 0.115] }))));
  hg.add(cluster(THREE, new THREE.SphereGeometry(0.04, 8, 6), mat(THREE, K.EAR), pair(s => ({ p: [0.10 * s, 0.10, -0.02], s: [1, 1, 0.5] }))));
  return root;
}

// ── 🐸 청개구리 ─────────────────────────────────────────────
//   표지: 매끈한 연두 · 머리 위로 솟은 눈(금색 홍채 + 가로 동공) · 콧등→눈 짙은 줄 · 흰 턱·배 · 접은 뒷다리.
//   곧게 앉은 3/4(Q1). ⚠️ 흰 왕눈으로 되돌리지 말 것 — 다른 세 종과 톤이 갈린다.
function makeFrog(THREE) {
  const K = { GREEN: 0x7cc24a, DARK: 0x3e6a2b, BELLY: 0xf0f3dc, IRIS: 0xd8a83a, PUPIL: 0x141210, PAD: 0x9fd46a };
  const root = new THREE.Group(), fr = new THREE.Group();
  fr.rotation.y = 0.55; fr.scale.setScalar(1.2); root.add(fr);
  // 몸 — 뒤로 가늘어지는 물방울을 앞이 들리게(앉은 자세)
  const bp = new THREE.Group(); bp.position.set(0, 0.20, -0.06); bp.rotation.x = -0.50; fr.add(bp);
  const body = mesh(THREE, teardrop(THREE, 0.22, 0.52, 0.45), mat(THREE, K.GREEN), true); body.scale.x = 1.05; bp.add(body);
  const belly = mesh(THREE, new THREE.SphereGeometry(0.19, 12, 10), mat(THREE, K.BELLY));
  belly.position.set(0, -0.08, 0.06); belly.scale.set(1, 0.6, 1.1); bp.add(belly);
  // 머리 — 넓고 납작. 몸 앞 위에 파묻는다
  const hg = new THREE.Group(); hg.position.set(0, 0.36, 0.12); fr.add(hg);
  const head = mesh(THREE, new THREE.SphereGeometry(0.19, 16, 12), mat(THREE, K.GREEN), true); head.scale.set(1.15, 0.62, 1.0); hg.add(head);
  const jaw = mesh(THREE, new THREE.SphereGeometry(0.17, 14, 10), mat(THREE, K.BELLY)); jaw.scale.set(1.1, 0.45, 0.95); jaw.position.set(0, -0.05, 0.02); hg.add(jaw);
  // 짙은 줄 — 머리 윗옆에(위에서 보이게). ⚠️ 머리 밖으로 길게 빼면 검은 칼날처럼 튀어나온다
  hg.add(cluster(THREE, new THREE.SphereGeometry(0.1, 10, 8), mat(THREE, K.DARK), pair(s => ({ p: [0.15 * s, 0.045, 0.06], r: [0, 0.25 * s, 0], s: [0.10, 0.10, 1.05] }))));
  // 눈 — 머리 윤곽 위로 솟은 연두 눈두덩 + 금색 홍채 + 가로 동공
  const EY = 0.115, EX = 0.12, EZ = 0.05, ER = 0.07;
  hg.add(cluster(THREE, new THREE.SphereGeometry(ER, 12, 10), mat(THREE, K.GREEN), pair(s => ({ p: [EX * s, EY, EZ] })), true));
  hg.add(cluster(THREE, new THREE.SphereGeometry(ER * 0.78, 12, 10), mat(THREE, K.IRIS), pair(s => ({ p: [(EX + ER * 0.30) * s, EY + ER * 0.22, EZ + ER * 0.30] }))));
  hg.add(cluster(THREE, new THREE.SphereGeometry(ER * 0.40, 10, 8), mat(THREE, K.PUPIL), pair(s => ({ p: [(EX + ER * 0.52) * s, EY + ER * 0.36, EZ + ER * 0.52], s: [1.3, 0.55, 0.6] }))));
  // 뒷다리 — 옆에 접힌 허벅지 + 앞으로 향한 발
  fr.add(cluster(THREE, teardrop(THREE, 0.10, 0.34, 0.5), mat(THREE, K.GREEN), pair(s => ({ p: [0.20 * s, 0.10, -0.08], r: [0.3, 0.25 * s, 0], s: [0.9, 0.85, 1] })), true));
  fr.add(cluster(THREE, new THREE.SphereGeometry(0.07, 10, 8), mat(THREE, K.PAD), pair(s => ({ p: [0.26 * s, 0.02, 0.10], s: [1, 0.3, 1.6] }))));
  // 앞다리 — 통통한 팔(막대는 말뚝처럼 보였다) + 둥근 흡반
  fr.add(cluster(THREE, new THREE.SphereGeometry(0.05, 10, 8), mat(THREE, K.GREEN), pair(s => ({ p: [0.13 * s, 0.08, 0.19], r: [0.25, 0, 0.2 * s], s: [0.75, 1.6, 0.75] }))));
  fr.add(cluster(THREE, new THREE.SphereGeometry(0.045, 8, 6), mat(THREE, K.PAD), pair(s => ({ p: [0.13 * s, 0.01, 0.23], s: [1.3, 0.35, 1] }))));
  return root;
}

const BUILD = { butterfly: makeButterfly, sparrow: makeSparrow, hedgehog: makeHedgehog, frog: makeFrog };

/** js/duel/art.js 의 mergeGeos 와 같은 구현 — three/addons 없이 위치·법선·정점색을 합친다 */
function mergeGeos(THREE, geos) {
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'color']) {
    const size = geos[0].attributes[name].itemSize;
    const arr = new Float32Array(geos.reduce((n, g) => n + g.attributes[name].count, 0) * size);
    let off = 0;
    for (const g of geos) { arr.set(g.attributes[name].array, off); off += g.attributes[name].count * size; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  return out;
}

/**
 * ⚡ 부품별로 만든 조형을 **정점색으로 구워 두 덩어리**(그림자 O / X)로 합친다 — 종당 2콜(+그림자 1콜).
 *   부품을 그대로 두면 종당 11~18콜이었다(2026-09-29 실측, 동시 2마리면 최대 34콜).
 *   InstancedMesh 는 인스턴스마다 행렬을 풀어 굽는다. 거울 인스턴스(음수 스케일)가 있어 재질은 양면이다.
 */
function bake(THREE, root) {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert(), m = new THREE.Matrix4(), im = new THREE.Matrix4();
  const cast = [], flat = [];
  const push = (o, mat4) => {
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(mat4);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    // 거울(음수 스케일)은 삼각형 감김이 뒤집혀 양면 재질에서 뒷면 조명을 받는다(🦋 왼쪽 날개만 어두웠다) — 되돌린다
    if (mat4.determinant() < 0) for (const k of ['position', 'normal']) {
      const a = g.attributes[k].array;
      for (let t = 0; t < a.length; t += 9) for (let j = 0; j < 3; j++) { const v = a[t + 3 + j]; a[t + 3 + j] = a[t + 6 + j]; a[t + 6 + j] = v; }
    }
    const c = o.material.color, n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    (o.castShadow ? cast : flat).push(g);
  };
  root.traverse(o => {
    if (!o.isMesh) return;
    m.multiplyMatrices(inv, o.matrixWorld);
    if (o.isInstancedMesh) for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, im); push(o, im.clone().premultiply(m)); }
    else push(o, m);
  });
  const out = new THREE.Group();
  for (const [geos, shadow] of [[cast, true], [flat, false]]) {
    if (!geos.length) continue;
    const mesh = new THREE.Mesh(mergeGeos(THREE, geos),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0, side: THREE.DoubleSide }));
    mesh.castShadow = shadow;
    out.add(mesh);
  }
  return out;
}

/**
 * 방문객 조형. 원점 = 발바닥(y 0). 모르는 id 는 🐸 로 대신한다.
 * @param {'butterfly'|'sparrow'|'hedgehog'|'frog'} id
 */
export function makeVisitor(THREE, id) {
  return bake(THREE, (BUILD[id] || BUILD.frog)(THREE));
}
