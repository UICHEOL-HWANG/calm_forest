// 🍎 iOS 앱 네이티브 Apple 로그인 — js/apple-native.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { getAppleIdToken } from '../js/apple-native.js';
import { sha256Hex } from '../js/google-native.js';

function fakePlugin({ idToken = 'apple.id.token', fail } = {}) {
  const calls = { init: [], login: [] };
  return {
    calls,
    initialize: async (o) => { calls.init.push(o); },
    login: async (o) => {
      calls.login.push(o);
      if (fail) throw new Error(fail);
      return { provider: 'apple', result: { idToken, accessToken: null, profile: {} } };
    },
  };
}

test('Apple 에는 해시 nonce, 돌려주는 건 원본 nonce (Supabase 용)', async () => {
  const plugin = fakePlugin();
  const r = await getAppleIdToken({ plugin, crypto: webcrypto });
  assert.equal(r.idToken, 'apple.id.token');
  assert.match(r.rawNonce, /^[0-9a-f]{64}$/);
  const sent = plugin.calls.login[0];
  assert.equal(sent.provider, 'apple');
  assert.equal(sent.options.nonce, await sha256Hex(r.rawNonce, webcrypto));
  assert.deepEqual(sent.options.scopes, ['email'], '이름은 요청하지 않는다');
});

test('initialize 는 apple 공급자만, 플러그인당 한 번', async () => {
  const plugin = fakePlugin();
  await getAppleIdToken({ plugin, crypto: webcrypto });
  await getAppleIdToken({ plugin, crypto: webcrypto });
  assert.equal(plugin.calls.init.length, 1);
  assert.ok(plugin.calls.init[0].apple);
  assert.equal(plugin.calls.init[0].google, undefined);
});

test('사용자가 창을 닫으면 cancelled (오류 아님)', async () => {
  for (const msg of ['The user canceled the authorization attempt', 'ASAuthorizationError error 1001', 'User cancelled']) {
    const r = await getAppleIdToken({ plugin: fakePlugin({ fail: msg }), crypto: webcrypto });
    assert.deepEqual(r, { cancelled: true }, msg);
  }
});

test('그 밖의 실패는 throw', async () => {
  await assert.rejects(getAppleIdToken({ plugin: fakePlugin({ fail: 'boom' }), crypto: webcrypto }), /boom/);
});

test('플러그인 없음·idToken 없음은 throw', async () => {
  await assert.rejects(getAppleIdToken({ plugin: undefined, crypto: webcrypto }), /plugin/);
  await assert.rejects(getAppleIdToken({ plugin: fakePlugin({ idToken: null }), crypto: webcrypto }), /idToken/);
});

test('"1001" 이 들어간 다른 오류는 취소로 삼키지 않는다', async () => {
  await assert.rejects(getAppleIdToken({ plugin: fakePlugin({ fail: 'HTTP 500 request 1001 failed' }), crypto: webcrypto }), /1001/);
});

test('🍎 iOS 계정 연결은 시도할 때마다 지금 게스트 저장을 다시 읽는다(낡은 스냅숏으로 비교 금지)', async () => {
  const { readFileSync } = await import('node:fs');
  const sc = readFileSync(new URL('../js/supabase-client.js', import.meta.url), 'utf8');
  const i = sc.indexOf('async function holdGuestBeforeLink');
  const body = sc.slice(i, sc.indexOf('\n}\n', i));
  assert.ok(i > 0);
  assert.doesNotMatch(body, /!pendingGuest/);
  assert.match(body, /readGuestSave\(state\.userId\)/);
});
