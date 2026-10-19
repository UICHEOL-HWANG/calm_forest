import { detectInApp, handoffUrl, withAttribution } from './in-app-browser.js';

export const INAPP_COPY = {
  android: '🌐 크롬에서 열기',
  ios: '🌐 사파리에서 열기',
  other: '🌐 브라우저에서 열기',
  note: '이 앱 안에서는 구글 로그인이 안 돼요.',
  tip: '안 열리면 오른쪽 위 ··· 메뉴에서 외부 브라우저로 열어 주세요.',
  blocked: '이 앱 안에서는 구글 로그인이 안 돼요. 크롬이나 사파리에서 열어 주세요.',
};

const readJson = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };

export function buttonLabel({ app, os }) {
  if (app === 'kakaotalk') return INAPP_COPY.other;
  return INAPP_COPY[os] || INAPP_COPY.other;
}

export function mountInAppLogin({ $, track, platform, ua = navigator.userAgent }) {
  const env = detectInApp(ua);
  if (platform !== 'web' || !env.inApp) return { inApp: false, app: null };
  document.body.classList.add('inapp');

  const box = document.createElement('div');
  box.id = 'inapp-handoff';
  const btn = document.createElement('button');
  btn.id = 'inapp-open';
  btn.type = 'button';
  btn.textContent = buttonLabel(env);
  const note = document.createElement('p');
  note.textContent = INAPP_COPY.note;
  const tip = document.createElement('p');
  tip.className = 'inapp-tip';
  tip.hidden = true;
  tip.textContent = INAPP_COPY.tip;
  box.append(btn, note, tip);
  $('google-btn').before(box);

  btn.addEventListener('click', () => {
    const href = withAttribution(location.href, {
      touch: readJson('cf_first_touch'),
      fbc: read('cf_fbc'),
      invite: read('cf_invite'),
    });
    const url = handoffUrl({ href, os: env.os, app: env.app });
    track('inapp_handoff', { app: env.app, os: env.os, ok: !!url });
    if (url) location.href = url;
    setTimeout(() => { if (document.visibilityState === 'visible') tip.hidden = false; }, url ? 1500 : 0);
  });

  return { inApp: true, app: env.app, os: env.os };
}
