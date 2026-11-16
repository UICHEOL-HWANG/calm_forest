import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickedTarget, releaseOnWalk, PICK_WALK_RELEASE } from '../js/outdoor-move.js';

test('pickedTarget pins at the old spot and remembers where the player stood', () => {
  assert.deepEqual(pickedTarget(2, 3, 1, 1), { x: 2, z: 3, pinned: true, from: { x: 1, z: 1 } });
});

test('releaseOnWalk keeps the pin while the player stays put', () => {
  const t = pickedTarget(2, 3, 1, 1);
  assert.equal(releaseOnWalk(t, 1 + PICK_WALK_RELEASE * 0.5, 1), t);
});

test('releaseOnWalk unpins once the player walks away so the ghost follows', () => {
  const t = pickedTarget(2, 3, 1, 1);
  const r = releaseOnWalk(t, 1 + PICK_WALK_RELEASE + 0.01, 1);
  assert.deepEqual(r, { x: 2, z: 3, pinned: false, from: null });
  assert.notEqual(r, t);
});

test('releaseOnWalk leaves a floor-tap aim pinned however far the player walks', () => {
  const aimed = { x: 5, z: 5, pinned: true };
  assert.equal(releaseOnWalk(aimed, 40, 40), aimed);
});
