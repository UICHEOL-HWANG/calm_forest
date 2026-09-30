// js/shop/cash.js
// =============================================================
//  calm forest · 💳 현금 가격표 규칙 (순수 — THREE/DOM 없음)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-30-paddle-checkout-design.md §2
//  ▶ 라벨은 코인 등급이 정한다. 대시보드 가격을 바꾸면 여기 표도 같이 고친다 — 라벨은 표시일 뿐
//    실제 청구액은 Paddle 이 정한다(통화·세금 포함).
//  ▶ priceId 는 js/shop/price-ids.js. null 이면 cash 도 null.
// =============================================================
import { PRICE_IDS } from './price-ids.js';

/** [코인 상한, 라벨] — 오름차순. 마지막 칸이 나머지 전부 */
export const CASH_TIERS = Object.freeze([[900, '₩1,500'], [1800, '₩2,500'], [Infinity, '₩3,900']]);
export const PET_CASH_LABEL = '₩4,900';

export function cashLabel(coins) {
  for (const [max, label] of CASH_TIERS) if (coins <= max) return label;
  return CASH_TIERS[CASH_TIERS.length - 1][1];
}

/** id 의 현금 칸. coins 가 null 이면 펫(고정 라벨) */
export function cashFor(id, coins) {
  const priceId = PRICE_IDS[id];
  if (!priceId) return null;
  return { priceId, label: coins == null ? PET_CASH_LABEL : cashLabel(coins) };
}
