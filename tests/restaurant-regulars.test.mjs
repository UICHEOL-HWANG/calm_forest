import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GUEST_NPCS, FAV, REGULAR_AT, pickGuestNpc, pickMenu, serveLove, recordRegular, sanitizeRegulars } from '../js/restaurant/regulars.js';

const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };

test('손님 후보는 8명이고 모두 좋아하는 메뉴가 있다', () => {
  assert.deepEqual(GUEST_NPCS, ['farmer', 'builder', 'stargazer', 'angler', 'ferryman', 'forager', 'rancher', 'curator']);
  for (const id of GUEST_NPCS) assert.ok(['grilled', 'riceball', 'soup'].includes(FAV[id]));
  assert.equal(REGULAR_AT, 5);
});

test('이미 앉은 이웃은 다시 고르지 않고, 남은 이웃이 없으면 null', () => {
  assert.equal(pickGuestNpc(['farmer', 'angler'], new Set(['farmer']), seq(0)), 'angler');
  assert.equal(pickGuestNpc(['farmer'], new Set(['farmer']), seq(0)), null);
  assert.equal(pickGuestNpc([], new Set(), seq(0)), null);
});

test('좋아하는 메뉴가 있으면 절반 확률로 그 메뉴', () => {
  assert.equal(pickMenu('angler', ['grilled', 'riceball'], seq(0.1)), 'grilled');
  assert.equal(pickMenu('angler', ['grilled', 'riceball'], seq(0.9, 0.99)), 'riceball');
  assert.equal(pickMenu('forager', ['grilled', 'riceball'], seq(0)), 'grilled');
  assert.equal(pickMenu(null, ['grilled', 'riceball'], seq(0.99)), 'riceball');
});

test('호감도: 별4 이상만, 좋아하는 메뉴 2, 다른 메뉴 1, 나그네 0', () => {
  assert.equal(serveLove('angler', 'grilled', 5), 2);
  assert.equal(serveLove('angler', 'riceball', 4), 1);
  assert.equal(serveLove('angler', 'grilled', 3), 0);
  assert.equal(serveLove(null, 'grilled', 5), 0);
});

test('좋아하는 메뉴를 별4 이상으로 5번 내면 단골이 된다', () => {
  let r = {};
  let became = false;
  for (let i = 0; i < 5; i++) ({ regulars: r, became } = recordRegular(r, 'angler', 'grilled', 5));
  assert.equal(became, true);
  assert.deepEqual(r.angler, { fav: 5, done: true });
  assert.equal(recordRegular(r, 'angler', 'grilled', 5).became, false);
  assert.equal(recordRegular({}, 'angler', 'riceball', 5).regulars.angler, undefined);
  assert.equal(recordRegular({}, 'angler', 'grilled', 3).regulars.angler, undefined);
  assert.deepEqual(recordRegular({}, null, 'grilled', 5).regulars, {});
});

test('저장값 정리: 모르는 이웃·이상한 값은 버린다', () => {
  assert.deepEqual(sanitizeRegulars({ angler: { fav: 3, done: false }, ghost: { fav: 9 }, farmer: { fav: -2, done: 'y' } }), { farmer: { fav: 0, done: false }, angler: { fav: 3, done: false } });
  assert.deepEqual(sanitizeRegulars(null), {});
});
