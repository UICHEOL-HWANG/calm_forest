// 🔥 화덕 레시피 — 표와 판정만. 렌더·DOM·전역 상태를 참조하지 않는다(테스트 가능해야 한다).
//    수치 출처는 docs/superpowers/specs/2026-09-20-overnight-craft-design.md §3

/** 산출량은 미니게임 등급(0~3)이 정한다. 완성 여부는 등급과 무관 — 아쉬워도 최소 2개는 나온다. */
export const CRAFT_RECIPES = [
  { id: 'charcoal', ico: '⚫', name: '숯',     cost: { wood: 8 },            yields: [2, 3, 4, 5], sell: 9,  mg: 'grill'  },
  { id: 'flour',    ico: '🌾', name: '밀가루', cost: { wheat: 4 },           yields: [2, 3, 4, 5], sell: 18, mg: 'mill'   },
  { id: 'brick',    ico: '🧱', name: '벽돌',   cost: { stone: 6, coal: 2 },  yields: [2, 3, 4, 5], sell: 12, mg: 'season' },
];

export function recipeOf(id) { return CRAFT_RECIPES.find(r => r.id === id); }

export function yieldOf(id, grade) {
  const r = recipeOf(id); if (!r) return 0;
  const g = Math.max(0, Math.min(r.yields.length - 1, grade | 0));
  return r.yields[g];
}

/** 모자란 재료 키 — UI 가 그 재료만 빨갛게 짚는다(문장으로 붙이면 320px 에서 줄이 깨진다) */
export function lackOf(id, inv = {}) {
  const r = recipeOf(id); if (!r) return [];
  return Object.keys(r.cost).filter(k => (inv[k] || 0) < r.cost[k]);
}

export function canAfford(id, inv = {}) { return lackOf(id, inv).length === 0; }
