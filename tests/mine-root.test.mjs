import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DELVE_HALF, ROOT_SHRINE_FLOOR } from '../js/data/delve.js';
import { layoutFloor, rootShrineSpot, inRootShrine, chestSpot, hashSeed } from '../js/delve/rules.js';

const SEEDS = Array.from({ length: 200 }, (_, i) => 31 + i * 97);

test('뿌리 터는 20층에 있다', () => {
  assert.equal(ROOT_SHRINE_FLOOR, 20);
});

test('뿌리 터는 도착 지점 반대쪽 북쪽 벽에 놓인다', () => {
  assert.deepEqual(rootShrineSpot({ x: -2, z: -6.5 }), { x: 4.2, z: -DELVE_HALF + 0.7 });
  assert.deepEqual(rootShrineSpot({ x: 0, z: -6.5 }), { x: 4.2, z: -DELVE_HALF + 0.7 });
  assert.deepEqual(rootShrineSpot({ x: 1.5, z: -6.5 }), { x: -4.2, z: -DELVE_HALF + 0.7 });
});

test('20층 뿌리 터 안에는 바위·굴·웅덩이·사다리·상자가 없다', () => {
  for (const seed of SEEDS) {
    const L = layoutFloor({ seed, floor: 20 });
    assert.deepEqual(L.shrine, rootShrineSpot(L.arrival), `${seed}`);
    const things = [...L.rocks, ...L.burrows, ...L.puddles, L.ladderAt, chestSpot(L.ladderAt)];
    for (const p of things) assert.ok(!inRootShrine(p, L.shrine), `${seed} ${JSON.stringify(p)}`);
    assert.ok(!inRootShrine(L.arrival, L.shrine), `${seed} arrival`);
  }
});

test('20층이 아닌 층의 배치는 바뀌지 않는다', () => {
  const print = (floor) => { let s = ''; for (let i = 0; i < 60; i++) s += JSON.stringify(layoutFloor({ seed: 1000 + i * 7, floor })); return hashSeed(s); };
  assert.equal(print(10), 718294889);
  assert.equal(print(19), 3534895323);
  assert.equal(layoutFloor({ seed: 5, floor: 19 }).shrine, undefined);
});
