// =============================================================
//  calm forest · 🌾 농사 도구 자동 전환 규칙 (순수 함수 — DOM/Three 의존 없음)
//  ------------------------------------------------------------
//  베타 피드백: "괭이(2)→씨앗(3)→물조리개(4)→낫(5)를 매번 골라야 해서 조작이 복잡하다"
//  ▶ 농사 도구(괭이·씨앗·물조리개·낫) 중 아무거나 들고 밭 앞에서 액션을 누르면
//    밭 상태에 맞는 도구로 바꾼 뒤 그 동작을 바로 실행한다(game.js farmAutoAction).
//  ▶ 🪏삽은 제외 — 밭을 없애는 파괴 동작이라 명시적으로만 쓴다.
//  ▶ 테스트: npm test (tests/farm-auto.test.mjs)
// =============================================================

/** 자동 전환 대상 도구 id (TOOLS 의 id 와 일치) */
export const FARM_AUTO_TOOLS = ['hoe', 'seed', 'water', 'sickle'];

/**
 * 밭 상태 → 써야 할 도구 id. null 이면 "바꾸지 않는다"(호출자가 들고 있던 도구대로 처리).
 *   plot: { state: 'empty'|'growing'|'mature'|'wilted', digAt?: number } | null
 *   soilWet: 자라는 밭의 흙이 아직 촉촉한지(물을 줘도 안 자라는 상태)
 *
 *   밭 없음            → null   (괭이면 호출자가 새 밭을 만든다 — 씨앗·물을 들고 실수로 밭이 생기지 않게)
 *   wilted             → hoe    (다시 갈기)
 *   empty(반쯤 판 🪏)  → null   (삽질 유예 중엔 끼어들지 않는다)
 *   empty              → seed
 *   growing + 촉촉     → null   (물조리개의 "아직 촉촉해요" 안내만)
 *   growing + 마름     → water
 *   mature             → sickle
 */
export function farmToolFor(plot, soilWet) {
  if (!plot) return null;
  switch (plot.state) {
    case 'wilted': return 'hoe';
    case 'empty': return plot.digAt ? null : 'seed';
    case 'growing': return soilWet ? null : 'water';
    case 'mature': return 'sickle';
    default: return null;
  }
}

/**
 * 자동 전환으로 정해진 도구(want)로 밭일을 해도 안내 토스트뿐인가 — "아무 일도 안 일어나는" 상태 판정.
 * 이런 순간엔 주민 대화를 막지 않는다(game.js farmActionFirst). 베타 피드백에서 셋 다 보고됐다.
 *
 *   want = null   → farmToolFor 가 "도구를 바꾸지 않는다"로 답한 상태 = 흙이 아직 촉촉하거나
 *                   🪏삽으로 반쯤 판 밭. 어느 도구를 들었든 실패/안내 토스트로 끝난다.
 *   want = 'seed' → 씨앗이 없고 다른 밭에 자라는 작물이 있으면 '씨앗이 없어요' 안내뿐.
 *                   (자라는 작물이 하나도 없으면 trySeed 안전장치가 씨앗을 채워 주므로 의미 있는 동작)
 *   그 외          → 갈기·물주기·수확은 항상 실제로 일어난다.
 */
export function farmActionIsNoop(want, { seeds = 0, hasGrowing = false } = {}) {
  if (!want) return true;
  if (want === 'seed') return seeds <= 0 && hasGrowing;
  return false;
}
