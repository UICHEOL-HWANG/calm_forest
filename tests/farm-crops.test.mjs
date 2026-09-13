import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ADV_CROPS, SEED_ORDER, MATURE, isAdv, growthPerWater, stageIndex, renderStage, wiltTimeFor, weedRoll, pestChance, harvestYield, nextSeedSel, seedKeyOf } from '../js/farm-crops.js';

const basic = { id: 'carrot', name: '당근' };
const [wheat, corn, grape] = ADV_CROPS;

test('ADV_CROPS: 스펙 §2-2 — 밀 4단계/물2 · 옥수수 4단계/물3 · 포도 5단계/물3(지지대) · 판매가 3×/4×/6×', () => {
  assert.deepEqual(ADV_CROPS.map(c => c.id), ['wheat', 'corn', 'grape']);
  assert.deepEqual(ADV_CROPS.map(c => [c.stages, c.waters]), [[4, 2], [4, 3], [5, 3]]);
  assert.deepEqual(ADV_CROPS.map(c => c.price), [15, 20, 30], '기본 작물 5🪙 의 3·4·6배');
  assert.equal(grape.trellis, true); assert.equal(wheat.trellis, false);
  for (const c of ADV_CROPS) { assert.equal(c.adv, true); assert.ok(c.seedCoin > 0 && c.yield >= 2 && c.fruit > 0 && c.leaf > 0, c.id); }
  assert.deepEqual(SEED_ORDER, ['basic', 'wheat', 'corn', 'grape']);
  assert.equal(seedKeyOf('wheat'), 'seed_wheat'); assert.equal(seedKeyOf('basic'), 'seed');
});

test('isAdv: adv 플래그가 있는 작물만 — 기존 4작물은 false', () => {
  assert.equal(isAdv(basic), false); assert.equal(isAdv(wheat), true); assert.equal(isAdv(null), false);
});

test('growthPerWater: 기존 작물은 한 글자도 안 바뀐다(0.4 / 큰 물조리개 0.7)', () => {
  assert.equal(growthPerWater(basic, false, false), 0.4);
  assert.equal(growthPerWater(basic, true, false), 0.7);
  assert.equal(growthPerWater(basic, false, true), 0.4, '비료 플래그는 기존 작물에 영향 없음');
});

test('growthPerWater: 고급 작물은 물 횟수대로 딱 익는다 · 비료 없으면 절반 속도 · 큰 물조리개 ×1.75', () => {
  for (const c of ADV_CROPS) {
    const g = growthPerWater(c, false, true);
    assert.ok(g * c.waters >= MATURE, `${c.id}: ${c.waters}번이면 익어야 한다`);
    assert.ok(g * (c.waters - 1) < MATURE, `${c.id}: ${c.waters - 1}번으론 안 익는다`);
    assert.ok(Math.abs(growthPerWater(c, false, false) - g / 2) < 1e-9, '비료 없으면 절반');
    assert.ok(Math.abs(growthPerWater(c, true, true) - g * 1.75) < 1e-9, '큰 물조리개 1.75배(기존 0.4→0.7 비율)');
  }
});

test('stageIndex / renderStage: 기존 작물 0.4/0.8 그대로 · 고급은 단계 수만큼 잘게 · 그림은 0/1/2 로 접힌다', () => {
  assert.deepEqual([0, 0.39, 0.4, 0.79, 0.8, 1].map(g => stageIndex(basic, g)), [0, 0, 1, 1, 2, 2]);
  assert.deepEqual([0, 0.2, 0.4, 0.6, 0.8].map(g => stageIndex(grape, g)), [0, 1, 2, 3, 4], '포도 5단계');
  assert.deepEqual([0, 0.26, 0.53, 0.8].map(g => stageIndex(wheat, g)), [0, 0, 1, 3], '밀 4단계 — 마지막 단계는 0.8 에서만');
  assert.equal(stageIndex(wheat, 0.8), 3); assert.equal(stageIndex(wheat, 0.79), 2);
  assert.deepEqual([0, 1, 2, 3].map(i => renderStage(wheat, i)), [0, 1, 1, 2]);
  assert.deepEqual([0, 1, 2, 3, 4].map(i => renderStage(grape, i)), [0, 1, 1, 1, 2]);
  assert.deepEqual([0, 1, 2].map(i => renderStage(basic, i)), [0, 1, 2]);
});

test('wiltTimeFor: 고급 작물은 60% 로 빨리 마른다, 기존은 그대로', () => {
  assert.equal(wiltTimeFor(basic, 60), 60); assert.equal(wiltTimeFor(corn, 60), 36);
});

test('weedRoll / pestChance: 고급만 · 비 온 다음 날 해충↑ · 옥수수는 해충이 잘 붙는다', () => {
  assert.equal(weedRoll(basic, 0), false, '기존 작물엔 잡초 없음');
  assert.equal(weedRoll(wheat, 0.1), true); assert.equal(weedRoll(wheat, 0.99), false);
  assert.equal(pestChance(basic, true), 0);
  assert.ok(pestChance(wheat, true) > pestChance(wheat, false), '비 온 다음 날이 더 높다');
  assert.ok(pestChance(corn, false) > pestChance(wheat, false), '옥수수가 더 잘 붙는다');
  for (const c of ADV_CROPS) assert.ok(pestChance(c, true) <= 0.95);
});

test('harvestYield: 고급은 yield · 해충이면 절반(최소 1) · 기존은 항상 1', () => {
  assert.equal(harvestYield(basic, true), 1);
  assert.equal(harvestYield(wheat, false), wheat.yield);
  assert.equal(harvestYield(wheat, true), Math.max(1, Math.floor(wheat.yield / 2)));
});

test('nextSeedSel: 보유한 씨앗만 순환 · 포도는 지지대가 있어야 · 아무것도 없으면 basic', () => {
  assert.equal(nextSeedSel('basic', { seed_wheat: 3 }, false), 'wheat');
  assert.equal(nextSeedSel('wheat', { seed_wheat: 3 }, false), 'basic', '옥수수·포도 없으면 basic 으로');
  assert.equal(nextSeedSel('basic', { seed_wheat: 0, seed_corn: 2 }, false), 'corn');
  assert.equal(nextSeedSel('corn', { seed_grape: 5 }, false), 'basic', '지지대 없으면 포도 건너뜀');
  assert.equal(nextSeedSel('corn', { seed_grape: 5 }, true), 'grape');
  assert.equal(nextSeedSel('basic', {}, true), 'basic');
  assert.equal(nextSeedSel('bogus', { seed_corn: 1 }, false), 'corn', '이상값은 basic 취급');
});
