// =============================================================
//  🌫️ 안개 낀 숲 — 그림자 정령을 등불·♪음악으로 달래는 무폭력 웨이브
//  ------------------------------------------------------------
//  js/game.js 에서 원문 그대로 옮겨 온 구역(분리 2단계, 2026-09-26).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 에 남은 let 에 쓸 때는 `$w.x = …` (읽기는 그냥 x). 도구·증명: tools/refactor/
// =============================================================
import {
  $w, WEATHER, atMist, atOrchard, awardBadge, blockIfLocked, clayMat, dexDiscover, diffParams, dist2D, doPlayerAction,
  firstHint, gameState, giveReward, houseWindows, lastZoneHint, makeSignpost, mapLocked, mergeGeos, mist,
  mistGroup, mistLanterns, mistTree, nearDoor, obstacles, player, rollDifficulty, scene, setSpaceVisible,
  settleDifficulty, settleOrchard, shared, snapCamera, solidCircle, spawnConfetti, spawnFloatText, spawnSparkle,
  swayables, syncBadges, syncStory, todayStr, trackDiffAbandon, triggerMoment, ui, woodMat,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))
import { trackEvent } from '../analytics.js';
import { LANTERN_CALM_R, MIST, MIST_DRAIN, MIST_GATE, MIST_HALF, MIST_LANTERN_POS, MIST_PRACTICE_STEPS, MIST_WAVES, ORCHARD, ORCHARD_GATE, ORCHARD_HALF, PURIFY_GLOW, SOOTHE_GLOW, SPIRITS, TREE_LIGHT_MAX } from '../data/places.js';
import { FRUITS, sapKeyOf } from '../orchard.js';
import { Sound, setBGMTheme } from '../sound.js';
import * as THREE from 'three';

// 부드러운 방사형 안개 텍스처(캔버스 그라데이션) — 딱딱한 판 대신 가장자리가 스르르 사라지는 퍼프
export let _mistPuffTex = null;

export function mistPuffTexture() {
  if (_mistPuffTex) return _mistPuffTex;
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128;
  const c = cv.getContext('2d');
  const grad = c.createRadialGradient(64, 64, 8, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.55, 'rgba(235,240,250,0.4)');
  grad.addColorStop(1, 'rgba(230,236,248,0)');
  c.fillStyle = grad; c.fillRect(0, 0, 128, 128);
  _mistPuffTex = new THREE.CanvasTexture(cv);
  return _mistPuffTex;
}

export function mistPuffSprite(scale, opacity) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({
    map: mistPuffTexture(), transparent: true, opacity, depthWrite: false, color: 0xdfe7f4,
  }));
  sp.scale.set(scale, scale * 0.62, 1);
  return sp;
}

// 🍎 과수원 언덕길 입구 — 마을 정동쪽. **잠겨 있어도 멀리서 보여야 한다.**
//   해금은 "안 보이는 것"이 아니라 "보이는데 가로대가 막고 있는 것"이다. 안 그러면
//   유저가 존재 자체를 모르고, 무엇을 하면 열리는지도 알 수 없다.
export let orchardGateBar = null;

export let orchardGateSolid = null;

export function syncOrchardGateLock() {
  const locked = mapLocked('orchard');
  if (orchardGateBar) orchardGateBar.visible = locked;
  if (orchardGateSolid) orchardGateSolid.off = !locked;   // 잠겼을 때만 막는다(해금되면 그대로 통과)
}

export function buildOrchardGate() {
  // 국소 좌표 원점 = **문 앞**. 온실 몸통은 +x 로 뻗고, 그룹을 돌려 북쪽을 향하게 한다.
  //   ORCHARD_GATE 가 곧 문 위치라 프롬프트 반경 2.2 가 문 앞에 정확히 걸린다.
  const g = new THREE.Group(); g.position.copy(ORCHARD_GATE);
  const wood = clayMat(0x9a7248), woodDark = clayMat(0x7d5a38), trim = clayMat(0xc06a72);
  const R = 2.1, LEN = 7.0, PANELS = 5;
  const glass = new THREE.MeshStandardMaterial({ color: 0xcfe9e4, transparent: true, opacity: 0.34, roughness: 0.15, metalness: 0, side: THREE.DoubleSide });
  const mid = LEN / 2;   // 몸통 중심(문에서 +x 쪽)

  // 아치 지붕 — 반원을 다섯 면으로 접는다(저지형 톤)
  const pw = Math.PI * R / PANELS + 0.06;
  for (let i = 0; i < PANELS; i++) {
    const a = Math.PI * (i + 0.5) / PANELS;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(LEN, 0.05, pw), glass);
    panel.position.set(mid, R * Math.sin(a), R * Math.cos(a));
    panel.rotation.x = Math.PI / 2 - a;
    g.add(panel);
  }
  for (const bx of [0.08, mid, LEN - 0.08]) {          // 분홍 트림 뼈대 셋
    const rib = new THREE.Mesh(new THREE.TorusGeometry(R, 0.075, 6, 14, Math.PI), trim);
    rib.position.set(bx, 0, 0); rib.rotation.y = Math.PI / 2; rib.castShadow = true; g.add(rib);
  }
  for (const sz of [-R, R]) {                           // 바닥 레일
    const rail = new THREE.Mesh(new THREE.BoxGeometry(LEN, 0.14, 0.16), wood);
    rail.position.set(mid, 0.07, sz); g.add(rail);
  }

  // 앞면 — 반원 도형에 문 구멍을 뚫어 통째로 깎는다. 조각을 이어붙이면 계단처럼 각지는데,
  //   도형을 쓰면 아치 곡선을 그대로 따라가고 메시도 하나다(드로우콜 1).
  const wall = clayMat(0xe6d8bf);
  const DOOR_W = 1.15, DOOR_H = 1.8, DOOR_C = 0.25;        // 문 폭·높이·중심(참고 이미지처럼 살짝 치우침)
  const face = new THREE.Shape();
  face.moveTo(-R, 0);
  face.absarc(0, 0, R, Math.PI, 0, true);                   // 반원(왼끝 → 위 → 오른끝)
  face.lineTo(-R, 0);
  const hole = new THREE.Path();                            // 문 구멍
  hole.moveTo(DOOR_C - DOOR_W / 2, 0.02);
  hole.lineTo(DOOR_C + DOOR_W / 2, 0.02);
  hole.lineTo(DOOR_C + DOOR_W / 2, DOOR_H);
  hole.lineTo(DOOR_C - DOOR_W / 2, DOOR_H);
  hole.lineTo(DOOR_C - DOOR_W / 2, 0.02);
  face.holes.push(hole);
  const faceMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(face, { depth: 0.12, bevelEnabled: false, curveSegments: 20 }), wall);
  faceMesh.rotation.y = Math.PI / 2;                        // 도형 X → 국소 -z · 압출 방향 → 국소 +x(안쪽)
  faceMesh.castShadow = true; g.add(faceMesh);

  const dz = -DOOR_C;                                       // rotation.y=+π/2 로 도형 X 가 뒤집힌다
  const doorway = new THREE.Mesh(new THREE.BoxGeometry(0.06, DOOR_H, DOOR_W), clayMat(0x4a3b2c));
  doorway.position.set(0.14, DOOR_H / 2, dz); g.add(doorway);                       // 문 안쪽 어둠
  // 문 위 간판 사과 — 전에 둔 둥근 테가 나뭇가지처럼 보였다. 무엇을 파는 곳인지 한눈에 읽히게 한다
  const badge = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 1), clayMat(0xd64a42));
  badge.position.set(-0.06, DOOR_H + 0.26, dz); badge.castShadow = true; g.add(badge);
  const badgeLeaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 0), clayMat(0x5f9e52));
  badgeLeaf.position.set(-0.08, DOOR_H + 0.47, dz + 0.12); g.add(badgeLeaf);
  const badgeStem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.14, 4), clayMat(0x7d5a38));
  badgeStem.position.set(-0.06, DOOR_H + 0.46, dz); g.add(badgeStem);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.3), clayMat(0x7d9b93));
  win.position.set(-0.02, 1.1, dz - 1.15); g.add(win);                              // 문 옆 작은 창
  const arcFront = new THREE.Mesh(new THREE.TorusGeometry(R, 0.09, 6, 20, Math.PI), trim);
  arcFront.position.set(0.02, 0, 0); arcFront.rotation.y = Math.PI / 2; g.add(arcFront);

  for (const rz of [-1.05, 0, 1.05]) {                  // 안쪽 이랑
    const bed = new THREE.Mesh(new THREE.BoxGeometry(LEN - 1.2, 0.22, 0.5), clayMat(0x8a6440));
    bed.position.set(mid + 0.3, 0.11, rz); g.add(bed);
    const crop = new THREE.Mesh(new THREE.BoxGeometry(LEN - 1.8, 0.34, 0.3), clayMat(0x5f9e52));
    crop.position.set(mid + 0.3, 0.38, rz); g.add(crop);
  }

  // 과일 궤짝 — 참고 이미지처럼 문 앞을 막지 않고 옆으로 비켜 놓는다
  [[-0.7, 2.6], [-0.7, 3.4], [0.4, 3.0]].forEach(([cx, cz], i) => {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.4, 0.66), wood);
    box.position.set(cx, 0.2, cz); box.castShadow = true; g.add(box);
    const fill = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.15, 0.52), clayMat(FRUITS[i % FRUITS.length].fruitColor));
    fill.position.set(cx, 0.45, cz); g.add(fill);
  });

  // (둘레 과일나무 없음 — 벌목 가능한 숲 나무와 지오메트리가 같아 유저가 벨 수 있다. 과일나무는 과수원 안에만 둔다)

  // 문으로 오르는 흙 계단 — 🏛️ 박물관 정면 계단과 같은 패턴(박스 단·문보다 넓은 폭).
  //   예전엔 반경 1.2 원기둥을 0.9 간격으로 놓아 단끼리 크게 겹쳤다 — 계단이 아니라 팬케이크 더미로 읽혔다.
  //   디딤면(0.7)은 좁게, 단 높이차(0.10)는 뚜렷하게 — 얇고 넓으면 계단이 아니라 데크로 읽힌다.
  //   단끼리는 디딤면 길이만큼 띄워 딱 맞물리고, 첫 단은 문턱에 붙여 정면과 한 덩어리로 읽히게 한다.
  //   문(폭 1.15)에서 멀어질수록 넓고 낮아져 땅에 녹아든다. z 중심은 문 중심(dz)에 맞춘다.
  [[-0.9, 0.28, 1.9], [-1.6, 0.18, 2.2], [-2.3, 0.09, 2.5]].forEach(([sx, sh, sw]) => {
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.7, sh, sw), clayMat(0xb08a5e, false));
    st.position.set(sx, sh / 2, dz); st.receiveShadow = true; g.add(st);
  });

  // 🔒 잠금 가로대 — 문 앞을 가로지른다
  orchardGateBar = new THREE.Group();
  for (const [by, bh] of [[0.95, 0.2], [1.5, 0.15]]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, bh, 2.9), woodDark);
    bar.position.set(-0.45, by, 0); bar.castShadow = true; orchardGateBar.add(bar);
  }
  const lockRing = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.045, 6, 10), clayMat(0xb9b3a6));
  lockRing.position.set(-0.6, 1.36, 0); lockRing.rotation.y = Math.PI / 2; orchardGateBar.add(lockRing);
  const lockBody = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.24, 0.26), clayMat(0xd8d2c4));
  lockBody.position.set(-0.6, 1.18, 0); orchardGateBar.add(lockBody);
  g.add(orchardGateBar);

  // 팻말 — 판은 제 그룹의 +z 를 향한다. 그룹이 rotation.y=+π/2 라 그대로 두면 동쪽(마을 반대)을 본다.
  //   래퍼를 -π/2 돌려 국소 -x(= 월드 +z, 걸어오는 남쪽)를 보게 한다. 래퍼 원점에 팻말을 두어 회전해도 안 밀린다.
  const sp = makeSignpost('🍎 과수원', 0, 0);
  sp.position.set(-2.6, 0, 2.4); sp.rotation.y = -Math.PI / 2; g.add(sp);
  g.rotation.y = Math.PI / 2;    // 국소 +x → 월드 -z(북). 몸통이 북쪽으로 뻗고 **문은 남쪽을 본다** — 마을에서 걸어오는 쪽
  scene.add(g);

  // 🚧 몸통을 실제로 막는다 — 원 하나로는 7 길이를 못 덮어 그냥 통과했다.
  //    문 앞(국소 -x = 월드 +z)은 비워 둬야 프롬프트 반경 2.2 안에 설 수 있다.
  for (let d = 1.0; d <= LEN; d += 1.5) solidCircle(ORCHARD_GATE.x, ORCHARD_GATE.z - d, 1.9);   // 몸통은 -z(북)
  orchardGateSolid = solidCircle(ORCHARD_GATE.x, ORCHARD_GATE.z + 0.45, 1.5);   // 🔒 잠긴 동안 문을 막는다
  obstacles.push({ x: ORCHARD_GATE.x, z: ORCHARD_GATE.z - mid, r: R + 1.4 });   // 밭·나무 금지 구역
  // 🚧 문 앞 흙 계단·광장도 밭 금지 — 몸통 원(북쪽)만 막아 두니 계단 위에서 괭이질이 됐다.
  //   과수원 입구가 텃밭에 파묻히면 "들어가는 곳"으로 안 읽힌다.
  obstacles.push({ x: ORCHARD_GATE.x, z: ORCHARD_GATE.z + 2.6, r: 2.4 });
  syncOrchardGateLock();
}

export function buildMistGate() {
  const g = new THREE.Group(); g.position.copy(MIST_GATE);
  const bark = clayMat(0x6b6178);                      // 라벤더빛 고목(검정 덩어리 대신 낮에도 읽히는 톤)
  // 안쪽으로 기울어 맞닿는 고목 두 그루 + 늘어진 상인방 가지
  for (const side of [-1, 1]) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, 3.8, 6), bark);
    trunk.position.set(side * 1.55, 1.8, 0); trunk.rotation.z = -side * 0.3; trunk.castShadow = true; g.add(trunk);
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 1.1, 5), bark);   // 옆가지
    branch.position.set(side * 1.1, 2.6, 0.1); branch.rotation.z = -side * 1.15; g.add(branch);
    // 잎 뭉치 — 라벤더·청회·물빛 섞어 몽환적으로(작게 여러 개, 큰 검은 덩어리 금지)
    [[side * 0.75, 3.6, 0, 0.62, 0x9b93b8], [side * 1.35, 3.15, 0.25, 0.46, 0x847fa3], [side * 0.35, 3.95, -0.15, 0.4, 0x7fa3a8]]
      .forEach(([x, y, z, r, col]) => {
        const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), clayMat(col, false));
        leaf.position.set(x, y, z); g.add(leaf);
      });
  }
  const lintel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.6, 6), bark);       // 살짝 처진 상인방
  lintel.position.set(0, 3.32, 0); lintel.rotation.z = Math.PI / 2; lintel.rotation.x = 0.06; g.add(lintel);
  // 늘어진 덩굴 + 🏮 청록 등불 두 개(항상 은은히 — 신비로운 입구의 시그니처)
  for (const [vx, vlen] of [[-0.85, 0.75], [0.85, 0.55], [0.2, 0.4]]) {
    const vine = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, vlen, 4), clayMat(0x76889b));
    vine.position.set(vx, 3.3 - vlen / 2, 0.05); g.add(vine);
  }
  for (const lx of [-0.85, 0.85]) {
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 0),
      new THREE.MeshStandardMaterial({ color: 0xbef3ea, emissive: 0x5fe8d0, emissiveIntensity: 0.55, roughness: 0.5 }));
    orb.position.set(lx, 3.3 - (lx < 0 ? 0.82 : 0.62), 0.05); g.add(orb);
  }
  // 발치: 디딤돌 길 + 발광 버섯 — "들어가 보고 싶은" 입구의 디테일
  [[0.15, 1.1], [-0.2, 2.0], [0.1, 2.9]].forEach(([sx, sz]) => {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.09, 7), clayMat(0x9aa1ad, false));
    st.position.set(sx, 0.05, sz); st.receiveShadow = true; g.add(st);
  });
  for (const [mx, mz, mr] of [[-1.15, 0.7, 0.09], [1.25, 0.45, 0.07], [1.05, 0.75, 0.055]]) {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(mr * 0.45, mr * 0.6, mr * 2.4, 5), clayMat(0xdde2e8, false));
    stem.position.set(mx, mr * 1.2, mz); g.add(stem);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(mr, 7, 5, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x8fd8cc, emissive: 0x4fc8b4, emissiveIntensity: 0.45, roughness: 0.6 }));
    cap.position.set(mx, mr * 2.3, mz); g.add(cap);
  }
  // 안개 — 딱딱한 판 대신 소프트 퍼프 여러 겹(아치 안쪽으로 깊어질수록 짙게)
  [[0, 1.5, -0.4, 3.6, 0.30], [0.7, 0.9, -1.3, 2.8, 0.34], [-0.6, 1.1, -2.2, 3.2, 0.4], [0, 0.45, 0.6, 2.6, 0.22]]
    .forEach(([px, py, pz, sc, op]) => { const p = mistPuffSprite(sc, op); p.position.set(px, py, pz); g.add(p); });
  g.add(makeSignpost('🌫️ 안개 낀 숲', 1.9, 1.6));      // 표지판은 아치 옆으로(입구 시야 확보)
  g.rotation.y = Math.PI / 4;                          // 마을 중심(남동)을 바라보게
  scene.add(g);
  obstacles.push({ x: MIST_GATE.x, z: MIST_GATE.z, r: 2.6 });
  [-1, 1].forEach(side => solidCircle(MIST_GATE.x + side * 1.1, MIST_GATE.z - side * 1.1, 0.35));   // 고목 기둥(아치 회전 반영)
}

export function buildMistSpace() {
  const g = new THREE.Group(); g.position.copy(MIST);
  const H = MIST_HALF;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(H + 1.5, 40), clayMat(0x3e4452, false));
  floor.geometry.rotateX(-Math.PI / 2); floor.position.y = 0.02; floor.receiveShadow = true; g.add(floor);
  // 둘레의 뒤틀린 고목 울타리(경계 연출)
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + 0.15;
    if (Math.abs(a - Math.PI / 2) < 0.35) continue;    // 남쪽 출구는 비움
    const r = H + 1.6 + ((i * 7) % 3) * 0.5;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 3 + (i % 3), 5), clayMat(0x443f52));
    trunk.position.set(Math.cos(a) * r, 1.6, Math.sin(a) * r); trunk.rotation.z = Math.sin(i * 3) * 0.2; g.add(trunk);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.0 + (i % 2) * 0.4, 0), clayMat(0x4e4a66, false));
    crown.position.set(Math.cos(a) * r, 3.4 + (i % 3) * 0.5, Math.sin(a) * r); g.add(crown);
  }
  // 🌳 수호목 — 중앙 북쪽. 빛 게이지에 따라 잎이 밝아지고 어두워진다
  const tg = new THREE.Group(); tg.position.set(0, 0, -3);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 3.6, 7), woodMat(1, 2, 0x8a7a5f));
  trunk.position.y = 1.8; trunk.castShadow = true; tg.add(trunk);
  const mats = [];
  [[0, 4.4, 0, 1.7], [-1.2, 3.6, 0.4, 1.1], [1.1, 3.7, -0.4, 1.2]].forEach(([x, y, z, r]) => {
    const m = new THREE.MeshStandardMaterial({ color: 0x8fe8d8, emissive: 0x4fd8b8, emissiveIntensity: 0.9, roughness: 0.6 });
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), m);
    leaf.position.set(x, y, z); tg.add(leaf); mats.push(m);
  });
  const tlight = new THREE.PointLight(0x7fe8cf, 2.2, 26, 1.1); tlight.position.set(0, 4.2, 0); tg.add(tlight);
  g.add(tg);
  $w.mistTree = { group: tg, mats, light: tlight };
  // 🏮 둘레 등불 — 꺼진 채 시작, 액션으로 점화(그날 내내 유지)
  mistLanterns.length = 0;
  for (const [lx, lz] of MIST_LANTERN_POS) {
    const lg = new THREE.Group(); lg.position.set(lx, 0, lz);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 1.6, 6), clayMat(0x4a4a54));
    pole.position.y = 0.8; lg.add(pole);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x777f8c, emissive: 0x9fe8ff, emissiveIntensity: 0, roughness: 0.55 });
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 0), headMat); head.position.y = 1.78; lg.add(head);
    const ll = new THREE.PointLight(0x9fe8ff, 0, 9, 1.3); ll.position.y = 1.9; lg.add(ll);
    g.add(lg);
    mistLanterns.push({ x: lx, z: lz, headMat, light: ll, lit: false });
  }
  g.add(makeSignpost('🚪 마을로', 0, H - 0.8));
  scene.add(g); $w.mistGroup = g; g.visible = false;
  solidCircle(MIST.x, MIST.z - 3, 1.0);                // 🚧 수호목 줄기(잎 상호작용 반경 확보)
  mistLanterns.forEach(l => solidCircle(MIST.x + l.x, MIST.z + l.z, 0.24));
}

export function mistDaily() {
  const st = gameState.mist;
  if (st.date !== todayStr()) {                        // 자정 지나면 새 안개
    st.date = todayStr(); st.purified = false;
    mistLanterns.forEach(l => { l.lit = false; });
    mist.treeLight = TREE_LIGHT_MAX;
  }
  return st;
}

// 수호목·등불 시각 상태를 게이지에 맞춤(입장·매 프레임 양쪽에서 호출해도 안전)
export function applyMistVisuals() {
  const ratio = gameState.mist.purified ? 1 : Math.max(0, mist.treeLight / TREE_LIGHT_MAX);
  if (mistTree) {
    mistTree.mats.forEach(m => { m.emissiveIntensity = 0.15 + ratio * 1.0; });
    mistTree.light.intensity = 0.4 + ratio * 2.4;
  }
  mistLanterns.forEach(l => {
    l.headMat.emissiveIntensity = l.lit ? 1.3 : 0;
    l.light.intensity = l.lit ? 1.5 : 0;
  });
}

export function enterMist() {
  if (blockIfLocked('mist')) return;   // 🧪 [베타 2차] 계단식 열기
  $w.atMist = true;
  const st = mistDaily();
  player.position.set(MIST.x, 0, MIST.z + MIST_HALF - 1.6); player.rotation.y = Math.PI;
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null;
  snapCamera(); setSpaceVisible(); applyMistVisuals();
  if (st.purified) {
    ui.toast?.('🌤️ 오늘의 숲은 맑아요. 정령들이 고마워해요. 내일 다시 안개가 차요');
  } else {
    firstHint('mistWood', '🌫️', '안개 낀 숲',
      '🌳수호목 앞에서 정화 시작\n🏮등불로 늦추고 ♪가 가장 작을 때 탭!\n세 무리를 모두 달래면 숲이 맑아져요');
  }
  Sound.blip(); setBGMTheme?.('cave');                 // 어둑한 숲 무드(동굴 테마 재사용)
  trackEvent('mist_enter', { purified: st.purified, weather: WEATHER });   // [GA4] 유입
}

export function exitMist() {
  if (mist.active) mistEnd('quit');                    // 나가면 이번 시도는 종료(등불·✨는 유지)
  closeMistChoice(); setMistStep(-1);                  // 갈림길 카드·연습 안내도 접는다
  $w.atMist = false;
  player.position.set(MIST_GATE.x + 1.6, 0, MIST_GATE.z + 1.6);
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null;
  snapCamera(); setSpaceVisible();
  Sound.blip(); setBGMTheme?.('main');
  trackEvent('mist_exit');                             // [GA4]
}

export function enterOrchard() {
  if (blockIfLocked('orchard')) return;           // 🔒 고급 작물 1회 수확 전이면 여기서 막힌다
  $w.atOrchard = true;
  player.position.set(ORCHARD.x, 0, ORCHARD.z + ORCHARD_HALF - 1.6); player.rotation.y = Math.PI;
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null;
  snapCamera(); setSpaceVisible();
  settleOrchard();   // 🍎 일일 정산(날짜 게이트) — 벌통과 같은 문법
  // 묘목이 없으면 "심어라" 가 아니라 "사 와라" 를 먼저 말한다 — 살 곳을 안 알려준 탓에
  //   고급 작물 채택률이 0% 였다. 같은 실수를 반복하지 않는다.
  const hasSap = FRUITS.some(f => (gameState.inventory[sapKeyOf(f.id)] || 0) > 0);
  firstHint('orchardIntro', '🍎', '과수원', hasSap
    ? '🌰씨앗 도구로 흙 자리에 묘목을 심어요\n시냇가 나무는 물을 안 줘도 돼요\n다 자라면 매일 와서 따요'
    : '🌰묘목은 마을 🛒상점에서 팔아요\n사 와서 씨앗 도구로 흙 자리에 심어요\n시냇가에 심으면 물을 안 줘도 돼요');
  Sound.blip(); setBGMTheme?.('main');
  trackEvent('orchard_enter', { trees: (gameState.orchard?.trees || []).length });   // [GA4] 유입
}

export function exitOrchard() {
  $w.atOrchard = false;
  player.position.set(ORCHARD_GATE.x - 1.6, 0, ORCHARD_GATE.z + 1.6);
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null;
  snapCamera(); setSpaceVisible();
  Sound.blip();
  trackEvent('orchard_exit');   // [GA4]
}

export function startPurify() {
  const st = mistDaily();
  if (st.purified) { ui.toast?.('오늘은 이미 숲이 맑아요. 내일 새 안개가 차면 다시 와요'); return; }
  closeMistChoice(); setMistStep(-1);
  Object.assign(mist, { active: true, practice: false, wave: 0, treeLight: TREE_LIGHT_MAX, soothe: null, t: 0, warned: false });
  clearMistSpirits();
  spawnMistWave();
  Sound.water(); spawnSparkle(MIST.x, 3.5, MIST.z - 3, 20);
  trackEvent('mist_purify_start', { weather: WEATHER, lit: mistLanterns.filter(l => l.lit).length });   // [GA4]
}

export function setMistStep(step) { mist.step = step; ui.setMistGuide?.(step, MIST_PRACTICE_STEPS, () => startPurify()); }

export function practiceAdvance(to) {
  if (!mist.practice || mist.step >= to) return;
  setMistStep(to); trackEvent('mist_practice_step', { step: to + 1 });   // [GA4] 연습 퍼널
}

export function startPractice() {
  closeMistChoice();
  Object.assign(mist, { active: true, practice: true, wave: 0, treeLight: TREE_LIGHT_MAX, soothe: null, t: 0, warned: false });
  clearMistSpirits();
  const a = Math.random() * Math.PI * 2, r = MIST_HALF - 0.8;
  mist.spirits.push(makeSpirit(SPIRITS[0], Math.cos(a) * r, Math.sin(a) * r));
  setMistStep(mistLanterns.some(l => l.lit) ? 1 : 0);   // 이미 켜둔 등불이 있으면 ①은 건너뜀
  Sound.blip();
  trackEvent('mist_practice_start', { lit: mistLanterns.filter(l => l.lit).length });   // [GA4]
}

export function endPractice(result) {   // done(달램) / quit(퇴장)
  mist.active = false; mist.practice = false;
  clearMistSpirits(); applyMistVisuals();
  if (result === 'done') { gameState.mist.practiced = true; setMistStep(3); }   // ④ 카드 + [🌳 바로 시작하기]
  else setMistStep(-1);
  trackEvent('mist_practice_end', { result });   // [GA4]
}

export function closeMistChoice() { if (!mist.choiceOpen) return; mist.choiceOpen = false; ui.hideMistChoice?.(); }

export function openMistChoice() {
  mist.choiceOpen = true;
  ui.showMistChoice?.({
    onStart:    () => { trackEvent('mist_choice', { pick: 'start' });    startPurify(); },
    onPractice: () => { trackEvent('mist_choice', { pick: 'practice' }); startPractice(); },
  });
  trackEvent('mist_choice_shown');   // [GA4] 갈림길 노출(선택 비율 = mist_choice / 여기)
}

export function spawnMistWave() {
  mist.wave += 1;
  let count = MIST_WAVES[mist.wave - 1] + (WEATHER === 'fog' ? 1 : 0);
  const kinds = SPIRITS.filter(s => !s.fog);
  for (let i = 0; i < count; i++) {
    // 🌟 황금 정령: 안개 낀 날 마지막 웨이브에 1마리(도감 재방문 훅)
    const def = (WEATHER === 'fog' && mist.wave === MIST_WAVES.length && i === 0)
      ? SPIRITS.find(s => s.id === 'golden')
      : kinds[Math.floor(Math.random() * kinds.length)];
    const a = Math.PI * 2 * (i / count) + Math.random() * 0.8;
    const r = MIST_HALF - 0.8;
    mist.spirits.push(makeSpirit(def, Math.cos(a) * r, Math.sin(a) * r));
  }
  ui.toast?.(`🌫️ 정령 무리 ${mist.wave}/${MIST_WAVES.length} — ${count}마리가 다가와요`, 2400);   // '웨이브'는 유저 질문(2026-09-07)으로 '무리'로 교체
  trackEvent('mist_wave', { n: mist.wave, count });     // [GA4] 웨이브 진행
}

export function makeSpirit(def, lx, lz) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(def.size, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0x241f33, transparent: true, opacity: 0.9, emissive: def.color, emissiveIntensity: 0.4, roughness: 0.7 }));
  body.position.y = 0.9; g.add(body);
  for (const ex of [-0.1, 0.1]) {                       // 무섭지 않게 — 동그란 눈
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xfff6e8 }));
    eye.position.set(ex, 0.98, def.size * 0.82); g.add(eye);
  }
  g.position.set(lx, 0, lz);
  mistGroup.add(g);
  return { group: g, body, def, phase: Math.random() * 6, gone: 0, atTree: false };
}

export function clearMistSpirits() {
  if (mist.soothe) {
    trackDiffAbandon('mist', mist.soothe.diff, 'end', { step: mist.soothe.step, practice: mist.practice ? 1 : 0 });   // 🎚️ 정화가 끝나 달래기가 끊김
    mistGroup.remove(mist.soothe.note);                  // ♪ 진행 중이던 리듬 표식도 정리
  }
  mist.spirits.forEach(s => mistGroup.remove(s.group));
  mist.spirits.length = 0;
  mist.soothe = null;
}

export function mistEnd(result) {
  if (mist.practice) { endPractice(result === 'quit' ? 'quit' : 'done'); return; }   // 🎓 연습은 보상·기록 없이 정리
  mist.active = false;
  const st = gameState.mist;
  if (result === 'purified') {
    st.purified = true; st.purifyTotal = (st.purifyTotal || 0) + 1;
    setTimeout(() => syncStory(), 2200);   // 📖 4장(숲의 비밀) — 정화 축하 연출이 먼저 지나가고 나서
    giveReward({ glow: PURIFY_GLOW }, 'mist_purify', 'day');
    Sound.complete();
    spawnConfetti(MIST.x, 4, MIST.z - 3); spawnSparkle(MIST.x, 3, MIST.z - 3, 40);
    ui.showHintModal?.({ ico: '🌤️', title: '숲이 맑아졌어요!', body: `정령들이 하늘로 돌아가고 안개가 걷혔어요. 보너스 ✨${PURIFY_GLOW} — 모은 정령빛은 상점 야외 장식 ‘✨정령 등불’에 쓸 수 있어요. 내일 다시 안개가 차면 정령들이 돌아와요.` });
    awardBadge('purifier'); syncBadges();
  } else if (result === 'faded') {
    ui.toast?.('🌫️ 수호목이 오늘은 지쳤어요… 켜둔 등불은 남아있으니 한숨 돌리고 다시 도전해요', 3600);
    Sound.build();
    // 🎓 첫 실패 후 연습 미경험이면 한 번 제안(토스트가 읽힌 뒤). 숲을 떠났거나 다시 시작했으면 안 띄운다
    if (!st.practiced) setTimeout(() => {
      if (!atMist || mist.active || ui.anyModalOpen?.()) return;
      trackEvent('mist_practice_offer');   // [GA4]
      ui.showHintModal?.({ ico: '🌫️', title: '연습 모드가 있어요', body: '정령 1마리로 연습할 수 있어요. 켜둔 등불은 그대로 남아요.',
        ok: { label: '🎓 연습해 보기', onClick: startPractice }, alt: { label: '다음에요' } });
    }, 1200);
  }
  clearMistSpirits();
  mist.treeLight = TREE_LIGHT_MAX;                     // 다음 시도를 위해 회복(등불은 유지 — 재도전이 쉬워짐)
  applyMistVisuals();
  ui.setZoneHint?.(null); $w.lastZoneHint = null;
  trackEvent('mist_end', {                              // [GA4] 정화 퍼널
    result, wave: mist.wave, soothed_total: st.soothedTotal, lit: mistLanterns.filter(l => l.lit).length, weather: WEATHER,
  });
}

export let mistHintT = 0;

export function updateMist(dt, t) {
  if (!atMist) return;
  // 정령 이동·수호목 빛 — 정화 진행 중에만
  if (mist.active) {
    mist.t += dt;
    let drain = 0;
    for (let i = mist.spirits.length - 1; i >= 0; i--) {
      const s = mist.spirits[i];
      const g = s.group;
      if (s.gone > 0) {                                 // ✨ 성불 연출: 밝아지며 떠올라 사라짐
        s.gone += dt;
        g.position.y += dt * 2.2;
        s.body.material.emissiveIntensity = 0.4 + s.gone * 3;
        s.body.material.opacity = Math.max(0, 0.9 - s.gone * 1.1);
        if (s.gone > 0.9) { mistGroup.remove(g); mist.spirits.splice(i, 1); }
        continue;
      }
      s.phase += dt;
      s.body.position.y = 0.9 + Math.sin(t * 2.2 + s.phase) * 0.08;   // 두둥실
      if (mist.soothe?.sp === s) continue;              // 달래는 중엔 멈춰서 귀 기울임
      const tx = 0 - g.position.x, tz = -3 - g.position.z;   // 목표 = 수호목(로컬 0,-3)
      const d = Math.hypot(tx, tz);
      if (d < 2.0) {                                    // 🌳 도착 — 빛을 갉아먹음
        s.atTree = true; drain += MIST_DRAIN;
        g.position.x += Math.sin(t * 3 + s.phase) * dt * 0.3;   // 나무 곁에서 서성임
        continue;
      }
      // 켜진 등불 근처에선 순해져서 느려짐
      let spd = s.def.speed;
      for (const l of mistLanterns) {
        if (l.lit && Math.hypot(l.x - g.position.x, l.z - g.position.z) < LANTERN_CALM_R) { spd *= 0.4; break; }
      }
      g.position.x += (tx / d) * spd * dt;
      g.position.z += (tz / d) * spd * dt;
    }
    if (drain > 0 && !mist.practice) {                 // 🎓 연습 중엔 수호목 빛이 줄지 않는다
      mist.treeLight = Math.max(0, mist.treeLight - drain * dt);
      if (!mist.warned && mist.treeLight < TREE_LIGHT_MAX * 0.3) {
        mist.warned = true;
        ui.toast?.('🌳 수호목의 빛이 흐려져요! 정령들을 서둘러 달래주세요', 2600);
      }
      if (mist.treeLight <= 0) { mistEnd('faded'); return; }
    }
    // ♪ 리듬 진행 — 링(♪)이 줄어들 때 탭. 놓쳐도 벌점 없음(루프), 엇박 탭만 실패
    const so = mist.soothe;
    if (so) {
      so.phase += dt / 0.95;
      if (so.phase >= 1) so.phase -= 1;
      const k = 1.7 - so.phase * 1.25;                  // 크게 시작해 작아지는 ♪
      so.note.scale.set(k * 0.62, k * 0.62, 1);
      so.note.material.opacity = 0.55 + so.phase * 0.45;
      so.note.position.set(so.sp.group.position.x, so.sp.body.position.y + 1.05, so.sp.group.position.z);
      // 자리를 뜨면 취소(정령이 다시 움직임)
      if (dist2D(player.position, { x: MIST.x + so.sp.group.position.x, z: MIST.z + so.sp.group.position.z }) > 3.2) cancelSoothe();
    }
    // 🎓 연습: 정령 곁에 오면 ② → ③, 달래서 사라지면 완료
    if (mist.practice) {
      if (mist.step === 1) {
        const lx = player.position.x - MIST.x, lz = player.position.z - MIST.z;
        if (mist.spirits.some(s => !s.gone && Math.hypot(s.group.position.x - lx, s.group.position.z - lz) < 2.4)) practiceAdvance(2);
      }
      if (!mist.spirits.length) { endPractice('done'); return; }
      applyMistVisuals(); return;                       // 존 힌트(무리 n/3)는 연습에선 안 띄움 — 슬롯은 단계 안내가 쓴다
    }
    // 무리 클리어 → 다음 무리 / 정화 완료
    if (!mist.spirits.length) {
      if (mist.wave >= MIST_WAVES.length) { mistEnd('purified'); return; }
      spawnMistWave();
    }
    // 상태 안내(존 힌트) — 0.3초마다
    if (t - mistHintT > 0.3) {
      mistHintT = t;
      ui.setZoneHint?.(`🌳 ${Math.ceil(mist.treeLight)}% · 무리 ${mist.wave}/${MIST_WAVES.length} · 정령 ${mist.spirits.filter(s => !s.gone).length}`);
      $w.lastZoneHint = 'mist';
    }
  }
  applyMistVisuals();
}

export function startSoothe(sp) {
  const cv = document.createElement('canvas'); cv.width = 96; cv.height = 96;
  const c = cv.getContext('2d');
  c.font = 'bold 64px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.lineWidth = 7; c.strokeStyle = 'rgba(20,28,24,0.8)'; c.strokeText('♪', 48, 50);
  c.fillStyle = '#aef3e2'; c.fillText('♪', 48, 50);
  const note = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthTest: false }));
  mistGroup.add(note);
  const md = rollDifficulty('mist');   // 🎚️ 정령 하나당 한 번 — 탭마다 뽑으면 한 마리 안에서 판정창이 요동친다
  mist.soothe = { sp, step: 0, phase: 0, note, ease: md.ease, diff: md };
  Sound.blip();
  practiceAdvance(2);                                   // 🎓 연습: 등불을 건너뛰고 바로 정령을 찾아도 ③으로
}

export function cancelSoothe(scared = false) {
  const so = mist.soothe; if (!so) return;
  if (!scared) trackDiffAbandon('mist', so.diff, 'walk_away', { step: so.step, practice: mist.practice ? 1 : 0 });   // 🎚️ 엇박(scared)은 miss 로 이미 남는다
  mistGroup.remove(so.note);
  if (scared) {                                         // 엇박: 정령이 놀라 가장자리 쪽으로 물러남
    const g = so.sp.group;
    const d = Math.hypot(g.position.x, g.position.z) || 1;
    const [nx, nz] = clampMist(g.position.x + (g.position.x / d) * 3, g.position.z + (g.position.z / d) * 3);
    g.position.x = nx; g.position.z = nz;
    so.sp.atTree = false;
    spawnFloatText(MIST.x + g.position.x, 1.8, MIST.z + g.position.z, '💨 놀랐어요!', '#8a94a8', 0.9);
  }
  mist.soothe = null;
}

// 숲 바닥은 반지름 MIST_HALF+1.5 의 원 — 정사각형으로 자르면 네 모서리가 바닥 밖 허공이라(토스 실기기 2026-09-07) 원형으로 가둔다
export const MIST_SPIRIT_R = MIST_HALF - 1;

export function clampMist(x, z) {
  const d = Math.hypot(x, z);
  return d > MIST_SPIRIT_R ? [x / d * MIST_SPIRIT_R, z / d * MIST_SPIRIT_R] : [x, z];
}

export function sootheTap() {
  const so = mist.soothe; if (!so) return;
  const lo = 1 - 0.38 * (so.ease || 1);                 // 기본 0.62 — 🎚️ 팔 0.7 / 1.0 / 1.3 → 0.734 / 0.62 / 0.506
  if (so.phase >= lo && so.phase <= 0.99) {             // 🎯 ♪가 작아진 순간
    so.step += 1; so.phase = 0;
    Sound.blip();
    spawnSparkle(MIST.x + so.sp.group.position.x, 1.6, MIST.z + so.sp.group.position.z, 6);
    if (so.step >= 3) {                                 // ✨ 성불!
      const sp = so.sp;
      mistGroup.remove(so.note); mist.soothe = null;
      sp.gone = 0.01;
      if (mist.practice) { Sound.harvest(); trackEvent('mist_practice_soothe'); return; }   // 🎓 연습: 연출만, 보상·도감·기록·배지 없음
      const gold = sp.def.id === 'golden';
      giveReward({ glow: gold ? SOOTHE_GLOW * 2 : SOOTHE_GLOW }, 'mist_soothe', sp.def.id);
      gameState.mist.soothedTotal = (gameState.mist.soothedTotal || 0) + 1;
      dexDiscover('spirit', sp.def.id);
      Sound.harvest(); triggerMoment();
      settleDifficulty('mist', 1);   // 🎚️ 성공 (연습은 위 practice 분기에서 이미 return 했다)
      trackEvent('mist_soothe', { kind: sp.def.id, wave: mist.wave, ...diffParams(so.diff) });   // [GA4] 달래기 성공 분포 · 🎚️ 난이도 동봉
      syncBadges();
    }
  } else {
    cancelSoothe(true);                                 // 엇박 — 부드러운 실패
    if (!mist.practice) settleDifficulty('mist', 0);   // 🎚️ 실패 — 연습 성적은 DDA 를 안 움직인다
    trackEvent(mist.practice ? 'mist_practice_miss' : 'mist_soothe_miss', { wave: mist.wave, ...diffParams(so.diff) });   // [GA4] 리듬 난이도 튜닝(연습은 분리)
  }
}

export function updateMistInteract() {
  const lx = player.position.x - MIST.x, lz = player.position.z - MIST.z;
  if (mist.choiceOpen && Math.hypot(lx, lz + 3) >= 2.8) closeMistChoice();   // 🌳 카드는 나무 곁에서만 — 걸어 나가면 닫힘
  if (mist.soothe) return '♪ 리듬에 맞춰 탭!';
  // 정령(달래기) — 도착해 나무를 갉는 정령을 우선
  let best = null, bd = 2.4;
  for (const s of mist.spirits) {
    if (s.gone) continue;
    const d = Math.hypot(s.group.position.x - lx, s.group.position.z - lz);
    if (d < bd - (s.atTree ? 0.6 : 0)) { bd = d; best = s; }
  }
  if (best) return `♪ ${best.def.name} 달래기`;
  for (const l of mistLanterns) {                       // 꺼진 등불
    if (!l.lit && Math.hypot(l.x - lx, l.z - lz) < 1.6) return '🏮 등불 켜기';
  }
  if (Math.hypot(lx, lz + 3) < 2.8) {                   // 수호목
    if (gameState.mist.purified) return '🌳 오늘은 숲이 맑아요';
    if (!mist.active) return mist.step === 3 ? '🌳 바로 시작' : '🌳 숲 정화 시작하기';
  }
  return null;
}

export function mistAction() {
  const lx = player.position.x - MIST.x, lz = player.position.z - MIST.z;
  if (mist.soothe) { sootheTap(); return; }
  let best = null, bd = 2.4;
  for (const s of mist.spirits) {
    if (s.gone) continue;
    const d = Math.hypot(s.group.position.x - lx, s.group.position.z - lz);
    if (d < bd - (s.atTree ? 0.6 : 0)) { bd = d; best = s; }
  }
  if (best) { startSoothe(best); return; }
  for (const l of mistLanterns) {
    if (!l.lit && Math.hypot(l.x - lx, l.z - lz) < 1.6) {
      l.lit = true;
      doPlayerAction(MIST.x + l.x, MIST.z + l.z);
      Sound.harvest(); spawnSparkle(MIST.x + l.x, 1.9, MIST.z + l.z, 14);
      applyMistVisuals();
      trackEvent('mist_lantern', { lit: mistLanterns.filter(x => x.lit).length });   // [GA4]
      practiceAdvance(1);                                // 🎓 연습 ① 통과
      return;
    }
  }
  if (Math.hypot(lx, lz + 3) < 2.8 && !mist.active && !gameState.mist.purified) {
    // 🎓 갈림길: 연습도 정화도 해본 적 없으면 [바로 시작 / 연습해 보기] 카드, 아니면 바로 시작(연습 완료 카드가 떠 있을 때도 바로)
    const st = gameState.mist;
    if (mist.step === 3 || st.practiced || (st.purifyTotal || 0) > 0) { startPurify(); return; }
    if (!mist.choiceOpen) openMistChoice();
    return;
  }
}

export function makeBench(x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.5), woodMat(2, 1)); seat.position.y = 0.45; seat.castShadow = true; g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 0.1), woodMat(2, 1)); back.position.set(0, 0.68, -0.2); g.add(back);
  [[-0.6, 0.18], [0.6, 0.18], [-0.6, -0.18], [0.6, -0.18]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.1), clayMat(0x6b4a34)); leg.position.set(lx, 0.22, lz); g.add(leg);
  });
  scene.add(g);
  obstacles.push({ x, z, r: 1.2 }); // 벤치 위엔 밭 금지
  solidCircle(x, z, 0.8);           // 🚧 벤치 — 폭 1.4라 끝부분까지 막히게(통과 방지)
}

export function makeLamp(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.4, 6), clayMat(0x5a5148)); pole.position.y = 1.2; pole.castShadow = true; g.add(pole);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff2a8, emissive: 0xffca70, emissiveIntensity: 0, roughness: 0.6 });
  houseWindows.push(headMat);   // 밤에 창문과 함께 빛남
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 0), headMat); head.position.y = 2.5; g.add(head);
  scene.add(g);
  obstacles.push({ x, z, r: 0.8 }); // 가로등 밑엔 밭 금지
  solidCircle(x, z, 0.22);          // 🚧 기둥만(불빛 아래는 지나갈 수 있게)
}

// 🌸 꽃 — 줄기+꽃봉오리를 정점색 한 덩이로 합쳐 그린다(꽃 한 송이 = 메시 1개 = 드로우콜 1).
//    색만 다른 5종이라 색깔별로 지오메트리 한 벌만 만들어 돌려 쓴다.
export function flowerGeo(col) {
  return shared(`flower.geo.${col}`, () => {
    const stem = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 4).translate(0, 0.2, 0);
    const bloom = new THREE.IcosahedronGeometry(0.12, 0).translate(0, 0.42, 0);
    const geo = mergeGeos([stem, bloom]);
    const n = geo.attributes.position.count, arr = new Float32Array(n * 3);
    const stemN = stem.toNonIndexed().attributes.position.count;
    const cs = new THREE.Color(0x7fbf6a), cb = new THREE.Color(col);
    for (let i = 0; i < n; i++) { const c = i < stemN ? cs : cb; arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return geo;
  });
}

export function makeFlower(x, z, col) {
  const g = new THREE.Mesh(flowerGeo(col),
    shared('flower.mat', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true })));
  g.position.set(x, 0, z);
  g.userData.swayPhase = Math.random() * Math.PI * 2; swayables.push(g); // 바람에 흔들림
  scene.add(g);
}
