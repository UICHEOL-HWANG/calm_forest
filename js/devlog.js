// =============================================================
//  calm forest · 개발용 콘솔 로그 게이트
//  ------------------------------------------------------------
//  배포 콘솔에 유저 UUID·GA4 측정 ID·세이브 행이 그대로 찍히던 것을 막는다(2026-10-13).
//  로컬 개발 호스트이거나 ?dbg 를 붙였을 때만 출력한다.
//  console.warn / console.error 는 그대로 둔다(장애 추적용, 식별자를 넣지 말 것).
//  다른 모듈을 import 하지 않는다 — platform.js 처럼 가장 먼저 도는 모듈도 쓴다.
// =============================================================

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])$|\.localhost$/;

// isNativeApp: Capacitor 앱(안드로이드·iOS)은 호스트가 localhost 라 따로 막아야 한다
export function shouldShowDevLog(hostname, search, isNativeApp = false) {
  try {
    if (new URLSearchParams(search || '').has('dbg')) return true;
    return !isNativeApp && LOCAL_HOST.test(String(hostname || ''));
  } catch (e) {
    return false;
  }
}

const SHOW = typeof location !== 'undefined' && shouldShowDevLog(
  location.hostname, location.search,
  typeof window !== 'undefined' && !!(window.__ANDROID__ || window.__IOS__));

export function devLog(...args) {
  if (SHOW) console.log(...args);
}
