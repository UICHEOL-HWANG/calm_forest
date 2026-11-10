import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseQuery, shapeLines, srcOf, onRequestGet } from '../functions/api/lines.js';

const NOW = Date.parse('2026-11-10T12:00:00Z');
const env = { SUPABASE_URL: 'https://sb', SUPABASE_SERVICE_KEY: 's' };
const memCache = () => { const m = new Map(); return { m, match: async r => m.get(r.url)?.clone() ?? null, put: async (r, res) => { m.set(r.url, res); } }; };

test('parseQuery 는 화이트리스트만 받는다', () => {
  const q = parseQuery(new URL('https://x/api/lines?kind=auction&key=moonswing,_any,evil&lang=en&date=2026-11-10'), NOW);
  assert.deepEqual(q, { kind: 'auction', keys: ['moonswing', '_any'], lang: 'en', date: '2026-11-10' });
  assert.equal(parseQuery(new URL('https://x/api/lines?kind=nope&key=a'), NOW), null);
  assert.equal(parseQuery(new URL('https://x/api/lines?kind=auction&key=evil'), NOW), null);
  assert.equal(parseQuery(new URL('https://x/api/lines?kind=auction&key=_any&lang=jp&date=1999-01-01'), NOW).lang, 'ko');
  assert.equal(parseQuery(new URL('https://x/api/lines?kind=auction&key=_any&date=1999-01-01'), NOW).date, '2026-11-10');
});

test('shapeLines 는 slot 별 하루 수만큼만 남긴다', () => {
  const rows = [
    ...[1, 2, 3, 4, 5].map(id => ({ key: '_any', slot: 'raise_me', id, text: `t${id}` })),
    { key: '_any', slot: 'last', id: 9, text: '더 없소?' }, { key: '_any', slot: 'last', id: 10, text: '마지막이오!' },
  ];
  const s = shapeLines(rows, 'auction', ['_any']);
  assert.equal(s._any.raise_me.length, 4);
  assert.equal(s._any.last.length, 1);
});

test('srcOf', () => {
  const full = { moonswing: { intro: [{}], open: [{}] } };
  assert.equal(srcOf(full, 'auction', ['moonswing']), 'pool');
  assert.equal(srcOf({ moonswing: { intro: [{}] } }, 'auction', ['moonswing']), 'partial');
  assert.equal(srcOf({}, 'auction', ['moonswing']), 'fallback');
});

test('캐시 미스면 RPC 로 뽑아 캐시하고 line_picks 를 남긴다', async () => {
  const calls = [], later = [];
  const fetch = async (url, init) => {
    calls.push({ url, body: init?.body && JSON.parse(init.body) });
    if (url.endsWith('/rpc/line_pick_many')) return new Response(JSON.stringify([{ key: '_any', slot: 'last', id: 7, text: '더 없소?' }]));
    return new Response('', { status: 201 });
  };
  const cache = memCache();
  const req = new Request('https://x/api/lines?kind=auction&key=_any&lang=ko&date=2026-11-10');
  const res = await onRequestGet({ request: req, env, waitUntil: p => later.push(p) }, { fetch, cache, now: NOW });
  await Promise.all(later);
  const body = await res.json();
  assert.equal(body.lines._any.last[0].text, '더 없소?');
  assert.equal(body.src, 'partial');
  assert.deepEqual(calls[0].body, { p_kind: 'auction', p_keys: ['_any'], p_lang: 'ko', p_seed: '2026-11-10:auction', p_n: 4 });
  const picks = calls.find(c => c.url.includes('/line_picks'));
  assert.deepEqual(picks.body, [{ date: '2026-11-10', kind: 'auction', key: '_any', slot: 'last', lang: 'ko', line_id: 7 }]);
  assert.equal(cache.m.size, 1);
});

test('풀이 비었거나 오류면 캐시하지 않고 빈 응답', async () => {
  const cache = memCache();
  const req = new Request('https://x/api/lines?kind=auction&key=_any&lang=ko&date=2026-11-10');
  const empty = await onRequestGet({ request: req, env, waitUntil: () => {} }, { fetch: async () => new Response('[]'), cache, now: NOW });
  assert.equal((await empty.json()).src, 'fallback');
  assert.equal(empty.headers.get('Cache-Control'), 'no-store');
  const boom = await onRequestGet({ request: req, env, waitUntil: () => {} }, { fetch: async () => new Response('x', { status: 500 }), cache, now: NOW });
  assert.equal((await boom.json()).src, 'fallback');
  assert.equal(cache.m.size, 0);
});

test('worker 에 /api/lines 라우트가 있고 config 에 LINES_API 가 있다', () => {
  const worker = readFileSync(new URL('../worker/index.js', import.meta.url), 'utf8');
  assert.match(worker, /import \{ onRequestGet as lines \} from '\.\.\/functions\/api\/lines\.js'/);
  assert.match(worker, /pathname === '\/api\/lines'/);
  const config = readFileSync(new URL('../js/config.js', import.meta.url), 'utf8');
  assert.match(config, /LINES_API: `\$\{API_BASE\}\/api\/lines`/);
});
