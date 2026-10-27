// =============================================================
//  🛶 나루터 & 강 내려가기 — 마을 북쪽(12시) 선착장 → 강 인스턴스 공간
//  ------------------------------------------------------------
//  js/game.js 에서 원문 그대로 옮겨 온 구역(분리 2단계, 2026-09-26).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 에 남은 let 에 쓸 때는 `$w.x = …` (읽기는 그냥 x). 도구·증명: tools/refactor/
// =============================================================
import {
  $w, IS_MOBILE, RAIN_DAY, WEATHER, _camLook, _camTarget, analog, atRiver, awardBadge, boat, boatView, camera,
  clayMat, dateHash, dexDiscover, dockGroup, firstHint, gameState, giveReward, heldGroup, isNight, keys,
  lastZoneHint, makeSignpost, nearBoat, nearBoatShop, nearDoor, obstacles, player, playerAnchor, refreshCollectQuests,
  refreshInventoryUI, riverActive, riverCourse, riverGroup, riverPool, scene, setSpaceVisible, snapCamera,
  solidCircle, spawnConfetti, spawnDust, spawnFloatText, spawnSparkle, spawnSplash, syncBadges, todayStr,
  tryUnlockDrop, ui, wantAction, wantSkill, woodMat,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))
import { trackEvent } from '../analytics.js';
import { addGateWalk } from './gate-cue.js';
import { makeWalk } from './gate-walk.js';
import { onPlay, decorBanner } from '../decor-drops/index.js';
import { DOCK_GATE, DOCK_POND, DOCK_POND_R, RIVER, RIVER_DOCK_HALF } from '../data/places.js';
import { BOAT_BASE_SPEED, BOAT_RUNS_PER_DAY, RIVER_LEN, RIVER_OBS, RIVER_PICKS, RIVER_W } from '../boat/consts.js';
import { BOATS, liveBoatIds } from '../boat/boats.js';
import { COURSES, COURSE_V, FORK_X, buildCourseData, courseSeedKey, clampW, mulberry32 } from '../boat/course.js';
import { comboStep, steerParams, boostCd, isHit, isNearMiss, obstacleOutcome, ramPerRun, whirlMode, skillReady, startSkill, NEAR_GAIN, RIDE } from '../boat/abilities.js';
import { unlockCheck, unlockBoat, addRunMats } from '../boat/economy.js';
import { makeBoatModel } from '../boat/models.js';
import { PAL } from '../data/world.js';
import { logEcon } from '../metrics.js';
import { Sound } from '../sound.js';
import { sendBoatRun } from '../supabase-client.js';
import { chestGive, chestHintToday, chestOutcome, chestPaid, chestToday, placeChest, rollChest } from '../boat-chest.js';
import { animateChest, makeChestMesh, setChestNight } from '../boat-chest-art.js';
import * as THREE from 'three';

export function buildDockGate() {
  const g = new THREE.Group(); g.position.copy(DOCK_GATE);
  // 물가 — 마을 호수와 같은 둥근 연못(네모난 판이 아니라 자연스러운 물가)
  const water = new THREE.Mesh(new THREE.CircleGeometry(DOCK_POND_R, 40),
    new THREE.MeshStandardMaterial({ color: 0x8fd0ea, roughness: 0.25, metalness: 0.15, transparent: true, opacity: 0.92 }));
  water.geometry.rotateX(-Math.PI / 2);
  water.position.set(DOCK_POND.x - DOCK_GATE.x, 0.07, DOCK_POND.z - DOCK_GATE.z); water.receiveShadow = true; g.add(water);
  // 물가 돌 — 호수와 같은 문법(데크가 닿는 남쪽은 비움)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    if (Math.sin(a) > 0.55) continue;                       // 데크 쪽(남쪽)은 비움
    const rr = DOCK_POND_R - 0.25 + Math.random() * 0.5;
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26 + Math.random() * 0.3, 0), clayMat(0xb9c0c4));
    rock.position.set((DOCK_POND.x - DOCK_GATE.x) + Math.cos(a) * rr, 0.14, (DOCK_POND.z - DOCK_GATE.z) + Math.sin(a) * rr);
    rock.castShadow = true; g.add(rock);
  }
  // 수련잎 몇 장 — 호수와 같은 소품으로 물이 비어 보이지 않게
  for (let i = 0; i < 4; i++) {
    const a = Math.random() * Math.PI * 2, rr = Math.random() * (DOCK_POND_R - 3);
    const pad = new THREE.Mesh(new THREE.CircleGeometry(0.36, 7), clayMat(0x7fc98a, false));
    pad.geometry.rotateX(-Math.PI / 2);
    pad.position.set((DOCK_POND.x - DOCK_GATE.x) + Math.cos(a) * rr, 0.12, (DOCK_POND.z - DOCK_GATE.z) + Math.sin(a) * rr);
    g.add(pad);
  }
  // 데크(마을에서 물가로 뻗은 나무 다리)
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.16, 5.2), woodMat(2, 3));
  deck.position.set(0, 0.32, -2.2); deck.castShadow = true; deck.receiveShadow = true; g.add(deck);
  [[-1.1, -0.2], [1.1, -0.2], [-1.1, -4.2], [1.1, -4.2]].forEach(([px, pz]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1, 6), woodMat(1, 1, 0xa9743f));
    post.position.set(px, 0.1, pz); g.add(post);
  });
  // 정박한 나룻배(장식) — "여기서 탄다"는 걸 한눈에
  const moored = makeBoatHull(0.9, true); moored.position.set(2.2, 0.22, -5.2); moored.rotation.y = 0.35; g.add(moored);
  // 노가 걸린 표지판
  g.add(makeSignpost('🛶 나루터', -1.45, 1.15));
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffcf6a, emissiveIntensity: 0.8 }));
  lamp.position.set(-2.2, 1.5, 0.6); g.add(lamp);   // 물가 잔디 위(연못 밖)에 세움
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.5, 6), woodMat(1, 1, 0x8a6540));
  pole.position.set(-2.2, 0.75, 0.6); g.add(pole);
  scene.add(g); $w.dockGroup = g;
  obstacles.push({ x: DOCK_POND.x, z: DOCK_POND.z, r: DOCK_POND_R + 0.5 });   // 연못 위엔 밭 금지
  const pondSolid = solidCircle(DOCK_POND.x, DOCK_POND.z, DOCK_POND_R - 0.3);      // 🚧 물엔 못 들어감(데크 위만 예외)
  addGateWalk(g, 'dock', { water: pondSolid, color: 0xffd27a, ringR: 0.85,
    walk: makeWalk({ ax: DOCK_GATE.x, az: DOCK_GATE.z + 1.0, bx: DOCK_GATE.x, bz: DOCK_GATE.z - 4.5, hw: 1.0, y: 0.4 }) });
}

// 🛶 나룻배 — 청록 선체 + 나무 뱃전/뱃머리 + 붉은 좌석 + 고물 장식(곤돌라 풍).
//   마을 장식과 실제 탑승용에 함께 쓴다. 뱃머리는 -z(진행) 방향.
//   원기둥을 눕혀 세로로 납작하게 눌러 카누 단면을 만들고, 앞뒤에 뾰족한 콘을 붙인다.
//   ※ 참고 디자인의 금테 대신 마을의 나무 톤(데크·표지판과 같은 색)으로 — 마을 팔레트와 통일
export const BOAT_TEAL = 0x3fb3c2, BOAT_TRIM = 0xd9a066, BOAT_RED = 0xb2453e;

export function makeBoatHull(s = 1, withOar = false) {
  const g = new THREE.Group();
  const teal = clayMat(BOAT_TEAL, false), trim = clayMat(BOAT_TRIM, false), red = clayMat(BOAT_RED, false);
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 3, 12), teal);
  hull.rotation.x = Math.PI / 2;          // 원기둥 축(local Y) → 진행 방향(z)
  hull.scale.set(1, 1, 0.5);              // local z(= 월드 높이)만 눌러 납작하게
  hull.position.y = 0.32; hull.castShadow = true; g.add(hull);
  // 뱃머리·고물 — 나무 뾰족 캡
  const bow = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.3, 12), trim);
  bow.rotation.x = -Math.PI / 2; bow.scale.set(1, 1, 0.5); bow.position.set(0, 0.32, -2.15); bow.castShadow = true; g.add(bow);
  const stern = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1, 12), trim);
  stern.rotation.x = Math.PI / 2; stern.scale.set(1, 1, 0.5); stern.position.set(0, 0.32, 2); g.add(stern);
  // 뱃전 테두리 — 위에서 봤을 때 배 안쪽이 파여 보이게
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.57, 0.065, 6, 20), trim);
  rim.rotation.x = -Math.PI / 2; rim.scale.set(1, 2.7, 1); rim.position.y = 0.6; g.add(rim);
  // 안쪽 바닥(진한 청록) — 파인 느낌
  const floor = new THREE.Mesh(new THREE.CircleGeometry(0.48, 14), clayMat(0x2e93a3, false));
  floor.geometry.rotateX(-Math.PI / 2); floor.scale.set(1, 1, 2.7); floor.position.y = 0.3; g.add(floor);
  // 붉은 좌석 + 등받이
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.2, 0.62), red);
  seat.position.set(0, 0.42, 0.3); seat.castShadow = true; g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.44, 0.18), red);
  back.position.set(0, 0.66, 0.66); g.add(back);
  // 고물 장식(곤돌라의 페로) — 나무를 깎아 만든 기둥 + 빗살
  const ferro = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.66, 0.16), trim);
  ferro.position.set(0, 0.85, 1.72); g.add(ferro);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.5), trim);
  head.position.set(0, 1.12, 1.55); g.add(head);
  for (let i = 0; i < 3; i++) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.26), trim);
    tooth.position.set(0, 0.72 - i * 0.16, 1.86); g.add(tooth);
  }
  // 노(장식) — 정박한 배에만. 뱃전에 걸쳐 물에 담근 모습
  if (withOar) g.add(makeOar(-1));
  g.scale.setScalar(s);
  return g;
}

// 노 하나 — 나무 자루 + 넓적한 날. side: -1 왼쪽 / +1 오른쪽
export function makeOar(side) {
  const oar = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8), clayMat(BOAT_TRIM, false));
  shaft.rotation.z = side * 1.18;                       // 거의 눕힌 각도(수평에 가깝게)
  shaft.position.set(side * 0.95, -0.12, 0); oar.add(shaft);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.66), clayMat(BOAT_TRIM, false));
  blade.position.set(side * 1.92, -0.55, 0); oar.add(blade);
  oar.position.set(0, 0.5, 0.85);                       // 뱃전(노받이) 위치 — 카메라보다 뒤·아래
  oar.userData.side = side;
  return oar;
}

export function buildRiverSpace() {
  const g = new THREE.Group(); g.position.copy(RIVER);
  const H = RIVER_DOCK_HALF;
  // 나루터 데크(걸어 다니는 바닥)
  const deck = new THREE.Mesh(new THREE.BoxGeometry(H * 2, 0.3, H * 2), woodMat(6, 6));
  deck.position.set(0, 0.15, 0); deck.receiveShadow = true; g.add(deck);
  for (let i = -1; i <= 1; i += 2) {   // 데크 난간(양옆)
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, H * 2), woodMat(1, 4, 0xa9743f));
    rail.position.set(i * (H - 0.1), 0.55, 0); g.add(rail);
  }
  // 강물 — 데크 앞(-z)으로 코스 길이만큼 길게
  const water = new THREE.Mesh(new THREE.PlaneGeometry(RIVER_W * 2 + 4, RIVER_LEN + 80),
    new THREE.MeshStandardMaterial({ color: 0x7ec4e8, roughness: 0.22, metalness: 0.2, transparent: true, opacity: 0.94 }));
  water.geometry.rotateX(-Math.PI / 2);
  water.position.set(0, 0.08, -H - (RIVER_LEN + 80) / 2 + 4); water.receiveShadow = true; g.add(water);
  // 강둑(양쪽) + 듬성듬성한 나무 — 속도감을 주는 시각 기준점
  for (let i = -1; i <= 1; i += 2) {
    const bank = new THREE.Mesh(new THREE.BoxGeometry(7, 0.9, RIVER_LEN + 80), clayMat(0x9ed7a8, false));
    bank.position.set(i * (RIVER_W + 5), 0.2, -H - (RIVER_LEN + 80) / 2 + 4); bank.receiveShadow = true; g.add(bank);
  }
  // 강둑 나무 — 속도감을 주는 시각 기준점. 📱 모바일은 간격을 넓혀 드로우콜을 절반 이하로
  const treeGap = IS_MOBILE ? 18 : 9;
  for (let d = 6; d < RIVER_LEN + 40; d += treeGap) {
    for (const side of [-1, 1]) {
      if ((d * 7 + side) % 3 === 0) continue;           // 듬성듬성
      const h = 2.2 + ((d * 13) % 7) * 0.28;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, h, 5), clayMat(PAL.trunk));
      trunk.position.set(side * (RIVER_W + 2.6 + ((d * 3) % 5) * 0.5), 0.65 + h / 2, -H - d); g.add(trunk);
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.15, 2.4, 6), clayMat((d % 2) ? PAL.leaf1 : PAL.leaf2));
      leaf.position.set(trunk.position.x, 0.65 + h + 0.9, -H - d); g.add(leaf);
    }
  }
  // 🛶 타는 배(정박) — 데크 앞쪽 끝
  const moored = makeBoatHull(1, true); moored.position.set(0, 0.2, -H - 1.4); g.add(moored);
  g.userData.moored = moored;   // 🛶 런 중엔 숨김 — 출발 지점과 겹쳐 배가 이중으로 보이는 것 방지
  const [f0, f1] = COURSES.rapid.fork;
  const island = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.4, 20), clayMat(0x8fcf7a, false));
  island.scale.set((FORK_X[1] - FORK_X[0]) / 2, 1, (f1 - f0) / 2);
  island.position.set((FORK_X[0] + FORK_X[1]) / 2, 0.15, -H - 2 - (f0 + f1) / 2);
  island.visible = false; g.add(island);
  g.userData.island = island;
  g.userData.falls = COURSES.rapid.falls.map(d => {
    const band = new THREE.Mesh(new THREE.PlaneGeometry(RIVER_W * 2, 1.4),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, transparent: true, opacity: 0.85 }));
    band.geometry.rotateX(-Math.PI / 2);
    band.position.set(0, 0.11, -H - 2 - d);
    band.visible = false; g.add(band);
    return band;
  });
  // 🧰 뱃사공의 창고(업그레이드) — 데크 서쪽
  const shed = new THREE.Group(); shed.position.set(-H + 2, 0, 1.6);
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.9, 2), clayMat(0xe2c79a)); body.position.y = 1.25; body.castShadow = true; shed.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.1, 1.1, 4), clayMat(0xd08a6a)); roof.position.y = 2.7; roof.rotation.y = Math.PI / 4; shed.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.08), woodMat(1, 1, 0x8a5c36)); door.position.set(0, 0.9, 1.02); shed.add(door);
  g.add(shed);
  g.add(makeSignpost('🧰 뱃사공의 창고', -H + 2, 3.4));
  g.add(makeSignpost('🚪 마을로', 0, H - 0.6));
  scene.add(g); $w.riverGroup = g; g.visible = false;
  solidCircle(RIVER.x - H + 2, RIVER.z + 1.6, 1.5);   // 🚧 창고
}

export function boatDaily() {
  const st = gameState.boat;
  if (st.date !== todayStr()) { st.date = todayStr(); st.count = 0; st.clearsToday = 0; }   // 자정 지나면 리셋
  return st;
}

export function boatRunsLeft() { return Math.max(0, BOAT_RUNS_PER_DAY - boatDaily().count); }
/** 🧰 오늘 보물상자를 아직 건질 수 있나 — 마을 나루터 입구(doors.js)·탑승 안내가 쓴다 */
export function chestHintNow() { return chestHintToday(gameState.boat, todayStr(), boatRunsLeft()); }

export function dockView() {
  const st = gameState.boat, inv = gameState.inventory;
  return {
    star: inv.star || 0, coins: inv.coins || 0, runsLeft: boatRunsLeft(), runsMax: BOAT_RUNS_PER_DAY,
    best: st.best || 0, bestRapid: st.bestRapid || 0, sel: { ...st.sel }, mat: { ...st.mat },
    rapidOpen: (st.clears || 0) >= 1,
    boats: liveBoatIds().map(id => {
      const b = BOATS[id], c = unlockCheck(id, st, inv);
      return { id, name: b.name, ico: b.ico, owned: !!st.own[id], live: true, selected: st.sel.boat === id, lamps: b.lamps, skill: b.skill?.id || null, lacks: c.lacks, ok: c.ok };
    }),
  };
}

export function selectBoat(id) {
  if (!gameState.boat.own[id] || !liveBoatIds().includes(id)) return { ok: false, msg: '아직 없는 배예요' };
  gameState.boat.sel = { ...gameState.boat.sel, boat: id };
  return { ok: true };
}

export function selectCourse(course) {
  if (!COURSES[course]) return { ok: false };
  if (course === 'rapid' && (gameState.boat.clears || 0) < 1) return { ok: false, msg: '잔잔한 물길을 한 번 완주하면 급류가 열려요' };
  gameState.boat.sel = { ...gameState.boat.sel, course };
  return { ok: true };
}

export function unlockBoatNow(id) {
  const r = unlockBoat(id, gameState.boat, gameState.inventory);
  if (!r.ok) return { ok: false, msg: '조건이 아직 모자라요' };
  gameState.boat = r.st;
  gameState.inventory.star = r.inv.star;
  gameState.inventory.coins = r.inv.coins;
  if (r.spentCoins) logEcon('boat_unlock', id, -r.spentCoins, gameState.inventory.coins);
  refreshInventoryUI(); Sound.build(); spawnSparkle(player.position.x, 1.5, player.position.z, 18);
  trackEvent('boat_unlock', { boat_id: id, runs_total: gameState.boat.clears || 0, star_left: gameState.inventory.star || 0 });
  return { ok: true, name: BOATS[id].name, ico: BOATS[id].ico };
}

export function enterRiver() {
  $w.atRiver = true;
  player.position.set(RIVER.x, 0, RIVER.z + RIVER_DOCK_HALF - 1.6); player.rotation.y = Math.PI;
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null;
  snapCamera(); setSpaceVisible();
  firstHint('riverDock', '🛶', '나루터 · 강 내려가기',
    { steps: [{ ico: '🛶', label: '배 앞 {A}' }, { ico: '⬅️➡️', label: '피하기' }, { ico: '💨', label: '{A} 스퍼트' }], note: '하루 3번', chip: '⭐ 별조각으로 배 강화' });
  Sound.blip();
  trackEvent('boat_enter', { runs_left: boatRunsLeft(), night: isNight(), weather: WEATHER });   // [GA4] 유입
  decorBanner('ferry');
}

export function exitRiver() {
  if (boat.active) endBoatRun('quit');
  $w.atRiver = false;
  player.position.set(DOCK_GATE.x, 0, DOCK_GATE.z + 2.2);
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null;
  snapCamera(); setSpaceVisible();
  Sound.blip(); trackEvent('boat_exit');   // [GA4]
}

export { mulberry32, clampW };

export function buildCourse(seed, night, opts = {}) {
  const r = buildCourseData(seed, { night, chest: !!opts.chest, course: opts.course || 'calm' });
  riverCourse.length = 0;
  riverCourse.push(...r.items);
  boat.fork = r.fork;
  boat.falls = r.falls;
}

export function makeRiverMesh(kind, pickId) {
  if (kind === 'chest') return makeChestMesh({ wood: woodMat });   // 🧰 풀에 한 개만 — 밤낮은 꺼낼 때 맞춘다(acquireRiverMesh)
  if (kind === 'rock') {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95, 0), clayMat(0xb0b8bd));
    m.castShadow = true; return m;
  }
  if (kind === 'log') {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 3.6, 7), woodMat(2, 1, 0xa9743f));
    m.rotation.z = Math.PI / 2; m.castShadow = true; return m;
  }
  if (kind === 'pile') {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.6, 0.5), woodMat(1, 2, 0x8a5c36));
    m.castShadow = true; return m;
  }
  if (kind === 'whirl') {
    const m = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.2, 6, 18),
      new THREE.MeshStandardMaterial({ color: 0x9fdcf5, transparent: true, opacity: 0.75, roughness: 0.3 }));
    m.rotation.x = -Math.PI / 2; return m;
  }
  if (kind === 'star') {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.36, 0),
      new THREE.MeshStandardMaterial({ color: 0xffe07a, emissive: 0xffc94a, emissiveIntensity: 0.85, roughness: 0.4 }));
    return m;
  }
  const k = RIVER_PICKS.find(x => x.id === pickId) || RIVER_PICKS[0];
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.46, 0),
    new THREE.MeshStandardMaterial({ color: k.color, emissive: k.color, emissiveIntensity: 0.45, roughness: 0.45 }));
  return m;
}

export function acquireRiverMesh(item) {
  const key = item.kind === 'pick' ? 'pick:' + item.pick : item.kind;
  const pool = riverPool[key] || (riverPool[key] = []);
  const m = pool.pop() || makeRiverMesh(item.kind, item.pick);
  if (item.kind === 'chest') setChestNight(m, boat.night);
  m.visible = true; riverGroup.add(m);
  return m;
}

export function releaseRiverMesh(act) {
  const key = act.item.kind === 'pick' ? 'pick:' + act.item.pick : act.item.kind;
  riverGroup.remove(act.mesh);
  (riverPool[key] || (riverPool[key] = [])).push(act.mesh);
}

export function clearRiverObjects() {
  while (riverActive.length) releaseRiverMesh(riverActive.pop());
}

export function startBoatRun() {
  const st = boatDaily();
  if (st.count >= BOAT_RUNS_PER_DAY) {
    ui.showHintModal?.({ ico: '🛶', title: `오늘은 ${BOAT_RUNS_PER_DAY}번 다 탔어요`, body: '내일 새 물길이 열려요' });
    return;
  }
  st.count += 1;
  boat.runNo = st.count;
  boat.night = isNight();
  const sel = gameState.boat.sel;
  const boatId = gameState.boat.own[sel.boat] && liveBoatIds().includes(sel.boat) ? sel.boat : 'ferry';
  const course = sel.course === 'rapid' && (gameState.boat.clears || 0) >= 1 ? 'rapid' : 'calm';
  boat.seed = dateHash(courseSeedKey(boat.runNo, course));
  const offered = chestToday(gameState.boat, todayStr());
  buildCourse(boat.seed, boat.night, { chest: offered, course });
  const parts = gameState.boat.parts || {};
  Object.assign(boat, {
    active: true, dist: 0, speed: BOAT_BASE_SPEED, vx: 0, lamps: BOATS[boatId].lamps, stars: 0,
    hits: 0, hitLog: [], picks: {}, boostUntil: 0, boostReadyAt: 0, boostUsed: 0,
    invUntil: 0, stunUntil: 0, wreckAt: 0, shake: 0, next: 0, startedAt: performance.now(), t: 0,
    boatId, course, combo: { n: 0, last: -99 }, comboMax: 0, nearMiss: 0,
    ramLeft: ramPerRun(sel.bow === 'ram' ? parts.ram : 0), windLv: sel.flag === 'wind' ? parts.wind || 0 : 0,
    skillUntil: 0, skillReadyAt: 0, skillUsed: 0, skillSent: 0, rideUntil: 0, rideBoostUntil: 0, airUntil: 0, fallIdx: 0,
    chestOffered: offered, chestTaken: false, chestSeen: false, chestMissed: false, chestDxMin: Infinity, chestPos: null, chest: null,
  });
  clearRiverObjects();
  boat.models ??= {};
  if (!boat.models[boatId]) { boat.models[boatId] = makeBoatModel(boatId); scene.add(boat.models[boatId]); }
  for (const id in boat.models) boat.models[id].visible = id === boatId;
  boat.group = boat.models[boatId];
  const lantern = boat.group.userData.lantern, light = boat.group.userData.light;
  if (lantern) lantern.visible = !!boat.night;
  if (light) light.intensity = boat.night ? 2.4 : 0;
  for (const m of boat.group.userData.fpHide) m.visible = boatView === 'third';
  if (riverGroup?.userData.island) riverGroup.userData.island.visible = course === 'rapid';
  for (const f of riverGroup?.userData.falls || []) f.visible = course === 'rapid';
  playerAnchor.visible = (boatView === 'third');     // 1인칭이면 캐릭터를 숨김(시야 방해 방지)
  if (heldGroup) heldGroup.visible = false;          // 🛶 배 위에선 도구를 내려놓는다(두 손으로 노를 잡는 느낌)
  playerAnchor.position.y = 0; playerAnchor.rotation.set(0, 0, 0);   // 노 젓기 자세 초기화
  boat.group.rotation.set(0, 0, 0); boat.group.position.y = 0;       // 지난 런의 침몰 자세 초기화
  if (riverGroup?.userData.moored) riverGroup.userData.moored.visible = false;   // 정박 배 숨김(출발 지점 겹침 방지)
  player.position.set(RIVER.x, 0, RIVER.z - RIVER_DOCK_HALF - 2); player.rotation.y = Math.PI;
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null;
  ui.setBoatRun?.(true);
  Sound.water();
  trackEvent('boat_start', {                                   // [GA4] 런 시작(코스 시드까지 남김)
    run_no: boat.runNo, seed: boat.seed, night: boat.night, weather: WEATHER,
    lamps: boat.lamps, boat_id: boatId, course,
    has_chest: offered ? 1 : 0,                                // 🧰 이 판에 보물상자가 나오는지(노출 퍼널 분모)
  });
}

export function endBoatRun(result) {
  if (!boat.active) return;
  boat.active = false;
  const timeSec = Math.round((performance.now() - boat.startedAt) / 100) / 10;
  const distM = Math.round(boat.dist);
  const rareCount = Object.values(boat.picks).reduce((a, b) => a + b, 0);
  // ⭐ 보상 — 🌧️비(물살↑)·🌙밤+🏮등불 보너스, 완주/무피해 보너스. 코인은 주지 않음(인플레 방지)
  const rainBonus = RAIN_DAY ? 1.15 : 1;
  let stars = Math.round(boat.stars * rainBonus);
  if (result === 'clear') stars += 5;
  if (result === 'clear' && boat.hits === 0) stars += 5;              // 🏆 무피해 완주
  const give = { star: stars };
  for (const id in boat.picks) {                                       // 희귀 수집물 → 재료
    const k = RIVER_PICKS.find(x => x.id === id); if (!k) continue;
    for (const res in k.give) give[res] = (give[res] || 0) + k.give[res] * boat.picks[id];
  }
  const score = distM + boat.stars * 8 + rareCount * 40 + (result === 'clear' ? 200 : 0);
  const bestKey = boat.course === 'rapid' ? 'bestRapid' : 'best';
  const best = score > (gameState.boat[bestKey] || 0);
  if (best) gameState.boat[bestKey] = score;
  if (result === 'clear') {
    gameState.boat.clears = (gameState.boat.clears || 0) + 1;
    boatDaily().clearsToday = (gameState.boat.clearsToday || 0) + 1;   // 오늘치 — 🛶 의뢰는 이 값을 읽는다
    refreshCollectQuests();   // 보상(giveReward)은 별조각·희귀가 있을 때만 나가므로 여기서 직접 갱신한다
  }
  if (result === 'clear' && boat.hits === 0) gameState.boat.perfect = (gameState.boat.perfect || 0) + 1;   // 🌊 무피해 완주(배지 소급용)
  const matMul = COURSES[boat.course].matMul;
  const runMats = Object.fromEntries(Object.entries(boat.picks).map(([k, n]) => [k, Math.floor(n * matMul + 0.5)]));
  const stat = { ...gameState.boat.stat, comboBest: Math.max(gameState.boat.stat.comboBest || 0, boat.comboMax) };
  if (result === 'clear') {
    if (boat.night) stat.nightClears++;
    if (boat.boatId === 'raft') stat.raftClears++;
    if (boat.course === 'rapid') {
      stat.rapidClears++;
      if (boat.night) stat.rapidNightClears++;
      if (boat.hits === 0) stat.rapidPerfect++;
    }
  }
  gameState.boat = { ...addRunMats(gameState.boat, boat.picks, matMul), stat };

  clearRiverObjects();
  if (boat.group) boat.group.visible = false;
  playerAnchor.visible = true;
  if (heldGroup) heldGroup.visible = true;                            // 도구를 다시 손에
  playerAnchor.position.y = 0; playerAnchor.rotation.set(0, 0, 0);    // 노 젓기·침몰 자세 해제
  if (riverGroup?.userData.moored) riverGroup.userData.moored.visible = true;    // 정박 배 복원
  player.position.set(RIVER.x, 0, RIVER.z + 1.2); player.rotation.y = Math.PI;   // 데크로 복귀
  snapCamera();
  ui.setBoatRun?.(false); ui.setBoatHud?.(null);

  if (stars > 0 || rareCount > 0) giveReward(give, 'boat_run', result);
  // 🧰 보물상자 — 규칙 always(난파·그만두기에도 지급). 출처를 나눠 따로 준다(boat_run 과 섞이지 않게).
  //    econ_logs 는 코인 전용이라 여기 안 남는다 → 지급 원장은 boat_runs.chest_loot·chest_paid.
  const chestCode = chestOutcome({ offered: boat.chestOffered, seen: boat.chestSeen, taken: boat.chestTaken });
  const chestPaidNow = !!(boat.chest && chestPaid(result));
  let chestG = null;                                                   // 실제 지급 기준 { id, name, give } — 🎨 다 열렸으면 color_gem
  if (chestPaidNow) {
    gameState.boat.chestDate = todayStr();                             // 오늘은 끝 — 지급과 같은 순간에 남긴다(건진 뒤 창을 닫아도 안 잃게)
    chestG = chestGive(boat.chest, { unlocked: boat.chest.give ? false : tryUnlockDrop(1) });
    if (Object.keys(chestG.give).length) giveReward(chestG.give, 'boat_chest', chestG.id);
  }
  const chestLootId = chestG?.id ?? boat.chest?.id ?? null;
  const chestD = boat.chestPos?.d ?? riverCourse.find(k => k.kind === 'chest')?.d ?? null;
  for (const id in boat.picks) dexDiscover('river', id);               // 📖 강 도감
  if (result === 'clear') awardBadge('ferryman');
  if (result === 'clear' && boat.hits === 0) awardBadge('river_master');
  syncBadges();
  if (result === 'clear') { Sound.complete(); spawnConfetti(player.position.x, 2.2, player.position.z); }
  else if (result === 'wreck') Sound.build();

  const payload = {
    result, run_no: boat.runNo, seed: boat.seed, night: boat.night, weather: WEATHER,
    dist_m: distM, time_sec: timeSec, score, best, hits: boat.hits, hit_points: boat.hitLog,
    picks: { ...boat.picks }, stars, lamps_left: boat.lamps, boost_used: boat.boostUsed,
    upgrades: null,
    course: boat.course, boat_id: boat.boatId,
    loadout: { bow: gameState.boat.sel.bow, flag: gameState.boat.sel.flag, stern: gameState.boat.sel.stern, crew: null, lv: { ...gameState.boat.parts } },
    skill_used: boat.skillUsed, combo_max: boat.comboMax, near_miss: boat.nearMiss, mats: runMats, course_v: COURSE_V,
    chest: chestCode, chest_loot: chestLootId, chest_paid: chestPaidNow ? 1 : 0, chest_d: chestD == null ? null : Math.round(chestD),   // 🧰 boat_runs 4컬럼(마이그레이션 먼저!)
  };
  trackEvent('boat_end', {                                             // [GA4] 완주율·이탈 지점 KPI
    result, run_no: boat.runNo, boat_id: boat.boatId, course: boat.course, dist_m: distM, time_sec: timeSec, score, hits: boat.hits,
    stars, rare: rareCount, boost_used: boat.boostUsed, night: boat.night, weather: WEATHER, best,
    chest: chestCode, chest_loot: chestLootId, chest_paid: chestPaidNow ? 1 : 0,   // 🧰 0 없음·1 보고 놓침·2 건짐·3 못 감
  });
  if (result !== 'quit') onPlay('ferry');
  sendBoatRun(payload);                                                // [분석] 런 단위 1행(boat_runs)
  ui.showBoatResult?.({
    ...payload, rare: rareCount, runsLeft: boatRunsLeft(), runsMax: BOAT_RUNS_PER_DAY, matsView: runMats, course: boat.course,
    // 🧰 개봉 화면(R3)·결과 카드용 — payload.chest 는 트래킹 코드(0/1/2)라 화면 정보는 따로
    chestView: { paid: chestPaidNow, missed: chestCode === 1, id: chestLootId, name: chestG?.name ?? null, night: boat.night },
    picksView: Object.entries(boat.picks).map(([id, n]) => {
      const k = RIVER_PICKS.find(x => x.id === id); return { ico: k?.ico || '❔', name: k?.name || id, n };
    }),
    totalStar: gameState.inventory.star || 0,
  });
}

export function updateBoatRun(dt, t) {
  boat.t += dt;
  // 🌊 침몰 연출: 마지막 충돌 지점에서 배가 기울며 천천히 가라앉는다 — 다 잠기면 결과 화면
  if (boat.wreckAt) {
    if (boat.t >= boat.wreckAt) { endBoatRun('wreck'); return; }
    const k = 1 - Math.max(0, (boat.wreckAt - boat.t) / 1.9);        // 침몰 진행도 0→1
    boat.speed = 0; boat.vx = 0;                                     // 그 자리에서
    if (boat.group) {
      boat.group.position.set(player.position.x, -k * k * 0.9, player.position.z);
      boat.group.rotation.x = k * 0.55;                              // 뱃머리부터 물속으로
      boat.group.rotation.z = Math.sin(boat.t * 7) * 0.12 * (1 - k); // 잦아드는 흔들림
      boat.group.userData.oars.forEach(c => { c.rotation.x = 0.85; }); // 노를 놓침
    }
    playerAnchor.position.y = -k * k * 0.75;                         // 캐릭터도 배와 함께 잠긴다(3인칭)
    playerAnchor.rotation.x = k * 0.4;
    if (Math.random() < (IS_MOBILE ? 0.2 : 0.4))                     // 보글보글 물거품
      spawnSplash(player.position.x + (Math.random() - 0.5) * 1.4, 0.15, player.position.z - 1 + Math.random() * 2, 2);
    return;                                                          // 침몰 중엔 조향·충돌·HUD 갱신 없음
  }
  const p = Math.min(1, boat.dist / RIVER_LEN);
  const seg = p < 0.34 ? 1 : p < 0.67 ? 2 : 3;
  // 💥 충돌 직후: 배가 그 자리에 멈춰 출렁이는 중 / 🚣 출렁임이 끝나면 노를 빠르게 저으며 재출발
  const stunned = boat.t < boat.stunUntil;
  const restarting = !stunned && boat.stunUntil > 0 && boat.t < boat.stunUntil + 0.9;
  // 속도: 구간이 갈수록 빨라지고, 🌧️비 오는 날은 물살이 세다
  const boosting = boat.t < boat.boostUntil;
  let sp = BOAT_BASE_SPEED * (1 + p * 0.55) * (RAIN_DAY ? 1.12 : 1) * COURSES[boat.course].speedMul;
  if (boat.t < boat.rideBoostUntil) sp *= RIDE.boost;
  if (boosting) sp *= 1.5;
  if (stunned) sp = 0;                               // 충돌: 완전히 멈춘다(통과 금지)
  boat.speed += (sp - boat.speed) * Math.min(1, dt * (stunned ? 12 : 4));   // 충돌 시 급정거, 재출발은 원래 가속
  boat.dist += boat.speed * dt;
  if (boat.falls?.[boat.fallIdx] != null && boat.dist >= boat.falls[boat.fallIdx]) { boat.airUntil = boat.t + 0.8; boat.fallIdx++; }

  // 조향 — 키보드(A/D·←/→) 또는 조이스틱 x. 🚣노 업그레이드로 반응이 빨라짐
  //        충돌 출렁임 중엔 잠금(부딪혀 밀려나는 vx 만 자연 감쇠)
  let steer = 0;
  if (!stunned) {
    if (keys.isDown('ArrowLeft') || keys.isDown('KeyA')) steer -= 1;
    if (keys.isDown('ArrowRight') || keys.isDown('KeyD')) steer += 1;
    if (Math.abs(analog.x) > 0.12) steer += analog.x;
    steer = Math.max(-1, Math.min(1, steer));
  }
  const { acc, maxVx } = steerParams(boat.boatId);
  boat.vx += steer * acc * dt;
  boat.vx *= Math.pow(stunned ? 0.35 : 0.06, dt);    // 감쇠 — 충돌 밀려남은 천천히(옆으로 미끄러지는 맛)
  boat.vx = Math.max(-maxVx, Math.min(maxVx, boat.vx));
  player.position.x += boat.vx * dt;
  player.position.z = RIVER.z - RIVER_DOCK_HALF - 2 - boat.dist;
  // 강폭 밖으로는 못 나감(둑에 닿으면 튕겨 나옴)
  const lim = RIVER_W - 0.7;
  if (player.position.x < RIVER.x - lim) { player.position.x = RIVER.x - lim; boat.vx = Math.abs(boat.vx) * 0.3; }
  if (player.position.x > RIVER.x + lim) { player.position.x = RIVER.x + lim; boat.vx = -Math.abs(boat.vx) * 0.3; }

  // 🚣 노 젓기(스퍼트) — 액션 버튼/Space. 쿨다운이 있어 남발 못 함
  //    충돌 출렁임 중엔 무시(버퍼된 입력이 재출발 순간 터지지 않게 소비만 함)
  if (wantAction) {
    $w.wantAction = false;
    if (!stunned && boat.t >= boat.boostReadyAt) {
      boat.boostUntil = boat.t + 1.5; boat.boostReadyAt = boat.t + boostCd(boat.windLv); boat.boostUsed++;
      Sound.water(); spawnSplash(player.position.x, 0.6, player.position.z + 1.5, 6, 1.3);
    }
  }
  const sk = BOATS[boat.boatId].skill;
  if (wantSkill) {
    $w.wantSkill = false;
    if (!stunned && skillReady(sk, boat.t, boat.skillReadyAt)) {
      const s = startSkill(sk, boat.t);
      boat.skillUntil = s.until; boat.skillReadyAt = s.readyAt; boat.skillUsed++;
      Sound.water(); spawnSplash(player.position.x, 0.4, player.position.z - 1, 8, 1.2);
      if (boat.skillSent < 10) { boat.skillSent++; trackEvent('boat_skill', { boat_id: boat.boatId, skill: sk.id, dist_m: Math.round(boat.dist), seg }); }
    }
  }
  const diving = sk?.id === 'dive' && boat.t < boat.skillUntil;

  updateRiverObjects(dt, t, seg);
  if (!boat.active) return;                          // 위에서 난파 처리됐으면 종료

  // 배 메시 — 위치·기울기(조향 방향으로 롤) + 노 젓기 모션
  if (boat.group) {
    boat.group.position.set(player.position.x, 0, player.position.z);
    boat.group.rotation.y = (-boat.vx / maxVx) * 0.16;   // 뱃머리는 모델 로컬 -z = 진행 방향
    if (boat.t < boat.rideUntil) boat.group.rotation.y += (1 - (boat.rideUntil - boat.t) / RIDE.spin) * Math.PI * 2;
    boat.group.rotation.z = (boat.vx / maxVx) * 0.13;
    boat.group.position.y = Math.sin(boat.t * 3.2) * 0.05;
    if (stunned) {
      // 💥 충돌 연출: 크게 출렁이며 앞뒤로 갸우뚱 — 시간이 지나며 잦아듦. 노는 놀라서 들어올림
      const k = Math.max(0, (boat.stunUntil - boat.t) / 1.15);
      boat.group.rotation.z += Math.sin(boat.t * 16) * 0.15 * k;
      boat.group.rotation.x = Math.sin(boat.t * 12) * 0.1 * k;
      boat.group.position.y += Math.sin(boat.t * 9) * 0.06 * k;
      boat.group.userData.oars.forEach(c => { c.rotation.x = 0.7 * k; });
      // 캐릭터도 배와 함께 휘청(3인칭)
      playerAnchor.position.y = boat.group.position.y;
      playerAnchor.rotation.x = 0.1;
      playerAnchor.rotation.z = Math.sin(boat.t * 16) * 0.18 * k;
    } else {
      boat.group.rotation.x = 0;
      // 🚣 재출발·스퍼트 중엔 노를 빠르고 깊게 젓는다 — "다시 출발!" 이 눈에 보이게
      const fast = boosting || restarting;
      const stroke = Math.sin(boat.t * (fast ? 11 : 5.5));
      boat.group.userData.oars.forEach(c => { c.rotation.x = stroke * (fast ? 0.55 : 0.32); });
      // 🚣 캐릭터도 노와 같은 위상으로 상체를 앞뒤로 — 젓는 사람이 보이게(3인칭)
      playerAnchor.position.y = boat.group.position.y + Math.abs(stroke) * 0.05;   // 배 출렁임 + 젓는 들썩임
      playerAnchor.rotation.x = 0.12 + stroke * (fast ? 0.24 : 0.14);              // 앞으로 숙였다 젖혔다
      playerAnchor.rotation.z = (boat.vx / maxVx) * 0.13;                          // 배 롤을 따라 기울기
    }
    if (boat.t < boat.airUntil) boat.group.position.y += Math.sin((1 - (boat.airUntil - boat.t) / 0.8) * Math.PI) * 0.9;
    if (diving) boat.group.position.y = -0.55;
  }
  if (boat.shake > 0) boat.shake = Math.max(0, boat.shake - dt * 2.4);

  // 물보라(뱃머리) — 가끔씩만 뿌려 부담 최소화(📱 모바일은 더 드물게). 재출발 땐 노 뒤로 물살
  const sprayP = stunned ? 0 : IS_MOBILE ? ((boosting || restarting) ? 0.25 : 0.08) : ((boosting || restarting) ? 0.5 : 0.2);
  if (Math.random() < sprayP) spawnSplash(player.position.x, 0.35, player.position.z - 2.4, 2);

  ui.setBoatHud?.({
    p, seg, dist: Math.round(boat.dist), total: RIVER_LEN,
    lamps: boat.lamps, lampMax: BOATS[boat.boatId].lamps, stars: boat.stars,
    boost: boosting ? 1 : Math.min(1, 1 - (boat.boostReadyAt - boat.t) / boostCd(boat.windLv)),
    boosting, speed: Math.round(boat.speed * 3.6),
    skill: sk ? Math.min(1, 1 - (boat.skillReadyAt - boat.t) / sk.cd) : null,
    skillIco: { dive: '🫧', fold: '✈️', lure: '🎣' }[sk?.id] || '',
    combo: boat.combo.n,
  });

  if (boat.dist >= RIVER_LEN) endBoatRun('clear');
}

// 코스 오브젝트 등장/퇴장 + 충돌·획득 판정
export function updateRiverObjects(dt, t, seg) {
  // 앞쪽 일정 거리 안에 들어온 것부터 스폰(📱 모바일은 더 가까이서 — 동시 오브젝트 수↓)
  const spawnAhead = IS_MOBILE ? 52 : 70;
  while (boat.next < riverCourse.length && riverCourse[boat.next].d - boat.dist < spawnAhead) {
    const item = riverCourse[boat.next++];
    const mesh = acquireRiverMesh(item);
    const y = item.kind === 'whirl' ? 0.12 : item.kind === 'star' || item.kind === 'pick' ? 0.85 : item.kind === 'pile' ? 1.3 : item.kind === 'chest' ? 0.08 : 0.35;
    mesh.position.set(item.x, y, -RIVER_DOCK_HALF - 2 - item.d);
    if (item.kind === 'chest') mesh.rotation.y = 0.5;               // 비스듬히 — 금테·자물쇠·부표가 한 번에 보이게
    riverActive.push({ mesh, item, x: item.x, taken: false, prevRel: Infinity, passedCheck: false, rode: false });
    if (item.kind === 'chest' && !boat.chestSeen) {               // 🧰 화면에 들어온 순간 1회(노출)
      boat.chestSeen = true; boat.chestPos = { d: item.d, x: item.x };
      trackEvent('boat_chest_seen', { run_no: boat.runNo, seg, chest_d: Math.round(item.d),
        chest_x: Math.round(item.x * 10) / 10, speed: Math.round(boat.speed * 10) / 10 });
    }
  }
  const diving = BOATS[boat.boatId].skill?.id === 'dive' && boat.t < boat.skillUntil;
  const bx = player.position.x - RIVER.x;
  if (boat.fork && boat.dist > boat.fork.d0 && boat.dist < boat.fork.d1 && bx > boat.fork.x0 && bx < boat.fork.x1) {
    boat.vx = (bx > (boat.fork.x0 + boat.fork.x1) / 2 ? 1 : -1) * 6;
  }
  for (let i = riverActive.length - 1; i >= 0; i--) {
    const a = riverActive[i], it = a.item;
    const rel = it.d - boat.dist;                    // 배 기준 남은 거리(+앞 / -뒤)
    // 프레임이 길면(저사양·탭 복귀) 한 프레임에 오브젝트를 건너뛸 수 있다 →
    // "직전 프레임엔 앞에 있었는데 지금은 뒤"면 스쳐 지나간 것으로 보고 판정(터널링 방지)
    const passed = a.prevRel > 0 && rel <= 0;
    a.prevRel = rel;
    if (rel < -10) { releaseRiverMesh(a); riverActive.splice(i, 1); continue; }
    // 🪵 통나무는 좌우로 천천히 흐르고, 🌀 소용돌이는 빙글 돈다
    if (it.drift) {
      a.x = clampW(a.x + it.drift * dt, RIVER_OBS.log.r);
      a.mesh.position.x = a.x;
    }
    if (it.kind === 'whirl') a.mesh.rotation.z += dt * 2.2;
    if (it.kind === 'star' || it.kind === 'pick') { a.mesh.rotation.y += dt * 2.6; a.mesh.position.y = 0.85 + Math.sin(t * 3 + it.d) * 0.12; }
    if (it.kind === 'chest') animateChest(a.mesh, t, it.d);
    if (a.taken) continue;
    const dx = Math.abs(a.x - bx);
    if (it.kind === 'chest') {                                    // 🧰 보물상자 — 건지기(①: 시야를 가리지 않게 가볍게)
      if (rel > -2) boat.chestDxMin = Math.min(boat.chestDxMin, dx);   // 놓쳤을 때 "얼마나 아깝게"
      if ((Math.abs(rel) < 1.4 || passed) && dx < 1.7) {         // 상자가 1.25배라 수집물(1.5)보다 조금 넉넉하게
        a.taken = true; a.mesh.visible = false;
        boat.chestTaken = true; boat.chest = rollChest(boat.seed);   // 오늘 끝 기록(chestDate)은 지급할 때 — 여기서 남기면 창을 닫았을 때 상자를 잃는다
        // 내용물은 개봉 화면(결과 전)에서 공개 — 여기선 건졌다는 것만. 이모지 없이(로우폴리 화면에서 튄다)
        const portrait = innerWidth < innerHeight;                  // 📱 세로 화면에선 0.9 로 폭을 넘어 양옆이 잘렸다(390px 실측)
        Sound.harvest(); spawnFloatText(player.position.x, 1.9, player.position.z - 10, '보물상자를 건졌어요!', '#c98a1e', portrait ? 0.5 : 0.9);
        spawnSparkle(player.position.x, 1.1, player.position.z - 4, 8);   // 수집물과 같은 개수 — 14개는 카메라 앞에서 요란했다(실측)
        trackEvent('boat_chest_take', { run_no: boat.runNo, loot: boat.chest.id, seg, dist_m: Math.round(boat.dist),
          dx: Math.round(dx * 100) / 100, speed: Math.round(boat.speed * 10) / 10, lamps_left: boat.lamps, night: boat.night, weather: WEATHER });
      } else if (rel < -1.4 && !boat.chestMissed) {              // 지나쳤다 — 1회만
        boat.chestMissed = true;
        trackEvent('boat_chest_miss', { run_no: boat.runNo, seg, dx_min: Math.round(boat.chestDxMin * 100) / 100,
          speed: Math.round(boat.speed * 10) / 10, lamps_left: boat.lamps });
      }
      continue;
    }
    if (it.kind === 'star' || it.kind === 'pick') {              // 획득
      if ((Math.abs(rel) < 1.4 || passed) && dx < 1.5) {
        if (diving) continue;
        a.taken = true; a.mesh.visible = false;
        if (it.kind === 'star') {
          boat.combo = comboStep(boat.combo, boat.t);
          boat.comboMax = Math.max(boat.comboMax, boat.combo.n);
          boat.stars += 1 + boat.combo.bonus;
          Sound.blip();
        }
        else {
          boat.picks[it.pick] = (boat.picks[it.pick] || 0) + 1;
          const k = RIVER_PICKS.find(x => x.id === it.pick);
          // 배 앞쪽에 작게 — 배 위치(=1인칭 카메라 앞)에 띄우면 세로 화면에서 시야각을 넘쳐 잘림
          Sound.harvest(); spawnFloatText(player.position.x, 1.9, player.position.z - 10, `${k?.ico || ''} ${k?.name || ''}`, '#2fa564', 0.8);
          trackEvent('boat_pickup', { item: it.pick, dist_m: Math.round(boat.dist), seg });   // [GA4] 희귀 획득 분포
        }
        spawnSparkle(player.position.x, 1.1, player.position.z - 4, 8);   // 눈앞(카메라 0.5m 앞)이 아니라 뱃머리 너머에서 반짝
      }
      continue;
    }
    const meta = RIVER_OBS[it.kind];
    if (it.kind === 'whirl') {                                   // 🌀 끌어당기기(피해 없음)
      if (Math.abs(rel) < meta.r && dx < meta.r + 1) {
        if (whirlMode(boat.boatId) === 'ride') {
          if (!a.rode) { a.rode = true; boat.rideUntil = boat.t + RIDE.spin; boat.rideBoostUntil = boat.t + RIDE.spin + RIDE.boostDur; }
        } else boat.vx += (a.x - bx) * dt * 5.5;
      }
      continue;
    }
    if (!a.passedCheck && rel < 0) {
      a.passedCheck = true;
      if (!a.taken && isNearMiss(dx, boat.boatId, it.kind)) {
        boat.nearMiss++;
        boat.boostReadyAt = Math.max(boat.t, boat.boostReadyAt - NEAR_GAIN * boostCd(boat.windLv));
      }
    }
    if ((Math.abs(rel) < 1.0 || passed) && isHit(dx, boat.boatId, it.kind)) {  // 💥 충돌
      a.taken = true;
      if (boat.t < boat.invUntil) continue;                      // 무적 시간(연속 피격 방지)
      const out = obstacleOutcome(boat.boatId, it.kind, { diving, ramLeft: boat.ramLeft });
      if (out === 'pass') continue;
      if (out === 'push') { a.x = clampW(a.x + (Math.sign(a.x - bx) || 1) * 2.4, RIVER_OBS.log.r); a.mesh.position.x = a.x; Sound.water(); continue; }
      if (out === 'ram') { boat.ramLeft--; boat.speed *= 0.5; Sound.build(); spawnSplash(player.position.x, 0.5, player.position.z - 1.5, 6, 1.2); continue; }
      boat.lamps--; boat.hits++;
      boat.hitLog.push({ d: Math.round(boat.dist), kind: it.kind, seg });   // [분석] 어디서 부딪혔나
      // 💥 충돌 연출: 그냥 통과하지 않는다 — 장애물 앞으로 튕겨나 급정거,
      //    부딪힌 쪽 반대로 미끄러지며 출렁 → 잦아들면 노를 저어 다시 출발(updateBoatRun)
      boat.stunUntil = boat.t + 1.15;
      boat.invUntil = boat.stunUntil + 1.0;      // 재출발 직후 같은 장애물 스침은 봐줌
      boat.speed = 0;
      boat.dist = Math.max(0, boat.dist - 1.6);  // 뒤로 튕겨 장애물 앞에 멈춤
      boat.vx = (Math.sign(bx - a.x) || (Math.random() < 0.5 ? -1 : 1)) * 5;   // 옆으로 밀려나 비켜남
      boat.shake = 1.3;
      Sound.build();
      spawnDust(player.position.x, player.position.z, 10);
      spawnSplash(player.position.x, 0.5, player.position.z - 1.5, 10, 1.5);   // 물보라 팍!
      // 배 앞쪽에 작게 — 세로 화면(모바일)의 좁은 가로 시야각 안에 들어오게
      spawnFloatText(player.position.x, 1.9, player.position.z - 10, boat.lamps > 0 ? `💥 -1 (💡${boat.lamps})` : '💥 배가 가라앉아요…', '#d9534f', 0.8);
      trackEvent('boat_hit', { obstacle: it.kind, dist_m: Math.round(boat.dist), seg, lamps_left: boat.lamps }); // [GA4] 난이도 튜닝
      if (boat.lamps <= 0) {                       // 🌊 마지막 충돌: 충돌 지점에서 배가 기울며 가라앉는 연출 → 결과 화면
        boat.wreckAt = boat.t + 1.9;
        Sound.water();
        return;
      }
    }
  }
}

export function updateBoatCamera(dt) {
  const shake = boat.shake * 0.18;
  if (boatView === 'third') {
    _camTarget.set(player.position.x * 0.6, 5.2, player.position.z + 9);
    camera.position.lerp(_camTarget, 1 - Math.pow(0.008, dt));
    camera.lookAt(player.position.x, 0.9, player.position.z - 6);
    return;
  }
  // 노 젓는 자리(뱃전 안쪽)에서 뱃머리 너머를 본다 — 배 안쪽 구조물이 시야를 막지 않는 위치
  const bob = Math.sin(boat.t * 3.2) * 0.045;
  _camTarget.set(player.position.x + (Math.random() - 0.5) * shake, 1.5 + bob, player.position.z + 0.55);
  camera.position.lerp(_camTarget, 1 - Math.pow(0.0001, dt));   // 배 위치를 거의 즉시 따라감
  _camLook.lerp(_camTarget.set(player.position.x + boat.vx * 0.35, 1.05, player.position.z - 14), 1 - Math.pow(0.02, dt));
  camera.lookAt(_camLook);
}

export function updateRiverInteract() {
  $w.nearBoat = false; $w.nearBoatShop = false;
  const lx = player.position.x - RIVER.x, lz = player.position.z - RIVER.z;
  if (Math.hypot(lx, lz + RIVER_DOCK_HALF + 1.4) < 2.6) {
    $w.nearBoat = true;
    const left = boatRunsLeft();
    return left > 0 ? `🛶 나룻배 타기 (오늘 ${left}/${BOAT_RUNS_PER_DAY}회 남음)${chestHintNow() ? ' · 🧰 보물상자' : ''}` : '🛶 오늘은 다 탔어요. 내일 새 물길이 열려요';
  }
  if (Math.hypot(lx + RIVER_DOCK_HALF - 2, lz - 1.6) < 2.6) {
    $w.nearBoatShop = true;
    return `🧰 뱃사공의 창고 (⭐${gameState.inventory.star || 0})`;
  }
  return null;
}
