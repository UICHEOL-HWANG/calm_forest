const APPS = [
  ['kakaotalk', /KAKAOTALK/i],
  ['threads', /\bBarcelona\b/],
  ['instagram', /\bInstagram\b/],
  ['facebook', /FBAN|FBAV|FB_IAB|FBIOS/],
];

const osOf = (ua) => /Android/i.test(ua) ? 'android' : /iPhone|iPad|iPod/i.test(ua) ? 'ios' : 'other';

export function detectInApp(ua) {
  const s = typeof ua === 'string' ? ua : '';
  const hit = APPS.find(([, re]) => re.test(s));
  return hit ? { inApp: true, app: hit[0], os: osOf(s) } : { inApp: false, app: null, os: osOf(s) };
}

const httpsUrl = (href) => {
  try {
    const u = new URL(href);
    return u.protocol === 'https:' ? u : null;
  } catch { return null; }
};

export function handoffUrl({ href, os, app } = {}) {
  const u = httpsUrl(href);
  if (!u) return null;
  const full = u.href;
  if (app === 'kakaotalk') return 'kakaotalk://web/openExternal?url=' + encodeURIComponent(full);
  const rest = u.host + u.pathname + u.search;
  if (os === 'android') {
    return `intent://${rest}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(full)};end`;
  }
  if (os === 'ios') return 'x-safari-https://' + rest;
  return null;
}

const UTM_KEYS = ['source', 'medium', 'campaign', 'content'];
const HANDOFF_RE = /^[a-z0-9]{8}$/;
const ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function handoffId(rand = Math.random) {
  return Array.from({ length: 8 }, () => ID_CHARS[Math.floor(rand() * ID_CHARS.length) % ID_CHARS.length]).join('');
}

export function arrivalHandoff(search) {
  const ho = new URLSearchParams(typeof search === 'string' ? search : '').get('ho');
  return ho && HANDOFF_RE.test(ho) ? ho : null;
}

export function withAttribution(href, { touch, fbc, invite, handoff } = {}) {
  let u;
  try { u = new URL(href); } catch { return href; }
  const q = u.searchParams;
  const put = (k, v) => { if (typeof v === 'string' && v && !q.has(k)) q.set(k, v.slice(0, 200)); };
  const utm = touch?.utm;
  if (utm && !q.has('utm_source')) for (const k of UTM_KEYS) put('utm_' + k, utm[k]);
  const fbclid = typeof fbc === 'string' ? fbc.match(/^fb\.1\.\d+\.([\w-]{1,500})$/)?.[1] : null;
  put('fbclid', fbclid);
  put('invite', invite);
  if (typeof handoff === 'string' && HANDOFF_RE.test(handoff)) put('ho', handoff);
  return u.href;
}
