import { WINTER_NEEDS, PLAZA_DAILY_CAP } from '../data/plaza.js';
import { giveText } from './copy.js';

export const FOUNTAIN_DONE = 4;
const STAGES = Object.freeze([1, 2, 3]);
const DECOR_IDS = Object.freeze(['winterfountain', 'winterlamp']);
const keyOf = (stage, item) => `${stage}:${item}`;
const int0 = (v) => (Number.isInteger(v) && v >= 0 ? v : 0);
const plain = (o) => (o && typeof o === 'object' && !Array.isArray(o) ? o : null);
export const stageList = (a) => (Array.isArray(a) ? [...new Set(a.filter(n => STAGES.includes(n)))].sort((x, y) => x - y) : []);
export const decorList = (a) => (Array.isArray(a) ? [...new Set(a.filter(id => DECOR_IDS.includes(id)))] : []);

export const kstDay = (ms) => new Date(ms + 9 * 3_600_000).toISOString().slice(0, 10);

export function winterDefault() {
  return { given: {}, day: '', today: 0, joined: -1, lamps: [], doubled: [], owed: [], got: [], seenStage: 1, seenLamp: 0, banner: 0, total: 0 };
}

export function restoreWinter(saved) {
  const s = plain(saved);
  if (!s) return winterDefault();
  const given = Object.fromEntries(Object.entries(plain(s.given) || {})
    .filter(([k, v]) => /^[1-3]:[a-z_]{1,24}$/.test(k) && Number.isInteger(v) && v > 0));
  return {
    given,
    day: typeof s.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.day) ? s.day : '',
    today: Math.min(PLAZA_DAILY_CAP, int0(s.today)),
    joined: Number.isInteger(s.joined) && s.joined >= 0 ? s.joined : -1,
    lamps: stageList(s.lamps),
    doubled: stageList(s.doubled),
    owed: decorList(s.owed),
    got: decorList(s.got),
    seenStage: Math.min(FOUNTAIN_DONE, Math.max(1, int0(s.seenStage))),
    seenLamp: Math.min(STAGES.length, int0(s.seenLamp)),
    banner: int0(s.banner),
    total: int0(s.total),
  };
}

export function restoreWinterMap(saved) {
  const s = plain(saved);
  if (!s) return {};
  return Object.fromEntries(Object.entries(s)
    .filter(([id]) => /^[a-z0-9-]{3,32}$/.test(id))
    .map(([id, v]) => [id, restoreWinter(v)]));
}

export function myRows(st, needs = WINTER_NEEDS) {
  return needs.map(n => ({ stage: n.stage, item: n.item, need: n.need, have: Math.min(n.need, st.given[keyOf(n.stage, n.item)] || 0) }));
}

export function myStage(st, needs = WINTER_NEEDS) {
  const open = myRows(st, needs).find(r => r.have < r.need);
  return open ? open.stage : FOUNTAIN_DONE;
}

export function stageRows(st, needs = WINTER_NEEDS) {
  const stage = myStage(st, needs);
  return myRows(st, needs).filter(r => r.stage === stage)
    .map(({ item, have, need }) => ({ item, have, need }))
    .sort((a, b) => a.item.localeCompare(b.item));
}

export const myTotal = (st) => Object.values(st.given).reduce((a, n) => a + n, 0);

export const todayLeft = (st, day, cap = PLAZA_DAILY_CAP) => Math.max(0, cap - (st.day === day ? st.today : 0));

export function recordGive(st, day, { stage, item, accepted, today_left, village_before }) {
  const k = keyOf(stage, item);
  const n = Math.max(0, accepted | 0);
  const usedBefore = st.day === day ? st.today : 0;
  return {
    ...st,
    given: { ...st.given, [k]: (st.given[k] || 0) + n },
    day,
    today: Number.isInteger(today_left) ? PLAZA_DAILY_CAP - today_left : usedBefore + n,
    joined: st.joined >= 0 || !Number.isInteger(village_before) ? st.joined : village_before,
  };
}

export const recordCap = (st, day) => ({ ...st, day, today: PLAZA_DAILY_CAP });

export function winterButtons(inv, left, row) {
  const max = Math.max(0, Math.min(inv?.[row.item] | 0, left | 0, row.need - row.have));
  return [
    { label: '+1', qty: 1, on: max >= 1, cls: '' },
    { label: '+5', qty: 5, on: max >= 5, cls: '' },
    { label: giveText(max), qty: max, on: max >= 1, cls: 'max' },
  ];
}
