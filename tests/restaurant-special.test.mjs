import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HALL } from '../js/restaurant/data.js';
import { SPECIAL_ODDS, SPECIAL_COIN_MUL, pickSpecial, todaySpecial, sanitizeSpecial } from '../js/restaurant/special.js';
import { pickMenu } from '../js/restaurant/regulars.js';
import { createSession, tickSession, actAt } from '../js/restaurant/session.js';
import { defaultRestaurant, sanitizeRestaurant } from '../js/restaurant/rules.js';

const MENUS = ['grilled', 'riceball', 'soup'];
const yes = () => true;
const one = { iv: 1, pat: 1, win: 1 };
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
const lcg = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

test('상수', () => {
  assert.equal(SPECIAL_ODDS, 0.5);
  assert.equal(SPECIAL_COIN_MUL, 2);
});

test('후보가 없으면 null', () => {
  assert.equal(pickSpecial(MENUS, undefined, '2026-11-21'), null);
  assert.equal(pickSpecial(MENUS, {}, '2026-11-21'), null);
  assert.equal(pickSpecial(MENUS, { fish: 0, rice: 0 }, '2026-11-21'), null);
});

test('재고 있는 재료의 메뉴만 후보', () => {
  for (let d = 1; d <= 30; d++) {
    const date = `2026-11-${String(d).padStart(2, '0')}`;
    assert.equal(pickSpecial(MENUS, { fish: 0, rice: 2 }, date), 'riceball');
  }
});

test('같은 인자면 같은 결과, 여러 날짜에 후보가 모두 나온다', () => {
  const pantry = { fish: 3, rice: 3 };
  assert.equal(pickSpecial(MENUS, pantry, '2026-11-21'), pickSpecial(MENUS, pantry, '2026-11-21'));
  const seen = new Set();
  for (let d = 1; d <= 30; d++) seen.add(pickSpecial(MENUS, pantry, `2026-11-${String(d).padStart(2, '0')}`));
  assert.deepEqual([...seen].sort(), ['grilled', 'riceball', 'soup']);
});

test('todaySpecial: 같은 날이면 저장 값을 그대로 돌려준다', () => {
  const rest = { star: 1, special: { date: '2026-11-21', menu: 'soup' } };
  const r = todaySpecial(rest, MENUS, { fish: 0, rice: 5 }, '2026-11-21');
  assert.equal(r.rest, rest);
  assert.equal(r.menu, 'soup');
});

test('todaySpecial: 날짜가 다르면 새로 골라 저장', () => {
  const rest = { star: 1, special: { date: '2026-11-20', menu: 'soup' } };
  const r = todaySpecial(rest, MENUS, { fish: 0, rice: 5 }, '2026-11-21');
  assert.notEqual(r.rest, rest);
  assert.equal(r.menu, 'riceball');
  assert.deepEqual(r.rest.special, { date: '2026-11-21', menu: 'riceball' });
  assert.equal(rest.special.menu, 'soup');
});

test('todaySpecial: 후보 없으면 menu null 로 저장', () => {
  const r = todaySpecial({ star: 1 }, MENUS, {}, '2026-11-21');
  assert.equal(r.menu, null);
  assert.deepEqual(r.rest.special, { date: '2026-11-21', menu: null });
});

test('sanitizeSpecial', () => {
  assert.deepEqual(sanitizeSpecial({ date: '2026-11-21', menu: 'soup' }), { date: '2026-11-21', menu: 'soup' });
  assert.deepEqual(sanitizeSpecial({ date: '2026-11-21', menu: null }), { date: '2026-11-21', menu: null });
  assert.equal(sanitizeSpecial({ date: '2026-11-21', menu: 'pizza' }), null);
  assert.equal(sanitizeSpecial({ date: 3, menu: 'soup' }), null);
  assert.equal(sanitizeSpecial(null), null);
});

test('rules: 기본값과 sanitize 에 special', () => {
  assert.equal(defaultRestaurant().special, null);
  assert.deepEqual(sanitizeRestaurant({ special: { date: '2026-11-21', menu: 'soup' } }).special, { date: '2026-11-21', menu: 'soup' });
  assert.equal(sanitizeRestaurant({ special: { menu: 'pizza' } }).special, null);
});

test('pickMenu: 특선 비율은 0.5 + 0.5/메뉴 수 근처', () => {
  const rng = lcg(7);
  let n = 0;
  for (let i = 0; i < 2000; i++) if (pickMenu(null, MENUS, rng, 'soup') === 'soup') n++;
  const want = 0.5 + 0.5 / MENUS.length;
  assert.ok(Math.abs(n / 2000 - want) < 0.06, String(n / 2000));
});

test('pickMenu: 단골 좋아하는 메뉴가 특선보다 먼저', () => {
  assert.equal(pickMenu('angler', MENUS, seq(0.1), 'soup'), 'grilled');
});

test('pickMenu: menus 에 없는 특선은 무시', () => {
  assert.equal(pickMenu(null, ['grilled', 'riceball'], seq(0.99), 'soup'), 'riceball');
});

test('pickMenu: 특선 없으면 기존 동작', () => {
  assert.equal(pickMenu(null, ['grilled', 'riceball'], seq(0.99)), 'riceball');
});

function serveOne(special) {
  const S = createSession({ star: 1, dda: one, rng: seq(0) });
  for (let i = 0; i < 400 && !S.tickets.length; i++) tickSession(S, 0.05);
  const tk = S.tickets[0];
  S.special = special;
  S.held = { kind: tk.menu, q: 1, plated: true };
  const tb = HALL.tables[tk.table];
  return { tk, ev: actAt(S, { x: tb[0], z: tb[1] + 1.0 }, { take: yes }).find(e => e.type === 'served') };
}

test('세션: 특선 메뉴 코인은 두 배', () => {
  const plain = serveOne(null);
  const sp = serveOne(plain.tk.menu);
  assert.equal(sp.tk.menu, plain.tk.menu);
  assert.equal(sp.ev.coins, plain.ev.coins * SPECIAL_COIN_MUL);
});

test('세션: 특선이 아닌 메뉴는 그대로', () => {
  const plain = serveOne(null);
  const other = plain.tk.menu === 'grilled' ? 'riceball' : 'grilled';
  assert.equal(serveOne(other).ev.coins, plain.ev.coins);
});

test('세션: first 면 special 은 null', () => {
  assert.equal(createSession({ star: 1, dda: one, first: true, special: 'grilled' }).special, null);
  assert.equal(createSession({ star: 1, dda: one, special: 'grilled' }).special, 'grilled');
});
