import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clearYard } from '../js/pond/yard-clear.js';

function world() {
  const removed = [], solids = [];
  const tree = (x, z) => ({ position: { x, z }, userData: { collider: { x, z, r: 0.8 } } });
  const flower = (x, z, parent) => ({ position: { x, z }, parent });
  const scene = { remove: (o) => removed.push(o) };
  const trees = [tree(0, 0), tree(3, 0), tree(9, 9)];
  const canopy = flower(0, 2, trees[0]);
  const swayables = [flower(1, 1, scene), flower(8, 8, scene), canopy];
  const obstacles = [{ x: 0, z: 0, r: 1.3 }, { x: 3, z: 0, r: 1.3 }, { x: 9, z: 9, r: 1.3 }, { x: 0.5, z: 0.5, r: 2 }];
  const grassClumps = [
    { mesh: { count: 3 }, items: [{ x: 0, z: 1 }, { x: 7, z: 7 }, { x: -1, z: -1 }] },
    { mesh: { count: 1 }, items: [{ x: 20, z: 0 }] },
  ];
  return { removed, solids, deps: { scene, trees, obstacles, swayables, grassClumps, removeSolid: (c) => solids.push(c) } };
}

test('반경 안 나무는 충돌체·밭 금지 원까지 치우고 밖은 그대로 둔다', () => {
  const w = world();
  const out = clearYard(w.deps, 0, 0, 4);
  assert.equal(out.trees, 2);
  assert.deepEqual(w.deps.trees.map(t => t.position.x), [9]);
  assert.equal(w.solids.length, 2);
  assert.deepEqual(w.deps.obstacles, [{ x: 9, z: 9, r: 1.3 }, { x: 0.5, z: 0.5, r: 2 }]);
});

test('꽃은 장면 직속만 치우고 나무 잎은 건드리지 않는다', () => {
  const w = world();
  const out = clearYard(w.deps, 0, 0, 4);
  assert.equal(out.flowers, 1);
  assert.equal(w.deps.swayables.length, 2);
  assert.ok(w.deps.swayables.every(s => s.position.x !== 1));
  assert.equal(w.removed.filter(o => o.position.x === 1 && o.position.z === 1).length, 1);
});

test('풀 포기는 목록과 인스턴스 수를 같이 줄인다', () => {
  const w = world();
  const out = clearYard(w.deps, 0, 0, 4);
  assert.equal(out.grass, 2);
  assert.deepEqual(w.deps.grassClumps[0].items, [{ x: 7, z: 7 }]);
  assert.equal(w.deps.grassClumps[0].mesh.count, 1);
  assert.equal(w.deps.grassClumps[1].mesh.count, 1);
});

test('두 번 불러도 더 치울 것이 없다', () => {
  const w = world();
  clearYard(w.deps, 0, 0, 4);
  assert.deepEqual(clearYard(w.deps, 0, 0, 4), { trees: 0, flowers: 0, grass: 0 });
});
