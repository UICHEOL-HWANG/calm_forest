// 📱 구글 플레이 앱 Play Games 자동 로그인 — js/pgs-native.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPgsAuthCode } from '../js/pgs-native.js';

const SERVER_ID = 'server.apps.googleusercontent.com';

function fakePlugin({ authed = true, signInResult = true, authCode = 'code-123', fail } = {}) {
  const calls = { isAuthenticated: 0, signIn: 0, access: [] };
  return {
    calls,
    isAuthenticated: async () => { calls.isAuthenticated++; return { authenticated: authed }; },
    signIn: async () => { calls.signIn++; return { authenticated: signInResult }; },
    requestServerSideAccess: async (o) => {
      calls.access.push(o);
      if (fail) throw new Error(fail);
      return { authCode };
    },
  };
}

test('플러그인이 없으면 사유를 담아 던진다(앱 빌드 누락)', async () => {
  await assert.rejects(getPgsAuthCode({ plugin: undefined, serverClientId: SERVER_ID }), /plugin/);
});

test('서버 클라이언트 ID 가 없으면 던진다', async () => {
  await assert.rejects(getPgsAuthCode({ plugin: fakePlugin(), serverClientId: '' }), /serverClientId/);
});

test('자동 로그인 성공 → 서버 클라이언트 ID 로 authCode 를 받는다', async () => {
  const plugin = fakePlugin();
  const r = await getPgsAuthCode({ plugin, serverClientId: SERVER_ID });
  assert.deepEqual(r, { authCode: 'code-123' });
  assert.deepEqual(plugin.calls.access, [{ serverClientId: SERVER_ID }]);
  assert.equal(plugin.calls.signIn, 0);
});

test('자동 로그인 실패 + 비대화형(부팅) → 창을 띄우지 않고 notSignedIn', async () => {
  const plugin = fakePlugin({ authed: false });
  const r = await getPgsAuthCode({ plugin, serverClientId: SERVER_ID });
  assert.deepEqual(r, { notSignedIn: true });
  assert.equal(plugin.calls.signIn, 0);
  assert.equal(plugin.calls.access.length, 0);
});

test('자동 로그인 실패 + 대화형(버튼) → signIn 한 번 더 시도', async () => {
  const plugin = fakePlugin({ authed: false, signInResult: true });
  const r = await getPgsAuthCode({ plugin, serverClientId: SERVER_ID, interactive: true });
  assert.deepEqual(r, { authCode: 'code-123' });
  assert.equal(plugin.calls.signIn, 1);
});

test('대화형에서도 거절하면 notSignedIn', async () => {
  const plugin = fakePlugin({ authed: false, signInResult: false });
  const r = await getPgsAuthCode({ plugin, serverClientId: SERVER_ID, interactive: true });
  assert.deepEqual(r, { notSignedIn: true });
});

test('authCode 가 비어 있으면 던진다', async () => {
  await assert.rejects(getPgsAuthCode({ plugin: fakePlugin({ authCode: '' }), serverClientId: SERVER_ID }), /authCode/);
});
