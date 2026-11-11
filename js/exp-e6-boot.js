import { IS_DEV_SESSION } from './config.js';
import { clientId, clientIdIsNew } from './i18n.js';
import { decideE6, parseE6Stored, E6_STORE_KEY } from './exp-e6.js';

const store = () => { try { return window.localStorage; } catch { return null; } };
const safe = (fn, fallback) => { try { return fn(); } catch { return fallback; } };

let memo = null;
export function e6Decision() {
  if (memo) return memo;
  const s = store();
  memo = decideE6({
    clientId: clientId(),
    newDevice: clientIdIsNew(),
    stored: parseE6Stored(safe(() => s?.getItem(E6_STORE_KEY), null)),
    dev: IS_DEV_SESSION,
    forced: IS_DEV_SESSION ? new URLSearchParams(location.search).get('e6') : null,
  });
  if (memo.reason === 'new') safe(() => s?.setItem(E6_STORE_KEY, JSON.stringify({ arm: memo.arm })), null);
  return memo;
}
