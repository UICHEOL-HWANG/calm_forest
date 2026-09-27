import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createProgressFetcher } from '../js/plaza/progress.js';

const res = (body, ok = true) => ({ ok, json: async () => body });

test('진행률: 60초 안 재호출은 캐시, force 는 즉시', async () => {
  let t = 0, n = 0;
  const f = createProgressFetcher({ fetchFn: async () => { n++; return res({ stage: n }); }, now: () => t });
  assert.equal((await f.get('harvest-2026')).stage, 1);
  t = 30_000; assert.equal((await f.get('harvest-2026')).stage, 1); assert.equal(n, 1);
  t = 61_000; assert.equal((await f.get('harvest-2026')).stage, 2);
  assert.equal((await f.get('harvest-2026', { force: true })).stage, 3);
});

test('진행률: 실패하면 마지막 값을 유지한다', async () => {
  let t = 0, fail = false;
  const f = createProgressFetcher({ fetchFn: async () => (fail ? res({}, false) : res({ stage: 2 })), now: () => t });
  await f.get('s'); fail = true; t = 70_000;
  assert.equal((await f.get('s')).stage, 2);
  assert.equal(f.last().stage, 2);
});

test('진행률: 에러 응답 본문({error})은 값으로 받지 않는다', async () => {
  const f = createProgressFetcher({ fetchFn: async () => res({ error: 'unknown season' }), now: () => 0 });
  assert.equal(await f.get('s'), null);
});

test('진행률: 동시 호출은 한 번만 나간다', async () => {
  let n = 0;
  const f = createProgressFetcher({ fetchFn: async () => { n++; return res({ stage: 1 }); }, now: () => 0 });
  await Promise.all([f.get('s'), f.get('s'), f.get('s')]);
  assert.equal(n, 1);
});

test('RPC 는 supabase-client.js 안에서만 — 클라이언트 객체를 밖으로 내보내지 않는다', () => {
  const sc = readFileSync(new URL('../js/supabase-client.js', import.meta.url), 'utf8');
  assert.ok(/plazaCall\('plaza_donate'/.test(sc));
  assert.ok(/plazaCall\('plaza_mine'/.test(sc));
  assert.ok(/supabase\.rpc\(fn, args\)/.test(sc));
  assert.ok(!/export\s+(const|let)\s+supabase\b/.test(sc));
});
