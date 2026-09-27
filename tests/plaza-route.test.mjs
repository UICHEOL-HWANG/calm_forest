import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = (rel) => readFileSync(new URL('../' + rel, import.meta.url), 'utf8');

test('광장 API 경로 3벌이 같다 (net.js fetch · worker 라우트 · serve.py 미러)', () => {
  // 이 저장소는 worker 라우트 미등록으로 404 낸 이력이 있다(dex-notes · daily-quests).
  const route = src('worker/index.js').match(/pathname === '(\/api\/plaza)'/);
  assert.ok(route, "worker/index.js 에 '/api/plaza' 라우트가 없다");
  assert.ok(src('js/plaza/net.js').includes(`${route[1]}?season=`), 'js/plaza/net.js 의 fetch 경로가 어긋났다');
  assert.ok(src('scripts/serve.py').includes(`== '${route[1]}'`), 'scripts/serve.py 미러가 없다');
});

test('Worker 핸들러: season 형식 검사 + 60초 캐시 + RPC 인자', async () => {
  const { onRequestGet } = await import('../functions/api/plaza.js');
  const bad = await onRequestGet({ request: new Request('https://x/api/plaza?season=../x'), env: {} });
  assert.equal(bad.status, 400);
  const calls = [];
  globalThis.caches = { default: { match: async () => null, put: async () => {} } };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { calls.push({ url, body: init.body }); return new Response('{"stage":1}', { status: 200 }); };
  try {
    const ok = await onRequestGet({ request: new Request('https://x/api/plaza?season=harvest-2026'),
      env: { SUPABASE_URL: 'https://sb', SUPABASE_ANON_KEY: 'k' }, waitUntil: () => {} });
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('cache-control'), 'public, max-age=60');
    assert.equal(calls[0].url, 'https://sb/rest/v1/rpc/plaza_progress');
    assert.deepEqual(JSON.parse(calls[0].body), { p_season: 'harvest-2026' });
  } finally { globalThis.fetch = realFetch; delete globalThis.caches; }
});
