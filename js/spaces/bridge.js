// =============================================================
//  🌉 무너진 다리 — 박물관 섬을 두른 개울 + 다리 (해금 4단계)
//  ------------------------------------------------------------
//  판정(순수): js/world/bridge.js · 스펙: docs/superpowers/specs/2026-10-16-world-unlocks-design.md §2 ④
//  ▶ 📖 1장 「세계수를 지키는 법」: 집 완성 → 🦉 "서쪽 박물관의 할아버지라면 방법을 알 거야" → 무너진 다리 → 수리
//    → 🏛️ 박물관 + 🧑‍🦳 큐레이터 할아버지 귀환(game.js syncUnlocks 의 귀환 연출 그대로).
//  ▶ 빌더는 로드 **전에** 돈다 → 무너짐/고침은 syncBridge() 가 다시 맞춘다(applyUnlocks·applySave 에서 부른다).
//    해금 꺼짐·옛 세이브면 늘 고쳐진 다리(기존 유저의 박물관 길을 막지 않는다).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
// =============================================================
import {
  RES_LABEL, clayMat, doPlayerAction, gameState, isOpen, mergeGeos, obstacles, refreshInventoryUI, requestSave,
  roundRect, scene, spawnConfetti, spawnSparkle, syncUnlocks, ui, unlocksOn, woodMat,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다
import { trackEvent } from '../analytics.js';
import { t } from '../i18n.js';
import { Sound } from '../sound.js';
import {
  BANK_W, BRIDGE_ANG, BRIDGE_COST, ISLE, STREAM_HALF, bridgeBroken, bridgeFoot, bridgeLack, bridgePoint, streamR, streamStop,
} from '../world/bridge.js';
import * as THREE from 'three';

let bridgeGroup = null, brokenGroup = null, fixedGroup = null, signGroup = null;
let shownBroken = null;   // 지금 화면에 보이는 상태(같으면 아무것도 안 바꾼다)

/** 지금 다리가 무너져 있는가(해금 켜짐 + 새 세이브 + 아직 안 고침) */
export function bridgeBrokenNow() { return bridgeBroken(gameState, unlocksOn()); }

// 굽이치는 띠(개울·물가) — 각도마다 streamR 로 안·밖 꼭짓점을 찍는다. 섬 중심 기준 로컬 좌표
function bandGeo(r0, r1, y, seg = 96) {
  const pos = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2, R = streamR(a), c = Math.cos(a), s = Math.sin(a);
    pos.push(c * (R + r0), y, s * (R + r0), c * (R + r1), y, s * (R + r1));
    if (i < seg) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// 다리 축 좌표(along = 섬 중심에서 바깥, side = 옆) → 섬 로컬 x,z
function axis(along, side) {
  const bx = Math.cos(BRIDGE_ANG), bz = Math.sin(BRIDGE_ANG);
  return [bx * along - bz * side, bz * along + bx * side];
}
// 다리 방향으로 누운 판자(길이축 = 옆 방향) 하나
function plank(geos, along, side, y, len, { tilt = 0, roll = 0, yaw = 0 } = {}) {
  const g = new THREE.BoxGeometry(0.34, 0.09, len);   // x = 다리 길이 방향 폭, z = 다리 가로(판자 길이)
  if (roll) g.rotateX(roll);
  if (tilt) g.rotateZ(tilt);
  g.rotateY(-BRIDGE_ANG + yaw);
  const [x, z] = axis(along, side);
  geos.push(g.translate(x, y, z));
}
function post(geos, along, side, h, lean = 0) {
  const g = new THREE.CylinderGeometry(0.07, 0.08, h, 6).translate(0, h / 2, 0);
  if (lean) g.rotateZ(lean);
  g.rotateY(-BRIDGE_ANG);
  const [x, z] = axis(along, side);
  geos.push(g.translate(x, 0, z));
}
// 난간 — 다리 길이 방향 가로대
function rail(geos, a0, a1, side, y) {
  const len = a1 - a0, g = new THREE.BoxGeometry(len, 0.06, 0.06);
  g.rotateY(-BRIDGE_ANG);
  const [x, z] = axis((a0 + a1) / 2, side);
  geos.push(g.translate(x, y, z));
}

/** 🌉 개울·물가·다리(무너진/고친 두 벌)·표지판을 짓는다 — buildWorld 에서 한 번 */
export function buildBridge() {
  if (bridgeGroup) return;
  const g = new THREE.Group(); g.position.set(ISLE.x, 0, ISLE.z); g.name = 'bridge';
  // 물가 모래 띠 → 물 → 가운데 진한 물줄기(얕은 개울 느낌)
  const bank = new THREE.Mesh(bandGeo(-STREAM_HALF - BANK_W, STREAM_HALF + BANK_W, 0.035), clayMat(0xd9c99a, false));
  bank.receiveShadow = true; g.add(bank);
  const water = new THREE.Mesh(bandGeo(-STREAM_HALF, STREAM_HALF, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x8fd0ea, roughness: 0.25, metalness: 0.15, transparent: true, opacity: 0.92 }));
  water.receiveShadow = true; g.add(water);
  const deep = new THREE.Mesh(bandGeo(-STREAM_HALF * 0.45, STREAM_HALF * 0.45, 0.065), clayMat(0x6fb8d8, false));
  g.add(deep);
  // 물가 돌 — 한 메시로 합친다(다리 앞뒤는 비운다)
  const rocks = [];
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + 0.13;
    if (Math.abs(Math.atan2(Math.sin(a - BRIDGE_ANG), Math.cos(a - BRIDGE_ANG))) < 0.32) continue;
    const side = i % 2 ? 1 : -1, rr = streamR(a) + side * (STREAM_HALF + 0.05 + (i % 3) * 0.08);
    rocks.push(new THREE.IcosahedronGeometry(0.16 + (i % 4) * 0.05, 0).translate(Math.cos(a) * rr, 0.1, Math.sin(a) * rr));
  }
  const rockMesh = new THREE.Mesh(mergeGeos(rocks), clayMat(0xb9c0c4)); rockMesh.castShadow = true; g.add(rockMesh);
  // 수련잎 몇 장
  const pads = [];
  for (const a of [1.3, 2.6, 3.7, 4.6, 5.6]) {
    const rr = streamR(a) + 0.15 * Math.sin(a * 7);
    pads.push(new THREE.CircleGeometry(0.22, 7).rotateX(-Math.PI / 2).translate(Math.cos(a) * rr, 0.08, Math.sin(a) * rr));
  }
  g.add(new THREE.Mesh(mergeGeos(pads), clayMat(0x7fc98a, false)));

  // 다리 — along: 섬 쪽 끝 ~ 마을 쪽 끝. 개울 폭(±STREAM_HALF)보다 양쪽으로 0.75씩 길다
  const Rb = streamR(BRIDGE_ANG), a0 = Rb - STREAM_HALF - 0.75, a1 = Rb + STREAM_HALF + 0.75;
  const W = 1.3, Y = 0.24;
  // ✅ 고친 다리 — 판자 + 들보 + 기둥 4 + 난간 2
  const fixed = [], fixedDark = [];
  for (let s = a0 + 0.17; s < a1; s += 0.36) plank(fixed, s, 0, Y, W);
  for (const sd of [-0.45, 0.45]) {   // 들보(판자 밑 세로대)
    const b = new THREE.BoxGeometry(a1 - a0, 0.1, 0.12); b.rotateY(-BRIDGE_ANG);
    const [x, z] = axis((a0 + a1) / 2, sd); fixedDark.push(b.translate(x, Y - 0.09, z));
  }
  for (const al of [a0 + 0.1, a1 - 0.1]) for (const sd of [-0.62, 0.62]) post(fixedDark, al, sd, 0.85);
  for (const sd of [-0.62, 0.62]) rail(fixedDark, a0 + 0.1, a1 - 0.1, sd, 0.78);
  fixedGroup = new THREE.Group();
  const fm = new THREE.Mesh(mergeGeos(fixed), woodMat(1, 1, 0xe0b27a)); fm.castShadow = true; fm.receiveShadow = true;
  const fd = new THREE.Mesh(mergeGeos(fixedDark), woodMat(1, 1, 0xa9743f)); fd.castShadow = true;
  fixedGroup.add(fm, fd); g.add(fixedGroup);

  // 💥 무너진 다리 — 양쪽 끝에 판자 몇 장만 남고, 가운데는 개울에 빠진 판자·기울어진 기둥
  const broken = [], brokenDark = [];
  for (const s of [a0 + 0.17, a0 + 0.53]) plank(broken, s, 0.05, Y, W * 0.9, { yaw: 0.05 });       // 섬 쪽 남은 판자
  for (const s of [a1 - 0.17, a1 - 0.53]) plank(broken, s, -0.08, Y, W * 0.85, { yaw: -0.07 });    // 마을 쪽 남은 판자
  plank(broken, a1 - 0.92, 0.2, Y - 0.08, W * 0.55, { tilt: 0.35, yaw: 0.2 });                      // 반쯤 꺾여 매달린 판자
  plank(broken, Rb - 0.1, -0.35, 0.07, W * 0.6, { yaw: 0.9 });                                       // 개울에 떠내려가는 판자
  plank(broken, Rb + 0.25, 0.4, 0.07, W * 0.45, { yaw: -0.6 });
  post(brokenDark, a0 + 0.1, -0.62, 0.85); post(brokenDark, a0 + 0.1, 0.62, 0.55, 0.25);           // 하나는 부러졌다
  post(brokenDark, a1 - 0.1, -0.62, 0.85, -0.12); post(brokenDark, a1 - 0.1, 0.62, 0.4);
  rail(brokenDark, a1 - 0.7, a1 - 0.1, -0.62, 0.78);                                                  // 끊긴 난간
  brokenGroup = new THREE.Group();
  const bm = new THREE.Mesh(mergeGeos(broken), woodMat(1, 1, 0xc9a06a)); bm.castShadow = true;
  const bd = new THREE.Mesh(mergeGeos(brokenDark), woodMat(1, 1, 0x8a5a3a)); bd.castShadow = true;
  brokenGroup.add(bm, bd); g.add(brokenGroup);

  // 🪧 표지판(무너졌을 때만) — 닭장 터와 같은 문법: 이름 + 비용 배너
  signGroup = new THREE.Group();
  const foot = bridgeFoot(), [ox, oz] = axis(0, 1.25);
  signGroup.position.set(foot.x - ISLE.x + ox, 0, foot.z - ISLE.z + oz);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.3, 6), woodMat(1, 1));
  stick.position.y = 0.65; stick.castShadow = true; signGroup.add(stick);
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 192;
  const c = cv.getContext('2d');
  c.fillStyle = '#d9c3a0'; roundRect(c, 10, 10, 492, 172, 28); c.fill();
  c.fillStyle = '#4a3a2c'; c.textAlign = 'center';
  c.font = 'bold 46px sans-serif'; c.fillText(t('🌉 무너진 다리'), 256, 74);
  c.font = 'bold 34px sans-serif'; c.fillText(`🪵${BRIDGE_COST.wood} 🪨${BRIDGE_COST.stone}`, 256, 136);
  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(2.7, 1.0, 1); sp.position.y = 1.95; signGroup.add(sp);
  g.add(signGroup);

  scene.add(g);
  bridgeGroup = g;
  obstacles.push({ x: ISLE.x, z: ISLE.z, r: streamR(BRIDGE_ANG) + STREAM_HALF + BANK_W });   // 섬·개울엔 밭 금지
  syncBridge();
}

/** 무너짐/고침을 지금 상태에 맞춘다(가볍다 — 해금 동기화마다 불린다) */
export function syncBridge() {
  if (!bridgeGroup) return;
  const broken = bridgeBrokenNow();
  if (broken === shownBroken) return;
  shownBroken = broken;
  brokenGroup.visible = broken; signGroup.visible = broken; fixedGroup.visible = !broken;
}

/** 🚧 개울 충돌 — 마을에서 이동 후 매 프레임(game.js updatePlayer) */
export function clampToStream(p) {
  const s = streamStop(p.x, p.z, !!shownBroken);
  p.x = s.x; p.z = s.z;
}

/** 다리 머리(마을 쪽)에 섰는가 — 무너졌을 때만 프롬프트(doors.js) */
export function nearBrokenBridge(p) {
  if (!shownBroken) return false;
  const f = bridgeFoot();
  return Math.hypot(p.x - f.x, p.z - f.z) < 2.2;
}
export function bridgePrompt() {
  return isOpen('bridgeRepair') ? `🌉 다리 고치기 (🪵${BRIDGE_COST.wood} 🪨${BRIDGE_COST.stone})` : '🌉 무너진 다리 · 먼저 내 집을 완성해요';
}

/** 🔨 다리 수리 — 닭장 건설(coopInteract)과 같은 흐름: 조건 → 부족 토스트 → 차감 → 제스처 → 상태 → 저장 → 귀환 연출 */
export function bridgeInteract() {
  if (!bridgeBrokenNow()) return;
  if (!isOpen('bridgeRepair')) {
    ui.showHintModal?.({ ico: '🌉', title: '무너진 다리', body: '개울 건너 박물관으로 가는 다리가 무너졌어요.\n먼저 내 집을 완성해요. 그다음에 고칠 수 있어요.' });
    return;
  }
  const inv = gameState.inventory, lack = bridgeLack(inv);
  if (lack.length) {
    ui.toast?.(`🌉 재료 부족: ${lack.map(([k, v, h]) => `${RES_LABEL[k] || k} ${h}/${v}`).join(' · ')}`, 3000);
    return;
  }
  for (const k in BRIDGE_COST) inv[k] -= BRIDGE_COST[k];
  // 💰 경제 원장(logEcon)은 코인 전용이라 남기지 않는다 — 목재·돌만 쓴다(코인 0). 소비는 아래 GA4 로 본다
  refreshInventoryUI();
  const mid = bridgePoint(streamR(BRIDGE_ANG));
  doPlayerAction(mid.x, mid.z);   // 🔨 건축 제스처 — 다리 쪽을 보고
  gameState.unlocks.flags.bridge = true;
  syncBridge();
  Sound.complete?.(); spawnConfetti(mid.x, 1.6, mid.z); spawnSparkle(mid.x, 0.8, mid.z, 20);
  ui.toast?.('🌉 다리를 고쳤어요! 개울 건너 박물관으로 갈 수 있어요', 3200);
  trackEvent('bridge_repaired', { wood: BRIDGE_COST.wood, stone: BRIDGE_COST.stone, house_stage: gameState.houseStage || 0 });   // [GA4] 1장 퍼널
  requestSave();
  ui.act?.('bridge');
  syncUnlocks(false);   // 🔓 🏛️ 박물관 + 🧑‍🦳 큐레이터 귀환(귀환 모달) → 📖 1장 완료는 game.js 가 모달이 닫힌 뒤 이어 준다
  return true;
}

export { bridgeFoot };
export function bridgeMapPos() { return bridgePoint(streamR(BRIDGE_ANG)); }
