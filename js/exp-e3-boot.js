import { IS_DEV_SESSION } from './config.js';
import { clientId, clientIdIsNew } from './i18n.js';
import { decideE3, parseE3Stored, E3_STORE_KEY } from './exp-e3.js';

const store = () => { try { return window.localStorage; } catch { return null; } };
const safe = (fn, fallback) => { try { return fn(); } catch { return fallback; } };

let memo = null;
export function e3Decision() {
  if (memo) return memo;
  const s = store();
  memo = decideE3({
    clientId: clientId(),
    newDevice: clientIdIsNew(),
    stored: parseE3Stored(safe(() => s?.getItem(E3_STORE_KEY), null)),
    dev: IS_DEV_SESSION,
    forced: IS_DEV_SESSION ? new URLSearchParams(location.search).get('e3') : null,
  });
  if (memo.reason === 'new') safe(() => s?.setItem(E3_STORE_KEY, JSON.stringify({ arm: memo.arm })), null);
  return memo;
}
