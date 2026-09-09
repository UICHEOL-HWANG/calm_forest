// =============================================================
//  calm forest · 플랫폼 어댑터 — 'web'(기본) | 'toss'(앱인토스 웹뷰) | 'itch'(itch.io iframe)
//  ------------------------------------------------------------
//  단일 코드베이스 전략: 기능 코드는 플랫폼을 모른 채 개발하고,
//  로그인·트래킹·정책 분기만 이 모듈의 값 하나로 갈라집니다.
//
//  감지 우선순위:
//   ① URL ?platform=toss — 앱인토스 배포 진입점이 명시(테스트에도 사용)
//   ② 앱인토스 SDK 전역 — @apps-in-toss/web-framework 통합 후 자동 감지
//   ③ itch.io — scripts/build-itch.mjs 가 주입한 window.__ITCH__ 플래그, 또는 *.itch.zone 호스트
//   ④ 기본 'web'
//
//  ▶ itch 메모: itch 는 게임을 html-classic.itch.zone 오리진의 iframe 안에서 서빙한다.
//    · '/api/*' 상대경로는 전부 404 → 빌드가 API_BASE 를 웹 오리진으로 치환(토스와 동일)
//    · 구글 OAuth 전체 페이지 리다이렉트는 iframe 안에서 막힘 → 팝업 방식(supabase-client)
//
//  ▶ 토스 계정 연동 메모 — 공식 문서 확인됨:
//    · 토스 로그인(appLogin)은 사업자 등록을 거친 '토스로그인 약관 동의'가 필요해 쓰지 않는다.
//    · 대신 게임 카테고리 전용 사용자 식별키를 쓴다(동의 화면 없음, 토스앱 5.232.0↑):
//      @apps-in-toss/web-framework 의 getUserKeyForGame()
//      → Promise<{ type:'HASH', hash } | 'INVALID_CATEGORY' | 'ERROR' | undefined>
//    · 검증은 mTLS 가 필요하므로 서버(toss-auth Worker)에서 수행:
//      POST /api-partner/v1/apps-in-toss/users/anon-key/verify (헤더 x-anon-key)
// =============================================================

const _pq = new URLSearchParams(location.search);

function detect() {
  if (_pq.get('platform') === 'toss') return 'toss';
  try {
    // SDK 통합 후 웹뷰 전역이 있으면 자동 인식(전역 이름은 SDK 도입 시점에 확정)
    if (window.AppsInToss || window.__APPS_IN_TOSS__) return 'toss';
    if (window.__ITCH__ || /(^|\.)itch\.zone$/.test(location.hostname)) return 'itch';
  } catch (e) { /* 접근 불가 환경 무시 */ }
  return 'web';
}

export const PLATFORM = detect();          // 'web' | 'toss' | 'itch'
export const IS_TOSS = PLATFORM === 'toss';
export const IS_ITCH = PLATFORM === 'itch';
console.log('[platform]', PLATFORM);

// ── 앱인토스 웹뷰 SDK 지연 로더 — esm.sh CDN(ESM·CORS 허용, 무번들 검증 완료) ──
//    버전 고정(@3.0.2): 심사본 재현성. 토스 웹뷰 밖에서도 import 는 되지만
//    getUserKeyForGame/Environment 등 브리지 API 는 웹뷰 안에서만 동작함.
let _sdkPromise = null;
export function loadTossSDK() {
  if (!_sdkPromise) _sdkPromise = import('https://esm.sh/@apps-in-toss/web-framework@3.0.2');
  return _sdkPromise;
}
