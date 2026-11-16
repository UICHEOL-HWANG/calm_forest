import { MARKET_THEMES, WEEKLY_GROUPS, WEEKLY_POOL, WEEKLY_FALLBACK, TICKETS_PER_QUEST, TICKET_CAP } from '../data/weekly.js';

const DAY = 86400000;
const KST = 9 * 3600000;
const kstDays = (ms) => Math.floor((ms + KST) / DAY);

export function weekIndex(ms) {
  return Math.floor((kstDays(ms) - 4) / 7);
}

export function marketOpen(ms) {
  const dow = ((kstDays(ms) + 4) % 7 + 7) % 7;
  return dow === 5 || dow === 6 || dow === 0;
}

export function themeFor(index) {
  const n = MARKET_THEMES.length;
  return MARKET_THEMES[((index % n) + n) % n];
}

const BY_ID = new Map([...WEEKLY_POOL, ...WEEKLY_FALLBACK].map(q => [q.id, q]));

export function questById(id) {
  return BY_ID.get(id) || null;
}

function seeded(seed) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickWeekly(index, canDo, prevIds = []) {
  const rand = seeded(index);
  const picked = [];
  const usedTypes = new Set();
  for (const group of WEEKLY_GROUPS) {
    const roll = rand();
    const open = WEEKLY_POOL.filter(q => q.group === group && canDo(q.type) && !usedTypes.has(q.type));
    const fresh = open.filter(q => !prevIds.includes(q.id));
    const pool = fresh.length ? fresh : open;
    const choice = pool.length
      ? pool[Math.floor(roll * pool.length)]
      : WEEKLY_FALLBACK.find(q => canDo(q.type) && !usedTypes.has(q.type)) || null;
    if (!choice) continue;
    picked.push(choice.id);
    usedTypes.add(choice.type);
  }
  return picked;
}

export function weeklyDefault() {
  return { week: -1, quests: [], prev: [], counts: {}, claimed: [], tickets: 0, seenBoard: -1, seenMarket: -1, boardTries: 0, marketTries: 0 };
}

const int = (v, d = 0) => (Number.isInteger(v) ? v : d);
const ids = (v) => (Array.isArray(v) ? v.filter(id => BY_ID.has(id)) : []);

const unique = (list) => [...new Set(list)];

export function restoreWeekly(saved) {
  const base = weeklyDefault();
  if (!saved || typeof saved !== 'object') return base;
  const counts = {};
  for (const [k, v] of Object.entries(saved.counts || {})) if (Number.isInteger(v) && v > 0) counts[k] = v;
  const quests = unique(ids(saved.quests)).slice(0, WEEKLY_GROUPS.length);
  return {
    week: int(saved.week, -1),
    quests,
    prev: ids(saved.prev),
    counts,
    claimed: unique(ids(saved.claimed)).filter(id => quests.includes(id)),
    tickets: Math.max(0, Math.min(TICKET_CAP, int(saved.tickets))),
    seenBoard: int(saved.seenBoard, -1),
    seenMarket: int(saved.seenMarket, -1),
    boardTries: Math.max(0, int(saved.boardTries)),
    marketTries: Math.max(0, int(saved.marketTries)),
  };
}

export function rollover(state, index, canDo) {
  if (!Number.isInteger(index) || state.week === index) return state;
  return { ...state, week: index, prev: state.quests, quests: pickWeekly(index, canDo, state.quests), counts: {}, claimed: [] };
}

export function note(state, type, n = 1) {
  if (!Number.isFinite(n) || n <= 0) return state;
  return { ...state, counts: { ...state.counts, [type]: (state.counts[type] || 0) + Math.floor(n) } };
}

export function progressOf(state, questId) {
  const q = questById(questId);
  if (!q) return { have: 0, target: 0, done: false, claimed: false };
  const have = Math.min(q.target, state.counts[q.type] || 0);
  return { have, target: q.target, done: have >= q.target, claimed: state.claimed.includes(questId) };
}

export function claim(state, questId) {
  if (!state.quests.includes(questId)) return { ok: false, reason: 'unknown', state, gained: 0 };
  const p = progressOf(state, questId);
  if (p.claimed) return { ok: false, reason: 'claimed', state, gained: 0 };
  if (!p.done) return { ok: false, reason: 'not_done', state, gained: 0 };
  if (state.tickets >= TICKET_CAP) return { ok: false, reason: 'cap', state, gained: 0 };
  const tickets = Math.min(TICKET_CAP, state.tickets + TICKETS_PER_QUEST);
  return { ok: true, state: { ...state, claimed: [...state.claimed, questId], tickets }, gained: tickets - state.tickets };
}

export const adTicketOpen = (state) => state.tickets < TICKET_CAP;
export const adTicket = (state) => ({ ...state, tickets: Math.min(TICKET_CAP, state.tickets + 1) });

export function whereOf(item, { stored, hasHouse }) {
  if (!(stored > 0)) return null;
  if (item.kind === 'outdoor') return { key: 'outdoor', guide: 'bench' };
  return hasHouse ? { key: 'indoor', guide: 'house' } : { key: 'indoorNoHouse', guide: null };
}

export function buyPlan(state, item, ctx) {
  if (!ctx.open) return { ok: false, reason: 'closed' };
  if (ctx.isGuest) return { ok: false, reason: 'guest' };
  if (ctx.owned) return { ok: false, reason: 'owned' };
  if (state.tickets < item.cost) return { ok: false, reason: 'short', short: item.cost - state.tickets };
  return { ok: true };
}

export function spend(state, cost) {
  return { ...state, tickets: Math.max(0, state.tickets - cost) };
}
