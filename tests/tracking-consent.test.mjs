import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestTrackingConsent } from '../js/tracking-consent.js';

function fakePlugin({ status = 'notDetermined', answer = 'authorized', fail } = {}) {
  const calls = { status: 0, request: 0 };
  return {
    calls,
    status: async () => { calls.status++; if (fail === 'status') throw new Error('boom'); return { status }; },
    request: async () => { calls.request++; if (fail === 'request') throw new Error('boom'); return { status: answer }; },
  };
}

test('플러그인이 없으면 추적하지 않는다', async () => {
  assert.equal(await requestTrackingConsent({ plugin: undefined }), false);
});

test('아직 묻지 않았으면 창을 띄우고 허용하면 true', async () => {
  const p = fakePlugin();
  assert.equal(await requestTrackingConsent({ plugin: p }), true);
  assert.equal(p.calls.request, 1);
});

test('창에서 거부하면 false', async () => {
  const p = fakePlugin({ answer: 'denied' });
  assert.equal(await requestTrackingConsent({ plugin: p }), false);
});

test('창이 뜨지 못해 미결정으로 끝나면 false', async () => {
  const p = fakePlugin({ answer: 'notDetermined' });
  assert.equal(await requestTrackingConsent({ plugin: p }), false);
});

test('이미 허용했으면 창 없이 true', async () => {
  const p = fakePlugin({ status: 'authorized' });
  assert.equal(await requestTrackingConsent({ plugin: p }), true);
  assert.equal(p.calls.request, 0);
});

for (const status of ['denied', 'restricted']) {
  test(`이미 ${status} 상태면 창 없이 false`, async () => {
    const p = fakePlugin({ status });
    assert.equal(await requestTrackingConsent({ plugin: p }), false);
    assert.equal(p.calls.request, 0);
  });
}

for (const fail of ['status', 'request']) {
  test(`${fail} 호출이 실패하면 false`, async () => {
    const p = fakePlugin({ fail });
    assert.equal(await requestTrackingConsent({ plugin: p }), false);
  });
}
