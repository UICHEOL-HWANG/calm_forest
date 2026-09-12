// =============================================================
//  calm forest · 🌞🌙 낮/밤 주기 규칙 (순수 함수 — DOM/Three 의존 없음)
//  ------------------------------------------------------------
//  시간은 늘 자동으로 흐른다(DAY_SPEED, 한 주기 ≈ 8분). 플레이어가 만질 수 있는
//  시간 조절은 🛏️ 침대뿐 — 밤에 누우면 아침까지 잔다.
//  ▶ 여기엔 "지금이 밤인가"와 "자고 일어나면 몇 시인가"만 둔다. 조명·하늘은 game.js.
//  ▶ 테스트: npm test (tests/daynight.test.mjs)
// =============================================================

/** 이 값 이상 어두우면 밤으로 친다 — 🌟반딧불이 등 밤 전용 콘텐츠의 기준. */
export const NIGHT_MIN = 0.45;

/**
 * 🛏️ 자고 일어나는 시각. 밤 경계(≈0.266) 바로 뒤가 아니라 조금 여유를 둔
 * "해가 막 뜬 아침" — 경계에 붙이면 깨자마자 다시 밤 프롬프트가 뜬다.
 */
export const WAKE_TIME = 0.30;

/** 햇빛 양 0~1 — game.js updateDayNight 의 식과 **같아야 한다**. 자정 0 · 정오 1. */
export function daylightAt(t) {
  return Math.sin(t * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5;
}

/** 어둠 양 0~1. 주기 바깥(음수 포함)도 감싼다 — 시간을 더한 결과를 그대로 넣을 수 있게. */
export function nightLevelAt(t) {
  return 1 - daylightAt(((t % 1) + 1) % 1);
}

/** 밤인가 — game.js 의 `nightLevel >= NIGHT_MIN` 과 같은 판정. */
export function isNightAt(t) {
  return nightLevelAt(t) >= NIGHT_MIN;
}
