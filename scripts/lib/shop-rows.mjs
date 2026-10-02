// scripts/lib/shop-rows.mjs — 💳 /shop 가격표의 줄 만들기 (순수 — 테스트 가능)
//  현금으로 파는 것(premium)만 싣는다. 코인 전용 아이템·펫은 현금으로 팔지 않으므로 원화 가격을 붙이지 않는다
//  (2026-10-01 상점 열기 — Paddle 심사 페이지에 "팔지 않는 가격"이 보이면 안 된다).

/** 칸 이름 — 게임 안 탭 이름과 같게 */
export const SLOT_KO = Object.freeze({ head: '🎩 머리', neck: '🧣 목', back: '🎒 가방', trail: '✨ 이펙트', skin: '🧥 스킨' });

const won = (n) => `₩${n.toLocaleString('ko-KR')}`;

/** 카탈로그 → 현금 상품 <tr> 배열(구분 · 아이템 · 가격) */
export function shopRows(items) {
  return items.filter(it => it.premium).map(it =>
    `    <tr><td>${SLOT_KO[it.slot]}</td><td>${it.ico} ${it.name}</td><td>${it.price.cash?.label ?? won(it.price.won)}</td></tr>`);
}
