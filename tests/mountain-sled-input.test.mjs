import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { steerFrom, pointerSide } from '../js/mountain/sled-input.js';

const readSrc = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('both sides pressed cancel out', () => {
  assert.equal(steerFrom({ left: true, right: true }), 0);
  assert.equal(steerFrom({ left: true, right: false }), -1);
  assert.equal(steerFrom({ left: false, right: true }), 1);
  assert.equal(steerFrom({ left: false, right: false }), 0);
});

test('screen halves map to sides', () => {
  assert.equal(pointerSide(10, 400), 'left');
  assert.equal(pointerSide(390, 400), 'right');
  assert.equal(pointerSide(200, 400), 'right');
});

test('pointer steering ignores taps on the boost button and the result panel', () => {
  const src = readSrc('js/mountain/sled-input.js');
  assert.match(src, /closest\?\.\('\[data-sled-boost\], \[data-sled-ui\]'\)/);
  assert.doesNotMatch(src, /stopPropagation/);
  const hud = readSrc('js/mountain/sled-hud.js');
  assert.match(hud, /class="sled-boost" data-sled-boost/);
  assert.match(hud, /class="sled-result" data-sled-ui/);
});
