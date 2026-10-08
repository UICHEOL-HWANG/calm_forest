// js/cosmetics/catalog.js
// =============================================================
//  calm forest · 🎀 꾸미기 카탈로그 (순수 데이터 — THREE/DOM 의존 없음)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-21-cosmetics-pet-design.md §4
//  ▶ price.cash 는 js/shop/cash.js 가 채운다 — priceId(js/shop/price-ids.js)가 있는 항목만 { priceId, label }.
//    null 이면 UI 는 현금 버튼을 안 그린다. 라벨은 코인 등급표(스펙 2026-09-30 §2-2).
//  ▶ won 이 있으면 💎 프리미엄(현금 전용) — price.coins 는 null, 라벨은 won 그대로(₩4,000).
//  ▶ reward: 'referral' 은 🤝 친구 초대 보상 — 팔지 않는다(가격 전부 null). premium 이 **아니다**
//    (premium = 현금 판매 상품: Paddle 등록·가격 페이지·priceId 표가 이걸로 고른다). 지급은 원장(source='referral'),
//    서버 보안 가드(_premium_cosmetic_ids)는 premium + reward 둘 다 지킨다 — tests/security-hardening.test.mjs
//  ▶ sale: 'halloween' 같은 한정 판매 키 — 기간·노출 규칙은 js/shop/sale-window.js (스펙 2026-10-06).
//  ▶ earSafe: 머리 장식이 귀를 어떻게 다루는가(§3-3)
//      'low'  위가 트여 귀가 지나간다 · 'dome' 머리를 덮되 테두리가 귀 밑동보다 위
//  ▶ anchor: 슬롯 안에서 **붙을 면**을 아이템이 고른다. 가방류는 옆구리(side),
//    망토만 등(back) — 등 한가운데는 🦊여우 꼬리 자리다.
//  ▶ 테스트: npm test (tests/cosmetics-catalog.test.mjs) — 가격·수량을 여기 못박는다.
// =============================================================

import { cashFor } from '../shop/cash.js';

export const SLOTS = Object.freeze(['head', 'neck', 'back', 'trail', 'skin', 'tools']);

const RAW = [
  // 🎩 머리 — dome 4 · low 3
  { id: 'beanie',       slot: 'head', ico: '🧶', name: '털모자',        coins: 1600, earSafe: 'dome' },
  { id: 'cap',          slot: 'head', ico: '🧢', name: '캡',            coins: 1500, earSafe: 'dome' },
  { id: 'mushroom',     slot: 'head', ico: '🍄', name: '버섯 모자',     coins: 1800, earSafe: 'dome' },
  { id: 'straw_hat',    slot: 'head', ico: '👒', name: '밀짚모자',      coins: 1200, earSafe: 'dome' },
  { id: 'flower_crown', slot: 'head', ico: '💐', name: '화관',          coins: 1400, earSafe: 'low'  },
  { id: 'leaf_band',    slot: 'head', ico: '🍃', name: '나뭇잎 머리띠', coins: 800,  earSafe: 'low'  },
  { id: 'star_pin',     slot: 'head', ico: '⭐', name: '별 머리핀',     coins: 600,  earSafe: 'low'  },
  // 🧣 목
  { id: 'scarf',  slot: 'neck', ico: '🧣', name: '목도리',      coins: 900 },
  { id: 'bell',   slot: 'neck', ico: '🔔', name: '방울 목걸이', coins: 700 },
  { id: 'bowtie', slot: 'neck', ico: '🎀', name: '나비 넥타이', coins: 850 },
  // 🎒 가방 — 가방류는 옆구리, 망토만 등
  { id: 'pack',   slot: 'back', ico: '🎒', name: '메신저 가방', coins: 1500, anchor: 'side' },
  { id: 'basket', slot: 'back', ico: '🧺', name: '바구니',      coins: 1200, anchor: 'side' },
  { id: 'cape',   slot: 'back', ico: '🦸', name: '망토',        coins: 1800, anchor: 'back' },
  // 💎 프리미엄 — 현금 전용(won). 코인으로 못 산다(2026-10-01 스펙 §2)
  { id: 'firefly', slot: 'trail', ico: '🌟', name: '반딧불', won: 4000, tier: '프리미엄' },
  { id: 'rainbow', slot: 'trail', ico: '🌈', name: '무지개', won: 3000, tier: '프리미엄' },
  // 🎃 할로윈 한정 자국 — sale 이 있으면 js/shop/sale-window.js 의 기간에만 안 산 사람에게 보인다(스펙 2026-10-06)
  { id: 'pumpkin_glow', slot: 'trail', ico: '🎃', name: '꼬마 호박등', won: 4000, tier: '프리미엄', sale: 'halloween' },
  { id: 'bat_swirl',    slot: 'trail', ico: '🦇', name: '박쥐 회오리', won: 4000, tier: '프리미엄', sale: 'halloween' },
  // 🧥 전신 스킨 — 현금 전용(2026-10-01 2단계 스펙). 동물 체형은 그대로, 재질·장식만 바뀐다(js/cosmetics/skin.js)
  { id: 'forest_spirit', slot: 'skin', ico: '🌿', name: '숲의 정령',   won: 10000, tier: '프리미엄' },
  { id: 'plush_doll',    slot: 'skin', ico: '🧸', name: '플러시 인형', won: 9000,  tier: '프리미엄' },
  // 🎃 할로윈 한정 전신 스킨 4종
  { id: 'ghost_nightcap', slot: 'skin', ico: '👻', name: '나이트캡 유령',  won: 4900, tier: '프리미엄', sale: 'halloween' },
  { id: 'ghost_cloud',    slot: 'skin', ico: '☁️', name: '구름 유령',     won: 4900, tier: '프리미엄', sale: 'halloween' },
  { id: 'witch_classic',  slot: 'skin', ico: '🧙', name: '클래식 마녀',    won: 4900, tier: '프리미엄', sale: 'halloween' },
  { id: 'witch_starry',   slot: 'skin', ico: '🔮', name: '별밤 견습 마녀', won: 4900, tier: '프리미엄', sale: 'halloween' },
  // 🪓 도구 테마 세트 — 현금 전용(2026-10-02). 손에 드는 도구 9종 외형 + 비 오는 날 우산(js/cosmetics/tool-skins.js)
  //   외형만 바뀐다 — 성능·휘두르는 모션·금빛 도구 규칙은 그대로
  { id: 'tools_shroom', slot: 'tools', ico: '🍄', name: '버섯 숲 세트', won: 5000, tier: '프리미엄' },
  { id: 'tools_moon',   slot: 'tools', ico: '🌙', name: '달밤 세트',    won: 5000, tier: '프리미엄' },
  { id: 'tools_bloom',  slot: 'tools', ico: '🌸', name: '꽃정원 세트',  won: 5000, tier: '프리미엄' },
  // 🎃 할로윈 한정 도구 세트 2종 + 등 꾸미기(박쥐) 2종
  { id: 'tools_batnight', slot: 'tools', ico: '🦇', name: '달밤 보라 세트', won: 4500, tier: '프리미엄', sale: 'halloween' },
  { id: 'tools_harvest',  slot: 'tools', ico: '🌽', name: '수확제 세트',    won: 4500, tier: '프리미엄', sale: 'halloween' },
  { id: 'bat_wing', slot: 'back', ico: '🦇', name: '박쥐 날개', won: 4500, tier: '프리미엄', anchor: 'back', sale: 'halloween' },
  { id: 'bat_cape', slot: 'back', ico: '🧛', name: '박쥐 망토', won: 4500, tier: '프리미엄', anchor: 'back', sale: 'halloween' },
  // 🤝 친구 초대 보상 — 비매품(dev/active/referral-reward). 1명 별빛 도구 세트 · 5명 날개 · 초대받은 친구 하트핀(🌈 3명 아치는 야외 장식)
  { id: 'tools_star',  slot: 'tools', ico: '⭐', name: '별빛 도구 세트', reward: 'referral', tier: '친구 초대' },
  { id: 'friend_wing', slot: 'back',  ico: '🦋', name: '별빛 우정 날개', reward: 'referral', tier: '친구 초대', anchor: 'back' },
  { id: 'friend_pin',  slot: 'head',  ico: '💗', name: '우정 하트핀',    reward: 'referral', tier: '친구 초대', earSafe: 'low' },
  // 👣 발자국 — 값이 오를수록 바닥에 있던 게 공중으로 올라온다
  { id: 'paw',     slot: 'trail', ico: '🐾', name: '발바닥', coins: 700,  tier: '기본' },
  { id: 'drop',    slot: 'trail', ico: '💧', name: '물방울', coins: 900,  tier: '기본' },
  { id: 'flower',  slot: 'trail', ico: '🌸', name: '꽃',     coins: 1500, tier: '고급' },
  { id: 'star',    slot: 'trail', ico: '⭐', name: '별',     coins: 2200, tier: '특별' },
  { id: 'sparkle', slot: 'trail', ico: '✨', name: '반짝이', coins: 2600, tier: '특별' },
];

export const ITEMS = Object.freeze(RAW.map(({ coins = null, won = null, ...it }) => Object.freeze(it.reward
  ? { ...it, price: { coins: null, won: null, cash: null } }
  : won != null
  ? { ...it, premium: true, price: { coins: null, won, cash: cashFor(it.id, null, won) } }
  : { ...it, price: { coins, cash: cashFor(it.id, coins) } })));

/** 그 슬롯의 품목 — 카탈로그 순서 그대로(UI 정렬의 단일 출처) */
export function itemsOf(slot) {
  return ITEMS.filter(i => i.slot === slot);
}

/** id → 품목. 없으면 null(세이브에 낯선 id 가 들어와도 터지지 않게) */
export function findItem(id) {
  return ITEMS.find(i => i.id === id) || null;
}
