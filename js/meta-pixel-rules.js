// js/meta-pixel-rules.js
// =============================================================
//  calm forest · 📣 Meta Pixel 규칙 (순수 — DOM/네트워크 없음)
//  ------------------------------------------------------------
//  ▶ GA4 이벤트 이름 → Meta 표준 이벤트로 옮기는 표, fbclid → _fbc 값, Paddle 완료 데이터 → Purchase 값,
//    결제 customData 에 실을 유입 정보(attr)를 만든다. 실제 fbq 호출은 js/meta-pixel.js.
//  ▶ 🔒 Meta 로 나가는 값은 아이템 id·종류·금액·통화·거래 id 뿐이다. 이메일·이름·국가는 싣지 않는다.
//  ▶ 테스트: tests/meta-pixel.test.mjs
// =============================================================

/** fbclid 가 붙은 랜딩 → Meta 규격 _fbc 값(fb.1.<ms>.<fbclid>). 없으면 null */
export function fbcFromSearch(search, nowMs) {
  const id = new URLSearchParams(search || '').get('fbclid');
  if (!id || !/^[\w-]{1,500}$/.test(id)) return null;
  return `fb.1.${nowMs}.${id}`;
}

/** GA4 trackEvent(name, payload) → Meta 표준 이벤트 { event, params } | null.
 *  Purchase 는 여기서 만들지 않는다 — 금액·거래 id 가 있는 Paddle 완료 데이터에서 따로(purchaseParams). */
export function metaEventFor(name, p = {}) {
  const content = () => ({ content_ids: [String(p.item_id || '')], content_type: 'product', content_category: p.kind || undefined });
  if (name === 'premium_row_view') return { event: 'ViewContent', params: { content_type: 'product', content_category: p.kind || undefined } };
  if (name === 'cosmetic_tryon') return { event: 'ViewContent', params: content() };
  if (name === 'cash_checkout_open') return { event: 'InitiateCheckout', params: { ...content(), num_items: 1 } };
  if (name === 'paddle_step' && p.step === 'payment_selected') return { event: 'AddPaymentInfo', params: content() };
  return null;
}

/** Paddle.js checkout.completed 의 data → Purchase { params, eventId }. 거래 id 가 없으면 null.
 *  eventId = Paddle 거래 id — 나중에 웹훅(CAPI)에서 같은 id 로 보내면 Meta 가 중복을 지운다. */
export function purchaseParams(data, ctx = {}) {
  const txn = data?.transaction_id;
  if (typeof txn !== 'string' || !txn) return null;
  const total = Number(data?.totals?.total);
  const currency = typeof data?.currency_code === 'string' ? data.currency_code : undefined;
  return {
    eventId: txn,
    params: {
      content_ids: ctx.itemId ? [String(ctx.itemId)] : undefined,
      content_type: 'product',
      content_category: ctx.kind || undefined,
      num_items: 1,
      ...(Number.isFinite(total) && currency ? { value: total, currency } : {}),
    },
  };
}

/** 방금 만든 계정인가 — 가입 직후 첫 로그인만 CompleteRegistration 으로 센다(재방문 로그인 제외) */
export const FRESH_SIGNUP_MS = 30 * 60 * 1000;
export function isFreshSignup(createdAt, nowMs) {
  const t = Date.parse(createdAt || '');
  return Number.isFinite(t) && nowMs - t >= 0 && nowMs - t < FRESH_SIGNUP_MS;
}

/** Paddle customData.attr — 결제 원장(purchases.raw)에 남아 광고 유입 ↔ 결제를 잇는다(서버 CAPI·BQ 조인용).
 *  touch = cf_first_touch({ jid, utm:{source,medium,campaign,content} }). 빈 값은 뺀다. */
export function attributionData({ fbc, fbp, touch, clientId } = {}) {
  const s = (v, n = 200) => (typeof v === 'string' && v ? v.slice(0, n) : undefined);
  const utm = touch?.utm || {};
  const out = {
    fbc: s(fbc), fbp: s(fbp), jid: s(touch?.jid, 40), cid: s(clientId, 64),
    utm_source: s(utm.source, 100), utm_medium: s(utm.medium, 100),
    utm_campaign: s(utm.campaign, 100), utm_content: s(utm.content, 100),
  };
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
  return out;
}
