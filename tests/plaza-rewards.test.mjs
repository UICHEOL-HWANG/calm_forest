import { test } from 'node:test';
import assert from 'node:assert/strict';
import { claimPlan, convertPlan, buyPlan } from '../js/plaza/rewards.js';
import { plazaDefault } from '../js/plaza/rules.js';

const S = 'harvest-2026';

test('claimPlan: 등급별 누적 보상, 한 번만', () => {
  assert.deepEqual(claimPlan(plazaDefault(), S, null), { badge: null, decor: [], already: false, none: true });
  assert.deepEqual(claimPlan(plazaDefault(), S, 'bronze'), { badge: 'harvest_helper', decor: [], already: false, none: false });
  assert.deepEqual(claimPlan(plazaDefault(), S, 'silver').decor, ['pumpkinlamp']);
  assert.deepEqual(claimPlan(plazaDefault(), S, 'gold').decor, ['pumpkinlamp', 'harvestscarecrow']);
  assert.equal(claimPlan(plazaDefault(), S, 'gold').badge, 'harvest_helper');
  assert.equal(claimPlan({ ...plazaDefault(), claimed: { [S]: 'gold' } }, S, 'gold').already, true);
});

test('convertPlan: 시즌 끝난 뒤 1회, 🍂1 = 🪙2', () => {
  assert.deepEqual(convertPlan(plazaDefault(), S, 12, 'active'), { coins: 0, already: false });
  assert.deepEqual(convertPlan(plazaDefault(), S, 12, 'after'), { coins: 24, already: false });
  assert.deepEqual(convertPlan({ ...plazaDefault(), converted: { [S]: true } }, S, 12, 'after'), { coins: 0, already: true });
  assert.deepEqual(convertPlan(plazaDefault(), S, 0, 'after'), { coins: 0, already: false });
});

test('buyPlan: 좌판 품목만, 🍂 부족 거절', () => {
  assert.deepEqual(buyPlan({ leaf: 50 }, 'haybale'), { ok: true, price: 40 });
  assert.deepEqual(buyPlan({ leaf: 50 }, 'pumpkins'), { ok: false, price: 60, reason: 'leaf' });
  assert.deepEqual(buyPlan({ leaf: 999 }, 'pumpkinlamp'), { ok: false, price: 0, reason: 'item' });
});
