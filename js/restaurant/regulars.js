import { SPECIAL_ODDS } from './special.js';

export const GUEST_NPCS = ['farmer', 'builder', 'stargazer', 'angler', 'ferryman', 'forager', 'rancher', 'curator'];
export const FAV = {
  farmer: 'riceball', builder: 'riceball', stargazer: 'riceball',
  angler: 'grilled', ferryman: 'grilled',
  forager: 'soup', rancher: 'soup', curator: 'soup',
};
export const REGULAR_AT = 5;
const FAV_ODDS = 0.5;
const nat = v => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
const pick = (list, rng) => list[Math.floor(rng() * list.length)];

export function pickGuestNpc(free, busy, rng) {
  const open = free.filter(id => !busy.has(id));
  return open.length ? pick(open, rng) : null;
}

export function pickMenu(npc, menus, rng, special = null) {
  const fav = npc && FAV[npc];
  if (fav && menus.includes(fav) && rng() < FAV_ODDS) return fav;
  if (special && menus.includes(special) && rng() < SPECIAL_ODDS) return special;
  return pick(menus, rng);
}

export function serveLove(npc, menu, stars) {
  if (!npc || stars < 4) return 0;
  return FAV[npc] === menu ? 2 : 1;
}

export function recordRegular(regulars, npc, menu, stars) {
  if (!npc || stars < 4 || FAV[npc] !== menu) return { regulars, became: false };
  const cur = regulars[npc] || { fav: 0, done: false };
  const fav = cur.fav + 1;
  const done = cur.done || fav >= REGULAR_AT;
  return { regulars: { ...regulars, [npc]: { fav, done } }, became: done && !cur.done };
}

export function sanitizeRegulars(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  for (const id of GUEST_NPCS) {
    const r = raw[id];
    if (!r || typeof r !== 'object') continue;
    out[id] = { fav: nat(r.fav), done: r.done === true };
  }
  return out;
}
