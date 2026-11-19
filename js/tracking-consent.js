import { capPlugin } from './cap-bridge.js';

const DECIDED = new Set(['authorized', 'denied', 'restricted']);
const SEEN_KEY = 'cf_att_seen';

function localStore() {
  try { return globalThis.localStorage || null; } catch { return null; }
}

function sendAttResult(params) {
  import('./analytics.js')
    .then(({ trackEvent }) => trackEvent('att_result', params))
    .catch((error) => console.warn('[att] result event failed', error));
}

export function reportAttResult(status, asked, { report = sendAttResult, store = localStore() } = {}) {
  try {
    if (store?.getItem(SEEN_KEY) === status) return;
    report({ status, asked: asked ? 1 : 0 });
    store?.setItem(SEEN_KEY, status);
  } catch (error) {
    console.warn('[att] result event failed', error);
  }
}

export async function requestTrackingConsent({ plugin = capPlugin('Tracking'), report, store } = {}) {
  if (!plugin) return false;
  const log = (status, asked) => reportAttResult(status, asked, {
    ...(report ? { report } : {}),
    ...(store !== undefined ? { store } : {}),
  });
  let asked = false;
  try {
    const { status } = await plugin.status();
    if (DECIDED.has(status)) {
      log(status, false);
      return status === 'authorized';
    }
    asked = true;
    const answer = await plugin.request();
    log(answer?.status || 'notDetermined', true);
    return answer?.status === 'authorized';
  } catch (error) {
    console.warn('[att] tracking consent failed', error);
    log('error', asked);
    return false;
  }
}
