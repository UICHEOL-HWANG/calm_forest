// =============================================================
//  📱 터치 판정 + ?touchsim=1 (데스크톱에서 모바일 화면·조작 흉내)
//  ------------------------------------------------------------
//  Aside 페르소나 플레이용(2026-10-06): Aside 브라우저엔 기기 에뮬레이션이 없어서 늘 데스크톱 화면이 뜬다.
//  ?touchsim=1 이면 터치 기기로 보고(모바일 조이스틱·HUD·IS_MOBILE), 조이스틱·액션 버튼이 마우스 입력도 받는다.
//  ⚠️ dev 파라미터(DEV_PARAMS)가 아니다 — 로그가 정상으로 쌓여야 페르소나 데이터가 된다.
// =============================================================

export const TOUCH_SIM_PARAM = 'touchsim';

/** URL 검색 문자열에 touchsim 이 있나 */
export function touchSimOn(search = '') {
  return new URLSearchParams(search).has(TOUCH_SIM_PARAM);
}

/** 순수 판정 — 실제 터치 기기이거나 touchsim */
export function isTouchEnv({ hasTouchEvent = false, maxTouchPoints = 0, search = '' } = {}) {
  return !!hasTouchEvent || maxTouchPoints > 0 || touchSimOn(search);
}

/** 브라우저에서 — 모든 터치 판정이 이 함수를 쓴다 */
export function isTouchDevice() {
  try {
    return isTouchEnv({ hasTouchEvent: 'ontouchstart' in window, maxTouchPoints: navigator.maxTouchPoints || 0, search: location.search });
  } catch {
    return false;
  }
}
