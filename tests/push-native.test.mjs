// 🔔 안드로이드 푸시 — 권한·등록·토큰 전송 흐름(플러그인 주입, 순수)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enablePush, refreshPush, disablePush, onPushOpen, PUSH_CHANNEL } from '../js/push-native.js';

function fakePlugin({ perm = 'prompt', after = 'granted', token = 'tok-' + 'x'.repeat(40), regError = null } = {}) {
  const calls = [];
  const listeners = {};
  const plugin = {
    checkPermissions: async () => { calls.push('check'); return { receive: perm }; },
    requestPermissions: async () => { calls.push('request'); return { receive: after }; },
    createChannel: async (c) => { calls.push(['channel', c.id]); },
    register: async () => {
      calls.push('register');
      queueMicrotask(() => regError ? listeners.registrationError?.({ error: regError }) : listeners.registration?.({ value: token }));
    },
  };
  const listen = (event, cb) => { listeners[event] = cb; return { remove: () => { delete listeners[event]; } }; };
  return { plugin, listen, calls, listeners };
}

test('플러그인이 없으면(웹·토스·itch·옛 앱) unavailable', async () => {
  assert.deepEqual(await enablePush({ plugin: undefined, listen: () => {}, post: async () => {} }), { result: 'unavailable' });
});

test('권한 요청 → 채널 → 등록 → 토큰을 서버로', async () => {
  const f = fakePlugin(); const posted = [];
  const r = await enablePush({ ...f, post: async b => { posted.push(b); return true; }, lang: 'ko', tz: 'Asia/Seoul' });
  assert.equal(r.result, 'granted');
  assert.deepEqual(f.calls, ['check', 'request', ['channel', PUSH_CHANNEL], 'register']);
  assert.deepEqual(posted, [{ token: r.token, enabled: true, lang: 'ko', tz: 'Asia/Seoul' }]);
  assert.deepEqual(Object.keys(f.listeners), [], '리스너는 끝나면 뗀다');
});

test('거절하면 denied — 등록하지 않는다', async () => {
  const f = fakePlugin({ after: 'denied' });
  const r = await enablePush({ ...f, post: async () => true });
  assert.equal(r.result, 'denied');
  assert.ok(!f.calls.includes('register'));
});

test('이미 허용돼 있으면 다시 묻지 않는다', async () => {
  const f = fakePlugin({ perm: 'granted' });
  await enablePush({ ...f, post: async () => true });
  assert.ok(!f.calls.includes('request'));
});

test('등록 오류·서버 실패는 error', async () => {
  assert.equal((await enablePush({ ...fakePlugin({ regError: 'SERVICE_NOT_AVAILABLE' }), post: async () => true })).result, 'error');
  assert.equal((await enablePush({ ...fakePlugin(), post: async () => false })).result, 'error');
});

test('refreshPush — 권한이 이미 있을 때만 조용히 재등록(팝업 없음)', async () => {
  const no = fakePlugin({ perm: 'prompt' });
  assert.equal((await refreshPush({ ...no, post: async () => true })).result, 'skipped');
  assert.ok(!no.calls.includes('request'));
  const yes = fakePlugin({ perm: 'granted' }); const posted = [];
  assert.equal((await refreshPush({ ...yes, post: async b => { posted.push(b); return true; }, lang: 'en' })).result, 'granted');
  assert.equal(posted[0].lang, 'en');
});

test('disablePush — 마지막 토큰으로 enabled:false', async () => {
  const posted = [];
  assert.equal(await disablePush({ token: 'tok-' + 'y'.repeat(40), post: async b => { posted.push(b); return true; } }), true);
  assert.deepEqual(posted, [{ token: 'tok-' + 'y'.repeat(40), enabled: false }]);
  assert.equal(await disablePush({ token: null, post: async () => true }), false);
});

test('onPushOpen — 알림을 눌러 열면 data(kind·send_id)를 넘긴다', () => {
  const f = fakePlugin(); let got;
  onPushOpen(f.listen, d => { got = d; });
  f.listeners.pushNotificationActionPerformed({ actionId: 'tap', notification: { data: { kind: 'night', send_id: 'abc' } } });
  assert.deepEqual(got, { kind: 'night', send_id: 'abc' });
});

test('🍎 연결부 — 안드로이드·iOS 앱에서 켜지고 등록 때 플랫폼을 보낸다', async () => {
  const { readFileSync } = await import('node:fs');
  const ui = readFileSync(new URL('../js/push-ui.js', import.meta.url), 'utf8');
  assert.match(ui, /const available = \(\) => \(IS_ANDROID \|\| IS_IOS\) && !!capPlugin\('PushNotifications'\)/);
  assert.match(ui, /platform: PLATFORM/);
  assert.match(readFileSync(new URL('../sql/migrations/migrate_push_ios.sql', import.meta.url), 'utf8'), /platform in \('android', ?'ios'\)/);
});

test('실패 단계·사유를 함께 돌려준다 — 서버 기록용', async () => {
  const denied = await enablePush({ ...fakePlugin({ after: 'denied' }), post: async () => true });
  assert.deepEqual({ result: denied.result, stage: denied.stage }, { result: 'denied', stage: 'permission' });
  const reg = await enablePush({ ...fakePlugin({ regError: 'no valid aps-environment' }), post: async () => true });
  assert.deepEqual({ result: reg.result, stage: reg.stage, reason: reg.reason }, { result: 'error', stage: 'register', reason: 'no valid aps-environment' });
  const post = await enablePush({ ...fakePlugin(), post: async () => false });
  assert.deepEqual({ result: post.result, stage: post.stage }, { result: 'error', stage: 'post' });
  const boom = await enablePush({ plugin: { checkPermissions: async () => { throw new Error('bridge gone'); } }, listen: () => ({}), post: async () => true });
  assert.deepEqual({ result: boom.result, stage: boom.stage, reason: boom.reason }, { result: 'error', stage: 'exception', reason: 'bridge gone' });
});

test('등록 오류 사유는 문자열·객체 어느 쪽이든 200자 안으로', async () => {
  const obj = await enablePush({ ...fakePlugin({ regError: { message: 'x'.repeat(500) } }), post: async () => true });
  assert.equal(obj.reason.length, 200);
});
