// tests/referral-flow.test.mjs — 🤝 친구 초대 흐름(js/referral/flow.js) — 부팅 보관 · 로그인 후 연결 · 정산
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captureInvite, runOnPlay } from '../js/referral/flow.js';
import { INVITE_STORE_KEY, MSG } from '../js/referral/rules.js';

function memStore(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), _m: m };
}
function deps(o = {}) {
  const calls = [], toasts = [], events = [];
  let resynced = 0; const resyncArgs = [];
  const responses = o.responses || {};
  return {
    storage: o.storage || memStore(),
    call: async (action, body) => { calls.push({ action, body }); return responses[action] ?? null; },
    toast: m => toasts.push(m),
    track: (e, p) => events.push([e, p]),
    resync: async (...a) => { resynced++; resyncArgs.push(a); },
    platform: 'web',
    auth: o.auth || { isGuest: false, provider: 'google' },
    get resynced() { return resynced; }, resyncArgs, calls, toasts, events,
  };
}

test('captureInvite — 코드를 보관하고 invite_land 를 한 번 기록 · 같은 코드 재방문은 다시 안 센다', () => {
  const d = deps();
  assert.equal(captureInvite({ search: '?invite=abcd2345', storage: d.storage, track: d.track }), 'ABCD2345');
  assert.equal(d.storage.getItem(INVITE_STORE_KEY), 'ABCD2345');
  captureInvite({ search: '?invite=ABCD2345', storage: d.storage, track: d.track });
  assert.deepEqual(d.events, [['invite_land', {}]]);
});

test('captureInvite — 코드가 없으면 보관분을 건드리지 않는다(OAuth 리다이렉트 복귀)', () => {
  const d = deps({ storage: memStore({ [INVITE_STORE_KEY]: 'ABCD2345' }) });
  assert.equal(captureInvite({ search: '', storage: d.storage, track: d.track }), 'ABCD2345');
});

test('runOnPlay — 로그인 계정 + 보관 코드: 연결 → 토스트 → 원장 재동기화 → 코드 삭제', async () => {
  const d = deps({ storage: memStore({ [INVITE_STORE_KEY]: 'ABCD2345' }), responses: { bind: { ok: true, welcome: 'friend_pin' }, claim: { active: 0, pending: 0, granted: [] } } });
  await runOnPlay(d);
  assert.deepEqual(d.calls[0], { action: 'bind', body: { code: 'ABCD2345', platform: 'web' } });
  assert.deepEqual(d.toasts, [MSG.bindOk]);
  assert.equal(d.resynced, 1);
  assert.deepEqual(d.resyncArgs[0], ['referral_bind', { quiet: true }], '하트핀 토스트와 도착 토스트가 겹치지 않게');
  assert.equal(d.storage.getItem(INVITE_STORE_KEY), null);
  assert.deepEqual(d.events.find(e => e[0] === 'referral_bind'), ['referral_bind', { result: 'ok' }]);
});

test('runOnPlay — 서버 거절이면 사유를 기록하고 코드는 지운다 · 네트워크 실패면 남긴다', async () => {
  const d1 = deps({ storage: memStore({ [INVITE_STORE_KEY]: 'ABCD2345' }), responses: { bind: { ok: false, reason: 'not_new' } } });
  await runOnPlay(d1);
  assert.deepEqual(d1.toasts, [MSG.notNew]);
  assert.equal(d1.storage.getItem(INVITE_STORE_KEY), null);
  assert.deepEqual(d1.events.find(e => e[0] === 'referral_bind'), ['referral_bind', { result: 'not_new' }]);

  const d2 = deps({ storage: memStore({ [INVITE_STORE_KEY]: 'ABCD2345' }), responses: { bind: null } });
  await runOnPlay(d2);
  assert.equal(d2.storage.getItem(INVITE_STORE_KEY), 'ABCD2345');
  assert.deepEqual(d2.toasts, []);
});

test('runOnPlay — 게스트는 연결도 정산도 부르지 않는다(코드는 로그인할 때까지 남긴다)', async () => {
  const d = deps({ auth: { isGuest: true, provider: 'anonymous' }, storage: memStore({ [INVITE_STORE_KEY]: 'ABCD2345' }) });
  const out = await runOnPlay(d);
  assert.equal(d.calls.length, 0);
  assert.equal(d.storage.getItem(INVITE_STORE_KEY), 'ABCD2345');
  assert.equal(out, null);
});

test('runOnPlay — 정산에서 새 보상이 오면 단계별 grant 이벤트 + 재동기화, 결과를 돌려준다', async () => {
  const claim = { active: 3, pending: 1, newly_active: 2, granted: ['tools_star', 'friendarch'] };
  const d = deps({ responses: { claim } });
  const out = await runOnPlay(d);
  assert.deepEqual(out, claim);
  assert.equal(d.resynced, 1);
  assert.deepEqual(d.events.filter(e => e[0] === 'referral_reward_grant'),
    [['referral_reward_grant', { item_id: 'tools_star', tier: 1 }], ['referral_reward_grant', { item_id: 'friendarch', tier: 3 }]]);
});

test('runOnPlay — 정산 쿨다운(throttled)·새 보상 없음이면 재동기화하지 않는다', async () => {
  const d = deps({ responses: { claim: { active: 1, pending: 0, granted: [], throttled: true } } });
  await runOnPlay(d);
  assert.equal(d.resynced, 0);
  assert.ok(!d.events.some(e => e[0] === 'referral_reward_grant'));
});

test('이벤트 파라미터는 5개 이하(GA4 상한·측정기준 칸 아끼기)', async () => {
  const d = deps({ storage: memStore({ [INVITE_STORE_KEY]: 'ABCD2345' }), responses: { bind: { ok: true }, claim: { active: 1, granted: ['tools_star'] } } });
  captureInvite({ search: '?invite=QWER2345', storage: memStore(), track: d.track });
  await runOnPlay(d);
  for (const [e, p] of d.events) assert.ok(Object.keys(p).length <= 5, e);
});
