import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GRAIN_REACH, COMBO_IDLE_MS, GEM_CHANCE, GEM_SPARKLE_MS,
  grainOf, strokeStep, grainSweep, comboStart, comboCut, comboScratch, comboTick,
  comboMult, comboCrossed, comboGauge, carvePayout, pickGemCell,
} from '../js/spaces/carve-rules.js';

const COLS = 12, ROWS = 9;
const FISH = ['............', '....####....', '...######...', '##.########.', '############',
  '##.########.', '...######...', '....####....', '............'];
const cellsOf = (mask) => mask.join('').split('').map(ch => ch === '#' ? 'k' : 'w');
const at = (c, r) => r * COLS + c;

test('grain only for wood designs: fish and mush horizontal, heart and tree vertical', () => {
  assert.equal(grainOf({ id: 'fish', mat: 'wood' }), 'h');
  assert.equal(grainOf({ id: 'mush', mat: 'wood' }), 'h');
  assert.equal(grainOf({ id: 'heart', mat: 'wood' }), 'v');
  assert.equal(grainOf({ id: 'tree', mat: 'wood' }), 'v');
  for (const id of ['star', 'cup', 'cat']) assert.equal(grainOf({ id, mat: 'stone' }), null);
  assert.equal(grainOf({ id: 'fish', mat: 'stone' }), null);
  assert.equal(grainOf(null), null);
});

test('strokeStep reads the drag direction only when it runs along the grain', () => {
  assert.deepEqual(strokeStep(at(2, 0), at(4, 0), 'h', COLS), { dc: 1, dr: 0 });
  assert.deepEqual(strokeStep(at(4, 0), at(2, 1), 'h', COLS), { dc: -1, dr: 0 });
  assert.equal(strokeStep(at(2, 0), at(2, 3), 'h', COLS), null);
  assert.equal(strokeStep(at(2, 0), at(3, 1), 'h', COLS), null);
  assert.deepEqual(strokeStep(at(0, 1), at(0, 3), 'v', COLS), { dc: 0, dr: 1 });
  assert.deepEqual(strokeStep(at(0, 4), at(1, 2), 'v', COLS), { dc: 0, dr: -1 });
  assert.equal(strokeStep(at(0, 1), at(3, 1), 'v', COLS), null);
  assert.equal(strokeStep(at(5, 5), at(5, 5), 'h', COLS), null);
  assert.equal(strokeStep(at(2, 0), at(4, 0), null, COLS), null);
});

test('grainSweep clears up to two more waste chips ahead in the same line', () => {
  const cells = cellsOf(FISH);
  assert.equal(GRAIN_REACH, 2);
  assert.deepEqual(grainSweep(cells, at(0, 0), { dc: 1, dr: 0 }, COLS, ROWS), [at(1, 0), at(2, 0)]);
  assert.deepEqual(grainSweep(cells, at(11, 8), { dc: -1, dr: 0 }, COLS, ROWS), [at(10, 8), at(9, 8)]);
});

test('grainSweep stops at a keep chip and never cuts it', () => {
  const cells = cellsOf(FISH);
  assert.deepEqual(grainSweep(cells, at(2, 1), { dc: 1, dr: 0 }, COLS, ROWS), [at(3, 1)]);
  assert.deepEqual(grainSweep(cells, at(3, 1), { dc: 1, dr: 0 }, COLS, ROWS), []);
  const scratched = cells.slice(); scratched[at(1, 0)] = 's';
  assert.deepEqual(grainSweep(scratched, at(0, 0), { dc: 1, dr: 0 }, COLS, ROWS), []);
  for (const i of grainSweep(cells, at(0, 2), { dc: 1, dr: 0 }, COLS, ROWS)) assert.equal(cells[i], 'w');
});

test('grainSweep stops at the edge and skips chips already cut', () => {
  const cells = cellsOf(FISH);
  assert.deepEqual(grainSweep(cells, at(10, 0), { dc: 1, dr: 0 }, COLS, ROWS), [at(11, 0)]);
  assert.deepEqual(grainSweep(cells, at(11, 0), { dc: 1, dr: 0 }, COLS, ROWS), []);
  assert.deepEqual(grainSweep(cells, at(0, 8), { dc: 0, dr: 1 }, COLS, ROWS), []);
  const cut = cells.slice(); cut[at(1, 0)] = 'x';
  assert.deepEqual(grainSweep(cut, at(0, 0), { dc: 1, dr: 0 }, COLS, ROWS), [at(2, 0)]);
  assert.deepEqual(grainSweep(cells, at(0, 6), { dc: 0, dr: 1 }, COLS, ROWS), [at(0, 7), at(0, 8)]);
});

test('combo rises once per stroke that cuts, and keeps the best of the run', () => {
  let s = comboStart();
  assert.deepEqual(s, { combo: 0, best: 0, lastAt: null });
  s = comboCut(s, 1000, true);
  s = comboCut(s, 1100, false);
  s = comboCut(s, 1200, false);
  assert.equal(s.combo, 1);
  s = comboCut(s, 1600, true);
  s = comboCut(s, 2000, true);
  assert.deepEqual(s, { combo: 3, best: 3, lastAt: 2000 });
});

test('a scratch resets the combo but not the best', () => {
  let s = comboStart();
  for (let k = 0; k < 6; k++) s = comboCut(s, 1000 + k * 500, true);
  s = comboScratch(s);
  assert.equal(s.combo, 0);
  assert.equal(s.best, 6);
});

test('three seconds idle resets the combo', () => {
  let s = comboStart();
  s = comboCut(s, 1000, true);
  s = comboCut(s, 2000, true);
  assert.equal(comboTick(s, 2000 + COMBO_IDLE_MS).combo, 2);
  assert.equal(comboTick(s, 2001 + COMBO_IDLE_MS).combo, 0);
  assert.equal(comboTick(s, 2001 + COMBO_IDLE_MS).best, 2);
  const late = comboCut(s, 2001 + COMBO_IDLE_MS, true);
  assert.equal(late.combo, 1);
  assert.equal(late.best, 2);
  const slow = comboCut(s, 2001 + COMBO_IDLE_MS, false);
  assert.equal(slow.combo, 1);
  const zero = comboStart();
  assert.equal(comboTick(zero, 99999), zero);
});

test('combo bonus from the best combo of the run', () => {
  assert.equal(comboMult(0), 1);
  assert.equal(comboMult(4), 1);
  assert.equal(comboMult(5), 1.1);
  assert.equal(comboMult(9), 1.1);
  assert.equal(comboMult(10), 1.2);
  assert.equal(comboMult(14), 1.2);
  assert.equal(comboMult(15), 1.3);
  assert.equal(comboMult(40), 1.3);
});

test('comboCrossed reports only a newly reached bonus step', () => {
  assert.equal(comboCrossed(4, 5).at, 5);
  assert.equal(comboCrossed(4, 5).mult, 1.1);
  assert.equal(comboCrossed(5, 6), null);
  assert.equal(comboCrossed(9, 10).mult, 1.2);
  assert.equal(comboCrossed(14, 15).mult, 1.3);
  assert.equal(comboCrossed(15, 16), null);
  assert.equal(comboCrossed(3, 3), null);
});

test('combo gauge fills to 15 with ticks at 5, 10, 15', () => {
  assert.equal(comboGauge(0), 0);
  assert.equal(Math.round(comboGauge(7) * 10) / 10, 46.7);
  assert.equal(comboGauge(15), 100);
  assert.equal(comboGauge(30), 100);
});

test('payout applies the combo bonus after the quality multiplier', () => {
  assert.equal(carvePayout(26, 1.5, 12), 47);
  assert.equal(carvePayout(26, 1.5, 0), 39);
  assert.equal(carvePayout(22, 1.0, 5), 24);
  assert.equal(carvePayout(30, 0.7, 15), 27);
});

test('hidden gem: 10% wood, 25% stone, one waste chip per run', () => {
  assert.equal(GEM_CHANCE.wood, 0.1);
  assert.equal(GEM_CHANCE.stone, 0.25);
  assert.equal(GEM_SPARKLE_MS, 4000);
  const cells = cellsOf(FISH);
  const seq = (...v) => { let k = 0; return () => v[k++]; };
  assert.equal(pickGemCell(cells, 'wood', seq(0.1, 0)), -1);
  assert.equal(pickGemCell(cells, 'wood', seq(0.0999, 0)), 0);
  assert.equal(pickGemCell(cells, 'stone', seq(0.2499, 0.999999)), at(11, 8));
  assert.equal(pickGemCell(cells, 'stone', seq(0.25, 0)), -1);
  for (let k = 0; k < 50; k++) {
    const i = pickGemCell(cells, 'stone', seq(0, k / 50));
    assert.equal(cells[i], 'w');
  }
  assert.equal(pickGemCell(cells.map(() => 'k'), 'stone', seq(0, 0)), -1);
  assert.equal(pickGemCell(cells, 'clay', seq(0, 0)), -1);
});
