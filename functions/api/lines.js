import { SLOTS, LINE_LANGS, keysFor, slotsFor } from '../../js/lines/slots.js';
import { storeHeaders, storeReady } from './_ai-store.js';

const CACHE_TTL = 60 * 60 * 12;
const MAX_KEYS = 4;
const PICK_N = Math.max(...Object.values(SLOTS).flatMap(k => Object.values(k).map(s => s.per)));

const isoDay = ms => new Date(ms).toISOString().slice(0, 10);

function clampDate(raw, now) {
  for (let d = -1; d <= 1; d++) if (raw === isoDay(now + d * 86400000)) return raw;
  return isoDay(now);
}

export function parseQuery(url, now = Date.now()) {
  const kind = url.searchParams.get('kind') || '';
  if (!SLOTS[kind]) return null;
  const allowed = keysFor(kind);
  const keys = [...new Set((url.searchParams.get('key') || '').split(','))].filter(k => allowed.includes(k)).slice(0, MAX_KEYS);
  if (!keys.length) return null;
  const rawLang = url.searchParams.get('lang') || '';
  const lang = LINE_LANGS.includes(rawLang) ? rawLang : 'ko';
  return { kind, keys, lang, date: clampDate(url.searchParams.get('date') || '', now) };
}

export function shapeLines(rows, kind, keys) {
  const out = {};
  for (const key of keys) {
    out[key] = {};
    for (const slot of slotsFor(kind, key)) {
      out[key][slot] = rows.filter(r => r.key === key && r.slot === slot).slice(0, SLOTS[kind][slot].per).map(r => ({ id: r.id, text: r.text }));
    }
  }
  return out;
}

export function srcOf(lines, kind, keys) {
  const counts = keys.flatMap(key => slotsFor(kind, key).map(slot => lines?.[key]?.[slot]?.length || 0));
  if (counts.length && counts.every(n => n > 0)) return 'pool';
  return counts.some(n => n > 0) ? 'partial' : 'fallback';
}

const json = (body, headers) => new Response(JSON.stringify(body), { headers });

export async function onRequestGet({ request, env, waitUntil }, { fetch = globalThis.fetch, cache = globalThis.caches?.default, now = Date.now() } = {}) {
  const url = new URL(request.url);
  const q = parseQuery(url, now);
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': `public, max-age=${CACHE_TTL}`,
  };
  const empty = reason => json({ date: q?.date || isoDay(now), src: 'fallback', lines: {} }, { ...headers, 'Cache-Control': 'no-store', 'X-Lines': reason });
  if (!q) return empty('bad-query');
  if (!storeReady(env)) return empty('no-supabase');

  const cacheKey = new Request(`${url.origin}/api/lines?kind=${q.kind}&key=${q.keys.join(',')}&lang=${q.lang}&date=${q.date}&n=${PICK_N}`, { method: 'GET' });
  const hit = cache ? await cache.match(cacheKey) : null;
  if (hit) return hit;

  try {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/line_pick_many`, {
      method: 'POST',
      headers: storeHeaders(env),
      body: JSON.stringify({ p_kind: q.kind, p_keys: q.keys, p_lang: q.lang, p_seed: `${q.date}:${q.kind}`, p_n: PICK_N }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`line_pick_many ${res.status}`);
    const rows = await res.json();
    if (!Array.isArray(rows) || !rows.length) return empty('empty-pool');
    const lines = shapeLines(rows, q.kind, q.keys);
    const out = json({ date: q.date, src: srcOf(lines, q.kind, q.keys), lines }, headers);
    const picks = Object.entries(lines).flatMap(([key, slots]) => Object.entries(slots).flatMap(([slot, list]) =>
      list.map(l => ({ date: q.date, kind: q.kind, key, slot, lang: q.lang, line_id: l.id }))));
    if (cache) waitUntil(cache.put(cacheKey, out.clone()));
    waitUntil(fetch(`${env.SUPABASE_URL}/rest/v1/line_picks?on_conflict=date,kind,key,slot,lang,line_id`, {
      method: 'POST', headers: storeHeaders(env, 'resolution=ignore-duplicates,return=minimal'), body: JSON.stringify(picks),
    }).catch(e => console.error(JSON.stringify({ message: 'line_picks failed', error: e.message }))));
    return out;
  } catch (e) {
    console.error(JSON.stringify({ message: 'lines failed', kind: q.kind, keys: q.keys, lang: q.lang, error: e.message }));
    return empty('error');
  }
}
