import { MAT_IDS, liveBoatIds } from './boats.js';

export const BOAT_V = 2;
const COURSE_IDS = ['calm', 'rapid'];
const STAT_KEYS = ['rapidClears', 'rapidNightClears', 'rapidPerfect', 'nightClears', 'raftClears', 'comboBest'];

const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const nat = v => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
const natMap = (src, keys) => Object.fromEntries(keys.map(k => [k, nat(isObj(src) ? src[k] : 0)]));
const levelMap = src => (isObj(src) ? Object.fromEntries(Object.entries(src).map(([k, v]) => [k, nat(v)]).filter(([, v]) => v > 0)) : {});

export function boatDefaults() {
  return {
    date: null, count: 0, clearsToday: 0, best: 0, clears: 0, up: { oar: 0, hull: 0, lamp: 0 }, chestDate: null,
    v: BOAT_V,
    sel: { boat: 'ferry', bow: null, flag: null, stern: null, crew: null, course: 'calm' },
    own: { ferry: 1 },
    parts: {},
    crew: {},
    mat: natMap({}, MAT_IDS),
    mastery: {},
    stat: natMap({}, STAT_KEYS),
    bestRapid: 0,
  };
}

export function migrateUpgrades(up) {
  const u = isObj(up) ? up : {};
  const parts = {}, equip = {};
  if (nat(u.oar)) { parts.wind = nat(u.oar); equip.flag = 'wind'; }
  if (nat(u.hull)) { parts.ram = nat(u.hull); equip.bow = 'ram'; }
  if (nat(u.lamp)) { parts.bell = 1; equip.stern = 'bell'; }
  return { parts, equip, refundStar: nat(u.lamp) ? 300 : 0 };
}

export function restoreBoat(saved) {
  const s = isObj(saved) ? saved : {};
  const d = boatDefaults();
  const own = { ...levelMap(s.own), ferry: 1 };
  const base = {
    ...d,
    ...s,
    up: { ...d.up, ...(isObj(s.up) ? s.up : {}) },
    own,
    parts: levelMap(s.parts),
    crew: levelMap(s.crew),
    mat: natMap(s.mat, MAT_IDS),
    mastery: levelMap(s.mastery),
    stat: natMap(s.stat, STAT_KEYS),
    bestRapid: nat(s.bestRapid),
  };
  const sel0 = { ...d.sel, ...(isObj(s.sel) ? s.sel : {}) };
  const sel = {
    ...sel0,
    boat: own[sel0.boat] && liveBoatIds().includes(sel0.boat) ? sel0.boat : 'ferry',
    course: COURSE_IDS.includes(sel0.course) ? sel0.course : 'calm',
  };
  if (s.v === BOAT_V) return { boat: { ...base, v: BOAT_V, sel }, refundStar: 0 };
  const m = migrateUpgrades(s.up);
  return {
    boat: { ...base, v: BOAT_V, parts: { ...base.parts, ...m.parts }, sel: { ...sel, ...m.equip } },
    refundStar: m.refundStar,
  };
}
