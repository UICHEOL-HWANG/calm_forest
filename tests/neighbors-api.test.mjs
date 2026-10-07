import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createNeighborApi } from '../js/neighbors/api.js';

const ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const mk = ({ rpc = async () => ({ ok: true }), fetchFn = async () => new Response('{}') } = {}) => {
  const calls = [];
  let t = 1000;
  const api = createNeighborApi({ rpc: async (fn, args) => { calls.push([fn, args]); return rpc(fn, args); }, fetchFn, base: 'https://w', now: () => (t += 37) });
  return { api, calls };
};

test('today: 3명까지 · 실패는 { ok:false, reason }', async () => {
  const { api, calls } = mk({ rpc: async () => ({ ok: true, list: [1, 2, 3, 4], rewarded_today: 2 }) });
  assert.deepEqual(await api.today(), { ok: true, list: [1, 2, 3], rewardedToday: 2 });
  assert.deepEqual(calls[0], ['neighbors_today', {}]);
  assert.deepEqual(await mk({ rpc: async () => ({ ok: false, reason: 'auth' }) }).api.today(), { ok: false, reason: 'auth' });
  assert.deepEqual(await mk({ rpc: async () => null }).api.today(), { ok: false, reason: 'upstream' });
  assert.deepEqual(await mk({ rpc: async () => { throw new Error('net'); } }).api.today(), { ok: false, reason: 'offline' });
});

test('react · setPublic · visitors 인자와 정규화', async () => {
  const { api, calls } = mk({ rpc: async (fn) => fn === 'my_visitors'
    ? { ok: true, total: 2, list: [{ nick: 'a' }], is_public: false }
    : fn === 'set_village_public' ? { ok: true, is_public: true } : { ok: true, reason: 'ok', rewarded: true } });
  assert.deepEqual(await api.react(ID, 'heart'), { ok: true, reason: 'ok', rewarded: true });
  assert.deepEqual(calls[0], ['neighbor_react', { p_public_id: ID, p_emoji: 'heart' }]);
  assert.deepEqual(await api.setPublic(1), { ok: true, is_public: true });
  assert.deepEqual(calls[1], ['set_village_public', { p_on: true }]);
  const since = Date.parse('2026-10-06T00:00:00+09:00');
  assert.deepEqual(await api.visitors(since), { ok: true, total: 2, list: [{ nick: 'a' }], isPublic: false });
  assert.deepEqual(calls[2], ['my_visitors', { p_since: '2026-10-05T15:00:00.000Z' }]);
});

test('showcase: 잘못된 id 는 fetch 하지 않는다 · 404/502/예외/정상', async () => {
  let n = 0;
  const bad = mk({ fetchFn: async () => { n++; return new Response('{}'); } });
  assert.deepEqual(await bad.api.showcase('nope'), { ok: false, reason: 'bad_id', code: 400 });
  assert.equal(n, 0);
  const at = (status, body) => mk({ fetchFn: async (u) => { assert.equal(u, `https://w/api/neighbor?id=${ID}`); return new Response(body, { status }); } }).api.showcase(ID);
  assert.deepEqual(await at(404, '{"error":"not_found"}'), { ok: false, reason: 'not_found', code: 404 });
  assert.deepEqual(await at(502, '{"error":"upstream"}'), { ok: false, reason: 'upstream', code: 502 });
  const ok = await at(200, '{"nickname":"n","houseStage":3}');
  assert.deepEqual(ok, { ok: true, data: { nickname: 'n', houseStage: 3 }, loadMs: 37 });
  assert.deepEqual(await mk({ fetchFn: async () => { throw new Error('x'); } }).api.showcase(ID), { ok: false, reason: 'offline', code: 0 });
});

test('supabase-client 에 neighborRpc 가 있고 허용 RPC 4개만 부른다', () => {
  const s = readFileSync(new URL('../js/supabase-client.js', import.meta.url), 'utf8');
  assert.match(s, /const NEIGHBOR_RPCS = new Set\(\['neighbors_today', 'neighbor_react', 'my_visitors', 'set_village_public'\]\);/);
  assert.match(s, /export async function neighborRpc\(fn, args = \{\}\)/);
  const net = readFileSync(new URL('../js/neighbors/net.js', import.meta.url), 'utf8');
  assert.match(net, /createNeighborApi\(\{ rpc: neighborRpc, fetchFn: \(u\) => fetch\(u\), base: CONFIG\.API_BASE \}\)/);
  assert.ok(readFileSync(new URL('../js/neighbors/api.js', import.meta.url), 'utf8').includes('/api/neighbor?id='));
});
