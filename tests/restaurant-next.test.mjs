import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextStep, NEXT_TEXT } from '../js/restaurant/next-step.js';
import { createSession } from '../js/restaurant/session.js';
import { COOK } from '../js/restaurant/data.js';

const dda = { iv: 1, pat: 1, win: 1 };
const make = (star, tickets) => {
  const S = createSession({ star, dda });
  S.tickets = tickets.map(([menu, table], i) => ({ id: i + 1, menu, table, t0: 0 }));
  return S;
};

test('주문이 없으면 안내 없음', () => {
  assert.equal(nextStep(make(1, [])), null);
});

test('생선구이: 상자, 팬, 뒤집기, 꺼내기, 접시, 서빙 순서', () => {
  const S = make(1, [['grilled', 1]]);
  let n = nextStep(S);
  assert.deepEqual([n.i, n.at, n.text], [0, 'crate_fish', NEXT_TEXT.crate_fish]);
  assert.deepEqual(n.steps, ['🐟', '🍳', '🍽️', '🙋']);
  S.held = { kind: 'fish', q: 1 };
  n = nextStep(S);
  assert.deepEqual([n.i, n.at, n.text], [1, 'pan0', NEXT_TEXT.panPut]);
  S.held = null;
  S.stations.pan0.item = { kind: 'fish', q: 1 };
  assert.equal(nextStep(S).text, NEXT_TEXT.panFlip);
  S.stations.pan0.flipped = true;
  assert.equal(nextStep(S).text, NEXT_TEXT.panWait);
  S.stations.pan0.t = COOK.pan.cook + 0.1;
  assert.equal(nextStep(S).text, NEXT_TEXT.panTake);
  S.stations.pan0.item = null;
  S.held = { kind: 'grilled', q: 1 };
  n = nextStep(S);
  assert.deepEqual([n.i, n.at], [2, 'plates']);
  S.held = { kind: 'grilled', q: 1, plated: true };
  n = nextStep(S);
  assert.deepEqual([n.i, n.at, n.table, n.text], [3, 'table', 1, '🙋 2번 손님에게 가져다줘요']);
});

test('주먹밥은 쌀 상자와 도마', () => {
  const S = make(1, [['riceball', 0]]);
  assert.equal(nextStep(S).at, 'crate_rice');
  S.held = { kind: 'rice', q: 1 };
  assert.equal(nextStep(S).text, NEXT_TEXT.boardPut);
  S.held = null;
  S.stations.board.item = { kind: 'rice', q: 1 };
  assert.equal(nextStep(S).text, NEXT_TEXT.boardChop);
  S.stations.board.item = { kind: 'riceball', q: 1 };
  assert.equal(nextStep(S).text, NEXT_TEXT.boardPick);
});

test('생선국은 도마 다음 냄비', () => {
  const S = make(2, [['soup', 2]]);
  S.held = { kind: 'fishChop', q: 1 };
  const n = nextStep(S);
  assert.deepEqual([n.i, n.at, n.steps.length], [2, 'pot', 5]);
  S.held = null;
  S.stations.pot.item = { kind: 'fishChop', q: 1 };
  assert.equal(nextStep(S).text, NEXT_TEXT.potWait);
});

test('든 요리에 맞는 주문을 따라가고, 탄 것만 버리기 안내', () => {
  const S = make(1, [['grilled', 0], ['riceball', 1]]);
  S.held = { kind: 'riceball', q: 1, plated: true };
  assert.equal(nextStep(S).table, 1);
  S.held = { kind: 'burnt' };
  assert.equal(nextStep(S).at, 'trash');
  S.held = { kind: 'soup', q: 1, plated: true };
  assert.equal(nextStep(S), null);
  const E = make(1, []);
  E.held = { kind: 'fish', q: 1 };
  assert.equal(nextStep(E), null);
});

test('팬·도마가 차 있으면 비면 올리라고, 탄 팬은 탔다고', () => {
  const S = make(1, [['grilled', 0], ['riceball', 1]]);
  S.stations.pan0.item = { kind: 'fish', q: 1 };
  S.held = { kind: 'fish', q: 1 };
  assert.equal(nextStep(S).text, NEXT_TEXT.panBusy);
  S.held = null;
  S.stations.pan0.t = COOK.pan.cook + COOK.pan.burn + 1;
  assert.equal(nextStep(S).text, NEXT_TEXT.burnt);
  const R = make(1, [['riceball', 0]]);
  R.stations.board.item = { kind: 'rice', q: 1 };
  R.held = { kind: 'rice', q: 1 };
  assert.equal(nextStep(R).text, NEXT_TEXT.boardBusy);
});

test('다 익은 팬이 있으면 다른 주문보다 먼저 꺼내기', () => {
  const S = make(1, [['riceball', 0]]);
  S.stations.pan0.item = { kind: 'fish', q: 1 };
  S.stations.pan0.t = COOK.pan.cook + 0.5;
  assert.equal(nextStep(S).text, NEXT_TEXT.panTake);
});

test('안내 문구에 엠대시·화살표 이모지 없음', () => {
  const all = Object.values(NEXT_TEXT).map(v => (typeof v === 'function' ? v(1) : v)).join(' ');
  assert.doesNotMatch(all, /[—⬇➜→]/u);
});

test('오늘의 메뉴 카드는 별 단계 메뉴만, 순서 아이콘은 서빙 전까지', async () => {
  const { menuView, menuHtml, nextHtml } = await import('../js/restaurant/hud.js');
  const v1 = menuView(1);
  assert.deepEqual(v1.rows.map(r => r[0]), ['🐟 생선구이', '🍙 주먹밥']);
  assert.deepEqual(v1.rows[0][1], ['🐟', '🍳', '🍽️']);
  assert.equal(menuView(2).rows.length, 3);
  assert.deepEqual(menuView(1, true).rows.map(r => r[0]), ['🐟 생선구이']);
  const h = menuHtml(menuView(1, false, { fish: 2, rice: 2 }));
  assert.match(h, /오늘의 메뉴/);
  assert.doesNotMatch(h, /재고가 부족해요/);
  assert.match(h, /🔔 영업 시작/);
  assert.doesNotMatch(h, /—/);
  const n = nextHtml({ steps: ['🐟', '🍳', '🍽️', '🙋'], i: 1, text: '🍳 팬에 올려요' });
  assert.match(n, /class="ok">🐟/);
  assert.match(n, /class="on">🍳/);
  assert.doesNotMatch(nextHtml({ steps: [], i: -1, text: 'x' }), /steps/);
});
