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
  ui, wantAction, woodMat,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))
import { trackEvent } from '../analytics.js';
import { BOAT_LAMP, BOAT_LAMP_POST } from '../boat-lamp.js';
import { BOAT_BASE_SPEED, BOAT_BOOST_CD, BOAT_LAMPS, BOAT_RUNS_PER_DAY, BOAT_UPGRADES, DOCK_GATE, DOCK_POND, DOCK_POND_R, RIVER, RIVER_DOCK_HALF, RIVER_LEN, RIVER_OBS, RIVER_PICKS, RIVER_W } from '../data/places.js';
import { PAL } from '../data/world.js';
import { logEcon } from '../metrics.js';
import { Sound } from '../sound.js';
import { sendBoatRun } from '../supabase-client.js';
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
  g.add(makeSignpost('🛶 나루터', 0, 1.6));
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffcf6a, emissiveIntensity: 0.8 }));
  lamp.position.set(-2.2, 1.5, 0.6); g.add(lamp);   // 물가 잔디 위(연못 밖)에 세움
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.5, 6), woodMat(1, 1, 0x8a6540));
  pole.position.set(-2.2, 0.75, 0.6); g.add(pole);
  scene.add(g); $w.dockGroup = g;
  obstacles.push({ x: DOCK_POND.x, z: DOCK_POND.z, r: DOCK_POND_R + 0.5 });   // 연못 위엔 밭 금지
  solidCircle(DOCK_POND.x, DOCK_POND.z, DOCK_POND_R - 0.3);                    // 🚧 물엔 못 들어감(물가에서 막힘)
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

export function boatLampMax() { return BOAT_LAMPS + (gameState.boat.up.hull || 0); }

// 🧰 창고 UI 데이터 — index.html 이 렌더
export function boatShopView() {
  const inv = gameState.inventory;
  return {
    star: inv.star || 0, coins: inv.coins || 0,
    best: gameState.boat.best || 0, clears: gameState.boat.clears || 0, runsLeft: boatRunsLeft(), runsMax: BOAT_RUNS_PER_DAY,
    items: BOAT_UPGRADES.map(u => {
      const lv = gameState.boat.up[u.id] || 0;
      const next = lv < u.max ? u.cost[lv] : null;
      return {
        id: u.id, name: u.name, ico: u.ico, desc: u.desc, lv, max: u.max, cost: next,
        affordable: !!next && (inv.star || 0) >= next.star && (inv.coins || 0) >= next.coins,
      };
    }),
  };
}

export function buyBoatUpgrade(id) {
  const u = BOAT_UPGRADES.find(x => x.id === id); if (!u) return { ok: false };
  const lv = gameState.boat.up[id] || 0;
  if (lv >= u.max) return { ok: false, msg: '이미 최고 단계예요' };
  const c = u.cost[lv];
  if ((gameState.inventory.star || 0) < c.star) return { ok: false, msg: `⭐별조각이 부족해요 — ${gameState.inventory.star || 0}/${c.star}` };
  if ((gameState.inventory.coins || 0) < c.coins) return { ok: false, msg: `🪙코인이 부족해요 — ${gameState.inventory.coins || 0}/${c.coins}` };
  gameState.inventory.star -= c.star;
  gameState.inventory.coins -= c.coins;
  gameState.boat.up[id] = lv + 1;
  logEcon('boat_upgrade', `${id}:${lv + 1}`, -c.coins, gameState.inventory.coins);   // [원장] 코인 싱크
  refreshInventoryUI(); Sound.build(); spawnSparkle(player.position.x, 1.5, player.position.z, 18);
  trackEvent('boat_upgrade', { item: id, level: lv + 1, star_cost: c.star, coin_cost: c.coins });   // [GA4] 성장 퍼널
  return { ok: true, name: u.name, ico: u.ico, lv: lv + 1 };
}

export function enterRiver() {
  $w.atRiver = true;
  player.position.set(RIVER.x, 0, RIVER.z + RIVER_DOCK_HALF - 1.6); player.rotation.y = Math.PI;
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null;
  snapCamera(); setSpaceVisible();
  firstHint('riverDock', '🛶', '나루터',
    '나룻배 앞에서 액션 → 강 내려가기 (하루 3번)\n⬅️➡️ 피하고 액션으로 스퍼트!\n⭐별조각으로 🧰창고에서 배 강화');
  Sound.blip();
  trackEvent('boat_enter', { runs_left: boatRunsLeft(), night: isNight(), weather: WEATHER });   // [GA4] 유입
}

export function exitRiver() {
  if (boat.active) endBoatRun('quit');
  $w.atRiver = false;
  player.position.set(DOCK_GATE.x, 0, DOCK_GATE.z + 2.2);
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null;
  snapCamera(); setSpaceVisible();
  Sound.blip(); trackEvent('boat_exit');   // [GA4]
}

// mulberry32 — 시드 하나로 재현 가능한 난수열(같은 날·같은 회차면 코스가 똑같음)
export function mulberry32(a) {
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clampW(x, pad = 1.1) { return Math.max(-RIVER_W + pad, Math.min(RIVER_W - pad, x)); }

export function buildCourse(seed, night) {
  riverCourse.length = 0;
  const rnd = mulberry32(seed);
  let d = 46;                                     // 첫 장애물까지 여유(가속·조작 적응 구간)
  while (d < RIVER_LEN - 24) {
    const p = d / RIVER_LEN;                      // 진행도 0~1 (구간 1/2/3)
    //  1구간은 넉넉하게(조작을 익히는 구간) → 갈수록 촘촘해짐
    const gap = (p < 0.34 ? 26 : p < 0.67 ? 17 : 12.5) + rnd() * 8;
    const kinds = p < 0.34 ? ['rock', 'rock', 'log']
      : p < 0.67 ? ['rock', 'log', 'whirl', 'rock']
        : ['rock', 'log', 'whirl', 'pile', 'rock'];
    const kind = kinds[Math.floor(rnd() * kinds.length)];
    if (kind === 'pile') {                        // 🪧 다리 기둥 — 좁은 문(쌍으로)
      const gx = (rnd() * 2 - 1) * (RIVER_W - 3);
      riverCourse.push({ d, kind: 'pile', x: gx - 2.4 });
      riverCourse.push({ d, kind: 'pile', x: gx + 2.4 });
    } else {
      riverCourse.push({ d, kind, x: clampW((rnd() * 2 - 1) * RIVER_W, RIVER_OBS[kind].r + 0.3), drift: kind === 'log' ? (rnd() * 2 - 1) * 0.7 : 0 });
    }
    // ⭐ 별조각 라인 — 장애물 사이 빈틈에 곡선으로. "피하면서 줍는" 동선을 만듦
    if (rnd() < 0.78) {
      const n = 3 + Math.floor(rnd() * 3);
      const sx = (rnd() * 2 - 1) * (RIVER_W - 1.4), curve = (rnd() * 2 - 1) * 0.9;
      for (let i = 0; i < n; i++) riverCourse.push({ d: d + gap * 0.42 + i * 2.7, kind: 'star', x: clampW(sx + curve * i) });
    }
    // 🪷 희귀 수집물 — 드물게, 살짝 위험한 자리에(밤 전용은 밤에만)
    if (rnd() < 0.22) {
      const cands = RIVER_PICKS.filter(k => !k.night || night);
      const k = cands[Math.floor(rnd() * cands.length)];
      riverCourse.push({ d: d + gap * 0.68, kind: 'pick', pick: k.id, x: clampW((rnd() * 2 - 1) * RIVER_W, 1.3) });
    }
    d += gap;
  }
  riverCourse.sort((a, b) => a.d - b.d);
}

export function makeRiverMesh(kind, pickId) {
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
    ui.showHintModal?.({ ico: '🛶', title: '오늘은 여기까지', body: `나룻배는 하루 ${BOAT_RUNS_PER_DAY}번까지 탈 수 있어요. 내일 새로운 물길(코스)이 열려요. 또 만나요!` });
    return;
  }
  st.count += 1;
  boat.runNo = st.count;
  boat.night = isNight();
  // 날짜+회차 시드 — 새로고침해도 같은 코스(리롤 불가) + 그날 전원 동일 코스(실력 비교 가능)
  boat.seed = dateHash('river:' + boat.runNo);
  buildCourse(boat.seed, boat.night);
  Object.assign(boat, {
    active: true, dist: 0, speed: BOAT_BASE_SPEED, vx: 0, lamps: boatLampMax(), stars: 0,
    hits: 0, hitLog: [], picks: {}, boostUntil: 0, boostReadyAt: 0, boostUsed: 0,
    invUntil: 0, stunUntil: 0, wreckAt: 0, shake: 0, next: 0, startedAt: performance.now(), t: 0,
  });
  clearRiverObjects();
  if (!boat.group) { boat.group = makeBoatRideable(); scene.add(boat.group); }
  boat.group.visible = true;
  const lit = !!(boat.night && gameState.boat.up.lamp);   // 🏮 밤 + 등불 업그레이드일 때만 점등
  boat.group.userData.lantern.visible = lit;
  boat.group.userData.light.intensity = lit ? 2.4 : 0;    // 등불 자체는 어둡게, 대신 **앞쪽 물길**을 더 밝힌다
  playerAnchor.visible = (boatView === 'third');     // 1인칭이면 캐릭터를 숨김(시야 방해 방지)
  if (heldGroup) heldGroup.visible = false;          // 🛶 배 위에선 도구를 내려놓는다(두 손으로 노를 잡는 느낌)
  playerAnchor.position.y = 0; playerAnchor.rotation.set(0, 0, 0);   // 노 젓기 자세 초기화
  boat.group.rotation.set(0, 0, 0); boat.group.position.y = 0;       // 지난 런의 침몰 자세 초기화
  if (riverGroup?.userData.moored) riverGroup.userData.moored.visible = false;   // 정박 배 숨김(출발 지점 겹침 방지)
  player.position.set(RIVER.x, 0, RIVER.z - RIVER_DOCK_HALF - 2); player.rotation.y = Math.PI;
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null;
  ui.setBoatRun?.(true);
  Sound.water();
  const up = gameState.boat.up;
  trackEvent('boat_start', {                                   // [GA4] 런 시작(코스 시드까지 남김)
    run_no: boat.runNo, seed: boat.seed, night: boat.night, weather: WEATHER,
    lamps: boat.lamps, up_oar: up.oar, up_hull: up.hull, up_lamp: up.lamp,
  });
}

// 실제 타는 배 — 선체 + 좌우 노(젓는 모션). 1인칭에서 화면 아래 양옆에 노가 보인다
export function makeBoatRideable() {
  const g = new THREE.Group();
  g.add(makeBoatHull(1.05));
  // 노 — 1인칭에서 화면 아래 양옆으로 뻗게(시야 정중앙을 가리지 않도록 낮고 눕혀서)
  for (const side of [-1, 1]) g.add(makeOar(side));
  // 🏮 뱃머리 등불 — 업그레이드를 샀고 밤일 때만 켜진다(밤 주행의 체감 보상)
  //   예전엔 구 하나를 시선 바로 아래 정중앙(0, 0.95, -1.9)에 박아 뒀다 → 밤에 블룸(임계 0.85)까지
  //   타면서 8~15m 앞 바위가 통째로 후광에 묻혔다("등불 단 게 더 안 보여요").
  //   → 뱃전 왼쪽 기둥에 매달아 **시선 위**로 올리고, 발광도 후광이 번지지 않는 선까지 낮춘다.
  //   → 배치 근거·회귀 테스트: js/boat-lamp.js + tests/boat-lamp.test.mjs
  const lantern = new THREE.Group();
  const P = BOAT_LAMP_POST, dark = clayMat(0x6f4c2e, false);   // 어두운 나무 — 밝은 막대는 그 자체로 시선을 끈다
  // 뱃전 왼쪽에 세운 가는 기둥. 화면을 세로로 긋긴 하지만 20m 앞 바위 폭의 1/3 도 안 된다.
  //   ⚠️ "카메라 뒤(z>0.55)에 세우면 안 보인다"는 함정이다 — 1인칭 카메라는 달릴수록 뒤로 밀려서
  //     z 0.95 에 세운 돛대가 화면 왼쪽에 통나무처럼 잡혔다. js/boat-lamp.js EYE_Z_RANGE 참고.
  const post = new THREE.Mesh(new THREE.CylinderGeometry(P.r, P.r * 1.3, P.top - P.bottom, 6), dark);
  post.position.set(P.x, (P.top + P.bottom) / 2, P.z);
  lantern.add(post);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(BOAT_LAMP.r, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xf2d79a, emissive: 0xe8a93c, emissiveIntensity: 0.9 }));
  //   ⚠️ 색은 휘도 0.68 — UnrealBloomPass 임계(0.85) 아래다. 흰끼가 도는 색(0xffe9a8, 휘도 0.93)으로
  //      되돌리면 세기를 아무리 낮춰도 후광이 번져 다시 앞이 안 보인다.
  globe.position.set(BOAT_LAMP.x, BOAT_LAMP.y, BOAT_LAMP.z);
  lantern.add(globe);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(BOAT_LAMP.r * 1.3, 0.13, 6), dark);
  cap.position.set(BOAT_LAMP.x, BOAT_LAMP.y + BOAT_LAMP.r + 0.04, BOAT_LAMP.z);   // 갓 — 위로 새는 빛을 가려 하늘이 덜 밝다
  lantern.add(cap);
  lantern.visible = false; g.add(lantern);
  // 빛은 뱃머리보다 앞·위에서 떨어뜨린다 — 코앞 물살이 하얗게 타지 않고 10~25m 앞이 밝아진다
  const light = new THREE.PointLight(0xffd79a, 0, 34, 1.2);
  light.position.set(0, 2.0, -5.0); g.add(light);
  g.userData.lantern = lantern; g.userData.light = light;
  return g;
}

export function endBoatRun(result) {
  if (!boat.active) return;
  boat.active = false;
  const timeSec = Math.round((performance.now() - boat.startedAt) / 100) / 10;
  const distM = Math.round(boat.dist);
  const rareCount = Object.values(boat.picks).reduce((a, b) => a + b, 0);
  const up = gameState.boat.up;
  // ⭐ 보상 — 🌧️비(물살↑)·🌙밤+🏮등불 보너스, 완주/무피해 보너스. 코인은 주지 않음(인플레 방지)
  const rainBonus = RAIN_DAY ? 1.15 : 1;
  const lampBonus = (boat.night && up.lamp) ? 1.2 : 1;
  let stars = Math.round(boat.stars * rainBonus * lampBonus);
  if (result === 'clear') stars += 5;
  if (result === 'clear' && boat.hits === 0) stars += 5;              // 🏆 무피해 완주
  const give = { star: stars };
  for (const id in boat.picks) {                                       // 희귀 수집물 → 재료
    const k = RIVER_PICKS.find(x => x.id === id); if (!k) continue;
    for (const res in k.give) give[res] = (give[res] || 0) + k.give[res] * boat.picks[id];
  }
  const score = distM + boat.stars * 8 + rareCount * 40 + (result === 'clear' ? 200 : 0);
  const best = score > (gameState.boat.best || 0);
  if (best) gameState.boat.best = score;
  if (result === 'clear') {
    gameState.boat.clears = (gameState.boat.clears || 0) + 1;
    boatDaily().clearsToday = (gameState.boat.clearsToday || 0) + 1;   // 오늘치 — 🛶 의뢰는 이 값을 읽는다
    refreshCollectQuests();   // 보상(giveReward)은 별조각·희귀가 있을 때만 나가므로 여기서 직접 갱신한다
  }
  if (result === 'clear' && boat.hits === 0) gameState.boat.perfect = (gameState.boat.perfect || 0) + 1;   // 🌊 무피해 완주(배지 소급용)

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
    upgrades: { ...up },
  };
  trackEvent('boat_end', {                                             // [GA4] 완주율·이탈 지점 KPI
    result, run_no: boat.runNo, dist_m: distM, time_sec: timeSec, score, hits: boat.hits,
    stars, rare: rareCount, boost_used: boat.boostUsed, night: boat.night, weather: WEATHER, best,
  });
  sendBoatRun(payload);                                                // [분석] 런 단위 1행(boat_runs)
  ui.showBoatResult?.({
    ...payload, rare: rareCount, runsLeft: boatRunsLeft(), runsMax: BOAT_RUNS_PER_DAY,
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
      boat.group.children.forEach(c => { if (c.userData.side) c.rotation.x = 0.85; }); // 노를 놓침
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
  let sp = BOAT_BASE_SPEED * (1 + p * 0.55) * (RAIN_DAY ? 1.12 : 1);
  if (boosting) sp *= 1.5;
  if (stunned) sp = 0;                               // 충돌: 완전히 멈춘다(통과 금지)
  boat.speed += (sp - boat.speed) * Math.min(1, dt * (stunned ? 12 : 4));   // 충돌 시 급정거, 재출발은 원래 가속
  boat.dist += boat.speed * dt;

  // 조향 — 키보드(A/D·←/→) 또는 조이스틱 x. 🚣노 업그레이드로 반응이 빨라짐
  //        충돌 출렁임 중엔 잠금(부딪혀 밀려나는 vx 만 자연 감쇠)
  const oar = gameState.boat.up.oar || 0;
  let steer = 0;
  if (!stunned) {
    if (keys.isDown('ArrowLeft') || keys.isDown('KeyA')) steer -= 1;
    if (keys.isDown('ArrowRight') || keys.isDown('KeyD')) steer += 1;
    if (Math.abs(analog.x) > 0.12) steer += analog.x;
    steer = Math.max(-1, Math.min(1, steer));
  }
  const acc = 26 + oar * 7, maxVx = 6.2 + oar * 1.4;
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
      boat.boostUntil = boat.t + 1.5; boat.boostReadyAt = boat.t + BOAT_BOOST_CD; boat.boostUsed++;
      Sound.water(); spawnSplash(player.position.x, 0.6, player.position.z + 1.5, 6, 1.3);
    }
  }

  updateRiverObjects(dt, t, seg);
  if (!boat.active) return;                          // 위에서 난파 처리됐으면 종료

  // 배 메시 — 위치·기울기(조향 방향으로 롤) + 노 젓기 모션
  if (boat.group) {
    boat.group.position.set(player.position.x, 0, player.position.z);
    boat.group.rotation.y = (-boat.vx / maxVx) * 0.16;   // 뱃머리는 모델 로컬 -z = 진행 방향
    boat.group.rotation.z = (boat.vx / maxVx) * 0.13;
    boat.group.position.y = Math.sin(boat.t * 3.2) * 0.05;
    if (stunned) {
      // 💥 충돌 연출: 크게 출렁이며 앞뒤로 갸우뚱 — 시간이 지나며 잦아듦. 노는 놀라서 들어올림
      const k = Math.max(0, (boat.stunUntil - boat.t) / 1.15);
      boat.group.rotation.z += Math.sin(boat.t * 16) * 0.15 * k;
      boat.group.rotation.x = Math.sin(boat.t * 12) * 0.1 * k;
      boat.group.position.y += Math.sin(boat.t * 9) * 0.06 * k;
      boat.group.children.forEach(c => { if (c.userData.side) c.rotation.x = 0.7 * k; });
      // 캐릭터도 배와 함께 휘청(3인칭)
      playerAnchor.position.y = boat.group.position.y;
      playerAnchor.rotation.x = 0.1;
      playerAnchor.rotation.z = Math.sin(boat.t * 16) * 0.18 * k;
    } else {
      boat.group.rotation.x = 0;
      // 🚣 재출발·스퍼트 중엔 노를 빠르고 깊게 젓는다 — "다시 출발!" 이 눈에 보이게
      const fast = boosting || restarting;
      const stroke = Math.sin(boat.t * (fast ? 11 : 5.5));
      boat.group.children.forEach(c => { if (c.userData.side) c.rotation.x = stroke * (fast ? 0.55 : 0.32); });
      // 🚣 캐릭터도 노와 같은 위상으로 상체를 앞뒤로 — 젓는 사람이 보이게(3인칭)
      playerAnchor.position.y = boat.group.position.y + Math.abs(stroke) * 0.05;   // 배 출렁임 + 젓는 들썩임
      playerAnchor.rotation.x = 0.12 + stroke * (fast ? 0.24 : 0.14);              // 앞으로 숙였다 젖혔다
      playerAnchor.rotation.z = (boat.vx / maxVx) * 0.13;                          // 배 롤을 따라 기울기
    }
  }
  if (boat.shake > 0) boat.shake = Math.max(0, boat.shake - dt * 2.4);

  // 물보라(뱃머리) — 가끔씩만 뿌려 부담 최소화(📱 모바일은 더 드물게). 재출발 땐 노 뒤로 물살
  const sprayP = stunned ? 0 : IS_MOBILE ? ((boosting || restarting) ? 0.25 : 0.08) : ((boosting || restarting) ? 0.5 : 0.2);
  if (Math.random() < sprayP) spawnSplash(player.position.x, 0.35, player.position.z - 2.4, 2);

  ui.setBoatHud?.({
    p, seg, dist: Math.round(boat.dist), total: RIVER_LEN,
    lamps: boat.lamps, lampMax: boatLampMax(), stars: boat.stars,
    boost: boosting ? 1 : Math.min(1, 1 - (boat.boostReadyAt - boat.t) / BOAT_BOOST_CD),
    boosting, speed: Math.round(boat.speed * 3.6),
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
    const y = item.kind === 'whirl' ? 0.12 : item.kind === 'star' || item.kind === 'pick' ? 0.85 : item.kind === 'pile' ? 1.3 : 0.35;
    mesh.position.set(item.x, y, -RIVER_DOCK_HALF - 2 - item.d);
    riverActive.push({ mesh, item, x: item.x, taken: false, prevRel: Infinity });
  }
  const bx = player.position.x - RIVER.x;
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
    if (a.taken) continue;
    const dx = Math.abs(a.x - bx);
    if (it.kind === 'star' || it.kind === 'pick') {              // 획득
      if ((Math.abs(rel) < 1.4 || passed) && dx < 1.5) {
        a.taken = true; a.mesh.visible = false;
        if (it.kind === 'star') { boat.stars++; Sound.blip(); }
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
      if (Math.abs(rel) < meta.r && dx < meta.r + 1) boat.vx += (a.x - bx) * dt * 5.5;
      continue;
    }
    if ((Math.abs(rel) < 1.0 || passed) && dx < meta.r + 0.7) {  // 💥 충돌
      a.taken = true;
      if (boat.t < boat.invUntil) continue;                      // 무적 시간(연속 피격 방지)
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
    return left > 0 ? `🛶 나룻배 타기 (오늘 ${left}/${BOAT_RUNS_PER_DAY}회 남음)` : '🛶 오늘은 다 탔어요. 내일 새 물길이 열려요';
  }
  if (Math.hypot(lx + RIVER_DOCK_HALF - 2, lz - 1.6) < 2.6) {
    $w.nearBoatShop = true;
    return `🧰 뱃사공의 창고 (⭐${gameState.inventory.star || 0})`;
  }
  return null;
}
