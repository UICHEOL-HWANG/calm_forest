// =============================================================
//  calm forest · 코인 첫 루프 규칙 (순수 함수 — DOM/Three 의존 없음)
//  ------------------------------------------------------------
//  ▶ 상인 환영 거래 제안 · dev 세션 판정 · 좌판 시세 말풍선 · 비료/물주기 우선순위
//  ▶ 테스트: npm test   (docs/superpowers/specs/2026-09-05-coin-first-loop-design.md)
// =============================================================

// 환영 거래(1회 한정, 정가 약 3배) — 목재 5개=30🪙 우선, 없으면 물고기 1마리=25🪙
export const WELCOME_OFFERS = [
  { item: 'wood', qty: 5, gain: 30 },
  { item: 'fish', qty: 1, gain: 25 },
];
// 🔓 마을 해금(새 세이브)에선 첫 수확으로도 상인이 돌아온다 — 상인이 와야 좌판이 서는데, E1 처치는 🥕 당근부터 거둔다.
//   당근 4개 = E1 처치 밭 2×2 그대로. 정가 5🪙×4=20🪙 → 25🪙(물고기와 같은 값 — 3배를 주면 경제 가드레일을 넘는다)
export const WELCOME_CROP = { item: 'crop', qty: 4, gain: 25 };
/** reworld: 해금 켜짐 + 새 세이브(js/story/rules.js storyReworld). 아니면 예전 그대로 목재·물고기만 */
export function welcomeOffer(inv = {}, { reworld = false } = {}) {
  const list = reworld ? [...WELCOME_OFFERS, WELCOME_CROP] : WELCOME_OFFERS;
  return list.find(o => (inv[o.item] || 0) >= o.qty) || null;
}

// 개발용 URL 파라미터가 하나라도 있으면 "dev 세션" — 원장·세션·센서·GA4 기록을 남기지 않는다
export const DEV_PARAMS = ['house', 'coop', 'weather', 'spawn', 'sea', 'river', 'mist', 'time', 'severe', 'severe2', 'rain', 'dbg', 'seadebug', 'give', 'betaDay', 'forceMapOrder', 'owl', 'repeat', 'farmstage', 'farmmax', 'plaza', 'plazaSeason', 'season', 'e1', 'unlocks', 'hw'];   // unlocks — 🔓 ?unlocks=on|off 마을 해금 검증(localhost)
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
