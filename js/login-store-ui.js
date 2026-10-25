import { loginStorePlan } from './login-store.js';
import { TOUCH_KEY } from './app-banner.js';

function readTouch() {
  try { return JSON.parse(localStorage.getItem(TOUCH_KEY) || 'null'); } catch { return null; }
}

function badge(doc, { os, url }, onClick, art) {
  const a = doc.createElement('a');
  a.className = 'store-badge';
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  const img = art.cloneNode();
  img.src = img.dataset.src;
  a.appendChild(img);
  a.addEventListener('click', () => onClick(os));
  return a;
}

export function mountLoginStore({ config, platform, track, lang = 'ko', doc = document, nav = navigator }) {
  const plan = loginStorePlan({ platform, ua: nav.userAgent, maxTouchPoints: nav.maxTouchPoints || 0, cfg: config, touch: readTouch() });
  if (!plan) return null;
  const card = doc.getElementById('login-store');
  const row = card?.querySelector('.ls-row');
  if (!row) return null;
  const onClick = (os) => track('login_store_click', { os, device: plan.device, jid: plan.jid });
  const arts = doc.getElementById('store-badges')?.content;
  const artFor = (os) => arts?.querySelector(`img[data-os="${os}"][data-lang="${lang === 'en' ? 'en' : 'ko'}"]`);
  const links = plan.links.filter(l => artFor(l.os));
  if (!links.length) return null;
  links.forEach(l => row.appendChild(badge(doc, l, onClick, artFor(l.os))));
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
