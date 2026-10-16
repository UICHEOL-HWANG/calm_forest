// tests/entitlements.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyPurchases } from '../js/shop/entitlements.js';

const gs = (o = {}) => ({
  cosmetics: { owned: ['scarf'], equipped: { head: null, neck: 'scarf', back: null, trail: null } },
  pets: {}, pet: null, cashOwned: [], ...o,
});
const row = (item_id, revoked_at = null) => ({ item_id, kind: 'x', revoked_at });

test('새 결제 — owned 에 추가, granted 에 실린다, cashOwned 갱신', () => {
  const r = applyPurchases(gs(), [row('straw_hat')]);
  assert.deepEqual(r.granted, [{ item_id: 'straw_hat', kind: 'cosmetic' }]);
  assert.deepEqual(r.revoked, []);
  assert.deepEqual(r.patch.cosmetics.owned, ['scarf', 'straw_hat']);
  assert.deepEqual(r.patch.cashOwned, ['straw_hat']);
  assert.equal(r.patch.cosmetics.equipped.neck, 'scarf', '기존 장착은 건드리지 않는다');
});

test('이미 본 결제는 다시 granted 로 잡지 않는다', () => {
  const r = applyPurchases(gs({ cosmetics: { owned: ['straw_hat'], equipped: { head: 'straw_hat', neck: null, back: null, trail: null } }, cashOwned: ['straw_hat'] }), [row('straw_hat')]);
  assert.deepEqual(r.granted, []);
  assert.deepEqual(r.patch.cosmetics.owned, ['straw_hat']);
});

test('환불 — owned 에서 빼고 장착도 푼다', () => {
  const r = applyPurchases(gs({ cosmetics: { owned: ['scarf', 'straw_hat'], equipped: { head: 'straw_hat', neck: 'scarf', back: null, trail: null } }, cashOwned: ['straw_hat'] }), [row('straw_hat', '2026-10-01T00:00:00Z')]);
  assert.deepEqual(r.revoked, [{ item_id: 'straw_hat', kind: 'cosmetic' }]);
  assert.deepEqual(r.patch.cosmetics.owned, ['scarf']);
  assert.equal(r.patch.cosmetics.equipped.head, null);
  assert.deepEqual(r.patch.cashOwned, []);
});

test('원장에 흔적 없이 사라진 항목은 그대로 둔다(빈 조회로 펫 성장을 잃지 않는다)', () => {
  const leaf = { kind: 'leaf', name: '콩', works: 30, restUntil: 0 };
  const g = gs({
    cosmetics: { owned: ['scarf', 'straw_hat'], equipped: { head: 'straw_hat', neck: 'scarf', back: null, trail: null } },
    pets: { leaf }, pet: leaf, cashOwned: ['straw_hat', 'leaf'],
  });
  const r = applyPurchases(g, []);
  assert.deepEqual(r.revoked, []);
  assert.deepEqual(r.granted, []);
  assert.deepEqual(r.patch.cosmetics.owned, ['scarf', 'straw_hat']);
  assert.equal(r.patch.cosmetics.equipped.head, 'straw_hat');
  assert.equal(r.patch.pets.leaf.works, 30, '펫 works 를 잃지 않는다');
  assert.equal(r.patch.pet, leaf);
  assert.deepEqual(r.patch.cashOwned, ['straw_hat', 'leaf']);
});

test('환불 뒤 재구매 — revoked 행과 새 live 행이 같이 오면 live 가 이긴다', () => {
  const g = gs({ cosmetics: { owned: ['scarf', 'straw_hat'], equipped: { head: 'straw_hat', neck: 'scarf', back: null, trail: null } }, cashOwned: ['straw_hat'] });
  const r = applyPurchases(g, [row('straw_hat', '2026-10-01T00:00:00Z'), row('straw_hat')]);
  assert.deepEqual(r.revoked, []);
  assert.deepEqual(r.granted, []);
  assert.deepEqual(r.patch.cosmetics.owned, ['scarf', 'straw_hat']);
  assert.deepEqual(r.patch.cashOwned, ['straw_hat']);
});

test('펫 — 결제로 추가(emptyPet), 환불로 제거 + 데리고 있던 펫이면 pet=null', () => {
  const a = applyPurchases(gs(), [row('leaf')]);
  assert.deepEqual(a.granted, [{ item_id: 'leaf', kind: 'pet' }]);
  assert.deepEqual(a.patch.pets.leaf, { kind: 'leaf', name: '', works: 0, restUntil: 0 });
  const leaf = { kind: 'leaf', name: '', works: 3, restUntil: 0 };
  const b = applyPurchases(gs({ pets: { leaf }, pet: leaf, cashOwned: ['leaf'] }), [row('leaf', '2026-10-01T00:00:00Z')]);
  assert.deepEqual(b.revoked, [{ item_id: 'leaf', kind: 'pet' }]);
  assert.equal(b.patch.pets.leaf, undefined);
  assert.equal(b.patch.pet, null);
});

test('이미 산 펫이 원장에 있으면 works 를 지우지 않는다', () => {
  const leaf = { kind: 'leaf', name: '콩', works: 50, restUntil: 0 };
  const r = applyPurchases(gs({ pets: { leaf }, pet: leaf }), [row('leaf')]);
  assert.equal(r.patch.pets.leaf.works, 50);
  assert.equal(r.patch.pet, leaf, 'pet 은 pets[kind] 와 같은 객체를 가리켜야 한다');
});

test('모르는 id 는 무시하되 cashOwned 에도 넣지 않는다', () => {
  const r = applyPurchases(gs(), [row('zzz')]);
  assert.deepEqual(r.granted, []);
  assert.deepEqual(r.patch.cashOwned, []);
});

test('rows 가 null(못 읽음)이면 patch 도 null', () => {
  const g = gs({ cashOwned: ['straw_hat'], cosmetics: { owned: ['straw_hat'], equipped: { head: null, neck: null, back: null, trail: null } } });
  const r = applyPurchases(g, null);
  assert.equal(r.patch, null);
  assert.deepEqual(r.granted, []); assert.deepEqual(r.revoked, []);
});

test('입력을 바꾸지 않는다', () => {
  const g = gs();
  const snap = JSON.stringify(g);
  applyPurchases(g, [row('straw_hat'), row('leaf')]);
  assert.equal(JSON.stringify(g), snap);
});

test('썰매 — 결제로 hut.sleds 에 추가, 타는 썰매는 그대로', () => {
  const g = gs({ mountain: { sled: { best: 41 }, hut: { sleds: ['basic', 'sky'], sled: 'sky' } } });
  const r = applyPurchases(g, [row('wind')]);
  assert.deepEqual(r.granted, [{ item_id: 'wind', kind: 'sled' }]);
  assert.deepEqual(r.patch.mountain.hut, { sleds: ['basic', 'sky', 'wind'], sled: 'sky' });
  assert.deepEqual(r.patch.mountain.sled, { best: 41 }, 'mountain 의 다른 칸은 그대로');
  assert.deepEqual(r.patch.cashOwned, ['wind']);
  assert.deepEqual(g.mountain.hut.sleds, ['basic', 'sky'], '원본은 바꾸지 않는다');
});

test('썰매 — 이미 코인으로 가진 썰매는 중복으로 넣지 않는다, mountain 이 없으면 기본 산장에서 시작', () => {
  const r = applyPurchases(gs({ mountain: { hut: { sleds: ['basic', 'acorn', 'wind'], sled: 'basic' } } }), [row('acorn')]);
  assert.deepEqual(r.patch.mountain.hut.sleds, ['basic', 'wind', 'acorn']);
  const r2 = applyPurchases(gs(), [row('skiff')]);
  assert.deepEqual(r2.patch.mountain.hut, { sleds: ['basic', 'skiff'], sled: 'basic' });
});

test('썰매 — 환불되면 빼고, 타던 썰매면 basic 으로', () => {
  const g = gs({ cashOwned: ['wind'], mountain: { sled: { best: 41 }, hut: { sleds: ['basic', 'wind'], sled: 'wind' } } });
  const r = applyPurchases(g, [{ item_id: 'wind', revoked_at: '2026-10-20T00:00:00Z' }]);
  assert.deepEqual(r.revoked, [{ item_id: 'wind', kind: 'sled' }]);
  assert.deepEqual(r.patch.mountain.hut, { sleds: ['basic'], sled: 'basic' });
  assert.deepEqual(r.patch.mountain.sled, { best: 41 });
  assert.deepEqual(r.patch.cashOwned, []);
});

test('썰매가 오가지 않으면 patch 에 mountain 이 없다', () => {
  const g = gs({ mountain: { hut: { sleds: ['basic', 'wind'], sled: 'wind' } }, cashOwned: ['wind'] });
  assert.ok(!('mountain' in applyPurchases(g, [row('straw_hat')]).patch));
  assert.ok(!('mountain' in applyPurchases(g, [row('wind')]).patch));
});

test('썰매 — cashOwned 에 있어도 산장에서 빠졌으면 다시 넣는다', () => {
  const g = gs({ cashOwned: ['wind'], mountain: { sled: { best: 41 }, hut: { sleds: ['basic', 'skiff'], sled: 'basic' } } });
  const r = applyPurchases(g, [row('wind')]);
  assert.deepEqual(r.granted, [{ item_id: 'wind', kind: 'sled' }]);
  assert.deepEqual(r.patch.mountain.hut, { sleds: ['basic', 'wind', 'skiff'], sled: 'basic' });
  assert.deepEqual(r.patch.mountain.sled, { best: 41 });
  assert.deepEqual(r.patch.cashOwned, ['wind']);
  assert.deepEqual(g.mountain.hut.sleds, ['basic', 'skiff']);
  const r2 = applyPurchases(gs({ cashOwned: ['acorn'] }), [row('acorn')]);
  assert.deepEqual(r2.patch.mountain.hut, { sleds: ['basic', 'acorn'], sled: 'basic' });
  assert.deepEqual(r2.patch.cashOwned, ['acorn']);
});

test('썰매 — cashOwned 에 있고 산장에도 있으면 다시 주지 않는다', () => {
  const g = gs({ cashOwned: ['wind'], mountain: { hut: { sleds: ['basic', 'wind'], sled: 'basic' } } });
  const r = applyPurchases(g, [row('wind')]);
  assert.deepEqual(r.granted, []);
  assert.ok(!('mountain' in r.patch));
  assert.deepEqual(r.patch.cashOwned, ['wind']);
});

test('코스메틱·펫은 cashOwned 에 있으면 다시 주지 않는다', () => {
  const r = applyPurchases(gs({ cashOwned: ['straw_hat'] }), [row('straw_hat')]);
  assert.deepEqual(r.granted, []);
  assert.deepEqual(r.patch.cosmetics.owned, ['scarf']);
});
