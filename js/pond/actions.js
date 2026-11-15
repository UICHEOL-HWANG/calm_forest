import { dayCount, bumpDay } from '../guide/prepass-rules.js';

export const FEED_BUFF_SEC = 30;
export const FEED_AD_PER_DAY = 1;

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

export function feedStatus(hints, day) {
  const h = obj(hints);
  return { fed: h.pondFeedDay === day, adLeft: Math.max(0, FEED_AD_PER_DAY - dayCount(h.pondFeedAd, day)) };
}

export function afterFeed(hints, day) {
  return { ...obj(hints), pondFeedDay: day };
}

export function afterFeedAd(hints, day) {
  const h = obj(hints);
  return { ...h, pondFeedAd: bumpDay(h.pondFeedAd, day) };
}

export function daysUntilSeason(cur, left, target, ids, len = 14) {
  if (cur === target) return 0;
  const k = (ids.indexOf(target) - ids.indexOf(cur) + ids.length) % ids.length;
  return left + (k - 1) * len;
}

function riverHint(f, got, season, left, ids, len) {
  if (got) return null;
  if (!f.season) return { kind: 'lake' };
  const days = daysUntilSeason(season, left, f.season, ids, len);
  return days === 0 ? { kind: 'lake', now: true } : { kind: 'season', season: f.season, days };
}

export function fishBook({ dexFish, seaBest } = {}, { river, sea }, { season, left }, seasonIds, seasonDays = 14) {
  const dex = obj(dexFish), best = obj(seaBest);
  const r = river.map(f => {
    const got = isNum(dex[f.id]);
    return { id: f.id, ico: f.ico, name: f.name, got, hint: riverHint(f, got, season, left, seasonIds, seasonDays) };
  });
  const s = sea.map(f => {
    const w = best[f.id];
    const got = isNum(w) && w > 0;
    return { id: f.id, ico: f.ico, name: f.name, got, w: got ? Math.round(w * 10) / 10 : null, hint: got ? null : { kind: 'sea' } };
  });
  const got = r.filter(x => x.got).length + s.filter(x => x.got).length;
  return { river: r, sea: s, got, total: r.length + s.length };
}
