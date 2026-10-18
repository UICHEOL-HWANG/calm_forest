import { DROP_SOURCES, DECOR_SETS, SRC_LIST } from '../data/decor-sets.js';

const SET_IDS = DECOR_SETS.map(s => s.id);
const nat = (v) => (Number.isInteger(v) && v > 0 ? v : 0);
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

export function normalizeDrops(raw) {
  const r = obj(raw), t = obj(r.tries), b = obj(r.banner);
  return {
    tries: Object.fromEntries(SRC_LIST.map(s => [s, nat(t[s])])),
    banner: Object.fromEntries(SET_IDS.filter(id => typeof b[id] === 'string').map(id => [id, b[id]])),
  };
}

export function rollDrop(drops, granted, src, rand, force = false) {
  const def = DROP_SOURCES[src];
  const base = normalizeDrops(drops);
  if (!def || granted.includes(def.item)) return { drops: base, hit: false, item: null, tries: 0, pity: false };
  const tries = base.tries[src] + 1;
  const lucky = force || rand < def.p;
  const hit = lucky || tries >= def.pity;
  return {
    drops: { ...base, tries: { ...base.tries, [src]: hit ? 0 : tries } },
    hit,
    item: hit ? def.item : null,
    tries,
    pity: hit && !lucky,
  };
}

export function setProgress(granted, setId) {
  const set = DECOR_SETS.find(s => s.id === setId);
  const got = set ? set.items.filter(id => granted.includes(id)) : [];
  return { got, n: got.length, complete: !!set && got.length === set.items.length };
}

export function bannerDue(drops, granted, setId, today) {
  if (setProgress(granted, setId).complete) return false;
  return normalizeDrops(drops).banner[setId] !== today;
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const dayMs = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));

export function daysSince(first, today) {
  if (typeof first !== 'string' || !DAY_RE.test(first) || !DAY_RE.test(today)) return null;
  return Math.round((dayMs(today) - dayMs(first)) / 86400000);
}
