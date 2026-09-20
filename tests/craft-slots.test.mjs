import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SLOTS_PER_STATION, MAX_UNITS, capacityOf, isReady, setSlot, readySlots, claimAll, waitedDays,
  stationOf, slotsOf, unitSlots, unitState,
} from '../js/craft/slots.js';

test('용량: 화덕 1채 2칸 · 최대 3채 6칸', () => {
  assert.equal(SLOTS_PER_STATION, 2);
  assert.equal(MAX_UNITS, 3);
  assert.deepEqual([0, 1, 2, 3, 4].map(capacityOf), [0, 2, 4, 6, 6], '3채를 넘겨도 6칸에서 멈춘다');
});

test('isReady: 날짜가 바뀌어야 완성 — 같은 날은 아직', () => {
  assert.equal(isReady({ day: '2026-09-20' }, '2026-09-20'), false);
  assert.equal(isReady({ day: '2026-09-20' }, '2026-09-21'), true);
  assert.equal(isReady({ day: '2026-09-20' }, '2026-11-15'), true, '며칠이 지나도 그대로 기다린다');
  assert.equal(isReady({ day: '2026-09-21' }, '2026-09-20'), false, '시계가 거꾸로여도 완성 처리하지 않는다');
  assert.equal(isReady({}, '2026-09-21'), false, 'day 가 없으면 완성이 아니다');
});

test('setSlot: 새 배열을 돌려주고 원본을 건드리지 않는다', () => {
  const before = [];
  const after = setSlot(before, { item: 'charcoal', grade: 2, day: '2026-09-20' });
  assert.equal(before.length, 0, '원본 불변');
  assert.equal(after.length, 1);
  assert.deepEqual(after[0], { item: 'charcoal', qty: 4, grade: 2, day: '2026-09-20' },
    '슬롯은 특정 화덕에 묶지 않는다 — 배치 장식에 고유 id 가 없어 옮기면 연결이 끊긴다');
});

test('setSlot: 등급이 수량으로 굳는다 — 나중에 표가 바뀌어도 받는 양은 그대로', () => {
  const s = setSlot([], { item: 'flour', grade: 0, day: '2026-09-20' });
  assert.equal(s[0].qty, 2);
});

test('readySlots / claimAll: 다 된 것만 거두고 나머지는 남긴다', () => {
  const slots = [
    { st: 'kiln_1', item: 'charcoal', qty: 4, grade: 2, day: '2026-09-20' },
    { st: 'kiln_1', item: 'flour',    qty: 3, grade: 1, day: '2026-09-20' },
    { st: 'kiln_2', item: 'brick',    qty: 2, grade: 0, day: '2026-09-21' },
  ];
  assert.equal(readySlots(slots, '2026-09-21').length, 2);

  const { rest, gained, claimed } = claimAll(slots, '2026-09-21');
  assert.equal(rest.length, 1);
  assert.equal(rest[0].item, 'brick', '오늘 건 것은 남는다');
  assert.deepEqual(gained, { charcoal: 4, flour: 3 });
  assert.deepEqual(claimed.map(c => c.item), ['charcoal', 'flour']);
  assert.equal(claimed[0].waitedDays, 1);
});

test('claimAll: 같은 품목이 여러 칸이면 합산한다', () => {
  const slots = [
    { st: 'kiln_1', item: 'charcoal', qty: 4, grade: 2, day: '2026-09-20' },
    { st: 'kiln_2', item: 'charcoal', qty: 2, grade: 0, day: '2026-09-19' },
  ];
  const { gained } = claimAll(slots, '2026-09-21');
  assert.deepEqual(gained, { charcoal: 6 });
});

test('claimAll: 받을 게 없으면 원본을 그대로 돌려준다', () => {
  const slots = [{ st: 'kiln_1', item: 'brick', qty: 2, grade: 0, day: '2026-09-21' }];
  const { rest, gained, claimed } = claimAll(slots, '2026-09-21');
  assert.deepEqual(rest, slots);
  assert.deepEqual(gained, {});
  assert.equal(claimed.length, 0);
});

test('waitedDays: 며칠 만에 받으러 왔는가 — 핵심 지표', () => {
  assert.equal(waitedDays('2026-09-20', '2026-09-21'), 1);
  assert.equal(waitedDays('2026-09-20', '2026-09-27'), 7);
  assert.equal(waitedDays('2026-02-28', '2026-03-01'), 1, '달을 넘어도 하루다(2026년은 평년)');
  assert.equal(waitedDays('2026-12-31', '2027-01-01'), 1, '해를 넘어도 하루다');
});

// ── 세이브 복원 정제 (Task 3) ──
import { sanitizeSlots } from '../js/craft/slots.js';

const D = '2026-09-21';   // 건 날 — 완성 판정을 안 보는 테스트는 이 날짜 하나면 된다

test('sanitizeSlots: 배열이 아니면 빈 배열 — 옛 세이브를 신규로 오인하지 않는다', () => {
  assert.deepEqual(sanitizeSlots(undefined), []);
  assert.deepEqual(sanitizeSlots(null), []);
  assert.deepEqual(sanitizeSlots({}), []);
  assert.deepEqual(sanitizeSlots('x'), []);
});

test('sanitizeSlots: 표에 없는 품목은 버린다', () => {
  const raw = [
    { st: 'kiln_1', item: 'charcoal', qty: 4, grade: 2, day: '2026-09-20' },
    { st: 'kiln_1', item: 'plutonium', qty: 99, grade: 3, day: '2026-09-20' },
  ];
  assert.deepEqual(sanitizeSlots(raw).map(s => s.item), ['charcoal']);
});

test('sanitizeSlots: 수량·등급을 범위 안으로 물린다', () => {
  const raw = [{ st: 'kiln_1', item: 'flour', qty: 9999, grade: 77, day: '2026-09-20' }];
  const out = sanitizeSlots(raw);
  assert.equal(out[0].qty, 5, '표의 최대 산출을 넘길 수 없다');
  assert.equal(out[0].grade, 3);
});

test('sanitizeSlots: 음수·비숫자 수량은 최소로', () => {
  const raw = [
    { st: 'kiln_1', item: 'flour', qty: -3, grade: 0, day: '2026-09-20' },
    { st: 'kiln_1', item: 'flour', qty: 'many', grade: 0, day: '2026-09-20' },
  ];
  assert.deepEqual(sanitizeSlots(raw).map(s => s.qty), [2, 2]);
});

test('sanitizeSlots: dayStr 형식(YYYY-MM-DD)이 아니면 버린다 — 완성 판정이 문자열 비교다', () => {
  const raw = [
    { st: 'kiln_1', item: 'flour', qty: 2, grade: 0, day: '20260920' },
    { st: 'kiln_1', item: 'flour', qty: 2, grade: 0 },
    { st: 'kiln_1', item: 'flour', qty: 2, grade: 0, day: '2026-09-20' },
  ];
  assert.equal(sanitizeSlots(raw).length, 1);
});

// ── 화덕별 파생 상태 (Task 4) ──
test('unitSlots: i 번째 화덕이 맡는 두 칸', () => {
  const slots = [{ item: 'charcoal' }, { item: 'flour' }, { item: 'brick' }];
  assert.deepEqual(unitSlots(slots, 'kiln', 0).map(s => s.item), ['charcoal', 'flour']);
  assert.deepEqual(unitSlots(slots, 'kiln', 1).map(s => s.item), ['brick']);
  assert.deepEqual(unitSlots(slots, 'kiln', 2), [], '아직 안 찬 화덕은 빈 칸');
});

test('unitState: 빈 화덕 · 굽는 중 · 다 구워짐', () => {
  const today = '2026-09-21';
  assert.equal(unitState([], 'kiln', 0, today), 'empty');
  assert.equal(unitState([{ item: 'charcoal', day: '2026-09-21' }], 'kiln', 0, today), 'firing');
  assert.equal(unitState([{ item: 'charcoal', day: '2026-09-20' }], 'kiln', 0, today), 'done');
  assert.equal(unitState([{ item: 'charcoal', day: '2026-09-21' }, { item: 'flour', day: '2026-09-20' }], 'kiln', 0, today), 'done',
    '한 칸이라도 다 됐으면 상판에 올라간다');
});

// ── 시설이 둘 이상 — 🔥 화덕과 🫙 발효통은 칸을 나눠 쓴다 ─────────────
test('stationOf: 품목이 어느 시설 것인지', () => {
  assert.equal(stationOf('flour'), 'kiln');
  assert.equal(stationOf('juice'), 'vat');
  assert.equal(stationOf('없는것'), null);
});

test('slotsOf: 시설별로 칸을 갈라 센다', () => {
  const slots = [{ item: 'flour', day: D }, { item: 'juice', day: D }, { item: 'charcoal', day: D }];
  assert.deepEqual(slotsOf(slots, 'kiln').map(s => s.item), ['flour', 'charcoal']);
  assert.deepEqual(slotsOf(slots, 'vat').map(s => s.item), ['juice']);
});

test('용량은 시설마다 따로 — 화덕이 꽉 차도 발효통은 비어 있다', () => {
  const slots = [{ item: 'flour', day: D }, { item: 'charcoal', day: D }];   // 화덕 1채(2칸) 만석
  assert.equal(slotsOf(slots, 'kiln').length, capacityOf(1), '화덕은 꽉 찼다');
  assert.equal(slotsOf(slots, 'vat').length, 0, '발효통 칸은 그대로 비어 있다');
});

test('unitSlots: 발효통도 i 번째가 두 칸씩 맡는다', () => {
  const slots = [{ item: 'flour', day: D }, { item: 'juice', day: D }, { item: 'juice', day: D }, { item: 'juice', day: D }];
  assert.deepEqual(unitSlots(slots, 'vat', 0).map(s => s.item), ['juice', 'juice'], '화덕 칸은 건너뛴다');
  assert.deepEqual(unitSlots(slots, 'vat', 1).map(s => s.item), ['juice']);
});

test('unitState: 발효통 상태는 발효통 칸만 본다', () => {
  const today = '2026-09-21';
  const slots = [{ item: 'flour', day: '2026-09-20' }, { item: 'juice', day: today }];
  assert.equal(unitState(slots, 'vat', 0, today), 'firing', '다 구워진 밀가루가 발효통을 익힌 걸로 만들면 안 된다');
  assert.equal(unitState(slots, 'kiln', 0, today), 'done');
});

test('claimAll: 시설을 주면 그 시설 것만 거둔다', () => {
  const today = '2026-09-21', y = '2026-09-20';
  const slots = [{ item: 'flour', qty: 3, grade: 1, day: y }, { item: 'juice', qty: 4, grade: 2, day: y }];
  const kiln = claimAll(slots, today, 'kiln');
  assert.deepEqual(kiln.gained, { flour: 3 }, '발효통 것은 손대지 않는다');
  assert.deepEqual(kiln.rest.map(s => s.item), ['juice'], '남은 칸에 그대로 걸려 있다');
  const all = claimAll(slots, today);
  assert.deepEqual(all.gained, { flour: 3, juice: 4 }, '시설을 안 주면 전부 — 자고 일어난 알림은 한 번에 센다');
});
