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
// =============================================================
import { CONFIG } from '../config.js';
import { PLATFORM } from '../platform.js';
import { getLang } from '../i18n.js';

const PADDLE_JS = 'https://cdn.paddle.com/paddle/v2/paddle.js';
let ready = null;          // Promise<Paddle>
let initialized = false;   // Initialize 가 성공한 적 있는지 추적
let current = null;        // 지금 열린 결제 { priceId, itemId, kind }
let handlers = { onCompleted: () => {}, onClosed: () => {} };

export function cashAvailable(state) {
  return PLATFORM === 'web' && !!state?.online && !state?.isGuest;
}

export function setCheckoutHandlers(h) {
  const merged = {};
  for (const [k, v] of Object.entries(handlers)) merged[k] = v;
  for (const [k, v] of Object.entries(h)) if (typeof v === 'function') merged[k] = v;
  handlers = merged;
}

function onPaddleEvent(ev) {
  if (!current) return;
  if (ev?.name === 'checkout.completed') { const c = current; current = null; handlers.onCompleted(c); }
  else if (ev?.name === 'checkout.closed') { const c = current; current = null; handlers.onClosed(c); }
}

function init() {
  if (initialized) return;
  if (CONFIG.PADDLE.env === 'sandbox') window.Paddle.Environment.set('sandbox');
  window.Paddle.Initialize({ token: CONFIG.PADDLE.token, eventCallback: onPaddleEvent });
  initialized = true;
}

function loadPaddle() {
  if (ready) return ready;
  ready = new Promise((resolve, reject) => {
    if (window.Paddle) {
      try {
        init();
        return resolve(window.Paddle);
      } catch (e) {
        initialized = false;
        ready = null;
        return reject(e);
      }
    }
    const s = document.createElement('script');
    s.src = PADDLE_JS; s.async = true;
    s.onload = () => {
      try {
        init();
        resolve(window.Paddle);
      } catch (e) { initialized = false; ready = null; reject(e); }
    };
    s.onerror = () => { ready = null; reject(new Error('paddle.js load failed')); };
    document.head.appendChild(s);
  });
  return ready;
}

export async function openCheckout({ priceId, itemId, kind, userId, email }) {
  if (!CONFIG.PADDLE.token) throw new Error('paddle token missing');
  if (current) return;
  const Paddle = await loadPaddle();
  current = { priceId, itemId, kind };
  Paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customData: { user_id: userId, item_id: itemId, kind },
    customer: email ? { email } : undefined,
    settings: { displayMode: 'overlay', locale: getLang() === 'en' ? 'en' : 'ko' },
  });
}
