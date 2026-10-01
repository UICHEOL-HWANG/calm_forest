// js/shop/purchases.js
// =============================================================
//  calm forest · 💳 원장 동기화 글루 — fetch → applyPurchases → 게임 반영
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-30-paddle-checkout-design.md §6-3
//  ▶ game.js 를 import 하지 않는다. 화면 반영은 hooks 로 받는다(테스트 가능 · 순환 import 없음).
//  ▶ 호출 시점: ① 부팅(enterGame, applySave 뒤) via:'boot' ② 결제 직후 awaitGrant via:'instant'.
//  ▶ 문구 2건(GRANT_MSG·LATER_MSG)은 사용자 검수를 거친 값이다(Task 9) — 바꾸려면 다시 검수.
// =============================================================
import { applyPurchases } from './entitlements.js';

export const GRANT_MSG = '🎁 산 아이템이 도착했어요';
export const LATER_MSG = '잠시 후 다시 들어오면 도착해 있어요';

export async function syncPurchases({ gameState, fetchPurchases, hooks, via }) {
  const rows = await fetchPurchases();
  const { patch, granted, revoked } = applyPurchases(gameState, rows);
  if (!patch) return null;
  if (!granted.length && !revoked.length) return { granted, revoked };
  Object.assign(gameState, patch);                        // gameState 는 game.js 의 단일 객체 — 참조를 바꾸지 않고 필드만
  if (granted.some(g => g.kind === 'cosmetic') || revoked.some(g => g.kind === 'cosmetic')) hooks.applyCosmetics(gameState.cosmetics);
  if (granted.some(g => g.kind === 'pet') || revoked.some(g => g.kind === 'pet')) hooks.refreshPet();
  for (const g of granted) hooks.track('cash_grant', { item_id: g.item_id, kind: g.kind, via });
  for (const g of revoked) hooks.track('cash_revoke', { item_id: g.item_id, kind: g.kind });
  if (granted.length) hooks.toast(GRANT_MSG);
  hooks.requestSave();
  return { granted, revoked };
}

/** 결제 직후 — 원장에 itemId 가 보일 때까지 폴링. 보이면 true. 안 오면 false(호출부가 LATER_MSG 안내) */
export async function awaitGrant({ itemId, tries = 10, delayMs = 1000, sleep = (ms) => new Promise(r => setTimeout(r, ms)), ...args }) {
  for (let i = 0; i < tries; i++) {
    const r = await syncPurchases({ ...args, via: 'instant' });
    if (r?.granted.some(g => g.item_id === itemId)) return true;
    if (args.gameState.cashOwned?.includes(itemId)) return true;   // 이전 폴링에서 이미 들어온 경우
    await sleep(delayMs);
  }
  return false;
}
