import { ANY, fillLine } from './slots.js';
import { FALLBACK } from './fallback.js';

export const LOAD_TIMEOUT_MS = 3000;

export function createLineClient({ api, lang, t = s => s, fetch = globalThis.fetch }) {
  const store = new Map(), loading = new Map();
  const keyOf = (kind, keys, date) => `${kind}|${date}|${keys.join(',')}`;

  async function fetchLines(kind, keys, date) {
    try {
      if (!api) throw new Error('off');
      const q = `kind=${encodeURIComponent(kind)}&key=${encodeURIComponent(keys.join(','))}&lang=${encodeURIComponent(lang)}&date=${encodeURIComponent(date)}`;
      const r = await fetch(`${api}?${q}`, { signal: AbortSignal.timeout(LOAD_TIMEOUT_MS) });
      if (!r.ok) throw new Error(`http ${r.status}`);
      const j = await r.json();
      return { src: j?.src || 'fallback', lines: j?.lines || {} };
    } catch {
      return { src: 'fallback', lines: {} };
    }
  }

  function load(kind, keys, date) {
    const k = keyOf(kind, keys, date);
    if (store.has(k)) return Promise.resolve(store.get(k));
    if (!loading.has(k)) {
      loading.set(k, fetchLines(kind, keys, date).then(got => { store.set(k, got); loading.delete(k); return got; }));
    }
    return loading.get(k);
  }

  const peek = (kind, keys, date) => store.get(keyOf(kind, keys, date)) || null;

  function line(got, kind, key, slot, i = 0, vars = {}) {
    const pool = got?.lines?.[key]?.[slot] || [];
    const fromPool = pool.length ? fillLine(pool[i % pool.length].text, vars) : null;
    if (fromPool) return fromPool;
    const fb = FALLBACK[kind]?.[key]?.[slot] || FALLBACK[kind]?.[ANY]?.[slot] || [];
    return fb.length ? fillLine(t(fb[i % fb.length]), vars) || '' : '';
  }

  return { load, peek, line };
}
