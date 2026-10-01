// js/shop/premium-row.js
// =============================================================
//  calm forest · 💎 프리미엄(현금 전용) 행을 어떻게 그릴지 — 순수 함수
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-01-premium-trails-design.md §2-3
//  ▶ 토스·안드로이드·itch 는 행 자체를 숨긴다 — 외부 결제 안내 금지(플레이·토스 정책).
//    웹에서 산 건 옷장(보유품만 보임)에서 모든 플랫폼이 장착한다.
// =============================================================

/** @returns {'owned'|'buy'|'login'|'unavailable'|'hidden'} */
export function premiumRowMode(item, { owned, platform, online, isGuest, tokenSet, storeOpen }) {
  if (owned) return 'owned';
  if (platform !== 'web') return 'hidden';
  if (isGuest) return 'login';
  if (!online || !tokenSet || !storeOpen || !item.price.cash) return 'unavailable';
  return 'buy';
}
