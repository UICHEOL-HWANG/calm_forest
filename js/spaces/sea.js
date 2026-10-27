// =============================================================
//  🌊 바다터 — 대형 낚시 (docs/design/SEA_FISHING_PLAN.md · 프로토타입 sims/sea-sim.html)
//  ------------------------------------------------------------
//  js/game.js 에서 원문 그대로 옮겨 온 구역(분리 2단계, 2026-09-26).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 에 남은 let 에 쓸 때는 `$w.x = …` (읽기는 그냥 x). 도구·증명: tools/refactor/
// =============================================================
import {
  $w, IS_MOBILE, WEATHER, _seaPrevTool, armWristK, atCafe, atFarm, atMine, atMist, atMuseum, atObservatory, atRiver, atSea,
  blockIfLocked, clayMat, clock, dateHash, diffParams, firstHint, gameState, giveReward, handAnchor, heldToolMesh,
  indoor, isNight, lastDoorPrompt, lastZoneHint, makeSignpost, measureStowLen, nearDoor, obstacles, player,
  playerAnchor, playerArms, poseHeldTool, questEvent, requestSave, rollDifficulty, scene, seaBuoy, seaFishes,
  seaGroup, seaLine, seaMG, seaRodMesh, setSpaceVisible, settleDifficulty, snapCamera, solidCircle, spawnConfetti,
  spawnFloatText, spawnSparkle, todayStr, toolMesh, triggerMoment, ui, updateStowPose,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))
import { trackEvent } from '../analytics.js';
import { HOMI_STALL, SEA, SEA_COVE, SEA_DECK_W, SEA_DECK_Z0, SEA_DECK_Z1, SEA_EDGE, SEA_GATE, SEA_SPECIES } from '../data/places.js';
import { bestAfterCatch } from '../museum.js';
import { pickSeaTarget } from '../sea-aim.js';
import { mudflat, updateMudflat, mudflatCamera, leaveMudflat } from './mudflat.js';
import { dive, updateDive, diveCamera, leaveDive } from './dive.js';
import {
  SEA_PAT, RING_GAIN, RING_GOOD, RING_LEAD, RING_PERFECT, rollPhaseLen, scheduleRings, judgeRing,
  CAST_REL, CAST_END, CAST_FLIGHT, castPose, pumpPose, PUMP_IDLE, buoyFlight, createRope, resetRope, stepRope, rodBendAxis,
} from '../sea-feel.js';
import { Sound } from '../sound.js';
import { sendSeaRecord } from '../supabase-client.js';
import { refreshPond } from '../pond/index.js';
import { addGateWalk } from './gate-cue.js';
import { makeWalk } from './gate-walk.js';
import { buildHomiStall } from '../forage/homi-stall-art.js';
import * as THREE from 'three';

export const SEA_LINE_N = 18;

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
  else if (coveWater && !indoor && !atFarm && !atMine && !atRiver && !atMist && !atCafe && !atMuseum && !atObservatory)
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
  //   수면은 0.18 — 물결 골(±amp×1.5≈0.13)이 모래판(0.03) 밑으로 꺼지면 모래가 노란 구멍처럼 뚫려 보였다
  coveWater.mesh.position.set(CX, 0.18, CZ); g.add(coveWater.mesh);
  // 물가 거품 — 마을 쪽 물가를 따라 하얀 방울
  const shoreAng = Math.atan2(-CZ, -CX);          // 후미 중심 → 게이트(마을) 방향
  for (let i = 0; i < 7; i++) {
    const a = shoreAng + (i - 3) * 0.34;
    const foam = new THREE.Mesh(new THREE.SphereGeometry(0.16 + (i % 3) * 0.05, 7, 5), clayMat(0xf6f2e4, false));
    foam.scale.y = 0.3;
    foam.position.set(CX + Math.cos(a) * (SEA_COVE.r - 0.5), 0.2, CZ + Math.sin(a) * (SEA_COVE.r - 0.5));
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
      const geo = new THREE.ConeGeometry(r, len, 12, 6, true);
      geo.translate(0, -len / 2, 0);              // 꼭짓점을 램프에 붙이고 바깥으로 퍼지게
      // 끝으로 갈수록 어둡게(가산 블렌딩이라 검정=투명) — 뚝 잘린 원뿔 입구가 노란 타원 구멍처럼 보였다
      const p = geo.attributes.position, fade = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) fade.fill((1 + p.getY(i) / len) ** 1.6, i * 3, i * 3 + 3);
      geo.setAttribute('color', new THREE.BufferAttribute(fade, 3));
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffe9a8, transparent: true, opacity: op, depthWrite: false, vertexColors: true,
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
    b.scale.y = 1.25; b.position.set(bx, 0.28, bz); g.add(b);
  });
  g.add(makeSignpost('🌊 바다터', -1.6, 1.2));
  const stall = buildHomiStall(THREE, clayMat);
  stall.position.set(HOMI_STALL.x - SEA_GATE.x, 0, HOMI_STALL.z - SEA_GATE.z); stall.rotation.y = HOMI_STALL.ry; g.add(stall);
  solidCircle(HOMI_STALL.x, HOMI_STALL.z, HOMI_STALL.r);
  obstacles.push({ x: HOMI_STALL.x, z: HOMI_STALL.z, r: 2 });    // 다른 게이트와 같은 문법의 표지판
  obstacles.push({ x: SEA_GATE.x, z: SEA_GATE.z, r: 2.2 });                     // 밭 금지(게이트 앞)
  obstacles.push({ x: SEA_COVE.x, z: SEA_COVE.z, r: SEA_COVE.r + 1 });          // 밭 금지(후미)
  const water = solidCircle(SEA_COVE.x, SEA_COVE.z, SEA_COVE.r - 0.35);         // 🚧 물엔 못 들어감(돌다리 위만 예외)
  addGateWalk(g, 'sea', { water, color: 0x8fe8ff, ringR: 0.85,
    walk: makeWalk({ ax: SEA_GATE.x + 0.2, az: SEA_GATE.z - 0.1, bx: SEA_GATE.x + 3.4, bz: SEA_GATE.z - 3.9, hw: 0.5, y: 0.36 }) });
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
  // 부표 + 낚싯줄(SEA_LINE_N 점 로프 — seaUpdateLine)
  $w.seaBuoy = new THREE.Group();
  const bb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 9, 7), clayMat(0xef8a4a)); bb.scale.y = 1.25; seaBuoy.add(bb);
  const bs = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.08, 9), clayMat(0xf4efe6)); seaBuoy.add(bs);
  seaBuoy.visible = false; g.add(seaBuoy);
  const lineGeo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: SEA_LINE_N }, () => new THREE.Vector3()));
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
  firstHint('sea', '🌊', '바다터 · 큰 물고기',
    { steps: [{ ico: '🎣', label: '던지기' }, { ico: '🟢', label: '링 겹칠 때 {A}' }, { ico: '🔴', label: '❗엔 기다리기' }], note: '부두 끝까지 끌려가면 놓쳐요', chip: '⚔️ 참치는 하루 1번' });
  trackEvent('sea_enter', { night: isNight(), weather: WEATHER });   // [GA4] 유입
}

export function exitSea() {
  leaveMudflat();
  leaveDive();
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
  Object.assign(seaMG, { st: 'idle', t: 0, ft: 0, phase: 'run', phaseLen: 0, nextLen: 0, tele: false, progress: 0, sp: null,
    fishDir: 1, released: false, good: 0, bad: 0, perfect: 0, combo: 0, doneT: 0, rings: [], lift: 0, jump: null, hookQ: '',
    biteAt: 0, nibbles: [], dip: 0, milestone: 0, shiver: 0, shake: 0, roll: 0 });
  if (seaMG.fmesh) { seaGroup?.remove(seaMG.fmesh); seaMG.fmesh = null; }
  if (seaBuoy) { seaBuoy.visible = false; seaBuoy.rotation.set(0, 0, 0); }
  if (seaLine) seaLine.visible = false;
  ui.setSeaHud?.(null);
  ui.setSeaRings?.([]);
}

export const _seaCastFrom = new THREE.Vector3(), _seaCastTo = new THREE.Vector3(), _seaTip = new THREE.Vector3();

export const _seaQ1 = new THREE.Quaternion(), _seaQ2 = new THREE.Quaternion(), _seaEuler = new THREE.Euler();

export const _seaV = new THREE.Vector3(), _seaUp = new THREE.Vector3(0, 1, 0);

const _seaB = new THREE.Vector3(), _seaBX = new THREE.Vector3(), _seaBZ = new THREE.Vector3(), _seaBM = new THREE.Matrix4();
const SEA_LINE_SLACK = new THREE.Color(0xf6f2e4), SEA_LINE_TIGHT = new THREE.Color(0xff3b2a);
const _seaPier = { halfW: SEA_DECK_W / 2, z0: SEA_DECK_Z0 - 0.04, z1: SEA_DECK_Z1 - 0.7, top: 0.07, water: 0.06, posts: [] };
for (let z = SEA_DECK_Z0 - 0.6; z > SEA_DECK_Z1; z -= 2.6) [-1, 1].forEach(sx => _seaPier.posts.push({ x: sx * (SEA_DECK_W / 2 - 0.1), z, r: 0.16, top: 0.75 }));
_seaPier.posts.push({ x: SEA_DECK_W / 2 - 0.15, z: SEA_DECK_Z1, r: 0.07, top: 1.6 });
const _seaRope = createRope(SEA_LINE_N, { x: 0, y: 0, z: 0 });
let _seaRingsShown = false;

const seaPat = () => SEA_PAT[seaMG.sp?.id] || SEA_PAT.buri;
const seaPop = (ico, x, z, scale = 1.1) => spawnFloatText(SEA.x + x, 1.4, SEA.z + z, ico, '#ffffff', scale);
const seaBuzz = ms => { if (!navigator.userActivation?.hasBeenActive) return; try { navigator.vibrate?.(ms); } catch (e) { return; } };

export function seaAction() {
  if (seaMG.st === 'idle') return seaCast();
  if (seaMG.st === 'wait') return seaTooEarly();
  if (seaMG.st === 'hook') return seaHookset(true);
  if (seaMG.st === 'fight') return seaReel();
}

function seaCast() {
  if (!seaFishes.length) { ui.toast?.('🐟 지금은 물고기가 안 보여요. 시간대가 바뀌면 다른 어종이 와요'); return; }
  const best = pickSeaTarget(
    seaFishes.map(f => ({ f, x: SEA.x + f.g.position.x, z: SEA.z + f.g.position.z })),
    player.position, player.rotation.y,
  )?.f;
  if (!best) return;
  seaMG.sp = best.sp; seaMG.st = 'cast'; seaMG.t = 0; seaMG.released = false;
  seaMG.diff = rollDifficulty('sea'); seaMG.ease = seaMG.diff.ease;
  seaMG.good = 0; seaMG.bad = 0; seaMG.perfect = 0; seaMG.progress = 0; seaMG.hookQ = ''; seaMG.t0 = clock.elapsedTime;
  seaHoldRod(true);
  _seaCastTo.set(Math.max(-8, Math.min(8, best.g.position.x * 0.7)), 0.06,
                 Math.min(best.g.position.z - 1, SEA_DECK_Z1 - 2.5));
  seaRodMesh.userData.sea.tipEnd.getWorldPosition(_seaTip); _seaTip.sub(SEA);
  resetRope(_seaRope, _seaTip);
  seaBuoy.position.copy(_seaTip); seaBuoy.visible = true; seaLine.visible = true;
  Sound.blip();
  trackEvent('sea_cast', { species: best.sp.id, night: isNight() });   // [GA4] 시도
}

function seaTooEarly() {
  ui.seaHint?.('너무 빨랐어요… 다시 기다려요', '#ffd0a0');
  seaPop('💨', seaBuoy.position.x, seaBuoy.position.z);
  Sound.starMiss?.();
  seaMG.biteAt = seaMG.t + seaRnd(1.2, 2); seaMG.nibbles = [seaMG.t + seaRnd(0.4, 0.8)];
}

function seaHookset(perfect) {
  seaMG.hookQ = perfect ? 'perfect' : 'late';
  seaStartFight();
  const f = seaMG.fmesh.position;
  if (perfect) {
    seaMG.progress = 0.12; seaMG.shake = 0.8;
    ui.seaHint?.('완벽해요!', '#b6ff9e'); seaPop('✨', f.x, f.z, 1.4);
    Sound.starPerfect?.(4); seaBuzz(45);
  } else {
    seaMG.pz -= 0.6; seaMG.shake = 0.4;
    ui.seaHint?.('늦었어요… 먼저 끌려가요', '#ffd0a0'); seaPop('💦', f.x, f.z);
  }
}

function seaStartFight() {
  const pat = seaPat();
  seaMG.st = 'fight'; seaMG.t = 0; seaMG.ft = 0;
  seaMG.pz = Math.max(player.position.z, SEA.z - 2);
  seaMG.fmesh = buildSeaFishMesh(seaMG.sp);
  seaMG.fmesh.position.set(_seaCastTo.x, -0.42, _seaCastTo.z);
  seaGroup.add(seaMG.fmesh);
  Object.assign(seaMG, { phase: 'run', phaseLen: rollPhaseLen(pat, 'run') * 0.7, nextLen: rollPhaseLen(pat, 'rest'),
    tele: false, rings: [], milestone: 0, lift: 0, combo: 0, jump: null });
  Sound.water(); spawnSparkle(SEA.x + _seaCastTo.x, 0.4, SEA.z + _seaCastTo.z, 18);
  $w.lastDoorPrompt = null;
}

function seaReel() {
  const sp = seaMG.sp, ease = seaMG.ease || 1, f = seaMG.fmesh.position;
  const hit = judgeRing(seaMG.rings, seaMG.ft);
  if (hit) {
    const perfect = hit.grade === 'perfect';
    seaMG.rings = seaMG.rings.map((r, i) => i === hit.index ? { ...r, done: true } : r);
    seaMG.good++; seaMG.combo++; if (perfect) seaMG.perfect++;
    seaMG.progress = Math.min(1, seaMG.progress + sp.tap * RING_GAIN[hit.grade] * ease);
    seaMG.pz += 0.38; seaMG.lift = 1; seaMG.shake = Math.max(seaMG.shake, 0.12);
    if (seaRodMesh) seaRodMesh.userData.sea.crank.rotation.x -= 1.2;
    if (perfect) { seaPop('✨', f.x, f.z); Sound.starPerfect?.(Math.min(seaMG.combo, 7)); }
    else Sound.starGood?.(Math.min(seaMG.combo, 7));
    seaBuzz(10);
    if (seaMG.progress >= 1) seaCatch();
    return;
  }
  seaMG.combo = 0;
  if (seaMG.phase === 'run') {
    seaMG.bad++; seaMG.pz -= 0.5 * sp.drag / ease; seaMG.shake = 0.45;
    ui.seaHint?.('줄이 풀려요!', '#ffb0a0'); seaPop('💢', f.x, f.z);
    Sound.starMiss?.(); seaBuzz(60);
  } else {
    seaMG.pz -= 0.08; Sound.starMiss?.();
  }
}

export function seaPrompt() {
  if (seaMG.st === 'idle') return '🎣 던지기';
  if (seaMG.st === 'wait') return '…찌를 보세요';
  if (seaMG.st === 'hook') return '지금!! 낚아채요';
  if (seaMG.st === 'fight') return seaMG.phase === 'rest' ? '🟢 당기세요!' : '🔴 버텨요…!';
  return null;
}

// 무게 — 참치는 날짜 시드(전원 동일 급) × 타이밍 정확도 보정(리더보드 실력 변별)
export function seaWeight(sp) {
  const base = sp.daily ? 60 + (dateHash('sea:tuna') % 46)
                        : sp.w[0] + Math.random() * (sp.w[1] - sp.w[0]);
  const acc = seaMG.good / Math.max(1, seaMG.good + seaMG.bad * 3);
  return Math.round(base * (0.92 + acc * 0.16) * (seaMG.hookQ === 'perfect' ? 1.06 : 1) * 10) / 10;
}

export function seaCatch() {
  const sp = seaMG.sp, w = seaWeight(sp);
  const dur = Math.round((clock.elapsedTime - seaMG.t0) * 10) / 10;
  seaMG.st = 'catch'; seaMG.t = 0; seaMG.doneT = 0; seaMG.jump = null;
  seaBuoy.visible = false; seaLine.visible = false;
  ui.setSeaRings?.([]); _seaRingsShown = false;
  giveReward({ ...sp.give }, 'sea_catch', sp.id);   // [원장] 어종별 보상 유입
  gameState.sea.caught = (gameState.sea.caught || 0) + 1;
  if (sp.daily) gameState.sea.tunaDay = todayStr();
  const _prevBest = gameState.sea.best?.[sp.id];
  gameState.sea.best = bestAfterCatch(gameState.sea.best, sp.id, w);   // 🌊 어종별 최고 무게
  refreshPond('sea');
  const newBest = _prevBest != null && gameState.sea.best[sp.id] !== _prevBest;   // 첫 어획은 '기록 경신' 이 아니다
  Sound.harvest(); spawnConfetti(player.position.x, 2.2, player.position.z - 1.5); seaBuzz(80);
  triggerMoment(true);                              // 🎉 캐치 세리머니(밀착 + 폴짝)
  spawnFloatText(player.position.x, 2.0, player.position.z - 1, `${sp.ico} ${sp.name} ${w}kg!`, '#2e6a9d', 1.25);
  ui.toast?.(`${sp.ico} ${sp.name} ${w}kg — 무게를 기록하고 바다로 돌려보냈어요! (+🐟${sp.give.fish} +🪙${sp.give.coins})`
    + (sp.daily ? ' 🏆 오늘의 대어 랭킹에 올라갔어요!' : '') + (newBest ? ' 🌊 나의 최대어 경신!' : ''), 4200);
  questEvent('seafish');                            // 🦉 의뢰(바다 물고기)
  settleDifficulty('sea', 1);   // 🎚️ 성공
  trackEvent('sea_catch', { species: sp.id, weight: w, duration: dur, good: seaMG.good, bad: seaMG.bad, perfect: seaMG.perfect, hook: seaMG.hookQ, ...diffParams(seaMG.diff) });
  sendSeaRecord({ species: sp.id, weight: w });   // [Supabase] 무게 기록 → 리더보드('sea'는 참치만 집계)
  requestSave();
}

export function seaMiss(reason = '놓쳤다…!') {
  seaMG.st = 'miss'; seaMG.t = 0; seaMG.doneT = 0; seaMG.jump = null;
  seaBuoy.visible = false; seaLine.visible = false;
  ui.setSeaRings?.([]); _seaRingsShown = false;
  const fx = seaMG.fmesh ? seaMG.fmesh.position.x : player.position.x - SEA.x, fz = seaMG.fmesh ? seaMG.fmesh.position.z : player.position.z - SEA.z - 3;
  Sound.water(); spawnSparkle(SEA.x + fx, 0.4, SEA.z + fz, 16); seaBuzz(120);
  seaPop('💦', fx, fz, 1.3);
  ui.seaHint?.(reason, '#ffb0a0');
  settleDifficulty('sea', 0);   // 🎚️ 실패
  trackEvent('sea_miss', { species: seaMG.sp?.id, progress: Math.round(seaMG.progress * 100), hook: seaMG.hookQ, ...diffParams(seaMG.diff) });   // [GA4] 난이도 튜닝 데이터
}

// 매 프레임 — 배회 AI + 상태 머신 + 연출(animate 에서 호출)
export let _seaHudT = 0;

export function updateSea(dt, t) {
  if (!atSea || !seaGroup) return;
  if (mudflat.active) return updateMudflat(dt, t);
  if (dive.active) return updateDive(dt, t);
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
  if (seaMG.st === 'cast') seaUpdateCast(dt);
  else if (seaMG.st === 'wait') seaUpdateWait(dt, t);
  else if (seaMG.st === 'hook') seaUpdateHook(dt);
  else if (seaMG.st === 'fight') seaUpdateFight(dt, t);
  else if (seaMG.st === 'catch') {
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
  if (seaMG.jump) seaUpdateJump(dt, t);
  const tens = seaTension(t);
  seaPose(dt, t, tens);
  seaUpdateLine(dt, t, tens);
  seaUpdateHud(dt, t);
}

function seaFaceTarget(x, z, dt, k) {
  const wy = Math.atan2(SEA.x + x - player.position.x, SEA.z + z - player.position.z) - 0.45;
  player.rotation.y += seaAngDiff(wy, player.rotation.y) * Math.min(1, dt * k);
}

function seaUpdateCast(dt) {
  seaFaceTarget(_seaCastTo.x, _seaCastTo.z, dt, 5);
  if (seaMG.t < CAST_REL) {
    seaRodMesh?.userData.sea.tipEnd.getWorldPosition(seaBuoy.position); seaBuoy.position.sub(SEA);
    return;
  }
  if (!seaMG.released) { seaMG.released = true; _seaCastFrom.copy(seaBuoy.position); Sound.starComet?.(); }
  const p = buoyFlight(_seaCastFrom, _seaCastTo, CAST_FLIGHT, seaMG.t - CAST_REL);
  seaBuoy.position.set(p.x, p.y, p.z);
  seaBuoy.rotation.set(Math.max(-1, Math.min(1, -p.vy * 0.12)), 0, Math.sin(seaMG.t * 18) * 0.25);
  if (seaMG.t >= CAST_REL + CAST_FLIGHT) seaStartWait();
}

function seaStartWait() {
  seaMG.st = 'wait'; seaMG.t = 0;
  seaBuoy.rotation.set(0, 0, 0); seaBuoy.position.copy(_seaCastTo);
  spawnSparkle(SEA.x + _seaCastTo.x, 0.3, SEA.z + _seaCastTo.z, 10); Sound.water();
  seaMG.biteAt = seaRnd(1.5, 2.8);
  seaMG.nibbles = [seaRnd(0.5, seaMG.biteAt - 0.55)];
  if (Math.random() < 0.6) seaMG.nibbles.push(seaRnd(0.5, seaMG.biteAt - 0.45));
  seaMG.nibbles.sort((a, b) => a - b);
  $w.lastDoorPrompt = null;
}

function seaUpdateWait(dt, t) {
  if (seaMG.nibbles.length && seaMG.t > seaMG.nibbles[0]) {
    seaMG.nibbles.shift(); seaMG.dip = 0.25;
    spawnSparkle(SEA.x + seaBuoy.position.x, 0.2, SEA.z + seaBuoy.position.z, 3);
  }
  seaMG.dip = Math.max(0, seaMG.dip - dt);
  seaBuoy.position.y = 0.06 + Math.sin(t * 2.5) * 0.05 - Math.sin(seaMG.dip / 0.25 * Math.PI) * 0.09
    - 0.16 * Math.exp(-5 * seaMG.t) * Math.cos(seaMG.t * 13);
  seaFaceTarget(seaBuoy.position.x, seaBuoy.position.z, dt, 5);
  if (seaMG.t > seaMG.biteAt) {
    seaMG.st = 'hook'; seaMG.t = 0;
    spawnSparkle(SEA.x + seaBuoy.position.x, 0.4, SEA.z + seaBuoy.position.z, 18); Sound.water(); seaBuzz(30); seaMG.shake = 0.25;
    $w.lastDoorPrompt = null;
  }
}

function seaUpdateHook(dt) {
  seaBuoy.position.y += (-0.28 - seaBuoy.position.y) * Math.min(1, dt * 18);
  if (Math.random() < dt * 10) spawnSparkle(SEA.x + seaBuoy.position.x, 0.2, SEA.z + seaBuoy.position.z, 2);
  if (seaMG.t > seaPat().hook) seaHookset(false);
}

function seaNextPhase(pat) {
  seaMG.phase = seaMG.phase === 'run' ? 'rest' : 'run';
  seaMG.t = 0; seaMG.phaseLen = seaMG.nextLen; seaMG.tele = false;
  seaMG.nextLen = rollPhaseLen(pat, seaMG.phase === 'run' ? 'rest' : 'run');
  if (seaMG.phase === 'run') { seaMG.fishDir = Math.random() < 0.5 ? -1 : 1; seaMG.combo = 0; }
  $w.lastDoorPrompt = null;
}

function seaTelegraph(pat) {
  const f = seaMG.fmesh.position;
  if (seaMG.phase === 'run') {
    if (Math.random() < pat.jump) seaStartJump();
    else { spawnSparkle(SEA.x + f.x, 0.3, SEA.z + f.z, 6); seaPop('🫧', f.x, f.z); }
    const restStart = seaMG.ft + Math.max(0, seaMG.phaseLen - seaMG.t);
    seaMG.rings = [...seaMG.rings, ...scheduleRings(restStart, seaMG.nextLen, pat.tempo)];
  } else {
    seaPop('❗', f.x, f.z, 1.4); spawnSparkle(SEA.x + f.x, 0.3, SEA.z + f.z - 1, 8); seaMG.shiver = 0.5;
  }
}

function seaStartJump() {
  const f = seaMG.fmesh.position;
  seaMG.jump = { k: 0, dur: 0.8, h: 1.3 + seaMG.sp.scale * 0.7 };
  spawnSparkle(SEA.x + f.x, 0.3, SEA.z + f.z, 14); Sound.water();
}

function seaUpdateJump(dt, t) {
  const f = seaMG.fmesh, j = seaMG.jump;
  if (!f) { seaMG.jump = null; return; }
  j.k += dt / j.dur;
  const k = Math.min(1, j.k);
  f.position.y = -0.55 + Math.sin(k * Math.PI) * j.h;
  f.rotation.set(-1.2 * (k - 0.5), Math.PI, Math.sin(t * 14) * 0.3);
  if (j.k >= 1) {
    seaMG.jump = null; f.rotation.x = 0;
    spawnSparkle(SEA.x + f.position.x, 0.3, SEA.z + f.position.z, 16); Sound.water(); seaBuzz(25); seaMG.shake = Math.max(seaMG.shake, 0.35);
  }
}

function seaUpdateFight(dt, t) {
  const sp = seaMG.sp, pat = seaPat(), f = seaMG.fmesh;
  seaMG.ft += dt;
  if (!seaMG.tele && seaMG.phaseLen - seaMG.t < pat.tele) { seaMG.tele = true; seaTelegraph(pat); }
  if (seaMG.t > seaMG.phaseLen) seaNextPhase(pat);
  if (seaMG.rings.some(r => !r.done && seaMG.ft > r.hit + RING_GOOD)) seaMG.combo = 0;
  seaMG.rings = seaMG.rings.filter(r => !r.done && seaMG.ft <= r.hit + RING_GOOD);
  if (seaMG.phase === 'run') {
    seaMG.pz -= dt * 0.82 * sp.drag * (1 - seaMG.progress * 0.35);   // 부두 끝으로 끌려간다
    f.position.x += seaMG.fishDir * dt * (2.2 + pat.side * 2.6);
    if (Math.abs(f.position.x) > 5 + pat.side * 1.5) seaMG.fishDir *= -1;
    if (!seaMG.jump) { f.rotation.y = Math.PI + Math.sin(t * 5) * 0.55; f.rotation.z = Math.sin(t * 12) * 0.28; }
    if (Math.random() < dt * 3) spawnSparkle(SEA.x + f.position.x, 0.25, SEA.z + f.position.z - 1, 2);
  } else {
    if (pat.steady) seaMG.pz -= dt * 0.18 * sp.drag;
    if (!seaMG.jump) {
      f.rotation.y += (Math.PI - f.rotation.y) * Math.min(1, dt * 3);
      f.rotation.z += (0.35 - f.rotation.z) * Math.min(1, dt * 3);
    }
    if (seaRodMesh) seaRodMesh.userData.sea.crank.rotation.x -= dt * 4;
  }
  if (seaMG.pz < SEA.z + SEA_EDGE) return seaMiss('놓쳤다…! 부두 끝까지 끌려갔어요');
  player.position.z += (seaMG.pz - player.position.z) * Math.min(1, dt * 9);
  player.position.x += (SEA.x - player.position.x) * Math.min(1, dt * 2);
  seaFaceTarget(f.position.x, f.position.z, dt, 6);
  const fishTZ = (player.position.z - SEA.z) - 6.5 + seaMG.progress * 3.3;
  f.position.z += (fishTZ - f.position.z) * Math.min(1, dt * 5);
  if (f.position.z > SEA_DECK_Z1 - 3.5) {
    const side = f.position.x >= 0 ? 1 : -1;
    const wantX = side * Math.max(Math.abs(f.position.x), SEA_DECK_W / 2 + 2.4);
    f.position.x += (wantX - f.position.x) * Math.min(1, dt * 4);
  }
  if (!seaMG.jump) f.position.y = -0.55 + seaMG.progress * 0.08;
  const bdx = (player.position.x - SEA.x) - f.position.x, bdz = (player.position.z - SEA.z) - f.position.z;
  const bd = Math.hypot(bdx, bdz) || 1;
  seaBuoy.position.set(f.position.x + bdx / bd * 1.6, 0.05, f.position.z + bdz / bd * 1.6);
  const ms = seaMG.progress >= 0.8 ? 2 : seaMG.progress >= 0.5 ? 1 : 0;
  if (ms > seaMG.milestone) {
    seaMG.milestone = ms;
    ui.seaHint?.(ms === 2 ? '거의 다 왔어요!' : '절반!', '#ffe27a');
    spawnSparkle(SEA.x + f.position.x, 0.4, SEA.z + f.position.z, 12);
  }
}

function seaTension(t) {
  if (seaMG.st === 'fight') return seaMG.phase === 'run' ? 0.6 + 0.25 * (Math.sin(t * 9) * 0.5 + 0.5) : 0.15;
  return seaMG.st === 'hook' ? 0.5 : 0;
}

function seaPose(dt, t, tens) {
  if (!playerArms || !seaRodMesh) return;
  const st = seaMG.st;
  seaMG.lift = Math.max(0, seaMG.lift - dt * 1.8);
  const p = st === 'cast' && seaMG.t < CAST_END ? castPose(seaMG.t, PUMP_IDLE)
          : st === 'fight' ? pumpPose(seaMG.phase, seaMG.lift, t, seaMG.fishDir)
          : { elev: st === 'hook' ? PUMP_IDLE - 0.15 : st === 'catch' ? 1 : st === 'miss' ? 0.3 : PUMP_IDLE, lean: 0, armUp: st === 'catch' ? 0.3 : 0 };
  seaMG.roll = (seaMG.roll || 0) + ((p.roll || 0) - (seaMG.roll || 0)) * Math.min(1, dt * 4);
  playerAnchor.rotation.x = p.lean; playerAnchor.rotation.y = p.twist || 0; playerAnchor.rotation.z = seaMG.roll;
  const sq = p.squash || 0;
  playerAnchor.scale.set(1 - sq * 0.5, 1 + sq, 1 - sq * 0.5);
  playerArms.R.pivot.rotation.set(-0.6 - p.armUp, 0.1, 0.08);
  playerArms.L.pivot.rotation.set(-0.55 - p.armUp, -0.45, 0.3);
  $w.armWristK = 0;
  poseHeldTool(0);
  const tgt = st === 'fight' && seaMG.fmesh ? seaMG.fmesh.position
            : st === 'cast' ? _seaCastTo : seaBuoy.visible ? seaBuoy.position : null;
  const yaw = tgt ? Math.atan2(SEA.x + tgt.x - player.position.x, SEA.z + tgt.z - player.position.z) : player.rotation.y;
  _seaV.set(Math.sin(yaw) * Math.cos(p.elev), Math.sin(p.elev), Math.cos(yaw) * Math.cos(p.elev));
  const bz = rodBendAxis(_seaV, { x: Math.sin(yaw), y: 0, z: Math.cos(yaw) });
  _seaBZ.set(bz.x, bz.y, bz.z); _seaBX.crossVectors(_seaV, _seaBZ);
  _seaQ2.setFromRotationMatrix(_seaBM.makeBasis(_seaBX, _seaV, _seaBZ));
  handAnchor.updateWorldMatrix(true, false);
  handAnchor.getWorldQuaternion(_seaQ1);
  seaRodMesh.quaternion.copy(_seaQ1.invert()).multiply(_seaQ2);
  seaRodMesh.userData.sea.tip.rotation.set(0.08 + tens * 0.55 + (p.tip || 0) + Math.sin(t * 40) * seaMG.shiver * 0.2, 0, 0);
  seaMG.shiver = Math.max(0, seaMG.shiver - dt * 1.2);
}

function seaUpdateLine(dt, t, tens) {
  if (!seaLine.visible || !seaRodMesh) return;
  seaRodMesh.userData.sea.tipEnd.getWorldPosition(_seaTip); _seaTip.sub(SEA);
  _seaB.set(seaBuoy.position.x, seaBuoy.position.y + 0.1, seaBuoy.position.z);
  const st = seaMG.st, slack = st === 'fight' ? 1 : st === 'cast' ? 1.04 : st === 'hook' ? 1.01 : 1.1;
  stepRope(_seaRope, _seaTip, _seaB, slack, Math.min(dt, 0.05), _seaPier);
  const pts = seaLine.geometry.attributes.position.array, vib = st === 'fight' ? tens * 0.03 : 0;
  for (let i = 0; i < SEA_LINE_N; i++) {
    const w = Math.sin(i / (SEA_LINE_N - 1) * Math.PI), n = _seaRope[i].p;
    pts[i * 3] = n.x + Math.sin(t * 60 + i) * vib * w; pts[i * 3 + 1] = n.y; pts[i * 3 + 2] = n.z;
  }
  seaLine.geometry.attributes.position.needsUpdate = true;
  seaLine.material.color.copy(SEA_LINE_SLACK).lerp(SEA_LINE_TIGHT, Math.min(1, tens));
}

function seaRingView() {
  return seaMG.rings.filter(r => !r.done && seaMG.ft > r.hit - RING_LEAD).slice(0, 3).map(r => {
    const k = (r.hit - seaMG.ft) / RING_LEAD;
    return { s: 1 + Math.max(-0.15, k) * 1.5, o: k < 0 ? Math.max(0, 1 + k * 5) : Math.min(1, (1 - k) * 2.5), near: Math.abs(seaMG.ft - r.hit) < RING_PERFECT };
  });
}

const _seaCamPos = new THREE.Vector3(), _seaCamLook = new THREE.Vector3();

export function seaCamera(camera, look, dt) {
  if (mudflat.active) return mudflatCamera(camera, look, dt);
  if (dive.active) return diveCamera(camera, look, dt);
  const st = seaMG.st, tall = camera.aspect < 1, low = !tall && innerHeight < 500, fov = tall ? 66 : 42, k = tall ? 1.3 : low ? 1.55 : 1, lat = tall ? 0.4 : 1;
  if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  const px = player.position.x, pz = player.position.z;
  let ax = px, oy = 6.2, oz = 7, ahead = 1.5, ay = 0.9;
  if (st === 'fight' && seaMG.fmesh) {
    const rest = seaMG.phase === 'rest';
    oy = rest ? 4 : 4.6; oz = rest ? 4.6 : 5.2; ahead = 5;
    ax = px + (SEA.x + seaMG.fmesh.position.x - px) * 0.3 * lat;
  } else if (st === 'catch' || st === 'miss') {
    oy = 3.2; oz = 3.8; ahead = 2; ay = 0.8;
  } else if (st === 'cast' || st === 'wait' || st === 'hook') {
    ax = px + (SEA.x + (st === 'cast' ? _seaCastTo.x : seaBuoy.position.x) - px) * 0.4 * lat; ahead = 5;
  }
  const f = 1 - Math.pow(0.005, dt);
  camera.position.lerp(_seaCamPos.set(ax, oy * k, pz + oz * k), f);
  if (seaMG.shake > 0) {
    camera.position.x += (Math.random() - 0.5) * seaMG.shake * 0.3;
    camera.position.y += (Math.random() - 0.5) * seaMG.shake * 0.2;
    seaMG.shake = Math.max(0, seaMG.shake - dt * 1.8);
  }
  look.lerp(_seaCamLook.set(ax, ay, pz - ahead), f);
  camera.lookAt(look);
}

function seaBtnState() {
  const st = seaMG.st;
  if (st === 'idle') return nearDoor === 'seaexit' ? ['🚪 나가기', 'door'] : ['🎣 던지기', ''];
  if (st === 'wait') return ['낚아채기', 'wait'];
  if (st === 'hook') return ['낚아채기!', 'hook'];
  if (st === 'fight') return seaMG.phase === 'rest' ? ['탭!', 'go'] : ['탭', 'stop'];
  return ['🎣', 'wait'];
}

function seaUpdateHud(dt) {
  ui.setSeaBtn?.(...seaBtnState(), seaMG.st !== 'idle');
  if (seaMG.st === 'fight') { ui.setSeaRings?.(seaRingView()); _seaRingsShown = true; }
  else if (_seaRingsShown) { ui.setSeaRings?.([]); _seaRingsShown = false; }
  _seaHudT += dt;
  if (_seaHudT <= 0.1) return;
  _seaHudT = 0;
  if (seaMG.st !== 'fight') { ui.setSeaHud?.(null); return; }
  const left = Math.max(0, player.position.z - (SEA.z + SEA_EDGE));
  ui.setSeaHud?.({
    banner: seaMG.phase === 'rest' ? '당기세요!' : '버텨요…!',
    cls: seaMG.phase === 'rest' ? 'pull' : '',
    p: seaMG.progress,
    sp: `${seaMG.sp.ico} ${seaMG.sp.name}`,
    edge: left.toFixed(1),
    danger: Math.min(1, Math.max(0, 1 - left / 2.6)),
  });
}
