// =============================================================
//  🪏 삽: 빈 밭 메우기(두 번 파기) — 설계 docs/superpowers/specs/2026-09-08-shovel-untill-design.md
//  ------------------------------------------------------------
//  js/game.js 에서 원문 그대로 옮겨 온 구역(분리 2단계, 2026-09-26).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 에 남은 let 에 쓸 때는 `$w.x = …` (읽기는 그냥 x). 도구·증명: tools/refactor/
// =============================================================
import {
  $w, DIG_WINDOW, clayMat, clock, dexDiscover, dist2D, doPlayerAction, farmBuildingRecs, gameState, giveReward,
  lastDoorPrompt, pendingDig, player, plots, questEvent, refreshCropStage, refreshInventoryUI, requestSave,
  scene, spawnDust, spawnFloatText, spawnSparkle, spawnWater, todayStr, ui, updatePlotVisual, weatherOf,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))
import { trackEvent } from '../analytics.js';
import { WET_TIME } from '../data/tools.js';
import { PAL } from '../data/world.js';
import { COMPOST_PER_DAY, HIVE_GROWTH_MUL, HONEY_PER_HIVE, WELL_WET_MUL, compostLeft, inRadiusOf } from '../farm-building.js';
import { MATURE, growthPerWater, isAdv, pestChance, weedRoll } from '../farm-crops.js';
import { Sound } from '../sound.js';
import { josa } from '../spaces/cafe.js';
import { syncFarmSoil } from '../spaces/farm.js';
import { traceObjs } from '../spaces/night-visit.js';
import { plantSeed } from '../spaces/orchard-actions.js';
import { outdoorZone } from '../spaces/outdoor-decor.js';
import { digIsOneShot } from '../tool-tiers.js';
import * as THREE from 'three';

export const DIG_ANIM_DUR = 0.6;

export const DIG_HIT_AT = 0.30;

export const DIG_RESTORE = 0.4;

export const DIG_DEX = [['worm', 0.10], ['shard', 0.05], ['old_coin', 0.02]];

export const digFx = [];

export function digTarget() { return plots.find(p => dist2D(p.group.position, player.position) < 1.6) || null; }

export function tryDig() {
  if (pendingDig) return;                                  // 제스처 중 연타 무시
  const plot = digTarget();
  if (!plot) { ui.toast?.('여긴 밭이 없어요. 빈 밭 위에서 파요'); return; }
  if (plot.state !== 'empty') { ui.toast?.('작물이 있어요 — 수확하거나 괭이로 정리한 뒤 메울 수 있어요'); return; }
  const second = digIsOneShot(gameState) || (!!plot.digAt && clock.elapsedTime - plot.digAt <= DIG_WINDOW);   // 🪏 넓은 삽은 첫 타가 곧 2타. 아니면 누른 순간 기준으로 판정
  doPlayerAction(plot.x, plot.z, 'dig');
  Sound.till();
  $w.pendingDig = { plot, second };
}

export function digHit(plot, second) {
  if (!plots.includes(plot) || plot.state !== 'empty') return;
  if (second) { removePlot(plot); return; }
  plot.digAt = clock.elapsedTime; plot.digBackT = 0;
  setPlotDug(plot, 1);
  spawnDust(plot.x, plot.z, 10);
  ui.toast?.('한 번 더 파면 밭이 사라져요 🪏');
  trackEvent('dig_plot', { step: 1 });   // [GA4]
}

export function removePlot(plot) {
  const i = plots.indexOf(plot); if (i >= 0) plots.splice(i, 1);
  scene.remove(plot.group);
  syncFarmSoil(true);                      // 🌾 흙 인스턴스 버퍼에서도 빠지게
  spawnDust(plot.x, plot.z, 22);
  spawnDigRegrow(plot.x, plot.z);
  Sound.harvest();
  ui.toast?.('밭을 메웠어요 — 다시 풀밭이 됐어요 🌱');
  trackEvent('dig_plot', { step: 2, plots: plots.length, one_shot: digIsOneShot(gameState) ? 1 : 0 });   // [GA4] 🪏 넓은 삽은 step:1 이 안 나가 퍼널이 끊긴다
  rollDigDex();
  $w.lastDoorPrompt = null; ui.setDoorPrompt?.(null);
}

// 🪏 삽 1타 연출 전용 — 이랑 3줄을 제각각 기울이려면 개별 메시여야 한다.
//   동시에 한 칸뿐이라 +3콜. 유예가 끝나면 demote 로 인스턴스에 되돌린다.
//   ⚠️ 지오메트리·재질은 3줄이 전부 같고 삽질은 한 세션에 수십~수백 번 반복하는 행동이다. 호출마다
//     new BoxGeometry ×3 + clayMat ×3 을 만들면 demote 가 참조만 버리고(dispose 금지 규칙) three 는
//     dispose 이벤트로만 VBO 를 정리하므로 컨텍스트 수명 내내 샌다 → **모듈 수준에서 한 번만 만들어 공유**한다.
//     setPlotDug 가 바꾸는 건 r.rotation / r.position 뿐이라(재질·지오메트리는 안 건드린다) 공유해도 안전하다.
// 1타 연출: 흙더미와 파인 자리가 스르르 솟았다 가라앉는다. k 0~1(만료 복구 땐 1→0 보간).
//   ⚠️ A안에서 이랑은 평상시에도 없다 — 예전처럼 이랑을 승격시키면 "없던 3줄이 툭 생겼다
//      툭 사라지는" 연출이 된다. 파고 남는 흔적(흙더미·구멍)만으로 충분하고, 그게 더 맞다.
export function setPlotDug(plot, k) {
  if (!plot.mound) {
    plot.mound = new THREE.Mesh(new THREE.SphereGeometry(0.32, 9, 7), clayMat(PAL.soilWet, false));
    plot.mound.position.set(0.55, 0.2, -0.45); plot.mound.castShadow = true;
    plot.hole = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.30, 0.12, 9), clayMat(0x5e3d28, false));
    plot.hole.position.set(-0.25, 0.18, 0.15);
    plot.group.add(plot.mound, plot.hole);
  }
  // 크기로 드나들게 해 팝인·팝아웃을 없앤다(k=0 이면 사실상 안 보인다)
  const e = Math.max(0.001, k);
  plot.mound.visible = plot.hole.visible = k > 0.01;
  plot.mound.scale.set(1.3 * e, 0.55 * e, 1.1 * e);
  plot.hole.scale.set(e, 1, e);
}

export function expireDig(plot) {
  plot.digAt = 0; plot.digBackT = DIG_RESTORE;
  ui.toast?.('밭을 그대로 두었어요');
  trackEvent('dig_expire');   // [GA4]
  if (lastDoorPrompt && lastDoorPrompt.startsWith('🪏')) { $w.lastDoorPrompt = null; ui.setDoorPrompt?.(null); }
}

// 2타 연출: 연한 흙 자국이 풀색으로 돌아가고(페이드) 새싹 7개가 톡톡 돋았다가 사라진다
export function spawnDigRegrow(x, z) {
  const patch = new THREE.Mesh(new THREE.CircleGeometry(0.95, 14), new THREE.MeshStandardMaterial({ color: 0xc9a988, roughness: 1, transparent: true, opacity: 0.9 }));
  patch.rotation.x = -Math.PI / 2; patch.position.set(x, 0.012, z); scene.add(patch);
  digFx.push({ mesh: patch, t: 0, kind: 'patch' });
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 5), clayMat(PAL.sprout, false));
    s.position.set(x + (Math.random() - 0.5) * 1.3, 0.1, z + (Math.random() - 0.5) * 1.3);
    s.scale.setScalar(0.01); scene.add(s);
    digFx.push({ mesh: s, t: 0, kind: 'sprout', delay: 0.15 + i * 0.08 });
  }
}

export function updateDigFx(dt) {
  for (let i = digFx.length - 1; i >= 0; i--) {
    const f = digFx[i]; f.t += dt;
    if (f.kind === 'patch') {
      f.mesh.material.opacity = Math.max(0, 0.9 - f.t * 0.6);   // 1.5초에 사라짐
      if (f.t > 1.6) { scene.remove(f.mesh); digFx.splice(i, 1); }
    } else {
      const q = Math.max(0, f.t - f.delay), k = Math.min(1, q * 4);
      const pop = 1 + 0.35 * Math.sin(Math.min(1, q * 3) * Math.PI);
      const fade = q > 1.6 ? Math.max(0, 1 - (q - 1.6) / 0.4) : 1;   // 2초쯤 뒤 사라짐
      f.mesh.scale.setScalar(Math.max(0.01, k * pop * fade));
      if (q > 2.0) { scene.remove(f.mesh); digFx.splice(i, 1); }
    }
  }
}

export function rollDigDex() {
  const r = Math.random(); let acc = 0;
  for (const [id, p] of DIG_DEX) {
    if (gameState.dex.dig?.[id]) continue;
    acc += p;
    if (r < acc) { dexDiscover('dig', id); return; }
  }
}

// 씨앗: 갈아둔 빈 밭에 씨앗 심기
export function trySeed(plot = plots.find(p => p.state === 'empty' && !p.digAt && dist2D(p.group.position, player.position) < 1.6)) {   // 🪏 반쯤 판 밭엔 안 심어짐
  if (!plot) { ui.toast?.('갈아둔 밭이 없어요 — ⛏️ 괭이로 먼저 갈기'); return; }
  if (gameState.inventory.seed <= 0) {
    // 밭에 자라는 작물도 없으면 완전히 막힌 상태 → 씨앗 지급(안전장치)
    const hasGrowing = plots.some(p => p.state === 'growing' || p.state === 'mature');
    if (!hasGrowing) {
      gameState.inventory.seed += 3; refreshInventoryUI();
      ui.showSeedHelp?.();   // 안내 모달로 상황 설명 + 채워줌 (이번엔 안내만, 다시 눌러 심기)
      return;
    } else {
      ui.toast?.('씨앗이 없어요 — 작물을 수확하면 씨앗이 늘어요 🌾'); return;
    }
  }
  plantSeed(plot);
}

// 🐾 조사할 밤손님 흔적 — handleAction 과 farmActionFirst 가 같은 판정을 써야 한다
//   (흔적은 작물을 빼앗긴 밭 좌표 위에 그대로 생겨서, 그 밭에 서면 둘 다 걸린다)
export function traceTarget() { return traceObjs.find(t => dist2D(t.mesh.position, player.position) < 1.7) || null; }

// 🌿 잡초 밭 — handleAction 이 채집·흔적 다음, 대화보다 먼저 본다
export function weedTarget() {
  if (!outdoorZone()) return null;
  return plots.find(p => p.weed && dist2D(p.group.position, player.position) < 1.8) || null;
}

export function pullWeed(plot) {
  plot.weed = false;
  doPlayerAction(plot.x, plot.z, 'pick');   // 허리 숙여 뽑기(채집 제스처)
  Sound.harvest(); spawnDust(plot.x, plot.z, 8);
  spawnFloatText(plot.x, 1.0, plot.z, '🌿', '#3f7a3a');
  { const nm = plot.cropType?.name || '작물'; ui.toast?.(`🌿 잡초를 뽑았어요 — ${nm}${josa(nm, '이', '가')} 다시 자라요`, 2000); }
  const composted = compostWeed();   // 🌱 퇴비통이 있으면 뽑은 잡초 → 비료(하루 3)
  trackEvent('weed_pull', { kind: plot.cropType?.id, compost: composted });   // [GA4] 공정 수행
}

// 🌱 퇴비통 — 잡초·시든 작물을 비료로. 하루 COMPOST_PER_DAY 개까지, 통이 하나라도 있으면
export function compostWeed() {
  if (!farmBuildingRecs().some(b => b.id === 'compost')) return false;
  const today = todayStr(), st = gameState.farm;
  if (compostLeft(st, today) <= 0) return false;   // 날짜가 바뀌었는지는 compostLeft 가 본다
  if (st.compostDate !== today) { st.compostDate = today; st.compostN = 0; }
  st.compostN += 1;
  giveReward({ fert: 1 }, 'compost');
  setTimeout(() => ui.toast?.(`🌱 퇴비통에서 비료 +1 (오늘 ${st.compostN}/${COMPOST_PER_DAY})`, 2000), 1100);
  return true;
}

// 🐛 해충 — 하루 1회 정산(접속 시). 비 온 다음 날 확률↑. 고급 작물만. 밤손님·날씨 이벤트와 같은 "날짜 비교" 문법
export function resolveFarmPests() {
  const today = todayStr(), st = gameState.farm;
  if (st.pestDate === today) return;
  const first = !st.pestDate; st.pestDate = today;
  if (first) return;   // 처음 기록하는 날은 판정 없이 날짜만(밤손님과 같은 첫날 규칙)
  const rain = weatherOf(-1) === 'rain';
  let hit = 0;
  for (const p of plots) {
    if ((p.state !== 'growing' && p.state !== 'mature') || p.pest || !isAdv(p.cropType)) continue;
    if (Math.random() < pestChance(p.cropType, rain)) { p.pest = true; hit++; }
  }
  if (hit) {
    setTimeout(() => ui.toast?.(`🐛 밭 ${hit}칸에 해충이 붙었어요${rain ? '(비 온 다음 날)' : ''} — 🦋포충망으로 쫓아요`, 3600), 1500);
    trackEvent('pest_spawn', { plots: hit, rain });   // [GA4]
  }
  // 🐝 벌통 — 하루 🍯꿀 2/통. 해충과 같은 날짜 게이트를 쓴다(pestDate 가 오늘로 바뀐 직후 한 번)
  const hives = farmBuildingRecs().filter(b => b.id === 'beehive').length;
  if (hives) {
    giveReward({ honey: hives * HONEY_PER_HIVE }, 'beehive');
    setTimeout(() => ui.toast?.(`🍯 벌통 ${hives}개에서 꿀 +${hives * HONEY_PER_HIVE}`, 2600), hit ? 5200 : 1500);
    trackEvent('honey_collect', { hives, honey: hives * HONEY_PER_HIVE });   // [GA4]
  }
  requestSave();
}

export function applyFert(plot) {
  if (isAdv(plot.cropType)) {   // 🌾 고급 작물: 즉시 수확이 아니라 "제 속도로 자란다"(없으면 절반). 한 번만
    if (plot.fert) { ui.toast?.('🌱 이미 비료를 준 밭이에요'); return; }
    gameState.inventory.fert -= 1; plot.fert = true;
    doPlayerAction(plot.x, plot.z);
    spawnSparkle(plot.x, 0.6, plot.z, 12); Sound.plant();
    ui.toast?.(`🌱 비료를 줬어요 — ${plot.cropType.name}${josa(plot.cropType.name, '이', '가')} 제 속도로 자라요`, 2400);
    trackEvent('use_fert', { left: gameState.inventory.fert, adv: true, kind: plot.cropType.id });   // [GA4]
    refreshInventoryUI();
    $w.lastDoorPrompt = null; ui.setDoorPrompt?.(null);
    return;
  }
  gameState.inventory.fert -= 1;
  plot.growth = 1; plot.wetUntil = clock.elapsedTime + WET_TIME; plot.watered = true;
  doPlayerAction(plot.x, plot.z);
  refreshCropStage(plot);       // growth 1 → 단계 2 = mature(수확 토스트는 refreshCropStage 가 띄움)
  updatePlotVisual(plot);
  spawnSparkle(plot.x, 0.6, plot.z, 18); Sound.harvest();
  ui.toast?.('🌱 비료를 줬어요! 바로 수확할 수 있어요');
  trackEvent('use_fert', { left: gameState.inventory.fert, adv: false });   // [GA4] 소모품 사용
  refreshInventoryUI();
  $w.lastDoorPrompt = null; ui.setDoorPrompt?.(null);   // 프롬프트를 즉시 내린다 — 다음 프레임에 필요하면 다시 뜬다
}

// 물조리개: 자라는 밭에 물 → 성장(물 없이는 안 자람) + 물방울 파티클
export function tryWater(plot = plots.find(p => p.state === 'growing' && dist2D(p.group.position, player.position) < 1.8)) {
  if (!plot) {
    const wilted = plots.find(p => p.state === 'wilted' && dist2D(p.group.position, player.position) < 1.8);
    ui.toast?.(wilted ? '🥀 시든 작물이에요. 괭이로 다시 심어요' : '물 줄 작물이 없어요 💧');
    return;
  }
  if (plot.weed) { ui.toast?.('🌿 잡초가 자라요. 맨손(또는 아무 도구)으로 액션해서 뽑아요', 2400); return; }   // 🌾 잡초면 성장 정지(부드러운 실패)
  if (clock.elapsedTime < (plot.wetUntil || 0)) { ui.toast?.('아직 흙이 촉촉해요 🌱'); return; } // 마른 뒤에만 성장
  // 🏗️ 🐝벌통 반경(성장 +10%) · 💧우물 반경(흙이 40% 오래 촉촉) — 반경·배율은 js/farm-building.js 표가 유일한 출처
  const recs = farmBuildingRecs();
  const hiveNear = inRadiusOf(recs, 'beehive', plot.x, plot.z), wellNear = inRadiusOf(recs, 'well', plot.x, plot.z);
  plot.growth = Math.min(1, plot.growth + growthPerWater(plot.cropType, !!gameState.upgrades.water, !!plot.fert) * (hiveNear ? HIVE_GROWTH_MUL : 1)); // 기존 0.4/0.7 · 고급은 js/farm-crops.js
  plot.wetUntil = clock.elapsedTime + WET_TIME * (wellNear ? WELL_WET_MUL : 1); plot.watered = true;
  if (plot.growth < MATURE && weedRoll(plot.cropType, Math.random())) {   // 🌿 고급 작물만 — 물 준 뒤 잡초가 돋는다(다 익은 뒤엔 안 돋음)
    plot.weed = true;
    setTimeout(() => ui.toast?.(`🌿 ${plot.cropType.name}밭에 잡초가 돋았어요. 뽑기 전엔 안 자라요`, 2600), 900);
  }
  doPlayerAction(plot.x, plot.z); // 물주기 제스처
  Sound.water();
  spawnWater(plot.x, plot.z);   // [파티클] 물방울 + 무지개 반짝임
  refreshCropStage(plot);       // 단계 상승 시 새 메시 + 팝
  updatePlotVisual(plot);
  questEvent('water');          // 퀘스트 진행
  ui.act?.('water');            // 튜토리얼
  trackEvent('water_crop');     // [GA4]
}
