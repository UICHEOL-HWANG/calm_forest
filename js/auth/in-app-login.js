import { detectInApp, arrivalHandoff } from './in-app-browser.js';

export const INAPP_COPY = {
  blocked: '이 앱 안에서는 구글 로그인이 안 돼요. 이메일로 시작해 주세요.',
};

const VIEW_KEY = 'cf_inapp_view';
const onceThisSession = (k, v, storage = globalThis.sessionStorage) => {
  try {
    if (storage?.getItem(k) === v) return false;
    storage?.setItem(k, v);
  } catch { }
  return true;
};

export function mountInAppLogin({ $, track, platform, ua = navigator.userAgent }) {
  const env = detectInApp(ua);
  if (platform !== 'web' || !env.inApp) return { inApp: false, app: null };
  document.body.classList.add('inapp');
  if (onceThisSession(VIEW_KEY, '1')) track('inapp_view', { app: env.app, os: env.os });

  return { inApp: true, app: env.app, os: env.os };
}

const SEEN_KEY = 'cf_ho_seen';

export function trackHandoffArrival({ track, search, ua, storage }) {
  const hid = arrivalHandoff(search);
  if (!hid || !onceThisSession(SEEN_KEY, hid, storage)) return null;
  const env = detectInApp(ua);
  track('inapp_arrive', { hid, in_app: env.inApp, os: env.os });
  return hid;
}
