// =============================================================
//  calm forest · 오류 수집 부트 — index.html 의 이른 모듈 스크립트에서 한 번 불린다
//  ------------------------------------------------------------
//  게임 본체(모듈 64개)보다 먼저 떠야 로딩 중 오류까지 잡힌다 → 의존은 가벼운 것만(config·platform).
//  전송처는 CONFIG.API_BASE + /api/logs — 토스·itch·앱 빌드는 API_BASE 가 웹 오리진으로 치환된다.
//  dev 세션(?dbg 등)은 서버로 보내지 않는다(GA4 오염 방지 규칙과 같다).
// =============================================================

import { CONFIG, IS_DEV_SESSION } from './config.js';
import { PLATFORM } from './platform.js';
import { createErrorReporter } from './client-errors.js';
import { installErrorHooks, makeSender } from './client-errors-hooks.js';
import { installStaleChunkReload } from './stale-chunk-reload.js';

const ENDPOINT = `${CONFIG.API_BASE}/api/logs`;
const FLUSH_EVERY_MS = 10_000;

let userId = null;
export function setLogUser(uid) { userId = uid || null; }   // supabase-client 가 로그인·로그아웃 때 부른다

function boot() {
  if (typeof window === 'undefined' || window.__cfErrorsBooted) return null;
  window.__cfErrorsBooted = true;

  let storage = null;
  try { storage = window.localStorage; } catch (e) { /* 막힌 환경 — 메모리로만 */ }
  const nativeFetch = window.fetch.bind(window);
  const reporter = createErrorReporter({
    send: makeSender({
      endpoint: ENDPOINT,
      beaconFn: navigator.sendBeacon ? (u, b) => navigator.sendBeacon(u, b) : null,
      fetchFn: nativeFetch,
    }),
    storage: storage || { getItem: () => null, setItem() {}, removeItem() {} },
    context: () => ({ platform: PLATFORM, uid: userId, path: location.pathname }),
    enabled: !IS_DEV_SESSION,
  });
  installErrorHooks({ win: window, doc: document, reporter, consoleObj: console, fetchScope: window, endpoint: '/api/logs' });
  installStaleChunkReload(window);
  setInterval(() => reporter.flush(), FLUSH_EVERY_MS);
  reporter.flush();   // 지난 실행에서 못 보낸 잔여분
  return reporter;
}

boot();
