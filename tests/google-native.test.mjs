// 📱 구글 플레이 앱 네이티브 구글 로그인 — js/google-native.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { getGoogleIdToken, sha256Hex } from '../js/google-native.js';

function fakePlugin({ idToken = 'id.tok.en', fail } = {}) {
  const calls = { init: [], login: [] };
  return {
    calls,
    initialize: async (o) => { calls.init.push(o); },
    login: async (o) => {
      calls.login.push(o);
      if (fail) throw new Error(fail);
      return { provider: 'google', result: { responseType: 'online', idToken } };
    },
  };
}

test('sha256Hex — 알려진 값', async () => {
  assert.equal(await sha256Hex('abc', webcrypto),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('구글에는 해시 nonce, 돌려주는 건 원본 nonce (Supabase 용)', async () => {
  const plugin = fakePlugin();
  const r = await getGoogleIdToken({ plugin, webClientId: 'web.apps.googleusercontent.com', crypto: webcrypto });
  assert.equal(r.idToken, 'id.tok.en');
  assert.match(r.rawNonce, /^[0-9a-f]{64}$/);
  const sent = plugin.calls.login[0];
  assert.equal(sent.provider, 'google');
  assert.equal(sent.options.nonce, await sha256Hex(r.rawNonce, webcrypto));
  assert.notEqual(sent.options.nonce, r.rawNonce);
});

test('initialize 는 웹 클라이언트 ID 로 한 번만', async () => {
  const plugin = fakePlugin();
  const deps = { plugin, webClientId: 'web.apps.googleusercontent.com', crypto: webcrypto };
  await getGoogleIdToken(deps);
  await getGoogleIdToken(deps);
  assert.equal(plugin.calls.init.length, 1);
  assert.deepEqual(plugin.calls.init[0], { google: { webClientId: 'web.apps.googleusercontent.com', mode: 'online' } });
});

test('사용자가 취소하면 cancelled — 오류 알림을 띄우지 않게', async () => {
  const r = await getGoogleIdToken({ plugin: fakePlugin({ fail: 'User cancelled the selector' }), webClientId: 'w', crypto: webcrypto });
  assert.deepEqual(r, { cancelled: true });
});

test('실패 사유를 구분한다', async () => {
  await assert.rejects(getGoogleIdToken({ plugin: null, webClientId: 'w', crypto: webcrypto }), /plugin/);
  await assert.rejects(getGoogleIdToken({ plugin: fakePlugin(), webClientId: '', crypto: webcrypto }), /webClientId/);
  await assert.rejects(getGoogleIdToken({ plugin: fakePlugin({ idToken: null }), webClientId: 'w', crypto: webcrypto }), /idToken/);
  await assert.rejects(getGoogleIdToken({ plugin: fakePlugin({ fail: '[28444] Developer console is not set up correctly' }), webClientId: 'w', crypto: webcrypto }), /28444/);
});
