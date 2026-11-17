import { dayCount, bumpDay } from '../guide/prepass-rules.js';
import { TABLE_LONG_FROM, BITE_BASE_SEC, BITE_AD_PER_DAY } from '../data/table.js';

const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const scored = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;
const tierOf = (score, tiers) => tiers.find(t => score >= t.min)?.id ?? null;

export function tableDishes(best, recipes, tiers) {
  const b = obj(best);
  return recipes
    .filter(r => scored(b[r.id]))
    .map(r => ({ id: r.id, ico: r.ico, name: r.name, buff: r.buff, tier: tierOf(b[r.id], tiers) }));
}

export function tableShape(count) {
  return count >= TABLE_LONG_FROM ? 'long' : 'round';
}

export function tableView(best, recipes, tiers) {
  const dishes = tableDishes(best, recipes, tiers);
  return { dishes, shape: tableShape(dishes.length), has: dishes.length > 0 };
}

export function tableChanges(prev, next) {
  if (!next?.has) return [];
  if (!prev?.has) return [{ type: 'created' }];
  const before = new Map(prev.dishes.map(d => [d.id, d.tier]));
  const out = next.dishes
    .filter(d => before.get(d.id) !== d.tier)
    .map(d => ({ type: before.has(d.id) ? 'tier' : 'dish', id: d.id }));
  return prev.shape !== 'long' && next.shape === 'long' ? [...out, { type: 'long' }] : out;
}

export function biteStatus(hints, day) {
  const h = obj(hints);
  const bit = h.tableBiteDay === day;
  return { bit, adLeft: bit ? Math.max(0, BITE_AD_PER_DAY - dayCount(h.tableBiteAd, day)) : 0 };
}

export function afterBite(hints, day) {
  return { ...obj(hints), tableBiteDay: day };
}

export function afterBiteAd(hints, day) {
  const h = obj(hints);
  return { ...h, tableBiteAd: bumpDay(h.tableBiteAd, day) };
}

export function biteSeconds(tierId, tiers) {
  return Math.round(BITE_BASE_SEC * (tiers.find(t => t.id === tierId)?.mult ?? 1));
}

export function biteBuffEnd(curEnd, now, sec) {
  return Math.max(curEnd || 0, now) + sec;
}

const stationOf = (cost) => (cost.flour ? 'kiln' : cost.juice ? 'vat' : null);

export function cookbook(best, inventory, recipes, tiers) {
  const b = obj(best), inv = obj(inventory);
  const slots = recipes.map(r => {
    const got = scored(b[r.id]);
    const cost = Object.entries(r.cost || {}).map(([k, need]) => ({ k, need, have: inv[k] || 0 }));
    const short = cost.filter(c => c.have < c.need).map(c => ({ ...c, more: c.need - c.have }));
    return { id: r.id, ico: r.ico, name: r.name, got, tier: got ? tierOf(b[r.id], tiers) : null, cost, short, station: stationOf(r.cost || {}) };
  });
  return { slots, got: slots.filter(s => s.got).length, total: slots.length };
}
