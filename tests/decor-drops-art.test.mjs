import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DECOR_SETS } from '../js/data/decor-sets.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const K = read('../js/decor-drops/art-kitchen.js'), N = read('../js/decor-drops/art-night.js'), IN = read('../js/spaces/indoor.js');
const ids = (src) => JSON.parse(src.match(/export const IDS = (\[[^\]]*\])/)[1].replace(/'/g, '"'));

test('art covers all 18 ids exactly once', () => {
  assert.deepEqual([...ids(K), ...ids(N)].sort(), DECOR_SETS.flatMap(s => [...s.items, s.bonus]).sort());
});
test('decorMesh dispatches both art modules', () => {
  assert.match(IN, /from '\.\.\/decor-drops\/art-kitchen\.js'/);
  assert.match(IN, /from '\.\.\/decor-drops\/art-night\.js'/);
});
test('baked, emissive capped, no point lights', () => {
  for (const src of [K, N]) {
    assert.match(src, /bakeGroup/);
    assert.doesNotMatch(src, /PointLight/);
    for (const m of src.matchAll(/emissiveIntensity: ([\d.]+)/g)) assert.ok(+m[1] <= 0.85, m[0]);
  }
});
test('no comments', () => { for (const src of [K, N]) assert.doesNotMatch(src, /^\s*\/\/|\/\*/m); });

test('only the matte body casts shadows; decorMesh honors noShadow', () => {
  for (const src of [K, N]) assert.match(src, /out\.traverse\(o => \{ if \(o\.isMesh && o !== body\) o\.userData\.noShadow = true; \}\);/);
  assert.match(IN, /root\.traverse\(o => \{ if \(o\.isMesh\) o\.castShadow = !o\.userData\.noShadow; \}\);/);
});
