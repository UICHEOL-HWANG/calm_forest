// js/cosmetics/wardrobe.js
// =============================================================
//  calm forest · 🧥 옷장 규칙 (순수 함수 — THREE/DOM 의존 없음)
//  ------------------------------------------------------------
//  ▶ 입고 벗기는 곳은 **☰ 🐾 캐릭터·꾸미기 › 옷장** 이다(2026-09-29). 가게는 사고 입어보기만 한다 —
//    이펙트를 여러 개 사 두면 갈아입으러 매번 가게까지 걸어가야 했다.
//  ▶ 테스트: npm test (tests/cosmetics-wardrobe.test.mjs)
// =============================================================

import { itemsOf, findItem } from './catalog.js';
import { equip, unequip } from './equip.js';

/** 그 칸에서 산 것만 — 카탈로그 순서(가게와 같은 순서) */
export function ownedIn(cos, slot) {
  const owned = Array.isArray(cos?.owned) ? cos.owned : [];
  return itemsOf(slot).filter(it => owned.includes(it.id));
}

/** 옷장 칸을 누르면 — 입은 거면 벗고, 아니면 입는다. action: 'on' | 'off' | null(안 바뀜) */
export function toggleWear(cos, id) {
  const it = findItem(id);
  if (!it || !cos.owned.includes(id)) return { cos, action: null };
  if (cos.equipped[it.slot] === id) return { cos: unequip(cos, it.slot), action: 'off' };
  return { cos: equip(cos, id), action: 'on' };
}

/** 🎀 가게 줄 끝 버튼 — 산 건 다시 못 산다. 입기·벗기는 옷장에서 */
export function shopButton(it, cos) {
  if (cos.owned.includes(it.id)) return { label: '구매 완료', disabled: true };
  return { label: `${it.price.coins.toLocaleString()}🪙`, disabled: false };
}
