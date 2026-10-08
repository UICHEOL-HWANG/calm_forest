import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.location ??= { search: '', hostname: 'localhost', origin: 'http://localhost' };
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.navigator ??= { language: 'ko-KR', userAgent: 'node' };
const { decideScreen, addToSlots } = await import('../js/aura/workshop-rules.js');

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
