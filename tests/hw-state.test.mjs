import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CANDY_PER_GHOST, FIRST_GIFT, STREAK_BONUS, STREAK_EVERY, CASHOUT_RATE,
  normalizeHalloween, ghostsLeft, findGhost, takeFirstGift, cashoutCoins, prevDay,
} from '../js/halloween/state.js';
import { pickSpots } from '../js/halloween/layout.js';

const D1 = '2026-10-22', D2 = '2026-10-23', D3 = '2026-10-24';

test('상수 — 스펙 §5·§6 값', () => {
  assert.equal(CANDY_PER_GHOST, 2);
  assert.equal(FIRST_GIFT, 4);
  assert.equal(STREAK_BONUS, 5);
  assert.equal(STREAK_EVERY, 3);
  assert.equal(CASHOUT_RATE, 4);
});

test('prevDay — 월 경계를 넘는다', () => {
  assert.equal(prevDay('2026-11-01'), '2026-10-31');
  assert.equal(prevDay('2026-10-23'), '2026-10-22');
});

test('normalizeHalloween — 빈 세이브는 기본값', () => {
  assert.deepEqual(normalizeHalloween(undefined, D1), { day: D1, found: [], visits: 0, gifted: false, streak: 0, lastFullDay: null });
});

test('normalizeHalloween — 날이 바뀌면 found 를 비우고 나머지는 남긴다', () => {
  const h = normalizeHalloween({ day: D1, found: [pickSpots(D1)[0]], visits: 3, gifted: true, streak: 1, lastFullDay: D1 }, D2);
  assert.deepEqual(h.found, []);
  assert.equal(h.visits, 3);
  assert.equal(h.gifted, true);
  assert.equal(h.streak, 1);
  assert.equal(h.lastFullDay, D1);
});

test('normalizeHalloween — 오늘 자리가 아닌 id·이상한 값은 버린다', () => {
  const today = pickSpots(D1);
  const h = normalizeHalloween({ day: D1, found: [today[0], today[0], 'nope', 7], visits: -2, gifted: 'yes', lastFullDay: 5 }, D1);
  assert.deepEqual(h.found, [today[0]]);
  assert.equal(h.visits, 0);
  assert.equal(h.gifted, false);
  assert.equal(h.lastFullDay, null);
});

test('findGhost — 오늘 자리면 사탕 2개, 같은 자리는 두 번 못 받는다', () => {
  const [a] = pickSpots(D1);
  const h0 = normalizeHalloween(null, D1);
  const r1 = findGhost(h0, a, D1);
  assert.equal(r1.candy, 2);
  assert.deepEqual(r1.hw.found, [a]);
  assert.deepEqual(h0.found, [], '원본은 그대로');
  const r2 = findGhost(r1.hw, a, D1);
  assert.equal(r2.candy, 0);
  assert.equal(r2.hw, r1.hw);
});

test('findGhost — 오늘 자리가 아니면 아무 일도 없다', () => {
  const r = findGhost(normalizeHalloween(null, D1), 'nope', D1);
  assert.equal(r.candy, 0);
  assert.equal(r.allFound, false);
});

function findAll(hw, day) {
  let h = normalizeHalloween(hw, day), last = null, total = 0;
  for (const id of pickSpots(day)) { last = findGhost(h, id, day); h = last.hw; total += last.candy; }
  return { hw: h, last, total };
}

test('3마리 다 찾으면 allFound · 하루 6개', () => {
  const { last, total } = findAll(null, D1);
  assert.equal(last.allFound, true);
  assert.equal(total, 6);
  assert.deepEqual(ghostsLeft(last.hw, D1), []);
});

test('3일 연속 다 찾으면 보너스 5개, 하루 끊기면 연속이 1로 돌아간다', () => {
  const a = findAll(null, D1);
  assert.equal(a.hw.streak, 1);
  const b = findAll(a.hw, D2);
  assert.equal(b.hw.streak, 2);
  const c = findAll(b.hw, D3);
  assert.equal(c.hw.streak, 3);
  assert.equal(c.last.bonus, 5);
  assert.equal(c.total, 6 + 5);
  const gap = findAll(c.hw, '2026-10-26');
  assert.equal(gap.hw.streak, 1);
  assert.equal(gap.last.bonus, 0);
});

test('takeFirstGift — 한 번만 4개', () => {
  const r1 = takeFirstGift(normalizeHalloween(null, D1));
  assert.equal(r1.candy, 4);
  assert.equal(r1.hw.gifted, true);
  assert.equal(takeFirstGift(r1.hw).candy, 0);
});

test('cashoutCoins — 남은 사탕 1개당 4코인, 음수·이상값은 0', () => {
  assert.equal(cashoutCoins(7), 28);
  assert.equal(cashoutCoins(0), 0);
  assert.equal(cashoutCoins(-3), 0);
  assert.equal(cashoutCoins(NaN), 0);
});
