import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('game.js hands the AdMob rewarded module to the prepass buttons', () => {
  const game = read('js/game.js');
  assert.match(game, /import \{ rewardedAvailable, showRewarded \} from '\.\/ads\/admob\.js';/);
  assert.match(game, /setPrepassProvider\(\{ available: \(\) => rewardedAvailable, show: showRewarded \}\);/);
});

test('the prepass button module and the AdMob module live in separate files', () => {
  assert.match(read('js/ads/rewarded.js'), /export function createRewarded\(deps\)/);
  assert.match(read('js/ads/admob.js'), /export const rewardedAvailable = ads\.available;/);
  assert.match(read('js/ads/rewarded-debug.js'), /from '\.\/admob\.js';/);
});
