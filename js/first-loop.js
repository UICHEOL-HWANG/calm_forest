// =============================================================
//  calm forest · 코인 첫 루프 규칙 (순수 함수 — DOM/Three 의존 없음)
//  ------------------------------------------------------------
//  ▶ 상인 환영 거래 제안 · dev 세션 판정 · 좌판 시세 말풍선 · 비료/물주기 우선순위
//  ▶ 테스트: node --test tests/   (docs/superpowers/specs/2026-09-05-coin-first-loop-design.md)
// =============================================================

// 환영 거래(1회 한정, 정가 약 3배) — 목재 5개=30🪙 우선, 없으면 물고기 1마리=25🪙
export const WELCOME_OFFERS = [
  { item: 'wood', qty: 5, gain: 30 },
  { item: 'fish', qty: 1, gain: 25 },
];
export function welcomeOffer(inv = {}) {
  return WELCOME_OFFERS.find(o => (inv[o.item] || 0) >= o.qty) || null;
}

// 개발용 URL 파라미터가 하나라도 있으면 "dev 세션" — 원장·세션·센서·GA4 기록을 남기지 않는다
export const DEV_PARAMS = ['house', 'coop', 'weather', 'spawn'];
export function isDevSession(search = '') {
  const q = new URLSearchParams(search);
  return DEV_PARAMS.some(k => q.has(k));
}

// 오늘 시세 최고 품목 → 좌판 말풍선 문구. rates: {key: %}(100=기본가), icons: {key: 이모지}
export function topPriceLine(rates, icons) {
  const keys = Object.keys(rates);
  const key = keys.reduce((a, b) => (rates[a] >= rates[b] ? a : b));
  const pct = Math.max(0, rates[key] - 100);
  return { key, pct, text: `${icons[key]} 오늘 비싸요 +${pct}%` };
}

// 💧물조리개를 들고 흙이 말라 있으면 비료보다 물주기가 우선(평소 물주기 동선을 뺏지 않는다)
export function fertBlockedByWatering(toolId, toolPage, soilWet) {
  return toolPage !== 'none' && toolId === 'water' && !soilWet;
}
