// =============================================================
//  🍳 요리 코스·찬장·도구 제작·버프 (구역 머리말 — 분리 2단계)
//  ------------------------------------------------------------
//  js/game.js 에서 원문 그대로 옮겨 온 구역(분리 2단계, 2026-09-26).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 에 남은 let 에 쓸 때는 `$w.x = …` (읽기는 그냥 x). 도구·증명: tools/refactor/
// =============================================================
import {
  $w, RES_LABEL, buffs, clock, cookTier, firstHint, gameState, pendingDish, player, refreshHeldTool, refreshInventoryUI,
  requestSave, spawnFloatText, spawnSparkle, ui,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))
import { trackEvent } from '../analytics.js';
import { BUFF_META, COOK_MG, COURSE_MULT, COURSE_WEIGHT, RECIPES, UPGRADES, recipeDiff } from '../data/catalog.js';
import { NPCS } from '../data/npcs.js';
import { SELL_ICO_G } from '../data/places.js';
import { TOOLS } from '../data/tools.js';
import { Sound } from '../sound.js';
import { updateHouseSign } from '../spaces/house.js';
import { BLUEPRINTS, blueprintOfTool, tier2Status } from '../tool-blueprints.js';

//    게임업계식 등급 컷: 점수 구간 → 등급/배율. 잘할수록 같은 재료로 더 오래 가는 버프.
export const COOK_TIERS = [
  { id: 'perfect', min: 88, ico: '💫', name: '최고의 맛', mult: 1.5 },
  { id: 'great',   min: 65, ico: '😋', name: '훌륭한 맛', mult: 1.25 },
  { id: 'good',    min: 35, ico: '🙂', name: '무난한 맛', mult: 1.0 },
  { id: 'plain',   min: 0,  ico: '😅', name: '아쉬운 맛', mult: 0.7 },
];

export const PANTRY_MAX = 6;

export function recipeOf(id) { return RECIPES.find(r => r.id === id) || null; }

// 레시피 → 미니게임 코스. 단계마다 판정창 배율(mult)이 실려 뒤로 갈수록 좁아진다
export function courseOf(r) {
  const d = recipeDiff(r);
  const mults = COURSE_MULT[d] || COURSE_MULT[1];
  return r.stages.map((mg, i) => ({
    mg, mult: mults[i] ?? mults[mults.length - 1], weight: (COURSE_WEIGHT[d] || [1])[i] ?? 1,
    ico: COOK_MG[mg].ico, name: COOK_MG[mg].name, tip: COOK_MG[mg].tip,
  }));
}

// 주방 메뉴판 데이터 — index.html(ui.openKitchen)이 렌더
export function kitchenView() {
  const inv = gameState.inventory;
  return {
    recipes: RECIPES.map(r => ({
      id: r.id, name: r.name, ico: r.ico, desc: r.desc, diff: recipeDiff(r),
      course: courseOf(r).map(s => ({ ico: s.ico, name: s.name })),
      cost: Object.entries(r.cost).map(([k, v]) => ({ k, ico: SELL_ICO_G[k] || '📦', label: RES_LABEL[k] || k, need: v, have: inv[k] || 0 })),
      ready: Object.entries(r.cost).every(([k, v]) => (inv[k] || 0) >= v),
      best: gameState.kitchen.best[r.id] || 0,           // 레시피별 최고 점수(진행도 표시)
    })),
    cooked: gameState.kitchen.cooked || 0,
    pantry: pantryView(),
  };
}

// 🍱 찬장 목록 — 가방·카페·주방이 함께 쓴다
export function pantryView() {
  return {
    max: PANTRY_MAX,
    items: (gameState.pantry || []).map((f, i) => {
      const r = recipeOf(f.id), t = cookTier(f.score);
      return { i, id: f.id, name: r.name, ico: r.ico, score: f.score, tier: { id: t.id, ico: t.ico, name: t.name, mult: t.mult },
        buff: { ...BUFF_META[r.buff], dur: buffDur(r, t) } };
    }),
  };
}

export function buffDur(r, tier) { return Math.round(r.dur * tier.mult * (gameState.upgrades.pot ? 1.5 : 1)); }

// 🍽️ 완성한 요리를 어떻게 할지 — 'eat'(바로 먹어 버프) | 'store'(🧺 찬장에 보관)
//    결과 화면을 그냥 닫아도 'eat' 으로 마무리된다(만든 음식을 잃지 않게).
export function cookResolve(how = 'eat') {
  const d = pendingDish; if (!d) return { ok: false };
  $w.pendingDish = null;
  const r = recipeOf(d.id); if (!r) return { ok: false };
  if (how === 'store') {
    if ((gameState.pantry || []).length >= PANTRY_MAX) return eatDish(r, d, true);   // 찬장이 꽉 찼으면 먹는 쪽으로 안전 착지
    gameState.pantry.push({ id: d.id, score: d.score });   // 등급은 score 에서 파생(cookTier)
    Sound.blip();
    trackEvent('cook_store', { recipe: d.id, quality: d.tier, pantry_n: gameState.pantry.length });   // [GA4] 보관 선택률
    return { ok: true, how: 'store', ico: r.ico, name: r.name, left: PANTRY_MAX - gameState.pantry.length };
  }
  return eatDish(r, d, false);
}

// 음식을 먹어 버프 발동 — 요리 직후(cookResolve)와 찬장에서 꺼내 먹을 때(pantryEat)가 함께 쓴다
export function eatDish(r, d, fallback = false) {
  const tier = cookTier(d.score);
  const dur = buffDur(r, tier);
  buffs[r.buff] = clock.elapsedTime + dur;
  emitBuffs();
  const bm = BUFF_META[r.buff];
  // 🔰 이 버프를 처음 받았다면 설명 모달(1회) — 결과 화면이 먼저 뜬 뒤에 얹어 보여줌
  setTimeout(() => firstHint('buff_' + r.buff, bm.ico, `${bm.name} 버프 획득!`,
    `${bm.desc}\n남은 시간은 오른쪽 위 칩에 · 칩을 누르면 다시 볼 수 있어요`), 800);
  trackEvent('cook_eat', { recipe: r.id, quality: tier.id, dur });   // [GA4]
  return { ok: true, how: 'eat', fallback, ico: r.ico, name: r.name, buff: { ...bm, dur } };
}

// 🍱 찬장에서 꺼내 먹기 — 가방 찬장 칸을 누르면
export function pantryEat(i) {
  const f = (gameState.pantry || [])[i]; if (!f) return { ok: false };
  const r = recipeOf(f.id); if (!r) { gameState.pantry.splice(i, 1); return { ok: false }; }
  gameState.pantry.splice(i, 1);
  Sound.harvest();
  spawnFloatText(player.position.x, 1.4, player.position.z, `${r.ico} 잘 먹었습니다!`, '#c9682a');
  return eatDish(r, f, false);
}

// 도구 업그레이드 제작(영구) — 이미 보유면 거절
export function craftUpgrade(id) {
  const u = UPGRADES.find(x => x.id === id); if (!u) return { ok: false };
  if (gameState.upgrades[id]) return { ok: false, msg: '이미 보유한 업그레이드예요' };
  for (const k in u.cost) {
    if ((gameState.inventory[k] || 0) < u.cost[k]) {
      return { ok: false, msg: `${RES_LABEL[k] || k}이(가) 부족해요` };   // 돌·석탄 등 광물 재료도 안내
    }
  }
  for (const k in u.cost) gameState.inventory[k] -= u.cost[k];
  gameState.upgrades[id] = true;
  refreshHeldTool();                                  // 🪓 만든 즉시 손에 든 도구가 달라진다
  if (id === 'hammer') updateHouseSign();             // 🔨 집 간판의 🪵 숫자도 같이 내려간다
  refreshInventoryUI();
  Sound.complete();
  spawnFloatText(player.position.x, 1.5, player.position.z, `${u.ico} ${u.name}!`, '#2f7a44');
  spawnSparkle(player.position.x, 1.0, player.position.z, 22);
  trackEvent('craft_item', { category: 'tool', item: id });  // [GA4]
  return { ok: true, name: u.name };
}

// 🔨 금빛 도구(2단계) — 도면이 있어야 보이고, 1단계를 먼저 가져야 만든다(js/tool-blueprints.js)
export function tier2List() {
  return BLUEPRINTS.map(b => {
    const st = tier2Status(b.tool, gameState);
    const up = UPGRADES.find(u => u.id === b.tool);
    const npc = NPCS.find(n => n.id === b.npc);
    return { tool: b.tool, name: b.name, ico: TOOLS.find(t => t.id === b.tool)?.ico || '🔨', cost: b.cost,
      state: st.state, missing: st.missing, tier1: up?.name || '', npc: npc?.name || '' };
  });
}

export function craftTier2(tool) {
  const b = blueprintOfTool(tool); if (!b) return { ok: false };
  const st = tier2Status(tool, gameState);
  if (st.state === 'owned') return { ok: false, msg: '이미 만든 도구예요' };
  if (st.state === 'noBlueprint') return { ok: false, msg: '아직 도면이 없어요' };
  if (st.state === 'needTier1') return { ok: false, msg: `먼저 ${UPGRADES.find(u => u.id === tool)?.name || '1단계 도구'}을(를) 만들어요` };
  if (st.state === 'short') return { ok: false, msg: `${RES_LABEL[st.missing[0]] || st.missing[0]}이(가) 부족해요` };
  const inv = { ...gameState.inventory };
  for (const k in b.cost) inv[k] = (inv[k] || 0) - b.cost[k];
  gameState.inventory = inv;
  gameState.tier2 = { ...gameState.tier2, [tool]: true };
  refreshHeldTool();                                  // 손에 든 게 이 도구면 그 자리에서 금빛이 된다
  refreshInventoryUI();
  Sound.complete();
  spawnFloatText(player.position.x, 1.5, player.position.z, `✨ ${b.name}!`, '#9a7a1c');
  spawnSparkle(player.position.x, 1.0, player.position.z, 30);
  trackEvent('tool_tier2_craft', { tool, coins: b.cost.coins });   // [GA4] 도면 → 제작 전환(코인 싱크)
  requestSave();
  return { ok: true, name: b.name };
}

// 활성 버프 목록을 UI로 전달(정수 초 바뀔 때만)
export let lastBuffKey = '';

export function emitBuffs() {
  const now = clock.elapsedTime;
  const list = Object.keys(buffs).filter(k => now < buffs[k])
    .map(k => ({ k, ico: BUFF_META[k].ico, name: BUFF_META[k].name, desc: BUFF_META[k].desc, remain: Math.ceil(buffs[k] - now) })); // desc: 칩 클릭 설명 모달용
  const key = list.map(b => b.ico + b.remain).join('|');
  if (key !== lastBuffKey) { lastBuffKey = key; ui.setBuffs?.(list); }
}
