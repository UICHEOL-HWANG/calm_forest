// scripts/lib/shop-rows.mjs — 💳 /shop 가격표의 줄 만들기 (순수 — 테스트 가능)
//  현금 전용 프리미엄(coins == null)은 코인 칸에 '현금 전용', 현금 칸은 원화 표시가.

/** 칸 이름 — 게임 안 탭 이름과 같게 */
export const SLOT_KO = Object.freeze({ head: '🎩 머리', neck: '🧣 목', back: '🎒 가방', trail: '✨ 이펙트', skin: '🧥 스킨' });

const row = (grp, name, coinsText, cashText) =>
  `    <tr><td>${grp}</td><td>${name}</td><td>${coinsText}</td><td>${cashText}</td></tr>`;

/** 카탈로그 아이템 → <tr> 문자열 배열. cashLabel(coins) 는 코인 등급 → 현금 표시가 */
export function shopRows(items, _petRows, { cashLabel }) {
  return items.map(it => {
    const coinsText = it.price.coins == null ? '현금 전용' : `${it.price.coins.toLocaleString('ko-KR')}🪙`;
    const cashText = it.price.cash?.label
      ?? (it.price.coins == null ? `₩${it.price.won.toLocaleString('ko-KR')}` : cashLabel(it.price.coins));
    return row(SLOT_KO[it.slot], `${it.ico} ${it.name}`, coinsText, cashText);
  });
}

/** 펫 줄 — petKinds: [{ ico, name, cash? }], 코인가·기본 현금 라벨은 호출자가 넘긴다 */
export function petShopRows(petKinds, petPrice, petCashLabel) {
  return petKinds.map(k => row('🐾 펫', `${k.ico} ${k.name}`, `${petPrice.toLocaleString('ko-KR')}🪙`, k.cash?.label ?? petCashLabel));
}
