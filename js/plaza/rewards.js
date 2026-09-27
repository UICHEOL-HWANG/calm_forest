// js/plaza/rewards.js
// 🌾 좌판 구매·완공 등급 보상·🍂 환전 — 순수 계산(tests/plaza-rewards.test.mjs)
import { PLAZA_STALL, PLAZA_TIER_REWARD } from '../data/plaza.js';
import { leafToCoins } from './rules.js';

const LADDER = ['bronze', 'silver', 'gold'];

// 등급까지의 보상을 누적(🥇 = 🥉 배지 + 🥈 등불 + 🥇 허수아비). 시즌마다 한 번
export function claimPlan(st, season, tier) {
  const already = !!st.claimed?.[season];
  if (!tier) return { badge: null, decor: [], already, none: true };
  const upto = LADDER.slice(0, LADDER.indexOf(tier) + 1);
  const badge = upto.map(t => PLAZA_TIER_REWARD[t].badge).find(Boolean) || null;
  const decor = upto.map(t => PLAZA_TIER_REWARD[t].decor).filter(Boolean);
  return { badge, decor, already, none: false };
}

// 시즌이 끝난 뒤(after) 남은 🍂 을 한 번만 🪙 로
export function convertPlan(st, season, leaf, phase) {
  const already = !!st.converted?.[season];
  if (already || phase !== 'after') return { coins: 0, already };
  return { coins: leafToCoins(leaf), already: false };
}

// 좌판 품목(PLAZA_STALL)만 🍂 로 산다
export function buyPlan(inv, id) {
  const item = PLAZA_STALL.find(s => s.id === id);
  if (!item) return { ok: false, price: 0, reason: 'item' };
  if ((inv.leaf || 0) < item.price) return { ok: false, price: item.price, reason: 'leaf' };
  return { ok: true, price: item.price };
}
