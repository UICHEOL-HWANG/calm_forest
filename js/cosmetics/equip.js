// js/cosmetics/equip.js
// =============================================================
//  calm forest · 🎀 꾸미기 장착 규칙 (순수 함수 — THREE/DOM 의존 없음)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-21-cosmetics-pet-design.md §2·§12
//  ▶ 전부 **새 객체를 돌려준다**. 세이브 객체를 제자리에서 바꾸면 구매 실패·중복 저장을
//    되돌릴 수 없어 사고를 잡기 어렵다.
//  ▶ sanitize 가 있는 이유: 세이브는 클라이언트 권위다(§12-3). 낯선 id 가 들어와도
//    터지지 않아야 하고, **안 산 것이 장착돼 있으면 벗긴다**.
//  ▶ 테스트: npm test (tests/cosmetics-equip.test.mjs)
// =============================================================

import { SLOTS, findItem } from './catalog.js';

/** 빈 상태 — 신규 유저이자 sanitize 의 실패 기본값 */
export function emptyCosmetics() {
  return { owned: [], equipped: Object.fromEntries(SLOTS.map(s => [s, null])) };
}

/** { ok, why } — why 는 UI 가 문구를 고르는 데 쓴다 */
export function canBuy(cos, coins, id) {
  const it = findItem(id);
  if (!it) return { ok: false, why: 'unknown' };
  if (cos.owned.includes(id)) return { ok: false, why: 'owned' };
  if ((coins | 0) < it.price.coins) return { ok: false, why: 'poor' };
  return { ok: true, why: '' };
}

/** { cos, coins, bought } — 못 사면 입력을 그대로 돌려준다 */
export function buy(cos, coins, id) {
  if (!canBuy(cos, coins, id).ok) return { cos, coins, bought: false };
  const it = findItem(id);
  return {
    cos: { owned: [...cos.owned, id], equipped: { ...cos.equipped } },
    coins: coins - it.price.coins,
    bought: true,
  };
}

/** 보유한 것만 장착된다. 같은 슬롯이면 갈아끼운다 */
export function equip(cos, id) {
  const it = findItem(id);
  if (!it || !cos.owned.includes(id)) return cos;
  return { owned: [...cos.owned], equipped: { ...cos.equipped, [it.slot]: id } };
}

export function unequip(cos, slot) {
  if (!SLOTS.includes(slot)) return cos;
  return { owned: [...cos.owned], equipped: { ...cos.equipped, [slot]: null } };
}

/** 장착한 품목 객체들 — 렌더가 이걸 받아 그린다 */
export function equippedItems(cos) {
  return SLOTS.map(s => findItem(cos?.equipped?.[s])).filter(Boolean);
}

/** 세이브에서 읽은 값 → 믿을 수 있는 상태 */
export function sanitize(raw) {
  const out = emptyCosmetics();
  if (!raw || typeof raw !== 'object') return out;
  const owned = Array.isArray(raw.owned) ? raw.owned : [];
  out.owned = [...new Set(owned.filter(id => typeof id === 'string' && findItem(id)))];
  const eq = (raw.equipped && typeof raw.equipped === 'object') ? raw.equipped : {};
  for (const s of SLOTS) {
    const it = findItem(eq[s]);
    out.equipped[s] = (it && it.slot === s && out.owned.includes(it.id)) ? it.id : null;
  }
  return out;
}
