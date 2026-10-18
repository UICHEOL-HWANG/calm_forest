import { loginStorePlan } from './login-store.js';
import { TOUCH_KEY } from './app-banner.js';

const ICONS = {
  ios: '<svg viewBox="0 0 384 512" aria-hidden="true"><path fill="#fff" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>',
  android: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#34a853" d="M3.6 2.2 13.4 12l-9.8 9.8c-.4-.2-.6-.6-.6-1.1V3.3c0-.5.2-.9.6-1.1z"/><path fill="#fbbc05" d="m17 8.4-3.6 3.6L17 15.6l4-2.3c.8-.5.8-1.7 0-2.2z"/><path fill="#ea4335" d="M13.4 12 3.6 21.8c.3.2.8.2 1.2 0L17 15.6z"/><path fill="#4285f4" d="M13.4 12 17 8.4 4.8 2.2c-.4-.2-.9-.2-1.2 0z"/></svg>',
};
const LABELS = { ios: ['Download on the', 'App Store'], android: ['GET IT ON', 'Google Play'] };

function readTouch() {
  try { return JSON.parse(localStorage.getItem(TOUCH_KEY) || 'null'); } catch { return null; }
}

function badge(doc, { os, url }, onClick) {
  const a = doc.createElement('a');
  a.className = 'store-badge';
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  a.setAttribute('aria-label', LABELS[os][1]);
  a.innerHTML = `${ICONS[os]}<span><small>${LABELS[os][0]}</small><b>${LABELS[os][1]}</b></span>`;
  a.addEventListener('click', () => onClick(os));
  return a;
}

export function mountLoginStore({ config, platform, track, doc = document, nav = navigator }) {
  const plan = loginStorePlan({ platform, ua: nav.userAgent, maxTouchPoints: nav.maxTouchPoints || 0, cfg: config, touch: readTouch() });
  if (!plan) return null;
  const card = doc.getElementById('login-store');
  const row = card?.querySelector('.ls-row');
  if (!row) return null;
  const onClick = (os) => track('login_store_click', { os, device: plan.device });
  plan.links.forEach(l => row.appendChild(badge(doc, l, onClick)));
  card.hidden = false;
  const qr = doc.getElementById('login-qr');
  if (plan.qr && qr) {
    const live = new Set(plan.links.map(l => l.os));
    qr.querySelectorAll('[data-os]').forEach(el => {
      el.hidden = !live.has(el.dataset.os);
      const img = el.querySelector('img[data-src]');
      if (!el.hidden && img) img.src = img.dataset.src;
    });
    const main = doc.getElementById('login-main');
    const sync = () => { qr.hidden = !!main?.hidden; };
    sync();
    if (main && doc.defaultView.MutationObserver) new doc.defaultView.MutationObserver(sync).observe(main, { attributes: true, attributeFilter: ['hidden'] });
  }
  let seen = false;
  return {
    plan,
    shown() {
      if (seen) return;
      seen = true;
      const qrVisible = !!qr && !qr.hidden && doc.defaultView.getComputedStyle(qr).display !== 'none';
      track('login_store_view', { device: plan.device, qr: qrVisible });
    },
  };
}
