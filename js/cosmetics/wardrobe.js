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

/** 🧥 옷장 칸 탭을 보일지 — 웹이 아닌 곳(토스·안드로이드·itch)은 외부 결제가 막혀 가게가 스킨·도구 세트를 숨긴다.
 *  거기서 산 게 없으면 '가게에서 살 수 있어요' 빈 안내가 거짓이 되므로 스킨 탭 자체를 감춘다. 순수 함수. */
export function wardrobeTabVisible(slot, cos, platform) {
  if ((slot !== 'skin' && slot !== 'tools') || platform === 'web') return true;   // 💎 현금 전용 칸만(스킨·도구 세트)
  return ownedIn(cos, slot).length > 0;
}

/** 옷장 칸을 누르면 — 입은 거면 벗고, 아니면 입는다. action: 'on' | 'off' | null(안 바뀜) */
export function toggleWear(cos, id) {
  const it = findItem(id);
  if (!it || !cos.owned.includes(id)) return { cos, action: null };
  if (cos.equipped[it.slot] === id) return { cos: unequip(cos, it.slot), action: 'off' };
  return { cos: equip(cos, id), action: 'on' };
}

/** 🎀 가게 줄 끝 버튼 — 산 건 다시 못 산다. 입기·벗기는 옷장에서. 💎 현금 전용이면 코인 버튼이 없다(null) */
export function shopButton(it, cos) {
  if (it.price.coins == null) return null;
  if (cos.owned.includes(it.id)) return { label: '구매 완료', disabled: true };
  return { label: `${it.price.coins.toLocaleString()}🪙`, disabled: false };
}
