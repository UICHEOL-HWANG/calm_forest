import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('포구·식당·경매 길 안내가 도는 동안 목표 화살표는 물러난다', () => {
  assert.match(read('js/guide/goal-guide.js'), /!deps\.cameraFree\(\) \|\| deps\.otherGuide\?\.\(\)\) \{ hideArrow\(\); return; \}/);
  assert.match(read('js/game.js'), /otherGuide: \(\) => portGuideActive\(\) \|\| restaurantGuideActive\(\) \|\| auctionGuideActive\(\),/);
  assert.match(read('js/auction/index.js'), /export function auctionGuideActive\(\) \{ return !!guide\?\.active; \}/);
});
