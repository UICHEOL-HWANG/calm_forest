import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SLED_LINEUP, CASH_SLED_IDS, sledCash } from '../js/mountain/sled-lineup.js';
import { PRICE_IDS } from '../js/shop/price-ids.js';
import { ITEMS } from '../js/cosmetics/catalog.js';
import { PET_KINDS } from '../js/pet/rules.js';
import { isRewardDecor } from '../js/data/reward-decor.js';
import { priceIndex, ledgerRows } from '../functions/api/_paddle.js';
import { buildPlan } from '../scripts/lib/paddle-seed.mjs';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('cash sleds are exactly the lineup entries with a won price, each 3,900', () => {
  const withWon = Object.values(SLED_LINEUP).filter(s => s.cashWon > 0).map(s => s.id);
  assert.deepEqual([...CASH_SLED_IDS], withWon);
  for (const id of CASH_SLED_IDS) assert.equal(SLED_LINEUP[id].cashWon, 3900, id);
});

test('every cash sled has a PRICE_IDS slot and no other sled does', () => {
  for (const id of CASH_SLED_IDS) assert.ok(id in PRICE_IDS, id);
  for (const id of Object.keys(SLED_LINEUP).filter(i => !CASH_SLED_IDS.includes(i))) assert.ok(!(id in PRICE_IDS), id);
});

test('cash sled ids never collide with cosmetics, pets or reward decor', () => {
  for (const id of CASH_SLED_IDS) {
    assert.ok(!ITEMS.some(i => i.id === id), id);
    assert.ok(!PET_KINDS.some(k => k.id === id), id);
    assert.ok(!isRewardDecor(id), id);
  }
});

test('sledCash — null while the priceId is null, null for coin-only sleds', () => {
  for (const id of CASH_SLED_IDS) {
    const c = sledCash(id);
    if (PRICE_IDS[id]) assert.deepEqual(c, { priceId: PRICE_IDS[id], label: '₩3,900' });
    else assert.equal(c, null, id);
  }
  assert.equal(sledCash('basic'), null);
  assert.equal(sledCash('sky'), null);
  assert.equal(sledCash('nope'), null);
});

test('priceIndex — only sleds with a priceId, as kind sled', () => {
  const fake = (id) => (id === 'wind' ? { priceId: 'pri_01wind', label: '₩3,900' } : null);
  const idx = priceIndex(fake);
  assert.deepEqual(idx.get('pri_01wind'), { itemId: 'wind', kind: 'sled' });
  assert.ok(![...idx.values()].some(v => v.itemId === 'acorn' || v.itemId === 'skiff'));
  const live = priceIndex();
  for (const id of CASH_SLED_IDS) {
    const has = [...live.values()].some(v => v.itemId === id && v.kind === 'sled');
    assert.equal(has, !!PRICE_IDS[id], id);
  }
});

test('ledgerRows — a sled purchase becomes a sled ledger row', () => {
  const idx = priceIndex((id) => (id === 'skiff' ? { priceId: 'pri_01skiff', label: '₩3,900' } : null));
  const { rows, skipped } = ledgerRows({
    event_type: 'transaction.completed', occurred_at: '2026-10-16T00:00:00Z',
    data: { id: 'txn_s', currency_code: 'KRW', custom_data: { user_id: '3f2b1c9e-8a7d-4e6f-9b0a-1c2d3e4f5a6b' },
            details: { totals: { total: '3900' } }, items: [{ price: { id: 'pri_01skiff' } }] },
  }, idx);
  assert.deepEqual(skipped, []);
  assert.equal(rows[0].item_id, 'skiff');
  assert.equal(rows[0].kind, 'sled');
});

test('buildPlan — cash sleds register as kind sled, 3900 KRW, lineup name', () => {
  const plan = buildPlan(ITEMS, CASH_SLED_IDS.map(id => SLED_LINEUP[id]));
  const sleds = plan.filter(p => p.kind === 'sled');
  assert.deepEqual(sleds.map(p => p.itemId), ['wind', 'acorn', 'skiff']);
  for (const p of sleds) {
    assert.equal(p.amount, '3900');
    assert.equal(p.currency, 'KRW');
    assert.equal(p.name, SLED_LINEUP[p.itemId].name);
    assert.equal(p.description, 'calm forest 설산 썰매 (능력 썰매)');
  }
  assert.deepEqual(buildPlan(ITEMS), plan.filter(p => p.kind !== 'sled'));
});

test('seed script passes the cash sleds to buildPlan', () => {
  assert.match(src('scripts/paddle-seed.mjs'), /buildPlan\(ITEMS, CASH_SLED_IDS\.map\(/);
});

test('wiring — coin buy tracks pay coin, hut cafe gets a cash hook, cash button is shared', () => {
  const m = src('js/spaces/mountain.js');
  assert.match(m, /trackEvent\('hut_cafe_buy', \{[^}]*pay: 'coin'/);
  assert.match(m, /cashButton: /);
  assert.match(m, /sledCash\(id\)/);
  assert.match(m, /cashAvailable\(authState\)/);
  const c = src('js/spaces/cafe.js');
  assert.match(c, /export function cashButton\(/);
  assert.match(c, /refreshCafeModal\(\)/);
  assert.doesNotMatch(c, /else \{ switchPet\(c\.itemId\)/, 'a sled grant must not switch pets');
  const ui = src('js/mountain/cafe-ui.js');
  assert.match(ui, /hooks\.cashButton\?\.\(it\.id\)/);
});

test('purchases kind check allows sled', () => {
  assert.match(src('sql/migrations/migrate_purchases_sled_kind.sql'), /check \(kind in \('cosmetic', 'pet', 'decor', 'sled'\)\)/);
});

test('coin buy is locked while a cash checkout or grant is pending for that sled', async () => {
  globalThis.location ??= { search: '', hostname: 'localhost', href: 'http://localhost/', reload() {} };
  globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  const { coinLocked } = await import('../js/mountain/cafe-ui.js');
  const buy = { kind: 'buy', label: '1,500🪙', disabled: false };
  assert.equal(coinLocked(buy, 'wind', { isCashPending: (id) => id === 'wind' }), true);
  assert.equal(coinLocked(buy, 'acorn', { isCashPending: (id) => id === 'wind' }), false);
  assert.equal(coinLocked(buy, 'wind', {}), false);
  assert.equal(coinLocked({ kind: 'ride', label: '타기', disabled: false }, 'wind', { isCashPending: () => true }), false);
  assert.equal(coinLocked({ ...buy, disabled: true }, 'sky', {}), true);
});

test('wiring — pending predicate exported from cafe.js, passed to the hut cafe, and the coin path refuses too', () => {
  const c = src('js/spaces/cafe.js');
  assert.match(c, /export const cashPending = \(id\) => pendingCash\.has\(id\) \|\| cashBusy === id;/);
  const m = src('js/spaces/mountain.js');
  assert.match(m, /isCashPending: cashPending/);
  assert.match(m, /function buyFromCafe\(id, tab\) \{\n  if \(cashPending\(id\)\) \{ refreshCafeModal\(\); return; \}/);
  const ui = src('js/mountain/cafe-ui.js');
  assert.match(ui, /btn\.disabled = coinLocked\(row, it\.id, hooks\);/);
});
