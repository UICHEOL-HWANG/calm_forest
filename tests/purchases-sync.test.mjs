// tests/purchases-sync.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { syncPurchases, awaitGrant } from '../js/shop/purchases.js';

function world() {
  const gameState = { cosmetics: { owned: [], equipped: { head: null, neck: null, back: null, trail: null } }, pets: {}, pet: null, cashOwned: [] };
  const calls = { cos: 0, pet: 0, toasts: [], events: [], saves: 0 };
  const hooks = {
    applyCosmetics: () => calls.cos++, refreshPet: () => calls.pet++, toast: (m) => calls.toasts.push(m),
    track: (n, p) => calls.events.push([n, p]), requestSave: () => calls.saves++,
  };
  return { gameState, calls, hooks };
}

test('부팅 병합 — 새 결제가 있으면 gameState 에 반영·꾸미기 적용·저장·cash_grant(via boot)', async () => {
  const { gameState, calls, hooks } = world();
  const r = await syncPurchases({ gameState, fetchPurchases: async () => [{ item_id: 'straw_hat', kind: 'cosmetic', revoked_at: null }], hooks, via: 'boot' });
  assert.deepEqual(r.granted.map(g => g.item_id), ['straw_hat']);
  assert.deepEqual(gameState.cosmetics.owned, ['straw_hat']);
  assert.deepEqual(gameState.cashOwned, ['straw_hat']);
  assert.equal(calls.cos, 1); assert.equal(calls.pet, 0); assert.equal(calls.saves, 1);
  assert.deepEqual(calls.events, [['cash_grant', { item_id: 'straw_hat', kind: 'cosmetic', via: 'boot' }]]);
  assert.equal(calls.toasts.length, 1);
});

test('펫 결제는 refreshPet 을 부른다 · 환불은 cash_revoke', async () => {
  const { gameState, calls, hooks } = world();
  await syncPurchases({ gameState, fetchPurchases: async () => [{ item_id: 'leaf', kind: 'pet', revoked_at: null }], hooks, via: 'boot' });
  assert.equal(calls.pet, 1);
  assert.ok(gameState.pets.leaf);
  await syncPurchases({ gameState, fetchPurchases: async () => [{ item_id: 'leaf', kind: 'pet', revoked_at: '2026-10-01T00:00:00Z' }], hooks, via: 'boot' });
  assert.equal(gameState.pets.leaf, undefined);
  assert.deepEqual(calls.events.at(-1), ['cash_revoke', { item_id: 'leaf', kind: 'pet' }]);
});

test('변화가 없으면 아무 훅도 안 부른다', async () => {
  const { gameState, calls, hooks } = world();
  await syncPurchases({ gameState, fetchPurchases: async () => [], hooks, via: 'boot' });
  assert.equal(calls.cos + calls.pet + calls.saves + calls.toasts.length + calls.events.length, 0);
});

test('못 읽으면(null) null 을 돌려주고 gameState 는 그대로', async () => {
  const { gameState, calls, hooks } = world();
  gameState.cashOwned = ['straw_hat']; gameState.cosmetics.owned = ['straw_hat'];
  const r = await syncPurchases({ gameState, fetchPurchases: async () => null, hooks, via: 'boot' });
  assert.equal(r, null);
  assert.deepEqual(gameState.cosmetics.owned, ['straw_hat']);
  assert.equal(calls.saves, 0);
});

test('awaitGrant — 원장에 보일 때까지 폴링, 보이면 true 를 돌려주고 via=instant', async () => {
  const { gameState, calls, hooks } = world();
  let n = 0;
  const fetchPurchases = async () => (++n < 3 ? [] : [{ item_id: 'straw_hat', kind: 'cosmetic', revoked_at: null }]);
  const ok = await awaitGrant({ itemId: 'straw_hat', gameState, fetchPurchases, hooks, tries: 5, sleep: async () => {} });
  assert.equal(ok, true);
  assert.equal(n, 3);
  assert.deepEqual(calls.events, [['cash_grant', { item_id: 'straw_hat', kind: 'cosmetic', via: 'instant' }]]);
});

test('awaitGrant — 끝까지 안 오면 false, 토스트 없음(호출부가 안내)', async () => {
  const { gameState, calls, hooks } = world();
  const ok = await awaitGrant({ itemId: 'straw_hat', gameState, fetchPurchases: async () => [], hooks, tries: 3, sleep: async () => {} });
  assert.equal(ok, false);
  assert.equal(calls.toasts.length, 0);
});
