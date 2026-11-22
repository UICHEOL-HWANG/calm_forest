import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JARS_PER_SEG, KIND_CODE, SEG_COINS, THRESHOLDS, addCatch, nextThreshold, segmentsLit, splitColors, stringColors } from '../js/glade/string.js';

test('thresholds are eleven ascending steps ending at 240', () => {
  assert.equal(THRESHOLDS.length, 11);
  assert.deepEqual([...THRESHOLDS], [3, 8, 15, 25, 40, 60, 85, 115, 150, 190, 240]);
  assert.equal(SEG_COINS.length, 11);
});

test('segmentsLit and nextThreshold follow the table', () => {
  assert.equal(segmentsLit(0), 0);
  assert.equal(segmentsLit(2), 0);
  assert.equal(segmentsLit(3), 1);
  assert.equal(segmentsLit(239), 10);
  assert.equal(segmentsLit(240), 11);
  assert.equal(segmentsLit(9999), 11);
  assert.equal(nextThreshold(0), 3);
  assert.equal(nextThreshold(3), 8);
  assert.equal(nextThreshold(240), null);
});

test('splitColors shares four jars by the catch ratio', () => {
  assert.equal(splitColors({ y: 4 }), 'yyyy');
  assert.equal(splitColors({ y: 3, b: 1 }), 'yyyb');
  assert.equal(splitColors({ y: 2, b: 2 }).split('').sort().join(''), 'bbyy');
  assert.equal(splitColors({ y: 5, b: 1, g: 1 }).length, JARS_PER_SEG);
  assert.equal(splitColors({}), 'yyyy');
  assert.equal(splitColors({ y: 9, r: 1 }), 'yyyy');
  assert.equal(splitColors({ y: 2, r: 1 }), 'yyyr');
});

test('addCatch counts up, tracks kinds and lights a segment at each threshold', () => {
  let s = { caught: 0, seg: '', string: '' };
  s = addCatch(s, 'yellow');
  assert.deepEqual(s, { caught: 1, seg: 'y1', string: '', lit: null });
  s = addCatch(s, 'blue');
  assert.equal(s.seg, 'y1b1');
  s = addCatch(s, 'yellow');
  assert.equal(s.caught, 3);
  assert.equal(s.lit, 1);
  assert.equal(s.seg, '');
  assert.equal(s.string.length, JARS_PER_SEG);
  assert.equal(s.string.split('').sort().join(''), 'byyy');
});

test('addCatch reaches eleven segments at 240 and stays there', () => {
  let s = { caught: 0, seg: '', string: '' };
  const lit = [];
  for (let i = 0; i < 260; i++) { s = addCatch(s, i % 3 ? 'yellow' : 'green'); if (s.lit) lit.push(s.lit); }
  assert.deepEqual(lit, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.equal(s.string.length, 11 * JARS_PER_SEG);
  assert.equal(s.caught, 260);
});

test('addCatch survives missing or broken saved values', () => {
  const s = addCatch({ caught: undefined, seg: undefined, string: undefined }, 'frost');
  assert.deepEqual(s, { caught: 1, seg: 'f1', string: '', lit: null });
  const t = addCatch({ caught: 2, seg: 'zz9??y1', string: 'yy!!bbXX' }, 'nope');
  assert.equal(t.caught, 3);
  assert.equal(t.lit, 1);
  assert.match(t.string, /^[a-z]+$/);
});

test('stringColors turns the saved string into kind ids per segment', () => {
  assert.deepEqual(stringColors('yybgrrrr'), [['yellow', 'yellow', 'blue', 'green'], ['rainbow', 'rainbow', 'rainbow', 'rainbow']]);
  assert.deepEqual(stringColors(''), []);
  assert.deepEqual(stringColors('yyb'), []);
  assert.equal(Object.keys(KIND_CODE).length, 8);
});
