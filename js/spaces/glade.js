// =============================================================
//  🌟 반딧불이 계곡 — 밤에만 열리는 남쪽 숲 (새 동사: 잡기)
//  ------------------------------------------------------------
//  js/game.js 에서 원문 그대로 옮겨 온 구역(분리 2단계, 2026-09-24).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 에 남은 let 에 쓸 때는 `$w.x = …` (읽기는 그냥 x). 도구·증명: tools/refactor/
// =============================================================
import {
  $w, GLADE_MAX, WEATHER, atFarm, atMine, atOrchard, bugJarMesh, bugRespawnAt, catchCeremony, clayMat, clearPest,
  clock, dexDiscover, dist2D, doPlayerAction, gameState, gladeBugs, gladeGroup, indoor, isNight, makeSignpost,
  nightLevel, obstacles, pestTarget, player, questEvent, refreshInventoryUI, scene, showCatchItem, situation,
  spawnFloatText, spawnSparkle, spawnTree, trackGateBlocked, tryUnlockDrop, ui,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))
import { trackEvent } from '../analytics.js';
import { BUG_KINDS, CAFE_GATE, GLADE, GLADE_R } from '../data/places.js';
import { PAL } from '../data/world.js';
import { NIGHT_MIN } from '../daynight.js';
import { rollKind } from '../dex-gates.js';
import { Sound } from '../sound.js';
import * as THREE from 'three';

export function buildGlade() {
  $w.gladeGroup = new THREE.Group(); gladeGroup.position.copy(GLADE);
  // 짙은 이끼 바닥 — 주변 잔디보다 어두워 "숲 속 그늘" 느낌(반딧불이 대비도 ↑)
  const floor = new THREE.Mesh(new THREE.CircleGeometry(GLADE_R + 0.6, 36), clayMat(0x8ac9a2, false));
  floor.geometry.rotateX(-Math.PI / 2); floor.position.y = 0.02; floor.receiveShadow = true; gladeGroup.add(floor);
  // 이끼 바위 + 그루터기(공터가 허전하지 않게)
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.4, r = 2.4 + Math.random() * 3.4;
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3 + Math.random() * 0.32, 0), clayMat(0x9aab9a));
    rock.position.set(Math.cos(a) * r, 0.16, Math.sin(a) * r); rock.castShadow = true; gladeGroup.add(rock);
  }
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.58, 0.5, 9), clayMat(PAL.trunk));
  stump.position.set(-1.6, 0.25, 1.2); stump.castShadow = true; gladeGroup.add(stump);
  gladeGroup.add(makeSignpost('🌟 반딧불이 계곡', 0, -GLADE_R + 1.2));
  scene.add(gladeGroup);
  // 계곡을 둘러싼 나무 링 — 마을 불빛을 막아 "어두운 숲" 을 만듦
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + 0.25, r = GLADE_R + 1.4 + Math.random() * 1.2;
    const tx = GLADE.x + Math.cos(a) * r, tz = GLADE.z + Math.sin(a) * r;
    if (dist2D({ x: tx, z: tz }, CAFE_GATE) < 5.5) continue;   // ☕ 카페 시야를 가리지 않게 비움
    spawnTree(tx, tz);
  }
  obstacles.push({ x: GLADE.x, z: GLADE.z, r: GLADE_R });   // 계곡 안엔 밭 금지(빈터 유지)
}

// 종류 추첨 — 🌈무지개반디는 🌧️비·🌫️안개 낀 날 **밤**에만(게이트 안에서 18%). 표는 js/dex-gates.js
//   ⚠️ 옛 주석은 "비 온 날엔 초록반디가, 안개 낀 날엔 무지개반디가" 였지만 실제 코드는
//      rain||fog 둘 다 희귀↑ 였다. 게이트가 그 동작을 명시적으로 만든 것이다.
export function rollBugKind() {
  const rnd = (WEATHER === 'rain' || WEATHER === 'fog')
    ? () => Math.min(Math.random(), Math.random())   // 두 번 굴려 작은 값 → 희귀↑
    : Math.random;
  return rollKind(BUG_KINDS, 'bug', situation(), rnd);
}

// 반딧불이 한 마리 — 발광 코어 + 넓은 헤일로(Additive). 블룸과 겹쳐 밤에 또렷하게 빛남
export function makeFirefly(kind) {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8),
    new THREE.MeshBasicMaterial({ color: kind.color, transparent: true, opacity: 1 }));
  g.add(core);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8),
    new THREE.MeshBasicMaterial({ color: kind.color, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(halo);
  g.userData = {
    kind, core, halo,
    phase: Math.random() * Math.PI * 2,          // 점멸 위상 — 밝을 때 휘둘러야 잘 잡힘
    tx: 0, tz: 0, ty: 1.4,                       // 배회 목적지(계곡 로컬)
    flee: 0,                                     // 남은 도망 시간(초)
  };
  retargetFirefly(g);
  return g;
}

export function retargetFirefly(bug) {
  const u = bug.userData;
  const a = Math.random() * Math.PI * 2, r = Math.random() * (GLADE_R - 0.8);
  u.tx = Math.cos(a) * r; u.tz = Math.sin(a) * r; u.ty = 0.9 + Math.random() * 1.9;
}

// 계곡 안 랜덤 위치에 한 마리 추가(최대 GLADE_MAX)
export function spawnFirefly() {
  if (gladeBugs.length >= GLADE_MAX || !gladeGroup) return;
  const bug = makeFirefly(rollBugKind());
  const a = Math.random() * Math.PI * 2, r = Math.random() * (GLADE_R - 1);
  bug.position.set(Math.cos(a) * r, 0.9 + Math.random() * 1.6, Math.sin(a) * r);
  gladeGroup.add(bug); gladeBugs.push(bug);
}

export function removeFirefly(bug) {
  const i = gladeBugs.indexOf(bug);
  if (i >= 0) gladeBugs.splice(i, 1);
  gladeGroup.remove(bug);
}

// 매 프레임 — 밤에만 나타나 떠다니고, 플레이어가 다가오면 슬쩍 도망
export function updateFireflyBugs(dt, t) {
  if (!gladeGroup) return;
  const night = isNight();
  gladeGroup.visible = !indoor && !atFarm && !atMine && !atOrchard;
  if (!night) {                                   // ☀️ 낮 → 전부 사라짐(밤에 다시 피어오름)
    while (gladeBugs.length) removeFirefly(gladeBugs[gladeBugs.length - 1]);
    return;
  }
  if (t >= bugRespawnAt && gladeBugs.length < GLADE_MAX) {
    spawnFirefly();
    $w.bugRespawnAt = t + 1.2 + Math.random() * 2.4;  // 천천히 하나씩 피어오름
  }
  // 플레이어의 계곡 로컬 좌표(도망 판정용)
  const plx = player.position.x - GLADE.x, plz = player.position.z - GLADE.z;
  for (const bug of gladeBugs) {
    const u = bug.userData;
    u.phase += dt * 3.4;
    // 점멸 — 밝을 때가 "잡을 타이밍"(사인 곡선 그대로 UI/성공률에 연동)
    const bright = 0.5 + 0.5 * Math.sin(u.phase);
    const fade = Math.min(1, (nightLevel - NIGHT_MIN) / 0.2);   // 해질녘엔 서서히 나타남
    u.core.material.opacity = (0.3 + bright * 0.7) * fade;
    u.halo.material.opacity = (0.05 + bright * 0.3) * fade;
    u.halo.scale.setScalar(0.8 + bright * 0.55);
    // 이동 — 목적지로 부드럽게. 가까이 오면 반대 방향으로 튐
    const dx = bug.position.x - plx, dz = bug.position.z - plz;
    const pd = Math.hypot(dx, dz);
    if (pd < 1.5 && u.flee <= 0) { u.flee = 0.9; }
    let sp = 0.55;
    if (u.flee > 0) {
      u.flee -= dt; sp = 2.3;
      const k = pd || 0.001;
      u.tx = Math.max(-GLADE_R + 0.8, Math.min(GLADE_R - 0.8, plx + (dx / k) * 3.4));
      u.tz = Math.max(-GLADE_R + 0.8, Math.min(GLADE_R - 0.8, plz + (dz / k) * 3.4));
    }
    const tdx = u.tx - bug.position.x, tdz = u.tz - bug.position.z, tdy = u.ty - bug.position.y;
    const td = Math.hypot(tdx, tdz);
    if (td < 0.25 && u.flee <= 0) retargetFirefly(bug);
    else {
      bug.position.x += (tdx / (td || 1)) * sp * dt;
      bug.position.z += (tdz / (td || 1)) * sp * dt;
    }
    bug.position.y += tdy * dt * 0.8 + Math.sin(t * 2.2 + u.phase) * dt * 0.35;   // 위아래로 하늘하늘
  }
}

// 🦋 포충망 휘두르기 — 밤 + 계곡 + 반딧불이 근처에서만. 반짝일 때 휘둘러야 잘 잡힘
export function tryNet() {
  const pp = pestTarget(); if (pp) return clearPest(pp);   // 🐛 밭의 해충 쫓기 — 포충망의 두 번째 용도(스펙 §2-1)
  if (dist2D(GLADE, player.position) > GLADE_R + 2.5) { ui.toast?.('🌟 남쪽 반딧불이 계곡에서 쓰는 도구예요'); return; }
  if (!isNight()) { ui.toast?.('🌙 반딧불이는 밤에만 나와요. 해가 지면 다시 오세요', 2600); return; }
  let target = null, nd = 2.2;
  for (const bug of gladeBugs) {
    const d = Math.hypot(bug.position.x + GLADE.x - player.position.x, bug.position.z + GLADE.z - player.position.z);
    if (d < nd) { nd = d; target = bug; }
  }
  const wx = target ? target.position.x + GLADE.x : player.position.x;
  const wz = target ? target.position.z + GLADE.z : player.position.z;
  doPlayerAction(wx, wz);   // 휘두르는 제스처는 헛스윙이어도 나감
  if (!target) { Sound.blip(); ui.toast?.('🌟 반딧불이 가까이에서 휘둘러 보세요'); trackEvent('firefly_swing_empty'); return; }
  const u = target.userData, kind = u.kind;
  const bright = 0.5 + 0.5 * Math.sin(u.phase);
  // 성공률: 반짝일 때 크게 유리 + 촘촘한 포충망(영구 업그레이드) 보정
  const base = bright > 0.6 ? 0.9 : 0.35;
  const chance = Math.min(0.98, base + (gameState.upgrades.net ? 0.18 : 0));
  const ok = Math.random() < chance;
  trackEvent('firefly_swing', { kind: kind.id, bright: Math.round(bright * 100), lit: bright > 0.6, upgraded: !!gameState.upgrades.net, caught: ok }); // [GA4] 타이밍 성공률 분석
  if (!ok) {                                   // 실패 — 반딧불이가 휙 도망
    u.flee = 1.4; retargetFirefly(target);
    Sound.blip();
    spawnFloatText(wx, target.position.y + 0.5, wz, '휙— 놓쳤다!', '#8a8f7a');
    ui.toast?.('🌟 놓쳤어요! 반딧불이가 밝게 반짝일 때 휘둘러보세요', 2400);
    return;
  }
  gameState.inventory.bug = (gameState.inventory.bug || 0) + 1;
  refreshInventoryUI();
  removeFirefly(target);
  $w.bugRespawnAt = Math.min(bugRespawnAt, clock.elapsedTime + 2.5);   // 곧 새 개체가 피어남
  Sound.harvest();
  spawnFloatText(wx, 1.4, wz, `+1 ${kind.ico} ${kind.name}`, '#c98a2a');
  spawnSparkle(wx, 1.2, wz, kind.id === 'yellow' ? 12 : 20);
  questEvent('catch');                                    // 🦉 데일리 의뢰(반딧불이 잡기)
  dexDiscover('bug', kind.id);                            // 📖 도감(반딧불이 첫 발견)
  trackGateBlocked('bug', 'rainbow');     // [GA4] 📖
  catchCeremony('bugZoom');                               // 🎉 첫 반딧불이만 밀착, 이후 폴짝 + 병 팝
  showCatchItem(bugJarMesh(kind), wx, target.position.y, wz);
  if (kind.id === 'rainbow') tryUnlockDrop(0.5);          // 🎨 최희귀 → 집 색 해금 확률
  trackEvent('firefly_catch', { kind: kind.id, weather: WEATHER, night: Math.round(nightLevel * 100) }); // [GA4] 밤 콘텐츠 KPI
}
