import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SALE_WINDOWS, saleOpen } from '../js/shop/sale-window.js';

const KST = 9 * 3600 * 1000;
const at = (ymd, hh = 12) => { const [y, m, d] = ymd.split('-').map(Number); return Date.UTC(y, m - 1, d, hh) - KST; };
const garden = { sale: 'halloweenGarden' };

test('유령 정원 창 — 10/22 ~ 11/2 (KST, 양끝 포함)', () => {
  assert.deepEqual({ ...SALE_WINDOWS.halloweenGarden }, { from: '2026-10-22', to: '2026-11-02' });
  assert.equal(saleOpen(garden, at('2026-10-21', 23)), false);
  assert.equal(saleOpen(garden, at('2026-10-22', 0)), true);
  assert.equal(saleOpen(garden, at('2026-11-02', 23)), true);
  assert.equal(saleOpen(garden, at('2026-11-03', 0)), false);
});

test('판매 창 halloween 은 그대로다', () => {
  assert.deepEqual({ ...SALE_WINDOWS.halloween }, { from: '2026-10-17', to: '2026-11-02' });
});
