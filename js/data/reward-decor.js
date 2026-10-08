// js/data/reward-decor.js
// =============================================================
//  calm forest · 🤝 보상 야외 장식 (순수 데이터 — THREE 없음)
//  ------------------------------------------------------------
//  ▶ js/data/catalog.js 의 OUTDOOR 가 이 배열을 펼쳐 넣는다. 원장 → 소유(js/shop/entitlements.js)는
//    THREE 를 끌고 오는 data/catalog.js 대신 여기만 읽는다(순수 모듈 유지).
//  ▶ 작업대 비판매(hidden) — 원장(purchases kind='decor')이 🧺 보관함에 넣어 준다.
//  ▶ 서버 가드 목록 _reward_decor_ids()(sql/migrations/migrate_referrals.sql)와 같아야 한다 — tests/referral-items.test.mjs
// =============================================================

export const REWARD_DECOR = Object.freeze([
  Object.freeze({ id: 'friendarch', name: '무지개 우정 아치', ico: '🌈', cost: { leaf: 9999 }, desc: '친구 3명 초대 보상 — 하트 등불이 둥실', hidden: true, reward: 'referral' }),
]);

export const isRewardDecor = (id) => REWARD_DECOR.some(d => d.id === id);
