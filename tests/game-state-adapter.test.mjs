import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGameStateSnapshot } from '../js/predict.js';

test('물 안 준 자라는 작물만 센다', () => {
  const s = buildGameStateSnapshot({
    plots: [
      { state: 'growing', watered: false },
      { state: 'growing', watered: true },
      { state: 'empty',   watered: false },   // 빈 밭은 세지 않는다
      { state: 'mature',  watered: false },   // 다 자란 건 물이 필요없다
    ],
    questStates: [], houseStage: 0, maxHouseStage: 4, houseReady: false, dex: {},
  });
  assert.equal(s.plantedUnwatered, 1);
});

test('수락했고 아직 완료 안 한 퀘스트를 센다', () => {
  const s = buildGameStateSnapshot({
    plots: [],
    questStates: [{ acceptedAt: 123 }, { acceptedAt: null }, { acceptedAt: 456 }],
    houseStage: 0, maxHouseStage: 4, houseReady: false, dex: {},
  });
  assert.equal(s.openQuests, 2);
});

test('최종 단계면 지을 집이 없다', () => {
  const s = buildGameStateSnapshot({
    plots: [], questStates: [], houseStage: 4, maxHouseStage: 4, houseReady: true, dex: {},
  });
  assert.equal(s.buildableHouse, false);
});

test('재료가 있고 단계가 남았으면 지을 수 있다', () => {
  const s = buildGameStateSnapshot({
    plots: [], questStates: [], houseStage: 1, maxHouseStage: 4, houseReady: true, dex: {},
  });
  assert.equal(s.buildableHouse, true);
});

test('도감이 비어있지 않은 카테고리를 해본 것으로 친다', () => {
  const s = buildGameStateSnapshot({
    plots: [], questStates: [], houseStage: 0, maxHouseStage: 4, houseReady: false,
    dex: { fish: { a: 1 }, crop: {}, ore: { b: 1 }, cook: {} },
  });
  assert.ok(s.doneKinds.includes('fish_success'));
  assert.ok(s.doneKinds.includes('mine'));
  assert.ok(!s.doneKinds.includes('harvest'));
  assert.ok(!s.doneKinds.includes('cook'));
});

test('빠진 입력에도 죽지 않는다', () => {
  const s = buildGameStateSnapshot({});
  assert.equal(s.plantedUnwatered, 0);
  assert.equal(s.openQuests, 0);
  assert.equal(s.buildableHouse, false);
  assert.deepEqual(s.doneKinds, []);
});
