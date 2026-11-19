import { DEFAULT_APP_BANNER, storeTarget, storeUrl } from '../js/app-banner.js';
import { TUNING } from '../js/tuning.js';
import { tenjinClickUrl } from '../js/tenjin-web-to-app.js';

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
      term: clean(q.get('utm_term'), 60),
      campaign_id: clean(q.get('campaign_id'), 30),
    },
  };
  const url = storeUrl(os, full, touch, clean(q.get('utm_medium'), 30) || 'app_link');
  if (!url) return { kind: 'page' };
  const track = tenjinClickUrl(os, full, touch, { fbclid: clean(q.get('fbclid'), 500) });
  return track ? { kind: 'redirect', url, track } : { kind: 'redirect', url };
}

const js = (v) => JSON.stringify(v).replace(/</g, '\\u003c');
const attr = (v) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

function trackPage(url, track) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>고요한 숲</title>`
    + `<noscript><meta http-equiv="refresh" content="0;url=${attr(url)}"></noscript></head><body style="background:#f6f8f6">`
    + `<script>try{fetch(${js(track)},{method:'GET',mode:'no-cors',keepalive:true,credentials:'omit'}).catch(function(){})}catch(e){}`
    + `setTimeout(function(){location.replace(${js(url)})},120);</script></body></html>`;
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const t = appLinkTarget({ ua: request.headers.get('user-agent'), search: url.search });
  if (t.kind === 'redirect' && t.track) {
    return new Response(trackPage(t.url, t.track), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', Vary: 'User-Agent' },
    });
  }
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
