import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = (rel) => readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
const ID = '0f8fad5b-d9cb-469f-a165-70867728950e';

test('이웃 API 경로 3벌이 같다 (worker 라우트 · serve.py 미러)', () => {
  // 이 저장소는 worker 라우트 미등록으로 404 낸 이력이 있다(dex-notes · daily-quests).
  const w = src('worker/index.js');
  assert.match(w, /import \{ onRequestGet as neighbor \} from '\.\.\/functions\/api\/neighbor\.js';/);
  assert.match(w, /if \(pathname === '\/api\/neighbor'\) \{[\s\S]{0,200}return await neighbor\(\{ request, env, waitUntil: ctx\.waitUntil\.bind\(ctx\) \}\);/);
  const py = src('scripts/serve.py');
  assert.ok(py.includes("== '/api/neighbor'"), 'scripts/serve.py do_GET 분기가 없다');
  assert.ok(py.includes("'/rest/v1/rpc/neighbor_showcase'"), 'serve.py 미러가 neighbor_showcase 를 안 부른다');
});

test('Worker 핸들러: id 형식 검사', async () => {
  const { onRequestGet } = await import('../functions/api/neighbor.js');
  for (const bad of ['', 'abc', '../x', `${ID}x`]) {
    const r = await onRequestGet({ request: new Request(`https://x/api/neighbor?id=${encodeURIComponent(bad)}`), env: {} });
    assert.equal(r.status, 400, bad);
  }
});

test('Worker 핸들러: 200 은 10분 캐시 + RPC 인자, null 은 404·캐시 안 함, 업스트림 실패는 502', async () => {
  const { onRequestGet } = await import('../functions/api/neighbor.js');
  const calls = [], puts = [];
  globalThis.caches = { default: { match: async () => null, put: async (k) => { puts.push(k.url); } } };
  const realFetch = globalThis.fetch;
  let body = '{"nickname":"n","houseStage":3}', status = 200;
  globalThis.fetch = async (url, init) => { calls.push({ url, body: init.body, headers: init.headers }); return new Response(body, { status }); };
  const env = { SUPABASE_URL: 'https://sb', SUPABASE_ANON_KEY: 'k' };
  const run = () => onRequestGet({ request: new Request(`https://x/api/neighbor?id=${ID.toUpperCase()}`), env, waitUntil: (p) => p });
  try {
    const ok = await run();
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('cache-control'), 'public, max-age=600');
    assert.equal(calls[0].url, 'https://sb/rest/v1/rpc/neighbor_showcase');
    assert.deepEqual(JSON.parse(calls[0].body), { p_public_id: ID });   // 소문자로 정규화
    assert.equal(calls[0].headers.authorization, 'Bearer k');
    assert.equal(puts.length, 1);
    body = 'null';
    const nf = await run();
    assert.equal(nf.status, 404);
    assert.equal(nf.headers.get('cache-control'), null);
    assert.equal(puts.length, 1, '404 를 캐시하면 다시 켠 마을이 10분간 안 보인다');
    body = 'oops'; status = 500;
    const up = await run();
    assert.equal(up.status, 502);
  } finally { globalThis.fetch = realFetch; delete globalThis.caches; }
});

test('Worker 핸들러: fetch 가 throw 하거나 env 가 없으면 502', async () => {
  const { onRequestGet } = await import('../functions/api/neighbor.js');
  globalThis.caches = { default: { match: async () => null, put: async () => {} } };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new TypeError('network'); };
  try {
    const r = await onRequestGet({ request: new Request(`https://x/api/neighbor?id=${ID}`), env: { SUPABASE_URL: 'https://sb', SUPABASE_ANON_KEY: 'k' } });
    assert.equal(r.status, 502);
    assert.deepEqual(await r.json(), { error: 'upstream' });
  } finally { globalThis.fetch = realFetch; delete globalThis.caches; }
});

test('serve.py 미러: fullmatch + env 누락 가드', () => {
  const py = src('scripts/serve.py');
  const body = py.slice(py.indexOf('def serve_neighbor'), py.indexOf('def do_POST'));
  assert.ok(body.includes('re.fullmatch('), 'fullmatch 필요');
  assert.ok(!body.includes('re.match('), 're.match 금지(개행 통과)');
  assert.ok(body.includes('if not url or not anon:'), 'env 누락 가드');
});
