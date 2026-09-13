import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FARM_STAGES, MAX_FARM_STAGE, farmHalfOf, farmStageInfo, fencePosts, perimeterTrees } from '../js/farm-stage.js';

test('FARM_STAGES: 스펙 §1 표 그대로 — half 6/9/11 · 비용 · 노동자 상한', () => {
  assert.equal(FARM_STAGES.length, 3); assert.equal(MAX_FARM_STAGE, 3);
  assert.deepEqual(FARM_STAGES.map(s => s.stage), [1, 2, 3]);
  assert.deepEqual(FARM_STAGES.map(s => s.half), [6, 9, 11]);
  assert.deepEqual(FARM_STAGES.map(s => s.workers), [2, 4, 6]);
  assert.equal(FARM_STAGES[0].cost, null, '1단계는 처음부터 있다');
  assert.deepEqual(FARM_STAGES[1].cost, { wood: 40, stone: 20, coins: 150 });
  assert.deepEqual(FARM_STAGES[2].cost, { wood: 90, stone: 60, coins: 450 });
});

test('farmHalfOf: 단계 → 반경, 이상값은 1단계(6)', () => {
  assert.equal(farmHalfOf(1), 6); assert.equal(farmHalfOf(2), 9); assert.equal(farmHalfOf(3), 11);
  assert.equal(farmHalfOf(undefined), 6); assert.equal(farmHalfOf(9), 6); assert.equal(farmHalfOf('2'), 6, '문자열은 단계가 아니다');
});

test('farmStageInfo: 다음 단계 비용 대조 — 부족/충분/최대', () => {
  const a = farmStageInfo(1, { wood: 40, stone: 20, coins: 149 });
  assert.equal(a.maxed, false); assert.equal(a.next.stage, 2); assert.equal(a.affordable, false, '코인 1 부족');
  const b = farmStageInfo(1, { wood: 40, stone: 20, coins: 150 });
  assert.equal(b.affordable, true, '딱 맞으면 가능');
  assert.deepEqual(b.items.map(i => [i.k, i.need, i.have]), [['wood', 40, 40], ['stone', 20, 20], ['coins', 150, 150]]);
  const c = farmStageInfo(3, {});
  assert.equal(c.maxed, true); assert.equal(c.next, null); assert.deepEqual(c.items, []);
  assert.equal(farmStageInfo(1, {}).items.find(i => i.k === 'wood').have, 0, '없는 자원은 0');
  assert.equal(farmStageInfo(undefined, {}).cur.stage, 1, '세이브에 없으면 1단계');
});

test('fencePosts: 둘레에만 · 남쪽 출입구 비움 · 중복 없음 · 넓을수록 많다', () => {
  for (const H of [6, 9, 11]) {
    const posts = fencePosts(H);
    assert.ok(posts.every(([x, z]) => Math.abs(x) === H || Math.abs(z) === H), '둘레');
    assert.ok(!posts.some(([x, z]) => z === H && Math.abs(x) < 1.2), '남쪽 가운데 출입구');
    assert.equal(new Set(posts.map(p => p.join(','))).size, posts.length, '모서리 중복 없음');
    assert.ok(posts.some(([x, z]) => z === -H && x === -H), '북서 모서리는 있다');
  }
  assert.ok(fencePosts(6).length < fencePosts(9).length && fencePosts(9).length < fencePosts(11).length);
});

test('perimeterTrees: 남쪽 비움 · 스커트 원판(r48) 안 · 울타리 밖', () => {
  for (const H of [6, 9, 11]) {
    const trees = perimeterTrees(H);
    assert.ok(trees.length >= 18 && trees.length <= 24, `그루 수 ${trees.length}`);
    for (const t of trees) {
      const r = Math.hypot(t.x, t.z);
      assert.ok(r > H + 4 && r < 48, `울타리 밖·원판 안 (r=${r})`);
      assert.ok(t.h >= 2.0);
      assert.ok(!(t.z > 0 && Math.abs(t.x) < 0.3 * t.z), '남쪽 출입구 방향은 비어 있다');
    }
  }
});
