import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armFor as e1ArmFor } from '../js/exp-e1.js';
import { HOUSE_GUIDE_WOOD, houseGuideArm, houseGuideEligible, sanitizeHouseGuide } from '../js/house-guide-rules.js';
import { BUILD_STAGES } from '../js/house-cost.js';

test('집 기초 목재 비용에 처음 도달한 미건축 유저만 배정한다', () => {
  assert.equal(HOUSE_GUIDE_WOOD, BUILD_STAGES[0].cost.wood);
  assert.equal(houseGuideEligible(14, 15, 0, null), true);
  assert.equal(houseGuideEligible(12, 16, 0, null), true);
  assert.equal(houseGuideEligible(15, 15, 0, null), false);
  assert.equal(houseGuideEligible(14, 15, 1, null), false);
  assert.equal(houseGuideEligible(14, 15, 0, { arm: 'control' }), false);
});

test('별도 솔트로 50:50 배정하고 E1 시작 위치 배정과 독립이다', () => {
  const ids = Array.from({ length: 20000 }, (_, i) => `player-${i}-${(i * 2654435761 >>> 0).toString(16)}`);
  for (const platform of ['web', 'android', 'ios', 'toss']) {
    const guide = ids.filter(id => houseGuideArm(id, platform) === 'guide').length / ids.length;
    assert.ok(guide > 0.48 && guide < 0.52, `${platform}: ${guide}`);
  }
  const sameAsE1 = ids.filter(id => (houseGuideArm(id, 'web') === 'guide') === (e1ArmFor(id, 'web') === 'harvest_start')).length / ids.length;
  assert.ok(sameAsE1 > 0.48 && sameAsE1 < 0.52, `E1 일치율: ${sameAsE1}`);
  assert.equal(houseGuideArm(ids[0], 'web'), houseGuideArm(ids[0], 'web'));
});

test('저장된 배정과 노출 상태를 복구하고 낯선 무리는 버린다', () => {
  assert.deepEqual(sanitizeHouseGuide({ arm: 'guide', shown: 1, arrived: 0 }), { arm: 'guide', shown: true, arrived: false });
  assert.deepEqual(sanitizeHouseGuide({ arm: 'control' }), { arm: 'control', shown: false, arrived: false });
  assert.equal(sanitizeHouseGuide({ arm: 'unknown' }), null);
});
