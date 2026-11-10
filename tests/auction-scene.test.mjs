import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAuctionScene, callText } from '../js/auction/scene.js';
import { lotFor } from '../js/auction/rules.js';

function fakes(over = {}) {
  const log = { ui: [], done: null, track: [], econ: [], saved: 0, calls: [] };
  let coins = 820, stored = {}, auction = { lastDate: '', wins: 0 };
  const noop = () => {};
  const stage = {
    setItem: noop, focus: noop, gavel: { rotation: { z: 0 } }, bell: { rotation: { z: 0 } },
    setNight: v => log.calls.push(['night', v]),
    setTension: (on, t) => log.calls.push(['tension', on, t]),
  };
  const actors = { raise: noop, hop: noop, lead: noop, update: noop, burst: noop, spotOf: () => [0, 5.9] };
  const deps = {
    stage, actors, now: () => 0, rng: () => 0.999, day: () => '2026-11-10',
    getCoins: () => coins, setCoins: c => { coins = c; }, getStored: () => stored, setStored: s => { stored = s; },
    getAuction: () => auction, setAuction: a => { auction = a; }, getNight: () => 0.6,
    onUi: s => log.ui.push(s), onDone: r => { log.done = r; }, track: (n, p) => log.track.push([n, p]),
    econ: (...a) => log.econ.push(a), save: () => { log.saved++; }, ...over,
  };
  return { deps, log, get: () => ({ coins, stored, auction }) };
}

test('callText', () => {
  assert.equal(callText(5, false), '');
  assert.equal(callText(2.5, false), '3…');
  assert.equal(callText(1.5, false), '2…');
  assert.equal(callText(0.5, false), '1…');
  assert.equal(callText(4, true), '⏱️ 연장!');
});

test('begin records the day and saves before the run', () => {
  const f = fakes();
  createAuctionScene(f.deps).begin('bid');
  assert.equal(f.get().auction.lastDate, '2026-11-10');
  assert.ok(f.log.saved >= 1);
  assert.equal(f.log.track[0][0], 'auction_join');
  assert.equal(f.log.track[0][1].mode, 'bid');
});

test('player wins when npcs never bid', () => {
  const f = fakes();
  const s = createAuctionScene(f.deps);
  s.begin('bid');
  assert.equal(s.playerBid(50), true);
  for (let i = 0; i < 200 && s.active(); i++) s.update(0.1, i * 0.1);
  assert.equal(f.log.done.outcome, 'win');
  const price = f.log.done.price;
  assert.equal(f.get().coins, 820 - price);
  assert.equal(Object.values(f.get().stored).reduce((a, b) => a + b, 0), 1);
  assert.equal(f.get().auction.wins, 1);
  assert.ok(f.log.econ.some(e => e[0] === 'auction_win' && e[2] === -price));
  assert.ok(f.log.track.some(([n, p]) => n === 'auction_result' && p.outcome === 'win' && p.my_bids === 1));
});

test('watch mode cannot bid and never charges', () => {
  const f = fakes({ rng: () => 0 });
  const s = createAuctionScene(f.deps);
  s.begin('watch');
  assert.equal(s.playerBid(10), false);
  for (let i = 0; i < 600 && s.active(); i++) s.update(0.1, i * 0.1);
  assert.equal(f.log.done.outcome, 'watch');
  assert.equal(f.get().coins, 820);
  assert.equal(f.log.econ.length, 0);
});

test('a big frame advances several fixed ticks', () => {
  const f = fakes();
  const s = createAuctionScene(f.deps);
  s.begin('bid');
  s.update(0.25, 0.25);
  assert.ok(Math.abs(f.log.ui.at(-1).t - 7.8) < 1e-6, String(f.log.ui.at(-1).t));
});

test('a bid over the wallet is ignored', () => {
  const start = lotFor('2026-11-10').start;
  const f = fakes({ getCoins: () => start + 10 });
  const s = createAuctionScene(f.deps);
  s.begin('bid');
  assert.equal(s.playerBid(30), false);
  assert.equal(s.playerBid(50), false);
  assert.equal(f.log.ui.at(-1).price, start);
  assert.equal(s.playerBid(10), true);
  assert.equal(f.log.ui.at(-1).price, start + 10);
});

test('the current leader cannot bid again', () => {
  const f = fakes();
  const s = createAuctionScene(f.deps);
  s.begin('bid');
  assert.equal(s.playerBid(10), true);
  const price = f.log.ui.at(-1).price;
  assert.equal(s.playerBid(10), false);
  assert.equal(f.log.ui.at(-1).price, price);
});

test('night level is applied before tension every frame', () => {
  const f = fakes();
  const s = createAuctionScene(f.deps);
  s.begin('bid');
  s.update(0.1, 1);
  const names = f.log.calls.map(c => c[0]);
  const i = names.lastIndexOf('tension');
  assert.ok(i > 0);
  assert.equal(names[i - 1], 'night');
  assert.equal(f.log.calls[i - 1][1], 0.6);
});

test('a win the wallet can no longer pay goes unsold', () => {
  let coins = 820;
  const f = fakes({ getCoins: () => coins });
  const s = createAuctionScene(f.deps);
  s.begin('bid');
  assert.equal(s.playerBid(50), true);
  coins = 0;
  for (let i = 0; i < 200 && s.active(); i++) s.update(0.1, i * 0.1);
  assert.equal(f.log.done.outcome, 'none');
  assert.equal(f.log.done.price, 0);
  assert.equal(coins, 0);
  assert.deepEqual(f.get().stored, {});
  assert.equal(f.get().auction.wins, 0);
  assert.equal(f.log.econ.length, 0);
  const res = f.log.track.find(([n]) => n === 'auction_result')[1];
  assert.equal(res.outcome, 'none');
  assert.equal(res.price, 0);
});

test('a huge frame is clamped', () => {
  const f = fakes();
  const s = createAuctionScene(f.deps);
  s.begin('bid');
  s.update(100, 1);
  assert.equal(s.active(), true);
  const t = f.log.ui.at(-1).t;
  assert.ok(Math.abs(t - 7.8) < 1e-6, String(t));
});

test('with no unlocked bidders the player takes the lot at the start price plus their bid', () => {
  const f = fakes({ rng: () => 0, bidders: [] });
  const s = createAuctionScene(f.deps);
  s.begin('bid');
  const start = f.log.ui.at(-1).price;
  assert.equal(s.playerBid(10), true);
  for (let i = 0; i < 600 && s.active(); i++) s.update(0.1, i * 0.1);
  assert.equal(f.log.done.outcome, 'win');
  assert.equal(f.log.done.price, start + 10);
  assert.ok(f.log.ui.every(u => u.feed.every(e => e.who === 'me')));
});

test('watching with no unlocked bidders ends unsold', () => {
  const f = fakes({ rng: () => 0, bidders: [] });
  const s = createAuctionScene(f.deps);
  s.begin('watch');
  for (let i = 0; i < 600 && s.active(); i++) s.update(0.1, i * 0.1);
  assert.equal(f.log.done.outcome, 'none');
  assert.equal(f.log.done.leader, null);
  assert.equal(f.get().coins, 820);
});

test('only unlocked bidders show up in the feed', () => {
  const f = fakes({ rng: () => 0, bidders: [{ id: 'curator', style: 'big', inc: 50 }] });
  const s = createAuctionScene(f.deps);
  s.begin('watch');
  for (let i = 0; i < 600 && s.active(); i++) s.update(0.1, i * 0.1);
  const who = new Set(f.log.ui.flatMap(u => u.feed.map(e => e.who)));
  assert.deepEqual([...who], ['curator']);
  assert.equal(f.log.done.leader, 'curator');
});

test('say: 시작 → 내 입찰 → 막판 → 낙찰 순으로 상인 대사 자리가 바뀐다', () => {
  const f = fakes();
  const s = createAuctionScene(f.deps);
  s.begin('bid');
  assert.deepEqual(f.log.ui.at(-1).say, { slot: 'open', i: 0 });
  s.playerBid(50);
  assert.deepEqual(f.log.ui.at(-1).say, { slot: 'raise_me', i: 0 });
  let sawLast = false;
  for (let i = 0; i < 200 && s.active(); i++) {
    s.update(0.1, i * 0.1);
    if (f.log.ui.at(-1).say?.slot === 'last') sawLast = true;
  }
  assert.ok(sawLast);
  assert.deepEqual(f.log.ui.at(-1).say, { slot: 'sold_me', i: 0 });
});

test('say: 주민 입찰은 raise_npc 와 who, 주민 낙찰은 sold_npc', () => {
  const f = fakes({ rng: () => 0 });
  const s = createAuctionScene(f.deps);
  s.begin('watch');
  s.update(0.1, 0);
  const first = f.log.ui.find(u => u.say?.slot === 'raise_npc');
  assert.ok(first.say.who);
  for (let i = 0; i < 600 && s.active(); i++) s.update(0.1, i * 0.1);
  const end = f.log.ui.at(-1).say;
  assert.equal(end.slot, 'sold_npc');
  assert.equal(end.who, f.log.done.leader);
});
