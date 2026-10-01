import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revealPose, REVEAL_COPY } from '../js/shop/reveal-pose.js';

test('revealPose — 어두워짐 → 커짐(오버슈트) → 카드(1.1s)', () => {
  assert.equal(revealPose(0).scale, 0);
  assert.ok(revealPose(0.25).dim > 0.99);
  const peak = Math.max(...[0.6, 0.7, 0.8, 0.9].map(t => revealPose(t).scale));
  assert.ok(peak > 1.0, 'easeOutBack 오버슈트');
  assert.ok(Math.abs(revealPose(2).scale - 1) < 1e-6);
  assert.equal(revealPose(1.0).card, false);
  assert.equal(revealPose(1.1).card, true);
});

test('문구 — 스펙 §8', () => {
  assert.deepEqual(REVEAL_COPY.firefly, { name: '반딧불 자국', desc: '밤이 되면 발자국마다 반딧불이 떠올라요' });
  assert.deepEqual(REVEAL_COPY.rainbow, { name: '무지개 자국', desc: '걸음마다 일곱 빛깔이 차례로 남아요' });
});
