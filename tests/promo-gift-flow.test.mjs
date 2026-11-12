import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captureCode, pendingCode, runPromoGift } from '../js/promo-gift/flow.js';
import { KEYS, STAGE1_BUNDLE } from '../js/promo-gift/rules.js';

function mem(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
}
const GUEST = { isGuest: true, provider: 'anonymous' };
const MEMBER = { isGuest: false, provider: 'email' };

function harness(replies, storage) {
  const calls = [], grants = [], shows = [], events = [];
  const deps = {
    storage,
    call: async (stage, code) => { calls.push([stage, code]); return replies.shift(); },
    grant: (b) => grants.push(b),
    show: async (v) => { shows.push(v); },
    track: (ev, p) => events.push([ev, p]),
  };
  return { deps, calls, grants, shows, events };
}

test('captureCode — 저장·도착 이벤트·같은 링크 재전달 무시·수동 입력은 다시 받음', () => {
  const s = mem();
  const ev = [];
  const track = (e, p) => ev.push([e, p]);
  assert.equal(captureCode({ storage: s, code: 'insta1', via: 'deeplink', track }), 'INSTA1');
  assert.equal(s.getItem(KEYS.code), 'INSTA1');
  assert.equal(s.getItem(KEYS.via), 'deeplink');
  assert.deepEqual(ev, [['promo_gift_arrive', { code: 'INSTA1', via: 'deeplink' }]]);
  s.removeItem(KEYS.code);
  assert.equal(captureCode({ storage: s, code: 'INSTA1', via: 'deeplink', track }), null);
  assert.equal(captureCode({ storage: s, code: 'INSTA1', via: 'manual', force: true, track }), 'INSTA1');
  assert.equal(captureCode({ storage: s, code: 'x', via: 'url', track }), null);
  assert.equal(pendingCode(s), 'INSTA1');
});

test('게스트 1단계 신규 → 지급·기기 표시·코드 유지·창 1장', async () => {
  const s = mem({ [KEYS.code]: 'INSTA1' });
  const h = harness([{ ok: true, new: true, label: '인스타그램에서 온 초대장', label_en: 'From Instagram' }], s);
  const views = await runPromoGift({ auth: GUEST, ...h.deps });
  assert.deepEqual(h.calls, [[1, 'INSTA1']]);
  assert.deepEqual(h.grants, [STAGE1_BUNDLE]);
  assert.equal(s.getItem(KEYS.device), '1');
  assert.equal(s.getItem(KEYS.code), 'INSTA1');
  assert.deepEqual(views, [{ stage: 1, label: '인스타그램에서 온 초대장', labelEn: 'From Instagram', loggedIn: false }]);
  assert.deepEqual(h.events, [['promo_gift_claim', { code: 'INSTA1', step: 1, result: 'new' }]]);
});

test('같은 기기의 새 게스트는 아무것도 안 부른다', async () => {
  const s = mem({ [KEYS.code]: 'INSTA1', [KEYS.device]: '1' });
  const h = harness([], s);
  assert.deepEqual(await runPromoGift({ auth: GUEST, ...h.deps }), []);
  assert.deepEqual(h.calls, []);
});

test('게스트였던 기기에서 로그인 → 2단계만, 코드 지움', async () => {
  const s = mem({ [KEYS.code]: 'INSTA1', [KEYS.device]: '1' });
  const h = harness([{ ok: true, new: true, label: 'L', label_en: 'E', items: ['promoballoon', 'promosuitcase'] }], s);
  const views = await runPromoGift({ auth: MEMBER, ...h.deps });
  assert.deepEqual(h.calls, [[2, 'INSTA1']]);
  assert.deepEqual(h.grants, []);
  assert.equal(s.getItem(KEYS.code), null);
  assert.deepEqual(views, [{ stage: 2, label: 'L', labelEn: 'E', loggedIn: true }]);
});

test('처음 온 로그인 유저 → 1·2단계 연속, 창 2장 순서대로', async () => {
  const s = mem({ [KEYS.code]: 'INSTA1' });
  const h = harness([{ ok: true, new: true, label: 'L', label_en: 'E' }, { ok: true, new: true, label: 'L', label_en: 'E' }], s);
  await runPromoGift({ auth: MEMBER, ...h.deps });
  assert.deepEqual(h.calls, [[1, 'INSTA1'], [2, 'INSTA1']]);
  assert.deepEqual(h.shows.map(v => [v.stage, v.loggedIn]), [[1, true], [2, true]]);
  assert.equal(s.getItem(KEYS.code), null);
});

test('1단계 실패(만료)면 2단계를 안 부르고 코드를 지운다', async () => {
  const s = mem({ [KEYS.code]: 'OLD1' });
  const h = harness([{ ok: false, reason: 'expired' }], s);
  await runPromoGift({ auth: MEMBER, ...h.deps });
  assert.deepEqual(h.calls, [[1, 'OLD1']]);
  assert.equal(s.getItem(KEYS.code), null);
  assert.deepEqual(h.shows, []);
});

test('네트워크 실패는 코드를 남기고 창을 안 띄운다', async () => {
  const s = mem({ [KEYS.code]: 'INSTA1' });
  const h = harness([null], s);
  await runPromoGift({ auth: GUEST, ...h.deps });
  assert.equal(s.getItem(KEYS.code), 'INSTA1');
  assert.equal(s.getItem(KEYS.device), null);
  assert.deepEqual(h.events, [['promo_gift_claim', { code: 'INSTA1', step: 1, result: 'net_fail' }]]);
});

test('창은 하나씩 — 앞 창이 닫혀야 다음 창', async () => {
  const s = mem({ [KEYS.code]: 'INSTA1' });
  const order = [];
  let release;
  const first = new Promise(r => { release = r; });
  const p = runPromoGift({
    auth: MEMBER, storage: s, track: () => {}, grant: () => {},
    call: async () => ({ ok: true, new: true, label: 'L', label_en: 'E' }),
    show: async (v) => { order.push(`open${v.stage}`); if (v.stage === 1) await first; order.push(`close${v.stage}`); },
  });
  await new Promise(r => setTimeout(r, 0));
  assert.deepEqual(order, ['open1']);
  release();
  await p;
  assert.deepEqual(order, ['open1', 'close1', 'open2', 'close2']);
});

test('저장소가 깨져도 던지지 않는다', async () => {
  const broken = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
  assert.equal(pendingCode(broken), null);
  assert.equal(captureCode({ storage: broken, code: 'INSTA1', via: 'url', track: () => {} }), null);
  assert.deepEqual(await runPromoGift({ auth: GUEST, storage: broken, call: async () => null, grant: () => {}, show: async () => {}, track: () => {} }), []);
});
