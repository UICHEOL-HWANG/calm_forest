// =============================================================
//  🍲 조리 무대 재료 규칙 — 어떤 재료 모형을 어디에 올릴지(순수, Three 의존 없음)
//  ------------------------------------------------------------
//  ▶ 무대(js/spaces/kitchen-stage.js)는 이모지 대신 3D 모형(js/cook-ingredient-art.js)을 쓴다
//    — 사용자 "이모지 말고 그냥 만들어서 넣어"(2026-09-29). 시안: sims/cook-ingredient-sim.html
//  ▶ 석쇠에는 "요리 아이콘"이 아니라 **굽는 재료**를 올린다(꿀 생선구이에 꿀단지가 올라가던 문제).
// =============================================================
export const MODEL_KEYS = ['crop', 'forage', 'fish', 'egg', 'flour', 'wheat', 'corn', 'grape', 'honey',
  'apple', 'pear', 'peach', 'persimmon', 'chestnut', 'juice', 'yam', 'bread'];

// 석쇠 위 한 덩이 — 생선이 들었으면 생선(보글보글 냄비는 생선 조합에서만 굽기 판이 열린다),
// 레시피 전용: 군고구마 → 고구마, 빵 → 빵 반죽. 그 밖엔 첫 재료
const GRILL_BY_RECIPE = { baked_yam: 'yam', bread: 'bread' };
export function grillKeyOf(r) {
  if (r.cost?.fish) return 'fish';
  if (GRILL_BY_RECIPE[r.id]) return GRILL_BY_RECIPE[r.id];
  return Object.keys(r.cost || {})[0] || 'crop';
}

// 끓이기 국물 위·썰기 노트에 올릴 재료 — 개수만큼(최대 3)
export function stageKeys(r) {
  return Object.entries(r.cost || {}).flatMap(([k, n]) => Array(n).fill(k)).slice(0, 3);
}
