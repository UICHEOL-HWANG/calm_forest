import { test } from 'node:test';
import assert from 'node:assert/strict';
import { farmToolFor, FARM_AUTO_TOOLS } from '../js/farm-auto.js';

test('FARM_AUTO_TOOLS: 괭이·씨앗·물조리개·낫만 (🪏삽 제외)', () => {
  assert.deepEqual(FARM_AUTO_TOOLS, ['hoe', 'seed', 'water', 'sickle']);
});

test('farmToolFor: 밭이 없으면 null (괭이면 호출자가 새 밭을 만든다)', () => {
  assert.equal(farmToolFor(null, false), null);
  assert.equal(farmToolFor(undefined, false), null);
});

test('farmToolFor: 시든 밭 → 괭이(다시 갈기)', () => {
  assert.equal(farmToolFor({ state: 'wilted' }, false), 'hoe');
});

test('farmToolFor: 갈아둔 빈 밭 → 씨앗', () => {
  assert.equal(farmToolFor({ state: 'empty', digAt: 0 }, false), 'seed');
  assert.equal(farmToolFor({ state: 'empty' }, false), 'seed');
});

test('farmToolFor: 🪏 반쯤 판 빈 밭은 자동 전환 안 함(null)', () => {
  assert.equal(farmToolFor({ state: 'empty', digAt: 12.3 }, false), null);
});

test('farmToolFor: 자라는 중 + 마른 흙 → 물조리개', () => {
  assert.equal(farmToolFor({ state: 'growing' }, false), 'water');
});

test('farmToolFor: 자라는 중 + 촉촉한 흙 → null(도구를 바꾸지 않는다)', () => {
  assert.equal(farmToolFor({ state: 'growing' }, true), null);
});

test('farmToolFor: 다 자람 → 낫', () => {
  assert.equal(farmToolFor({ state: 'mature' }, false), 'sickle');
  assert.equal(farmToolFor({ state: 'mature' }, true), 'sickle');
});

test('farmToolFor: 모르는 상태는 null', () => {
  assert.equal(farmToolFor({ state: 'weird' }, false), null);
});
