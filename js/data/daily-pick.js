export const DAILY_PICK_POOL = Object.freeze([
  Object.freeze({ id: 'wp_pompom_hat', kind: 'cos', price: 1400 }),
  Object.freeze({ id: 'wp_knit_scarf', kind: 'cos', price: 1200 }),
  Object.freeze({ id: 'wp_firewood', kind: 'cos', price: 1400 }),
  Object.freeze({ id: 'wp_boot_trail', kind: 'cos', price: 1600 }),
  Object.freeze({ id: 'wp_hearth', kind: 'decor', price: 1500 }),
  Object.freeze({ id: 'wp_fur_rug', kind: 'decor', price: 900 }),
  Object.freeze({ id: 'wp_cocoa_table', kind: 'decor', price: 1100 }),
  Object.freeze({ id: 'wp_snowman', kind: 'decor', price: 1200 }),
]);

const DAY_MS = 86400000;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function pickIndex(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const n = DAILY_PICK_POOL.length;
  return ((Math.round(Date.UTC(y, m - 1, d) / DAY_MS) % n) + n) % n;
}

export const pickOf = (dateKey) => DAILY_PICK_POOL[pickIndex(dateKey)];

export const halfPrice = (price) => Math.ceil(price / 2);

export function priceOf(pick, halfState, dateKey) {
  const half = halfState?.half === true && halfState.d === dateKey && halfState.id === pick.id;
  return half ? halfPrice(pick.price) : pick.price;
}

export function msLeft(nowMs) {
  const t = new Date(nowMs);
  return new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1).getTime() - nowMs;
}

export function cleanDailyPick(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const { d, id, half } = raw;
  if (typeof d !== 'string' || !DATE_KEY.test(d)) return null;
  if (!DAILY_PICK_POOL.some(p => p.id === id)) return null;
  if (typeof half !== 'boolean') return null;
  return { d, id, half };
}

export function cardState({ owned, half, adOpen }) {
  if (owned) return 'owned';
  if (half) return 'half';
  return adOpen ? 'ad' : 'noad';
}

export function leftLabel(ms) {
  const min = Math.max(0, Math.floor(ms / 60000));
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
}

export function decorOwned(state, id) {
  return (state.house?.stored?.[id] || 0) > 0
    || (state.outdoorStored?.[id] || 0) > 0
    || (state.house?.decor || []).some(p => p.id === id)
    || (state.outdoor || []).some(p => p.id === id);
}
