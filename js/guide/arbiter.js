export const GUIDE_PRIORITY = Object.freeze({
  coach: 100, house: 90, goal: 80, port: 70, restaurant: 60, yard: 50, affinity: 40, weekly: 30, concert: 20, auction: 10,
});

const claiming = (e) => !!e.active() || !!e.wants?.();
const prio = (p) => (typeof p === 'function' ? p() : p);

export function createArbiter(table = GUIDE_PRIORITY) {
  let entries = Object.freeze([]);

  function register({ name, priority = table[name] ?? -Infinity, active, wants, target }) {
    const entry = Object.freeze({ name, priority, active, wants, target });
    entries = Object.freeze([...entries.filter(e => e.name !== name), entry]);
    return () => { entries = Object.freeze(entries.filter(e => e !== entry)); };
  }

  function rankOf(name) {
    const at = entries.findIndex(e => e.name === name);
    return at < 0 ? { priority: table[name] ?? -Infinity, at: Infinity } : { priority: prio(entries[at].priority), at };
  }

  const beats = (e, i, me) => prio(e.priority) > me.priority || (prio(e.priority) === me.priority && i < me.at);

  function mayShow(name) {
    const me = rankOf(name);
    return !entries.some((e, i) => e.name !== name && beats(e, i, me) && claiming(e));
  }

  const anyActive = (except) => entries.some(e => e.name !== except && !!e.active());

  function focus() {
    let best = null, rank = -Infinity;
    for (const e of entries) {
      const p = prio(e.priority);
      if (p <= rank) continue;
      const t = e.target?.();
      if (t) { best = t; rank = p; }
    }
    return best;
  }

  return { register, mayShow, anyActive, busy: () => anyActive(), focus };
}

export const guideArbiter = createArbiter();
