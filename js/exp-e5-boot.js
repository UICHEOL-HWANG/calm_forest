import { IS_DEV_SESSION } from './config.js';
import { clientId, clientIdIsNew } from './i18n.js';
import { PLATFORM } from './platform.js';
import { detectInApp } from './auth/in-app-browser.js';
import { decideE5, parseE5Stored, E5_STORE_KEY } from './exp-e5.js';

const store = () => { try { return window.localStorage; } catch { return null; } };
const safe = (fn, fallback) => { try { return fn(); } catch { return fallback; } };

let memo = null;
export function e5Decision() {
  if (memo) return memo;
  const s = store();
  memo = decideE5({
    clientId: clientId(),
    newDevice: clientIdIsNew(),
    stored: parseE5Stored(safe(() => s?.getItem(E5_STORE_KEY), null)),
    inApp: safe(() => detectInApp(navigator.userAgent).inApp, false),
    platform: PLATFORM,
    dev: IS_DEV_SESSION,
    forced: IS_DEV_SESSION ? new URLSearchParams(location.search).get('e5') : null,
  });
  if (memo.reason === 'new') safe(() => s?.setItem(E5_STORE_KEY, JSON.stringify({ arm: memo.arm })), null);
  return memo;
}
