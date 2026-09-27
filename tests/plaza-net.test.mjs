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

test('진행률: 실패해도 시도 시각을 남겨 60초는 재조회 안 하고, 지나면 다시 조회한다', async () => {
  let t = 0, n = 0;
  const f = createProgressFetcher({ fetchFn: async () => { n++; return res({}, false); }, now: () => t });
  assert.equal(await f.get('s'), null);
  t = 30_000;
  assert.equal(await f.get('s'), null);
  assert.equal(n, 1, '30초 안 재조회는 실패 뒤에도 스로틀돼야 한다');
  t = 61_000;
  assert.equal(await f.get('s'), null);
  assert.equal(n, 2, '61초 뒤엔 다시 조회한다');
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

test('진행률: 요청이 떠 있는 동안의 force 는 그걸 기다렸다가 새로 한 번 더 받아 새 값을 준다', async () => {
  let n = 0; const gates = [];
  const f = createProgressFetcher({ now: () => 0, fetchFn: () => { n++; const k = n;
    return new Promise(res1 => gates.push(() => res1(res({ stage: k })))); } });
  const first = f.get('s');                       // 1번째 요청(떠 있음)
  const forced = f.get('s', { force: true });     // 기부 직후 강제 재조회 — 낡은 1번째를 그대로 받으면 안 된다
  await Promise.resolve(); gates[0]();
  assert.equal((await first).stage, 1);
  for (let i = 0; i < 5 && gates.length < 2; i++) await new Promise(r => setTimeout(r, 0));
  assert.equal(gates.length, 2, 'force 가 두 번째 요청을 내지 않았다');
  gates[1]();
  assert.equal((await forced).stage, 2);
  assert.equal(n, 2);
  assert.equal((await f.get('s')).stage, 2);      // 이후 일반 호출은 새 값 캐시
  assert.equal(n, 2);
});

test('RPC 는 supabase-client.js 안에서만 — 클라이언트 객체를 밖으로 내보내지 않는다', () => {
  const sc = readFileSync(new URL('../js/supabase-client.js', import.meta.url), 'utf8');
  assert.ok(/plazaCall\('plaza_donate'/.test(sc));
  assert.ok(/plazaCall\('plaza_mine'/.test(sc));
  assert.ok(/supabase\.rpc\(fn, args\)/.test(sc));
  assert.ok(!/export\s+(const|let)\s+supabase\b/.test(sc));
});
