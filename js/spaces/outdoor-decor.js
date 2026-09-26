// =============================================================
//  🪵 야외 장식·창고·선물 (구역 머리말 — 분리 2단계)
//  ------------------------------------------------------------
//  js/game.js 에서 원문 그대로 옮겨 온 구역(분리 2단계, 2026-09-26).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 에 남은 let 에 쓸 때는 `$w.x = …` (읽기는 그냥 x). 도구·증명: tools/refactor/
// =============================================================
import {
  $w, atCafe, atFarm, atMine, atMist, atMuseum, atRiver, atSea, camera, decorNearRing, decorRot, farmBuildingRecs,
  gameState, giveReward, houseWindows, indoor, markHabitatDirty, nearDoor, nearNPC, obstacles, outdoorMeshes,
  outdoorTarget, pickedOutdoor, placingOutdoor, player, plots, pointer, questEvent, raycaster, refreshInventoryUI,
  removeSolid, requestSave, rewardText, scene, spawnFloatText, spawnSparkle, ui,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))
import { trackEvent } from '../analytics.js';
import { OUTDOOR } from '../data/catalog.js';
import { GIFTS } from '../data/npcs.js';
import { CELL as FARM_CELL, FARM_BUILDINGS, buildingCells, rotatedFp, storageTotal } from '../farm-building.js';
import { OUTDOOR_TAP_REACH, outdoorDistance } from '../outdoor-move.js';
import { Sound } from '../sound.js';
import { buildDecorGhost, removeDecorGhost } from '../spaces/indoor.js';

// 🪵 야외 장식을 놓을 수 있는 구역(마을 실외·텃밭) — 옮기기 프롬프트도 여기서만
export function outdoorZone() { return !indoor && !atMine && !atCafe && !atRiver && !atMist && !atSea && !atMuseum; }

// 캐릭터↔야외 장식 거리 — 규칙은 js/outdoor-move.js
//   🏗️ 발자국이 있는 시설은 가장자리 거리로(2×2 는 중심까지 1.0 안에 설 수 없다 — 실내 nearestDecor 와 같은 규칙), 장식은 중심 거리.
//   근접 프롬프트(nearestOutdoor)와 탭 집기(tryPickOutdoor)가 같은 잣대를 써야 한다.
export function outdoorDist(m) {
  const rec = m.userData.rec, def = rec && FARM_BUILDINGS.find(d => d.id === rec.id);
  const [w, dd] = def ? rotatedFp(def.fp, rec.rot || 0) : [0, 0];
  return outdoorDistance(player.position.x, player.position.z, m.position.x, m.position.z, w * FARM_CELL / 2, dd * FARM_CELL / 2);
}

// 캐릭터에서 가장 가까운 야외 장식
export function nearestOutdoor(reach) {
  let best = null, bd = reach;
  for (const m of outdoorMeshes) { const d = outdoorDist(m); if (d < bd) { bd = d; best = m; } }
  return best ? { mesh: best, d: bd } : null;
}

// 🪵 야외 장식을 **직접 탭** = 들어 올리기(실내 가구 tryPickDecor 와 같은 문법).
//   액션 버튼/Space 는 밭일에 양보하므로(updateDoorInteract), 밭에 겹쳐 놓은 허수아비는 이 경로로 옮긴다.
//   조준이 명시적이라 근접 프롬프트(1.0)보다 넉넉하되, 화면 건너편 것이 집히지 않게 사거리로 막는다.
//   장식만 쏘면 나무·집·주민 뒤에 숨은 것도 맞아서, 나무를 찍어 벌목하려던 클릭이 울타리 집기로 샌다.
//   씬 전체로 한 번 더 쏘아 "맨 앞에 보이는 게 정말 그 장식인가"를 본다.
//   링·고스트·떠오르는 글자처럼 판정에 끼면 안 되는 연출물은 건너뛴다(그림자 연출은 메시가 아니라 자동 제외).
export function tapOccluded(m, dist) {
  for (const h of raycaster.intersectObjects(scene.children, true)) {
    const o = h.object;
    if (!o.isMesh || !o.visible || o === decorNearRing) continue;
    if (h.distance >= dist - 0.01) return false;            // 그 장식보다 앞에 아무것도 없다
    let r = o; while (r.parent && !outdoorMeshes.includes(r)) r = r.parent;
    if (r !== m) return true;                               // 다른 게 먼저 맞았다 = 가려져 있다
  }
  return false;
}

export function tryPickOutdoor(e) {
  if (!outdoorMeshes.length) return false;
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(outdoorMeshes, true)[0]; if (!hit) return false;
  let m = hit.object; while (m.parent && !outdoorMeshes.includes(m)) m = m.parent;
  if (!outdoorMeshes.includes(m) || outdoorDist(m) > OUTDOOR_TAP_REACH) return false;
  if (tapOccluded(m, hit.distance)) return false;   // 가려져 있으면 평소 탭(도구질)으로 흘려보낸다
  pickOutdoor(m);
  return true;   // 🧺창고·🍇포도처럼 안내 토스트만 나가는 경우도 탭은 여기서 소비 — 뒤로 새서 밭일까지 나가면 안 된다
}

// 🍇 이 지지대에 포도가 붙어 있나(옆 밭에 자라는/익은 포도) — 있으면 옮길 수 없다(§4-3)
export function trellisHasGrapes(rec) {
  const cells = buildingCells([1, 3], rec.x, rec.z, rec.rot || 0);
  return plots.some(p => (p.state === 'growing' || p.state === 'mature') && p.cropType?.id === 'grape' &&
    cells.some(([cx, cz]) => Math.abs(cx - p.x) <= 2.01 && Math.abs(cz - p.z) <= 2.01));
}

// 🧺 창고 내용물을 전부 가방으로
export function withdrawWarehouse() {
  const st = gameState.farm.storage, got = {};
  for (const k of Object.keys(st)) if (st[k] > 0) { got[k] = st[k]; st[k] = 0; }
  if (!Object.keys(got).length) { ui.toast?.('🧺 창고가 비어 있어요'); return; }
  giveReward(got, 'warehouse');
  { const n = Object.values(got).reduce((a, b) => a + b, 0); ui.toast?.(`🧺 창고에서 ${n}개를 꺼냈어요. 가방을 확인해요`, 2600); }   // 품목별 조합은 i18n 이 못 쪼갠다(가방에서 보인다)
  trackEvent('warehouse_take', { ...got });   // [GA4] 창고 인출 — 일꾼 수확분이 실제로 쓰이는지
  $w.nearDoor = null; ui.setDoorPrompt?.(null); requestSave();
}

// 🪵 놓아둔 야외 장식 들어 올리기 — 메시·충돌체·밭 금지 구역·저장 레코드를 같이 빼고 배치 모드로(값 없음)
export function pickOutdoor(m) {
  const rec = m.userData.rec; if (!rec) return false;
  // 🏗️ 내용물이 있을 때만 막는다(§4-3): 마지막 창고에 작물이 들어 있으면 · 지지대에 포도가 붙어 있으면
  if (rec.id === 'warehouse' && storageTotal(gameState.farm.storage) > 0 && farmBuildingRecs().filter(r => r.id === 'warehouse').length <= 1) { ui.toast?.('🧺 창고를 비워야 옮길 수 있어요 — 옆에서 액션으로 꺼내요', 2600); return false; }
  if (rec.id === 'trellis' && trellisHasGrapes(rec)) { ui.toast?.('🍇 포도를 수확한 뒤에 옮길 수 있어요', 2400); return false; }
  scene.remove(m); outdoorMeshes.splice(outdoorMeshes.indexOf(m), 1);
  if (m.userData.solid) removeSolid(m.userData.solid);                       // 🚧 들어 올린 자리에 안 보이는 벽이 남지 않게
  for (const ob of [].concat(m.userData.obstacle || [])) { const oi = obstacles.indexOf(ob); if (oi >= 0) obstacles.splice(oi, 1); }   // 시설은 칸마다 하나씩
  // 저장 레코드는 목록에 남긴다(들고 있는 동안 세이브돼도 분실 없음) — 놓으면 placeOutdoor 가 좌표만 갱신, 보관하면 storeOutdoor 가 뺀다
  m.traverse(o => { if (o.isMesh) { const hi = houseWindows.indexOf(o.material); if (hi >= 0) houseWindows.splice(hi, 1); } });   // 🏮 밤 점등 목록에서도 제거(다시 놓으면 새로 등록)
  $w.placingOutdoor = rec.id; $w.pickedOutdoor = { id: rec.id, x: rec.x, z: rec.z, rot: rec.rot || 0, farm: atFarm, rec };
  $w.outdoorTarget = { x: rec.x, z: rec.z, pinned: true };   // 들어 올린 자리에서 시작(실내 가구와 같은 손맛)
  $w.decorRot = rec.rot || 0; buildDecorGhost(rec.id, true);   // 들던 방향 그대로 이어서 ↻회전
  Sound.blip(); trackEvent('pick_outdoor', { item: rec.id }); // [GA4] 옮기기 시작
  ui.onOutdoorPicked?.(OUTDOOR.find(d => d.id === rec.id));
  return true;
}

// 🧺 들고 있는 야외 장식을 보관 — 바닥에서 들어 올린 것만(작업대에서 방금 고른 건 아직 값을 안 치렀으니 취소가 맞다)
export function storeOutdoor() {
  if (!placingOutdoor || !pickedOutdoor) return false;
  const id = placingOutdoor, def = OUTDOOR.find(d => d.id === id);
  const stored = gameState.outdoorStored || (gameState.outdoorStored = {});
  stored[id] = (stored[id] || 0) + 1;
  const ri = gameState.outdoor.indexOf(pickedOutdoor.rec); if (ri >= 0) gameState.outdoor.splice(ri, 1);   // 마당 목록에서 빼고 보관함으로
  markHabitatDirty();   // 🦋 치운 장식의 태그도 즉시 빠져야 한다
  $w.pickedOutdoor = null; $w.placingOutdoor = null; removeDecorGhost();   // 제자리 복귀 없이 정리
  Sound.blip(); ui.toast?.(`🧺 ${def.name}을(를) 보관했어요. 작업대에서 다시 꺼낼 수 있어요`);
  trackEvent('store_outdoor', { item: id }); // [GA4]
  ui.onDecorPlaced?.();                      // 액션버튼 아이콘 복원
  requestSave();
  return true;
}

// 선물 제작(보유 수 +1)
export function craftGift(id) {
  const g = GIFTS.find(x => x.id === id); if (!g) return { ok: false };
  for (const k in g.cost) {
    if ((gameState.inventory[k] || 0) < g.cost[k]) {
      const label = k === 'fish' ? '물고기' : k === 'crop' ? '작물' : '목재';
      return { ok: false, msg: `${label}이(가) 부족해요` };
    }
  }
  for (const k in g.cost) gameState.inventory[k] -= g.cost[k];
  gameState.gifts[id] = (gameState.gifts[id] || 0) + 1;
  refreshInventoryUI();
  Sound.blip();
  spawnFloatText(player.position.x, 1.4, player.position.z, `${g.ico} ${g.name}!`, '#c9682a');
  trackEvent('craft_item', { category: 'gift', item: id });  // [GA4]
  return { ok: true, name: g.name };
}

// 근처 주민에게 선물 주기 → 친밀도↑ (3개마다 감사 보상)
// ❤️ 친밀도 올리기 — 선물(giveGift)과 🔁반복 의뢰 보상이 함께 쓴다.
//   친밀 3단계마다 답례. +2 증가로 배수를 "건너뛴" 경우도 통과하도록 몫을 비교한다.
//   답례를 줬으면 그 보상을 돌려준다(없으면 null).
export function addAffinity(id, amount = 1) {
  const before = gameState.affinity[id] || 0;
  gameState.affinity[id] = before + amount;
  if (Math.floor(gameState.affinity[id] / 3) <= Math.floor(before / 3)) return null;
  const reward = { seed: 3, crop: 1 };
  giveReward(reward, 'affinity_gift', id);
  return reward;
}

export function giveGift(giftId) {
  const o = nearNPC; if (!o) return { ok: false, msg: '가까운 주민이 없어요' };
  if ((gameState.gifts[giftId] || 0) <= 0) return { ok: false, msg: '그 선물이 없어요' };
  const g = GIFTS.find(x => x.id === giftId);
  gameState.gifts[giftId] -= 1;
  const id = o.def.id;
  refreshInventoryUI();
  Sound.harvest();
  spawnFloatText(o.group.position.x, 2.2, o.group.position.z, g.love > 1 ? '❤️❤️' : '❤️', '#e6789a');
  spawnSparkle(o.group.position.x, 1.4, o.group.position.z, 14);
  const reward = addAffinity(id, g.love || 1);              // 📿 보석 목걸이 등은 친밀도 +2
  questEvent('gift');                                  // 🦉 의뢰(주민에게 선물)
  trackEvent('gift_give', { npc: id, gift: giftId });  // [GA4]
  return { ok: true, npc: o.def.name, ico: g.ico, affinity: gameState.affinity[id], reward: reward ? rewardText(reward) : null };
}
