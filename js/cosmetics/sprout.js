import { ITEMS, itemsOf, findItem } from './catalog.js';

export const SPROUT_IDS = Object.freeze(ITEMS.filter(i => i.group === 'sprout').map(i => i.id));
export const SPROUT_PREMIUM_PICK = 'firefly';

export function sproutOpen(cos) {
  const owned = Array.isArray(cos?.owned) ? cos.owned : [];
  return SPROUT_IDS.some(id => !owned.includes(id));
}

export function shopRows(tab) {
  if (tab === 'sprout') return [...SPROUT_IDS.map(findItem), findItem(SPROUT_PREMIUM_PICK)].filter(Boolean);
  return itemsOf(tab).filter(i => !i.shop && i.group !== 'sprout');
}

export function defaultCosTab(cos) {
  return sproutOpen(cos) ? 'sprout' : 'head';
}
