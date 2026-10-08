// js/shop/premium-row.js
// =============================================================
//  calm forest · 💎 프리미엄(현금 전용) 행을 어떻게 그릴지 — 순수 함수
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-01-premium-trails-design.md §2-3
//  ▶ 토스·안드로이드·itch 는 행 자체를 숨긴다 — 외부 결제 안내 금지(플레이·토스 정책).
//    웹에서 산 건 옷장(보유품만 보임)에서 모든 플랫폼이 장착한다.
// =============================================================
import { saleOpen } from './sale-window.js';

/** @returns {'owned'|'buy'|'login'|'unavailable'|'hidden'} */
export function premiumRowMode(item, { owned, platform, online, isGuest, tokenSet, storeOpen, now }) {
  if (owned) return 'owned';
  if (item.reward) return 'hidden';            // 🤝 친구 초대 보상 — 팔지 않는다. 받은 사람만 보유로 본다
  if (platform !== 'web') return 'hidden';
  if (!saleOpen(item, now)) return 'hidden';   // 🎃 기간 한정 — 기간 밖이면 안 산 사람에겐 행 자체가 없다(승인 전 배포도 안전)
  if (!tokenSet || !storeOpen || !item.price.cash) return 'unavailable';   // 상점이 닫혔으면 게스트에게도 "로그인하면" 이라 하지 않는다
  if (isGuest) return 'login';
  if (!online) return 'unavailable';
  return 'buy';
}

/** 이 행은 premiumRowMode 로 거르는가 — 💎 현금 상품과 🤝 초대 보상(받은 사람에게만 보인다) */
export const gatedRow = (it) => !!(it.premium || it.reward);

/** 가게 탭을 보일까 — 그 칸이 전부 hidden(웹 밖 + 안 산 프리미엄 · 안 받은 보상)이면 빈 탭이 되므로 숨긴다 */
export function slotVisible(items, ctxOf) {
  return items.some(it => !gatedRow(it) || premiumRowMode(it, ctxOf(it)) !== 'hidden');
}
