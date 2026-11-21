import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HALL, COIN_PER_STAR } from '../js/restaurant/data.js';
import { createSession, tickSession, actAt, SET_ODDS, SET_PATIENCE, SET_COIN_MUL } from '../js/restaurant/session.js';
import { SET_LOVE } from '../js/restaurant/regulars.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const yes = () => true;
const one = { iv: 1, pat: 1, win: 1 };
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
const REG = { farmer: { fav: 5, done: true }, angler: { fav: 5, done: true } };

function seated(opts) {
  const S = createSession({ star: 2, dda: one, rng: seq(0), neighbors: () => ['farmer'], regulars: REG, ...opts });
  for (let i = 0; i < 400 && !S.tickets.length; i++) tickSession(S, 0.05);
  return S;
}

function serveDish(S, menu, q = 1) {
  const tk = S.tickets.find(t => t.menu === menu);
  S.held = { kind: menu, q, plated: true };
  const tb = HALL.tables[tk.table];
  return actAt(S, { x: tb[0], z: tb[1] + 1.0 }, { take: yes }).find(e => e.type === 'served');
}

test('상수', () => {
  assert.equal(SET_ODDS, 0.25);
  assert.equal(SET_PATIENCE, 1.5);
  assert.equal(SET_COIN_MUL, 1.5);
  assert.equal(SET_LOVE, 2);
});

test('단골은 좋아하는 메뉴와 다른 메뉴 하나로 세트를 시킨다', () => {
  const S = seated();
  const g = S.guests[0];
  assert.deepEqual(g.set, ['riceball', 'grilled']);
  assert.deepEqual(S.tickets.map(t => [t.id, t.menu, t.set, t.pat]), [[g.id, 'riceball', true, SET_PATIENCE], [g.id, 'grilled', true, SET_PATIENCE]]);
});

test('단골이 아니거나, 확률에 안 걸리거나, 연습판이면 보통 주문', () => {
  assert.equal(seated({ regulars: {} }).tickets.length, 1);
  assert.equal(seated({ regulars: { farmer: { fav: 3, done: false } } }).tickets.length, 1);
  assert.equal(seated({ rng: seq(0.3) }).tickets.length, 1);
  assert.equal(seated({ first: true }).tickets.length, 1);
  assert.equal(seated({ regulars: undefined }).tickets.length, 1);
});

test('두 메뉴 재료가 다 있어야 세트, 같은 재료면 2개가 필요', () => {
  const stock = p => k => p[k] ?? 0;
  assert.equal(seated({ stock: stock({ rice: 3, fish: 0 }) }).tickets.length, 1);
  assert.equal(seated({ neighbors: () => ['angler'], stock: stock({ fish: 1, rice: 0 }) }).tickets.length, 1);
  const two = seated({ neighbors: () => ['angler'], stock: stock({ fish: 2, rice: 0 }) });
  assert.deepEqual(two.guests[0].set, ['grilled', 'soup']);
});

test('한 영업에서 같은 이웃은 세트를 한 번만', () => {
  const S = seated();
  assert.equal(S.tickets.length, 2);
  S.guests = []; S.tickets = []; S.next = 0;
  for (let i = 0; i < 400 && !S.tickets.length; i++) tickSession(S, 0.05);
  assert.equal(S.tickets.length, 1);
  assert.equal(S.guests[0].set, undefined);
});

test('두 접시를 다 받아야 먹고, 마지막 접시에 세트 보상이 붙는다', () => {
  const S = seated();
  const a = serveDish(S, 'grilled');
  assert.equal(S.guests[0].state, 'wait');
  assert.equal(S.tickets.length, 1);
  assert.equal(a.set, undefined);
  assert.equal(a.coins, a.stars * COIN_PER_STAR);
  const b = serveDish(S, 'riceball', 0.75);
  assert.equal(S.guests[0].state, 'eat');
  assert.equal(S.tickets.length, 0);
  const total = Math.round((a.coins + b.stars * COIN_PER_STAR) * SET_COIN_MUL);
  assert.deepEqual(b.set, { stars: Math.round((a.stars + b.stars) / 2), coins: total });
  assert.equal(b.coins, total - a.coins);
  assert.equal(S.stats.coins, total);
});

test('세트 주문표는 기다리는 시간 한도가 1.5배', () => {
  const plain = seated({ regulars: {} });
  const set = seated();
  for (const S of [plain, set]) S.time += 30;
  const p = serveDish(plain, plain.tickets[0].menu);
  const s = serveDish(set, 'riceball');
  assert.ok(s.stars > p.stars);
});

test('직원도 세트 접시를 하나씩 낸다', () => {
  const S = seated({ star: 3 });
  S.stations.pass.item = { kind: 'grilled', q: 1, plated: true };
  let ev = [];
  for (let i = 0; i < 60 && !ev.some(e => e.type === 'staffServed'); i++) ev = tickSession(S, 0.05);
  const e = ev.find(x => x.type === 'staffServed');
  assert.equal(e.menu, 'grilled');
  assert.deepEqual(S.tickets.map(t => t.menu), ['riceball']);
});

test('주문표 화면: 세트는 넓은 한 장에 두 메뉴, 낸 메뉴는 흐리게', async () => {
  const { ticketHtml } = await import('../js/restaurant/hud.js');
  const h = ticketHtml({ id: 2, table: 1, t0: 0, pat: SET_PATIENCE, fav: true, set: [{ menu: 'riceball', done: true }, { menu: 'grilled', done: false }] }, 1, 1, null);
  assert.match(h, /class="tk set fav"/);
  assert.match(h, /<i class="done">🍙<\/i><i>🐟<\/i>/);
  assert.doesNotMatch(ticketHtml({ id: 1, table: 0, t0: 0, menu: 'soup' }, 1, 1, null), /tk set/);
});

test('연결: 세션에 단골 목록, 화면 주문표 합치기, 세트 호감도와 트래킹', () => {
  const rt = read('js/restaurant/runtime.js');
  assert.match(rt, /regulars: r\.regulars/);
  assert.match(rt, /setTickets\(/);
  const sp = read('js/spaces/restaurant.js');
  assert.match(sp, /function onGuestServed\(\{ npc, menu, stars, table, set \}\)/);
  assert.match(sp, /set && set\.stars >= 4 \? SET_LOVE : 0/);
  assert.match(sp, /trackEvent\('restaurant_set', \{ npc, stars: set\.stars, coins: set\.coins \}\)/);
});

test('세트 한 접시를 낸 뒤에는 남은 접시 재료만 잡아 둔다', () => {
  const pantry = { fish: 1, rice: 1 };
  const S = seated({ stock: k => pantry[k] ?? 0 });
  assert.deepEqual(S.guests[0].set, ['riceball', 'grilled']);
  serveDish(S, 'grilled');
  S.cfg = { ...S.cfg, tables: 3 };
  S.neighbors = () => [];
  S.next = 0;
  tickSession(S, 0.05);
  assert.equal(S.guests.length, 2);
  assert.equal(S.guests[1].menu, 'grilled');
});

test('손님 머리 위 기다림 표시도 세트 시간 한도를 따른다', () => {
  assert.match(read('js/restaurant/runtime.js'), /const pat = S\.dda\.pat \* \(t\.pat \|\| 1\)/);
});
