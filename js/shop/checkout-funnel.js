// js/shop/checkout-funnel.js
// =============================================================
//  calm forest · 💳 결제창 안 퍼널 — Paddle.js 이벤트 → 단계 (순수 — THREE/DOM/네트워크 없음)
//  ------------------------------------------------------------
//  ▶ 결제창 밖(가게 줄 노출·입어보기·결제창 열기)은 cafe.js 가 GA4 로 이미 센다. 여기는 **결제창 안**에서
//    어디까지 갔다가 나갔는지를 단계로 바꾼다: 뜸 → 이메일 → 결제수단 → 결제 시도 → 완료(실패는 따로 셈).
//  ▶ 🔒 GA4 로 나가는 값은 단계·순위·경과·결제수단 **종류**·오류 **코드**뿐이다. Paddle 이벤트에는 이메일·국가·
//    고객 id·오류 문장(이메일이 섞일 수 있다)이 들어 있다 — 여기서 걸러 내고 절대 그대로 넘기지 않는다.
//  ▶ 상태는 매번 새 객체로 돌려준다(불변).
//  ▶ 테스트: tests/checkout-funnel.test.mjs
// =============================================================

/** 단계 사다리 — rank 가 곧 퍼널 깊이 */
export const STEPS = Object.freeze([
  Object.freeze({ id: 'loaded', rank: 1 }),             // 결제창이 떴다
  Object.freeze({ id: 'customer', rank: 2 }),           // 이메일(고객 정보)을 넣었다
  Object.freeze({ id: 'payment_selected', rank: 3 }),   // 결제수단을 골랐다
  Object.freeze({ id: 'payment_initiated', rank: 4 }),  // 결제를 눌렀다
  Object.freeze({ id: 'completed', rank: 5 }),          // 결제 완료
]);
const FAILED = Object.freeze({ id: 'payment_failed', rank: 4 });   // 결제 시도 단계에서 실패 — 최고 단계는 올리지 않는다

const BY_EVENT = Object.freeze({
  'checkout.loaded': STEPS[0],
  'checkout.customer.created': STEPS[1],
  'checkout.customer.updated': STEPS[1],
  'checkout.payment.selected': STEPS[2],
  'checkout.payment.initiated': STEPS[3],
  'checkout.payment.failed': FAILED,
  'checkout.completed': STEPS[4],
});

const rankOf = (id) => STEPS.find(s => s.id === id)?.rank ?? 0;

/** Paddle 이벤트 이름 → 단계(없으면 null — 할인·품목 변경 같은 이벤트는 퍼널이 아니다) */
export function stepOf(name) {
  return BY_EVENT[name] || null;
}

/** 결제창을 연 순간의 상태 */
export function startFunnel(nowMs) {
  return { openedAt: nowMs, last: null, max: null, failures: 0 };
}

/** 이벤트 하나를 반영한 새 상태. 퍼널 단계가 아니면 그대로 돌려준다 */
export function advance(state, name, nowMs) {
  const st = stepOf(name);
  if (!st) return state;
  const failed = st === FAILED;
  const max = !failed && st.rank > rankOf(state.max) ? st.id : state.max;
  return { ...state, last: st.id, max, failures: state.failures + (failed ? 1 : 0), at: nowMs };
}

const clean = (v, n = 40) => (typeof v === 'string' && /^[a-z0-9_.-]+$/i.test(v) ? v.slice(0, n) : undefined);

/** GA4 paddle_step 에 실을 값 — 단계 이벤트일 때만 의미가 있다 */
export function stepProps(ev, state) {
  const st = stepOf(ev?.name);
  const p = { step: st?.id || 'unknown', step_rank: st?.rank || 0, ms_since_open: Math.max(0, (state.at ?? state.openedAt) - state.openedAt) };
  const method = clean(ev?.data?.payment?.method_details?.type);
  if (method) p.method = method;
  const code = clean(ev?.error?.code);
  if (code) p.error_code = code;
  return p;
}

/** 결제창이 닫힐 때(완료 없이) GA4 cash_checkout_close 에 덧붙일 값 */
export function closeProps(state, nowMs) {
  return {
    last_step: state.last || 'none',
    max_step: state.max || 'none',
    max_rank: rankOf(state.max),
    payment_failures: state.failures,
    dwell_ms: Math.max(0, nowMs - state.openedAt),
  };
}
