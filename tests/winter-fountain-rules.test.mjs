import { test } from 'node:test';
import assert from 'node:assert/strict';
import { winterDefault, restoreWinter, restoreWinterMap, myRows, myStage, stageRows, myTotal, todayLeft,
         recordGive, recordCap, winterButtons, kstDay, FOUNTAIN_DONE } from '../js/plaza/winter-rules.js';
import { plazaDefault, restorePlaza } from '../js/plaza/rules.js';

const S = (given = {}, o = {}) => ({ ...winterDefault(), given, ...o });
const ALL1 = { '1:wood': 20, '1:stone': 15 };
const ALL2 = { ...ALL1, '2:stone': 25, '2:coal': 10 };

test('myStage: 지금 단계 재료가 다 차야 다음 단계, 3단계를 채우면 완공(4)', () => {
  assert.equal(myStage(S()), 1);
  assert.equal(myStage(S({ '1:wood': 20, '1:stone': 14 })), 1);
  assert.equal(myStage(S(ALL1)), 2);
  assert.equal(myStage(S(ALL2)), 3);
  assert.equal(myStage(S({ ...ALL2, '3:fish': 10, '3:forage': 15 })), FOUNTAIN_DONE);
});

test('myStage: 앞 단계가 비어 있으면 뒤 단계 기록이 있어도 앞 단계', () => {
  assert.equal(myStage(S({ '2:coal': 10 })), 1);
});

test('stageRows: 지금 단계 품목만 이름순, 넘친 기록은 need 로 자른다', () => {
  assert.deepEqual(stageRows(S({ '1:wood': 99 })), [{ item: 'stone', have: 0, need: 15 }, { item: 'wood', have: 20, need: 20 }]);
  assert.deepEqual(stageRows(S(ALL1)).map(r => r.item), ['coal', 'stone']);
});

test('myRows·myTotal: 1인 목표 합계 95, 내 기록 합', () => {
  assert.equal(myRows(S()).reduce((a, r) => a + r.need, 0), 95);
  assert.equal(myTotal(S({ '1:wood': 5, '1:stone': 3 })), 8);
});

test('recordGive: 새 객체, 처음 보탠 때의 마을 누적을 joined 로 한 번만 남긴다', () => {
  const a = S();
  const b = recordGive(a, '2026-12-18', { stage: 1, item: 'wood', accepted: 5, today_left: 25, village_before: 120 });
  assert.notEqual(b, a);
  assert.deepEqual(a.given, {});
  assert.deepEqual(b.given, { '1:wood': 5 });
  assert.equal(b.today, 5); assert.equal(b.day, '2026-12-18'); assert.equal(b.joined, 120);
  const c = recordGive(b, '2026-12-18', { stage: 1, item: 'wood', accepted: 3, today_left: 22, village_before: 400 });
  assert.equal(c.given['1:wood'], 8); assert.equal(c.joined, 120); assert.equal(c.today, 8);
});

test('todayLeft·recordCap: 날이 바뀌면 상한이 다시 30', () => {
  const s = S({}, { day: '2026-12-18', today: 30 });
  assert.equal(todayLeft(s, '2026-12-18'), 0);
  assert.equal(todayLeft(s, '2026-12-19'), 30);
  assert.equal(todayLeft(recordCap(S(), '2026-12-20'), '2026-12-20'), 0);
});

test('kstDay: KST 자정 경계', () => {
  assert.equal(kstDay(Date.parse('2026-12-17T14:59:59Z')), '2026-12-17');
  assert.equal(kstDay(Date.parse('2026-12-17T15:00:00Z')), '2026-12-18');
});

test('winterButtons: +1 · +5 · 실제로 낼 수 있는 수', () => {
  const row = { item: 'stone', have: 10, need: 15 };
  assert.deepEqual(winterButtons({ stone: 9 }, 30, row).map(b => [b.qty, b.on]), [[1, true], [5, true], [5, true]]);
  assert.deepEqual(winterButtons({ stone: 2 }, 30, row).map(b => [b.qty, b.on]), [[1, true], [5, false], [2, true]]);
  assert.deepEqual(winterButtons({ stone: 9 }, 0, row).map(b => b.on), [false, false, false]);
  assert.deepEqual(winterButtons({ stone: 9 }, 30, row).map(b => b.label), ['+1', '+5', '5개 보태기']);
});

test('restoreWinter: 깨진 값은 버리고 새 객체', () => {
  assert.deepEqual(restoreWinter(null), winterDefault());
  const r = restoreWinter({ given: { '1:wood': 5, '9:wood': 3, x: 1, '1:stone': -2 }, lamps: [1, 1, 7], owed: ['winterfountain', 'hack'], joined: 'x', seenStage: 9 });
  assert.deepEqual(r.given, { '1:wood': 5 });
  assert.deepEqual(r.lamps, [1]);
  assert.deepEqual(r.owed, ['winterfountain']);
  assert.equal(r.joined, -1); assert.equal(r.seenStage, 4);
  assert.deepEqual(restoreWinterMap({ 'winter-2026': { given: { '1:wood': 2 } }, 'BAD ID': {} }),
    { 'winter-2026': { ...winterDefault(), given: { '1:wood': 2 } } });
});

test('광장 세이브에 winter 칸이 생기고 옛 세이브는 빈 칸', () => {
  assert.deepEqual(plazaDefault().winter, {});
  assert.deepEqual(restorePlaza({ lastStage: 4 }).winter, {});
  assert.deepEqual(restorePlaza({ winter: { 'winter-2026': { given: { '1:wood': 3 } } } }).winter['winter-2026'].given, { '1:wood': 3 });
});
