import { AUCTION_POOL, AUCTION_BIDDERS, OPEN_FROM, OPEN_TO } from '../data/auction.js';

export function hashStr(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0; h ^= h >>> 13;
  return h >>> 0;
}

const r10 = n => Math.round(n / 10) * 10;

export function lotFor(day) {
  const item = AUCTION_POOL[hashStr(`auction:${day}`) % AUCTION_POOL.length];
  return { id: item.id, appraisal: item.appraisal, start: r10(item.appraisal * 0.5) };
}

export function bidderMaxes(day, appraisal, bidders = AUCTION_BIDDERS) {
  return Object.fromEntries(bidders.map(b => {
    const k = 0.75 + (hashStr(`auction:${day}:${b.id}`) % 66) / 100;
    return [b.id, r10(appraisal * k)];
  }));
}

export function auctionOpenAt(t) { return t >= OPEN_FROM && t < OPEN_TO; }

export function secondsUntilOpen(t, daySpeed) {
  if (auctionOpenAt(t)) return 0;
  return ((((OPEN_FROM - t) % 1) + 1) % 1) / daySpeed;
}

export function joinMode({ t, day, lastDate, coins, start }) {
  if (!auctionOpenAt(t)) return 'closed';
  if (lastDate === day) return 'done';
  return coins >= start ? 'bid' : 'watch';
}

export function auctionDefault() { return { lastDate: '', wins: 0 }; }

export function restoreAuction(saved) {
  const lastDate = typeof saved?.lastDate === 'string' ? saved.lastDate : '';
  const w = saved?.wins;
  const wins = Number.isFinite(w) && w >= 0 ? Math.floor(w) : 0;
  return { lastDate, wins };
}
