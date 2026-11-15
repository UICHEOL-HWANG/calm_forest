// Store apps only. Tenjin's SDK keys identify the app; they are bundled with the client.
import { capPlugin } from './cap-bridge.js';
import { IS_ANDROID, IS_IOS } from './platform.js';
import { IS_DEV_SESSION } from './config.js';
import { requestTrackingConsent } from './tracking-consent.js';
import { admobImpressionJson } from './tenjin-ad-revenue.js';
import { tenjinEventFor, onceSeed, bumpTally, tallyEvents } from './tenjin-events.js';
import { isFreshSignup } from './meta-pixel-rules.js';

const ONCE_KEY = 'cf_tj_once';

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

const sessionOnce = new Set();

function readOnce() {
  try {
    const list = JSON.parse(localStorage.getItem(ONCE_KEY));
    return Array.isArray(list) ? list : null;
  } catch { return null; }
}

function writeOnce(list) {
  try { localStorage.setItem(ONCE_KEY, JSON.stringify(list)); } catch { return; }
}

export function initTenjinOnce(established) {
  if (!readOnce()) writeOnce(onceSeed(established));
}

async function sendTenjinEvent(ev) {
  if (ev.once) {
    if (sessionOnce.has(ev.name) || readOnce()?.includes(ev.name)) return;
    sessionOnce.add(ev.name);
  }
  const sdk = await bootTenjin();
  if (!sdk) { sessionOnce.delete(ev.name); return; }
  try {
    await ('value' in ev
      ? sdk.eventWithNameAndValue({ name: ev.name, value: String(ev.value) })
      : sdk.eventWithName({ name: ev.name }));
    if (ev.once) writeOnce([...(readOnce() || []), ev.name]);
  } catch (error) {
    sessionOnce.delete(ev.name);
    console.warn('[tenjin] event failed', ev.name, error);
  }
}

function expandTally(ev) {
  if (!ev.tally) return [ev];
  try { return tallyEvents(bumpTally(localStorage)); } catch { return []; }
}

export function tenjinFromTrack(name, payload) {
  const ev = tenjinEventFor(name, payload);
  if (!ev) return;
  for (const one of [ev].flat().flatMap(expandTally)) void sendTenjinEvent(one);
}

export function tenjinSignup({ userId, isGuest, createdAt } = {}) {
  if (!userId || isGuest || !isFreshSignup(createdAt, Date.now())) return;
  void sendTenjinEvent({ name: 'signup', once: true });
}

export async function trackTenjinGameStart() {
  const sdk = await bootTenjin();
  if (sdk) await sdk.eventWithName({ name: 'game_start' }).catch((error) =>
    console.warn('[tenjin] game start failed', error));
}
