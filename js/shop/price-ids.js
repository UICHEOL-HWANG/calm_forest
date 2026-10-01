// js/shop/price-ids.js
// =============================================================
//  calm forest · 💳 Paddle priceId 표 — 카탈로그 id → Paddle 대시보드의 Price id
//  ------------------------------------------------------------
//  ▶ **사용자가 대시보드 값을 붙여 넣는 유일한 곳.** null 이면 그 항목은 현금으로 못 산다
//    (가게가 현금 버튼을 안 그린다). 샌드박스와 라이브의 id 가 다르다 — 승인 후 전부 교체.
//  ▶ Price 는 항목마다 하나. 같은 값을 두 항목에 쓰면 웹훅의 price_id 로 아이템을 못 정한다
//    (tests/cash.test.mjs 가 유일성을 잠근다).
//  ▶ 라벨(₩2,500)은 여기 없다 — js/shop/cash.js 가 코인 등급으로 정한다(스펙 §2-2).
// =============================================================
export const PRICE_IDS = Object.freeze({
  // 🎩 머리
  beanie: 'pri_01m3tmg83ew6a9gdyhqxq5ecf9', cap: 'pri_01m3tmg8m9g5xpv5svxxp3dm1f', mushroom: 'pri_01m3tmg97fm7xvdnfcxqqc5t07', straw_hat: 'pri_01m3tkeb0t899g7jz1j8e3h36s', flower_crown: 'pri_01m3tmg9qxf3twq3x44w1pvmbb', leaf_band: 'pri_01m3tmga8qk4amkcps94t66fm8', star_pin: 'pri_01m3tmgas1pv6bpsgq1fyct8sk',
  // 🧣 목
  scarf: 'pri_01m3tmgb8p4xqtjfbexvsr9td1', bell: 'pri_01m3tmgbsafv9kqpaxcwmxkfv2', bowtie: 'pri_01m3tmgcb3662cahcgw2t8tgvs',
  // 🎒 등
  pack: 'pri_01m3tmgcvgen4209jbp01q772v', basket: 'pri_01m3tmge0teh3fay6xq6a5nqpy', cape: 'pri_01m3tmgehcrheb6j5djwgkds1g',
  // 👣 발자국
  paw: 'pri_01m3tmgf2kq7x612ewn3kwjedf', drop: 'pri_01m3tmgfjy4g0ak58zjbfxywga', flower: 'pri_01m3tmgg38qh6av1ckewydaf9y', star: 'pri_01m3tmggmefrekr6p2st1ee7cz', sparkle: 'pri_01m3tmgh528hx6vrk0fj255fm7',
  // 🐾 펫
  leaf: 'pri_01m3tmghnh87mycmrzp4acg5bv', spirit: 'pri_01m3tmgj6fz0t5bm7gs2m2fxxb', bird: 'pri_01m3tmgjp7vaqhcmsxskxka5z4', golem: 'pri_01m3tmgk67fgtabnmz5aeafd9x',
});
