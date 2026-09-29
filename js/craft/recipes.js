// 🔥 화덕 레시피 — 표와 판정만. 렌더·DOM·전역 상태를 참조하지 않는다(테스트 가능해야 한다).
//    수치 출처는 docs/superpowers/specs/2026-09-20-overnight-craft-design.md §3

/** 가공 시설 — 시설마다 다룰 수 있는 품목과 슬롯이 따로다.
 *  1단계 🔥 화덕은 마을에, 2단계 🫙 발효통은 텃밭에 놓는다(농장에 갈 이유가 된다). */
//  문구는 여기 한 곳에서만 만든다 — 창·토스트·안내가 제각각 말하면 같은 기능이 둘로 보인다.
//  ⚠️ i18n 은 **통문장** 사전이다(js/i18n-en.js). 조각을 코드에서 이어 붙이면 번역이 새니
//     완성된 문장 그대로 적는다.
export const STATIONS = [
  { id: 'kiln', ico: '🔥', name: '화덕',
    ask: '무엇을 구울까요', claim: '다 구워진 것 모두 받기',
    hint: '걸어둔 것은 <b>다음 날</b> 찾아가면 다 구워져 있어요',
    notice: '화덕에서 다 구워졌어요', go: '화덕에 가서 받아 가세요' },
  { id: 'vat',  ico: '🫙', name: '발효통',
    ask: '무엇을 익힐까요', claim: '다 익은 것 모두 받기',
    hint: '걸어둔 것은 <b>다음 날</b> 찾아가면 숙성이 완료되어 있을겁니다',
    notice: '발효통에서 다 익었어요', go: '텃밭 발효통에 가서 받아 가세요' },
];
export function stationDef(id) { return STATIONS.find(s => s.id === id) || STATIONS[0]; }

/** 산출량은 미니게임 등급(0~3)이 정한다. 완성 여부는 등급과 무관 — 아쉬워도 최소 2개는 나온다. */
export const CRAFT_RECIPES = [
  { id: 'charcoal', ico: '⚫', name: '숯',     station: 'kiln', cost: { wood: 8 },            yields: [2, 3, 4, 5], sell: 9,  mg: 'grill'  },
  { id: 'flour',    ico: '🌾', name: '밀가루', station: 'kiln', cost: { wheat: 4 },           yields: [2, 3, 4, 5], sell: 18, mg: 'mill'   },
  { id: 'brick',    ico: '🧱', name: '벽돌',   station: 'kiln', cost: { stone: 6, coal: 2 },  yields: [2, 3, 4, 5], sell: 12, mg: 'season' },
  // 🍷 포도즙 — 포도(30)가 드디어 판매 말고 쓸 데가 생긴다. 포도 4(120) → 평균 3.5개.
  //    즙은 원액이고, 카페에서 잔에 따라 내면 🍹포도주스(js/game.js DISHES)가 된다.
  { id: 'juice',    ico: '🍷', name: '포도즙', station: 'vat', cost: { grape: 4 },            yields: [2, 3, 4, 5], sell: 40, mg: 'crush'  },
  // 🍎 과수원 과일 가공(2026-09-29) — 과일이 팔기 말고 쓸 데가 생긴다. 심고 → 따고 → 밤새 가공 → 다음 날 판다.
  //    과일 4 → 평균 3.5개, 그냥 파는 값의 1.3배(tests/craft-recipes.test.mjs 가 1.2~1.5배로 묶는다).
  //    조작은 기존 미니게임을 빌린다(mg) — 사과잼은 🧱반죽(꾹 눌러 졸이기), 군밤은 ⚫불 조절, 곶감은 🍷박자(주무르기).
  { id: 'apple_jam',      ico: '🥫', name: '사과잼', station: 'kiln', cost: { apple: 4 },     yields: [2, 3, 4, 5], sell: 12, mg: 'season', fruit: true },
  { id: 'roast_chestnut', ico: '🌰', name: '군밤',   station: 'kiln', cost: { chestnut: 4 },  yields: [2, 3, 4, 5], sell: 30, mg: 'grill',  fruit: true },
  { id: 'gotgam',         ico: '🍡', name: '곶감',   station: 'vat',  cost: { persimmon: 4 }, yields: [2, 3, 4, 5], sell: 24, mg: 'crush',  fruit: true },
];

/** 그 시설에서 만들 수 있는 것 */
export function recipesOf(station) { return CRAFT_RECIPES.filter(r => r.station === station); }

export function recipeOf(id) { return CRAFT_RECIPES.find(r => r.id === id); }

/** 미니게임 조작 종류 → 그 조작의 원조 품목 id. index.html 조작 분기와 game.js 판정이 이 키로 갈린다.
 *  과일 가공처럼 조작을 빌려 쓰는 품목도 여기서 원조로 모인다(분기를 품목마다 늘리지 않는다). */
const MG_BASE = { grill: 'charcoal', mill: 'flour', season: 'brick', crush: 'juice' };
export function mgBaseOf(id) { return MG_BASE[recipeOf(id)?.mg] || id; }

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
