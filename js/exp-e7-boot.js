import { IS_DEV_SESSION } from './config.js';
import { clientId, clientIdIsNew } from './i18n.js';
import { decideE7, parseE7Stored, E7_STORE_KEY } from './exp-e7.js';

const store = () => { try { return window.localStorage; } catch { return null; } };
const safe = (fn, fallback) => { try { return fn(); } catch { return fallback; } };

let memo = null;
export function e7Decision() {
  if (memo) return memo;
  const s = store();
  memo = decideE7({
    clientId: clientId(),
    newDevice: clientIdIsNew(),
    stored: parseE7Stored(safe(() => s?.getItem(E7_STORE_KEY), null)),
    dev: IS_DEV_SESSION,
    forced: IS_DEV_SESSION ? new URLSearchParams(location.search).get('e7') : null,
  });
  if (memo.reason === 'new') safe(() => s?.setItem(E7_STORE_KEY, JSON.stringify({ arm: memo.arm })), null);
  return memo;
}
