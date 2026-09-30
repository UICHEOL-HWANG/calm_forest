// =============================================================
//  calm forest · 💳 원장 → 소유 병합 (순수 — THREE/DOM/네트워크 없음)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-30-paddle-checkout-design.md §6
//  ▶ 원장(purchases)이 진실, 세이브의 cashOwned 는 "마지막으로 본 유효 항목" 사본이다.
//    원장에 새로 생긴 것 → 지급, 사본에는 있는데 원장에서 사라진 것 → 환불로 보고 회수.
//  ▶ 코인 구매와 현금 구매의 구분은 cashOwned 뿐이다. 같은 항목을 둘 다로 사는 경로는 UI 가 막는다('구매 완료').
//  ▶ rows 가 null(못 읽음)이면 patch 도 null — 세이브대로 간다(다음 부팅에 다시 맞춘다).
//  ▶ 테스트: tests/entitlements.test.mjs
// =============================================================
import { findItem, SLOTS } from '../cosmetics/catalog.js';
import { petKindOf, emptyPet } from '../pet/rules.js';

const kindOf = (id) => (findItem(id) ? 'cosmetic' : petKindOf(id) ? 'pet' : null);

export function applyPurchases(gs, rows) {
  if (!Array.isArray(rows)) return { patch: null, granted: [], revoked: [] };
  const live = [...new Set(rows.filter(r => r && !r.revoked_at && typeof r.item_id === 'string').map(r => r.item_id))].filter(kindOf);
  const prev = Array.isArray(gs.cashOwned) ? gs.cashOwned : [];
  const fresh = live.filter(id => !prev.includes(id));
  const gone = prev.filter(id => !live.includes(id));

  const cosmetics = { owned: [...gs.cosmetics.owned], equipped: { ...gs.cosmetics.equipped } };
  const pets = { ...gs.pets };
  let pet = gs.pet;
  const granted = [], revoked = [];

  for (const id of fresh) {
    const kind = kindOf(id);
    if (kind === 'cosmetic') { if (!cosmetics.owned.includes(id)) cosmetics.owned.push(id); }
    else if (!pets[id]) pets[id] = emptyPet(id);          // 이미 있으면 works 를 지우지 않는다
    granted.push({ item_id: id, kind });
  }
  for (const id of gone) {
    const kind = kindOf(id);
    if (!kind) continue;
    if (kind === 'cosmetic') {
      cosmetics.owned = cosmetics.owned.filter(x => x !== id);
      for (const s of SLOTS) if (cosmetics.equipped[s] === id) cosmetics.equipped[s] = null;
    } else {
      delete pets[id];
      if (pet?.kind === id) pet = null;
    }
    revoked.push({ item_id: id, kind });
  }
  return { patch: { cosmetics, pets, pet, cashOwned: live }, granted, revoked };
}
