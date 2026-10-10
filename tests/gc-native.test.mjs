// 🍎 iOS 앱 게임센터 자동 로그인 — js/gc-native.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getGcIdentity } from '../js/gc-native.js';

const IDENTITY = { publicKeyUrl: 'https://static.gc.apple.com/public-key/gc-prod-10.cer', signature: 'c2ln', salt: 'c2FsdA==',
                   timestamp: '1760000000000', teamPlayerID: 'T:_abc', bundleID: 'com.cheorish.lab.calmforest' };

function fakePlugin({ authed = true, signInResult = true, identity = IDENTITY, fail } = {}) {
  const calls = { isAuthenticated: 0, signIn: 0, fetchIdentity: 0 };
  return {
    calls,
    isAuthenticated: async () => { calls.isAuthenticated++; return { authenticated: authed }; },
    signIn: async () => { calls.signIn++; return { authenticated: signInResult }; },
    fetchIdentity: async () => { calls.fetchIdentity++; if (fail) throw new Error(fail); return identity; },
  };
}

test('플러그인이 없으면 사유를 담아 던진다(앱 빌드 누락)', async () => {
  await assert.rejects(getGcIdentity({ plugin: undefined }), /plugin/);
});

test('자동 로그인 성공 → 창 없이 신원 서명을 받는다', async () => {
  const p = fakePlugin();
  assert.deepEqual(await getGcIdentity({ plugin: p }), { identity: IDENTITY });
  assert.equal(p.calls.signIn, 0);
});

test('미로그인 + 비대화형(부팅) → 창을 띄우지 않고 notSignedIn', async () => {
  const p = fakePlugin({ authed: false });
  assert.deepEqual(await getGcIdentity({ plugin: p }), { notSignedIn: true });
  assert.equal(p.calls.signIn, 0);
  assert.equal(p.calls.fetchIdentity, 0);
});

test('미로그인 + 대화형(버튼) → 로그인 창 한 번, 성공하면 신원', async () => {
  const p = fakePlugin({ authed: false });
  assert.deepEqual(await getGcIdentity({ plugin: p, interactive: true }), { identity: IDENTITY });
  assert.equal(p.calls.signIn, 1);
});

test('대화형인데 사용자가 닫음 → notSignedIn', async () => {
  const p = fakePlugin({ authed: false, signInResult: false });
  assert.deepEqual(await getGcIdentity({ plugin: p, interactive: true }), { notSignedIn: true });
});

test('신원 필드가 빠지면 던진다(서버로 반쪽 요청을 보내지 않게)', async () => {
  const { salt, ...partial } = IDENTITY;
  await assert.rejects(getGcIdentity({ plugin: fakePlugin({ identity: partial }) }), /salt/);
  await assert.rejects(getGcIdentity({ plugin: fakePlugin({ fail: 'GKError 3' }) }), /GKError/);
});
