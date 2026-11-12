// Store apps only. Tenjin's SDK keys identify the app; they are bundled with the client.
import { capPlugin } from './cap-bridge.js';
import { IS_ANDROID, IS_IOS } from './platform.js';
import { IS_DEV_SESSION } from './config.js';
import { requestTrackingConsent } from './tracking-consent.js';
import { admobImpressionJson } from './tenjin-ad-revenue.js';

const SDK_KEYS = {
  ios: 'GN4VXMC8WVUBHYVNTW6XZINFV2DFU97E',
  android: 'BKNNUYFWHS1GJXT1F98YPWZ8182GER1E',
};

let ready;

export function bootTenjin() {
  if ((!IS_IOS && !IS_ANDROID) || IS_DEV_SESSION) return Promise.resolve(null);
  if (ready) return ready;

  const plugin = capPlugin('Tenjin');
  if (!plugin) {
    console.warn('[tenjin] native plugin unavailable');
    return Promise.resolve(null);
  }

  ready = (async () => {
    if (IS_IOS && !(await requestTrackingConsent())) return null;
    await plugin.initialize({ sdkKey: IS_IOS ? SDK_KEYS.ios : SDK_KEYS.android });
    await plugin.connect();
    return plugin;
  })().catch((error) => {
    console.warn('[tenjin] initialization failed', error);
    return null;
  });

  // A resumed app can start another session without reloading its WebView.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) ready.then((sdk) => sdk?.connect().catch((error) =>
      console.warn('[tenjin] reconnect failed', error)));
  });
  return ready;
}

export async function identifyTenjinUser(userId) {
  if (!userId) return;
  const sdk = await bootTenjin();
  if (sdk) await sdk.setCustomerUserId({ userId: String(userId) }).catch((error) =>
    console.warn('[tenjin] user ID failed', error));
}

export async function trackTenjinAdImpression(paid) {
  const json = admobImpressionJson(paid);
  if (!json) return;
  const sdk = await bootTenjin();
  if (sdk) await sdk.eventAdImpressionAdMob({ json }).catch((error) =>
    console.warn('[tenjin] ad impression failed', error));
}

export async function trackTenjinGameStart() {
  const sdk = await bootTenjin();
  if (sdk) await sdk.eventWithName({ name: 'game_start' }).catch((error) =>
    console.warn('[tenjin] game start failed', error));
}
