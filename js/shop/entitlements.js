// =============================================================
//  calm forest · 💳 원장 → 소유 병합 (순수 — THREE/DOM/네트워크 없음)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-30-paddle-checkout-design.md §6
//  ▶ 원장(purchases)이 진실, 세이브의 cashOwned 는 "마지막으로 본 유효 항목" 사본이다.
//    원장에 새로 생긴 것 → 지급, 원장에 **revoked_at 이 찍힌 행이 있고 살아 있는 행은 없는** 것 → 환불로 보고 회수.
//  ▶ ⚠️ 원장에 흔적이 아예 없는 항목은 회수하지 않는다 — 세션 흔들림 등으로 RLS 가 빈 배열을 돌려줘도
//    성공한 읽기로 보이는데, 그걸 "환불"로 읽으면 산 아이템과 펫 성장(works)을 통째로 잃는다.
//    환불 뒤 재구매(같은 id 에 revoked 행 + 새 live 행)는 live 가 이긴다.
//  ▶ 코인 구매와 현금 구매의 구분은 cashOwned 뿐이다. 같은 항목을 둘 다로 사는 경로는 UI 가 막는다('구매 완료').
//  ▶ rows 가 null(못 읽음)이면 patch 도 null — 세이브대로 간다(다음 부팅에 다시 맞춘다).
//  ▶ 🤝 kind 'decor' = 친구 초대 보상 야외 장식(OUTDOOR reward). 지급 → 🧺 보관함 1개(이미 마당·보관함에 있으면 그대로),
//    회수 → 마당·보관함에서 뺀다(마당 메시는 다음 부팅에 맞춰진다 — 서버 가드도 저장 때 뺀다).
//    초대 보상은 회수 흐름이 없다(환불 없음) — 메시가 남는 틈은 수용.
//  ▶ 테스트: tests/entitlements.test.mjs · tests/referral-items.test.mjs
// =============================================================
import { findItem, SLOTS } from '../cosmetics/catalog.js';
import { petKindOf, emptyPet } from '../pet/rules.js';
import { isRewardDecor } from '../data/reward-decor.js';

const kindOf = (id) => (findItem(id) ? 'cosmetic' : petKindOf(id) ? 'pet' : isRewardDecor(id) ? 'decor' : null);

export function applyPurchases(gs, rows) {
  if (!Array.isArray(rows)) return { patch: null, granted: [], revoked: [] };
  const live = [...new Set(rows.filter(r => r && !r.revoked_at && typeof r.item_id === 'string').map(r => r.item_id))].filter(kindOf);
  const prev = Array.isArray(gs.cashOwned) ? gs.cashOwned : [];
  const fresh = live.filter(id => !prev.includes(id));
  const revokedIds = [...new Set(rows.filter(r => r && r.revoked_at && typeof r.item_id === 'string').map(r => r.item_id))].filter(id => !live.includes(id));
  const gone = prev.filter(id => revokedIds.includes(id));       // 환불됨 — 흔적 없이 사라진 것은 여기 안 들어온다

  const cosmetics = { owned: [...gs.cosmetics.owned], equipped: { ...gs.cosmetics.equipped } };
  const pets = { ...gs.pets };
  let pet = gs.pet;
  let outdoor = Array.isArray(gs.outdoor) ? [...gs.outdoor] : [];
  let outdoorStored = { ...(gs.outdoorStored || {}) };
  const granted = [], revoked = [];

  for (const id of fresh) {
    const kind = kindOf(id);
    if (kind === 'cosmetic') { if (!cosmetics.owned.includes(id)) cosmetics.owned.push(id); }
    else if (kind === 'decor') {
      if (!outdoor.some(o => o?.id === id) && !(outdoorStored[id] > 0)) outdoorStored = { ...outdoorStored, [id]: 1 };
    }
    else if (!pets[id]) pets[id] = emptyPet(id);          // 이미 있으면 works 를 지우지 않는다
    granted.push({ item_id: id, kind });
  }
  for (const id of gone) {
    const kind = kindOf(id);
    if (!kind) continue;
    if (kind === 'cosmetic') {
      cosmetics.owned = cosmetics.owned.filter(x => x !== id);
      for (const s of SLOTS) if (cosmetics.equipped[s] === id) cosmetics.equipped[s] = null;
    } else if (kind === 'decor') {
      outdoor = outdoor.filter(o => o?.id !== id);
      const { [id]: _drop, ...rest } = outdoorStored;
      outdoorStored = rest;
    } else {
      delete pets[id];
      if (pet?.kind === id) pet = null;
    }
    revoked.push({ item_id: id, kind });
  }
  //  outdoor·outdoorStored 는 장식이 오갔을 때만 싣는다 — 실으면 Object.assign 이 배열을 통째로 바꿔 끼운다
  const decorTouched = [...granted, ...revoked].some(g => g.kind === 'decor');
  return { patch: { cosmetics, pets, pet, ...(decorTouched ? { outdoor, outdoorStored } : {}), cashOwned: [...prev.filter(id => !gone.includes(id)), ...fresh] }, granted, revoked };
}
