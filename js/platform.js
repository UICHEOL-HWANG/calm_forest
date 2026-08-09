// =============================================================
//  calm forest · 플랫폼 어댑터 — 'web'(기본) | 'toss'(앱인토스 웹뷰)
//  ------------------------------------------------------------
//  단일 코드베이스 전략: 기능 코드는 플랫폼을 모른 채 개발하고,
//  로그인·트래킹·정책 분기만 이 모듈의 값 하나로 갈라집니다.
//
//  감지 우선순위:
//   ① URL ?platform=toss — 앱인토스 배포 진입점이 명시(테스트에도 사용)
//   ② 앱인토스 SDK 전역 — @apps-in-toss/web-framework 통합 후 자동 감지
//   ③ 기본 'web'
//
//  ▶ 토스 로그인 연동(다음 단계) 메모 — 공식 문서 확인됨:
//    · 웹뷰 SDK: @apps-in-toss/web-framework 의 appLogin()
//      → Promise<{ authorizationCode, referrer: 'DEFAULT'|'SANDBOX' }>
//    · 서버 교환: POST /api-partner/v1/apps-in-toss/user/oauth2/generate-token
//      → accessToken → GET .../login-me 로 userKey 등 조회(인가코드 10분·일회성)
//    · 교환은 시크릿이 필요하므로 서버(Cloudflare Worker/Supabase Edge Function)에서 수행
// =============================================================

const _pq = new URLSearchParams(location.search);

function detect() {
  if (_pq.get('platform') === 'toss') return 'toss';
  try {
    // SDK 통합 후 웹뷰 전역이 있으면 자동 인식(전역 이름은 SDK 도입 시점에 확정)
    if (window.AppsInToss || window.__APPS_IN_TOSS__) return 'toss';
  } catch (e) { /* 접근 불가 환경 무시 */ }
  return 'web';
}

export const PLATFORM = detect();          // 'web' | 'toss'
export const IS_TOSS = PLATFORM === 'toss';
console.log('[platform]', PLATFORM);

// ── 앱인토스 웹뷰 SDK 지연 로더 — esm.sh CDN(ESM·CORS 허용, 무번들 검증 완료) ──
//    버전 고정(@3.0.2): 심사본 재현성. 토스 웹뷰 밖에서도 import 는 되지만
//    appLogin/Environment 등 브리지 API 는 웹뷰 안에서만 동작함.
let _sdkPromise = null;
export function loadTossSDK() {
  if (!_sdkPromise) _sdkPromise = import('https://esm.sh/@apps-in-toss/web-framework@3.0.2');
  return _sdkPromise;
}
