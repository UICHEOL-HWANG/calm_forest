import { DEFAULT_APP_BANNER, storeTarget, storeUrl } from './app-banner.js';

export const LOGIN_STORE_PLATFORMS = ['web', 'itch'];
export const QR_FILES = { ios: 'assets/qr/login-app-store.svg', android: 'assets/qr/login-google-play.svg' };

export function loginStorePlan({ platform, ua, maxTouchPoints, cfg, touch }) {
  if (!LOGIN_STORE_PLATFORMS.includes(platform)) return null;
  const device = storeTarget(ua, maxTouchPoints);
  const full = { ...DEFAULT_APP_BANNER, ...(cfg || {}) };
  const oses = device ? [device] : ['ios', 'android'];
  const links = oses
    .map(os => ({ os, url: storeUrl(os, full, touch, 'login_card') }))
    .filter(l => l.url);
  if (!links.length) return null;
  return { device: device || 'pc', links, qr: !device, jid: touch?.jid || '' };
}
