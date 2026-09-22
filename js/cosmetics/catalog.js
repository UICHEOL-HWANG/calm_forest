// js/cosmetics/catalog.js
// =============================================================
//  calm forest · 🎀 꾸미기 카탈로그 (순수 데이터 — THREE/DOM 의존 없음)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-21-cosmetics-pet-design.md §4
//  ▶ price.cash 는 **전부 null** 이다. 결제는 이번에 안 붙인다(§0).
//    채널이 열리면 이 줄만 { krw, sku } 로 채운다 — UI 는 cash 가 null 이면 버튼을 안 그린다.
//  ▶ earSafe: 머리 장식이 귀를 어떻게 다루는가(§3-3)
//      'low'  위가 트여 귀가 지나간다 · 'dome' 머리를 덮되 테두리가 귀 밑동보다 위
//  ▶ anchor: 슬롯 안에서 **붙을 면**을 아이템이 고른다. 가방류는 옆구리(side),
//    망토만 등(back) — 등 한가운데는 🦊여우 꼬리 자리다.
//  ▶ 테스트: npm test (tests/cosmetics-catalog.test.mjs) — 가격·수량을 여기 못박는다.
// =============================================================

export const SLOTS = Object.freeze(['head', 'neck', 'back', 'trail']);

const P = coins => ({ coins, cash: null });

export const ITEMS = Object.freeze([
  // 🎩 머리 — dome 4 · low 3
  { id: 'beanie',       slot: 'head', ico: '🧶', name: '털모자',        price: P(1600), earSafe: 'dome' },
  { id: 'cap',          slot: 'head', ico: '🧢', name: '캡',            price: P(1500), earSafe: 'dome' },
  { id: 'mushroom',     slot: 'head', ico: '🍄', name: '버섯 모자',     price: P(1800), earSafe: 'dome' },
  { id: 'straw_hat',    slot: 'head', ico: '👒', name: '밀짚모자',      price: P(1200), earSafe: 'dome' },
  { id: 'flower_crown', slot: 'head', ico: '💐', name: '화관',          price: P(1400), earSafe: 'low'  },
  { id: 'leaf_band',    slot: 'head', ico: '🍃', name: '나뭇잎 머리띠', price: P(800),  earSafe: 'low'  },
  { id: 'star_pin',     slot: 'head', ico: '⭐', name: '별 머리핀',     price: P(600),  earSafe: 'low'  },
  // 🧣 목
  { id: 'scarf',  slot: 'neck', ico: '🧣', name: '목도리',      price: P(900) },
  { id: 'bell',   slot: 'neck', ico: '🔔', name: '방울 목걸이', price: P(700) },
  { id: 'bowtie', slot: 'neck', ico: '🎀', name: '나비 넥타이', price: P(850) },
  // 🎒 가방 — 가방류는 옆구리, 망토만 등
  { id: 'pack',   slot: 'back', ico: '🎒', name: '메신저 가방', price: P(1500), anchor: 'side' },
  { id: 'basket', slot: 'back', ico: '🧺', name: '바구니',      price: P(1200), anchor: 'side' },
  { id: 'cape',   slot: 'back', ico: '🦸', name: '망토',        price: P(1800), anchor: 'back' },
  // 👣 발자국 — 값이 오를수록 바닥에 있던 게 공중으로 올라온다
  { id: 'paw',     slot: 'trail', ico: '🐾', name: '발바닥', price: P(700),  tier: '기본' },
  { id: 'drop',    slot: 'trail', ico: '💧', name: '물방울', price: P(900),  tier: '기본' },
  { id: 'flower',  slot: 'trail', ico: '🌸', name: '꽃',     price: P(1500), tier: '고급' },
  { id: 'star',    slot: 'trail', ico: '⭐', name: '별',     price: P(2200), tier: '특별' },
  { id: 'sparkle', slot: 'trail', ico: '✨', name: '반짝이', price: P(2600), tier: '특별' },
]);

/** 그 슬롯의 품목 — 카탈로그 순서 그대로(UI 정렬의 단일 출처) */
export function itemsOf(slot) {
  return ITEMS.filter(i => i.slot === slot);
}

/** id → 품목. 없으면 null(세이브에 낯선 id 가 들어와도 터지지 않게) */
export function findItem(id) {
  return ITEMS.find(i => i.id === id) || null;
}
