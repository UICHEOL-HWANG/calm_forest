import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HALL, STAR, STAR_UP, MENU, MENU_KEYS, FRY_COIN_MUL, FRY, BATTER_TAPS, FRY_OF } from '../js/restaurant/data.js';
import { sanitizeRestaurant, starUpReady, applyStarUp, defaultRestaurant, fryNeedle, fryZone, fryHeatOk, fryBubble, fryState, chopTap, chopDone } from '../js/restaurant/rules.js';
import { createSession, tickSession, contextAt, actAt, stationView } from '../js/restaurant/session.js';

const one = { iv: 1, pat: 1, win: 1 };
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
const yes = () => true;
const stn = id => HALL.stations.find(s => s.id === id);
const near = id => { const s = stn(id); return { x: s.x, z: s.z - 0.9 }; };
const stationAt = id => { const s = stn(id); return { x: s.x, z: s.z }; };

test('fried menu data', () => {
  assert.deepEqual(MENU_KEYS.slice(3), ['shrimpfry', 'squidfry', 'vegfry']);
  assert.deepEqual(MENU.shrimpfry, { ico: '🍤', from: 'shrimp', fry: true });
  assert.deepEqual(MENU.squidfry, { ico: '🦑', from: 'squid', fry: true });
  assert.deepEqual(MENU.vegfry, { ico: '🥬', from: 'veg', fry: true });
  assert.equal(FRY_COIN_MUL, 1.5);
});

test('star 5 and 6 rules', () => {
  assert.deepEqual(STAR[5], { tables: 4, menus: ['grilled', 'riceball', 'soup', 'shrimpfry', 'squidfry'], pans: 2, pot: true, staff: true, fryers: 1, iv: [9, 6.5] });
  assert.deepEqual(STAR[6].menus, [...STAR[5].menus, 'vegfry']);
  assert.equal(STAR[6].fryers, 2);
  assert.deepEqual(STAR[6].iv, [9, 6]);
  assert.deepEqual(STAR_UP[5], { rating: 320, served: { soup: 15 }, coins: 400 });
  assert.deepEqual(STAR_UP[6], { rating: 480, served: { shrimpfry: 10 }, coins: 600 });
});

test('star up 4 to 5 and 5 to 6 need rating and dishes', () => {
  const base = { ...defaultRestaurant(), star: 4, rating: 320, served: { soup: 14 } };
  assert.equal(starUpReady(base), false);
  assert.equal(starUpReady({ ...base, rating: 319, served: { soup: 15 } }), false);
  const ok = { ...base, served: { soup: 15 } };
  assert.deepEqual([applyStarUp(ok).rest.star, applyStarUp(ok).coins], [5, 400]);
  const s5 = { ...defaultRestaurant(), star: 5, rating: 480, served: { shrimpfry: 9 } };
  assert.equal(starUpReady(s5), false);
  assert.deepEqual([applyStarUp({ ...s5, served: { shrimpfry: 10 } }).rest.star, applyStarUp({ ...s5, served: { shrimpfry: 10 } }).coins], [6, 600]);
  assert.equal(starUpReady({ ...s5, star: 6, rating: 9999, served: { shrimpfry: 99 } }), false);
});

test('new stations', () => {
  const want = { crate_shrimp: ['crate', 1.6, 3.55, 5], crate_squid: ['crate', 2.5, 3.55, 5], crate_veg: ['crate', 4.4, 3.55, 6], bowl: ['bowl', 3.5, 0.9, 5], fryer0: ['fryer', 4.45, 0.9, 5], fryer1: ['fryer', 5.4, 0.9, 6] };
  for (const [id, [kind, x, z, need]] of Object.entries(want)) assert.deepEqual([stn(id).kind, stn(id).x, stn(id).z, stn(id).need], [kind, x, z, need]);
  assert.equal(stn('crate_shrimp').give, 'shrimp');
  assert.equal(stn('crate_squid').give, 'squid');
  assert.equal(stn('crate_veg').give, 'veg');
});

test('new stations keep 0.85 from each other', () => {
  const s = HALL.stations;
  for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) {
    if (!/crate_(shrimp|squid|veg)|bowl|fryer/.test(s[i].id + s[j].id)) continue;
    assert.ok(Math.hypot(s[i].x - s[j].x, s[i].z - s[j].z) >= 0.85, `${s[i].id} ${s[j].id}`);
  }
});

test('star 5 guest orders fried menu when stocked, not when out', () => {
  const want = k => (k === 'shrimp' || k === 'squid') ? 9 : 0;
  const S = createSession({ star: 5, dda: one, rng: seq(0.99, 0.99), stock: want });
  for (let i = 0; i < 200; i++) tickSession(S, 0.05, { pos: near('board') });
  assert.ok(S.guests.length > 0);
  assert.ok(S.guests.every(g => MENU[g.menu].fry));
  const none = createSession({ star: 5, dda: one, rng: seq(0.99, 0.99), stock: k => (k === 'fish' || k === 'rice' ? 9 : 0) });
  for (let i = 0; i < 200; i++) tickSession(none, 0.05, { pos: near('board') });
  assert.ok(none.guests.length > 0);
  assert.ok(none.guests.every(g => !MENU[g.menu].fry));
});

function serveFried(menu, special) {
  const S = createSession({ star: 5, dda: one, rng: seq(0), special });
  S.guests.push({ id: 1, table: 0, menu, npc: null, state: 'wait', t: 0, walk: 1 });
  S.tickets.push({ id: 1, table: 0, menu, t0: 0 });
  S.held = { kind: menu, plated: true, q: 1 };
  const [tx, tz] = HALL.tables[0];
  const ev = actAt(S, { x: tx, z: tz - 0.5 }, { take: yes });
  return ev.find(e => e.type === 'served');
}

test('fried dish pays 1.5x rounded', () => {
  const e = serveFried('shrimpfry', null);
  assert.equal(e.coins, Math.round(e.stars * 5 * 1.5));
  assert.equal(serveFried('grilled', null).coins, serveFried('grilled', null).stars * 5);
});

test('fried dish stacks with the daily special', () => {
  const e = serveFried('squidfry', 'squidfry');
  assert.equal(e.coins, Math.round(e.stars * 5 * 2 * 1.5));
});

test('fry multiplier applies per dish before set total', () => {
  const S = createSession({ star: 5, dda: one, rng: seq(0) });
  S.guests.push({ id: 1, table: 0, menu: 'shrimpfry', npc: null, state: 'wait', t: 0, walk: 1, set: ['shrimpfry', 'grilled'] });
  S.tickets.push({ id: 1, table: 0, menu: 'shrimpfry', t0: 0, set: true }, { id: 1, table: 0, menu: 'grilled', t0: 0, set: true });
  S.held = { kind: 'shrimpfry', plated: true, q: 1 };
  const [tx, tz] = HALL.tables[0];
  const ev = actAt(S, { x: tx, z: tz - 0.5 }, { take: yes });
  const e = ev.find(x => x.type === 'served');
  assert.equal(e.coins, Math.round(e.stars * 5 * 1.5));
});

test('sanitize caps star at the highest STAR key and fills new served keys', () => {
  assert.equal(sanitizeRestaurant({ star: 99 }).star, 6);
  assert.equal(sanitizeRestaurant({ star: 6 }).star, 6);
  const old = sanitizeRestaurant({ star: 4, served: { grilled: 3, riceball: 2, soup: 8 } });
  assert.deepEqual(old.served, { grilled: 3, riceball: 2, soup: 8, shrimpfry: 0, squidfry: 0, vegfry: 0 });
});

test('fry data', () => {
  assert.deepEqual(FRY, { swing: 1.6, zone: [0.58, 0.82], cook: 4.5, win: 1.8, burn: 2.5, bubbles: [1.2, 2.8], bubbleWin: 0.8 });
  assert.equal(BATTER_TAPS, 2);
  assert.deepEqual(FRY_OF, { shrimp: 'shrimpfry', squid: 'squidfry', veg: 'vegfry' });
});

test('chop taps accept a target count', () => {
  assert.equal(chopDone({ taps: 2, last: 0 }, 2), true);
  assert.equal(chopDone({ taps: 2, last: 0 }), false);
  assert.equal(chopTap({ taps: 2, last: 0 }, 5, 2).taps, 2);
  assert.equal(chopTap({ taps: 1, last: 0 }, 5, 2).taps, 2);
  assert.equal(chopTap({ taps: 3, last: 0 }, 5).taps, 4);
});

test('fry needle is a triangle wave', () => {
  const near0 = (a, b) => Math.abs(a - b) < 1e-9;
  assert.ok(near0(fryNeedle(0), 0));
  assert.ok(near0(fryNeedle(0.8), 1));
  assert.ok(near0(fryNeedle(1.6), 0));
  assert.ok(near0(fryNeedle(0.4), 0.5));
  assert.ok(near0(fryNeedle(1.2), 0.5));
  assert.ok(near0(fryNeedle(1.6 * 3 + 0.4), 0.5));
});

test('fry zone and heat check', () => {
  const [a, b] = fryZone(1);
  assert.ok(Math.abs(a - 0.58) < 1e-9 && Math.abs(b - 0.82) < 1e-9);
  const [c, d] = fryZone(0.5);
  assert.ok(Math.abs((c + d) / 2 - 0.7) < 1e-9 && Math.abs(d - c - 0.12) < 1e-9);
  assert.equal(fryHeatOk(0, 1), false);
  assert.equal(fryHeatOk(0.56, 1), true);
  assert.equal(fryHeatOk(0.8, 1), false);
  assert.equal(fryHeatOk(0.56, 0.1), true);
  assert.equal(fryHeatOk(0.4, 0.5), false);
});

test('fry bubbles open in windows', () => {
  assert.equal(fryBubble(1.19), -1);
  assert.equal(fryBubble(1.2), 0);
  assert.equal(fryBubble(1.99), 0);
  assert.equal(fryBubble(2.0), -1);
  assert.equal(fryBubble(2.8), 1);
  assert.equal(fryBubble(3.59), 1);
  assert.equal(fryBubble(3.6), -1);
});

test('fry state boundaries', () => {
  assert.equal(fryState(4.49, 1), 'raw');
  assert.equal(fryState(4.5, 1), 'perfect');
  assert.equal(fryState(4.5 + 1.8 - 0.01, 1), 'perfect');
  assert.equal(fryState(4.5 + 1.8, 1), 'over');
  assert.equal(fryState(4.5 + 1.8 + 2.5 - 0.01, 1), 'over');
  assert.equal(fryState(4.5 + 1.8 + 2.5, 1), 'burnt');
  assert.equal(fryState(4.5 + 0.9, 0.5), 'over');
});

const heldAct = (S, id, kind) => { S.held = kind ? { kind, q: 1 } : null; return actAt(S, near(id), { take: yes }); };

test('bowl: put raw, two taps make batter, pick', () => {
  const S = createSession({ star: 5, dda: one, rng: seq(0) });
  assert.equal(contextAt(S, near('bowl')), null);
  S.held = { kind: 'fish', q: 1 };
  assert.equal(contextAt(S, near('bowl')), null);
  S.held = { kind: 'shrimp', q: 1 };
  assert.equal(contextAt(S, near('bowl')).do, 'put');
  assert.deepEqual(actAt(S, near('bowl'), { take: yes }), [{ type: 'put', id: 'bowl', kind: 'shrimp' }]);
  assert.equal(S.held, null);
  S.held = { kind: 'squid', q: 1 };
  assert.equal(contextAt(S, near('bowl')), null);
  S.held = null;
  assert.equal(contextAt(S, near('bowl')).do, 'batter');
  assert.deepEqual(stationView(S, 'bowl'), { kind: 'chop', taps: 0, beat: true, need: 2 });
  assert.deepEqual(actAt(S, near('bowl'), { take: yes }), [{ type: 'chop', id: 'bowl', taps: 1 }]);
  S.time += 1;
  assert.deepEqual(actAt(S, near('bowl'), { take: yes }), [{ type: 'chopDone', id: 'bowl', kind: 'shrimpBat' }]);
  assert.equal(stationView(S, 'bowl'), null);
  assert.equal(contextAt(S, near('bowl')).do, 'pick');
  S.held = { kind: 'veg', q: 1 };
  assert.equal(contextAt(S, near('bowl')), null);
  S.held = null;
  actAt(S, near('bowl'), { take: yes });
  assert.deepEqual(S.held, { kind: 'shrimpBat', q: 1 });
  assert.equal(S.stations.bowl.item, null);
});

test('bowl makes squidBat and vegBat', () => {
  for (const raw of ['squid', 'veg']) {
    const S = createSession({ star: 6, dda: one, rng: seq(0) });
    S.held = { kind: raw, q: 1 };
    actAt(S, near('bowl'), { take: yes });
    actAt(S, near('bowl'), { take: yes });
    S.time += 1;
    actAt(S, near('bowl'), { take: yes });
    assert.equal(S.stations.bowl.item.kind, `${raw}Bat`);
  }
});

const fryerWith = (id = 'fryer0', star = 5, kind = 'shrimpBat') => {
  const S = createSession({ star, dda: one, rng: seq(0) });
  S.held = { kind, q: 1 };
  actAt(S, near(id), { take: yes });
  return S;
};
const idle = (S, sec) => { for (let i = 0; i < Math.round(sec / 0.05); i++) tickSession(S, 0.05, { pos: near('board') }); };
const at = (S, id, t) => { const st = S.stations[id]; st.t = t; };
const act = (S, id) => actAt(S, near(id), { take: yes });

test('fryer: only battered food goes in', () => {
  const S = createSession({ star: 5, dda: one, rng: seq(0) });
  for (const k of ['shrimp', 'fish', 'grilled']) { S.held = { kind: k, q: 1 }; assert.equal(contextAt(S, near('fryer0')), null); }
  S.held = { kind: 'shrimpBat', q: 1, plated: true };
  assert.equal(contextAt(S, near('fryer0')), null);
  S.held = { kind: 'squidBat', q: 1 };
  assert.equal(contextAt(S, near('fryer0')).do, 'put');
});

test('fryer: put starts heat phase and heat tap fixes the result', () => {
  const S = fryerWith();
  const st = S.stations.fryer0;
  assert.deepEqual([st.phase, st.heat, st.shakes, st.t, st.h0], ['heat', null, [false, false], 0, 0]);
  assert.deepEqual(stationView(S, 'fryer0'), { kind: 'fryHeat', p: 0, zone: fryZone(1) });
  S.time = 0.56;
  assert.equal(contextAt(S, near('fryer0')).do, 'heat');
  S.held = { kind: 'fish', q: 1 };
  assert.equal(contextAt(S, near('fryer0')).do, 'heat');
  S.held = null;
  assert.deepEqual(act(S, 'fryer0'), [{ type: 'heat', id: 'fryer0', ok: true }]);
  assert.deepEqual([st.phase, st.heat, st.t], ['fry', true, 0]);
});

test('fryer: heat miss', () => {
  const S = fryerWith();
  S.time = 0.1;
  assert.deepEqual(act(S, 'fryer0'), [{ type: 'heat', id: 'fryer0', ok: false }]);
});

test('fryer: heat phase waits forever until tapped', () => {
  const S = fryerWith();
  idle(S, 30);
  assert.equal(S.stations.fryer0.phase, 'heat');
  assert.equal(S.stations.fryer0.t, 0);
});

test('fryer: heat window measured from put time', () => {
  const S = createSession({ star: 5, dda: one, rng: seq(0) });
  S.time = 10;
  S.held = { kind: 'vegBat', q: 1 };
  act(S, 'fryer0');
  S.time = 10.56;
  assert.equal(act(S, 'fryer0')[0].ok, true);
});

const fry = (heatOk, shakes, takeAt, opts = {}) => {
  const S = fryerWith(opts.id, opts.star, opts.kind);
  const id = opts.id || 'fryer0';
  S.time = heatOk ? 0.56 : 0.1;
  act(S, id);
  const st = S.stations[id];
  const evs = [];
  for (const [i, on] of shakes.entries()) if (on) { st.t = FRY.bubbles[i] + 0.1; evs.push(...act(S, id)); }
  at(S, id, takeAt);
  return { S, st, evs };
};

test('fryer: shake only while a bubble is open and not yet shaken', () => {
  const S = fryerWith();
  S.time = 0.56; act(S, 'fryer0');
  const st = S.stations.fryer0;
  st.t = 1.0;
  assert.equal(contextAt(S, near('fryer0')), null);
  st.t = 1.3;
  assert.equal(contextAt(S, near('fryer0')).do, 'shake');
  S.held = { kind: 'fish', q: 1 };
  assert.equal(contextAt(S, near('fryer0')).do, 'shake');
  S.held = null;
  assert.equal(stationView(S, 'fryer0').bubble, 0);
  assert.deepEqual(act(S, 'fryer0'), [{ type: 'shake', id: 'fryer0', i: 0 }]);
  assert.deepEqual(st.shakes, [true, false]);
  assert.equal(contextAt(S, near('fryer0')), null);
  st.t = 2.9;
  assert.equal(contextAt(S, near('fryer0')).do, 'shake');
  act(S, 'fryer0');
  assert.deepEqual(st.shakes, [true, true]);
  assert.equal(stationView(S, 'fryer0').perfect, true);
});

test('fryer: ticks only advance fry phase', () => {
  const S = fryerWith();
  S.time = 0.56; act(S, 'fryer0');
  const before = S.stations.fryer0.t;
  idle(S, 1);
  assert.ok(Math.abs(S.stations.fryer0.t - before - 1) < 1e-6);
});

test('fryer: not ready before cook time, then pick with empty hand only', () => {
  const { S } = fry(true, [true, true], 4.4);
  assert.equal(contextAt(S, near('fryer0')), null);
  at(S, 'fryer0', 4.5);
  assert.equal(contextAt(S, near('fryer0')).do, 'pickCook');
  S.held = { kind: 'fish', q: 1 };
  assert.equal(contextAt(S, near('fryer0')), null);
});

test('fryer: full flow gives q 1 dish', () => {
  const { S } = fry(true, [true, true], 4.6);
  const ev = act(S, 'fryer0');
  assert.deepEqual(ev, [{ type: 'cooked', id: 'fryer0', kind: 'shrimpfry', q: 1 }]);
  assert.deepEqual(S.held, { kind: 'shrimpfry', q: 1 });
  assert.equal(S.stats.perfect, 1);
  assert.equal(S.stats.takes, 1);
  const st = S.stations.fryer0;
  assert.deepEqual([st.item, st.phase, st.heat, st.shakes, st.t], [null, null, null, null, 0]);
});

test('fryer: quality 0.75 when heat missed, a shake missed, or pulled early or late', () => {
  const q = (h, sh, t) => { const { S } = fry(h, sh, t); act(S, 'fryer0'); return S.held; };
  assert.deepEqual(q(false, [true, true], 4.6), { kind: 'shrimpfry', q: 0.75 });
  assert.deepEqual(q(true, [true, false], 4.6), { kind: 'shrimpfry', q: 0.75 });
  assert.deepEqual(q(true, [false, true], 4.6), { kind: 'shrimpfry', q: 0.75 });
  assert.deepEqual(q(true, [false, false], 4.6), { kind: 'shrimpfry', q: 0.75 });
  assert.deepEqual(q(true, [true, true], 4.5 + 1.8), { kind: 'shrimpfry', q: 0.75 });
  assert.deepEqual(q(true, [true, true], 4.5 + 1.8 + 2.4), { kind: 'shrimpfry', q: 0.75 });
});

test('fryer: burnt result counts and can be trashed', () => {
  const { S } = fry(true, [true, true], 4.5 + 1.8 + 2.5);
  assert.deepEqual(act(S, 'fryer0'), [{ type: 'cooked', id: 'fryer0', kind: 'burnt', q: 0 }]);
  assert.equal(S.stats.burnt, 1);
  assert.equal(contextAt(S, near('trash')).do, 'trash');
  assert.deepEqual(act(S, 'trash'), [{ type: 'trash', kind: 'burnt' }]);
  assert.equal(S.held, null);
});

test('fryer: gauge view in fry phase', () => {
  const { S, st } = fry(true, [true, false], 3.7);
  const span = 4.5 + 1.8 + 2.5;
  const v = stationView(S, 'fryer0');
  assert.equal(v.kind, 'gauge');
  assert.ok(Math.abs(v.p - 3.7 / span) < 1e-9);
  assert.ok(Math.abs(v.zone[0] - 4.5 / span) < 1e-9 && Math.abs(v.zone[1] - 6.3 / span) < 1e-9);
  assert.deepEqual([v.state, v.perfect, v.bubble], ['raw', false, -1]);
  st.t = 5;
  assert.equal(stationView(S, 'fryer0').state, 'perfect');
  st.t = 8;
  assert.equal(stationView(S, 'fryer0').state, 'over');
  st.t = 9;
  assert.deepEqual([stationView(S, 'fryer0').state, stationView(S, 'fryer0').p], ['burnt', 1]);
});

test('fryer: each fryer has its own state', () => {
  const S = createSession({ star: 6, dda: one, rng: seq(0) });
  S.held = { kind: 'squidBat', q: 1 };
  act(S, 'fryer0');
  S.held = { kind: 'vegBat', q: 1 };
  act(S, 'fryer1');
  S.time = 0.56;
  act(S, 'fryer0');
  assert.equal(S.stations.fryer1.phase, 'heat');
  assert.equal(S.stations.fryer0.phase, 'fry');
  S.stations.fryer0.t = 4.6; S.stations.fryer0.shakes = [true, true];
  act(S, 'fryer0');
  assert.equal(S.held.kind, 'squidfry');
});

test('bowl and fryer are inactive below their star', () => {
  const S = createSession({ star: 4, dda: one, rng: seq(0) });
  for (const id of ['bowl', 'fryer0']) {
    S.held = { kind: id === 'bowl' ? 'shrimp' : 'shrimpBat', q: 1 };
    assert.equal(contextAt(S, stationAt(id)), null);
    assert.equal(stationView(S, id), null);
  }
  const S5 = createSession({ star: 5, dda: one, rng: seq(0) });
  S5.held = { kind: 'vegBat', q: 1 };
  assert.equal(contextAt(S5, near('fryer1')), null);
});

test('one fried dish end to end pays 1.5x', () => {
  const S = createSession({ star: 5, dda: one, rng: seq(0) });
  S.held = { kind: 'shrimp', q: 1 };
  act(S, 'bowl');
  S.held = null;
  act(S, 'bowl'); S.time += 1; act(S, 'bowl');
  act(S, 'bowl');
  assert.equal(S.held.kind, 'shrimpBat');
  S.time = 5;
  act(S, 'fryer0');
  S.time = 5.56;
  act(S, 'fryer0');
  const st = S.stations.fryer0;
  st.t = 1.3; act(S, 'fryer0');
  st.t = 2.9; act(S, 'fryer0');
  st.t = 4.6;
  act(S, 'fryer0');
  assert.deepEqual(S.held, { kind: 'shrimpfry', q: 1 });
  assert.equal(contextAt(S, stationAt('plates')).do, 'plate');
  actAt(S, stationAt('plates'), { take: yes });
  assert.equal(S.held.plated, true);
  S.guests.push({ id: 1, table: 0, menu: 'shrimpfry', npc: null, state: 'wait', t: 0, walk: 1 });
  S.tickets.push({ id: 1, table: 0, menu: 'shrimpfry', t0: S.time });
  const [tx, tz] = HALL.tables[0];
  const e = actAt(S, { x: tx, z: tz - 0.5 }, { take: yes }).find(x => x.type === 'served');
  assert.equal(e.stars, 5);
  assert.equal(e.coins, Math.round(5 * 5 * 1.5));
});

test('좁은 화면에서 다음 할 일 안내는 화면 폭을 넘지 않고 글을 아이콘 아래로 내린다', async () => {
  const { readFileSync } = await import('node:fs');
  const h = readFileSync(new URL('../js/restaurant/hud.js', import.meta.url), 'utf8');
  assert.match(h, /@media \(max-width:520px\)\{#rest-hud \.next\{max-width:calc\(100vw - 20px\);box-sizing:border-box;flex-wrap:wrap;/);
});
