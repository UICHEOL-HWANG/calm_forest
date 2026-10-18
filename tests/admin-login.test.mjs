import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLoginFlow } from '../dashboards/js/admin-login.js';

function mockSb({ sendError = null, verify = { data: { session: {} }, error: null } } = {}) {
  const calls = [];
  return {
    calls,
    auth: {
      signInWithOtp: async (args) => { calls.push(['otp', args]); return { error: sendError }; },
      verifyOtp: async (args) => { calls.push(['verify', args]); return verify; },
    },
  };
}

test('sends code without creating new users', async () => {
  const sb = mockSb();
  const flow = createLoginFlow(sb);
  const r = await flow.send('  Admin@Example.com ');
  assert.equal(r.ok, true);
  assert.deepEqual(sb.calls[0], ['otp', { email: 'admin@example.com', options: { shouldCreateUser: false } }]);
});

test('rejects malformed email before calling server', async () => {
  const sb = mockSb();
  const r = await createLoginFlow(sb).send('nope');
  assert.equal(r.ok, false);
  assert.equal(sb.calls.length, 0);
});

test('unknown account gets a clear message', async () => {
  const sb = mockSb({ sendError: { message: 'Signups not allowed for otp', status: 422 } });
  const r = await createLoginFlow(sb).send('x@example.com');
  assert.equal(r.ok, false);
  assert.match(r.msg, /등록된 계정이 아니에요/);
});

test('verify requires a sent email and a long enough code', async () => {
  const sb = mockSb();
  const flow = createLoginFlow(sb);
  assert.equal((await flow.verify('123456')).ok, false);
  await flow.send('a@example.com');
  assert.equal((await flow.verify('123')).ok, false);
  const r = await flow.verify('482 193');
  assert.equal(r.ok, true);
  assert.deepEqual(sb.calls.at(-1), ['verify', { email: 'a@example.com', token: '482193', type: 'email' }]);
});

test('expired code maps to invalid_code message', async () => {
  const sb = mockSb({ verify: { data: {}, error: { code: 'otp_expired', message: 'Token has expired or is invalid' } } });
  const flow = createLoginFlow(sb);
  await flow.send('a@example.com');
  const r = await flow.verify('123456');
  assert.equal(r.ok, false);
  assert.match(r.msg, /만료/);
});

test('every admin page gate uses the shared login gate', () => {
  for (const f of ['dashboards/js/admin-common.js', 'dashboards/notices_admin.html', 'dashboards/beta_monitor.html']) {
    const src = readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
    assert.match(src, /mountLoginGate\(sb\)/, f);
    assert.doesNotMatch(src, /게임에서 먼저 로그인/, f);
  }
});
