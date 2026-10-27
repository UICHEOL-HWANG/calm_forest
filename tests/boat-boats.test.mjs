import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOATS, BOAT_IDS, LIVE_PHASE, liveBoatIds, MAT_IDS } from '../js/boat/boats.js';
import { RIVER_W, RIVER_LEN, RIVER_OBS, RIVER_PICKS, BOAT_BASE_SPEED, BOAT_BOOST_CD, BOAT_RUNS_PER_DAY } from '../js/boat/consts.js';

test('강 상수는 기존 값 그대로', () => {
  assert.equal(RIVER_W, 6.4); assert.equal(RIVER_LEN, 620);
  assert.equal(BOAT_BASE_SPEED, 9.5); assert.equal(BOAT_BOOST_CD, 3.2); assert.equal(BOAT_RUNS_PER_DAY, 3);
  assert.deepEqual(Object.keys(RIVER_OBS), ['rock', 'log', 'pile', 'whirl']);
  assert.deepEqual(RIVER_PICKS.map(p => p.id), ['lotus', 'driftwood', 'shell', 'moon_fish']);
});

test('조개·달빛 물고기는 줍는 순간 다른 자원으로 바뀌지 않는다', () => {
  assert.deepEqual(RIVER_PICKS.find(p => p.id === 'shell').give, {});
  assert.deepEqual(RIVER_PICKS.find(p => p.id === 'moon_fish').give, {});
  assert.deepEqual(RIVER_PICKS.find(p => p.id === 'lotus').give, { seed: 2 });
  assert.deepEqual(RIVER_PICKS.find(p => p.id === 'driftwood').give, { wood: 2 });
});

test('배 9척, 1차는 4척', () => {
  assert.deepEqual(BOAT_IDS, ['ferry', 'lotus', 'raft', 'koi', 'catamaran', 'paper', 'walnut', 'lotuslamp', 'gourd']);
  assert.equal(LIVE_PHASE, 1);
  assert.deepEqual(liveBoatIds(), ['ferry', 'lotus', 'raft', 'koi']);
  assert.deepEqual(MAT_IDS, ['lotus', 'driftwood', 'shell', 'moon_fish']);
});

test('해금 조건은 설계 문서 9장 표', () => {
  const u = id => BOATS[id].unlock;
  assert.equal(BOATS.ferry.unlock, null);
  assert.deepEqual(u('lotus'), { star: 500, coins: 0, mat: { lotus: 10 }, need: { clears: 3 } });
  assert.deepEqual(u('raft'), { star: 1200, coins: 3000, mat: { driftwood: 25 }, need: {} });
  assert.deepEqual(u('koi'), { star: 1500, coins: 0, mat: { shell: 20 }, need: { rapidPerfect: 1 } });
  assert.deepEqual(u('catamaran'), { star: 2500, coins: 8000, mat: { shell: 30 }, need: {} });
  assert.deepEqual(u('paper'), { star: 2500, coins: 0, mat: { lotus: 40 }, need: { comboBest: 30 } });
  assert.deepEqual(u('walnut'), { star: 3000, coins: 0, mat: { driftwood: 50 }, need: { raftClears: 15 } });
  assert.deepEqual(u('lotuslamp'), { star: 3500, coins: 0, mat: { moon_fish: 20 }, need: { nightClears: 15 } });
  assert.deepEqual(u('gourd'), { star: 5000, coins: 15000, mat: { moon_fish: 40 }, need: { rapidNightClears: 5 } });
});

test('1차 4척 능력', () => {
  assert.deepEqual([BOATS.ferry.lamps, BOATS.lotus.lamps, BOATS.raft.lamps, BOATS.koi.lamps], [3, 2, 4, 3]);
  assert.equal(BOATS.lotus.whirl, 'ride'); assert.equal(BOATS.ferry.whirl, 'pull');
  assert.ok(BOATS.lotus.hitR < 1); assert.ok(BOATS.raft.steer < 1);
  assert.equal(BOATS.raft.logPush, true); assert.equal(BOATS.raft.crewSeats, 2);
  assert.deepEqual(BOATS.koi.skill, { id: 'dive', dur: 1.2, cd: 9 });
  for (const id of BOAT_IDS) assert.equal(typeof BOATS[id].name, 'string');
});
