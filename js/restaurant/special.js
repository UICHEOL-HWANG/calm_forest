import { MENU } from './data.js';

export const SPECIAL_ODDS = 0.5;
export const SPECIAL_COIN_MUL = 2;

const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);

export function pickSpecial(menus, pantry, date) {
  const open = menus.filter(m => (pantry?.[MENU[m].from] ?? 0) >= 1);
  return open.length ? open[hash(date) % open.length] : null;
}

export function todaySpecial(rest, menus, pantry, date) {
  if (rest.special?.date === date) return { rest, menu: rest.special.menu };
  const menu = pickSpecial(menus, pantry, date);
  return { rest: { ...rest, special: { date, menu } }, menu };
}

export function sanitizeSpecial(raw) {
  if (!raw || typeof raw.date !== 'string') return null;
  if (raw.menu !== null && !(raw.menu in MENU)) return null;
  return { date: raw.date, menu: raw.menu };
}
