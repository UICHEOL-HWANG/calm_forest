import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { clearYard } from '../js/pond/yard-clear.js';
import { pondBlocks } from '../js/pond/rules.js';
import { POND_SPOTS, POND_STAGE_R, POND_TREE_CLEAR, POND_SOUTH_CLEAR } from '../js/data/pond.js';

const INDEX = readFileSync(new URL('../js/pond/index.js', import.meta.url), 'utf8');
const GAME = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');

function world() {
  const removed = [], solids = [];
  const tree = (x, z) => ({ position: { x, z }, userData: { collider: { x, z, r: 0.8 }, canopy: { position: { x: 0, z: 0 }, tag: `${x},${z}` } } });
  const flower = (x, z, parent) => ({ position: { x, z }, parent });
  const scene = { remove: (o) => removed.push(o) };
  const trees = [tree(0, 0), tree(3, 0), tree(9, 9)];
  const swayables = [flower(1, 1, scene), flower(8, 8, scene), ...trees.map(t => t.userData.canopy)];
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

test('치운 나무의 잎은 흔들림 목록에서도 빠지고 남은 나무 잎은 그대로다', () => {
  const w = world();
  clearYard(w.deps, 0, 0, 4);
  assert.deepEqual(w.deps.swayables.filter(s => s.tag).map(s => s.tag), ['9,9']);
});

test('꽃은 장면 직속만 치우고 남은 나무 잎은 건드리지 않는다', () => {
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

test('나무는 줄기 충돌체 가장자리가 물가에서 POND_TREE_CLEAR 안이면 치우고 꽃·풀 범위는 그대로다', () => {
  const R = POND_STAGE_R[2];
  const edge = R + POND_TREE_CLEAR + 0.8;
  const tree = (x) => ({ position: { x, z: 0 }, userData: { collider: { x, z: 0, r: 0.8 }, canopy: {} } });
  const scene = { remove() {} };
  const flower = { position: { x: R + 1, z: 0 }, parent: scene };
  const deps = { scene, trees: [tree(R + 0.8), tree(edge - 0.05), tree(edge + 0.05)], obstacles: [], swayables: [flower], grassClumps: [], removeSolid() {} };
  assert.equal(POND_TREE_CLEAR, 1.2);
  assert.deepEqual(clearYard(deps, 0, 0, R + 0.6, R + POND_TREE_CLEAR), { trees: 2, flowers: 0, grass: 0 });
  assert.deepEqual(deps.trees.map(t => t.position.x), [edge + 0.05]);
  assert.match(INDEX, /if \(stage >= 2\) clearYard\([^\n]+, x, z, r \+ YARD_PAD, r \+ POND_TREE_CLEAR, POND_SOUTH_CLEAR\);/);
  assert.match(GAME, /\|\| pondScatterBlocks\(x, z, 1\.2\)/);
  for (const s of POND_SPOTS) assert.ok(pondBlocks(POND_SPOTS, { x: 0, z: 0 }, s.dx + POND_STAGE_R[0] + 1.19, s.dz, POND_STAGE_R[0], 1.2));
});

test('연못 남쪽(카메라 쪽) 띠에 선 나무도 치우고 북쪽·옆 나무는 둔다', () => {
  const R = POND_STAGE_R[2], treeR = R + POND_TREE_CLEAR;
  const tree = (x, z) => ({ position: { x, z }, userData: { collider: { x, z, r: 0.8 }, canopy: {} } });
  const kept = [tree(0, -(treeR + 1)), tree(treeR + 1, 2), tree(-(treeR + 1), 2), tree(0, treeR + POND_SOUTH_CLEAR + 0.1)];
  const gone = [tree(-1.56, 5.95), tree(treeR - 0.1, treeR + POND_SOUTH_CLEAR - 0.1), tree(0, treeR + 1)];
  const deps = { scene: { remove() {} }, trees: [...kept, ...gone], obstacles: [], swayables: [], grassClumps: [], removeSolid() {} };
  assert.equal(clearYard(deps, 0, 0, R + 0.6, treeR, POND_SOUTH_CLEAR).trees, gone.length);
  assert.deepEqual(deps.trees, kept);
  const same = { ...deps, trees: [...kept, ...gone] };
  assert.equal(clearYard(same, 0, 0, R + 0.6, treeR).trees, 0);
});

test('두 번 불러도 더 치울 것이 없다', () => {
  const w = world();
  clearYard(w.deps, 0, 0, 4);
  assert.deepEqual(clearYard(w.deps, 0, 0, 4), { trees: 0, flowers: 0, grass: 0 });
});
