import { BASE_INSTRUMENT, INSTRUMENTS, SONG_IDS, PAID_PLAYS, STAR_CUTS } from '../data/concert.js';

const INSTRUMENT_IDS = INSTRUMENTS.map(i => i.id);
const count = (v) => (Number.isInteger(v) && v >= 0 ? v : 0);
const unit = (v) => Math.min(1, Math.max(0, Number(v) || 0));

export function concertDefault() {
  return {
    notes: 0,
    owned: [BASE_INSTRUMENT],
    equipped: BASE_INSTRUMENT,
    best: Object.fromEntries(SONG_IDS.map(id => [id, 0])),
    day: '',
    paid: 0,
    tutorial: false,
    seen: false,
    guideTries: 0,
  };
}

export function restoreConcert(saved) {
  if (!saved || typeof saved !== 'object') return concertDefault();
  const listed = Array.isArray(saved.owned) ? saved.owned : [];
  const owned = [...new Set([BASE_INSTRUMENT, ...listed])].filter(id => INSTRUMENT_IDS.includes(id));
  return {
    notes: count(saved.notes),
    owned,
    equipped: owned.includes(saved.equipped) ? saved.equipped : BASE_INSTRUMENT,
    best: Object.fromEntries(SONG_IDS.map(id => [id, unit(saved.best?.[id])])),
    day: typeof saved.day === 'string' ? saved.day : '',
    paid: Math.min(PAID_PLAYS, count(saved.paid)),
    tutorial: saved.tutorial === true,
    seen: saved.seen === true,
    guideTries: count(saved.guideTries),
  };
}

export const starsFor = (songId, ratio) => (STAR_CUTS[songId] || STAR_CUTS.morning).filter(cut => ratio >= cut).length;
export const notesFor = (stars) => 1 + stars;
export const paidLeft = (state, today) => (state.day === today ? Math.max(0, PAID_PLAYS - state.paid) : PAID_PLAYS);

export function settle(state, { songId, ratio, today }) {
  const stars = starsFor(songId, ratio);
  const left = paidLeft(state, today);
  const pays = left > 0;
  const earned = pays ? notesFor(stars) : 0;
  const paidToday = state.day === today ? state.paid : 0;
  const prevBest = state.best[songId] || 0;
  const beaten = ratio > prevBest;
  const bestUp = beaten && prevBest > 0;
  return {
    state: {
      ...state,
      notes: state.notes + earned,
      day: today,
      paid: paidToday + (pays ? 1 : 0),
      best: beaten ? { ...state.best, [songId]: ratio } : state.best,
    },
    stars,
    earned,
    bestUp,
    left: Math.max(0, left - 1),
  };
}

export function buyPlan(state, item, { isGuest, owned, hasArt }) {
  if (!hasArt) return { ok: false, reason: 'soon' };
  if (owned) return { ok: false, reason: 'owned' };
  if (isGuest) return { ok: false, reason: 'guest' };
  if (state.notes < item.cost) return { ok: false, reason: 'short', lack: item.cost - state.notes };
  return { ok: true };
}

export const spend = (state, cost) => ({ ...state, notes: state.notes - cost });
export const addInstrument = (state, id) => (state.owned.includes(id) ? state : { ...state, owned: [...state.owned, id] });
export const equip = (state, id) => (state.owned.includes(id) && state.equipped !== id ? { ...state, equipped: id } : state);
export const markTutorial = (state) => (state.tutorial ? state : { ...state, tutorial: true });
