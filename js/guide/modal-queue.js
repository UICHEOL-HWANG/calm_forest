export const MODAL_PRIORITY = Object.freeze({
  story: 90, daily: 80, result: 70, giftBox: 60, promo: 50, affinity: 40, neighbor: 30, push: 20, nudge: 10,
});
export const MODAL_GAP_MS = 600;
export const MODAL_TICK_MS = 300;
export const MODAL_HOLD_MS = 15000;

const rank = (item) => MODAL_PRIORITY[item.kind] ?? 0;
const safe = (fn) => { try { return fn(); } catch { return null; } };

export function enqueueModal(items, item) {
  if (item.key && items.some(i => i.key === item.key)) return items;
  return Object.freeze([...items, Object.freeze({ ...item })]);
}

export function nextModal(items, { blocked, clearFor, gap = MODAL_GAP_MS }) {
  if (blocked || clearFor < gap) return null;
  return [...items].sort((a, b) => rank(b) - rank(a)).find(i => !i.ready || safe(i.ready)) ?? null;
}

export function createModalQueue({
  now = () => Date.now(), schedule = (fn, ms) => setTimeout(fn, ms),
  every = MODAL_TICK_MS, gap = MODAL_GAP_MS, holdMs = MODAL_HOLD_MS,
} = {}) {
  let items = Object.freeze([]);
  let gates = Object.freeze([]);
  let hold = null;
  let clearSince = null;
  let ticking = false;

  const holding = () => {
    if (hold && now() >= hold.until) hold = null;
    return !!hold;
  };
  const blocked = () => holding() || gates.some(g => !!safe(g));

  function wake() {
    if (ticking || (!items.length && !hold)) return;
    ticking = true;
    schedule(tick, every);
  }

  function run(item) {
    items = Object.freeze(items.filter(i => i !== item));
    clearSince = null;
    const out = safe(item.show);
    if (!out || typeof out.then !== 'function') return;
    const token = { until: now() + holdMs };
    hold = token;
    const release = () => { if (hold === token) { hold = null; clearSince = null; wake(); } };
    out.then(release, release);
  }

  function tick() {
    ticking = false;
    if (blocked()) clearSince = null;
    else {
      clearSince ??= now();
      const item = nextModal(items, { blocked: false, clearFor: now() - clearSince, gap });
      if (item) run(item);
    }
    wake();
  }

  function request(item) {
    const before = items;
    items = enqueueModal(items, item);
    wake();
    return items !== before;
  }

  const turn = (kind, key) => new Promise((resolve) => {
    request({ kind, key, show: () => new Promise(done => resolve(done)) });
  });

  function addGate(fn) {
    gates = Object.freeze([...gates, fn]);
    return () => { gates = Object.freeze(gates.filter(g => g !== fn)); };
  }

  const pending = (kind) => kind ? items.some(i => i.kind === kind) : items.length > 0 || holding();

  const due = () => holding() || items.some(i => !i.ready || !!safe(i.ready));

  return { request, turn, addGate, flush: wake, pending, due };
}

export const modalQueue = createModalQueue();
