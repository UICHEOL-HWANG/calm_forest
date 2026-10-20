import { GHOSTS_PER_DAY, pickSpots } from './layout.js';

export const CANDY_PER_GHOST = 2;
export const FIRST_GIFT = 4;
export const STREAK_BONUS = 5;
export const STREAK_EVERY = 3;
export const CASHOUT_RATE = 4;

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const nonNegInt = (v) => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

export function prevDay(day) {
  const [y, m, d] = day.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d) - 86400000);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}

export function normalizeHalloween(saved, today) {
  const s = saved && typeof saved === 'object' ? saved : {};
  const todays = new Set(pickSpots(today));
  const found = s.day === today && Array.isArray(s.found)
    ? [...new Set(s.found.filter(id => typeof id === 'string' && todays.has(id)))]
    : [];
  return {
    day: today,
    found,
    visits: nonNegInt(s.visits),
    gifted: s.gifted === true,
    streak: nonNegInt(s.streak),
    lastFullDay: typeof s.lastFullDay === 'string' && DAY_RE.test(s.lastFullDay) ? s.lastFullDay : null,
  };
}

export function ghostsLeft(hw, today) {
  const found = hw?.day === today && Array.isArray(hw.found) ? hw.found : [];
  return pickSpots(today).filter(id => !found.includes(id));
}

export function findGhost(hw, id, today) {
  if (hw.day !== today || !pickSpots(today).includes(id) || hw.found.includes(id)) {
    return { hw, candy: 0, bonus: 0, allFound: false };
  }
  const found = [...hw.found, id];
  const allFound = found.length >= GHOSTS_PER_DAY;
  if (!allFound) return { hw: { ...hw, found }, candy: CANDY_PER_GHOST, bonus: 0, allFound: false };
  const streak = hw.lastFullDay === prevDay(today) ? hw.streak + 1 : 1;
  const bonus = streak % STREAK_EVERY === 0 ? STREAK_BONUS : 0;
  return { hw: { ...hw, found, streak, lastFullDay: today }, candy: CANDY_PER_GHOST + bonus, bonus, allFound: true };
}

export function takeFirstGift(hw) {
  if (hw.gifted) return { hw, candy: 0 };
  return { hw: { ...hw, gifted: true }, candy: FIRST_GIFT };
}

export function cashoutCoins(candy) {
  return nonNegInt(candy) * CASHOUT_RATE;
}
