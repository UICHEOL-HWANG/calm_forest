import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { allMaxed } from '../js/affinity/stages.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('allMaxed is true only when every visible villager reached the last stage', () => {
  assert.equal(allMaxed({ farmer: 15, chef: 20 }, ['farmer', 'chef']), true);
  assert.equal(allMaxed({ farmer: 15, chef: 0 }, ['farmer', 'chef']), false);
  assert.equal(allMaxed({ farmer: 15 }, ['farmer', 'chef']), false);
  assert.equal(allMaxed({}, []), false);
});

test('tracker shows nothing instead of the start hint when everyone is family', () => {
  assert.match(read('js/affinity/index.js'), /if \(!pick\) return allMaxed\(gameState\.affinity, visibleIds\(\)\) \? null : \{ start: true, text: trackerStart\(lang\(\)\) \};/);
});

test('a letter without a gift cannot be claimed or tracked', () => {
  assert.match(read('js/affinity/index.js'), /if \(!v \|\| v\.claimed \|\| !v\.gift\) return null;/);
});

test('letters that arrived before the house was done are announced when it is finished', () => {
  const idx = read('js/affinity/index.js');
  assert.match(idx, /export function affinityHouseReady\(\) \{\n  const n = unreadLetterCount\(\);\n  if \(n\) ui\.toast\?\.\(retroToast\(n, lang\(\)\), 3600, \{ afterDialog: true \}\);\n\}/);
  assert.match(read('js/spaces/house.js'), /if \(stage === 3\) \{\n[^]*?affinityHouseReady\(\);/);
});
