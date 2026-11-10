import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRun, canBid, bid, step, outcome } from '../js/auction/engine.js';

const maxes = { curator: 400, stargazer: 300, builder: 350 };
const never = () => 0.999;
const always = () => 0;
const run0 = (o = {}) => createRun({ start: 200, maxes, wallet: 820, mode: 'bid', ...o });

test('createRun starts at start price with 8s and no leader', () => {
  const r = run0();
  assert.equal(r.price, 200);
  assert.equal(r.leader, null);
  assert.equal(r.t, 8);
  assert.equal(r.over, false);
  assert.equal(r.bidders.length, 3);
});

test('canBid rules', () => {
  const r = run0();
  assert.equal(canBid(r, 50), true);
  assert.equal(canBid(run0({ wallet: 240 }), 50), false);
  assert.equal(canBid(bid(r, 'me', 10), 10), false);
  assert.equal(canBid(run0({ mode: 'watch' }), 10), false);
});

test('bid raises price, sets leader, resets countdown to at least 4, flags extension under 3s', () => {
  const late = { ...run0(), t: 1.2 };
  const r = bid(late, 'me', 30);
  assert.equal(r.price, 230);
  assert.equal(r.leader, 'me');
  assert.equal(r.t, 4);
  assert.equal(r.extended, true);
  assert.equal(r.myBids, 1);
  assert.equal(late.price, 200);
});

test('no bids: sold to nobody after the countdown', () => {
  let r = run0(), ev = [];
  for (let i = 0; i < 100 && !r.over; i++) ({ run: r, events: ev } = step(r, never));
  assert.equal(r.over, true);
  assert.deepEqual(ev.at(-1), { type: 'sold', who: null, price: 200 });
  assert.equal(outcome(r), 'none');
});

test('npc bids never exceed their max and someone wins', () => {
  let r = run0(), seen = 0;
  for (let i = 0; i < 1000 && !r.over; i++) {
    const out = step(r, always);
    r = out.run;
    for (const e of out.events) if (e.type === 'bid') {
      seen++;
      assert.ok(e.price <= maxes[e.who], `${e.who} ${e.price}`);
    }
  }
  assert.ok(seen > 0);
  assert.equal(r.over, true);
  assert.notEqual(r.leader, null);
  assert.equal(outcome(r), 'lose');
});

test('player wins when npcs are out of budget', () => {
  let r = { ...bid(run0(), 'me', 50), price: 600 };
  for (let i = 0; i < 100 && !r.over; i++) r = step(r, always).run;
  assert.equal(r.leader, 'me');
  assert.equal(outcome(r), 'win');
});

test('run is capped at RUN_CAP seconds', () => {
  let r = createRun({ start: 10, maxes: { curator: 99999, stargazer: 99999, builder: 99999 }, wallet: 0, mode: 'watch' });
  let n = 0;
  while (!r.over && n < 2000) { r = step(r, always).run; n++; }
  assert.equal(r.over, true);
  assert.ok(r.total <= 45.0001);
  assert.equal(outcome(r), 'watch');
});

test('step does not mutate its input', () => {
  const r = run0();
  const snap = JSON.stringify(r);
  step(r, always);
  assert.equal(JSON.stringify(r), snap);
});
