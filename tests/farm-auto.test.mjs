import { test } from 'node:test';
import assert from 'node:assert/strict';
import { farmToolFor, farmActionIsNoop, FARM_AUTO_TOOLS } from '../js/farm-auto.js';

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

// ── farmActionIsNoop: "밭은 있는데 밭일이 안내 토스트뿐"인 순간 ────────────────
//   이 상태에선 주민 대화를 막지 않는다(game.js farmActionFirst). 베타 피드백 3건이 전부 여기 모인다.
test('farmActionIsNoop: want 가 null 이면 아무 일도 안 일어난다 (흙이 촉촉 · 반쯤 판 밭)', () => {
  assert.equal(farmActionIsNoop(null, { seeds: 9, hasGrowing: true }), true);
  assert.equal(farmActionIsNoop(undefined, { seeds: 9, hasGrowing: false }), true);
  // farmToolFor 가 실제로 null 을 내는 두 상태와 맞물리는지
  assert.equal(farmActionIsNoop(farmToolFor({ state: 'growing' }, true)), true);          // 흙이 촉촉
  assert.equal(farmActionIsNoop(farmToolFor({ state: 'empty', digAt: 123 }, false)), true); // 🪏 반쯤 판 밭
});

test('farmActionIsNoop: 씨앗 0 + 자라는 작물 있음 = 안내뿐', () => {
  assert.equal(farmActionIsNoop('seed', { seeds: 0, hasGrowing: true }), true);
});

test('farmActionIsNoop: 씨앗 0 이어도 자라는 작물이 없으면 안전장치가 채워 준다 = 의미 있는 동작', () => {
  assert.equal(farmActionIsNoop('seed', { seeds: 0, hasGrowing: false }), false);
});

test('farmActionIsNoop: 씨앗이 있으면 심기는 항상 일어난다', () => {
  assert.equal(farmActionIsNoop('seed', { seeds: 1, hasGrowing: true }), false);
});

test('farmActionIsNoop: 갈기·물주기·수확은 항상 실제 동작', () => {
  for (const want of ['hoe', 'water', 'sickle']) {
    assert.equal(farmActionIsNoop(want, { seeds: 0, hasGrowing: true }), false, want);
  }
});

test('farmActionIsNoop: 인자를 안 줘도 터지지 않는다(기본값)', () => {
  assert.equal(farmActionIsNoop('sickle'), false);
  assert.equal(farmActionIsNoop('seed'), false);   // seeds 0 · hasGrowing false → 안전장치 경로
});
