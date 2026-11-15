import { test } from 'node:test';
import assert from 'node:assert/strict';
import { winterDefault, restoreWinter, restoreWinterMap, myRows, myStage, stageRows, myTotal, todayLeft,
         recordGive, recordCap, syncToday, winterButtons, kstDay, FOUNTAIN_DONE } from '../js/plaza/winter-rules.js';
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

test('recordGive: 0개·음수 수락은 joined 를 남기지 않는다', () => {
  const g = (accepted, village_before) => recordGive(S(), '2026-12-18', { stage: 1, item: 'wood', accepted, today_left: 30, village_before });
  assert.equal(g(0, 250).joined, -1);
  assert.equal(g(-5, -3).joined, -1);
  assert.equal(g(5, -3).joined, -1);
  assert.equal(g(5, 0).joined, 0);
});

test('recordGive: 지금 단계 품목만 기록하고 need 까지만 더한다', () => {
  const a = S({ '1:wood': 18 });
  const give = (st, stage, item, accepted) => recordGive(st, '2026-12-18', { stage, item, accepted, today_left: 20, village_before: 10 });
  assert.equal(give(a, 1, 'wood', 5).given['1:wood'], 20);
  assert.equal(give(a, 9, 'x', 5), a);
  assert.equal(give(a, 2, 'coal', 5), a);
  assert.equal(give(a, 1, 'coal', 5), a);
  assert.equal(give(S(ALL1), 1, 'wood', 5).given['1:wood'], 20);
});

test('myTotal: 엉뚱한 키·넘친 값은 세지 않는다', () => {
  assert.equal(myTotal(S({ '1:wood': 99, '9:x': 500, '1:stone': 3 })), 23);
});

test('recordGive: today 는 0~30 안', () => {
  const t = (today_left) => recordGive(S(), '2026-12-18', { stage: 1, item: 'wood', accepted: 1, today_left, village_before: 1 }).today;
  assert.equal(t(-10), 30);
  assert.equal(t(99), 0);
});

test('todayLeft·recordCap: 날이 바뀌면 상한이 다시 30', () => {
  const s = S({}, { day: '2026-12-18', today: 30 });
  assert.equal(todayLeft(s, '2026-12-18'), 0);
  assert.equal(todayLeft(s, '2026-12-19'), 30);
  assert.equal(todayLeft(recordCap(S(), '2026-12-20'), '2026-12-20'), 0);
});

test('syncToday: 거절·0개여도 서버 today_left 로 오늘 사용량을 맞춘다', () => {
  const s = S({}, { day: '2026-12-17', today: 30 });
  const a = syncToday(s, '2026-12-18', 12);
  assert.deepEqual([a.day, a.today, todayLeft(a, '2026-12-18')], ['2026-12-18', 18, 12]);
  assert.notEqual(a, s);
  assert.equal(syncToday(s, '2026-12-18', null), s);
  assert.equal(syncToday(s, '2026-12-18', undefined), s);
  assert.equal(syncToday(S(), '2026-12-18', 99).today, 0);
  assert.equal(syncToday(S(), '2026-12-18', -3).today, 30);
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

test('markFull: 지금 단계 품목만 need 로 채우고 원본은 그대로', async () => {
  const { markFull } = await import('../js/plaza/winter-rules.js');
  const s = S({ '1:wood': 5 });
  const a = markFull(s, 1, 'wood');
  assert.equal(a.given['1:wood'], 20);
  assert.equal(s.given['1:wood'], 5);
  assert.equal(myStage(markFull(a, 1, 'stone')), 2);
  assert.equal(markFull(s, 2, 'coal'), s);
  assert.equal(markFull(s, 1, 'fish'), s);
  assert.equal(markFull(s, '1', 'wood'), s);
});
