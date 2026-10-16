import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POND_MAX_RIVER, pondFish, pondSea, pondView, pondChanges, pickPondSpot, pondBlocks, POND_TOAST_DELAY, pondToastDue } from '../js/pond/rules.js';

const RIVER = ['sakura_trout', 'puffer', 'maple_carp', 'ice_smelt', 'rare', 'uncommon', 'common'];
const SEA = ['aji', 'buri', 'mola', 'tuna'];
const ctx = { riverIds: RIVER, seaIds: SEA };

test('도감이 비면 연못이 없다', () => {
  assert.deepEqual(pondView({ dexFish: {}, seaBest: {} }, ctx), { fish: [], sea: null, has: false });
  assert.deepEqual(pondView({ dexFish: null, seaBest: undefined }, ctx), { fish: [], sea: null, has: false });
});

test('물고기는 첫 발견 순, 모르는 id 는 버린다', () => {
  assert.deepEqual(pondFish({ uncommon: 30, common: 10, shark: 5, rare: 20 }, RIVER), ['common', 'rare', 'uncommon']);
});

test('같은 시각이면 riverIds 순서', () => {
  assert.deepEqual(pondFish({ common: 1, rare: 1 }, RIVER), ['rare', 'common']);
});

test('최대 7마리', () => {
  const all = Object.fromEntries(RIVER.map((id, i) => [id, i + 1]));
  assert.equal(pondFish(all, RIVER).length, POND_MAX_RIVER);
});

test('대어는 가장 무거운 바다 종 하나, 동률은 seaIds 순서', () => {
  assert.equal(pondSea({}, SEA), null);
  assert.deepEqual(pondSea({ aji: 2, tuna: 88, mola: 60 }, SEA), { sp: 'tuna', w: 88 });
  assert.deepEqual(pondSea({ mola: 50, buri: 50 }, SEA), { sp: 'buri', w: 50 });
  assert.equal(pondSea({ whale: 900, aji: -1, buri: 'x' }, SEA), null);
});

test('바다 물고기만 있어도 연못이 생긴다', () => {
  assert.equal(pondView({ dexFish: {}, seaBest: { aji: 1.2 } }, ctx).has, true);
});

test('변화 감지: 처음 생김 → created 하나만', () => {
  const next = pondView({ dexFish: { common: 1 }, seaBest: {} }, ctx);
  assert.deepEqual(pondChanges(null, next), [{ type: 'created', species: 'common' }]);
});

test('변화 감지: 새 종·대어 교체', () => {
  const a = pondView({ dexFish: { common: 1 }, seaBest: { aji: 2 } }, ctx);
  const b = pondView({ dexFish: { common: 1, rare: 2 }, seaBest: { aji: 2, buri: 9 } }, ctx);
  assert.deepEqual(pondChanges(a, b), [{ type: 'fish', species: 'rare' }, { type: 'sea', species: 'buri' }]);
  assert.deepEqual(pondChanges(b, b), []);
});

test('같은 종 무게 경신도 sea 변화', () => {
  const a = pondView({ dexFish: {}, seaBest: { tuna: 60 } }, ctx);
  const b = pondView({ dexFish: {}, seaBest: { tuna: 70 } }, ctx);
  assert.deepEqual(pondChanges(a, b), [{ type: 'sea', species: 'tuna' }]);
});

test('연못이 없어지면 변화 없음', () => {
  const a = pondView({ dexFish: { common: 1 }, seaBest: {} }, ctx);
  const none = pondView({ dexFish: {}, seaBest: {} }, ctx);
  assert.deepEqual(pondChanges(a, none), []);
});

const SPOTS = [{ dx: 5, dz: 4.2 }, { dx: 6.4, dz: -1.5 }, { dx: 2.5, dz: 6.5 }];

test('야외 장식이 첫 후보를 차지하면 다음 후보', () => {
  assert.deepEqual(pickPondSpot(SPOTS, [], 2), SPOTS[0]);
  assert.deepEqual(pickPondSpot(SPOTS, [{ dx: 5.5, dz: 4 }], 2), SPOTS[1]);
  assert.equal(pickPondSpot(SPOTS, SPOTS.map(s => ({ ...s })), 2), null);
});

test('나무 배치 차단은 모든 후보 둘레', () => {
  const house = { x: -8, z: -8 };
  assert.equal(pondBlocks(SPOTS, house, -3, -3.8, 2), true);
  assert.equal(pondBlocks(SPOTS, house, -1.6, -9.5, 2), true);
  assert.equal(pondBlocks(SPOTS, house, 10, 10, 2), false);
  assert.equal(pondBlocks(SPOTS, house, -3, -3.8 + 2.4, 2, 0.5), true);
});

test('생성 토스트는 마을에서 잠시 기다린 뒤 한 번만', () => {
  const ok = { pending: true, seen: false, inVillage: true, waitedSec: POND_TOAST_DELAY };
  assert.equal(pondToastDue(ok), true);
  assert.equal(pondToastDue({ ...ok, pending: false }), false);
  assert.equal(pondToastDue({ ...ok, seen: true }), false);
  assert.equal(pondToastDue({ ...ok, inVillage: false }), false);
  assert.equal(pondToastDue({ ...ok, waitedSec: 3.9 }), false);
});
