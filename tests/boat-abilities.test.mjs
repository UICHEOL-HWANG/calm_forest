import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as A from '../js/boat/abilities.js';

test('콤보: 1.5초 안이면 이어지고 10마다 보너스', () => {
  let c = { n: 0, last: -99 };
  const bonuses = [];
  for (let i = 0; i < 20; i++) { c = A.comboStep(c, i * 1.0); bonuses.push(c.bonus); }
  assert.equal(c.n, 20);
  assert.equal(bonuses.reduce((a, b) => a + b, 0), 2);
  assert.equal(A.comboStep({ n: 7, last: 10 }, 11.6).n, 1);
  assert.equal(A.comboStep({ n: 7, last: 10 }, 11.5).n, 8);
});

test('조향: 뗏목은 느리고 연잎배는 빠르다', () => {
  assert.deepEqual(A.steerParams('ferry'), { acc: 26, maxVx: 6.2 });
  assert.ok(A.steerParams('raft').acc < 26 && A.steerParams('lotus').acc > 26);
});

test('스퍼트 대기: 순풍 깃발 단계', () => {
  assert.equal(A.boostCd(0), 3.2);
  assert.equal(A.boostCd(2), 3.2 - 0.55);
  assert.equal(A.boostCd(9), 3.2 - 0.8);
});

test('충돌 판정과 아슬아슬 띠', () => {
  const r = 1.15 + 0.7;
  assert.equal(A.isHit(r - 0.01, 'ferry', 'rock'), true);
  assert.equal(A.isHit(r, 'ferry', 'rock'), false);
  assert.equal(A.isNearMiss(r, 'ferry', 'rock'), true);
  assert.equal(A.isNearMiss(r + 0.59, 'ferry', 'rock'), true);
  assert.equal(A.isNearMiss(r + 0.6, 'ferry', 'rock'), false);
  assert.equal(A.isNearMiss(0.75 + 0.7, 'ferry', 'pile'), false);
  assert.ok(A.hitRadius('lotus', 'rock') < A.hitRadius('ferry', 'rock'));
});

test('장애물 결과: 잠수 > 통나무 밀기 > 쇄빙 > 충돌', () => {
  assert.equal(A.obstacleOutcome('koi', 'rock', { diving: true, ramLeft: 0 }), 'pass');
  assert.equal(A.obstacleOutcome('raft', 'log', { diving: false, ramLeft: 1 }), 'push');
  assert.equal(A.obstacleOutcome('raft', 'rock', { diving: false, ramLeft: 1 }), 'ram');
  assert.equal(A.obstacleOutcome('ferry', 'pile', { diving: false, ramLeft: 1 }), 'hit');
  assert.equal(A.obstacleOutcome('ferry', 'rock', { diving: false, ramLeft: 0 }), 'hit');
});

test('쇄빙 횟수 상한은 판마다 2번', () => {
  assert.deepEqual([0, 1, 2, 3, 7].map(A.ramPerRun), [0, 1, 1, 2, 2]);
});

test('소용돌이·스킬', () => {
  assert.equal(A.whirlMode('lotus'), 'ride'); assert.equal(A.whirlMode('ferry'), 'pull');
  const sk = { id: 'dive', dur: 1.2, cd: 9 };
  assert.equal(A.skillReady(sk, 5, 0), true);
  const s = A.startSkill(sk, 5);
  assert.deepEqual(s, { until: 6.2, readyAt: 14 });
  assert.equal(A.skillReady(sk, 13.9, s.readyAt), false);
  assert.equal(A.skillReady(null, 99, 0), false);
});
