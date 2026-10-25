import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';
import { CRYSTAL_PRICE } from '../js/data/delve.js';

const src = gameSource();
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SELL_PRICE = Object.fromEntries([...read('js/data/catalog.js').match(/SELL_PRICE = \{([^}]*)\}/)[1].matchAll(/(\w+):\s*(\d+)/g)].map(m => [m[1], Number(m[2])]));

test('gameState 에 delve 기본값, 로드 때 sanitizeDelve 로 복원', () => {
  assert.match(src, /delve:\s*defaultDelve\(\)/);
  assert.match(src, /gameState\.delve\s*=\s*sanitizeDelve\(saved\.delve\)/);
});

test('수정: 인벤 기본값·라벨·판매가·도감', () => {
  assert.match(src, /gotgam: 0, crystal: 0 \}/);
  assert.match(src, /crystal: '🔮수정'/);
  assert.equal(SELL_PRICE.crystal, CRYSTAL_PRICE);
  assert.match(read('js/data/places.js'), /SELL_ICO_G = \{[^}]*crystal: '🔮'/);
});
