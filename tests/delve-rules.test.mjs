import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DELVE_FLOORS, DELVE_STOPS, DELVE_CHEST_FLOORS, THEMES, PESTS, MINER_STEPS, PEST_COPY, VEINS_PER_FLOOR } from '../js/data/delve.js';

test('층은 20층, 정류장은 5·10·15·20, 상자는 10·20', () => {
  assert.equal(DELVE_FLOORS, 20);
  assert.deepEqual(DELVE_STOPS, [5, 10, 15, 20]);
  assert.deepEqual(DELVE_CHEST_FLOORS, [10, 20]);
});

test('테마 두 개가 1~20층을 빈틈없이 덮는다', () => {
  const covered = [];
  for (const th of THEMES) for (let f = th.from; f <= th.to; f++) covered.push(f);
  assert.deepEqual(covered, Array.from({ length: 20 }, (_, i) => i + 1));
});

test('방해꾼 4종은 각자 대응이 하나씩이고 테마에 소속된다', () => {
  assert.deepEqual(Object.keys(PESTS).sort(), ['axolotl', 'bat', 'crab', 'grub']);
  assert.deepEqual(Object.values(PESTS).map(p => p.counter).sort(), ['bait', 'grab', 'reclaim', 'tap']);
  for (const th of THEMES) for (const id of th.pests) assert.ok(PESTS[id], id);
});

test('첫 만남 배너 한 줄은 18자 이내, 프롬프트 8자 이내, 엠대시 없음', () => {
  for (const [id, c] of Object.entries(PEST_COPY)) {
    assert.ok([...c.line].length <= 18, `${id}: ${c.line}`);
    assert.ok(!c.line.includes('—') && !c.title.includes('—'), id);
    if (c.prompt) assert.ok([...c.prompt].length <= 8, `${id} prompt`);
  }
});

test('광부 8단계, 판정 종류는 상태형만', () => {
  assert.equal(MINER_STEPS.length, 8);
  for (const s of MINER_STEPS) assert.ok(['inv', 'count', 'floor', 'chest'].includes(s.check.kind), s.id);
});

test('광맥은 층당 2개', () => {
  assert.equal(VEINS_PER_FLOOR, 2);
});
