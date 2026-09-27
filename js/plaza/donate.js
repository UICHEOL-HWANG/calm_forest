// js/plaza/donate.js
// 🌾 plaza_donate 응답 → 차감량·🍂·트래킹 이벤트. 순수 함수(tests/plaza-donate.test.mjs)
import { donateMax } from './rules.js';
import { PLAZA_COPY, giveText } from './copy.js';

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

// 모달 품목 줄 버튼(게이트 C 확정): +5 · 'N개 보태기'. 활성 = donateMax(보유, 오늘 남은 수, 품목 남은 수) ≥ 수량
//   mine 이 없으면(비로그인·오프라인) 전부 꺼진다. busy 는 그리는 쪽(ui.js)이 따로 끈다
export function donateButtons(inv, mine, row) {
  const max = mine ? donateMax(inv?.[row.item] || 0, mine.today_left ?? 0, row.need - row.have) : 0;
  return [
    { label: PLAZA_COPY.buttons[1], qty: 5, on: max >= 5, cls: '' },
    { label: giveText(max), qty: max, on: max >= 1, cls: 'max' },
  ];
}
