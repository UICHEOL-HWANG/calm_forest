import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PREPASS_CAPS, repeatOpen, sellBonus, rushSlots, rushTargets } from '../js/guide/prepass-rules.js';

test('반복 자리는 집을 다 지은 뒤에만 연다', () => {
  assert.equal(repeatOpen(2), false);
  assert.equal(repeatOpen(3), true);
  assert.equal(repeatOpen(undefined), false);
});

test('판매 웃돈은 절반, 코인 상한까지', () => {
  assert.equal(sellBonus(30), 15);
  assert.equal(sellBonus(5), 3);
  assert.equal(sellBonus(1000), PREPASS_CAPS.coins);
  assert.equal(sellBonus(0), 0);
  assert.equal(sellBonus(NaN), 0);
});

test('가공 즉시 완성은 그 시설 칸만 어제로 돌려 새 배열로 준다', () => {
  const slots = [{ item: 'charcoal', qty: 1, grade: 1, day: '2026-11-11' }, { item: 'juice', qty: 1, grade: 1, day: '2026-11-11' }];
  const out = rushSlots(slots, (sl) => sl.item === 'charcoal', '2026-11-10');
  assert.notEqual(out, slots);
  assert.equal(out[0].day, '2026-11-10');
  assert.equal(out[1].day, '2026-11-11');
  assert.equal(slots[0].day, '2026-11-11');
});

test('텃밭 즉시 성장 대상은 심어서 자라는 칸뿐', () => {
  const c = { id: 'wheat' };
  const plots = [{ state: 'growing', cropType: c }, { state: 'mature', cropType: c }, { state: 'growing', cropType: null }, { state: 'empty' }];
  assert.deepEqual(rushTargets(plots), [plots[0]]);
});

test('광고로 앞당긴 가공은 받을 때 rushed 로 구분되고 세이브에도 남는다', async () => {
  const { claimAll, sanitizeSlots } = await import('../js/craft/slots.js');
  const slots = rushSlots([{ item: 'charcoal', qty: 3, grade: 1, day: '2026-11-11' }], () => true, '2026-11-10');
  assert.equal(slots[0].rushed, true);
  assert.equal(sanitizeSlots(slots)[0].rushed, true);
  assert.equal(sanitizeSlots([{ item: 'charcoal', qty: 3, grade: 1, day: '2026-11-11' }])[0].rushed, undefined);
  assert.equal(claimAll(slots, '2026-11-11').claimed[0].rushed, true);
});
