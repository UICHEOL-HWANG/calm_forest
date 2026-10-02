// js/shop/price-ids.js
// =============================================================
//  calm forest · 💳 Paddle priceId 표 — 카탈로그 id → Paddle 대시보드의 Price id
//  ------------------------------------------------------------
//  ▶ **사용자가 대시보드 값을 붙여 넣는 유일한 곳.** null 이면 그 항목은 현금으로 못 산다
//    (가게가 현금 버튼을 안 그린다). 샌드박스와 라이브의 id 가 다르다 — 승인 후 전부 교체.
//  ▶ Price 는 항목마다 하나. 같은 값을 두 항목에 쓰면 웹훅의 price_id 로 아이템을 못 정한다
//    (tests/cash.test.mjs 가 유일성을 잠근다).
//  ▶ 2026-10-01 결정: 기존 꾸미기 18·펫 4 는 **코인 전용**(전부 null). 현금은 새 프리미엄 아이템에만 붙인다.
//    샌드박스에 만든 이 22개 상품은 Paddle 에 남아 있어 재사용 가능(scripts/paddle-seed.mjs 가 item_id 로 찾는다).
//  ▶ 라벨(₩2,500)은 여기 없다 — js/shop/cash.js 가 코인 등급으로 정한다(스펙 §2-2).
// =============================================================
export const PRICE_IDS = Object.freeze({
  // 🎩 머리
  beanie: null, cap: null, mushroom: null, straw_hat: null, flower_crown: null, leaf_band: null, star_pin: null,
  // 🧣 목
  scarf: null, bell: null, bowtie: null,
  // 🎒 등
  pack: null, basket: null, cape: null,
  // 💎 프리미엄(현금 전용, 2026-10-01 스펙) — scripts/paddle-seed.mjs 가 채운다
  firefly: 'pri_01m3x4q3sjhg1c19b0vsz55b80', rainbow: 'pri_01m3x4q4a0v0pv06yreaqe3dh7', forest_spirit: 'pri_01m3x4q4szrecdh3rwc5sya6zt', plush_doll: 'pri_01m3x4q5abzr8m2xvzqb93rfrn',
  // 🪓 도구 테마 세트(2026-10-02) — 라이브 키로 `PADDLE_ENV=production node scripts/paddle-seed.mjs --only tools_shroom` (세 번)
  tools_shroom: null, tools_moon: null, tools_bloom: null,
  // 👣 발자국
  paw: null, drop: null, flower: null, star: null, sparkle: null,
  // 🐾 펫
  leaf: null, spirit: null, bird: null, golem: null,
});
