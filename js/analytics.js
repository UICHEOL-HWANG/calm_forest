// =============================================================
//  calm forest · GA4 / GTM 이벤트 트래킹 모듈
//  ------------------------------------------------------------
//  ▶ [데이터 분석 지점 A] 주요 게임 이벤트 통계용
//    - login          : 로그인 성공
//    - first_chop     : 첫 벌목 (세션 1회)
//    - chop_tree      : 벌목 발생
//    - session_time   : 체류 시간(주기적/이탈 시)
//  ▶ GA4 미설정(오프라인) 시 window.gtag 가 없으므로 콘솔로 폴백
// =============================================================

import { CONFIG, isGaConfigured } from './config.js';

let firstChopFired = false;
const sessionStart = Date.now();

// ── GA4 자동 로딩 ────────────────────────────────────────────
//   config.js 의 GA4_MEASUREMENT_ID 만 채우면 gtag.js 를 동적으로
//   삽입하고 초기화합니다. (index.html 을 손댈 필요 없음)
//   미설정 시엔 아무것도 로드하지 않고 trackEvent 가 콘솔 폴백.
(function loadGA() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  gtag('js', new Date());
  if (!isGaConfigured()) { console.log('[GA4] 미설정 — 콘솔 폴백 모드'); return; }
  const id = CONFIG.GA4_MEASUREMENT_ID;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
  document.head.appendChild(s);
  gtag('config', id);
  console.log('[GA4] 로드됨:', id);
})();

// [④ user_id 연결] 로그인한 Supabase user_id를 GA4에 심어 GA4↔Supabase 유저 조인 가능
export function setGaUser(userId) {
  if (!userId) return;
  if (isGaConfigured() && typeof window.gtag === 'function') {
    window.gtag('set', { user_id: String(userId) });
  } else {
    console.log('[GA4 폴백] user_id set:', userId);
  }
}

// GA4 로 이벤트 전송(폴백: 콘솔) — 모든 트래킹은 이 함수를 거칩니다.
export function trackEvent(name, params = {}) {
  const payload = { ...params, ts: Date.now() };

  // [GA4 전송 지점] gtag 가 로드되어 있고 설정이 유효할 때만 실제 전송
  if (isGaConfigured() && typeof window.gtag === 'function') {
    window.gtag('event', name, payload);
  } else {
    // 오프라인 폴백: 실제 전송 대신 콘솔 기록 (에러 없이 계속 진행)
    console.log('[GA4 폴백] event:', name, payload);
  }
}

// [이벤트] 로그인
export function trackLogin(method) {
  trackEvent('login', { method });
}

// [이벤트] 벌목 — 첫 벌목이면 first_chop 도 함께 발생
export function trackChop(treeId, woodCount) {
  if (!firstChopFired) {
    firstChopFired = true;
    trackEvent('first_chop', { tree_id: treeId }); // 첫 벌목 KPI
  }
  trackEvent('chop_tree', { tree_id: treeId, wood: woodCount });
}

// [이벤트] 체류 시간 — 주기 호출 및 페이지 이탈(beforeunload) 시 호출
export function trackSessionTime() {
  const seconds = Math.round((Date.now() - sessionStart) / 1000);
  trackEvent('session_time', { seconds });
}

// 페이지 이탈 시 마지막 체류 시간 기록
window.addEventListener('beforeunload', trackSessionTime);
