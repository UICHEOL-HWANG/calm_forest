import { test } from 'node:test';
import assert from 'node:assert/strict';
import { winterDefault, villageStage, litLamps, nextLampLeft, lampSpot, lampLit, lampEligible, lampClaims, lampGrant,
         claimLamp, doubleOpen, markDoubled, decorPlan, settleOwed, shortFill, fireworksDue } from '../js/plaza/winter-rules.js';
import { PLAZA_SEASONS } from '../js/data/plaza.js';

const S = (o = {}) => ({ ...winterDefault(), ...o });
const WINTER = PLAZA_SEASONS[1];

test('villageStage·litLamps: 300 → 3개, 800 → 6개, 1500 → 9개', () => {
  assert.deepEqual([0, 299, 300, 799, 800, 1499, 1500, 9999].map(villageStage), [0, 0, 1, 1, 2, 2, 3, 3]);
  assert.deepEqual([0, 300, 800, 1500].map(litLamps), [0, 3, 6, 9]);
  assert.equal(nextLampLeft(120), 180);
  assert.equal(nextLampLeft(800), 700);
  assert.equal(nextLampLeft(1500), 0);
});

test('lampLit: 켜지는 순서는 흩어 놓는다(세로 폰에서도 보이게)', () => {
  const on = (lit) => Array.from({ length: 9 }, (_, i) => i).filter(i => lampLit(i, lit));
  assert.deepEqual(on(3), [0, 3, 6]);
  assert.deepEqual(on(6), [0, 1, 3, 4, 6, 7]);
  assert.equal(on(9).length, 9);
});

test('lampSpot: 광장 둘레 반지름 5.4', () => {
  for (let i = 0; i < 9; i++) { const p = lampSpot(i); assert.ok(Math.abs(Math.hypot(p.x, p.z) - 5.4) < 1e-9); }
  assert.ok(Math.abs(lampSpot(0).x) < 1e-9 && lampSpot(0).z < 0);
});

test('lampClaims: 그 단계가 켜지기 전에 보탠 사람만, 한 번씩', () => {
  assert.deepEqual(lampClaims(S({ joined: 120 }), 900), [1, 2]);
  assert.deepEqual(lampClaims(claimLamp(S({ joined: 120 }), 1), 900), [2]);
  assert.deepEqual(lampClaims(S({ joined: 500 }), 900), [2]);
  assert.deepEqual(lampClaims(S({ joined: -1 }), 1500), []);
  assert.deepEqual(lampClaims(S({ joined: 299 }), 300), [1]);
  assert.deepEqual(lampClaims(S({ joined: 300 }), 300), []);
  assert.equal(lampEligible(S({ joined: 1499 }), 3), true);
});

test('lampGrant: 1 코인 30, 2 고급 씨앗 3, 3 겨울 등불 꾸미기', () => {
  assert.deepEqual(lampGrant(1), { give: { coins: 30 }, decor: null });
  assert.deepEqual(lampGrant(2), { give: { seed_wheat: 1, seed_corn: 1, seed_grape: 1 }, decor: null });
  assert.deepEqual(lampGrant(3), { give: null, decor: 'winterlamp' });
});

test('doubleOpen: 받은 단계의 코인·씨앗만, 단계마다 한 번', () => {
  const s = S({ lamps: [1, 3] });
  assert.equal(doubleOpen(s, 1), true);
  assert.equal(doubleOpen(s, 2), false);
  assert.equal(doubleOpen(s, 3), false);
  assert.equal(doubleOpen(markDoubled(s, 1), 1), false);
});

test('decorPlan: 게스트는 보류, 로그인 계정은 바로 받고 두 번 주지 않는다', () => {
  const g = decorPlan(S(), 'winterfountain', true);
  assert.equal(g.grant, false); assert.deepEqual(g.st.owed, ['winterfountain']);
  const m = decorPlan(S(), 'winterfountain', false);
  assert.equal(m.grant, true); assert.deepEqual(m.st.got, ['winterfountain']);
  assert.equal(decorPlan(m.st, 'winterfountain', false).grant, false);
});

test('settleOwed: 로그인하면 보류분을 한 번에, 게스트면 그대로', () => {
  const s = S({ owed: ['winterfountain', 'winterlamp'] });
  assert.deepEqual(settleOwed(s, true), { st: s, grant: [] });
  const r = settleOwed(s, false);
  assert.deepEqual(r.grant, ['winterfountain', 'winterlamp']);
  assert.deepEqual(r.st.owed, []); assert.deepEqual(r.st.got, ['winterfountain', 'winterlamp']);
});

test('shortFill: 가방과 합쳐도 모자란 만큼, 합계 최대 10', () => {
  const rows = [{ item: 'coal', have: 2, need: 10 }, { item: 'stone', have: 5, need: 25 }];
  assert.deepEqual(shortFill(rows, { coal: 3, stone: 0 }), { coal: 5, stone: 5 });
  assert.deepEqual(shortFill(rows, { coal: 8, stone: 20 }), {});
  assert.deepEqual(shortFill(rows, { coal: 8, stone: 18 }), { stone: 2 });
});

test('fireworksDue: 시즌 마지막 KST 날(12/31)에 마을 3단계', () => {
  const at = (iso) => Date.parse(iso);
  assert.equal(fireworksDue(WINTER, at('2026-12-31T20:00:00+09:00'), 1500), true);
  assert.equal(fireworksDue(WINTER, at('2026-12-30T20:00:00+09:00'), 1500), false);
  assert.equal(fireworksDue(WINTER, at('2026-12-31T20:00:00+09:00'), 800), false);
  assert.equal(fireworksDue(WINTER, at('2027-01-01T00:30:00+09:00'), 1500), false);
});
