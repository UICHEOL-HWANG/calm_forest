// js/shop/sale-window.js
// =============================================================
//  calm forest · 🎃 기간 한정 판매 창 — 순수(THREE/DOM 없음)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-06-halloween-premium-design.md §4-1
//  ▶ 카탈로그 항목은 sale: '<키>' 만 가진다. 날짜는 아래 표 한 곳 — 내년엔 이 표만 바꾼다.
//  ▶ 날짜는 KST 자정 기준 · 양끝 포함('to' 날 23:59:59 까지 열림). js/season.js 와 같이 날짜만 본다.
//  ▶ 이 판정은 **표시용**이다 — 결제 자체는 막지 못한다. 최종 차단 = 종료일에 Paddle Price 보관(Archive).
//    웹훅은 기간을 보지 않는다(결제 끝난 건 무조건 지급).
// =============================================================

export const SALE_WINDOWS = Object.freeze({
  halloween: Object.freeze({ from: '2026-10-24', to: '2026-11-02' }),
});

const DAY_MS = 86400000;
const KST_MS = 9 * 3600 * 1000;

/** 'YYYY-MM-DD'(KST) 자정 → 에포크 ms */
function kstMidnight(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return Date.UTC(y, m - 1, d) - KST_MS;
}

/** 지금 이 상품을 팔고 있나. sale 키가 없으면 늘 true, 모르는 키는 false(닫는 쪽으로 틀린다) */
export function saleOpen(item, now = Date.now()) {
  const key = item?.sale;
  if (!key) return true;
  const w = SALE_WINDOWS[key];
  if (!w) return false;
  return now >= kstMidnight(w.from) && now < kstMidnight(w.to) + DAY_MS;
}

/** 종료일 라벨 '11/2' — sale 이 없거나 모르는 키면 null */
export function saleEndLabel(item) {
  const w = SALE_WINDOWS[item?.sale];
  if (!w) return null;
  const [, m, d] = w.to.split('-').map(Number);
  return `${m}/${d}`;
}
