import { test } from 'node:test';
import assert from 'node:assert/strict';
import { heartCount, noticed, streakCues, tacticCues } from '../js/delve/pest-rounds.js';
import { createPest, repelPest } from '../js/delve/pests.js';
import { newStreak, streakStep } from '../js/delve/streak.js';
import { PEST_BADGE } from '../js/delve/badge-math.js';

const mk = (kind, extra = {}) => ({ ...createPest(kind, { x: 0, z: 0 }, { x: 5, z: 0 }), ...extra });

test('하트: 끈기만큼, 흉내·숨음·떠남·잠·잠수 중엔 0', () => {
  assert.equal(heartCount(mk('crab', { state: 'lurk' })), 3);
  assert.equal(heartCount(repelPest(mk('crab', { state: 'lurk' })).pest), 2);
  for (const state of ['mimic', 'hide', 'gone', 'sleep']) assert.equal(heartCount(mk('roller', { state })), 0, state);
  assert.equal(heartCount(mk('axolotl', { state: 'approach', round: 1 })), 0);
  assert.equal(heartCount(mk('axolotl', { state: 'lurk', round: 1 })), 0);
  assert.equal(heartCount(mk('axolotl', { state: 'lurk', round: 1, arrived: true })), 3);
  assert.equal(heartCount(mk('axolotl', { state: 'approach', round: 2 })), 3);
  assert.equal(heartCount(mk('mole', { state: 'flee', grit: 0 })), 0);
});

test('알아챔 소리: 쉬다가 노릴 때만, 되돌아가는 척·졸음에서 이어질 땐 아님', () => {
  assert.equal(noticed('idle', 'approach'), true);
  assert.equal(noticed('hide', 'lurk'), true);
  assert.equal(noticed('approach', 'lurk'), false);
  assert.equal(noticed('feint', 'lurk'), false);
  assert.equal(noticed('doze', 'lurk'), false);
  assert.equal(noticed('idle', 'carry'), false);
});

test('연속 소리: 1·2·3+ 콤보, 3의 배수에 보너스, 2 이상에서 끊기면 끊김 소리', () => {
  let s = newStreak();
  const cues = [];
  for (let i = 0; i < 4; i++) { const prev = s.cur; s = streakStep(s, true); cues.push(streakCues(prev, s)); }
  assert.deepEqual(cues, [['combo1'], ['combo2'], ['combo3', 'bonus'], ['combo3']]);
  assert.deepEqual(streakCues(4, streakStep(s, false)), ['comboBreak']);
  assert.deepEqual(streakCues(1, streakStep({ cur: 1, best: 1 }, false)), []);
});

test('되돌아가는 척은 노리는 배지(👀)', () => {
  assert.deepEqual(PEST_BADGE.feint, ['👀', 'wait']);
});

test('수법 소리 신호가 없으면 매번 같은 얼린 빈 배열', () => {
  const p = mk('crab', { state: 'idle' });
  const a = tacticCues(p, p), b = tacticCues(p, { ...p, x: 1 });
  assert.equal(a, b);
  assert.ok(Object.isFrozen(a));
  assert.equal(a.length, 0);
  assert.deepEqual(tacticCues(p, { ...p, state: 'approach' }), ['notice']);
  assert.deepEqual(tacticCues(mk('axolotl', { state: 'idle', round: 1 }), mk('axolotl', { state: 'approach', round: 1 })), ['dive']);
  assert.deepEqual(tacticCues(mk('axolotl', { state: 'lurk' }), mk('axolotl', { state: 'feint' })), ['feint']);
});

test('하트: 포기한 몹은 시간 상태여도 0', () => {
  assert.equal(heartCount(mk('crab', { state: 'eat', grit: 0, gaveUp: true })), 0);
});
