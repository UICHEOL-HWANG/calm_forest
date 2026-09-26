// =============================================================
//  집(건축) — 정해진 터, 단계별 건설
//  ------------------------------------------------------------
//  js/game.js 에서 원문 그대로 옮겨 온 구역(분리 2단계, 2026-09-26).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 에 남은 let 에 쓸 때는 `$w.x = …` (읽기는 그냥 x). 도구·증명: tools/refactor/
// =============================================================
import {
  $w, RES_ICON, RES_LABEL, applyHouseStyle, doPlayerAction, gameState, houseCollider, houseGhost, houseGroup,
  houseSign, houseSignCtx, houseSignTex, houseWindows, interiorFloors, obstacles, rebuildInteriorFinish,
  refreshCollectQuests, refreshInventoryUI, requestSave, roundRect, scene, solidCircle, spawnConfetti, spawnDust,
  spawnSparkle, syncBadges, syncStory, triggerMoment, tryUnlockDrop, ui, woodMat,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))
import { trackEvent } from '../analytics.js';
import { DOOR_COLORS, HOUSE_POS } from '../data/places.js';
import { EXPANSIONS, buildInfo } from '../house-cost.js';
import { HOUSE_ADDONS, addonState } from '../house/addons.js';
import { buildHouseModel, mountHouseAddons } from '../house/index.js';
import { t } from '../i18n.js';
import { logEcon } from '../metrics.js';
import { Sound } from '../sound.js';
import { expandWoodOf } from '../tool-tiers.js';
import * as THREE from 'three';

export function buildHouseGhost() {
  // 눈에 띄는 집 터: 민트 바닥 + 초록 링(테두리)
  $w.houseGhost = new THREE.Group();
  houseGhost.position.copy(HOUSE_POS);
  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(2.4, 32),
    new THREE.MeshStandardMaterial({ color: 0xbfe8c9, transparent: true, opacity: 0.5, roughness: 1 })
  );
  pad.geometry.rotateX(-Math.PI / 2); pad.position.y = 0.03; houseGhost.add(pad);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.35, 2.65, 40),
    new THREE.MeshBasicMaterial({ color: 0x5fc07c, transparent: true, opacity: 0.75, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; houseGhost.add(ring);
  scene.add(houseGhost);

  // 멀리서도 보이는 안내판(스프라이트)
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 384; $w.houseSignCtx = cv.getContext('2d');
  $w.houseSignTex = new THREE.CanvasTexture(cv);
  houseSignTex.minFilter = THREE.LinearFilter; houseSignTex.magFilter = THREE.LinearFilter; // 선명
  houseSignTex.generateMipmaps = false; houseSignTex.anisotropy = 8;
  const signMat = new THREE.SpriteMaterial({ map: houseSignTex, transparent: true, depthWrite: false });
  signMat.fog = false; // 안개 영향 제거 → 거리와 무관하게 또렷
  $w.houseSign = new THREE.Sprite(signMat);
  houseSign.scale.set(3.4, 1.28, 1); houseSign.position.set(HOUSE_POS.x, 3.3, HOUSE_POS.z);
  scene.add(houseSign);
  updateHouseSign();

  $w.houseGroup = new THREE.Group();
  houseGroup.position.copy(HOUSE_POS);
  // 🚪 정면(문·전면 창)을 카메라 쪽으로 — 카메라는 camOffset(0,14,16)(실내는 camOffsetIndoor) 고정이라 시선이 늘 −Z 다.
  //    집 모델은 문·아치·통유리·발코니를 전부 −Z 면에 두고 있어서, 돌리지 않으면
  //    제일 공들인 정면이 영원히 뒷면이 되고 플레이어에겐 창문 없는 뒷벽만 보인다.
  houseGroup.rotation.y = Math.PI;
  scene.add(houseGroup);
  obstacles.push({ x: HOUSE_POS.x, z: HOUSE_POS.z, r: 2.6 }); // 집 터엔 밭 금지
  $w.houseCollider = solidCircle(HOUSE_POS.x, HOUSE_POS.z, 2.2); // 🚧 집 벽 — 짓는 동안엔 꺼 두고 완성되면 켠다
  syncHouseCollider();
}

// 집 충돌 반경 — 단계별 실제 풋프린트(3×3 → 4.2 → 4.6 → 5.0)에 맞춰 커진다.
// 문 프롬프트 사거리는 이 값 +0.6 이라 어느 단계든 문 앞에 설 수 있다(PLAYER_R 0.42 감안).
export function houseSolidR() {
  const s = gameState.houseStage;
  return s >= 6 ? 2.7 : s >= 5 ? 2.55 : s >= 4 ? 2.4 : 2.2;
}

// 짓는 동안(터·기초·벽)은 터를 자유롭게 오가고, 완성(지붕, 3단계+)되면 실제 크기만큼 막는다
export function syncHouseCollider() {
  if (!houseCollider) return;
  houseCollider.off = gameState.houseStage < 3;
  houseCollider.r = houseSolidR();
}

// 집 터 안내판 텍스트 갱신(완성되면 숨김)
export function updateHouseSign() {
  if (!houseSignCtx) return;
  const c = houseSignCtx; c.clearRect(0, 0, 1024, 384);
  if (gameState.houseStage >= 3) { houseSign.visible = false; houseSignTex.needsUpdate = true; return; }
  houseSign.visible = true;
  // 블룸(후광)에 안 걸리게 살짝 낮춘 세이지 톤 + 진한 테두리·글자
  c.fillStyle = '#b8d2ba';   // 덜 밝은 세이지(블룸 임계값 아래)
  roundRect(c, 30, 26, 964, 248, 60); c.fill();
  c.beginPath(); c.moveTo(462, 274); c.lineTo(562, 274); c.lineTo(512, 356); c.closePath(); c.fill();
  c.lineWidth = 10; c.strokeStyle = '#6fae82'; roundRect(c, 30, 26, 964, 248, 60); c.stroke();
  c.textAlign = 'center'; c.textBaseline = 'middle';
  // 🪧 2줄 — ① 이번에 짓는 단계 ② 재료 전부. 재료가 3종(🪵🪨🪙)이라 한 줄엔 안 들어간다.
  //    폭 실측(2026-09-21, 실제 브라우저 canvas measureText — 헤드리스는 한글 폰트 대체로 2배가 나와 못 믿는다):
  //    92px 제목 '🏠 나무 바닥(데크)' 681 · '🏠 Wooden Deck' 684, 66px 재료줄 '🪵25 · 🪨15 · 🪙80' 517.
  //    간판 안쪽 안전선 880px — 한·영 모두 여유가 있다.
  const bi = buildInfo(gameState, RES_LABEL);
  c.fillStyle = '#204a2c'; c.font = 'bold 92px sans-serif';
  c.fillText(bi.next ? `🏠 ${t(bi.next.name)}` : t('🏠 여기에 집 짓기'), 512, 104);
  c.fillStyle = '#33503c'; c.font = 'bold 66px sans-serif';
  // 🔨 묵직한 망치를 사면 목재 숫자도 따라 바뀐다(buildInfo 가 이미 깎아서 준다)
  c.fillText(bi.items.map(i => `${RES_ICON[i.k] || ''}${i.need}`).join(' · '), 512, 212);
  houseSignTex.needsUpdate = true;
}

export let _woodTex = null;

export function woodTexture() {
  if (_woodTex) return _woodTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  c.fillStyle = '#d9a066'; c.fillRect(0, 0, 128, 128);
  c.strokeStyle = '#a9743f'; c.lineWidth = 3;                 // 판자 이음새(가로줄)
  for (let y = 20; y < 128; y += 30) { c.beginPath(); c.moveTo(0, y); c.lineTo(128, y); c.stroke(); }
  c.strokeStyle = 'rgba(150,95,55,0.28)'; c.lineWidth = 1.2;  // 나뭇결 물결
  for (let i = 0; i < 46; i++) {
    const y = Math.random() * 128; c.beginPath(); c.moveTo(0, y);
    for (let x = 0; x <= 128; x += 12) c.lineTo(x, y + Math.sin(x * 0.12 + i) * 1.8);
    c.stroke();
  }
  _woodTex = new THREE.CanvasTexture(cv);
  _woodTex.wrapS = _woodTex.wrapT = THREE.RepeatWrapping;
  return _woodTex;
}

// 아래→위로 톡 솟아오르는 등장 애니메이션 세팅
export function applyRise(part) {
  const target = part.position.y;
  part.userData.riseTarget = target;
  part.userData.riseFrom = target - 1.5;
  part.userData.rise = 1;
  part.position.y = part.userData.riseFrom;
}

// stage: 1=나무바닥 2=통나무벽 3=지붕(완성). silent=true 면 애니메이션 없이 복원.
export function buildHouseStage(stage, silent = false) {
  const parts = [];
  const add = (mesh) => { mesh.name = 'stage' + stage; mesh.castShadow = true; houseGroup.add(mesh); parts.push(mesh); };

  if (stage === 1) {
    // 나무 바닥(데크): 판자 슬래브 + 코너 다리
    const deck = new THREE.Mesh(new THREE.BoxGeometry(3, 0.24, 3), woodMat(3, 3));
    deck.position.y = 0.22; deck.receiveShadow = true; add(deck);
    [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]].forEach(([px, pz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.42, 0.22), woodMat(1, 1, 0xcaa06a));
      leg.position.set(px, 0.0, pz); add(leg);
    });
  } else if (stage === 2) {
    // 통나무 벽: 4면에 가로 통나무 3단씩
    const logMat = woodMat(2, 1, 0xd2a068);
    const levels = [0.62, 1.0, 1.38];
    const sides = [
      { x: 0, z: 1.45, ry: 0 }, { x: 0, z: -1.45, ry: 0 },
      { x: 1.45, z: 0, ry: Math.PI / 2 }, { x: -1.45, z: 0, ry: Math.PI / 2 },
    ];
    sides.forEach(s => levels.forEach(y => {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 2.9, 8), logMat);
      log.rotation.z = Math.PI / 2;    // 통나무 눕히기
      log.rotation.y = s.ry;
      log.position.set(s.x, y, s.z);
      log.userData.role = 'wall';      // 외관 커스텀: 벽
      add(log);
    }));
    // 외부 문(정면) — 외관 커스텀 대상
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 0.14), woodMat(1, 2, DOOR_COLORS[0]));
    door.position.set(0, 0.85, -1.55); door.userData.role = 'door'; add(door);
    // 창문(밤에 따뜻한 불빛) — emissive
    const winMat = new THREE.MeshStandardMaterial({ color: 0xfff2a8, emissive: 0xffcaa0, emissiveIntensity: 0, roughness: 0.7 });
    houseWindows.push(winMat);
    [[0, 1.0, 1.5, 0], [1.5, 1.0, 0, Math.PI / 2]].forEach(([wx, wy, wz, r]) => {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.66, 0.06), winMat);
      win.position.set(wx, wy, wz); win.rotation.y = r; add(win);
    });
  } else if (stage >= 3) {
    // 🏠 완성(3)·증축(4~6): 짓던 부품(데크·통나무)을 지우고 단계 모델로 통째로 교체 — js/house/
    unregisterWindows(houseGroup);
    [...houseGroup.children].forEach(c => houseGroup.remove(c));
    add(mountHouseModel(stage));
  }

  gameState.houseStage = Math.max(gameState.houseStage, stage);
  if (interiorFloors.ground) rebuildInteriorFinish();   // 🪜🎨 실내 마감(바닥·계단)을 새 단계로 다시 짓는다 — 실내에 있는 채로 증축했을 드문 경우까지 대비(스펙 §3 위반 A)
  syncHouseCollider();                        // 🚧 완성되면 충돌 on + 증축 크기 반영(짓는 동안엔 통행 자유)
  if (!silent) syncStory();                   // 📖 1장(보금자리) 진행
  if (stage >= 3) houseGhost.visible = false; // 완성되면 터 표시 제거
  updateHouseSign();                          // 안내판 갱신(완성 시 숨김)
  applyHouseStyle();                          // 저장된 외관 색 반영

  if (!silent) {
    parts.forEach(applyRise);                    // 아래→위로 톡 솟기
    spawnDust(HOUSE_POS.x, HOUSE_POS.z, 10);     // 약한 먼지
    Sound.build();
    if (stage === 3) {
      // [파티클] 집 완성 축하: 색종이 + 반짝이
      spawnConfetti(HOUSE_POS.x, 3.4, HOUSE_POS.z);
      spawnSparkle(HOUSE_POS.x, 3.0, HOUSE_POS.z, 34);
      Sound.complete();
      ui.toast?.('🎉 집 완성! 축하해요');
      refreshCollectQuests();                    // 퀘스트 진행(진행도는 houseStage 에서 읽는다)
      ui.act?.('build');                         // 튜토리얼: 집 완성
      triggerMoment();                           // 📷 순간 줌인
      tryUnlockDrop(1);                          // 🎨 집 완성 보상: 랜덤 색 1개 확정
      trackEvent('house_complete');              // [GA4] 집 완성 이벤트
      syncBadges();                              // 🏅 내 집 마련 배지
    } else if (stage >= 4) {
      // 🏗️ 증축 축하 — 토스트는 호출부(doExpand 결과)가 담당(중복 방지)
      spawnConfetti(HOUSE_POS.x, 4.2, HOUSE_POS.z);
      spawnSparkle(HOUSE_POS.x, 3.4, HOUSE_POS.z, 40);
      Sound.complete();
      triggerMoment();                           // 📷 순간 줌인
      tryUnlockDrop(1);                          // 🎨 증축 보상: 랜덤 색 1개 확정
      trackEvent('house_expand', { stage });     // [GA4] 증축 퍼널
      refreshCollectQuests();                    // 이미 받아 둔 증축 의뢰는 여기서 달성 처리
      syncBadges();                              // 🏅 궁전의 주인 배지
    }
  }
}

// 🏠 단계 모델(js/house/*.js)을 게임에 맞게 얹는다
//   · 모델 정면은 +z 인데 houseGroup 이 π 회전이라 래퍼를 다시 π 돌려 카메라 쪽(-z 시선)에 정면이 오게 한다
//   · role roof/wall/door 재질은 기본색을 기억(스와치 0번) · role window 재질은 밤 점등 목록에 등록
//   · 🧩 산 구성품은 래퍼 안에 'addons' 그룹으로 같이 얹어 회전을 물려받는다(refreshHouseAddons 가 이 그룹만 갈아 끼움)
export function mountHouseModel(stage) {
  const g = buildHouseModel(THREE, stage);
  g.rotation.y = Math.PI;
  const addons = mountHouseAddons(THREE, stage, gameState.house.addons);
  g.add(addons); prepHouseMeshes(g); registerAddonAnims(addons);
  return g;
}

// 그림자·기본색·밤 점등 등록(모델과 구성품 공통)
export function prepHouseMeshes(root) {
  const seen = new Set();
  root.traverse(o => {
    if (!o.isMesh) return;
    const m = o.material; const role = o.userData.role;
    o.castShadow = !m.transparent; o.receiveShadow = true;
    if (role === 'roof' || role === 'wall' || role === 'door') o.userData.baseColor = m.color.getHex();
    if (role === 'window' && !seen.has(m)) {
      seen.add(m);
      if (m.userData.nightScale == null) {   // 구성품(정원등·수영장 조명…)은 자기 emissive 색·세기를 갖고 온다 — 덮어쓰지 않는다
        m.emissive = new THREE.Color(0xffb878);
        m.userData.nightScale = 0.4;   // 새 모델은 유리 면적이 커서(펜트하우스·빌라 통유리) 기존 세기론 하얗게 타 버린다
      }
      m.emissiveIntensity = 0;
      houseWindows.push(m);
    }
  });
}

export let houseAddonAnims = [];

export const registerAddonAnims = (addons) => { houseAddonAnims = addons.children.map(c => c.userData.anim).filter(Boolean); };

// 🧩 구성품만 다시 얹는다(집 건축 연출 없이): 옛 'addons' 그룹 제거 + 그 점등 재질 등록 해제 → 새로 빌드
// 그룹 안 재질을 밤 점등 목록에서 뺀다 — 단계 재건축·구성품 재마운트 때 안 빼면 옛 재질이 남아 매 프레임 갱신 대상이 늘어난다(누수)
export function unregisterWindows(root) {
  const mats = new Set(); root.traverse(o => { if (o.isMesh) mats.add(o.material); });
  for (let i = houseWindows.length - 1; i >= 0; i--) if (mats.has(houseWindows[i])) houseWindows.splice(i, 1);
}

export function refreshHouseAddons() {
  const old = houseGroup?.getObjectByName('addons'); if (!old) return;
  unregisterWindows(old);
  const parent = old.parent; parent.remove(old);
  const fresh = mountHouseAddons(THREE, gameState.houseStage, gameState.house.addons);
  parent.add(fresh); prepHouseMeshes(fresh); registerAddonAnims(fresh);
}

// 🧩 구성품 상점 정보(외관 메뉴 렌더용) — 단계·코인·항목별 owned/locked/affordable
export function houseAddonInfo() {
  const stage = gameState.houseStage, coins = gameState.inventory.coins || 0;
  return { stage, coins, items: addonState(HOUSE_ADDONS, gameState.house.addons, stage, coins) };
}

// 🧩 구성품 구매 — 검증 → 코인 차감(원장) → 저장 목록 → 집에 바로 설치. 결과 msg 는 호출부가 토스트
export function buyHouseAddon(id) {
  const def = HOUSE_ADDONS.find(a => a.id === id); if (!def) return { ok: false };
  const st = houseAddonInfo().items.find(i => i.id === id);
  if (st.owned) return { ok: false, msg: '✓ 이미 설치된 구성품이에요' };
  if (st.locked) return { ok: false, msg: `🔒 ${def.stage}단계부터 살 수 있어요` };
  if (!st.affordable) return { ok: false, msg: `🪙 코인이 부족해요 — ${def.coins}🪙 필요` };
  gameState.inventory.coins -= def.coins;
  logEcon('house_addon', id, -def.coins, gameState.inventory.coins);   // [원장] 코인 소비
  gameState.house.addons = [...gameState.house.addons, id];
  refreshHouseAddons();
  refreshInventoryUI();
  spawnSparkle(HOUSE_POS.x, 2.4, HOUSE_POS.z, 18);
  Sound.harvest();
  trackEvent('house_addon_buy', { id, stage: gameState.houseStage, coins: def.coins });   // [GA4] 코인 싱크 퍼널
  requestSave();                                                          // 코인을 쓴 자리는 바로 저장(새로고침으로 잃지 않게)
  return { ok: true, msg: `🧩 ${def.name} 설치! (-${def.coins}🪙)` };
}

// 증축 정보(외관 메뉴 렌더용) — 다음 단계·비용·보유량
export function expandInfo() {
  if (gameState.houseStage < 3) return { maxed: false, next: null };
  const next = EXPANSIONS.find(e => e.stage === gameState.houseStage + 1) || null;
  if (!next) return { maxed: true, next: null };
  //   🔨 묵직한 망치는 목재만 줄인다(코인은 후반 싱크의 본체라 그대로).
  //   ⚠️ doExpand 가 이 items 를 그대로 소비한다 — 표시와 실제가 갈리지 않게 여기서 한 번만 계산한다.
  const items = Object.entries(next.cost).map(([k, v]) => {
    const need = k === 'wood' ? expandWoodOf(gameState, v) : v;
    return { k, need, have: gameState.inventory[k] || 0, label: RES_LABEL[k] || k };
  });
  return { maxed: false, next: { stage: next.stage, name: next.name, ico: next.ico }, items, affordable: items.every(i => i.have >= i.need) };
}

// 증축 실행 — 자원 검증 → 소비 → 재건축. 결과 msg 는 호출부가 토스트
export function doExpand() {
  if (gameState.houseStage < 3) return { ok: false, msg: '먼저 🔨망치로 집을 완성해요' };
  const info = expandInfo();
  if (info.maxed) return { ok: false, msg: '🏝️ 이미 루프탑 빌라까지 완성했어요!' };
  if (!info.affordable) {
    const lack = info.items.filter(i => i.have < i.need).map(i => `${i.label} ${i.have}/${i.need}`).join(' · ');
    return { ok: false, msg: `${info.next.ico} ${info.next.name} 증축 재료 부족 — ${lack}` };
  }
  const exp = EXPANSIONS.find(e => e.stage === info.next.stage);
  for (const it of info.items) gameState.inventory[it.k] -= it.need;   // expandInfo 가 계산한 그 값으로 소비
  const coinCost = info.items.find(i => i.k === 'coins')?.need || 0;
  if (coinCost) logEcon('house_expand', 'stage' + exp.stage, -coinCost, gameState.inventory.coins); // [원장] 코인 소비
  refreshInventoryUI();
  doPlayerAction(HOUSE_POS.x, HOUSE_POS.z);   // 건축 제스처
  buildHouseStage(exp.stage);
  return { ok: true, msg: `${exp.ico} ${exp.name} 증축 완료! 축하해요 🎉` };
}
