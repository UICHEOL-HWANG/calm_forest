// =============================================================
//  🌊 바다터 — 대형 낚시 (docs/design/SEA_FISHING_PLAN.md · 프로토타입 sims/sea-sim.html)
//  ------------------------------------------------------------
//  js/game.js 에서 원문 그대로 옮겨 온 구역(분리 2단계, 2026-09-26).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 에 남은 let 에 쓸 때는 `$w.x = …` (읽기는 그냥 x). 도구·증명: tools/refactor/
// =============================================================
import {
  $w, IS_MOBILE, WEATHER, _seaPrevTool, armWristK, atCafe, atFarm, atMine, atMist, atMuseum, atRiver, atSea,
  blockIfLocked, clayMat, clock, dateHash, diffParams, firstHint, gameState, giveReward, handAnchor, heldToolMesh,
  indoor, isNight, lastDoorPrompt, lastZoneHint, makeSignpost, measureStowLen, nearDoor, obstacles, player,
  playerAnchor, playerArms, poseHeldTool, questEvent, requestSave, rollDifficulty, scene, seaBuoy, seaFishes,
  seaGroup, seaLine, seaMG, seaRodMesh, setSpaceVisible, settleDifficulty, snapCamera, solidCircle, spawnConfetti,
  spawnFloatText, spawnSparkle, todayStr, toolMesh, triggerMoment, ui, updateStowPose,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))
import { trackEvent } from '../analytics.js';
import { SEA, SEA_COVE, SEA_DECK_W, SEA_DECK_Z0, SEA_DECK_Z1, SEA_EDGE, SEA_GATE, SEA_SPECIES } from '../data/places.js';
import { bestAfterCatch } from '../museum.js';
import { pickSeaTarget } from '../sea-aim.js';
import { Sound } from '../sound.js';
import { sendSeaRecord } from '../supabase-client.js';
import * as THREE from 'three';

export const SEA_CAST_DUR = 0.62;

export const seaRnd = (a, b) => a + Math.random() * (b - a);

export const seaAngDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

//   dampFn(x,z)→0..1 : 물가·부두 근처에서 파도를 잠재워 지오메트리 뚫림 방지
export let coveWater = null, seaWater = null;

export let seaBeacon = null, seaLampMat = null, seaBeamMats = [];

export function makeWavyWater(radius, thetaSeg, rings, colCenter, colEdge, opacity, dampFn, gradR) {
  const geo = new THREE.RingGeometry(0.02, radius, thetaSeg, rings);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, n = pos.count;
  const cols = new Float32Array(n * 3), damp = new Float32Array(n);
  const cA = new THREE.Color(colCenter), cB = new THREE.Color(colEdge), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), z = pos.getZ(i), d = Math.hypot(x, z);
    c.lerpColors(cA, cB, Math.min(1, (d / (gradR ?? radius)) ** 1.4));
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    damp[i] = dampFn ? dampFn(x, z, d) : 1;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.18, metalness: 0.25,
    transparent: true, opacity, flatShading: false,
  }));
  mesh.receiveShadow = true;
  return { mesh, base: pos.array.slice(), damp, baseCols: cols.slice() };
}

export function updateWavyWater(w, t, amp, speed) {
  const arr = w.mesh.geometry.attributes.position.array, base = w.base, damp = w.damp;
  const cols = w.mesh.geometry.attributes.color.array, bc = w.baseCols;
  for (let i = 0; i < damp.length; i++) {
    const x = base[i * 3], z = base[i * 3 + 2];
    const y = amp * damp[i] * (
      Math.sin(x * 0.55 + t * speed) * 0.55 +
      Math.sin(z * 0.48 - t * speed * 0.8 + 1.7) * 0.45 +
      Math.sin((x + z) * 0.30 + t * speed * 0.55) * 0.50);
    arr[i * 3 + 1] = y;
    const k = Math.max(0, y) / amp * 0.5;          // 파도 마루를 하얗게(참고 이미지의 반짝임)
    cols[i * 3]     = bc[i * 3]     + (1 - bc[i * 3])     * k;
    cols[i * 3 + 1] = bc[i * 3 + 1] + (1 - bc[i * 3 + 1]) * k;
    cols[i * 3 + 2] = bc[i * 3 + 2] + (1 - bc[i * 3 + 2]) * k;
  }
  w.mesh.geometry.attributes.position.needsUpdate = true;
  w.mesh.geometry.attributes.color.needsUpdate = true;
  w.mesh.geometry.computeVertexNormals();
}

// 매 프레임: 보이는 수면만 일렁임 + 등대 야간 빔 회전(마을 후미)
export function updateSeaVisuals(t) {
  if (atSea) { if (seaWater) updateWavyWater(seaWater, t, 0.13, 1.4); }
  else if (coveWater && !indoor && !atFarm && !atMine && !atRiver && !atMist && !atCafe && !atMuseum)
    updateWavyWater(coveWater, t, 0.085, 1.6);
  if (seaBeacon) {
    // 밤뿐 아니라 악천후(비·눈·안개) 낮에도 점등 — 흐린 날 등대가 물을 쓸어 비추는 이벤트
    const gloomy = WEATHER === 'rain' || WEATHER === 'snow' || WEATHER === 'fog';
    const on = isNight() || gloomy;
    seaBeacon.visible = on;
    if (on) {
      seaBeacon.rotation.y = t * 0.55;                               // 천천히 도는 서치라이트
      const k = isNight() ? 1 : 0.55;                                // 낮 악천후엔 은은하게
      for (const m of seaBeamMats) m.opacity = m.userData.base * k;
      if (seaLampMat) seaLampMat.emissiveIntensity = (isNight() ? 1.3 : 1.05) + Math.sin(t * 2.4) * 0.45;
    } else if (seaLampMat) seaLampMat.emissiveIntensity = 0.8;
  }
}

export function spawnSeaGate() {
  const g = new THREE.Group(); g.position.copy(SEA_GATE); scene.add(g);
  const CX = SEA_COVE.x - SEA_GATE.x, CZ = SEA_COVE.z - SEA_GATE.z;   // 후미 중심(로컬)
  // ── 후미(만) — 모래톱 → 바닷물 → 먼바다 톤. 게이트에 서면 바다가 보인다
  const sand = new THREE.Mesh(new THREE.CircleGeometry(SEA_COVE.r + 1.1, 48), clayMat(0xe8d9a8, false));
  sand.geometry.rotateX(-Math.PI / 2); sand.position.set(CX, 0.03, CZ); sand.receiveShadow = true; g.add(sand);
  coveWater = makeWavyWater(SEA_COVE.r, IS_MOBILE ? 36 : 48, IS_MOBILE ? 7 : 10,
    0x3b8fbe, 0x6fd0e2, 0.92,
    (x, z, d) => Math.min(1, Math.max(0, (SEA_COVE.r - d) / (SEA_COVE.r * 0.35))));  // 물가에선 잔잔하게
  coveWater.mesh.position.set(CX, 0.08, CZ); g.add(coveWater.mesh);
  // 물가 거품 — 마을 쪽 물가를 따라 하얀 방울
  const shoreAng = Math.atan2(-CZ, -CX);          // 후미 중심 → 게이트(마을) 방향
  for (let i = 0; i < 7; i++) {
    const a = shoreAng + (i - 3) * 0.34;
    const foam = new THREE.Mesh(new THREE.SphereGeometry(0.16 + (i % 3) * 0.05, 7, 5), clayMat(0xf6f2e4, false));
    foam.scale.y = 0.3;
    foam.position.set(CX + Math.cos(a) * (SEA_COVE.r - 0.5), 0.13, CZ + Math.sin(a) * (SEA_COVE.r - 0.5));
    g.add(foam);
  }
  // ── 등대 — 물속 바위섬 위(빨간 줄무늬 2단, 마을에서 잘 보이는 랜드마크)
  const LX = CX - 4.9, LZ = CZ + 4.6;
  const islet = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 0), clayMat(0x9aa4ab));
  islet.scale.y = 0.5; islet.position.set(LX, 0.16, LZ); islet.castShadow = true; g.add(islet);
  [[-0.9, 0.5, 0.4], [0.8, -0.6, 0.34]].forEach(([dx, dz, s]) => {
    const r2 = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), clayMat(0xb9c0c4));
    r2.position.set(LX + dx, 0.14, LZ + dz); g.add(r2);
  });
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.52, 2.3, 8), clayMat(0xf2ede2));
  tower.position.set(LX, 1.45, LZ); tower.castShadow = true; g.add(tower);
  [[1.05, 0.5], [1.85, 0.46]].forEach(([y, r]) => {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.02, 0.34, 8), clayMat(0xd94f4f));
    band.position.set(LX, y, LZ); g.add(band);
  });
  seaLampMat = new THREE.MeshStandardMaterial({ color: 0xffd77a, emissive: 0xffb347, emissiveIntensity: 0.8 });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), seaLampMat);
  lamp.position.set(LX, 2.56, LZ); g.add(lamp);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.45, 8), clayMat(0x5f6f7c));
  cap.position.set(LX, 2.82, LZ); g.add(cap);
  // 🔦 서치라이트 빔 — 밤·악천후(비/눈/안개)에 켜져 천천히 회전(updateSeaVisuals)
  //   실제 등대처럼 양방향 빔 + 겹원뿔(안쪽 좁고 밝게, 바깥 넓고 은은하게)로 부드러운 광선
  seaBeacon = new THREE.Group(); seaBeacon.position.set(LX, 2.56, LZ); seaBeacon.visible = false;
  seaBeamMats = [];
  [0, Math.PI].forEach(dir => {
    const arm = new THREE.Group(); arm.rotation.y = dir; seaBeacon.add(arm);
    [[0.85, 7.5, 0.13], [0.38, 6.2, 0.22]].forEach(([r, len, op]) => {
      const geo = new THREE.ConeGeometry(r, len, 12, 1, true);
      geo.translate(0, -len / 2, 0);              // 꼭짓점을 램프에 붙이고 바깥으로 퍼지게
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffe9a8, transparent: true, opacity: op, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
      mat.userData.base = op;                     // 밤/낮 밝기 보간 기준(updateSeaVisuals)
      seaBeamMats.push(mat);
      const b = new THREE.Mesh(geo, mat);
      b.rotation.z = Math.PI / 2 - 0.07;          // 수평보다 살짝 아래 — 수면을 쓸어 비추는 그림
      arm.add(b);
    });
  });
  g.add(seaBeacon);
  // ── 방파제 — 물가에서 등대 바위섬 쪽으로 뻗는 바위줄
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42 - t * 0.14 + (i % 2) * 0.06, 0), clayMat(0xb9c0c4));
    rock.position.set(0.8 + (LX - 1.6) * t, 0.16, -0.8 + (LZ + 0.8) * t);
    rock.castShadow = true; g.add(rock);
  }
  // 부표 — 물 위 주황 부표(바다터 부표와 같은 문법)
  [[CX - 1, CZ + 6.5], [CX + 4.5, CZ + 2]].forEach(([bx, bz]) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 9, 7), clayMat(0xef8a4a));
    b.scale.y = 1.25; b.position.set(bx, 0.2, bz); g.add(b);
  });
  g.add(makeSignpost('🌊 바다터', -1.6, 1.2));    // 다른 게이트와 같은 문법의 표지판
  obstacles.push({ x: SEA_GATE.x, z: SEA_GATE.z, r: 2.2 });                     // 밭 금지(게이트 앞)
  obstacles.push({ x: SEA_COVE.x, z: SEA_COVE.z, r: SEA_COVE.r + 1 });          // 밭 금지(후미)
  solidCircle(SEA_COVE.x, SEA_COVE.z, SEA_COVE.r - 0.35);                       // 🚧 물엔 못 들어감
}

export function buildSea() {
  const g = new THREE.Group(); g.position.copy(SEA);
  // 일렁이는 먼바다 — 부두·뭍 근처에선 파도를 잠재워 데크를 안 뚫게
  seaWater = makeWavyWater(90, IS_MOBILE ? 40 : 56, IS_MOBILE ? 9 : 13,
    0x54b6d2, 0x2c6ba6, 0.88, (x, z) => {
      const dx = Math.max(0, Math.abs(x) - (SEA_DECK_W / 2 + 1.2));
      const dz = Math.max(0, Math.max(SEA_DECK_Z1 - 1.2 - z, z - (SEA_DECK_Z0 + 1.2)));
      const deck = Math.min(1, Math.hypot(dx, dz) / 4);            // 부두 주변 잔잔
      const shore = Math.min(1, Math.max(0, (4.5 - z) / 4));       // 남쪽 모래톱 잔잔
      return Math.min(deck, shore);
    }, 45);                                                        // 색 그라데이션: 부두 근처 밝음 → 45 밖 깊은 색
  seaWater.mesh.position.y = 0.02; g.add(seaWater.mesh);
  const seabed = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), clayMat(0x2e7fa3, false));
  seabed.geometry.rotateX(-Math.PI / 2); seabed.position.y = -1.2; g.add(seabed);
  // 뭍(남쪽 입구) — 모래톱
  const shore = new THREE.Mesh(new THREE.BoxGeometry(70, 1.2, 12), clayMat(0xe8d9a8, false));
  shore.position.set(0, -0.32, SEA_DECK_Z0 + 6.5); shore.receiveShadow = true; g.add(shore);
  // 부두 널판 — 끝 2칸은 붉게(위험 표시). 플레이어 발높이(y=0)에 맞춰 얇게 깐다
  for (let z = SEA_DECK_Z0; z > SEA_DECK_Z1 - 0.4; z -= 0.82) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(SEA_DECK_W, 0.12, 0.72),
      clayMat(z < SEA_DECK_Z1 + 1.8 ? 0xc46a4a : 0xb98a5a));
    plank.position.set(0, -0.02, z - 0.4); plank.castShadow = plank.receiveShadow = true; g.add(plank);
  }
  for (let z = SEA_DECK_Z0 - 0.6; z > SEA_DECK_Z1; z -= 2.6) [-1, 1].forEach(sx => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 1.1, 7), clayMat(0x8a5a3a));
    post.position.set(sx * (SEA_DECK_W / 2 - 0.1), 0.2, z); post.castShadow = true; g.add(post);
  });
  // 부두 끝 깃발 — 놓침 라인의 시각 신호
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6), clayMat(0x8a5a3a));
  pole.position.set(SEA_DECK_W / 2 - 0.15, 0.8, SEA_DECK_Z1); g.add(pole);
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.32, 0.03), clayMat(0xd94f4f));
  flag.position.set(SEA_DECK_W / 2 - 0.5, 1.3, SEA_DECK_Z1); g.add(flag);
  // 부표 + 낚싯줄(10분할 — 팽팽/처짐 곡선)
  $w.seaBuoy = new THREE.Group();
  const bb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 9, 7), clayMat(0xef8a4a)); bb.scale.y = 1.25; seaBuoy.add(bb);
  const bs = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.08, 9), clayMat(0xf4efe6)); seaBuoy.add(bs);
  seaBuoy.visible = false; g.add(seaBuoy);
  const lineGeo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 10 }, () => new THREE.Vector3()));
  $w.seaLine = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xf6f2e4 }));
  seaLine.frustumCulled = false; seaLine.visible = false; g.add(seaLine);
  scene.add(g); $w.seaGroup = g; g.visible = false;
}

// 어종별 물고기 조형 — 참치형(방추형+초승달 꼬리) / 개복치형(넓적한 몸+뭉툭한 꼬리판)
export function buildSeaFishMesh(sp) {
  const g = new THREE.Group(); const navy = sp.color;
  if (sp.sunfish) {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.72, 12, 10), clayMat(navy, false));
    body.scale.set(0.5, 1.15, 1.05); g.add(body);
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 10), clayMat(0xc9d8e4, false));
    cheek.scale.set(0.44, 0.95, 0.95); cheek.position.set(0, -0.1, 0.18); g.add(cheek);
    [[1, 0.78], [-1, -0.78]].forEach(([s, y]) => {
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.75, 5), clayMat(navy, false));
      fin.scale.set(0.3, 1, 1); fin.rotation.x = s > 0 ? -0.25 : Math.PI + 0.25; fin.position.set(0, y, -0.15); g.add(fin);
    });
    const clavus = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.16, 10), clayMat(navy, false));
    clavus.rotation.z = Math.PI / 2; clavus.scale.set(1, 1, 0.5); clavus.position.z = -0.72; g.add(clavus);
    [-1, 1].forEach(s => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.09, 7, 6), clayMat(0x22303a, false));
      e.position.set(s * 0.28, 0.3, 0.6); g.add(e);
    });
  } else {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 9), clayMat(navy, false));
    body.scale.set(0.82, 0.95, 1.75); g.add(body);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 9), clayMat(0xc9d8e4, false));
    belly.scale.set(0.78, 0.74, 1.42); belly.position.set(0, -0.16, 0.1); g.add(belly);
    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.6, 8), clayMat(navy, false));
    snout.rotation.x = Math.PI / 2; snout.scale.set(1, 1, 0.82); snout.position.set(0, 0.04, 1.05); g.add(snout);
    // 꼬리자루 + 초승달 꼬리(굵은 갈래 2 + 가운데 쐐기 — 한 덩어리로 읽히게)
    const ped = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.2, 0.45), clayMat(navy, false));
    ped.position.set(0, 0, -1.08); g.add(ped);
    const wedge = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.34, 5), clayMat(navy, false));
    wedge.scale.set(0.5, 1, 1); wedge.rotation.x = -Math.PI / 2; wedge.position.set(0, 0, -1.38); g.add(wedge);
    [[-0.72, 0.26], [-2.42, -0.26]].forEach(([rx, y]) => {
      const lobe = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.9, 5), clayMat(navy, false));
      lobe.scale.set(0.5, 1, 1); lobe.rotation.x = rx; lobe.position.set(0, y, -1.45); g.add(lobe);
    });
    const d1 = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.62, 5), clayMat(navy, false));
    d1.scale.set(0.22, 1, 1); d1.rotation.x = -0.55; d1.position.set(0, 0.58, 0.12); g.add(d1);
    [-1, 1].forEach(s => {
      const pec = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.62, 5), clayMat(navy, false));
      pec.scale.set(0.25, 1, 1); pec.rotation.set(-1.9, 0, s * 0.55); pec.position.set(s * 0.38, 0.05, 0.25); g.add(pec);
    });
    [-1, 1].forEach(s => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 7, 6), clayMat(0x22303a, false));
      e.position.set(s * 0.3, 0.12, 0.78); g.add(e);
    });
  }
  g.scale.setScalar(sp.scale);
  return g;
}

// 오늘 출현 어종 — 시간대·오늘의 대어 여부로 결정(난이도 선택 UI 없음)
export function seaAvailable() {
  return SEA_SPECIES.filter(sp =>
    (!sp.daylight || !isNight()) && (!sp.night || isNight()) &&
    (!sp.daily || gameState.sea.tunaDay !== todayStr()));
}

export function populateSeaFishes() {
  seaFishes.forEach(f => seaGroup.remove(f.g)); $w.seaFishes = [];
  seaAvailable().forEach((sp, i) => {
    const g = buildSeaFishMesh(sp); seaGroup.add(g);
    const home = { x: (i - 1) * 6.5, z: SEA_DECK_Z1 - 6 - i * 2.5 };
    g.position.set(home.x, -0.42, home.z);
    seaFishes.push({ g, sp, home, ang: Math.random() * Math.PI * 2, des: 0, spd: 1.0 + i * 0.3, tTurn: 0 });
  });
}

export function enterSea() {
  if (blockIfLocked('sea')) return;    // 🧪 [베타 2차] 계단식 열기
  $w.atSea = true;
  // 출구 존(뭍 끝, 반경 1.9)과 안 겹치게 데크 안쪽으로 스폰 — 첫 프롬프트가 '던지기'가 되도록
  player.position.set(SEA.x, 0, SEA.z + SEA_DECK_Z0 - 2.9); player.rotation.y = Math.PI;
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null;
  seaReset(); populateSeaFishes();
  seaHoldRod(true);            // 🎣 바다터에선 릴대를 들고 다닌다(괭이 든 채 낚시터에 서 있지 않게)
  ui.setSeaMode?.(true);       // 농사 도구 팔레트 숨김 — 여기선 액션 버튼 하나로 논다
  snapCamera(); setSpaceVisible();
  Sound.blip();
  firstHint('sea', '🌊', '바다터',
    '🎣던지고 입질 오면 줄다리기\n🔴버둥칠 땐 참고 · 🟢당기세요!! 땐 연타\n부두 끝까지 끌려가면 놓쳐요. ⚔️참치는 하루 1번');
  trackEvent('sea_enter', { night: isNight(), weather: WEATHER });   // [GA4] 유입
}

export function exitSea() {
  seaReset();
  seaHoldRod(false);           // 릴대 반납 — 마을 도구로 복귀
  ui.setSeaMode?.(false);
  $w.atSea = false;
  player.position.set(SEA_GATE.x - 1.4, 0, SEA_GATE.z + 1.6);
  $w.nearDoor = null; ui.setDoorPrompt?.(null);
  snapCamera(); setSpaceVisible();
  Sound.blip();
  trackEvent('sea_exit');   // [GA4]
}

// 릴대 잡기/내리기 — 미니게임 동안만 손의 도구를 릴대로 교체(도구 시스템 비침습)
export function seaHoldRod(on) {
  if (!handAnchor) return;
  if (on) {
    if (seaRodMesh) return;
    $w._seaPrevTool = heldToolMesh;
    if (heldToolMesh) handAnchor.remove(heldToolMesh);
    $w.seaRodMesh = toolMesh('reel'); measureStowLen(seaRodMesh); updateStowPose();
    $w.heldToolMesh = seaRodMesh; handAnchor.add(seaRodMesh);
  } else {
    if (!seaRodMesh) return;
    handAnchor.remove(seaRodMesh); $w.seaRodMesh = null;
    $w.heldToolMesh = _seaPrevTool; $w._seaPrevTool = null;
    if (heldToolMesh) handAnchor.add(heldToolMesh);
    updateStowPose();   // 돌려받은 도구 길이 기준으로 수납 위치 복원
  }
}

export function seaReset() {
  Object.assign(seaMG, { st: 'idle', t: 0, phase: 'struggle', phaseLen: 0, progress: 0, sp: null, fishDir: 1, landed: false, good: 0, bad: 0, doneT: 0 });
  if (seaMG.fmesh) { seaGroup?.remove(seaMG.fmesh); seaMG.fmesh = null; }
  if (seaBuoy) seaBuoy.visible = false;
  if (seaLine) seaLine.visible = false;
  ui.setSeaHud?.(null);
  // 릴대는 여기서 내려놓지 않는다 — 바다터에 있는 동안엔 계속 들고 다님(enter/exit 에서 관리)
}

export const _seaCastFrom = new THREE.Vector3(), _seaCastTo = new THREE.Vector3(), _seaTip = new THREE.Vector3();

export const _seaQ1 = new THREE.Quaternion(), _seaQ2 = new THREE.Quaternion(), _seaEuler = new THREE.Euler();

export const _seaV = new THREE.Vector3(), _seaUp = new THREE.Vector3(0, 1, 0);

export function seaAction() {
  if (seaMG.st === 'idle') {
    if (!seaFishes.length) { ui.toast?.('🐟 지금은 물고기가 안 보여요. 시간대가 바뀌면 다른 어종이 와요'); return; }
    // 조준 — 바라보는 쪽의 물고기가 걸린다("뭘 노리느냐"가 난이도).
    //   ⚠️ 예전엔 '가장 가까운' 이었는데, 부두가 좁고 어종이 배열 순서대로 깔리는 탓에
    //      맨 끝 어종(⚔️참치)이 부두 한가운데서 조준 확률 0% 였다 — js/sea-aim.js 참고.
    const best = pickSeaTarget(
      seaFishes.map(f => ({ f, x: SEA.x + f.g.position.x, z: SEA.z + f.g.position.z })),
      player.position, player.rotation.y,
    )?.f;
    if (!best) return;
    seaMG.sp = best.sp; seaMG.st = 'cast'; seaMG.t = 0; seaMG.landed = false;
    seaMG.diff = rollDifficulty('sea'); seaMG.ease = seaMG.diff.ease;   // 🎚️ 연타 효율 ×ease · 끌림 ÷ease (아래 두 줄이 그대로 쓴다)
    seaMG.good = 0; seaMG.bad = 0; seaMG.progress = 0; seaMG.t0 = clock.elapsedTime;
    seaMG.phaseLen = SEA_CAST_DUR + seaRnd(1.1, 2.2);
    seaHoldRod(true);
    seaRodMesh.userData.sea.tipEnd.getWorldPosition(_seaCastFrom); _seaCastFrom.sub(SEA);
    _seaCastTo.set(Math.max(-8, Math.min(8, best.g.position.x * 0.7)), 0.06,
                   Math.min(best.g.position.z - 1, SEA_DECK_Z1 - 2.5));
    seaBuoy.visible = true; seaLine.visible = true;
    Sound.blip();
    trackEvent('sea_cast', { species: best.sp.id, night: isNight() });   // [GA4] 시도
  } else if (seaMG.st === 'fight') {
    const sp = seaMG.sp;
    if (seaMG.phase === 'window') {
      // 🟢 당길 기회 — 연타로 되감기
      seaMG.progress = Math.min(1, seaMG.progress + sp.tap * (seaMG.ease || 1));   // 🧪첫 3회: 연타 효율↑
      seaMG.good++; seaMG.pz += 0.13;
      if (seaRodMesh) seaRodMesh.userData.sea.crank.rotation.x -= 0.5;
      Sound.blip();
      if (seaMG.progress >= 1) seaCatch();
    } else {
      // 🔴 버둥칠 때 당기면 역효과 — 확 끌려간다
      seaMG.bad++; seaMG.pz -= 0.5 * sp.drag / (seaMG.ease || 1);                  // 🧪첫 3회: 끌림 완화
      Sound.water();
    }
  } else if (seaMG.st === 'cast' && seaMG.landed) {
    ui.toast?.('…조용히, 입질을 기다려요 🎣');
  }
}

export function seaPrompt() {
  if (seaMG.st === 'idle') return '🎣 던지기 — 물고기를 보고!';
  if (seaMG.st === 'cast') return seaMG.landed ? '…기다리는 중…' : null;
  if (seaMG.st === 'fight') return seaMG.phase === 'window' ? '🟢 당기세요!!' : '🔴 버텨요…!';
  return null;
}

// 무게 — 참치는 날짜 시드(전원 동일 급) × 타이밍 정확도 보정(리더보드 실력 변별)
export function seaWeight(sp) {
  const base = sp.daily ? 60 + (dateHash('sea:tuna') % 46)
                        : sp.w[0] + Math.random() * (sp.w[1] - sp.w[0]);
  const acc = seaMG.good / Math.max(1, seaMG.good + seaMG.bad * 3);
  return Math.round(base * (0.92 + acc * 0.16) * 10) / 10;
}

export function seaCatch() {
  const sp = seaMG.sp, w = seaWeight(sp);
  const dur = Math.round((clock.elapsedTime - seaMG.t0) * 10) / 10;
  seaMG.st = 'catch'; seaMG.t = 0; seaMG.doneT = 0;
  seaBuoy.visible = false; seaLine.visible = false;
  giveReward({ ...sp.give }, 'sea_catch', sp.id);   // [원장] 어종별 보상 유입
  gameState.sea.caught = (gameState.sea.caught || 0) + 1;
  if (sp.daily) gameState.sea.tunaDay = todayStr();
  const _prevBest = gameState.sea.best?.[sp.id];
  gameState.sea.best = bestAfterCatch(gameState.sea.best, sp.id, w);   // 🌊 어종별 최고 무게
  const newBest = _prevBest != null && gameState.sea.best[sp.id] !== _prevBest;   // 첫 어획은 '기록 경신' 이 아니다
  Sound.harvest(); spawnConfetti(player.position.x, 2.2, player.position.z - 1.5);
  triggerMoment(true);                              // 🎉 캐치 세리머니(밀착 + 폴짝) — 호수 낚시·수확과 같은 연출(세리머니 카메라는 바다 줌 분기보다 먼저 적용됨)
  spawnFloatText(player.position.x, 2.0, player.position.z - 1, `${sp.ico} ${sp.name} ${w}kg!`, '#2e6a9d', 1.25);
  ui.toast?.(`${sp.ico} ${sp.name} ${w}kg — 무게를 기록하고 바다로 돌려보냈어요! (+🐟${sp.give.fish} +🪙${sp.give.coins})`
    + (sp.daily ? ' 🏆 오늘의 대어 랭킹에 올라갔어요!' : '') + (newBest ? ' 🌊 나의 최대어 경신!' : ''), 4200);
  questEvent('seafish');                            // 🦉 의뢰(바다 물고기)
  settleDifficulty('sea', 1);   // 🎚️ 성공
  trackEvent('sea_catch', { species: sp.id, weight: w, duration: dur, good: seaMG.good, bad: seaMG.bad, ...diffParams(seaMG.diff) });   // [GA4] 코어 KPI · 🎚️ 난이도 동봉
  sendSeaRecord({ species: sp.id, weight: w });   // [Supabase] 무게 기록 → 리더보드('sea'는 참치만 집계)
  requestSave();
}

export function seaMiss() {
  seaMG.st = 'miss'; seaMG.t = 0; seaMG.doneT = 0;
  seaBuoy.visible = false; seaLine.visible = false;
  Sound.water(); spawnSparkle(seaMG.fmesh ? SEA.x + seaMG.fmesh.position.x : player.position.x, 0.4, player.position.z - 3, 16);
  spawnFloatText(player.position.x, 1.8, player.position.z - 1, '놓쳤다…!', '#c86a5a', 1.1);
  settleDifficulty('sea', 0);   // 🎚️ 실패
  trackEvent('sea_miss', { species: seaMG.sp?.id, progress: Math.round(seaMG.progress * 100), ...diffParams(seaMG.diff) });   // [GA4] 난이도 튜닝 데이터 — 이제 정말 난이도가 들어 있다
}

// 매 프레임 — 배회 AI + 상태 머신 + 연출(animate 에서 호출)
export let _seaHudT = 0;

export function updateSea(dt, t) {
  if (!atSea || !seaGroup) return;
  // 배회 물고기 — 방향을 천천히 트는 유영 + 분리 + 부두 회피 + 소란 회피
  seaFishes.forEach((p, pi) => {
    p.tTurn -= dt;
    const hx = p.home.x - p.g.position.x, hz = p.home.z - p.g.position.z;
    if (hx * hx + hz * hz > 64) { p.des = Math.atan2(hz, hx); p.tTurn = seaRnd(1.5, 3); }
    else if (p.tTurn <= 0) { p.des = p.ang + seaRnd(-1.3, 1.3); p.tTurn = seaRnd(2, 4.5); }
    p.ang += Math.max(-dt * 1.1, Math.min(dt * 1.1, seaAngDiff(p.des, p.ang)));
    p.g.position.x += Math.cos(p.ang) * p.spd * dt;
    p.g.position.z += Math.sin(p.ang) * p.spd * dt;
    p.g.position.y = -0.42 + Math.sin(t * 1.3 + pi * 2.1) * 0.07;
    p.g.rotation.y = Math.PI / 2 - p.ang;
    p.g.rotation.z = Math.sin(t * (4 + pi)) * 0.1;
    if (p.g.position.z > SEA_DECK_Z1 - 1 && Math.abs(p.g.position.x) < SEA_DECK_W / 2 + 2) {
      p.des = Math.atan2(-1, Math.sign(p.g.position.x || 1)); p.tTurn = seaRnd(1, 2);
    }
    if (seaMG.st === 'fight' && seaMG.fmesh) {
      const fx = p.g.position.x - seaMG.fmesh.position.x, fz = p.g.position.z - seaMG.fmesh.position.z;
      if (fx * fx + fz * fz < 42) { p.des = Math.atan2(fz, fx); p.tTurn = Math.max(p.tTurn, 1.3); }
    }
  });
  for (let i = 0; i < seaFishes.length; i++) for (let j = i + 1; j < seaFishes.length; j++) {
    const a = seaFishes[i].g.position, b = seaFishes[j].g.position;
    const dx = b.x - a.x, dz = b.z - a.z, d2 = dx * dx + dz * dz, MIN = 3.4;
    if (d2 < MIN * MIN && d2 > 1e-4) {
      const d = Math.sqrt(d2), k = (MIN - d) * Math.min(1, dt * 5) * 0.5, ux = dx / d, uz = dz / d;
      a.x -= ux * k; a.z -= uz * k; b.x += ux * k; b.z += uz * k;
      seaFishes[i].des = Math.atan2(-uz, -ux); seaFishes[j].des = Math.atan2(uz, ux);
    }
  }

  seaMG.t += dt;
  if (seaMG.st === 'cast') {
    if (seaMG.t < SEA_CAST_DUR) {
      const k = seaMG.t / SEA_CAST_DUR, e = k * (2 - k);
      seaBuoy.position.lerpVectors(_seaCastFrom, _seaCastTo, e);
      seaBuoy.position.y = _seaCastFrom.y * (1 - e) + 0.06 * e + Math.sin(k * Math.PI) * 1.6;
      seaBuoy.rotation.z = k * 6;
    } else {
      if (!seaMG.landed) {
        seaMG.landed = true; seaBuoy.rotation.z = 0; seaBuoy.position.copy(_seaCastTo);
        spawnSparkle(SEA.x + _seaCastTo.x, 0.3, SEA.z + _seaCastTo.z, 8);
        $w.lastDoorPrompt = null;   // 프롬프트를 '기다리는 중'으로 갱신
      }
      seaBuoy.position.y = 0.06 + Math.sin(t * 2.5) * 0.05;
      // 로드 쥔 어깨가 부표를 향하게 살짝 돌아서 — 줄이 몸을 안 가로지르고 어깨 밖에서 곧게 나간다(sea-sim 검수 구도)
      const wy = Math.atan2(SEA.x + seaBuoy.position.x - player.position.x, SEA.z + seaBuoy.position.z - player.position.z) - 0.45;
      player.rotation.y += seaAngDiff(wy, player.rotation.y) * Math.min(1, dt * 5);
      if (seaMG.t > seaMG.phaseLen) {
        // 입질! — 부표 자리에서 싸움 시작.
        //   ⚠️ 부두 끝에서 던졌으면 활주로가 0이라 첫 버둥침에 바로 놓친다 —
        //   자세를 잡으며 뒤로 물러나(pz 를 최소 중간 지점으로) 버틸 거리를 확보한다.
        seaMG.st = 'fight'; seaMG.t = 0; seaMG.phase = 'struggle'; seaMG.phaseLen = seaRnd(1.3, 2);
        seaMG.pz = Math.max(player.position.z, SEA.z - 2);
        seaMG.fmesh = buildSeaFishMesh(seaMG.sp);
        seaMG.fmesh.position.set(_seaCastTo.x, -0.42, _seaCastTo.z);
        seaGroup.add(seaMG.fmesh);
        Sound.water(); spawnSparkle(SEA.x + _seaCastTo.x, 0.4, SEA.z + _seaCastTo.z, 18);
        spawnFloatText(player.position.x, 2.0, player.position.z - 1.5, '입질!! 🐟', '#e8905a', 1.2);
      }
    }
  } else if (seaMG.st === 'fight') {
    const sp = seaMG.sp, f = seaMG.fmesh;   // 카메라 줌은 updateCamera 가 상태 보고 처리
    if (seaMG.t > seaMG.phaseLen) {
      seaMG.t = 0;
      if (seaMG.phase === 'struggle') { seaMG.phase = 'window'; seaMG.phaseLen = seaRnd(0.85, 1.15) * sp.win; }
      else { seaMG.phase = 'struggle'; seaMG.phaseLen = seaRnd(1.2, 2); seaMG.fishDir = Math.random() < 0.5 ? -1 : 1; }
      $w.lastDoorPrompt = null;   // 🔴/🟢 프롬프트 갱신
    }
    if (seaMG.phase === 'struggle') {
      seaMG.pz -= dt * 0.82 * sp.drag * (1 - seaMG.progress * 0.35);   // 부두 끝으로 끌려간다
      player.position.x += Math.sin(t * 7) * dt * 0.5;                 // 버티며 좌우로 뒤뚱거림
      f.position.x += seaMG.fishDir * dt * 2.2;
      if (Math.abs(f.position.x) > 5) seaMG.fishDir *= -1;
      f.rotation.y = Math.PI + Math.sin(t * 5) * 0.55;   // 머리는 먼바다(도망 방향)
      f.rotation.z = Math.sin(t * 12) * 0.28;
      if (Math.random() < dt * 3) spawnSparkle(SEA.x + f.position.x, 0.25, SEA.z + f.position.z - 1, 2);
      if (seaMG.pz < SEA.z + SEA_EDGE) return seaMiss();
    } else {
      f.rotation.y += (Math.PI - f.rotation.y) * Math.min(1, dt * 3);
      f.rotation.z += (0.35 - f.rotation.z) * Math.min(1, dt * 3);
    }
    // 플레이어 — 논리 z(pz)로 보간(연타 덜컥임 방지) + 물고기 쪽으로 몸 틀기(로드 어깨 바이어스)
    player.position.z += (seaMG.pz - player.position.z) * Math.min(1, dt * 9);
    player.position.x += (SEA.x - player.position.x) * Math.min(1, dt * 2);
    // 로드 쥔 어깨가 물고기를 향하게 살짝 더 돌아서 — 줄이 몸을 안 가로지른다(sea-sim 검수 구도)
    const wantYaw = Math.atan2(SEA.x + f.position.x - player.position.x, SEA.z + f.position.z - player.position.z) - 0.45;
    player.rotation.y += seaAngDiff(wantYaw, player.rotation.y) * Math.min(1, dt * 6);
    // 물고기 — 진행도만큼 다가오되, 부두 끝 사각지대에선 옆 물길로 비켜난다
    const fishTZ = (player.position.z - SEA.z) - 6.5 + seaMG.progress * 3.3;
    f.position.z += (fishTZ - f.position.z) * Math.min(1, dt * 5);
    if (f.position.z > SEA_DECK_Z1 - 3.5) {
      const side = f.position.x >= 0 ? 1 : -1;
      const wantX = side * Math.max(Math.abs(f.position.x), SEA_DECK_W / 2 + 2.4);
      f.position.x += (wantX - f.position.x) * Math.min(1, dt * 4);
    }
    f.position.y = -0.55 + seaMG.progress * 0.08;
    // 부표 — 물고기→플레이어 줄 방향 선상의 수면
    const bdx = (player.position.x - SEA.x) - f.position.x, bdz = (player.position.z - SEA.z) - f.position.z;
    const bd = Math.hypot(bdx, bdz) || 1;
    seaBuoy.position.set(f.position.x + bdx / bd * 1.6, 0.05, f.position.z + bdz / bd * 1.6);
  } else if (seaMG.st === 'catch') {
    const f = seaMG.fmesh;
    if (f) {
      seaMG.doneT = Math.min(1, seaMG.doneT + dt * 1.1);
      const k = seaMG.doneT;
      f.position.x *= 0.96;
      f.position.z += ((player.position.z - SEA.z) - 1.8 - f.position.z) * k * 0.12;
      f.position.y = Math.min(0.65, -0.3 + Math.sin(k * Math.PI) * 2.6 + k * 0.95);
      if (k < 1) f.rotation.z += dt * 8 * (1 - k);
      else f.rotation.set(0, Math.PI * 0.5, Math.sin(t * 6) * 0.12);
    }
    if (seaMG.t > 2.2) { seaReset(); populateSeaFishes(); $w.lastDoorPrompt = null; }
  } else if (seaMG.st === 'miss') {
    if (seaMG.fmesh) seaMG.fmesh.position.y -= dt * 1.2;   // 먼바다로 잠수
    if (seaMG.t > 1.6) { seaReset(); $w.lastDoorPrompt = null; }
  }

  // 캐릭터 연기 — sea-sim 검수 포즈. updatePlayer 가 매 프레임 팔을 리셋하므로 그 뒤에서 덮어쓴다.
  //   ⚠️ 낚싯줄보다 반드시 먼저 — 포즈 확정 후에 줄을 그려야 줄이 로드 끝에 붙는다.
  //   idle(부두 산책)·miss 에서도 대기 자세 유지 — 릴대를 몸에 가로지른 채 걷다가 찌만 날아가는 그림 방지
  if (playerArms && seaRodMesh) {
    const Rp = playerArms.R.pivot, Lp = playerArms.L.pivot;
    let rodUp = false;   // true 면 로드를 월드 기준으로 하늘을 향해 세운다(손목 각에 안 맡김)
    if (seaMG.st === 'cast' && seaMG.t < SEA_CAST_DUR) {
      // 🎣 던지는 스윙 — 양손으로 머리 위로 젖혔다가 앞으로 뿌린다
      const k = seaMG.t / SEA_CAST_DUR;
      playerAnchor.rotation.x = -0.12 + k * 0.22;
      Rp.rotation.set(-2.35 + k * 1.7, 0.1, 0.06);
      Lp.rotation.set(-2.25 + k * 1.65, -0.4, 0.28);   // 왼손도 그립을 잡고 함께 스윙
      $w.armWristK = 0;
    } else if (seaMG.st === 'fight') {
      // 버티기 — 몸을 뒤로 젖히고 로드를 높이 든 채 입질 리듬으로 당겼다 풀었다
      const tug = seaMG.phase === 'struggle' ? (Math.sin(t * 9) * 0.5 + 0.5) : 0.15;
      playerAnchor.rotation.x = 0.10 + 0.10 * tug;
      Rp.rotation.set(-0.8 - 0.28 * tug, 0.12, 0.06);   // 그립을 가슴께로 — 당길 때 함께 들썩
      Lp.rotation.set(-0.75 - 0.28 * tug, -0.45, 0.28); // 왼팔은 그립 쪽으로 뻗어 같이 당기는 그림
      $w.armWristK = 0; rodUp = true;
      if (seaMG.phase === 'window' && seaRodMesh) seaRodMesh.userData.sea.crank.rotation.x -= dt * 7;   // 크랭크 회전
    } else {
      // 입질 대기·포획 연출 — 허리께에 그립을 쥐고 로드를 물 쪽으로 비스듬히 든 대기 자세
      Rp.rotation.set(-0.55, 0.1, 0.1);
      Lp.rotation.set(-0.5, -0.45, 0.3);
      rodUp = true;
    }
    poseHeldTool(0);
    // 로드 세우기 — 손목 보간에 맡기면 로드가 옆으로 눕는다. 월드 기준으로
    //   "위로 세우고 바라보는 쪽(물고기/바다)으로 살짝 기울인" 자세를 강제한다.
    // 로드는 손(어깨 옆)에 그대로 — 몸 중앙에 두면 곰 같은 뚱뚱한 체형에선 몸속에 파묻힌다.
    //   기울기는 고정값이 아니라 "줄이 나가는 방향"으로: 로드 축과 낚싯줄이 한 방향으로
    //   이어져 카툰 낚시꾼처럼 물을 향해 비스듬히 든 그림이 된다.
    if (rodUp && seaRodMesh) {
      // 조준 대상: 싸움 중엔 물고기 → 찌가 떠 있으면 찌 → 아니면(부두 산책) 바라보는 방향
      const tgt = seaMG.st === 'fight' && seaMG.fmesh ? seaMG.fmesh.position
                : seaBuoy.visible ? seaBuoy.position : null;
      if (tgt) _seaV.set(SEA.x + tgt.x - player.position.x, 0, SEA.z + tgt.z - player.position.z);
      else _seaV.set(0, 0, 0);
      if (_seaV.lengthSq() < 0.01) _seaV.set(Math.sin(player.rotation.y), 0, Math.cos(player.rotation.y));
      _seaV.normalize(); _seaV.y = 1.15; _seaV.normalize();   // 팁이 ~49° 위-앞(물고기 쪽)으로
      _seaQ2.setFromUnitVectors(_seaUp, _seaV);
      handAnchor.getWorldQuaternion(_seaQ1);
      seaRodMesh.quaternion.copy(_seaQ1.invert()).multiply(_seaQ2);
    }
  }
  // 릴대 팁 휨 — 버둥칠수록 크게
  if (seaRodMesh) seaRodMesh.userData.sea.tip.rotation.z =
    0.34 + (seaMG.st === 'fight' && seaMG.phase === 'struggle' ? (Math.sin(t * 9) * 0.5 + 0.5) * 0.45 : 0);
  // 낚싯줄 — 로드 팁 → 부표. 팽팽할 땐 곧게, 기다릴 땐 처지게 (포즈 확정 후에 그린다)
  if (seaLine.visible && seaRodMesh) {
    seaRodMesh.userData.sea.tipEnd.getWorldPosition(_seaTip); _seaTip.sub(SEA);
    const pts = seaLine.geometry.attributes.position.array;
    const sag = seaMG.st === 'fight' ? 0.12 : (seaMG.st === 'cast' && seaMG.t < SEA_CAST_DUR ? 0.04 : 0.5);
    for (let i = 0; i < 10; i++) {
      const u = i / 9;
      pts[i * 3] = _seaTip.x + (seaBuoy.position.x - _seaTip.x) * u;
      pts[i * 3 + 1] = _seaTip.y + (seaBuoy.position.y + 0.1 - _seaTip.y) * u - Math.sin(u * Math.PI) * sag;
      pts[i * 3 + 2] = _seaTip.z + (seaBuoy.position.z - _seaTip.z) * u;
    }
    seaLine.geometry.attributes.position.needsUpdate = true;
  }

  // HUD — 게이지 + 부두 끝까지 남은 거리(0.1초 스로틀)
  _seaHudT += dt;
  if (_seaHudT > 0.1) {
    _seaHudT = 0;
    if (seaMG.st === 'fight') {
      ui.setSeaHud?.({
        banner: seaMG.phase === 'window' ? '당기세요!!' : '버텨요…!',
        cls: seaMG.phase === 'window' ? 'pull' : '',
        p: seaMG.progress,
        sp: `${seaMG.sp.ico} ${seaMG.sp.name}`,
        edge: Math.max(0, player.position.z - (SEA.z + SEA_EDGE)).toFixed(1),
      });
    } else ui.setSeaHud?.(null);
  }
}
