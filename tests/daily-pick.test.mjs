import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAILY_PICK_POOL, pickIndex, pickOf, halfPrice, priceOf, msLeft, cleanDailyPick } from '../js/data/daily-pick.js';

const addDays = (key, n) => {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
};

test('풀은 겨울 8종, 캐릭터 4 + 가구 4, id 중복 없음', () => {
  assert.equal(DAILY_PICK_POOL.length, 8);
  assert.equal(DAILY_PICK_POOL.filter(p => p.kind === 'cos').length, 4);
  assert.equal(DAILY_PICK_POOL.filter(p => p.kind === 'decor').length, 4);
  assert.equal(new Set(DAILY_PICK_POOL.map(p => p.id)).size, 8);
  for (const p of DAILY_PICK_POOL) assert.ok(Number.isInteger(p.price) && p.price > 0);
});

test('같은 날짜는 언제나 같은 아이템', () => {
  assert.equal(pickOf('2026-12-01').id, pickOf('2026-12-01').id);
  assert.equal(pickIndex('2026-12-01'), pickIndex('2026-12-01'));
});

test('연속 8일이면 8종이 한 번씩, 9일째는 첫날과 같다', () => {
  const start = '2026-11-28';
  const ids = Array.from({ length: 8 }, (_, i) => pickOf(addDays(start, i)).id);
  assert.equal(new Set(ids).size, 8);
  assert.equal(pickOf(addDays(start, 8)).id, ids[0]);
});

test('월·해가 바뀌어도 하루씩 이어진다', () => {
  assert.equal((pickIndex('2026-12-31') + 1) % 8, pickIndex('2027-01-01'));
  assert.equal((pickIndex('2027-02-28') + 1) % 8, pickIndex('2027-03-01'));
});

test('반값은 올림', () => {
  assert.equal(halfPrice(1200), 600);
  assert.equal(halfPrice(1101), 551);
});

test('반값은 같은 날·같은 아이템에만', () => {
  const day = '2026-12-01';
  const pick = pickOf(day);
  assert.equal(priceOf(pick, null, day), pick.price);
  assert.equal(priceOf(pick, { d: day, id: pick.id, half: true }, day), halfPrice(pick.price));
  assert.equal(priceOf(pick, { d: addDays(day, -1), id: pick.id, half: true }, day), pick.price);
  assert.equal(priceOf(pick, { d: day, id: 'other', half: true }, day), pick.price);
  assert.equal(priceOf(pick, { d: day, id: pick.id, half: false }, day), pick.price);
});

test('남은 시간은 로컬 자정까지', () => {
  const now = new Date(2026, 11, 1, 22, 30, 0).getTime();
  assert.equal(msLeft(now), 90 * 60 * 1000);
  assert.ok(msLeft(new Date(2026, 11, 1, 0, 0, 0).getTime()) <= 24 * 3600 * 1000);
});

test('세이브 복원은 올바른 모양만 받는다', () => {
  assert.deepEqual(cleanDailyPick({ d: '2026-12-01', id: 'wp_knit_scarf', half: true }), { d: '2026-12-01', id: 'wp_knit_scarf', half: true });
  assert.equal(cleanDailyPick(null), null);
  assert.equal(cleanDailyPick('x'), null);
  assert.equal(cleanDailyPick({ d: '12/01', id: 'wp_knit_scarf', half: true }), null);
  assert.equal(cleanDailyPick({ d: '2026-12-01', id: 'unknown', half: true }), null);
  assert.equal(cleanDailyPick({ d: '2026-12-01', id: 'wp_knit_scarf', half: 'yes' }), null);
  assert.deepEqual(Object.keys(cleanDailyPick({ d: '2026-12-01', id: 'wp_knit_scarf', half: true, extra: 1 })), ['d', 'id', 'half']);
});
