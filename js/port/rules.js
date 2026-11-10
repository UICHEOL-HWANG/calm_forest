import { PANTRY_KEYS, QUESTS, CATCH, SELL_PRICE } from './data.js';

const QUEST_BY_ID = new Map(QUESTS.map(q => [q.id, q]));
const STATES = new Set(['avail', 'active', 'done']);
const nat = v => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

export function defaultPort() {
  return {
    v: 1, visited: false, fastUnlocked: false, guideDone: false,
    quests: Object.fromEntries(QUESTS.map(q => [q.id, { state: 'avail', got: 0 }])),
    pantry: Object.fromEntries(PANTRY_KEYS.map(k => [k, 0])),
    boughtDay: null,
  };
}

export function sanitizePort(raw) {
  const base = defaultPort();
  if (!raw || typeof raw !== 'object') return base;
  const quests = Object.fromEntries(QUESTS.map(q => {
    const r = raw.quests?.[q.id];
    const state = STATES.has(r?.state) ? r.state : 'avail';
    return [q.id, { state, got: Math.min(q.need, nat(r?.got)) }];
  }));
  const pantry = Object.fromEntries(PANTRY_KEYS.map(k => [k, nat(raw.pantry?.[k])]));
  return {
    ...base,
    visited: raw.visited === true,
    fastUnlocked: raw.fastUnlocked === true,
    guideDone: raw.guideDone === true,
    quests, pantry,
    boughtDay: typeof raw.boughtDay === 'string' ? raw.boughtDay : null,
  };
}

export function rollCatch(zone, r) {
  const table = CATCH[zone] || CATCH.near;
  let acc = 0;
  for (const [kind, w] of table) { acc += w; if (r < acc) return kind; }
  return table[table.length - 1][0];
}

const withQuest = (port, id, q) => ({ ...port, quests: { ...port.quests, [id]: q } });

export function acceptQuest(port, id) {
  const q = port.quests[id];
  if (!q || q.state !== 'avail') return port;
  return withQuest(port, id, { state: 'active', got: 0 });
}

export function pickItem(port, id) {
  const q = port.quests[id], def = QUEST_BY_ID.get(id);
  if (!q || !def || q.state !== 'active' || q.got >= def.need) return port;
  return withQuest(port, id, { ...q, got: q.got + 1 });
}

export function addToPantry(port, items) {
  const pantry = { ...port.pantry };
  for (const [k, n] of Object.entries(items)) if (k in pantry) pantry[k] += nat(n);
  return { ...port, pantry };
}

export function claimQuest(port, id) {
  const q = port.quests[id], def = QUEST_BY_ID.get(id);
  if (!q || !def || q.state !== 'active' || q.got < def.need) return null;
  const done = withQuest(port, id, { ...q, state: 'done' });
  return { port: addToPantry(done, def.reward), reward: { ...def.reward } };
}

export function pantryUnits(port) {
  const total = Object.values(port.pantry).reduce((a, b) => a + b, 0);
  return Math.floor((total / 8) * 10) / 10;
}

export function boardGate(armed, dist, r) {
  return { armed: armed || dist >= r, can: armed && dist < r };
}

export function sellCatch(port) {
  const pantry = port.pantry ?? {}, sold = {};
  let coins = 0;
  for (const [k, price] of Object.entries(SELL_PRICE)) {
    const n = nat(pantry[k]);
    if (!n) continue;
    sold[k] = n; coins += n * price;
  }
  if (!coins) return null;
  return { port: { ...port, pantry: { ...pantry, ...Object.fromEntries(Object.keys(sold).map(k => [k, 0])) } }, coins, sold };
}
