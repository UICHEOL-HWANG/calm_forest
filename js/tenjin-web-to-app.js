// Meta 광고 → 웹 랜딩 → 스토어: Tenjin 클릭을 보내고 기존 스토어 주소는 유지한다.
// Tenjin의 Meta Web-to-App 랜딩 예제처럼 GET 추적 요청을 별도로 보낸다.
import { IS_DEV_SESSION } from './config.js';

function cookie(name) {
  try { return document.cookie.split('; ').find(x => x.startsWith(name + '='))?.slice(name.length + 1) || ''; }
  catch { return ''; }
}

function fbclid() {
  try {
    const fbc = localStorage.getItem('cf_fbc') || '';
    return /^fb\.1\.\d+\.([\w-]{1,500})$/.exec(fbc)?.[1] || '';
  } catch { return ''; }
}

export function tenjinClickUrl(os, cfg, touch, identifiers = {}) {
  const utm = touch?.utm;
  if (utm?.source !== 'meta') return null;
  // 이번 집행의 소재만 Tenjin에 보낸다. 과거 W1 방문의 늦은 스토어 클릭은 제외한다.
  if (!/^w2_/.test(utm.content || '') && !/^w2_/.test(utm.term || '') && !/^w2_/.test(utm.campaign || '')) return null;
  const base = cfg?.tenjinClickUrls?.[os];
  if (!base) return null;
  const url = new URL(base);
  // Meta의 상위 캠페인(webapp_202610) 안에서 W2 실험군은 광고 세트명으로 구분한다.
  const name = /^w2_/.test(utm.term || '') ? utm.term : utm.content || utm.campaign;
  if (utm.campaign_id) url.searchParams.set('campaign_id', utm.campaign_id);
  if (name) url.searchParams.set('campaign_name', name);
  if (utm.content) url.searchParams.set('creative_name', utm.content);
  if (identifiers.fbp) url.searchParams.set('tenjin_parameter_0', identifiers.fbp);
  if (identifiers.fbclid) url.searchParams.set('tenjin_parameter_1', identifiers.fbclid);
  return url.toString();
}

export function trackTenjinStoreClick(os, cfg, touch) {
  if (IS_DEV_SESSION || typeof fetch !== 'function') return;
  const url = tenjinClickUrl(os, cfg, touch, { fbp: cookie('_fbp'), fbclid: fbclid() });
  if (!url) return;
  // 스토어 이동은 기다리지 않는다. keepalive는 같은 탭의 이동 중에도 GET을 보낸다.
  void fetch(url, { method: 'GET', mode: 'no-cors', keepalive: true, credentials: 'omit' }).catch(() => {});
}
