import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fountainStageParts, FOUNTAIN_LAMPS } from '../js/plaza/fountain-stages.js';

test('fountainStageParts: 1단계는 받침 돌만 놓이고 전체 윤곽이 희미하게 보인다', () => {
  assert.deepEqual(fountainStageParts(1), { solid: ['ring'], ghost: ['lower', 'column', 'upper'], finish: false, lampsLit: 1 });
});
test('fountainStageParts: 2단계는 아래 수반과 기둥이 서고 윗단만 윤곽으로 남는다', () => {
  assert.deepEqual(fountainStageParts(2), { solid: ['lower', 'column'], ghost: ['upper'], finish: false, lampsLit: 2 });
});
test('fountainStageParts: 3단계는 돌 구조가 다 서고 얼음·눈은 아직이다', () => {
  assert.deepEqual(fountainStageParts(3), { solid: ['lower', 'column', 'upper'], ghost: [], finish: false, lampsLit: 3 });
});
test('fountainStageParts: 완공(4)은 확정 모델 b 그대로 — 얼음·눈과 등불 4개', () => {
  assert.deepEqual(fountainStageParts(4), { solid: ['lower', 'column', 'upper'], ghost: [], finish: true, lampsLit: FOUNTAIN_LAMPS });
});
test('fountainStageParts: 등불은 단계마다 하나씩 늘어 완공 때 전부 켜진다', () => {
  assert.deepEqual([1, 2, 3, 4].map(s => fountainStageParts(s).lampsLit), [1, 2, 3, 4]);
  assert.equal(FOUNTAIN_LAMPS, 4);
});
test('fountainStageParts: 범위 밖·잘못된 값은 가까운 단계로 고정한다', () => {
  assert.deepEqual(fountainStageParts(0), fountainStageParts(1));
  assert.deepEqual(fountainStageParts(9), fountainStageParts(4));
  assert.deepEqual(fountainStageParts(2.7), fountainStageParts(2));
  assert.deepEqual(fountainStageParts(undefined), fountainStageParts(4));
  assert.deepEqual(fountainStageParts(NaN), fountainStageParts(4));
  assert.deepEqual(fountainStageParts(null), fountainStageParts(4));
  assert.deepEqual(fountainStageParts(-Infinity), fountainStageParts(1));
  assert.deepEqual(fountainStageParts(Infinity), fountainStageParts(4));
});
test('fountainStageParts: 매번 새 배열을 돌려준다(호출자가 바꿔도 다음 결과에 안 샌다)', () => {
  const a = fountainStageParts(3);
  a.solid.push('x');
  assert.deepEqual(fountainStageParts(3).solid, ['lower', 'column', 'upper']);
});
