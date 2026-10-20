// js/meta-pixel.js
// =============================================================
//  calm forest · 📣 Meta Pixel (웹 전용) — 광고 클릭 → 가입 → 결제창 → 결제 여정을 Meta 에 보낸다
//  ------------------------------------------------------------
//  ▶ config.js META_PIXEL_ID 가 비어 있으면 아무것도 로드하지 않는다(fbclid 보관만 한다 — 나중에 켜도 유입이 남게).
//  ▶ 웹(PLATFORM === 'web')만. 앱·토스·itch 는 현금 결제가 없어 보낼 여정도 없다. 🧪 dev 세션도 끈다(GA4 와 같은 규칙).
//  ▶ GA4 trackEvent → onTrack 훅으로 표준 이벤트를 따라 보낸다(index.html). Purchase 는 Paddle 완료 데이터로(js/shop/paddle.js).
//  ▶ 모듈 평가 때는 DOM 을 건드리지 않는다 — node 테스트가 paddle.js 를 import 한다.
//  ▶ 규칙(순수): js/meta-pixel-rules.js
// =============================================================
import { CONFIG, IS_DEV_SESSION } from './config.js';
import { PLATFORM } from './platform.js';
import { fbcFromSearch, metaEventFor, purchaseParams, isFreshSignup, attributionData } from './meta-pixel-rules.js';

const FBC_KEY = 'cf_fbc';        // fbclid 로 만든 _fbc — 구글 로그인 리다이렉트가 쿼리를 지워도 남게
const REG_KEY = 'cf_meta_reg';   // CompleteRegistration 을 보낸 user_id — 기기당 계정마다 한 번
const TOUCH_KEY = 'cf_first_touch';   // js/app-banner.js 가 남기는 jid·utm

const enabled = () => PLATFORM === 'web' && !IS_DEV_SESSION && !!CONFIG.META_PIXEL_ID;
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* 저장소 막힘 */ } };
const cookie = (k) => {
  try { return document.cookie.split('; ').find(c => c.startsWith(k + '='))?.slice(k.length + 1) || null; } catch { return null; }
};

/** 부팅 — 인증(리다이렉트) 전에 부른다. fbclid 를 보관하고, 설정돼 있으면 Pixel 을 올린다 */
export function bootMetaPixel() {
  if (PLATFORM !== 'web' || IS_DEV_SESSION) return;
  const fbc = fbcFromSearch(location.search, Date.now());
  if (fbc) lsSet(FBC_KEY, fbc);
  if (!enabled()) return;
  /* eslint-disable */
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
  document,'script','https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  window.fbq('set', 'autoConfig', false, CONFIG.META_PIXEL_ID);   // 버튼 클릭 자동 수집 끔 — 보내는 이벤트는 아래 표가 전부
  window.fbq('init', CONFIG.META_PIXEL_ID);
  window.fbq('track', 'PageView');
}

function send(event, params, eventId) {
  if (!enabled() || typeof window.fbq !== 'function') return;
  try { window.fbq('track', event, params, eventId ? { eventID: eventId } : undefined); } catch { /* 트래킹 실패 무시 */ }
}

/** onTrack 훅 — GA4 이벤트 중 Meta 표준 이벤트에 대응하는 것만 따라 보낸다 */
export function metaFromTrack(name, payload) {
  const m = metaEventFor(name, payload);
  if (m) send(m.event, m.params);
}

/** 가입 직후 첫 진입 — 게스트 제외, 계정마다 한 번 */
export function metaSignup({ userId, isGuest, createdAt } = {}) {
  if (!userId || isGuest || !isFreshSignup(createdAt, Date.now())) return;
  if (lsGet(REG_KEY) === userId) return;
  lsSet(REG_KEY, userId);
  send('CompleteRegistration', { status: 'ok' });
}

/** Paddle checkout.completed — 금액·통화·거래 id 로 Purchase */
export function metaPurchase(data, ctx) {
  const p = purchaseParams(data, ctx);
  if (p) send('Purchase', p.params, p.eventId);
}

/** 결제 customData.attr — fbc·fbp·utm·jid·client_id. Pixel 이 꺼져 있어도 보관된 값은 싣는다 */
export function metaAttribution(clientId) {
  let touch = null;
  try { touch = JSON.parse(lsGet(TOUCH_KEY) || 'null'); } catch { /* 깨진 값 */ }
  return attributionData({ fbc: cookie('_fbc') || lsGet(FBC_KEY), fbp: cookie('_fbp'), touch, clientId });
}
