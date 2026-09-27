// js/plaza/donate.js
// 🌾 plaza_donate 응답 → 차감량·🍂·트래킹 이벤트. 순수 함수(tests/plaza-donate.test.mjs)
const RULE_REJECT = new Set(['cap', 'need', 'full']);

export function interpretDonate(requested, r) {
  if (!r || typeof r !== 'object') r = { ok: false, reason: 'offline' };
  if (r.ok) {
    const accepted = Math.max(0, r.accepted | 0);
    const reason = accepted >= requested ? 'ok' : (r.today_left | 0) === 0 ? 'cap' : 'need';
    return { event: 'plaza_donate', spend: accepted, leaf: accepted, toastKey: 'ok',
      params: { stage: r.stage, requested, accepted, reason, today_left: r.today_left, my_total: r.my_total } };
  }
  const reason = String(r.reason || 'offline');
  if (RULE_REJECT.has(reason)) {
    return { event: 'plaza_donate', spend: 0, leaf: 0, toastKey: reason,
      params: { stage: r.stage ?? null, requested, accepted: 0, reason, today_left: r.today_left ?? null, my_total: null } };
  }
  return { event: 'plaza_donate_fail', spend: 0, leaf: 0, toastKey: reason, params: { reason } };
}
