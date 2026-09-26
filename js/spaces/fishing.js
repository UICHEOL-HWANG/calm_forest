// =============================================================
//  낚시: 호수 물가에서 던지기 → 물면 낚아채기(반응 미니게임)
//  ------------------------------------------------------------
//  js/game.js 에서 원문 그대로 옮겨 온 구역(분리 2단계, 2026-09-26).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 에 남은 let 에 쓸 때는 `$w.x = …` (읽기는 그냥 x). 도구·증명: tools/refactor/
// =============================================================
import {
  $w, LAKE, RAIN_DAY, WEATHER, _v, baitActive, biteAt, biteEnd, bobber, buffOn, castPos, catchCeremony, clayMat,
  clock, currentTool, dexDiscover, diffParams, dist2D, doPlayerAction, fishDiff, fishMesh, fishState, gameState,
  indoor, noteSpecialExhibit, player, questEvent, refreshInventoryUI, rollDifficulty, scene, settleDifficulty,
  showCatchItem, situation, spawnFloatText, spawnLeafBurst, spawnSparkle, spawnWater, spawnWoodChips, trackGateBlocked,
  trackDiffAbandon, trees, tryUnlockDrop, ui,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))
import { trackChop, trackEvent } from '../analytics.js';
import { FISH_KINDS } from '../data/catalog.js';
import { DOCK_POND, DOCK_POND_R, LAKE_R } from '../data/places.js';
import { CHOP_WOOD, TOOLS, TREE_RESPAWN_SEC } from '../data/tools.js';
import { rollKind } from '../dex-gates.js';
import { Sound } from '../sound.js';
import * as THREE from 'three';

export function tryFish() {
  if (fishState === 'bite') { catchFish(); return; }        // 지금! 낚아채기
  if (fishState === 'wait') { trackDiffAbandon('fish', fishDiff, 'wait'); resetFishing(); ui.toast?.('낚싯줄을 걷었어요'); return; }
  // idle → 캐스팅. 물가 근처여야 함
  const distLake = dist2D(LAKE, player.position);
  if (distLake > LAKE_R + 2.8) {
    // 🛶 나루터 연못은 호수와 생김새가 같아 낚시터로 오해한다(베타) — "여긴 아니다"를 분명히
    if (dist2D(DOCK_POND, player.position) < DOCK_POND_R + 3) ui.toast?.('🛶 나루터 연못에선 낚시가 안 돼요 — 🎣 낚시는 마을 호수에서', 2600);
    else ui.toast?.('🎣 낚시는 마을 호수 물가에서만 할 수 있어요', 2200);
    return;
  }
  const dir = _v.set(LAKE.x - player.position.x, 0, LAKE.z - player.position.z).normalize();
  castPos.set(player.position.x + dir.x * 2.6, 0.35, player.position.z + dir.z * 2.6);
  // 물 위로 클램프
  const dc = Math.hypot(castPos.x - LAKE.x, castPos.z - LAKE.z);
  if (dc > LAKE_R - 0.4) { const k = (LAKE_R - 0.6) / dc; castPos.set(LAKE.x + (castPos.x - LAKE.x) * k, 0.35, LAKE.z + (castPos.z - LAKE.z) * k); }
  if (!bobber) buildBobber();
  bobber.position.copy(castPos); bobber.visible = true;
  doPlayerAction(castPos.x, castPos.z); // 낚싯대 던지기 제스처
  $w.fishDiff = rollDifficulty('fish');   // 🎚️ 이번 캐스트의 입질 여유 — probe 팔 × 유저 DDA
  $w.fishState = 'wait'; $w.biteAt = clock.elapsedTime + (RAIN_DAY ? 1.0 + Math.random() * 1.6 : 1.5 + Math.random() * 2.8); // 🌧️ 비 오는 날: 입질 빨라짐
  Sound.water(); spawnWater(castPos.x, castPos.z);
  if ((gameState.inventory.bait || 0) > 0) {                     // 🪱 미끼 — 캐스트마다 1개 자동 소모
    gameState.inventory.bait -= 1; $w.baitActive = true; refreshInventoryUI();
    trackEvent('use_bait', { left: gameState.inventory.bait });   // [GA4] 소모품 사용
    ui.setFishPrompt?.(`🎣 던졌어요… 물 때까지 기다려요 · 🪱 미끼 (남은 ${gameState.inventory.bait}회)`);
  } else {
    ui.setFishPrompt?.('🎣 던졌어요… 물 때까지 기다려요');
  }
  trackEvent('fishing_cast'); // [GA4]
}

export function catchFish() {
  // 🐟 🌈무지개 물고기는 🌧️비 오는 날에만(게이트 안에서 22%). 표는 js/dex-gates.js
  //   ⚠️ 생선구이 버프(luck)·비·미끼의 "두 번 굴려 작은 값" 보정은 **유지**한다.
  //      게이트가 후보를 먼저 제한하고, 보정은 남은 후보 안에서 앞쪽(희귀)을 밀어준다.
  const fishRnd = (buffOn('luck') || RAIN_DAY || baitActive)
    ? () => Math.min(Math.random(), Math.random())
    : Math.random;
  const kind = rollKind(FISH_KINDS, 'fish', situation(), fishRnd);
  doPlayerAction(castPos.x, castPos.z); // 낚아채기 제스처
  gameState.inventory.fish += 1; refreshInventoryUI();
  // 🎣 무엇을 낚았는지는 캐치 배너로(월드 플로트 텍스트는 밀착 줌에서 화면을 덮었다 — 베타 피드백).
  //    서브 문구는 📖도감 토스트와 겹치지 않게 '희소성'만 말한다(둘이 동시에 뜬다).
  ui.catchBanner?.(`🐟 ${kind.name} +1`,
    kind.rarity === 'rare' ? '✨ 아주 귀한 물고기예요!'
    : kind.rarity === 'uncommon' ? '💫 조금 귀한 물고기예요'
    : '가방에 담았어요. 상점에서 팔 수 있어요');
  if (kind.rarity !== 'common') spawnSparkle(castPos.x, 0.7, castPos.z, 20);
  Sound.harvest();
  questEvent('fish'); if (kind.rarity === 'rare') questEvent('fish_rare');
  dexDiscover('fish', kind.rarity);                                     // 📖 도감(어종 첫 발견)
  noteSpecialExhibit('fish', kind.rarity);                              // 🏛️ ✨비 오는 날이면 특별 전시
  trackGateBlocked('fish', 'rare');       // [GA4] 📖 게이트가 닫혀 못 얻은 날
  ui.act?.('fish');                                                     // 튜토리얼: 낚시
  catchCeremony('fishZoom');                                            // 🎉 첫 낚시만 밀착, 이후 폴짝 + 물고기 팝
  showCatchItem(fishMesh(kind.rarity), castPos.x, 0.25, castPos.z);     // 🐟 물속에서 튀어나와 머리 위에서 파닥!
  tryUnlockDrop(kind.rarity === 'rare' ? 0.6 : kind.rarity === 'uncommon' ? 0.18 : 0.08); // 🎨 랜덤 색(희귀일수록↑)
  settleDifficulty('fish', 1);   // 🎚️ 성공 → DDA 가 조금 어려워진다
  trackEvent('fishing_catch', { fish: kind.name, rarity: kind.rarity, rod: gameState.upgrades.rod ? 1 : 0, ...diffParams(fishDiff) }); // [GA4] 🎚️ 난이도 동봉
  resetFishing();
}

export function resetFishing() {
  $w.fishState = 'idle'; $w.baitActive = false; if (bobber) bobber.visible = false; ui.setFishPrompt?.(null);
}

export function buildBobber() {
  $w.bobber = new THREE.Group();
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), clayMat(0xff7b7b, false)); top.position.y = 0.08; bobber.add(top);
  const bot = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), clayMat(0xffffff, false)); bot.position.y = -0.05; bobber.add(bot);
  bobber.visible = false; scene.add(bobber);
}

export function updateFishing() {
  if (fishState === 'idle') return;
  if (TOOLS[currentTool].id !== 'rod' || indoor) { trackDiffAbandon('fish', fishDiff, fishState); resetFishing(); return; } // 도구 바꾸면 취소 · 🎚️ bite 중이면 팔을 겪은 포기
  const now = clock.elapsedTime;
  if (fishState === 'wait') {
    bobber.position.y = 0.32 + Math.sin(now * 3) * 0.04; // 잔잔히 떠 있음
    if (now >= biteAt) {
      $w.fishState = 'bite'; $w.biteEnd = now + (gameState.upgrades.rod ? 2.6 : 1.4) * fishDiff.ease; // 튼튼한 낚싯대: 입질 여유↑ · 🎚️ probe × DDA
      ui.setFishPrompt?.('❗ 물었어요! 지금 낚아채요!');
      Sound.blip(); spawnWater(castPos.x, castPos.z);
    }
  } else if (fishState === 'bite') {
    bobber.position.y = 0.15 + Math.sin(now * 30) * 0.08; // 격하게 요동
    if (now > biteEnd) {
      ui.toast?.('놓쳤어요 🐟💨');
      settleDifficulty('fish', 0);   // 🎚️ 실패 → DDA 가 조금 쉬워진다
      trackEvent('fishing_miss', { rod: gameState.upgrades.rod ? 1 : 0, ...diffParams(fishDiff) });   // [GA4] 🎚️ 난이도 동봉
      resetFishing();
    }
  }
}

export function tryChop() {
  let nearest = null, nd = 2.6;
  for (const tree of trees) {
    if (tree.userData.fallen) continue;
    const d = dist2D(tree.position, player.position);
    if (d < nd) { nd = d; nearest = tree; }
  }
  if (!nearest) { ui.toast?.('가까운 나무가 없어요'); return; }
  const ud = nearest.userData;
  ud.squash = 1;
  doPlayerAction(nearest.position.x, nearest.position.z); // 벌목 제스처
  Sound.chop();
  spawnLeafBurst(nearest); spawnWoodChips(nearest);
  ud.hp -= gameState.upgrades.axe ? 2 : 1;                     // 강철 도끼: 2번에 벌목
  if (ud.hp <= 0) {                                             // 🪵 목재는 쓰러뜨릴 때만(타격마다 주던 부스러기 제거 · 인플레 억제, 2026-09-13)
    const bonus = (buffOn('chop') ? 1 : 0)
      + (WEATHER === 'snow' && Math.random() < 0.5 ? 1 : 0);   // 🪓 도시락 버프 / ❄️ 눈: 가지가 잘 부러져 +1 확률
    const gain = CHOP_WOOD + bonus;
    gameState.inventory.wood += gain; ud.fallen = true; ud.respawnAt = clock.elapsedTime + TREE_RESPAWN_SEC;
    nearest.visible = false; spawnLeafBurst(nearest, 26);
    spawnFloatText(nearest.position.x, 2.4, nearest.position.z, `+${gain} 🪵`, '#7a5230'); // 획득 표시
  }
  refreshInventoryUI();
  questEvent('chop');                                          // 퀘스트 진행
  ui.act?.('chop');                                            // 튜토리얼
  trackChop(trees.indexOf(nearest), gameState.inventory.wood); // [GA4]
}
