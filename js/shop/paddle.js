// js/shop/paddle.js
// =============================================================
//  calm forest · 💳 Paddle.js 지연 로더 + 오버레이 체크아웃 (웹 전용)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-30-paddle-checkout-design.md §5
//  ▶ 부팅 비용 0 — 현금 버튼을 처음 누를 때 cdn.paddle.com 스크립트를 넣는다.
//  ▶ customData 의 user_id 만 서버가 믿는다. item_id·kind 는 대시보드에서 보기 좋으라고 같이 싣는다.
//  ▶ 지급은 여기서 하지 않는다 — checkout.completed 는 "원장을 폴링하라" 신호일 뿐(js/shop/purchases.js awaitGrant).
//  ▶ ⚠️ 동작 계약: checkout.completed 후 current 를 null 로 처리해 trailing checkout.closed 를 의도적으로
//    swallow 한다. 따라서 onClosed 는 완료된 구매에서는 발화하지 않는다. Task 8 의 onCompleted 핸들러는
//    자신의 busy state 를 직접 리셋해야 한다 (onClosed 를 기다리면 안 됨).
//  ▶ openCheckout 은 boolean 을 반환한다: 결제창이 열렸으면 true, 재진입으로 무시되면 false.
// =============================================================
import { CONFIG } from '../config.js';
import { PLATFORM } from '../platform.js';
import { getLang } from '../i18n.js';

const PADDLE_JS = 'https://cdn.paddle.com/paddle/v2/paddle.js';
let ready = null;          // Promise<Paddle> — 실패하면 null 로 되돌려 다음 클릭이 다시 시도한다
let initialized = false;
let current = null;        // 열려 있는 결제 { priceId, itemId, kind } — Paddle 이벤트가 닫을 때 비운다
let opening = false;       // openCheckout 진입~Checkout.open 반환 사이(동기 가드 — await 구간도 막는다)
let handlers = { onCompleted: () => {}, onClosed: () => {} };

export function cashAvailable(state) {
  return PLATFORM === 'web' && !!state?.online && !state?.isGuest;
}

export function setCheckoutHandlers(h) {
  const merged = {};
  for (const [k, v] of Object.entries(handlers)) merged[k] = v;
  for (const [k, v] of Object.entries(h || {})) if (typeof v === 'function') merged[k] = v;
  handlers = merged;
}

function onPaddleEvent(ev) {
  if (!current) return;
  if (ev?.name === 'checkout.completed') { const c = current; current = null; handlers.onCompleted(c); }
  else if (ev?.name === 'checkout.closed') { const c = current; current = null; handlers.onClosed(c); }
}

function injectScript() {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = PADDLE_JS; s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('paddle.js load failed'));
    document.head.appendChild(s);
  });
}

function init() {
  if (initialized) return;
  if (CONFIG.PADDLE.env === 'sandbox') window.Paddle.Environment.set('sandbox');
  window.Paddle.Initialize({ token: CONFIG.PADDLE.token, eventCallback: onPaddleEvent });
  initialized = true;
}

function loadPaddle() {
  if (ready) return ready;
  ready = (async () => {
    try {
      if (!window.Paddle) await injectScript();
      init();
      return window.Paddle;
    } catch (e) {
      ready = null;            // async 함수 안이라 바깥 대입보다 뒤에 실행된다 — 실패한 프로미스가 캐시에 남지 않는다
      throw e;
    }
  })();
  return ready;
}

export async function openCheckout({ priceId, itemId, kind, userId, email }) {
  if (!CONFIG.PADDLE.token) throw new Error('paddle token missing');
  if (opening || current) return false;      // 재진입 — 로딩 중이든 결제창이 떠 있든 두 번째 클릭은 무시
  opening = true;
  try {
    const Paddle = await loadPaddle();
    current = { priceId, itemId, kind };
    try {
      Paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customData: { user_id: userId, item_id: itemId, kind },
        customer: email ? { email } : undefined,
        settings: { displayMode: 'overlay', locale: getLang() === 'en' ? 'en' : 'ko' },
      });
    } catch (e) { current = null; throw e; }   // 동기 throw 면 잠기지 않게 비운다
    return true;
  } finally { opening = false; }
}
