import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAR, COOK, STARTER_STOCK } from '../js/restaurant/data.js';
import { defaultRestaurant, sanitizeRestaurant, cookState, panState, flipZone, flipOk, chopTap, chopDone, serveStars, spawnInterval, serviceAvg, adjustDda,
  recordServe, starUpReady, applyStarUp, takeIngredient, grantStarter } from '../js/restaurant/rules.js';

test('기본값과 정규화', () => {
  const d = defaultRestaurant();
  assert.deepEqual(d, { v: 1, star: 1, rating: 0, served: { grilled: 0, riceball: 0, soup: 0 }, combo: 0, bestCombo: 0,
    dda: { iv: 1, pat: 1, win: 1 }, starterGiven: false, guideDone: false, services: 0 });
  assert.deepEqual(sanitizeRestaurant(null), d);
  const s = sanitizeRestaurant({ star: 9, rating: -3, served: { grilled: 2.7, pizza: 4 }, dda: { iv: 5, pat: 0.1, win: 'x' }, starterGiven: 'yes', junk: 1 });
  assert.equal(s.star, 4);
  assert.equal(s.rating, 0);
  assert.deepEqual(s.served, { grilled: 2, riceball: 0, soup: 0 });
  assert.deepEqual(s.dda, { iv: 1.2, pat: 0.8, win: 1 });
  assert.equal(s.starterGiven, false);
  assert.equal('junk' in s, false);
});

test('냄비 상태는 익힘·완벽·지나침·탐 순서', () => {
  assert.equal(cookState('pot', 6.9, 1), 'raw');
  assert.equal(cookState('pot', 7.0, 1), 'perfect');
  assert.equal(cookState('pot', 7 + 3.2 - 0.01, 1), 'perfect');
  assert.equal(cookState('pot', 7 + 3.2, 1), 'over');
  assert.equal(cookState('pot', 7 + 3.2 + 8, 1), 'burnt');
  assert.equal(cookState('pot', 7 + 3.2 * 1.2 - 0.01, 1.2), 'perfect');
});

test('팬은 다 익음까지 5초, 그 뒤 6.5초에 탄다', () => {
  assert.equal(panState(4.9), 'raw');
  assert.equal(panState(5), 'done');
  assert.equal(panState(11.49), 'done');
  assert.equal(panState(11.5), 'burnt');
});

test('뒤집기 초록 구간은 2.7초 ± 0.5초×DDA', () => {
  assert.deepEqual(flipZone(1), [2.2, 3.2]);
  assert.equal(flipOk(2.19, 1), false);
  assert.equal(flipOk(2.2, 1), true);
  assert.equal(flipOk(3.2, 1), true);
  assert.equal(flipOk(3.25, 1), false);
  assert.equal(flipOk(3.25, 1.2), true);
});

test('도마는 탭 4번, 0.22초보다 빠른 탭은 무시', () => {
  let c = { taps: 0, last: -1 };
  c = chopTap(c, 0.0); c = chopTap(c, 0.1); c = chopTap(c, 0.3); c = chopTap(c, 0.6);
  assert.equal(c.taps, 3);
  c = chopTap(c, 0.9);
  assert.equal(c.taps, 4);
  assert.equal(chopDone(c), true);
});

test('별점은 5에서 깎는다(최저 2)', () => {
  assert.equal(serveStars(10, 1, 1), 5);
  assert.equal(serveStars(30, 1, 1), 4);
  assert.equal(serveStars(50, 1, 1), 3);
  assert.equal(serveStars(50, 0.75, 1), 2);
  assert.equal(serveStars(30, 1, 1.25), 5);
  assert.equal(serveStars(999, 0, 1), 2);
});

test('손님 간격은 영업 처음→끝으로 줄고 DDA 배율을 곱한다', () => {
  assert.equal(spawnInterval(1, 0, 1), 14);
  assert.equal(spawnInterval(1, 100, 1), 11);
  assert.equal(spawnInterval(1, 50, 1), 12.5);
  assert.equal(spawnInterval(2, 0, 1.1), 12 * 1.1);
});

test('평균은 못 받은 주문을 1점으로 센다', () => {
  assert.equal(serviceAvg([5, 5], 2), 3);
  assert.equal(serviceAvg([], 0), 0);
});

test('DDA: 쉽게 +0.08, 어렵게 -0.06, 0.8~1.2', () => {
  const one = { iv: 1, pat: 1, win: 1 };
  assert.deepEqual(adjustDda(one, { avg: 3.0, late: 0, unserved: 0, served: 4 }).dda, { iv: 1.08, pat: 1.08, win: 1.08 });
  assert.deepEqual(adjustDda(one, { avg: 4.5, late: 0, unserved: 1, served: 6 }).dda, { iv: 0.94, pat: 0.94, win: 0.94 });
  assert.deepEqual(adjustDda(one, { avg: 4.5, late: 1, unserved: 0, served: 6 }).dda, one);
  assert.deepEqual(adjustDda(one, { avg: 4.0, late: 0, unserved: 0, served: 6 }).dda, one);
  assert.deepEqual(adjustDda({ iv: 1.18, pat: 1.18, win: 1.18 }, { avg: 1, late: 3, unserved: 3, served: 0 }).dda, { iv: 1.2, pat: 1.2, win: 1.2 });
  assert.equal(adjustDda(one, { avg: 3.0, late: 0, unserved: 0, served: 4 }).dir, 'easy');
});

test('서빙 기록: 평점·메뉴 횟수·연속', () => {
  let r = defaultRestaurant();
  r = recordServe(r, 'riceball', 5);
  r = recordServe(r, 'riceball', 4);
  assert.equal(r.rating, 9);
  assert.equal(r.served.riceball, 2);
  assert.equal(r.combo, 2);
  r = recordServe(r, 'grilled', 3);
  assert.equal(r.combo, 0);
  assert.equal(r.bestCombo, 2);
});

test('★2 조건: 평점 40 + 주먹밥 5', () => {
  let r = { ...defaultRestaurant(), rating: 40, served: { grilled: 0, riceball: 4, soup: 0 } };
  assert.equal(starUpReady(r), false);
  r = { ...r, served: { ...r.served, riceball: 5 } };
  assert.equal(starUpReady(r), true);
  const up = applyStarUp(r);
  assert.equal(up.rest.star, 2);
  assert.equal(up.coins, 100);
  assert.equal(starUpReady({ ...r, star: 4 }), false);
});

test('★3 조건은 연속 4명(최고 기록)', () => {
  const r = { ...defaultRestaurant(), star: 2, rating: 100, bestCombo: 4 };
  assert.equal(starUpReady(r), true);
});

test('재료 꺼내기는 창고에서 1 차감, 없으면 실패', () => {
  const port = { pantry: { fish: 1, rice: 0 } };
  const a = takeIngredient(port, 'fish');
  assert.equal(a.ok, true);
  assert.equal(a.port.pantry.fish, 0);
  assert.equal(port.pantry.fish, 1);
  assert.equal(takeIngredient(a.port, 'fish').ok, false);
  assert.equal(takeIngredient(port, 'rice').ok, false);
});

test('시작 재료는 한 번만', () => {
  const g = grantStarter(defaultRestaurant(), { pantry: { fish: 1, rice: 0 } });
  assert.equal(g.given, true);
  assert.equal(g.port.pantry.fish, 1 + STARTER_STOCK.fish);
  assert.equal(g.rest.starterGiven, true);
  assert.equal(grantStarter(g.rest, g.port).given, false);
});

test('별 단계표 모양', () => {
  assert.deepEqual(Object.keys(STAR), ['1', '2', '3', '4']);
  assert.equal(COOK.pan.cook, 5);
});
