// =============================================================
//  ⛏️ 채굴 동굴 (구역 머리말 — 분리 2단계)
//  ------------------------------------------------------------
//  js/game.js 에서 원문 그대로 옮겨 온 구역(분리 2단계, 2026-09-26).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 에 남은 let 에 쓸 때는 `$w.x = …` (읽기는 그냥 x). 도구·증명: tools/refactor/
// =============================================================
import {
  $w, ORES, atMine, buffOn, clayMat, clock, dexDiscover, dist2D, doPlayerAction, firstHint, gameState, makeSignBoard,
  mineGroup, mineTorches, nearDoor, obstacles, oreRocks, player, questEvent, refreshInventoryUI, scene, setSpaceVisible,
  situation, snapCamera, solidBox, solidCircle, spawnDust, spawnFloatText, spawnSparkle, trackGateBlocked,
  ui, woodMat,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))
import { trackEvent } from '../analytics.js';
import { MINE, MINE_GATE, MINE_HALF } from '../data/places.js';
import { DEX_GATES, gateOf, gateOpen } from '../dex-gates.js';
import { Sound, setBGMTheme } from '../sound.js';
import { mineHitPower } from '../tool-tiers.js';
import * as THREE from 'three';

// 💎 보석은 🌫️안개 낀 날에만(그 안에서 28%). 표는 js/dex-gates.js
//   ⚠️ 광맥은 **스폰 시** 종류가 정해지고 재생성(14초) 때 바뀌지 않는다(spawnOreRock 의 userData.ore).
//      즉 동굴을 지을 때의 날씨가 그 세션 광맥 구성을 정한다 — 안개 낀 날 동굴에 가야 한다.
//   ⚠️ rollKind 를 쓰지 않는다: 누적 확률 구조가 아니고, 여기가 이미 WEATHER 를 보던 자리다.
//   실측 — 맑음 돌61/석탄39/보석0 · 안개 돌44/석탄28/보석28 (원래는 돌55/석탄35/보석10, 안개 20)
export function weightedOre() {
  const gemP = gateOpen(gateOf('ore', 'gem'), situation()) ? DEX_GATES.ore.gem.p : 0;
  const r = Math.random();
  if (r < gemP) return ORES[2];                    // 💎 보석
  const t = (r - gemP) / (1 - gemP);               // 나머지를 0~1 로 다시 펴서 원래 55:35 비율 유지
  return t < 0.55 / 0.9 ? ORES[0] : ORES[1];
}

export function spawnOreRock(x, z, ore) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const rockMat = clayMat(0x5a5854, false);
  for (let i = 0; i < 3; i++) { const r = 0.34 + Math.random() * 0.24; const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), rockMat); b.position.set((Math.random() - 0.5) * 0.5, r * 0.7, (Math.random() - 0.5) * 0.5); b.castShadow = true; g.add(b); }
  const oreMat = ore.id === 'gem'
    ? new THREE.MeshStandardMaterial({ color: ore.color, emissive: ore.color, emissiveIntensity: 0.5, roughness: 0.3 })
    : clayMat(ore.color, false);
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), oreMat); b.position.set((Math.random() - 0.5) * 0.6, 0.3 + Math.random() * 0.4, (Math.random() - 0.5) * 0.6); g.add(b); }
  // 🚧 광맥 바위(채굴 사거리 2.4 는 그대로). 캐서 사라진 동안엔 통과 가능.
  g.userData = { ore, hp: 3, depleted: false, respawnAt: 0, growing: false, collider: solidCircle(x, z, 0.7) };
  scene.add(g); oreRocks.push(g);
}

export function buildMine() {
  const g = new THREE.Group(); g.position.copy(MINE);
  const H = MINE_HALF;
  // 어둡고 거친 바닥
  const floor = new THREE.Mesh(new THREE.BoxGeometry(H * 2 + 3, 0.2, H * 2 + 3), clayMat(0x3a3a40, false)); floor.position.y = 0.05; floor.receiveShadow = true; g.add(floor);
  // 공용 바위 지오/머티리얼(플랫셰이딩 = 각진 로우폴리 바위)
  const rockGeo = new THREE.IcosahedronGeometry(1, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x565b66, roughness: 1, metalness: 0, flatShading: true });
  const rock = (x, y, z, sx, sy, sz, cast) => {
    const b = new THREE.Mesh(rockGeo, rockMat); b.position.set(x, y, z); b.scale.set(sx, sy, sz);
    b.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * 6, (Math.random() - 0.5) * 0.4);
    if (cast) b.castShadow = true; g.add(b); return b;
  };
  // 울퉁불퉁 바위 벽(플랫 박스 대신) — 둘레를 따라 크고작은 바위 겹쳐 쌓기
  const step = 1.05;
  for (let t = -H; t <= H + 0.01; t += step) {
    const s = () => 0.75 + Math.random() * 0.9, sy = () => 1.6 + Math.random() * 2.0;
    rock(t, sy() * 0.5, H + 0.3, s(), sy(), s(), true);          // 북
    rock(H + 0.3, sy() * 0.5, t, s(), sy(), s(), true);          // 동
    rock(-H - 0.3, sy() * 0.5, t, s(), sy(), s(), true);         // 서
    if (Math.abs(t) > 1.4) rock(t, sy() * 0.5, -H - 0.3, s(), sy(), s(), true); // 남(가운데 문 구멍 제외)
    // 안쪽 낮은 바위 한 겹(깊이감)
    if (Math.random() < 0.6) rock(t * 0.96, 0.4, (H - 0.6) * (Math.random() < 0.5 ? 1 : -1), s() * 0.7, 0.5 + Math.random() * 0.5, s() * 0.7, false);
  }
  // 종유석/석순 몇 개(위로 뾰족)
  for (let i = 0; i < 9; i++) {
    const a = Math.random() * 6, r = H - 1 - Math.random() * 2;
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.28 + Math.random() * 0.3, 1 + Math.random() * 1.6, 6), rockMat);
    c.position.set(Math.cos(a) * r, 0.6, Math.sin(a) * r); c.rotation.y = Math.random() * 6; c.castShadow = true; g.add(c);
  }
  // 바닥 돌기(자잘한 바위)
  for (let i = 0; i < 14; i++) rock((Math.random() - 0.5) * (H * 2 - 2), 0.06, (Math.random() - 0.5) * (H * 2 - 2), 0.3 + Math.random() * 0.4, 0.14 + Math.random() * 0.2, 0.3 + Math.random() * 0.4, false);
  // 나가는 문 표지판(남쪽 구멍)
  const board = makeSignBoard('🚪 나가기'); board.scale.setScalar(0.7); board.position.set(0, 2.0, -H - 0.1); g.add(board);   // 문을 지나는 머리 위로
  scene.add(g); $w.mineGroup = g; mineGroup.visible = false;   // 동굴에 있을 때만 표시
  // 위쪽 은은한 푸른 필(깊이감)
  const glow = new THREE.PointLight(0x9ac4ff, 0.5, 44, 1.2); glow.position.set(MINE.x, 7, MINE.z); scene.add(glow);
  // 벽 횃불(사이드) — 넓은 동굴 곳곳을 밝힘
  const torchPos = [
    [-H + 0.6, -5], [-H + 0.6, 5], [H - 0.6, -5], [H - 0.6, 5],
    [-5, H - 0.6], [5, H - 0.6], [-5, -H + 0.6], [5, -H + 0.6], [0, 0],
  ];
  torchPos.forEach(([lx, lz], i) => {
    const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.45, 5), clayMat(0x3a3834)); bracket.position.set(lx, 1.55, lz); g.add(bracket);
    const fm = new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xff8a3a, emissiveIntensity: 1.7, roughness: 0.5 });
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.34, 6), fm); flame.position.set(lx, 1.95, lz); g.add(flame);
    const light = new THREE.PointLight(0xffb866, 2.2, 15, 1.2); light.position.set(lx, 2.05, lz); g.add(light);
    mineTorches.push({ light, fm, base: 2.2, phase: i * 1.6 });
  });
  // 광맥 배치(넓어진 동굴)
  for (let i = 0; i < 15; i++) {
    const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * (H - 2.5);
    spawnOreRock(MINE.x + Math.cos(a) * r, MINE.z + Math.sin(a) * r, weightedOre());
  }
}

export function spawnMineGate() {
  const g = new THREE.Group(); g.position.copy(MINE_GATE);
  // 입구는 정면(+z)을 향함
  const rockGeo = new THREE.IcosahedronGeometry(1, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x565b66, roughness: 1, metalness: 0, flatShading: true });
  // 어두운 입구 구멍
  const hole = new THREE.Mesh(new THREE.CircleGeometry(1.35, 20), new THREE.MeshBasicMaterial({ color: 0x080a0e }));
  hole.position.set(0, 1.35, 0.06); g.add(hole);
  // 구멍 둘레를 바위로 둘러싸 아가리 형태
  const N = 14;
  for (let i = 0; i <= N; i++) {
    const ang = Math.PI * (i / N);                 // 윗 반원 아치
    const rad = 1.8 + Math.random() * 0.35;
    const b = new THREE.Mesh(rockGeo, rockMat);
    b.position.set(Math.cos(ang) * rad, 1.25 + Math.sin(ang) * rad, (Math.random() - 0.5) * 0.4);
    const s = 0.55 + Math.random() * 0.7; b.scale.set(s, s * (1 + Math.random() * 0.6), s);
    b.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); b.castShadow = true; g.add(b);
  }
  // 입구 양옆 바닥의 큰 바위 무더기
  [-2.0, 2.0].forEach(x => { const b = new THREE.Mesh(rockGeo, rockMat); b.position.set(x, 0.7, 0.2); b.scale.set(1.2, 1.5, 1.2); b.rotation.y = Math.random() * 6; b.castShadow = true; g.add(b); });
  // 서 있는 팻말(나무 기둥 + 판) — 입구 앞 오른쪽
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.7, 6), woodMat(1, 1)); post.position.set(2.7, 0.85, 1.4); post.castShadow = true; g.add(post);
  const sign = makeSignBoard('⛏️ 채굴장'); sign.scale.setScalar(0.62); sign.position.set(2.7, 1.62, 1.45); g.add(sign);
  scene.add(g);
  obstacles.push({ x: MINE_GATE.x, z: MINE_GATE.z, r: 1.8 });
  // 🚧 바위 더미는 사각으로 — 입구(+z)만 열어 두고 나머지를 막는다.
  //    (원으로 막으면 아치 안으로 못 들어가 입장 판정 2.0 을 못 채움)
  solidBox(MINE_GATE.x - 2.4, MINE_GATE.z - 1.7, MINE_GATE.x + 2.4, MINE_GATE.z + 0.15);
  // 🚧 양옆 바닥 바위 무더기 — 사각 밖(|x|>2.4)으로 파고들면 바위 속에 끼던 문제
  [-2.0, 2.0].forEach(x => solidCircle(MINE_GATE.x + x, MINE_GATE.z + 0.2, 1.1));
  solidCircle(MINE_GATE.x + 2.7, MINE_GATE.z + 1.4, 0.3);   // 🚧 팻말 기둥
}

export function enterMine() {
  $w.atMine = true;
  ui.setMine?.(true);   // ⛏️ 우상단 자원칩 → 🪨⚫💎 (마을 자원은 가방에서 그대로 볼 수 있다)
  player.position.set(MINE.x, 0, MINE.z - MINE_HALF + 3); player.rotation.y = 0;
  $w.nearDoor = null; ui.setDoorPrompt?.(null); snapCamera(); setSpaceVisible();
  firstHint('mineInside', '⛏️', '채굴 동굴', '⛏️괭이로 광맥 캐기 → 돌·석탄·💎보석\n작업대 재료·상점 판매에 써요. 나갈 땐 남쪽 문');
  setBGMTheme('cave');   // 🎵 음산한 동굴 테마
  Sound.blip(); trackEvent('enter_mine'); // [GA4]
}

export function exitMine() {
  $w.atMine = false;
  ui.setMine?.(false);
  player.position.set(MINE_GATE.x, 0, MINE_GATE.z + 2);
  $w.nearDoor = null; ui.setDoorPrompt?.(null); snapCamera(); setSpaceVisible();
  setBGMTheme('main');   // 🎵 마을 테마 복귀
  Sound.blip(); trackEvent('exit_mine'); // [GA4]
}

// 채굴: 가까운 광맥을 괭이로 캐기
export function tryMine() {
  let nearest = null, nd = 2.4;
  for (const rock of oreRocks) { if (rock.userData.depleted) continue; const d = dist2D(rock.position, player.position); if (d < nd) { nd = d; nearest = rock; } }
  if (!nearest) { ui.toast?.('가까운 광맥이 없어요 ⛏️'); return; }
  const ud = nearest.userData;
  doPlayerAction(nearest.position.x, nearest.position.z);
  Sound.chop(); spawnDust(nearest.position.x, nearest.position.z, 8);
  const minePow = mineHitPower(gameState);      // ⛏️ 무쇠 괭이: 2씩 — 광맥 hp 3 이라 두 번에 캔다
  ud.hp -= minePow;
  if (ud.hp <= 0) {
    const ore = ud.ore;
    const amt = ore.id === 'gem' ? 1 : (1 + (Math.random() < 0.5 ? 1 : 0) + (buffOn('mine') && Math.random() < 0.6 ? 1 : 0)); // 🍳 오믈렛 버프: 광석 추가 확률
    gameState.inventory[ore.id] = (gameState.inventory[ore.id] || 0) + amt;
    refreshInventoryUI();
    spawnFloatText(nearest.position.x, 1.4, nearest.position.z, `+${amt} ${ore.name}`, ore.id === 'gem' ? '#5ad0e0' : '#cfc8b8');
    spawnSparkle(nearest.position.x, 0.8, nearest.position.z, ore.id === 'gem' ? 26 : 12);
    Sound.harvest();
    ud.depleted = true; ud.respawnAt = clock.elapsedTime + 14; nearest.visible = false;
    questEvent('mine', amt);                       // 데일리 의뢰(광석 캐기) 진행
    dexDiscover('ore', ore.id);                    // 📖 도감(광물 첫 채굴)
    trackGateBlocked('ore', 'gem');        // [GA4] 📖
    ui.act?.('mine');                              // 튜토리얼: 첫 채굴
    trackEvent('mine_ore', { ore: ore.id, amt, pick: minePow });  // [GA4] ⛏️ 무쇠 괭이 사용 여부(pick=2)
  }
}

// 광맥 리젠(캔 뒤 잠시 후 다시 자람)
export function updateOreRocks() {
  const now = clock.elapsedTime;
  for (const rock of oreRocks) {
    const ud = rock.userData;
    if (ud.depleted && now > ud.respawnAt) { ud.depleted = false; ud.hp = 3; rock.scale.set(0.01, 0.01, 0.01); ud.growing = true; }
    if (ud.growing) { const s = THREE.MathUtils.lerp(rock.scale.x, 1, 0.12); rock.scale.set(s, s, s); if (s > 0.98) { rock.scale.set(1, 1, 1); ud.growing = false; } }
    rock.visible = atMine && !ud.depleted;   // 동굴 밖에선 안 보이게
    if (ud.collider) ud.collider.off = ud.depleted;   // 🚧 캔 자리엔 막히지 않게
  }
}
