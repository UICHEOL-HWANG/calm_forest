import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestTrackingConsent, reportAttResult } from '../js/tracking-consent.js';

function fakePlugin({ status = 'notDetermined', answer = 'authorized', fail } = {}) {
  const calls = { status: 0, request: 0 };
  return {
    calls,
    status: async () => { calls.status++; if (fail === 'status') throw new Error('boom'); return { status }; },
    request: async () => { calls.request++; if (fail === 'request') throw new Error('boom'); return { status: answer }; },
  };
}

function memStore() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}

const silent = { report: () => {}, store: null };

test('플러그인이 없으면 추적하지 않는다', async () => {
  assert.equal(await requestTrackingConsent({ plugin: undefined, ...silent }), false);
});

test('아직 묻지 않았으면 창을 띄우고 허용하면 true', async () => {
  const p = fakePlugin();
  assert.equal(await requestTrackingConsent({ plugin: p, ...silent }), true);
  assert.equal(p.calls.request, 1);
});

test('창에서 거부하면 false', async () => {
  const p = fakePlugin({ answer: 'denied' });
  assert.equal(await requestTrackingConsent({ plugin: p, ...silent }), false);
});

test('창이 뜨지 못해 미결정으로 끝나면 false', async () => {
  const p = fakePlugin({ answer: 'notDetermined' });
  assert.equal(await requestTrackingConsent({ plugin: p, ...silent }), false);
});

test('이미 허용했으면 창 없이 true', async () => {
  const p = fakePlugin({ status: 'authorized' });
  assert.equal(await requestTrackingConsent({ plugin: p, ...silent }), true);
  assert.equal(p.calls.request, 0);
});

for (const status of ['denied', 'restricted']) {
  test(`이미 ${status} 상태면 창 없이 false`, async () => {
    const p = fakePlugin({ status });
    assert.equal(await requestTrackingConsent({ plugin: p, ...silent }), false);
    assert.equal(p.calls.request, 0);
  });
}

for (const fail of ['status', 'request']) {
  test(`${fail} 호출이 실패하면 false`, async () => {
    const p = fakePlugin({ fail });
    assert.equal(await requestTrackingConsent({ plugin: p, ...silent }), false);
  });
}

function recorder() {
  const sent = [];
  return { sent, report: (params) => sent.push(params) };
}

test('창을 띄워 허용하면 att_result 에 authorized·asked=1', async () => {
  const r = recorder();
  await requestTrackingConsent({ plugin: fakePlugin(), report: r.report, store: memStore() });
  assert.deepEqual(r.sent, [{ status: 'authorized', asked: 1 }]);
});

test('이미 거부한 상태면 denied·asked=0', async () => {
  const r = recorder();
  await requestTrackingConsent({ plugin: fakePlugin({ status: 'denied' }), report: r.report, store: memStore() });
  assert.deepEqual(r.sent, [{ status: 'denied', asked: 0 }]);
});

test('창이 안 떠 미결정으로 끝나도 기록한다', async () => {
  const r = recorder();
  await requestTrackingConsent({ plugin: fakePlugin({ answer: 'notDetermined' }), report: r.report, store: memStore() });
  assert.deepEqual(r.sent, [{ status: 'notDetermined', asked: 1 }]);
});

test('같은 상태는 기기당 한 번만, 상태가 바뀌면 다시 보낸다', async () => {
  const r = recorder();
  const store = memStore();
  await requestTrackingConsent({ plugin: fakePlugin({ status: 'denied' }), report: r.report, store });
  await requestTrackingConsent({ plugin: fakePlugin({ status: 'denied' }), report: r.report, store });
  await requestTrackingConsent({ plugin: fakePlugin({ status: 'authorized' }), report: r.report, store });
  assert.deepEqual(r.sent.map(x => x.status), ['denied', 'authorized']);
});

test('플러그인 호출이 실패하면 error 로 기록하고 false', async () => {
  const r = recorder();
  assert.equal(await requestTrackingConsent({ plugin: fakePlugin({ fail: 'request' }), report: r.report, store: memStore() }), false);
  assert.deepEqual(r.sent, [{ status: 'error', asked: 1 }]);
});

test('플러그인이 없으면(웹·안드로이드) 기록하지 않는다', async () => {
  const r = recorder();
  await requestTrackingConsent({ plugin: undefined, report: r.report, store: memStore() });
  assert.deepEqual(r.sent, []);
});

test('기록이 실패해도 동의 결과는 그대로', async () => {
  const boom = () => { throw new Error('ga down'); };
  assert.equal(await requestTrackingConsent({ plugin: fakePlugin(), report: boom, store: memStore() }), true);
  assert.doesNotThrow(() => reportAttResult('denied', false, { report: boom, store: null }));
});
