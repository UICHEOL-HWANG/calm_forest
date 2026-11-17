import { POND_COPY } from './copy.js';

const RIM_COST = 150;

export const POND_RIMS = Object.freeze([
  Object.freeze({ id: 'rock', name: POND_COPY.rimName.rock, ico: '🪨', cost: 0 }),
  Object.freeze({ id: 'pebble', name: POND_COPY.rimName.pebble, ico: '⚪', cost: RIM_COST }),
  Object.freeze({ id: 'brick', name: POND_COPY.rimName.brick, ico: '🧱', cost: RIM_COST }),
  Object.freeze({ id: 'shell', name: POND_COPY.rimName.shell, ico: '🐚', cost: RIM_COST }),
]);
export const RIM_IDS = Object.freeze(POND_RIMS.map(r => r.id));
const FREE = POND_RIMS[0].id;

export function pondRimOf(hintsSeen) {
  const id = hintsSeen?.pondRim;
  return RIM_IDS.includes(id) ? id : FREE;
}

export function pondRimsOwned(hintsSeen) {
  const list = Array.isArray(hintsSeen?.pondRims) ? hintsSeen.pondRims : [];
  return RIM_IDS.filter(id => id === FREE || list.includes(id));
}

export function rimView(hintsSeen, coins) {
  const using = pondRimOf(hintsSeen), owned = pondRimsOwned(hintsSeen);
  return POND_RIMS.map(r => {
    const has = owned.includes(r.id);
    return { ...r, owned: has, using: r.id === using, canBuy: !has && coins >= r.cost };
  });
}

export function rimCards(hintsSeen, coins) {
  const cards = rimView(hintsSeen, coins).map(r => {
    const state = r.using ? 'using' : r.owned ? 'owned' : r.canBuy ? 'buy' : 'short';
    const label = r.using ? POND_COPY.rimUsing : r.owned ? POND_COPY.rimSwitch : `🪙 ${r.cost}`;
    return { ...r, state, label, off: r.using || state === 'short' };
  });
  return { cards, short: cards.some(c => !c.owned) && !cards.some(c => c.canBuy) };
}

export function applyRim(inventory, hintsSeen, id) {
  const row = rimView(hintsSeen, inventory?.coins).find(r => r.id === id);
  if (!row || row.using || (!row.owned && !row.canBuy)) return null;
  if (row.owned) return { inventory: { ...inventory }, hintsSeen: { ...hintsSeen, pondRim: id }, bought: false, cost: 0 };
  const paid = pondRimsOwned(hintsSeen).filter(x => x !== FREE);
  return {
    inventory: { ...inventory, coins: inventory.coins - row.cost },
    hintsSeen: { ...hintsSeen, pondRim: id, pondRims: [...paid, id] },
    bought: true, cost: row.cost,
  };
}
