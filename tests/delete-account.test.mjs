// 🗑️ 앱 안 계정 삭제 — js/account/delete-account.js (App Store 5.1.1(v): 앱 안에서 삭제가 끝까지 돼야 한다)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deleteOwnAccount } from '../js/account/delete-account.js';

function fakeSupabase({ photos = [], rpcError = null } = {}) {
  const calls = [];
  return {
    calls,
    from: (t) => ({ select: async (c) => { calls.push(['select', t, c]); return { data: photos }; } }),
    rpc: async (fn) => { calls.push(['rpc', fn]); return { error: rpcError }; },
  };
}

test('사진 원본을 먼저 지우고(토큰 첨부) 그다음 계정 RPC', async () => {
  const sb = fakeSupabase({ photos: [{ object_key: 'u/1 a.png' }, { object_key: 'u/2.png' }] });
  const reqs = [];
  const fetch = async (url, init) => { reqs.push([url, init]); sb.calls.push(['fetch']); return { ok: true }; };
  const r = await deleteOwnAccount({ supabase: sb, accessToken: 'tok', apiBase: 'https://calmforest.cloud', fetch });
  assert.deepEqual(r, { photoFailures: 0 });
  assert.equal(reqs[0][0], 'https://calmforest.cloud/api/photo?key=u%2F1%20a.png');
  assert.equal(reqs[0][1].method, 'DELETE');
  assert.equal(reqs[0][1].headers.authorization, 'Bearer tok');
  assert.deepEqual(sb.calls.at(-1), ['rpc', 'delete_own_account'], 'RPC 는 맨 마지막(먼저 지우면 사진 파일이 고아가 된다)');
});

test('사진 일부 실패는 세고 계속 진행한다', async () => {
  const sb = fakeSupabase({ photos: [{ object_key: 'a' }, { object_key: 'b' }] });
  let n = 0;
  const r = await deleteOwnAccount({ supabase: sb, accessToken: 't', apiBase: '', fetch: async () => ({ ok: n++ === 0 }) });
  assert.equal(r.photoFailures, 1);
  assert.deepEqual(sb.calls.at(-1), ['rpc', 'delete_own_account']);
});

test('계정 RPC 가 실패하면 던진다(삭제됐다고 말하지 않게)', async () => {
  const sb = fakeSupabase({ rpcError: { message: 'permission denied' } });
  await assert.rejects(deleteOwnAccount({ supabase: sb, accessToken: 't', apiBase: '', fetch: async () => ({ ok: true }) }), /permission denied/);
});
