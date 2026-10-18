import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DECOR_SETS, DROP_SOURCES } from '../js/data/decor-sets.js';
import { gameSource } from './helpers/game-source.mjs';

const SRC = gameSource();
const start = SRC.indexOf('const DECOR = [');
const LINES = SRC.slice(start, SRC.indexOf('\n];', start)).split('\n');
const line = (id) => LINES.find(l => l.includes(`id: '${id}'`));
const ALL = DECOR_SETS.flatMap(s => [...s.items, s.bonus]);

test('6 sets, 18 unique ids', () => {
  assert.equal(DECOR_SETS.length, 6);
  assert.equal(new Set(ALL).size, 18);
});

test('12 sources, each item dropped by exactly one source', () => {
  assert.equal(Object.keys(DROP_SOURCES).length, 12);
  const items = Object.values(DROP_SOURCES).map(d => d.item).sort();
  assert.deepEqual(items, DECOR_SETS.flatMap(s => s.items).sort());
});

test('p is capped at 1/4 and pity is 2/p', () => {
  for (const [src, d] of Object.entries(DROP_SOURCES)) {
    assert.ok(d.p > 0 && d.p <= 0.25, src);
    assert.equal(d.pity, Math.round(2 / d.p), src);
  }
});

test('no fishing or sea source', () => {
  assert.ok(!('fish' in DROP_SOURCES) && !('sea' in DROP_SOURCES));
});

test('every id is a hidden free DECOR entry tagged with its set', () => {
  for (const s of DECOR_SETS) for (const id of [...s.items, s.bonus]) {
    const l = line(id);
    assert.ok(l, id);
    assert.match(l, /hidden: true/);
    assert.match(l, /cost: 0/);
    assert.match(l, new RegExp(`set: '${s.id}'`));
  }
});
