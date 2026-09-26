// =============================================================
//  🌾 농사 도구 자동 전환 — 규칙은 js/farm-auto.js(farmToolFor), 여기는 게임 상태와 잇는 층
//  ------------------------------------------------------------
//  js/game.js 에서 원문 그대로 옮겨 온 구역(분리 2단계, 2026-09-26).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 에 남은 let 에 쓸 때는 `$w.x = …` (읽기는 그냥 x). 도구·증명: tools/refactor/
// =============================================================
import {
  $w, DIG_WINDOW, Input, RAIN_DAY, actAnim, atCafe, atFarm, atMine, atMuseum, catchCeremony, clayMat, clearCrop,
  clock, cropMini, currentTool, dateHash, dayStr, dexDiscover, dist2D, doPlayerAction, farmBuildingRecs,
  farmHalf, finishPetJob, gameState, giveReward, indoor, lerpAngle, mergeGeos, mode, noteSpecialExhibit,
  obstacles, pendingDig, pet3d, petJob, player, plots, questEvent, refreshCropStage, refreshInventoryUI,
  requestSave, scene, setPlotHarvest, setPlotSeedHint, setPlotWarn, showCatchItem, spawnDust, spawnFloatText,
  spawnSparkle, syncFarmHints, todayStr, toolMesh, tryUnlockDrop, ui, updatePlotVisual, wiltPlot, workerCap,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))
import { trackEvent } from '../analytics.js';
import { recipeOf as craftRecipeOf, stationDef } from '../craft/recipes.js';
import { isReady, stationOf, waitedDays } from '../craft/slots.js';
import { FARM } from '../data/places.js';
import { BASIC_CROPS, TOOLS, WET_TIME, WILT_TIME } from '../data/tools.js';
import { farmToolFor } from '../farm-auto.js';
import { HIVE_GROWTH_MUL, WELL_WET_MUL, inRadiusOf, storageTotal, warehouseCap } from '../farm-building.js';
import { MATURE, growthPerWater, harvestYield, isAdv, weedRoll, wiltTimeFor } from '../farm-crops.js';
import { HAUL_N, HIRE_COST, MASTER_SPEED, MASTER_YIELD, STEP_SEC, candidatesFor, catchUpSteps, dailyWage, gradeInfo, gradeOf, hasPerk, jobOf, pickTask, releaseCandidate, settleWages, skillsOf, toNextGrade, workSecOf, worksPerStep } from '../farm-worker.js';
import { logEcon } from '../metrics.js';
import { updatePetAnim } from '../pet/art.js';
import { followPlayer, snapIfFar, walkTo } from '../pet/render.js';
import { CHAIN_MAX, PET_RADIUS, canCommand, pickPetTask, stageOf } from '../pet/rules.js';
import { Sound } from '../sound.js';
import { createPlot, syncFarmCrops, syncFarmSoil, updateFarmPops } from '../spaces/farm.js';
import { syncOrchardGateLock } from '../spaces/mist.js';
import { tryHoe } from '../spaces/orchard-actions.js';
import { DIG_HIT_AT, DIG_RESTORE, digHit, expireDig, setPlotDug, trySeed, tryWater, updateDigFx } from '../spaces/shovel.js';
import { refreshCovers } from '../spaces/weather.js';
import { sickleReach } from '../tool-tiers.js';
import * as THREE from 'three';

export const FARM_AUTO_R = 1.8;

export const FARM_ACTIONS = { hoe: tryHoe, seed: trySeed, water: tryWater, sickle: tryHarvest };

export function nearestPlot(r, pred = null) {
  let best = null, bestD = r;
  for (const p of plots) { if (pred && !pred(p)) continue; const d = dist2D(p.group.position, player.position); if (d < bestD) { best = p; bestD = d; } }
  return best;
}

// 들고 있는 도구가 원래 찾던 밭 상태 — 두 밭 사이(간격 2, 반경 1.8)에 서면 최근접이 아니라 이 밭을 먼저 고른다
export const HELD_PLOT_PREF = {
  hoe: p => p.state === 'wilted',
  seed: p => p.state === 'empty' && !p.digAt,
  water: p => p.state === 'growing',
  sickle: p => p.state === 'mature',
};

// 지금 든 도구로 밭일을 하면 대상이 될 밭 — farmActionFirst 와 farmAutoAction 이 같은 밭을 봐야
//   "밭일이 먼저예요" 프롬프트와 실제 동작이 어긋나지 않는다.
export function farmAutoPlot(held) {
  return nearestPlot(FARM_AUTO_R, HELD_PLOT_PREF[held]) || nearestPlot(FARM_AUTO_R);
}

export function farmAutoAction() {
  const held = TOOLS[currentTool].id;
  const plot = farmAutoPlot(held);
  const wet = !!plot && clock.elapsedTime < (plot.wetUntil || 0);
  const want = farmToolFor(plot, wet);
  if (!want) {
    // 자라는 중인데 흙이 촉촉하면 도구를 바꾸지 않고 물조리개의 안내만(어떤 도구를 들었든 같은 말)
    if (plot?.state === 'growing' && wet) { ui.toast?.('아직 흙이 촉촉해요 🌱'); return; }
    return FARM_ACTIONS[held]();          // 밭 없음·반쯤 판 밭: 들고 있던 도구의 원래 동작(괭이·씨앗은 예전처럼 1.6 반경으로 다시 찾는다 — 의도적 차이)
  }
  if (want !== held) {
    Input.selectTool(TOOLS.findIndex(t => t.id === want));
    if (!gameState.hintsSeen.farmAuto) {   // 첫 자동 전환 때 한 번만 — 이후엔 조용히 바뀐다
      gameState.hintsSeen.farmAuto = true;
      ui.toast?.('🔄 밭에 맞는 도구로 바꿨어요. 농사 도구 아무거나 들고 액션만 누르면 돼요', 3200);
    }
  }
  return FARM_ACTIONS[want](plot);
}

// 🔒 고급 작물 수확 카운터 — **과수원 해금의 유일한 증가 지점**.
//   플레이어가 직접 낫으로 거두든(tryHarvest) 🧑‍🌾일꾼이 거두든(workerApply) 같은 일이다.
//   일꾼 경로가 이걸 안 타서, 밀을 심고 일꾼에게 맡긴 유저는 "고급 작물을 한 번 거두세요" 라는
//   안내를 이미 해낸 채로 영원히 보고 있었다.
//   해금 순간(카운터가 처음 1이 되는 순간)에만 true 를 돌려준다 — 증가 지점이 여기 하나뿐이라
//   두 번 불릴 수 없다. 토스트는 **부르는 쪽**이 정한다(일꾼 오프라인 정산은 요약 모달로 미룬다).
export function bumpAdvHarvest(via) {
  gameState.progress.advHarvest = (gameState.progress.advHarvest || 0) + 1;
  if (gameState.progress.advHarvest !== 1) return false;
  trackEvent('orchard_unlock', { via });                      // [GA4] 어떤 고급 작물이 열었나
  giveReward({ sap_apple: 2 }, 'orchard_unlock', 'apple');    // 빈 언덕 방지 — 사과 묘목 2그루
  syncOrchardGateLock();                                      // 🔓 가로대를 즉시 치운다(다음 접속까지 기다리지 않게)
  return true;
}

// 낫: 다 자란 작물 수확 → 반짝이 스파클 + 작물 +1
// 🌾 viaSickle — "잘 드는 낫" 이 옆 칸을 함께 거두는 두 번째 호출.
//   제스처·연출은 첫 칸에서만. 이 플래그가 없으면 밭이 줄줄이 이어진 곳에서 무한 재귀가 된다.
export function tryHarvest(plot = plots.find(p => p.state === 'mature' && dist2D(p.group.position, player.position) < 1.8), viaSickle = false) {
  if (!plot) { ui.toast?.('수확할 작물이 없어요 🌾'); return; }
  if (!viaSickle) doPlayerAction(plot.x, plot.z); // 수확 제스처
  const adv = isAdv(plot.cropType), qty = harvestYield(plot.cropType, !!plot.pest);
  if (adv) {   // 🌾 고급: 종류별 인벤 키(wheat/corn/grape)로, 씨앗은 안 돌아온다(코인 싱크). 해충이면 절반
    gameState.inventory[plot.cropType.id] = (gameState.inventory[plot.cropType.id] || 0) + qty;
    // 🔒 과수원 해금 카운터 — 플레이어가 눈앞에 있으니 해금 순간엔 바로 토스트
    if (bumpAdvHarvest(plot.cropType.id)) ui.toast?.('🍎 마을 동쪽 과수원 언덕이 열렸어요!', 3200);
  } else {
    gameState.inventory.crop += 1; // 작물 +1
    gameState.inventory.seed += 2; // 씨앗 +2 (심기 1 소모 대비 순증 → 농사 지속 가능)
  }
  if (!viaSickle) {
    // 🌾 낫으로 딸려 온 칸은 조용히 처리한다 — 토스트가 첫 칸을 덮어쓰면
    //    🐛해충 손실 안내처럼 꼭 봐야 할 메시지가 사라지고, 소리도 같은 프레임에 겹쳐 볼륨이 튄다.
    Sound.harvest();
    ui.toast?.(adv && plot.pest ? `🐛 해충 탓에 ${plot.cropType.name} +${qty}만 수확했어요…` : `${plot.cropType?.name || '작물'} +${qty} 수확! 🌾`);
  }
  spawnFloatText(plot.x, 1.1, plot.z, `+${qty} ${adv ? plot.cropType.ico : '🥕'}`, '#c05a2a'); // 획득 표시
  const harvestKind = plot.cropType?.id, harvestPest = !!plot.pest;
  plot.fert = false; plot.weed = false; plot.pest = false;
  spawnSparkle(plot.x, 0.7, plot.z, 24); // [파티클] 반짝이 폭발
  clearCrop(plot);          // 🌱 작물 인스턴스 버퍼에서도 제거
  plot.state = 'empty'; plot.growth = 0; plot.stage = -1; plot.watered = false;
  updatePlotVisual(plot);
  refreshCovers();          // 🛡️ 수확한 빈 밭에선 덮개 표시 제거
  refreshInventoryUI();
  questEvent('harvest');                                          // 퀘스트 진행
  if (plot.cropType?.id) dexDiscover('crop', plot.cropType.id);   // 📖 도감(작물 첫 수확)
  if (plot.cropType?.id) noteSpecialExhibit('crop', plot.cropType.id);   // 🏛️ ✨눈 오는 날이면 특별 전시(일꾼이 거둔 건 안 센다 — 직접 한 것만)
  ui.act?.('harvest');                                            // 튜토리얼: 수확
  if (!viaSickle) {
    catchCeremony('harvestZoom');                                 // 🎉 첫 수확만 밀착, 이후 폴짝 + 열매 팝
    showCatchItem(cropMini(plot.cropType), plot.x, 0.6, plot.z);  // 🥕 열매를 머리 위로 번쩍! (두 번 부르면 첫 열매가 즉시 지워진다)
    // ⚠️ 🎨 색 해금은 확률 보상이다 — 두 칸에서 두 번 굴리면 낫 보유자의 기대치가 1.95배가 된다.
    //    "총량은 그대로고 손만 덜 간다" 는 이 업그레이드의 설계와 어긋나므로 액션당 한 번만 굴린다.
    tryUnlockDrop(0.05);                                          // 🎨 랜덤 색(낮은 확률)
  }
  trackEvent('harvest_crop', { crop: gameState.inventory.crop, kind: harvestKind, qty, adv, pest: harvestPest, sickle: viaSickle ? 1 : 0 }); // [GA4] 종류·수량·해충 손실 + 낫으로 딸려 온 칸
  // 🌾 잘 드는 낫 — 옆 칸도 함께. 총량은 그대로고 손만 덜 간다(🌾밭 확장 7단계로 밭이 많아졌다).
  //   ⚠️ 밭 격자는 짝수 좌표 2칸 간격이라 2.6 이면 상하좌우만 걸린다(대각선은 2.83).
  if (!viaSickle && sickleReach(gameState)) {
    const near = plots.find(p => p !== plot && p.state === 'mature' && dist2D(p.group.position, plot.group.position) < 2.6);
    if (near) tryHarvest(near, true);
  }
}

//   ▶ 밭 안(atFarm)에선 실제로 걸어가 제스처를 하고, 밭 밖·오프라인에선 같은 규칙을 60초 스텝으로 돌린다.
//   ▶ 수확물은 밭 앞 더미(farm.pending) → 🧺창고 운반으로 창고에 들어간다.
//   ▶ 총 수확량 상한 = 창고 용량. storageLeft 를 "용량 − 창고 − 더미" 로 잡아야 오프라인 12시간이 경제를 뚫지 못한다.
export const workerObjs = [];

export let workerStepAcc = 0;

export const WORKER_SPEED = 1.35;

export function hasHireBoard() { return farmBuildingRecs().some(b => b.id === 'board'); }

export function warehouseTotalCap() { return warehouseCap(farmBuildingRecs()); }

export function pendingTotal() { return storageTotal(gameState.farm.pending); }

export function shelterNear(x, z) { return inRadiusOf(farmBuildingRecs(), 'shelter', x, z); }

// 밭 격자에서 아직 밭이 아닌 칸 하나(⛏️ 갈기 목표) — 울타리 안 · 시설/장식 자리 제외
//   ⚠️ 칸 좌표는 **짝수**여야 한다(tryHoe 가 Math.round(x/2)*2 로 만든다). half 가 홀수(9·11)일 때
//      -H+2 부터 세면 홀수 격자가 나와 플레이어가 만든 밭과 다른 격자에 심긴다.
export function farmCellMax(H) { return 2 * Math.floor((H - 1) / 2); }

export function farmCellCount(H) { return Math.pow(farmCellMax(H) + 1, 2); }

export function freeFarmCell() {
  const M = farmCellMax(farmHalf());
  for (let x = -M; x <= M; x += 2) for (let z = -M; z <= M; z += 2) {
    const wx = FARM.x + x, wz = FARM.z + z;
    if (plots.some(p => p.x === wx && p.z === wz)) continue;
    if (obstacles.some(ob => Math.hypot(wx - ob.x, wz - ob.z) < ob.r + 0.95)) continue;
    return { x: wx, z: wz };
  }
  return null;
}

// pickTask 에 넘길 세계 스냅샷 — 밭 상태를 규칙 모듈의 어휘('tilled'|'growing'|'mature')로 번역한다
export function workerWorld(cellCache) {
  const now = clock.elapsedTime;
  const cap = warehouseTotalCap();
  return {
    plots: plots.map((p, i) => ({
      i, state: p.state === 'growing' ? 'growing' : p.state === 'mature' ? 'mature' : 'tilled',
      weed: !!p.weed, pest: !!p.pest, fert: !!p.fert,
      wet: now < (p.wetUntil || 0), wiltAt: (p.needSince || now) + wiltTimeFor(p.cropType, WILT_TIME),
      claimedBy: p.claimedBy || null,
    })),
    emptyCells: cellCache.cell ? 1 : 0,
    seeds: gameState.inventory.seed || 0,
    fertStock: gameState.inventory.fert || 0,
    storageLeft: Math.max(0, cap - storageTotal(gameState.farm.storage) - pendingTotal()),
    pending: pendingTotal(),
  };
}

// 작업 1회의 실제 효과 — 플레이어 토스트·퀘스트·튜토리얼 훅은 타지 않는다(일꾼은 조용히 일한다)
export function workerApply(rec, task, tally) {
  const p = task.i >= 0 ? plots[task.i] : null;
  const bump = k => { if (tally) tally[k] = (tally[k] || 0) + 1; };
  const recs = farmBuildingRecs();
  switch (task.type) {
    case 'water': {
      if (!p || p.state !== 'growing') return false;
      const hive = inRadiusOf(recs, 'beehive', p.x, p.z), well = inRadiusOf(recs, 'well', p.x, p.z);
      p.growth = Math.min(1, p.growth + growthPerWater(p.cropType, !!gameState.upgrades.water, !!p.fert) * (hive ? HIVE_GROWTH_MUL : 1));
      p.wetUntil = clock.elapsedTime + WET_TIME * (well ? WELL_WET_MUL : 1); p.watered = true; p.needSince = 0;
      if (p.growth < MATURE && weedRoll(p.cropType, Math.random())) p.weed = true;
      refreshCropStage(p); bump('water'); return true;
    }
    case 'weed': if (!p?.weed) return false; p.weed = false; bump('weed'); return true;
    case 'pest': if (!p?.pest) return false; p.pest = false; bump('pest'); return true;
    case 'fert': {
      if (!p || p.fert || (gameState.inventory.fert || 0) <= 0) return false;
      gameState.inventory.fert -= 1; p.fert = true; bump('fert'); return true;
    }
    case 'harvest': {
      if (!p || p.state !== 'mature') return false;
      const adv = isAdv(p.cropType);
      let qty = harvestYield(p.cropType, !!p.pest);
      if (hasPerk(rec.job, rec.grade, 'yield')) qty += MASTER_YIELD;   // 🐹 장인 볼주머니
      const key = adv ? p.cropType.id : 'crop';
      gameState.farm.pending[key] = (gameState.farm.pending[key] || 0) + qty;
      if (!adv) gameState.inventory.seed += 2;                          // 기본 작물은 씨앗이 돌아온다(플레이어 수확과 같게)
      // 🔒 일꾼이 거둔 고급 작물도 과수원 해금에 센다 — 플레이어 수확과 같은 함수를 탄다.
      //   토스트는 오프라인 정산(tally 가 있는 호출)에선 띄우지 않는다. 그때 플레이어는 마을에
      //   막 접속한 참이고 요약 모달이 1.4초 뒤에 뜨므로, 거기 한 줄로 얹는 편이 안 묻힌다.
      //   접속 중 일꾼(tally === null)은 플레이어가 그 자리에서 보고 있으니 바로 알린다.
      if (adv && bumpAdvHarvest(p.cropType.id)) {
        if (tally) tally.orchardUnlock = true;
        else ui.toast?.('🍎 마을 동쪽 과수원 언덕이 열렸어요!', 3200);
      }
      if (p.cropType?.id) dexDiscover('crop', p.cropType.id);           // 📖 일꾼이 거둔 작물도 도감에
      p.fert = false; p.weed = false; p.pest = false; p.wilted = false;
      clearCrop(p); p.state = 'empty'; p.growth = 0; p.stage = -1; p.watered = false; p.cropType = null;
      updatePlotVisual(p); bump('harvest'); return true;
    }
    case 'plant': {
      if (!p || (gameState.inventory.seed || 0) <= 0) return false;
      // 🌰 넉넉한 씨앗 주머니는 플레이어가 직접 심을 때만 — 일꾼은 오프라인 12시간까지 돌아서
      //    여기에 난수를 넣으면 정산 결과가 접속할 때마다 달라진다(재현이 안 되는 경제).
      gameState.inventory.seed -= 1;
      p.wilted = false; p.state = 'growing'; p.growth = 0.05; p.stage = -1;
      p.cropType = BASIC_CROPS[Math.floor(Math.random() * BASIC_CROPS.length)];   // 일꾼은 기본 씨앗만(고급 씨앗은 플레이어 몫)
      p.fert = false; p.weed = false; p.pest = false; p.needSince = 0;
      refreshCropStage(p); updatePlotVisual(p); bump('plant'); return true;
    }
    case 'till': {
      const cell = freeFarmCell(); if (!cell) return false;
      createPlot(cell.x, cell.z, true); bump('till'); return true;
    }
    case 'haul': {
      let left = Math.min(HAUL_N, Math.max(0, warehouseTotalCap() - storageTotal(gameState.farm.storage)));
      if (left <= 0) return false;
      let moved = 0;
      for (const k of Object.keys(gameState.farm.pending)) {
        if (left <= 0) break;
        const n = Math.min(left, gameState.farm.pending[k] || 0);
        if (n <= 0) continue;
        gameState.farm.pending[k] -= n;
        gameState.farm.storage[k] = (gameState.farm.storage[k] || 0) + n;
        left -= n; moved += n;
      }
      if (!moved) return false;
      bump('haul'); return true;
    }
  }
  return false;
}

// 작업 1회 완료 — 누적 횟수·승급(모자가 바뀐다)
export function workerDidWork(rec, tally) {
  rec.works = (rec.works || 0) + 1;
  const g = gradeOf(rec.works);
  if (g > rec.grade) {
    rec.grade = g;
    if (tally) (tally.promoted ||= []).push(rec.name + ' ' + gradeInfo(g).name);
    const obj = workerObjs.find(o => o.rec === rec);
    if (obj) { obj.group.remove(obj.hat); obj.hat = makeWorkerHat(g); obj.group.add(obj.hat); }
    trackEvent('worker_promote', { job: rec.job, grade: g, works: rec.works });   // [GA4] 성장 곡선
  }
}

// 밭 밖·오프라인 정산 — 접속 중이든 아니든 같은 함수(§3-6). steps 만 다르다
export function workerSteps(steps, tally) {
  if (!steps || !gameState.workers.length) return tally;
  const carry = {};
  for (let s = 0; s < steps; s++) {
    let didAny = false;
    const cellCache = { cell: freeFarmCell() };
    for (const rec of gameState.workers) {
      if (rec.restingSince) continue;                       // 월급 미납 휴식
      const n = (carry[rec.id] || 0) + worksPerStep(rec.grade, shelterNear(FARM.x, FARM.z));
      let times = Math.floor(n); carry[rec.id] = n - times;
      while (times-- > 0) {
        const task = pickTask(rec, workerWorld(cellCache));
        if (!task || !workerApply(rec, task, tally)) break;
        workerDidWork(rec, tally); didAny = true;
        if (task.type === 'till') cellCache.cell = freeFarmCell();
      }
    }
    if (!didAny) break;   // 아무도 할 일이 없으면 남은 스텝을 돌려도 결과가 같다
  }
  syncFarmSoil(true); syncFarmCrops(true); refreshInventoryUI();
  return tally;
}

// 💰 월급 — 하루 1회(KST). 모자라면 비싼 사람부터 휴식, 코인이 생기면 다음 정산에 복귀(빚 없음)
export function settleWorkerWages(tally) {
  if (!gameState.workers.length) return 0;
  const today = todayStr();
  if (gameState.farm.wageDate === today) return 0;
  const first = !gameState.farm.wageDate;
  gameState.farm.wageDate = today;
  if (first) return 0;                                    // 고용한 첫날은 받지 않는다
  const r = settleWages(gameState.workers, gameState.inventory.coins || 0);
  gameState.inventory.coins = r.coins;
  for (const w of gameState.workers) {
    if (r.resting.includes(w.id)) w.restingSince = Date.now();
    if (r.back.includes(w.id)) w.restingSince = 0;
  }
  if (r.paid) logEcon('worker_wage', 'day', -r.paid, gameState.inventory.coins);   // [원장] 월급 지출
  if (tally) { tally.wage = r.paid; tally.resting = r.resting.length; }
  trackEvent('worker_wage', { paid: r.paid, workers: gameState.workers.length, resting: r.resting.length });   // [GA4]
  refreshInventoryUI();
  return r.paid;
}

// 로그인 시 오프라인 정산 — 모달 1장으로 요약(§3-6)
export function catchUpWorkers() {
  if (!gameState.workers.length) { gameState.farm.lastSettleAt = Date.now(); return; }
  const tally = {};
  settleWorkerWages(tally);
  const steps = catchUpSteps(gameState.farm.lastSettleAt, Date.now());
  gameState.farm.lastSettleAt = Date.now();
  if (steps) workerSteps(steps, tally);
  const done = ['water', 'harvest', 'plant', 'till', 'weed', 'pest', 'fert', 'haul'].reduce((a, k) => a + (tally[k] || 0), 0);
  if (!done && !tally.wage) return;
  const lines = [];
  if (tally.harvest) lines.push(`🌾 ${tally.harvest}칸 수확`);
  if (tally.water) lines.push(`💧 ${tally.water}번 물주기`);
  if (tally.plant) lines.push(`🌰 ${tally.plant}칸 심기`);
  if (tally.till) lines.push(`⛏️ ${tally.till}칸 새로 갈기`);
  if (tally.weed || tally.pest) lines.push(`🌿 잡초·해충 ${(tally.weed || 0) + (tally.pest || 0)}건`);
  if (tally.haul) lines.push(`🧺 창고로 ${tally.haul}번 운반`);
  const body = (lines.join(' · ') || '할 일이 없어 쉬었어요')
    + (tally.wage ? `\n💰 월급 🪙${tally.wage} 나갔어요` : '')
    + (tally.resting ? `\n😴 코인이 모자라 ${tally.resting}명이 쉬고 있어요` : '')
    + (tally.promoted?.length ? `\n🎉 ${tally.promoted.join(' · ')} 승급!` : '')
    + (tally.orchardUnlock ? '\n🍎 일꾼이 고급 작물을 거둬 마을 동쪽 과수원이 열렸어요!' : '');   // 🔒 오프라인 해금은 토스트 대신 여기 한 줄로
  setTimeout(() => ui.showHintModal?.({ ico: '🧑‍🌾', title: '일꾼들이 일했어요', body }), 1400);
  trackEvent('worker_offline', { steps, harvest: tally.harvest || 0, water: tally.water || 0, wage: tally.wage || 0 });   // [GA4] 오프라인 산출
  requestSave();
}

// 🔥 자고 일어난 사이에 다 된 것을 알린다. **자동으로 받아 주지는 않는다** —
//    받으러 가는 행동 자체가 '돌아온 보람' 이라 그것까지 없애면 알림만 남는다.
//    받기 전까지 매 세션 뜨면 성가시므로 하루 한 번만.
export function catchUpCraft() {
  const today = todayStr();
  const ready = (gameState.craft?.slots || []).filter(s => isReady(s, today));
  if (!ready.length || gameState.craft.noticedDay === today) return;
  gameState.craft.noticedDay = today;
  const names = [...new Set(ready.map(s => craftRecipeOf(s.item).ico + craftRecipeOf(s.item).name))];
  trackEvent('craft_ready_notice', {
    n: ready.length,
    max_waited: Math.max(...ready.map(s => waitedDays(s.day, today))),
  });
  // 시설이 섞였으면 한쪽 이름으로 말하면 안 된다 — 발효통 것을 "구워졌다" 고 알리면 거짓말이다
  const kinds = [...new Set(ready.map(s => stationOf(s.item)))];
  const one = kinds.length === 1 ? stationDef(kinds[0]) : null;
  setTimeout(() => ui.showHintModal?.({
    ico: one ? one.ico : '📦',
    title: one ? one.notice : '밤사이 가공이 다 됐어요',
    body: `${names.join(' · ')}\n${one ? one.go : '시설에 가서 받아 가세요'}`,
  }), 2200);            // 일꾼 요약(1400) 뒤에 뜨도록
  requestSave();
}

export function makeWorkerHat(grade) {
  const g = new THREE.Group();
  if (grade === 0) {
    const kerchief = new THREE.Mesh(new THREE.SphereGeometry(0.33, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), clayMat(0xd96a5a, false));
    kerchief.position.y = 1.02; kerchief.castShadow = true; g.add(kerchief);
  } else {
    const wide = grade === 2 ? 0.5 : 0.4;
    const hat = new THREE.Mesh(mergeGeos([                              // 챙 + 관은 같은 재질이라 하나로(드로우콜)
      new THREE.CylinderGeometry(wide, wide, 0.04, 12).translate(0, 1.14, 0),
      new THREE.ConeGeometry(wide * 0.62, 0.26, 12).translate(0, 1.28, 0),
    ]), clayMat(grade === 2 ? 0xe8c877 : 0xf0cd6a, false));
    hat.castShadow = true; g.add(hat);
    if (grade === 2) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(wide * 0.63, 0.03, 5, 12), clayMat(0x8e5b3a, false));
      band.position.y = 1.18; band.rotation.x = Math.PI / 2; g.add(band);
    }
  }
  return g;
}

export function makeWorkerMesh(rec) {
  const j = jobOf(rec.job), g = new THREE.Group();
  // 몸·머리·귀·꼬리는 색이 같다 — **한 메시로 합친다**(일꾼 6명이면 콜 차이가 20 넘는다, 스펙 §5 예산)
  const bodyGeos = [
    new THREE.IcosahedronGeometry(0.42, 1).scale(1, 1.05, 1).translate(0, 0.5, 0),
    new THREE.IcosahedronGeometry(0.3, 1).translate(0, 1.0, 0),
  ];
  if (rec.job === 'mole') for (const sd of [-1, 1]) bodyGeos.push(new THREE.SphereGeometry(0.07, 7, 6).translate(sd * 0.2, 1.16, 0));
  if (rec.job === 'hamster') for (const sd of [-1, 1]) bodyGeos.push(new THREE.SphereGeometry(0.1, 8, 7).translate(sd * 0.22, 1.2, 0));
  if (rec.job === 'squirrel') {
    for (const sd of [-1, 1]) bodyGeos.push(new THREE.ConeGeometry(0.08, 0.18, 6).translate(sd * 0.18, 1.26, 0));
    bodyGeos.push(new THREE.SphereGeometry(0.16, 8, 7).translate(0, 0.62, -0.42), new THREE.SphereGeometry(0.13, 8, 7).translate(0, 0.92, -0.5));   // 🐿️ 꼬리
  }
  const body = new THREE.Mesh(mergeGeos(bodyGeos), clayMat(j.body, false)); body.castShadow = true; g.add(body);
  const eyes = new THREE.Mesh(mergeGeos([
    new THREE.SphereGeometry(0.045, 8, 8).translate(-0.11, 1.03, 0.26),
    new THREE.SphereGeometry(0.045, 8, 8).translate(0.11, 1.03, 0.26),
  ]), new THREE.MeshStandardMaterial({ color: 0x3a2f2a, roughness: 0.6 }));
  g.add(eyes);
  const mkArm = sd => {   // 팔은 흔들어야 해서 따로(회전 축이 필요하다)
    const pivot = new THREE.Group(); pivot.rotation.order = 'YXZ';
    pivot.position.set(sd * 0.38, 0.62, 0.1);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.2, 4, 6), clayMat(j.body, false));
    upper.position.y = -0.14; upper.castShadow = true; pivot.add(upper);
    const hand = new THREE.Group(); hand.position.y = -0.3; pivot.add(hand);
    return { pivot, hand };
  };
  const armR = mkArm(1), armL = mkArm(-1);
  g.add(armR.pivot, armL.pivot);
  const hat = makeWorkerHat(rec.grade); g.add(hat);
  let tool = null;   // 도구는 일할 때만 보인다 — 안 보이는 메시는 그리지 않으니 드로우콜도 아낀다
  const toolId = rec.job === 'mole' ? 'hoe' : rec.job === 'hamster' ? 'sickle' : null;
  if (toolId) { tool = toolMesh(toolId); tool.scale.setScalar(0.8); tool.visible = false; armR.hand.add(tool); }
  return { group: g, armR, armL, hat, tool };
}

export function spawnWorkers() {
  despawnWorkers();
  for (const rec of gameState.workers) {
    const m = makeWorkerMesh(rec);
    const a = Math.random() * Math.PI * 2, r = Math.max(1.5, farmHalf() - 3);
    m.group.position.set(FARM.x + Math.cos(a) * r, 0, FARM.z + Math.sin(a) * r);
    m.group.visible = atFarm;
    scene.add(m.group);
    workerObjs.push({ rec, ...m, task: null, plot: null, phase: 'idle', t: 0, swing: 0, target: { x: FARM.x, z: FARM.z } });
  }
}

export function despawnWorkers() {
  for (const o of workerObjs) {
    scene.remove(o.group);
    o.group.traverse(n => { if (n.isMesh) { n.geometry?.dispose?.(); for (const mm of Array.isArray(n.material) ? n.material : [n.material]) mm?.dispose?.(); } });
  }
  workerObjs.length = 0;
  for (const p of plots) p.claimedBy = null;
}

export function setWorkersVisible(v) { for (const o of workerObjs) o.group.visible = v; }

// 일꾼 이동 — 주민과 달리 밭을 피하지 않는다(밭으로 들어가야 하니까, 스펙 §3-8)
export function stepWorkerToward(o, target, speed, dt) {
  const dx = target.x - o.group.position.x, dz = target.z - o.group.position.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.05) return d;
  const ang = Math.atan2(dx, dz);
  for (const off of [0, 0.7, -0.7]) {
    const a = ang + off;
    const nx = o.group.position.x + Math.sin(a) * speed * dt, nz = o.group.position.z + Math.cos(a) * speed * dt;
    if (obstacles.some(ob => ob.r > 0.3 && Math.hypot(nx - ob.x, nz - ob.z) < ob.r + 0.4)) continue;   // 시설·장식만 피한다(밭 금지 원 r0.1 은 통과)
    o.group.position.x = nx; o.group.position.z = nz; break;
  }
  o.group.rotation.y = lerpAngle(o.group.rotation.y, ang, 0.2);
  return Math.hypot(target.x - o.group.position.x, target.z - o.group.position.z);
}

export function updateWorkers(dt) {
  if (mode !== 'play' || !gameState.workers.length) return;
  if (todayStr() !== gameState.farm.wageDate) settleWorkerWages(null);
  if (!atFarm) {   // 밭 밖 — 오프라인과 같은 규칙(60초 스텝)
    workerStepAcc += dt;
    if (workerStepAcc >= STEP_SEC) {
      const steps = Math.floor(workerStepAcc / STEP_SEC); workerStepAcc -= steps * STEP_SEC;
      workerSteps(steps, null); gameState.farm.lastSettleAt = Date.now();
    }
    return;
  }
  workerStepAcc = 0; gameState.farm.lastSettleAt = Date.now();
  const cellCache = { cell: null };
  for (const o of workerObjs) {
    const rec = o.rec;
    if (rec.restingSince) { if (o.tool) o.tool.visible = false; continue; }
    o.t -= dt;
    if (o.phase === 'idle') {
      if (o.t > 0) continue;
      if (!cellCache.cell) cellCache.cell = freeFarmCell();
      const task = pickTask(rec, workerWorld(cellCache));
      if (!task) { o.t = 1.2; continue; }                       // 할 일 없음 → 잠깐 쉰다
      o.task = task;
      if (task.i >= 0) { o.plot = plots[task.i]; o.plot.claimedBy = rec.id; o.target = { x: o.plot.x, z: o.plot.z }; }
      else if (task.type === 'till') { o.plot = null; o.target = { ...cellCache.cell }; cellCache.cell = null; }
      else { o.plot = null; const b = farmBuildingRecs().find(b => b.id === 'warehouse'); o.target = b ? { x: b.x, z: b.z } : { x: FARM.x, z: FARM.z }; }
      o.phase = 'walk';
    } else if (o.phase === 'walk') {
      const speed = WORKER_SPEED * (hasPerk(rec.job, rec.grade, 'speed') ? MASTER_SPEED : 1);
      const d = stepWorkerToward(o, o.target, speed, dt);
      o.group.position.y = Math.abs(Math.sin(clock.elapsedTime * 7)) * 0.04;   // 종종걸음
      if (d < 1.2) { o.phase = 'work'; o.t = workSecOf(rec.grade, shelterNear(o.target.x, o.target.z)); o.swing = 0; if (o.tool) o.tool.visible = true; }
    } else if (o.phase === 'work') {
      o.swing += dt * 6;
      o.armR.pivot.rotation.x = -Math.abs(Math.sin(o.swing)) * 0.9;   // 팔 스윙 제스처
      if (o.t <= 0) {
        o.armR.pivot.rotation.x = 0; if (o.tool) o.tool.visible = false;
        if (workerApply(rec, o.task, null)) {
          workerDidWork(rec, null); spawnDust(o.target.x, o.target.z, 4);
          syncFarmCrops(true); syncFarmSoil(true); refreshInventoryUI();
        }
        if (o.plot) o.plot.claimedBy = null;
        o.plot = null; o.task = null; o.phase = 'idle'; o.t = 0.35;
      }
    }
  }
}

export function commandPet() {
  if (!canCommand(gameState.pet, Date.now())) {
    spawnFloatText(player.position.x, 1.6, player.position.z, '조금 쉬고 있어요');
    return;
  }
  $w.petJob = { done: 0, task: null, before: stageOf(gameState.pet.works) };
}

export function updatePet(dt, t) {
  if (!pet3d) return;
  // 👣 발자국과 같은 규칙 — 바닥이 없거나 카메라가 붙는 공간에선 끈다.
  //    다시 보일 땐 플레이어 발밑에서 시작한다(따라오느라 벽을 뚫지 않게).
  const off = indoor || atCafe || atMuseum || atMine;
  if (off) {
    if (pet3d.visible) { pet3d.visible = false; $w.petJob = null; }
    return;
  }
  if (!pet3d.visible) { pet3d.visible = true; pet3d.position.set(player.position.x, 0, player.position.z); }
  // 🚪 공간을 옮겼거나 플레이어가 멀리 달아났다 — 발밑으로 붙고, 하던 일은 **한 만큼 쳐서** 끝낸다
  //    (그냥 버리면 이미 물을 준 칸이 works 에도 쿨다운에도 안 남는다)
  if (snapIfFar(pet3d, player.position) && petJob) finishPetJob();
  updatePetAnim(pet3d, t);
  if (!petJob) { followPlayer(pet3d, player.position, dt); return; }
  if (!petJob.task) {
    if (petJob.done >= CHAIN_MAX) return finishPetJob();
    petJob.task = pickPetTask(petWorld(), player.position, PET_RADIUS);
    if (!petJob.task) return finishPetJob();
  }
  const p = plots[petJob.task.i];
  if (!p) { petJob.task = null; return; }              // 밭이 사라졌으면 다시 고른다
  if (walkTo(pet3d, p.x, p.z, dt)) {
    if (petApply(petJob.task)) { petJob.done++; spawnDust(p.x, p.z, 4); }
    petJob.task = null;
  }
}

// 🐾 펫이 보는 밭 — workerWorld 는 좌표를 안 담는다(일꾼은 밭 전체를 보니까).
//    펫은 반경 판정이 필요하므로 x·z 를 얹는다.
export function petWorld() {
  const now = clock.elapsedTime;
  return plots.map((p, i) => ({
    i, x: p.x, z: p.z,
    state: p.state === 'growing' ? 'growing' : p.state === 'mature' ? 'mature' : 'tilled',
    weed: !!p.weed, pest: !!p.pest,
    wet: now < (p.wetUntil || 0),
    wiltAt: (p.needSince || now) + wiltTimeFor(p.cropType, WILT_TIME),
  }));
}

// 🐾 펫의 작업 적용 — **물·잡초·해충 셋만**. 수확·파종은 일부러 없다(스펙 §7-1).
//    ⚠️ workerApply(rec, task, tally) 를 그대로 못 쓴다 — 일꾼 레코드를 받고 수확·운반까지 안다.
//       물주기 본문은 workerApply 의 case 'water' 를 **그대로 옮긴다**(벌통·우물 보정 포함).
//       그래야 펫이 준 물과 일꾼이 준 물이 다르게 자라는 일이 없다.
export function petApply(task) {
  const p = plots[task.i];
  if (!p) return false;
  switch (task.type) {
    case 'water': {
      if (p.state !== 'growing') return false;
      const recs = farmBuildingRecs();
      const hive = inRadiusOf(recs, 'beehive', p.x, p.z), well = inRadiusOf(recs, 'well', p.x, p.z);
      p.growth = Math.min(1, p.growth + growthPerWater(p.cropType, !!gameState.upgrades.water, !!p.fert) * (hive ? HIVE_GROWTH_MUL : 1));
      p.wetUntil = clock.elapsedTime + WET_TIME * (well ? WELL_WET_MUL : 1);
      p.watered = true; p.needSince = 0;
      if (p.growth < MATURE && weedRoll(p.cropType, Math.random())) p.weed = true;
      refreshCropStage(p);
      return true;
    }
    case 'weed': if (!p.weed) return false; p.weed = false; syncFarmSoil(true); return true;
    case 'pest': if (!p.pest) return false; p.pest = false; syncFarmCrops(true); return true;
    default: return false;
  }
}

export const SKILL_LABEL = { water: '💧물주기', till: '⛏️밭 갈기', fert: '🌱비료', weed: '🌿김매기', harvest: '🌾수확', plant: '🌰심기', haul: '🧺운반', pest: '🐛해충 쫓기' };

export function gradeSkillText(job, grade) { return skillsOf(job, grade).map(k => SKILL_LABEL[k] || k).join(' · '); }

export function hireCandidates() {
  const today = todayStr();
  if (gameState.farm.hireDate !== today) { gameState.farm.hireDate = today; gameState.farm.hireTaken = []; }
  return candidatesFor(dateHash('hire')).map((c, i) => ({ ...c, i, taken: gameState.farm.hireTaken.includes(i) }));
}

export function hireView() {
  return {
    cost: HIRE_COST, coins: gameState.inventory.coins || 0, cap: workerCap(), n: gameState.workers.length,
    wage: dailyWage(gameState.workers),
    candidates: hireCandidates().map(c => ({ i: c.i, taken: c.taken, name: c.name, ico: jobOf(c.job).ico, job: jobOf(c.job).name, skill: gradeSkillText(c.job, 0) })),
    workers: gameState.workers.map(w => ({
      id: w.id, name: w.name, ico: jobOf(w.job).ico, job: jobOf(w.job).name,
      grade: gradeInfo(w.grade).name, wage: gradeInfo(w.grade).wage, works: w.works || 0,
      next: toNextGrade(w.works || 0), resting: !!w.restingSince, skill: gradeSkillText(w.job, w.grade),
    })),
  };
}

export function hireWorker(idx) {
  const c = hireCandidates()[idx];
  if (!c || c.taken) { ui.toast?.('📋 이미 데려온 일꾼이에요', 2200); return false; }
  if (gameState.workers.length >= workerCap()) { ui.toast?.(`📋 지금 밭에선 ${workerCap()}명까지 — 📐측량소에서 밭을 넓혀요`, 3200); return false; }
  if ((gameState.inventory.coins || 0) < HIRE_COST) { ui.toast?.(`📋 초빙료가 모자라요 — 🪙${gameState.inventory.coins || 0}/${HIRE_COST}`, 2800); return false; }
  gameState.inventory.coins -= HIRE_COST;
  logEcon('worker_hire', c.job, -HIRE_COST, gameState.inventory.coins);   // [원장]
  gameState.farm.hireTaken.push(idx);
  gameState.workers.push({ id: 'w' + Date.now().toString(36) + Math.floor(Math.random() * 99), job: c.job, grade: 0, works: 0, name: c.name, hiredAt: Date.now(), restingSince: 0 });
  if (!gameState.farm.wageDate) gameState.farm.wageDate = todayStr();   // 고용한 날은 월급이 없다
  spawnWorkers(); setWorkersVisible(atFarm);
  refreshInventoryUI(); Sound.complete();
  ui.toast?.(`${jobOf(c.job).ico} ${c.name} 도착! 오늘부터 밭일을 도와요`, 3000);
  trackEvent('worker_hire', { job: c.job, n: gameState.workers.length, cap: workerCap() });   // [GA4] 고용 퍼널
  requestSave(); ui.openHire?.(hireView());
  return true;
}

// 📋 내보낸 사람이 오늘 게시판에서 온 사람이면 그 자리를 다시 연다 —
//    안 풀면 후보가 '고용함'으로 잠긴 채 남아 그날은 다시 데려올 수 없다.
export function releaseHireSlot(rec) {
  const today = todayStr();
  if (gameState.farm.hireDate !== today) return;            // 게시판 명단이 이미 어제 것 → 곧 새로 뽑힌다
  if (dayStr(rec.hiredAt || 0) !== today) return;           // 어제 데려온 사람은 오늘 명단에 자리가 없다
  gameState.farm.hireTaken = releaseCandidate(gameState.farm.hireTaken, rec, candidatesFor(dateHash('hire')));
}

export function fireWorker(id) {
  const i = gameState.workers.findIndex(w => w.id === id);
  if (i < 0) return false;
  const [rec] = gameState.workers.splice(i, 1);
  releaseHireSlot(rec);
  spawnWorkers(); setWorkersVisible(atFarm);
  ui.toast?.(`${jobOf(rec.job).ico} ${rec.name} 떠났어요`, 2600);
  trackEvent('worker_fire', { job: rec.job, works: rec.works || 0, grade: rec.grade });   // [GA4] 이탈
  requestSave(); ui.openHire?.(hireView());
  return true;
}

export function hireBoardInteract() {
  trackEvent('hireboard_open', { workers: gameState.workers.length });   // [GA4]
  ui.openHire?.(hireView());
}

// 성장은 오직 물주기로만! 여기선 마름·목마름 알림·시들기를 처리(리얼리티)
export function updatePlots(dt) {
  const now = clock.elapsedTime;
  // 🪏 삽질 타격 시점(밟아 꽂는 순간)에 상태 전이 · 유예 만료 복구 · 2타 연출
  if (pendingDig && (actAnim <= 0 || 1 - actAnim >= DIG_HIT_AT)) { const d = pendingDig; $w.pendingDig = null; digHit(d.plot, d.second); }
  for (const plot of plots) {
    if (plot.digAt && now - plot.digAt > DIG_WINDOW && !(pendingDig && pendingDig.plot === plot)) expireDig(plot);
    if (plot.digBackT > 0) {
      plot.digBackT = Math.max(0, plot.digBackT - dt);
      setPlotDug(plot, plot.digBackT / DIG_RESTORE);
      if (plot.digBackT === 0) demotePlotRidges(plot);   // 🪏 복구 끝 → 인스턴스로 강등
    }
  }
  updateDigFx(dt);
  for (const plot of plots) {
    if (plot.state === 'growing') {
      if (RAIN_DAY) {   // 🌧️ 비 오는 날: 흙이 계속 촉촉 + 천천히 저절로 자람(물주기 불필요)
        plot.wetUntil = Math.max(plot.wetUntil || 0, now + 1.5);
        plot.growth = Math.min(1, plot.growth + (dt || 0) * 0.012);
        refreshCropStage(plot);
        if (plot.state !== 'growing') continue;   // 방금 다 자랐으면(mature) 아래 로직 스킵
      }
      const wet = now < (plot.wetUntil || 0);
      if (wet !== plot.watered) { plot.watered = wet; updatePlotVisual(plot); }
      if (wet) { plot.needSince = 0; }
      else {
        if (!plot.needSince) plot.needSince = now;              // 목마르기 시작
        else if (now - plot.needSince > wiltTimeFor(plot.cropType, WILT_TIME)) wiltPlot(plot); // 오래 방치 → 시듦(고급은 60%)
      }
      // 배지: 🌿잡초 > 🐛해충 > 💧물 줘요(목마른 성장 작물) — 막고 있는 것부터 보여 준다
      plot.hint = plot.weed ? 3 : plot.pest ? 4 : !wet ? 0 : -1;
    } else if (plot.state === 'mature') {
      plot.hint = plot.pest ? 4 : 1;   // 다 자람 → "수확!" (해충이 붙어 있으면 그걸 먼저 — 수확량 절반)
    } else if (plot.state === 'empty') {
      setPlotWarn(plot, false); setPlotHarvest(plot, false); setPlotSeedHint(plot, true); // 빈 밭 → "씨앗!"
    } else {
      setPlotWarn(plot, false); setPlotHarvest(plot, false); setPlotSeedHint(plot, false); // 시든 밭 등
    }
  }
  updateFarmPops(dt);   // 🌾 팝 중인 칸만 행렬 갱신
  syncFarmHints(now);   // 🌾 배지 빌보드 — 떠 있는 배지가 있을 때만 내부에서 실제로 버퍼를 건드린다
}
