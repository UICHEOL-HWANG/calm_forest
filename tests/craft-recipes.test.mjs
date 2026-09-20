import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CRAFT_RECIPES, recipeOf, yieldOf, canAfford, lackOf } from '../js/craft/recipes.js';

test('표: 품목 3종 — 스펙 §3 수치 그대로', () => {
  assert.deepEqual(CRAFT_RECIPES.map(r => r.id), ['charcoal', 'flour', 'brick']);
  assert.deepEqual(recipeOf('charcoal').cost, { wood: 8 });
  assert.deepEqual(recipeOf('flour').cost, { wheat: 4 });
  assert.deepEqual(recipeOf('brick').cost, { stone: 6, coal: 2 });
  assert.deepEqual(CRAFT_RECIPES.map(r => r.sell), [9, 18, 12]);
  assert.deepEqual(CRAFT_RECIPES.map(r => r.mg), ['grill', 'mill', 'season']);
});

test('yieldOf: 등급 0~3 → 2·3·4·5', () => {
  assert.deepEqual([0, 1, 2, 3].map(g => yieldOf('charcoal', g)), [2, 3, 4, 5]);
  assert.equal(yieldOf('flour', 0), 2, '아쉬워도 최소 2개는 나온다 — 완성 여부는 등급과 무관');
  assert.equal(yieldOf('brick', 3), 5);
});

test('yieldOf: 등급이 범위 밖이면 양끝으로 물린다', () => {
  assert.equal(yieldOf('charcoal', -1), 2);
  assert.equal(yieldOf('charcoal', 9), 5);
  assert.equal(yieldOf('charcoal', undefined), 2, '세이브에 등급이 없으면 최소');
});

test('canAfford / lackOf: 재료가 모자란 키를 짚는다', () => {
  assert.equal(canAfford('brick', { stone: 6, coal: 2 }), true);
  assert.equal(canAfford('brick', { stone: 6, coal: 1 }), false);
  assert.deepEqual(lackOf('brick', { stone: 2, coal: 2 }), ['stone']);
  assert.deepEqual(lackOf('brick', { stone: 2 }), ['stone', 'coal']);
  assert.deepEqual(lackOf('brick', { stone: 6, coal: 2 }), []);
  assert.deepEqual(lackOf('charcoal', {}), ['wood'], '빈 인벤토리도 터지지 않는다');
});

test('recipeOf: 없는 id 는 undefined', () => {
  assert.equal(recipeOf('bread'), undefined, '빵은 화덕이 아니라 부엌 소관이다');
});
