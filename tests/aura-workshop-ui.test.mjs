import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.location ??= { search: '', hostname: 'localhost', origin: 'http://localhost' };
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.navigator ??= { language: 'ko-KR', userAgent: 'node' };
const { decideScreen, addToSlots, claimPlan } = await import('../js/aura/workshop-rules.js');

const TODAY = '2026-10-09';
const o = (status, order_date = '2026-10-08') => ({ id: status + order_date, status, order_date });

test('화면 결정: 받을 게 있으면 수령이 최우선', () => {
  assert.equal(decideScreen([o('done')], TODAY, false), 'claim');
  assert.equal(decideScreen([o('fallback')], TODAY, true), 'claim');
  assert.equal(decideScreen([o('pending', TODAY)], TODAY, true), 'waiting');
  assert.equal(decideScreen([o('claimed', TODAY)], TODAY, true), 'done');
  assert.equal(decideScreen([o('claimed')], TODAY, true), 'order');
  assert.equal(decideScreen([], TODAY, false), 'daytime');
  assert.equal(decideScreen([], TODAY, true), 'order');
});

test('보관함: 3칸까지 추가, 가득이면 full, 바꿀 칸 지정 시 교체', () => {
  const slot = id => ({ id, recipe: {}, tune: {} });
  let a = { slots: [], equipped: null };
  for (const id of ['a', 'b', 'c']) a = addToSlots(a, slot(id)).aura;
  assert.equal(a.slots.length, 3);
  const full = addToSlots(a, slot('d'));
  assert.equal(full.full, true);
  assert.equal(full.aura, a, '가득이면 그대로');
  const swapped = addToSlots({ ...a, equipped: 'b' }, slot('d'), 'b').aura;
  assert.deepEqual(swapped.slots.map(s => s.id), ['a', 'd', 'c']);
  assert.equal(swapped.equipped, null, '지운 칸이 장착 중이면 벗긴다');
});

test('받기 계획: 가득이고 비울 칸 미지정이면 서버 호출 없이 교체 화면', () => {
  const full = { slots: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], equipped: null };
  assert.equal(claimPlan(full, undefined), 'replace');
  assert.equal(claimPlan(full, 'b'), 'claim');
  assert.equal(claimPlan({ slots: [{ id: 'a' }], equipped: null }, undefined), 'claim');
});

test('보관함: 같은 id 는 한 번만, 없는 replaceId 는 변화 없음', () => {
  const a = { slots: [{ id: 'a' }, { id: 'b' }], equipped: 'a' };
  const dup = addToSlots(a, { id: 'a' });
  assert.equal(dup.aura, a);
  assert.equal(dup.full, false);
  const miss = addToSlots(a, { id: 'z' }, 'nope').aura;
  assert.deepEqual(miss.slots.map(s => s.id), ['a', 'b']);
  assert.equal(miss.equipped, 'a');
});
