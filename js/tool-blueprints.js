// =============================================================
//  calm forest · 🔨 도구 2단계 — 주민 도면 · 히든 의뢰 · 작업대 제작 (순수 모듈 — THREE/DOM 의존 없음)
//  ------------------------------------------------------------
//  흐름: 주민과 친해진다(❤️ HIDDEN_AFFINITY) → 그 주민의 전문 도구 히든 의뢰가 열린다
//        → 깨면 📜 도면 → 작업대에서 코인+재료로 금빛 도구(2단계) 제작
//  ▶ 2단계는 **외형만** 바뀐다(금·흑단·보석 — js/tool-tiers.js TIER_PALETTE[2]). 성능은 1단계와 같다.
//    목적은 친밀도의 상시 출구 + 후반 코인 싱크(9종 1,900🪙). 성능까지 올리면 1단계 싱크가 무의미해진다.
//  ▶ 설계: dev/active/tool-tiers/ · 사용자 결정(2026-09-24) — 주민별 전문 도구 · 문턱 6
//  ▶ 테스트: tests/tool-blueprints.test.mjs
// =============================================================

/** 히든 의뢰가 열리는 친밀도. 선물 +1 · 목걸이 +2 · 카페 접객 +1~2 · 반복 의뢰 +1 → 꾸준하면 사흘 안팎 */
export const HIDDEN_AFFINITY = 6;

// 주민 → 전문 도구. 🦉 올빼미(일일 의뢰 전담)·🐼 요리사(손에 드는 도구가 없다)는 없다.
//   ⚠️ 목표는 **이벤트형**만 — 보유형(collect_*)은 수락 전 재고로 바로 끝나고,
//      하루 한도 목표(QUEST_LIMITS)는 여러 날 이어지는 히든 의뢰에서 "왜 안 오르지" 를 만든다.
export const BLUEPRINTS = [
  { npc: 'farmer',    tool: 'sickle', name: '금빛 낫',          cost: { coins: 250, stone: 12, gem: 1 },
    quest: { type: 'harvest', target: 20, title: '금빛 낫의 도면',   desc: '작물 20개 수확하기' } },
  { npc: 'builder',   tool: 'hammer', name: '금빛 망치',        cost: { coins: 280, stone: 16, coal: 4 },
    quest: { type: 'chop',    target: 20, title: '금빛 망치의 도면', desc: '나무 20번 베기' } },
  { npc: 'angler',    tool: 'rod',    name: '금빛 낚싯대',      cost: { coins: 200, wood: 14, fish: 6 },
    quest: { type: 'fish',    target: 12, title: '금빛 낚싯대의 도면', desc: '물고기 12마리 낚기' } },
  { npc: 'stargazer', tool: 'net',    name: '금빛 포충망',      cost: { coins: 180, wood: 12, bug: 4 },
    quest: { type: 'catch',   target: 10, title: '금빛 포충망의 도면', desc: '🌟 반딧불이 10마리 잡기(밤)' } },
  { npc: 'ferryman',  tool: 'water',  name: '금빛 물조리개',    cost: { coins: 170, wood: 12, crop: 8 },
    quest: { type: 'water',   target: 25, title: '금빛 물조리개의 도면', desc: '물 25번 주기' } },
  { npc: 'forager',   tool: 'axe',    name: '금빛 도끼',        cost: { coins: 230, wood: 24, coal: 3 },
    quest: { type: 'forage',  target: 15, title: '금빛 도끼의 도면', desc: '🍄 채집물 15개 줍기' } },
  { npc: 'curator',   tool: 'hoe',    name: '금빛 괭이',        cost: { coins: 240, stone: 14, coal: 4 },
    quest: { type: 'mine',    target: 15, title: '금빛 괭이의 도면', desc: '광석 15개 캐기' } },
  { npc: 'merchant',  tool: 'seed',   name: '금빛 씨앗 주머니', cost: { coins: 160, crop: 12, wood: 8 },
    quest: { type: 'sell',    target: 25, title: '금빛 씨앗 주머니의 도면', desc: '상점에서 25개 팔기' } },
  { npc: 'rancher',   tool: 'shovel', name: '금빛 삽',          cost: { coins: 190, wood: 14, stone: 8 },
    quest: { type: 'plant',   target: 20, title: '금빛 삽의 도면',   desc: '씨앗 20번 심기' } },
];
// 히든 의뢰 대사 — 주민이 "우리 사이니까" 꺼내는 이야기. 문구는 한 곳(여기)에서만.
const HIDDEN_LINE = (name, desc) => `우리 사이니까 말인데… ${name} 도면이 하나 있어요. ${desc}, 해 줄 수 있어요?`;
const HIDDEN_REWARD_COINS = 20;

export const blueprintOfNpc = (npcId) => BLUEPRINTS.find(b => b.npc === npcId) || null;
export const blueprintOfTool = (tool) => BLUEPRINTS.find(b => b.tool === tool) || null;

/**
 * 이 주민이 지금 내줄 수 있는 히든 의뢰 — 없으면 null.
 * ⚠️ 매번 같은 모양의 새 객체를 만든다(세이브에 의뢰 객체를 저장하지 않는다 — 표가 바뀌면 표를 따른다).
 * "다른 의뢰를 하는 중이면 미룬다" 같은 순서 판단은 호출부(game.js currentQuest) 몫.
 */
export function hiddenQuestFor(npcId, { affinity = 0, blueprints = {} } = {}) {
  const b = blueprintOfNpc(npcId);
  if (!b || affinity < HIDDEN_AFFINITY || blueprints[b.tool]) return null;
  return { ...b.quest, hidden: true, tool: b.tool, line: HIDDEN_LINE(b.name, b.quest.desc), reward: { coins: HIDDEN_REWARD_COINS } };
}

/**
 * 작업대 2단계 제작 상태.
 * @returns {{state:'noBlueprint'|'needTier1'|'short'|'ready'|'owned', missing:string[], cost:object|null}}
 */
export function tier2Status(tool, { blueprints = {}, upgrades = {}, tier2 = {}, inventory = {} } = {}) {
  const b = blueprintOfTool(tool);
  if (!b) return { state: 'noBlueprint', missing: [], cost: null };
  if (tier2[tool]) return { state: 'owned', missing: [], cost: b.cost };
  if (!blueprints[tool]) return { state: 'noBlueprint', missing: [], cost: b.cost };
  if (!upgrades[tool]) return { state: 'needTier1', missing: [], cost: b.cost };   // 1단계를 건너뛰지 않는다
  const missing = Object.keys(b.cost).filter(k => (inventory[k] || 0) < b.cost[k]);
  return { state: missing.length ? 'short' : 'ready', missing, cost: b.cost };
}

/** 세이브의 도구 플래그 정제 — 도면이 있는 도구의 true 만 남긴다. */
export function sanitizeToolFlags(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const b of BLUEPRINTS) if (raw[b.tool] === true) out[b.tool] = true;
  return out;
}
