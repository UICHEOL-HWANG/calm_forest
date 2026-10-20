export const BUNDLE_DAILY_LIMIT = 2;

export const REWARDS = Object.freeze([
  { id: 'ghostDoll', tab: 'decor', ico: '👻', name: '꼬마 유령 인형', cost: 8 },
  { id: 'candyBasket', tab: 'decor', ico: '🍭', name: '사탕 바구니', cost: 14 },
  { id: 'jackLamp', tab: 'decor', ico: '🎃', name: '웃는 호박 등', cost: 20 },
  { id: 'hwCoins', tab: 'bundle', ico: '🪙', name: '코인 15', cost: 3, give: Object.freeze({ coins: 15 }) },
  { id: 'hwFert', tab: 'bundle', ico: '🌱', name: '비료 2개', cost: 4, give: Object.freeze({ fert: 2 }) },
  { id: 'hwBait', tab: 'bundle', ico: '🪱', name: '미끼 5회분', cost: 3, give: Object.freeze({ bait: 5 }) },
].map(Object.freeze));

const BY_ID = new Map(REWARDS.map(r => [r.id, r]));

export function rewardOf(id) { return BY_ID.get(id) ?? null; }

export function normalizeBundles(saved, today) {
  if (!saved || typeof saved !== 'object' || saved.day !== today) return { day: today, used: {} };
  const used = {};
  for (const [k, v] of Object.entries(saved.used || {})) if (BY_ID.get(k)?.tab === 'bundle' && Number.isFinite(v) && v > 0) used[k] = Math.floor(v);
  return { day: today, used };
}

export function checkExchange(state, id, today) {
  if (!state.open) return { ok: false, reason: 'closed' };
  const r = rewardOf(id);
  if (!r) return { ok: false, reason: 'unknown' };
  const candy = Number.isFinite(state.candy) ? state.candy : 0;
  if (candy < r.cost) return { ok: false, reason: 'candy', need: r.cost - candy };
  if (r.tab === 'bundle' && (normalizeBundles(state.bundles, today).used[id] || 0) >= BUNDLE_DAILY_LIMIT) return { ok: false, reason: 'limit' };
  return { ok: true };
}

export function applyExchange(state, id, today) {
  const check = checkExchange(state, id, today);
  if (!check.ok) return check;
  const r = rewardOf(id);
  const bundles = normalizeBundles(state.bundles, today);
  const nextBundles = r.tab === 'bundle' ? { day: today, used: { ...bundles.used, [id]: (bundles.used[id] || 0) + 1 } } : bundles;
  return {
    ok: true,
    candy: state.candy - r.cost,
    decor: r.tab === 'decor' ? id : null,
    give: r.tab === 'bundle' ? { ...r.give } : null,
    bundles: nextBundles,
  };
}
