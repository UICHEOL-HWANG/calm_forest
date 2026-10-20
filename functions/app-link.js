import { DEFAULT_APP_BANNER, storeTarget, storeUrl } from '../js/app-banner.js';
import { TUNING } from '../js/tuning.js';

const clean = (v, max) => String(v || '').replace(/[^\w-]/g, '_').slice(0, max);
export const BOT = /bot\b|bot\/|crawler|spider|facebookexternalhit|yeti\/|kakaotalk-scrap|slack-imgproxy|whatsapp\//i;

export function appLinkTarget({ ua, search, cfg = TUNING.appBanner }) {
  if (BOT.test(ua || '')) return { kind: 'page' };
  const q = new URLSearchParams(search || '');
  const forced = q.get('os');
  const os = forced === 'ios' || forced === 'android' ? forced : storeTarget(ua || '', 0);
  if (!os) return { kind: 'page' };
  const full = { ...DEFAULT_APP_BANNER, ...(cfg || {}) };
  const touch = {
    utm: {
      source: clean(q.get('utm_source'), 40) || 'direct',
      campaign: clean(q.get('utm_campaign'), 60),
      content: clean(q.get('utm_content'), 40),
    },
  };
  const url = storeUrl(os, full, touch, clean(q.get('utm_medium'), 30) || 'app_link');
  return url ? { kind: 'redirect', url } : { kind: 'page' };
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const t = appLinkTarget({ ua: request.headers.get('user-agent'), search: url.search });
  if (t.kind === 'redirect') {
    return new Response(null, {
      status: 302,
      headers: { Location: t.url, 'Cache-Control': 'no-store', Vary: 'User-Agent' },
    });
  }
  const page = await env.ASSETS.fetch(new Request(new URL('/app', url.origin), request));
  const res = new Response(page.body, page);
  res.headers.set('Vary', 'User-Agent');
  res.headers.set('Cache-Control', 'public, max-age=300');
  return res;
}
