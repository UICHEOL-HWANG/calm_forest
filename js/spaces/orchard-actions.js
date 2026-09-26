// =============================================================
//  🍎 과수원 액션 — 묘목 심기 · 물주기 · 수확 · 베기 (규칙은 js/orchard.js)
//  ------------------------------------------------------------
//  js/game.js 에서 원문 그대로 옮겨 온 구역(분리 2단계, 2026-09-26).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 에 남은 let 에 쓸 때는 `$w.x = …` (읽기는 그냥 x). 도구·증명: tools/refactor/
// =============================================================
import {
  Input, clearCrop, currentTool, dist2D, doPlayerAction, firstHintBanner, gameState, giveReward, isBlocked,
  orchardSlotsWorld, orchardStreamWorld, player, plots, questEvent, rebuildOrchard, refreshCropStage, refreshInventoryUI,
  requestSave, spawnDust, spawnFloatText, toolPage, ui, updatePlotVisual,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))
import { trackEvent } from '../analytics.js';
import { BASIC_CROPS, TOOLS } from '../data/tools.js';
import { seedKeyOf } from '../farm-crops.js';
import { logOrchardEvent } from '../orchard-log.js';
import { ORCHARD_AUTO_TOOLS, TREE_SLOTS, YIELD_PER_DAY, chopHit, freeSlots, fruitKeyOf, fruitOf, harvestable, nearStream, orchardToolFor, sapKeyOf } from '../orchard.js';
import { Sound } from '../sound.js';
import { createPlot, seedSelCrop, syncSeedToolIcon, trellisAdjacent } from '../spaces/farm.js';
import { refreshCovers } from '../spaces/weather.js';
import { seedSaved } from '../tool-tiers.js';

export const ORCHARD_ACTION_R = 1.8;

// 나무 판정 — 물주기·수확·베기가 공유한다(가장 가까운 나무 하나)
export function orchardTreeNear() {
  let best = null, bestD = ORCHARD_ACTION_R;
  for (const t of gameState.orchard?.trees || []) {
    const d = dist2D(t, player.position);
    if (d < bestD) { best = t; bestD = d; }
  }
  return best;
}

// 심을 빈 자리 판정 — 그리기(syncOrchardSlotHints)·지도(minimapMarks)와 **같은 freeSlots()** 로 뽑는다.
//   손으로 세 번 베끼면 하나만 어긋나도 "빈 흙으로 보이는데 못 심는" 화면이 된다.
export function orchardSlotNear() {
  let best = null, bestD = ORCHARD_ACTION_R;
  for (const s of freeSlots(gameState.orchard?.trees || [], orchardSlotsWorld())) {
    const d = dist2D(s, player.position);
    if (d < bestD) { best = s; bestD = d; }
  }
  return best;
}

export function plantSapling(slot) {
  const kind = gameState.orchard.sapSel || 'apple';
  const key = sapKeyOf(kind);
  if ((gameState.inventory[key] || 0) <= 0) { ui.toast?.(`${fruitOf(kind).ico} 묘목이 없어요`, 2400); return; }
  if ((gameState.orchard.trees || []).length >= TREE_SLOTS) { ui.toast?.('🍎 자리가 다 찼어요 — 10그루까지 심을 수 있어요', 2600); return; }
  gameState.inventory[key] -= 1;
  const tree = { x: slot.x, z: slot.z, kind, stage: 'sapling', age: 0, watered: false, fruit: 0 };
  gameState.orchard.trees = [...(gameState.orchard.trees || []), tree];   // 불변 갱신
  doPlayerAction(slot.x, slot.z); Sound.plant();
  rebuildOrchard(); refreshInventoryUI(); requestSave();
  trackEvent('sapling_plant', {                                  // [GA4] 생애주기 2단계
    kind, near_stream: nearStream(tree, orchardStreamWorld()) ? 1 : 0, trees: gameState.orchard.trees.length });
  logOrchardEvent('sapling_plant', {                             // [원장] GA4 유실 대비 — Supabase 직접 기록
    kind, near_stream: nearStream(tree, orchardStreamWorld()), trees: gameState.orchard.trees.length });
}

export function waterTree(tree) {
  if (nearStream(tree, orchardStreamWorld())) { ui.toast?.('💧 시냇가 나무라 물을 안 줘도 돼요', 2400); return; }
  if (tree.watered) { ui.toast?.('💧 오늘은 이미 물을 줬어요', 2000); return; }
  tree.watered = true;
  doPlayerAction(tree.x, tree.z); Sound.water(); requestSave();
  spawnFloatText(tree.x, 1.4, tree.z, '💧', '#8fb9d6');
  // ⚠️ source/content 같은 GA4 예약어를 쓰지 않는다 — method 로 보낸다
  trackEvent('tree_water', { kind: tree.kind, method: 'manual' });
  logOrchardEvent('tree_water', { kind: tree.kind, method: 'manual' });   // [원장]
}

export function harvestTree(tree) {
  const n = harvestable(tree);
  if (!n) { ui.toast?.(tree.stage === 'mature' ? '🌳 아직 열매가 없어요 — 내일 다시 와요' : '🌿 아직 자라는 중이에요', 2400); return; }
  const stacked = Math.ceil(n / YIELD_PER_DAY);
  giveReward({ [fruitKeyOf(tree.kind)]: n }, 'orchard', tree.kind);   // econ_logs 의 item 도 같은 id
  tree.fruit = 0;
  doPlayerAction(tree.x, tree.z); Sound.harvest();
  rebuildOrchard(); refreshInventoryUI(); requestSave();
  trackEvent('fruit_harvest', { kind: tree.kind, n, stacked_days: stacked });   // [GA4]
  logOrchardEvent('fruit_harvest', { kind: tree.kind, n });                     // [원장]
}

// 🪓 과일나무 베기 — 규칙(열매 가드 · hp · 단계별 목재)은 js/orchard.js chopHit() 이고
//   여기서는 결과를 화면·세이브에 반영하기만 한다(스펙 §7 — game.js 는 배선과 그리기만).
//   tree.hp 는 런타임 전용(반쯤 팬 밭의 digAt 과 같은 취급) — getGameState() 가 세이브에서 걸러낸다.
export function chopTree(tree) {
  const r = chopHit(tree, !!gameState.upgrades.axe);
  if (!r.ok) {   // 🪏삽이 "작물 있는 밭은 안 된다"와 같은 규칙
    ui.toast?.(`${fruitOf(tree.kind).ico} 열매를 먼저 따고 베요`, 2600); return;
  }
  tree.hp = r.hp;
  doPlayerAction(tree.x, tree.z); Sound.chop();
  if (!r.felled) { ui.toast?.(`🪓 ${r.hp}번 더 치면 쓰러져요`, 1600); return; }

  const wood = r.wood;
  gameState.orchard.trees = gameState.orchard.trees.filter(t => t !== tree);   // 불변 갱신
  giveReward({ wood }, 'orchard_chop', tree.kind);          // econ_logs 의 item 도 같은 id
  rebuildOrchard(); refreshInventoryUI(); requestSave();
  ui.toast?.(`🪵 목재 +${wood} · 자리가 비었어요`, 2400);
  trackEvent('tree_chop', { kind: tree.kind, stage: tree.stage, wood, trees: gameState.orchard.trees.length });
  logOrchardEvent('tree_chop', { kind: tree.kind, trees: gameState.orchard.trees.length });   // [원장]
}

// 도구별 동작 — 밭처럼 자동 전환하지 않는다(자리가 10개뿐이라 헷갈릴 일이 적다).
// 🪓도끼를 들고 나무 앞이면 베기가 먼저다.
export function orchardAction() {
  // ✋ 맨손(도구를 등에 멘 채 숲 구역 등을 거쳐 들어온 경우)
  if (toolPage === 'none') { ui.toast?.('✋ 맨손이에요 — 하단 왼쪽 버튼(숫자 1)으로 도구를 꺼내세요'); return; }
  const held = TOOLS[currentTool].id;

  // 🪓 도끼는 자동 전환에 끼지 않는다 — 나무를 없애는 파괴 동작이라 밭의 🪏삽과 같이 명시적으로만.
  if (held === 'axe') { const t = orchardTreeNear(); if (t) return chopTree(t); ui.toast?.('🪓 벨 나무 앞으로 가요', 2200); return; }

  // 🌰💧🌾 셋 중 아무거나 들고 있으면 앞에 있는 것에 맞는 도구로 바꿔서 바로 실행한다
  //   (밭의 farmAutoAction 과 같은 문법 — 베타에서 "매번 골라야 해 복잡하다"는 피드백을 받은 그 구조)
  if (ORCHARD_AUTO_TOOLS.includes(held)) {
    const tree = orchardTreeNear(), slot = tree ? null : orchardSlotNear();
    const want = orchardToolFor(tree, !!slot, tree ? nearStream(tree, orchardStreamWorld()) : false);
    if (want && want !== held) {
      Input.selectTool(TOOLS.findIndex(t => t.id === want));            // 밭의 farmAutoAction 과 같은 방식
      if (!gameState.hintsSeen.orchardAuto) {                           // 첫 전환 때 한 번만 알린다
        gameState.hintsSeen.orchardAuto = true;
        ui.toast?.('🔄 나무에 맞는 도구로 바꿨어요. 🌰💧🌾 아무거나 들고 액션만 누르면 돼요 (🪓베기는 따로)', 3400);
      }
    }
    const use = want || held;
    if (use === 'seed')   { if (slot) return plantSapling(slot); ui.toast?.('🌰 심을 빈 자리 앞으로 가요', 2200); return; }
    if (use === 'water')  { if (tree) return waterTree(tree);    ui.toast?.('💧 물 줄 나무 앞으로 가요', 2200); return; }
    if (use === 'sickle') { if (tree) return harvestTree(tree);  ui.toast?.('🌳 딸 나무 앞으로 가요', 2200); return; }
  }
  ui.toast?.('🌰 씨앗으로 심고 💧 물 주고 🌾 낫으로 따요 · 🪓 도끼로 베요', 2600);
}

export function plantSeed(plot) {
  const adv = seedSelCrop();
  const key = adv ? seedKeyOf(adv.id) : 'seed';
  if (adv && (gameState.inventory[key] || 0) <= 0) {   // 고급 씨앗이 다 떨어졌으면 기본으로 되돌리고 안내
    gameState.farm.seedSel = 'basic'; syncSeedToolIcon();
    ui.toast?.(`${adv.ico} ${adv.name} 씨앗이 다 떨어져서 🌰 기본 씨앗으로 돌아가요`, 2600); return;
  }
  if (adv && adv.trellis && !trellisAdjacent(plot.x, plot.z)) { ui.toast?.('🍇 포도는 지지대 바로 옆 밭에만 심을 수 있어요', 2600); return; }
  if (!adv && gameState.inventory.seed <= 0) { ui.toast?.('씨앗이 없어요 🌰'); return; }
  // 🌰 넉넉한 씨앗 주머니 — 기본 씨앗만 아낀다(고급 씨앗은 코인으로 사는 물건이라 제외)
  const saved = seedSaved(gameState, Math.random(), !!adv);
  if (!saved) gameState.inventory[key] -= 1;
  plot.state = 'growing'; plot.growth = 0.05; plot.stage = -1;
  plot.cropType = adv || BASIC_CROPS[Math.floor(Math.random() * BASIC_CROPS.length)]; // 기본은 종류 랜덤
  plot.fert = false; plot.weed = false; plot.pest = false;                             // 🌾 공정 상태 초기화
  doPlayerAction(plot.x, plot.z); // 심기 제스처
  Sound.plant();
  refreshCropStage(plot);   // 0단계(새싹) 메시 생성 + 팝
  refreshCovers();          // 🛡️ 덮개 설치 중이면 새로 심은 밭에도 표시
  refreshInventoryUI(); updatePlotVisual(plot);
  if (saved) spawnFloatText(plot.x, 1.2, plot.z, '🌰 아꼈어요!', '#2f7a44');   // 눈에 보여야 업그레이드가 일한 걸 안다
  questEvent('plant');      // 퀘스트 진행
  ui.act?.('seed');         // 튜토리얼
  if (adv) firstHintBanner('advCrop', adv.ico, '고급 작물', '🌱비료를 줘야 제 속도 · 🌿잡초는 맨손 액션 · 🐛해충은 포충망');
  trackEvent('plant_seed', { kind: plot.cropType.id, adv: !!adv, saved: saved ? 1 : 0 }); // [GA4] 종류별 파종 분포 + 🌰 주머니 절약 발동
}

// 괭이: 빈 땅이면 밭 만들기(+씨앗 심기), 갈아둔 밭이면 씨앗 심기
export function tryHoe(plot = plots.find(p => dist2D(p.group.position, player.position) < 1.6)) {
  const gx = Math.round(player.position.x / 2) * 2;
  const gz = Math.round(player.position.z / 2) * 2;
  if (!plot) {
    if (isBlocked(gx, gz)) { ui.toast?.('여기엔 밭을 만들 수 없어요 🌳'); return; } // 나무·호수·벤치·가로등·집
    createPlot(gx, gz);                          // 밭만 갈기 (씨앗은 🌰 도구로 심기)
    doPlayerAction(gx, gz);                      // 밭갈기 제스처
    Sound.till();
    ui.act?.('till');                            // 튜토리얼
    ui.toast?.('밭을 갈았어요. 🌰 씨앗 도구로 심어요');
    return;
  }
  if (plot.state === 'wilted') {                 // 시든 밭 → 다시 갈아엎기(빈 밭)
    clearCrop(plot);
    plot.state = 'empty'; plot.wilted = false; plot.growth = 0; plot.stage = -1; plot.needSince = 0;
    spawnDust(plot.x, plot.z, 10); Sound.till();
    ui.toast?.('밭을 다시 갈았어요. 🌰 씨앗을 심어요');
  } else if (plot.state === 'empty') ui.toast?.('이미 갈아둔 밭이에요 — 🌰 씨앗을 심어요 · 없애려면 🪏삽');
  else ui.toast?.('이미 작물이 자라는 중이에요');
}
