import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SLOTS_PER_KILN, MAX_KILNS, capacityOf, isReady, setSlot, readySlots, claimAll, waitedDays,
  slotsOfKiln, kilnState,
} from '../js/craft/slots.js';

test('용량: 화덕 1채 2칸 · 최대 3채 6칸', () => {
  assert.equal(SLOTS_PER_KILN, 2);
  assert.equal(MAX_KILNS, 3);
  assert.deepEqual([0, 1, 2, 3, 4].map(capacityOf), [0, 2, 4, 6, 6], '3채를 넘겨도 6칸에서 멈춘다');
});

test('isReady: 날짜가 바뀌어야 완성 — 같은 날은 아직', () => {
  assert.equal(isReady({ day: '20260920' }, '20260920'), false);
  assert.equal(isReady({ day: '20260920' }, '20260921'), true);
  assert.equal(isReady({ day: '20260920' }, '20261115'), true, '며칠이 지나도 그대로 기다린다');
  assert.equal(isReady({ day: '20260921' }, '20260920'), false, '시계가 거꾸로여도 완성 처리하지 않는다');
  assert.equal(isReady({}, '20260921'), false, 'day 가 없으면 완성이 아니다');
});

test('setSlot: 새 배열을 돌려주고 원본을 건드리지 않는다', () => {
  const before = [];
  const after = setSlot(before, { item: 'charcoal', grade: 2, day: '20260920' });
  assert.equal(before.length, 0, '원본 불변');
  assert.equal(after.length, 1);
  assert.deepEqual(after[0], { item: 'charcoal', qty: 4, grade: 2, day: '20260920' },
    '슬롯은 특정 화덕에 묶지 않는다 — 배치 장식에 고유 id 가 없어 옮기면 연결이 끊긴다');
});

test('setSlot: 등급이 수량으로 굳는다 — 나중에 표가 바뀌어도 받는 양은 그대로', () => {
  const s = setSlot([], { item: 'flour', grade: 0, day: '20260920' });
  assert.equal(s[0].qty, 2);
});

test('readySlots / claimAll: 다 된 것만 거두고 나머지는 남긴다', () => {
  const slots = [
    { st: 'kiln_1', item: 'charcoal', qty: 4, grade: 2, day: '20260920' },
    { st: 'kiln_1', item: 'flour',    qty: 3, grade: 1, day: '20260920' },
    { st: 'kiln_2', item: 'brick',    qty: 2, grade: 0, day: '20260921' },
  ];
  assert.equal(readySlots(slots, '20260921').length, 2);

  const { rest, gained, claimed } = claimAll(slots, '20260921');
  assert.equal(rest.length, 1);
  assert.equal(rest[0].item, 'brick', '오늘 건 것은 남는다');
  assert.deepEqual(gained, { charcoal: 4, flour: 3 });
  assert.deepEqual(claimed.map(c => c.item), ['charcoal', 'flour']);
  assert.equal(claimed[0].waitedDays, 1);
});

test('claimAll: 같은 품목이 여러 칸이면 합산한다', () => {
  const slots = [
    { st: 'kiln_1', item: 'charcoal', qty: 4, grade: 2, day: '20260920' },
    { st: 'kiln_2', item: 'charcoal', qty: 2, grade: 0, day: '20260919' },
  ];
  const { gained } = claimAll(slots, '20260921');
  assert.deepEqual(gained, { charcoal: 6 });
});

test('claimAll: 받을 게 없으면 원본을 그대로 돌려준다', () => {
  const slots = [{ st: 'kiln_1', item: 'brick', qty: 2, grade: 0, day: '20260921' }];
  const { rest, gained, claimed } = claimAll(slots, '20260921');
  assert.deepEqual(rest, slots);
  assert.deepEqual(gained, {});
  assert.equal(claimed.length, 0);
});

test('waitedDays: 며칠 만에 받으러 왔는가 — 핵심 지표', () => {
  assert.equal(waitedDays('20260920', '20260921'), 1);
  assert.equal(waitedDays('20260920', '20260927'), 7);
  assert.equal(waitedDays('20260228', '20260301'), 1, '달을 넘어도 하루다(2026년은 평년)');
  assert.equal(waitedDays('20261231', '20270101'), 1, '해를 넘어도 하루다');
});

// ── 세이브 복원 정제 (Task 3) ──
import { sanitizeSlots } from '../js/craft/slots.js';

test('sanitizeSlots: 배열이 아니면 빈 배열 — 옛 세이브를 신규로 오인하지 않는다', () => {
  assert.deepEqual(sanitizeSlots(undefined), []);
  assert.deepEqual(sanitizeSlots(null), []);
  assert.deepEqual(sanitizeSlots({}), []);
  assert.deepEqual(sanitizeSlots('x'), []);
});

test('sanitizeSlots: 표에 없는 품목은 버린다', () => {
  const raw = [
    { st: 'kiln_1', item: 'charcoal', qty: 4, grade: 2, day: '20260920' },
    { st: 'kiln_1', item: 'plutonium', qty: 99, grade: 3, day: '20260920' },
  ];
  assert.deepEqual(sanitizeSlots(raw).map(s => s.item), ['charcoal']);
});

test('sanitizeSlots: 수량·등급을 범위 안으로 물린다', () => {
  const raw = [{ st: 'kiln_1', item: 'flour', qty: 9999, grade: 77, day: '20260920' }];
  const out = sanitizeSlots(raw);
  assert.equal(out[0].qty, 5, '표의 최대 산출을 넘길 수 없다');
  assert.equal(out[0].grade, 3);
});

test('sanitizeSlots: 음수·비숫자 수량은 최소로', () => {
  const raw = [
    { st: 'kiln_1', item: 'flour', qty: -3, grade: 0, day: '20260920' },
    { st: 'kiln_1', item: 'flour', qty: 'many', grade: 0, day: '20260920' },
  ];
  assert.deepEqual(sanitizeSlots(raw).map(s => s.qty), [2, 2]);
});

test('sanitizeSlots: 날짜 꼴이 아니면 버린다 — 완성 판정이 문자열 비교라 형식이 깨지면 위험하다', () => {
  const raw = [
    { st: 'kiln_1', item: 'flour', qty: 2, grade: 0, day: '2026-09-20' },
    { st: 'kiln_1', item: 'flour', qty: 2, grade: 0 },
    { st: 'kiln_1', item: 'flour', qty: 2, grade: 0, day: '20260920' },
  ];
  assert.equal(sanitizeSlots(raw).length, 1);
});

// ── 화덕별 파생 상태 (Task 4) ──
test('slotsOfKiln: i 번째 화덕이 맡는 두 칸', () => {
  const slots = [{ item: 'charcoal' }, { item: 'flour' }, { item: 'brick' }];
  assert.deepEqual(slotsOfKiln(slots, 0).map(s => s.item), ['charcoal', 'flour']);
  assert.deepEqual(slotsOfKiln(slots, 1).map(s => s.item), ['brick']);
  assert.deepEqual(slotsOfKiln(slots, 2), [], '아직 안 찬 화덕은 빈 칸');
});

test('kilnState: 빈 화덕 · 굽는 중 · 다 구워짐', () => {
  const today = '20260921';
  assert.equal(kilnState([], 0, today), 'empty');
  assert.equal(kilnState([{ item: 'charcoal', day: '20260921' }], 0, today), 'firing');
  assert.equal(kilnState([{ item: 'charcoal', day: '20260920' }], 0, today), 'done');
  assert.equal(kilnState([{ item: 'charcoal', day: '20260921' }, { item: 'flour', day: '20260920' }], 0, today), 'done',
    '한 칸이라도 다 됐으면 상판에 올라간다');
});
