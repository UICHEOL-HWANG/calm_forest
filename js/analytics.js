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
import { PLATFORM } from './platform.js';         // 'web' | 'toss' — 모든 이벤트에 세그먼트로 부착
import { LANG, assignVariant } from './i18n.js';   // 표시 언어 + A/B 변형 → GA4 유저 속성

let firstChopFired = false;
const sessionStart = Date.now();

// ── 공유 링크 별칭(ref=/from=) → GA4 캠페인 주입 ──────────────
//   유입 경로(utm_*)는 GA4 가 URL 에서 자동으로 읽어 '세션 소스/매체/캠페인'
//   으로 잡아줍니다. 코드로 할 일이 없습니다 — 링크에 utm_* 만 붙이면 끝.
//   딱 하나 GA4 가 못 하는 게 있는데, utm_ 접두사가 아닌 별칭입니다.
//   공유 링크가 ?ref=kakao_share 처럼 오면 GA4 는 무시하고 (direct) 로 잡으므로
//   그때만 GA4 캠페인에 직접 넣어 기본 '세션 소스' 로 흘려보냅니다.
//   ※ utm_source 가 이미 있으면 손대지 않습니다 — GA4 자동 수집이 진실.
function applyAliasCampaign() {
  const q = new URLSearchParams(location.search);
  if (q.get('utm_source')) return;
  const alias = q.get('ref') || q.get('from');
  if (!alias) return;
  gtag('set', 'campaign', { source: String(alias).slice(0, 100), medium: 'referral' });
  console.log('[GA4] 유입 별칭 → 캠페인 주입:', alias);
}

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
  applyAliasCampaign();   // ※ config 보다 먼저 — 첫 page_view 부터 소스가 붙게
  gtag('config', id);
  // 유저 단위 차원 — platform(앱인토스), 그리고 표시 언어·A/B 변형.
  //   한 번에 set 해야 뒤 호출이 앞 호출을 덮어쓰지 않는다(gtag user_properties 는 병합이 아니라 치환).
  gtag('set', 'user_properties', { platform: PLATFORM, lang: LANG, ab_variant: assignVariant() });
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

// [속성] A/B 변형이 로그인 후(명단 조회) 확정될 때 GA4 유저 속성 갱신
export function setAbVariant(v) {
  if (isGaConfigured() && typeof window.gtag === 'function') {
    window.gtag('set', 'user_properties', { ab_variant: v });
  }
}

// ── 이벤트 훅 — 세션 요약(metrics.js)이 이벤트 발생 횟수를 집계하는 용도 ──
//    analytics → metrics 역방향 import 없이(순환 방지) 콜백 등록으로 연결.
const trackHooks = [];
export function onTrack(cb) { trackHooks.push(cb); }

// GA4 로 이벤트 전송(폴백: 콘솔) — 모든 트래킹은 이 함수를 거칩니다.
export function trackEvent(name, params = {}) {
  const payload = { ...params, ts: Date.now(), platform: PLATFORM };   // 이벤트 단위 platform 차원(웹/토스 퍼널 비교)
  trackHooks.forEach(cb => { try { cb(name, payload); } catch (e) {} }); // 카운터 훅(실패해도 트래킹 계속)

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
