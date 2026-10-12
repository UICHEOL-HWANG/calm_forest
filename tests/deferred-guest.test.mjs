// =============================================================
//  🧪 E2 처치 — 익명 계정은 첫 실제 입력 뒤에 (js/auth/deferred-guest.js)
//  크롤러가 페이지만 열고 떠나면 계정이 생기지 않아야 한다.
// =============================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIRST_INPUT_EVENTS, onFirstInput, upgradeGuest, armDeferredGuest } from '../js/auth/deferred-guest.js';

function fakeTarget() {
  const map = new Map();
  return {
    addEventListener: (t, h) => map.set(t, [...(map.get(t) || []), h]),
    removeEventListener: (t, h) => map.set(t, (map.get(t) || []).filter(x => x !== h)),
    fire: (type, isTrusted = true) => (map.get(type) || []).forEach(h => h({ type, isTrusted })),
    count: () => [...map.values()].reduce((n, a) => n + a.length, 0),
  };
}

test('입력 종류는 이동·탭(포인터·터치·키)', () => {
  assert.deepEqual([...FIRST_INPUT_EVENTS].sort(), ['keydown', 'pointerdown', 'touchstart']);
});

test('첫 실제 입력에 한 번만 부르고 리스너를 모두 뗀다', () => {
  const t = fakeTarget(); const seen = [];
  onFirstInput(t, (type) => seen.push(type));
  assert.equal(t.count(), FIRST_INPUT_EVENTS.length);
  t.fire('keydown'); t.fire('pointerdown');
  assert.deepEqual(seen, ['keydown']);
  assert.equal(t.count(), 0);
});

test('스크립트가 만든 가짜 이벤트(isTrusted=false)는 입력으로 치지 않는다', () => {
  const t = fakeTarget(); const seen = [];
  onFirstInput(t, (type) => seen.push(type));
  t.fire('pointerdown', false);
  assert.deepEqual(seen, []);
  t.fire('touchstart');
  assert.deepEqual(seen, ['touchstart']);
});

test('입력이 없으면 계정을 만들지 않는다 — 떼기만 해도 끝', () => {
  const t = fakeTarget(); let called = 0;
  const off = onFirstInput(t, () => called++);
  off();
  t.fire('pointerdown');
  assert.equal(called, 0);
});

test('업그레이드 — 익명 로그인 뒤 세이브를 다시 읽어 저장 빗장을 맞춘다', async () => {
  const calls = []; const ev = [];
  const r = await upgradeGuest({
    signInAsGuest: async () => { calls.push('signIn'); return { online: true }; },
    loadGame: async () => { calls.push('load'); return { canSave: true }; },
    track: (n, p) => ev.push([n, p]),
    wait: async () => {},
  });
  assert.deepEqual(calls, ['signIn', 'load']);
  assert.equal(r.online, true);
  assert.deepEqual(ev, [['deferred_guest', { result: 'ok' }]]);
});

test('업그레이드 — 읽기가 실패하면 잠시 뒤 다시 읽는다(상한 있음)', async () => {
  let n = 0;
  await upgradeGuest({
    signInAsGuest: async () => ({ online: true }),
    loadGame: async () => ({ canSave: ++n >= 3 }),
    track: () => {}, wait: async () => {},
  });
  assert.equal(n, 3);
  let m = 0;
  await upgradeGuest({ signInAsGuest: async () => ({ online: true }), loadGame: async () => (m++, { canSave: false }), track: () => {}, wait: async () => {} });
  assert.equal(m, 12);
});

test('계정 만들기가 실패하면 다음 입력에서 다시 — 상한까지', async () => {
  const t = fakeTarget(); let tries = 0;
  armDeferredGuest(t, async () => (tries++, { online: tries >= 2 }), { maxTries: 3 });
  t.fire('pointerdown'); await new Promise(r => setTimeout(r, 0));
  assert.equal(tries, 1); assert.equal(t.count(), FIRST_INPUT_EVENTS.length, '실패 뒤 다시 건다');
  t.fire('keydown'); await new Promise(r => setTimeout(r, 0));
  assert.equal(tries, 2); assert.equal(t.count(), 0, '성공하면 뗀다');
  const t2 = fakeTarget(); let n = 0;
  armDeferredGuest(t2, async () => (n++, { online: false }), { maxTries: 3 });
  for (let i = 0; i < 5; i++) { t2.fire('pointerdown'); await new Promise(r => setTimeout(r, 0)); }
  assert.equal(n, 3); assert.equal(t2.count(), 0);
});

test('업그레이드가 던져도 다음 입력에서 다시', async () => {
  const t = fakeTarget(); let n = 0;
  armDeferredGuest(t, async () => { n++; if (n === 1) throw new Error('net'); return { online: true }; });
  t.fire('pointerdown'); await new Promise(r => setTimeout(r, 0));
  t.fire('pointerdown'); await new Promise(r => setTimeout(r, 0));
  assert.equal(n, 2); assert.equal(t.count(), 0);
});

test('업그레이드 — 익명 로그인이 안 되면(오프라인) 세이브는 다시 읽지 않는다', async () => {
  let loads = 0; const ev = [];
  await upgradeGuest({ signInAsGuest: async () => ({ online: false }), loadGame: async () => (loads++, {}), track: (n, p) => ev.push([n, p]), wait: async () => {} });
  assert.equal(loads, 0);
  assert.deepEqual(ev, [['deferred_guest', { result: 'offline' }]]);
});
