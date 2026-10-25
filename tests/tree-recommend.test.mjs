import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BRANCH_IDS, defaultTree, placeDecor, recommendDecor, habitatMet } from '../js/world/tree-board.js';

const RICH = { wood: 999, stone: 999, coal: 999 };
const apply = (tree, id, recs) => {
  let t = tree;
  for (const r of recs) for (let k = 0; k < r.n; k++) {
    const tile = t.branches[id].tiles.findIndex((x) => !x);
    const res = placeDecor(t, id, tile, r.id, RICH);
    assert.ok(res.ok, `${id} ${r.id} ${res.reason}`);
    t = res.tree;
  }
  return t;
};

test('빈 판: 가지마다 추천대로 놓으면 빈터가 완성된다', () => {
  for (const id of BRANCH_IDS) {
    const recs = recommendDecor(defaultTree(), id);
    assert.ok(recs.length > 0, id);
    assert.ok(recs.reduce((a, r) => a + r.n, 0) <= 6, id);
    const t = defaultTree();
    t.branches[id].tiles = recs.flatMap((r) => Array(r.n).fill(r.id)).concat(Array(6).fill(null)).slice(0, 6);
    assert.ok(habitatMet(t, id), id);
  }
});

test('물의 가지는 작은 연못 2 + 큰 나무 1 (가장 싼 조합)', () => {
  assert.deepEqual(recommendDecor(defaultTree(), 'water'), [{ id: 'pond', n: 2 }, { id: 'bigtree', n: 1 }]);
});

test('이미 놓인 장식은 빼고 남은 만큼만 추천한다', () => {
  const t = apply(defaultTree(), 'water', [{ id: 'pond', n: 1 }]);
  assert.deepEqual(recommendDecor(t, 'water'), [{ id: 'pond', n: 1 }, { id: 'bigtree', n: 1 }]);
});

test('꽃 장식(꽃피우기 보상)은 추천하지 않고, 이미 완성이면 빈 배열', () => {
  for (const id of BRANCH_IDS) for (const r of recommendDecor(defaultTree(), id)) assert.ok(!['lotus', 'sunflower', 'hearth', 'oldtree', 'crystallamp'].includes(r.id));
  const done = apply(defaultTree(), 'water', recommendDecor(defaultTree(), 'water'));
  assert.deepEqual(recommendDecor(done, 'water'), []);
});
