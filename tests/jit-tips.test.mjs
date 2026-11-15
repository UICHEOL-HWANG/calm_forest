import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dueTip, tipsLeft, TIP_ARM } from '../js/onboarding/jit-tips.js';

const seenOf = (...keys) => (k) => keys.includes(k);
const IDLE = Object.freeze({ coachStep: 'chop', merchantMet: false, dexCount: 0, busy: false });

test('짧은 안내를 끝낸 새 유저만 팁을 받는다, 예전 투어를 끝낸 유저는 아무것도 안 뜬다', () => {
  const state = { ...IDLE, coachStep: 'sell', dexCount: 3 };
  assert.equal(dueTip(state, seenOf('spotV2')), null);
  assert.equal(tipsLeft(seenOf('spotV2')), false);
  assert.equal(dueTip(state, seenOf('spotV2', TIP_ARM)), 'bag');
  assert.equal(tipsLeft(seenOf(TIP_ARM)), true);
});

test('가방 팁은 코치가 상인 단계에 오거나 상인을 만났을 때', () => {
  const seen = seenOf(TIP_ARM);
  assert.equal(dueTip(IDLE, seen), null);
  assert.equal(dueTip({ ...IDLE, coachStep: 'sell' }, seen), 'bag');
  assert.equal(dueTip({ ...IDLE, coachStep: 'house1', merchantMet: true }, seen), 'bag');
});

test('도감 팁은 안내 뒤 새로 도감에 등록됐을 때(처음부터 있던 등록은 세지 않는다)', () => {
  const seen = seenOf(TIP_ARM);
  assert.equal(dueTip({ ...IDLE, dexCount: 1, dexBase: 1 }, seen), null);
  assert.equal(dueTip({ ...IDLE, dexCount: 2, dexBase: 1 }, seen), 'dex');
  assert.equal(dueTip({ ...IDLE, dexCount: 1 }, seen), 'dex');
  assert.equal(dueTip({ ...IDLE, dexCount: 2, dexBase: 1, coachStep: 'sell' }, seen), 'bag');
});

test('예전 투어에서 본 카드(spot_t_bag·spot_pc_dex 등)는 다시 안 뜬다', () => {
  const all = { ...IDLE, coachStep: 'sell', dexCount: 2, dexBase: 0 };
  assert.equal(dueTip(all, seenOf(TIP_ARM, 'spot_t_bag')), 'dex');
  assert.equal(dueTip(all, seenOf(TIP_ARM, 'spot_pc_bag', 'spot_pc_dex')), null);
  assert.equal(tipsLeft(seenOf(TIP_ARM, 'spot_t_bag', 'spot_t_dex')), false);
});

test('다른 안내·창이 떠 있으면 기다린다', () => {
  assert.equal(dueTip({ ...IDLE, coachStep: 'sell', busy: true }, seenOf(TIP_ARM)), null);
});
