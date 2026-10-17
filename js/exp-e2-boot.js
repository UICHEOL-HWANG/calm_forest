// =============================================================
//  calm forest · 🧪 E2 — 저장소·URL 바인딩 (규칙은 js/exp-e2.js)
//  ------------------------------------------------------------
//  ▶ e2Decision() 은 처음 불릴 때 한 번 판정하고 기억한다. 첫 호출은 js/analytics.js 모듈 평가
//    (GA4 user_properties) — 로그인 화면 판단(index.html 부팅 IIFE)보다 항상 먼저다.
//  ▶ 신규 등록이면 cf_e2 에 무리를 남겨 재방문에도 같은 무리.
// =============================================================
import { IS_DEV_SESSION } from './config.js';
import { PLATFORM } from './platform.js';
import { clientId, clientIdIsNew } from './i18n.js';
import { INVITE_STORE_KEY, readInviteParam } from './referral/rules.js';
import { concludeE2, decideE2, parseE2Stored, hasStoredSession, E2_STORE_KEY } from './exp-e2.js';

const store = () => { try { return window.localStorage; } catch (e) { return null; } };
const safe = (fn, fallback) => { try { return fn(); } catch (e) { return fallback; } };

/** 초대 링크로 왔나 — 주소창 ?invite= 또는 보관된 코드(구글 리다이렉트가 쿼리를 지운 뒤) */
export function e2HasInvite() {
  return !!(readInviteParam(location.search) || safe(() => store()?.getItem(INVITE_STORE_KEY), null));
}

let memo = null;
export function e2Decision() {
  if (memo) return memo;
  const s = store();
  memo = concludeE2(decideE2({
    clientId: clientId(),
    platform: PLATFORM,
    newDevice: clientIdIsNew(),
    stored: parseE2Stored(safe(() => s?.getItem(E2_STORE_KEY), null)),
    hasSession: hasStoredSession(safe(() => (s ? Object.keys(s) : []), [])),
    hasInvite: e2HasInvite(),
    dev: IS_DEV_SESSION,
    forced: IS_DEV_SESSION ? new URLSearchParams(location.search).get('e2') : null,   // QA: ?dbg&e2=skip_login
  }));
  if (memo.reason === 'new') safe(() => s?.setItem(E2_STORE_KEY, JSON.stringify({ arm: memo.arm })), null);
  return memo;
}
