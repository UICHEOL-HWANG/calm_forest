import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HANDS, RPS_WIN, rollHand, judge, initMatch, applyRound } from '../js/duel/rps.js';

// ── 🐗 가위바위보 ───────────────────────────────────────────
test('rollHand: 0~1 을 세 손에 고르게 가른다', () => {
  assert.equal(rollHand(0), 'rock');
  assert.equal(rollHand(0.34), 'scissors');
  assert.equal(rollHand(0.67), 'paper');
  assert.equal(rollHand(0.999), 'paper', '상한에서 배열 밖으로 나가지 않는다');
});

test('judge: 바위>가위>보>바위', () => {
  assert.equal(judge('rock', 'scissors'), 'win');
  assert.equal(judge('scissors', 'paper'), 'win');
  assert.equal(judge('paper', 'rock'), 'win');
  assert.equal(judge('scissors', 'rock'), 'lose');
  assert.equal(judge('rock', 'rock'), 'draw');
});

test('2승 하면 즉시 끝난다 — 3판을 다 치르지 않는다', () => {
  let m = initMatch();
  m = applyRound(m, 'win');
  assert.equal(m.done, false, '1승은 아직');
  m = applyRound(m, 'win');
  assert.equal(m.done, true);
  assert.equal(m.won, true);
  assert.equal(m.rounds, 2, '두 판만 치렀다');
});

test('2패 하면 진다', () => {
  const m = applyRound(applyRound(initMatch(), 'lose'), 'lose');
  assert.equal(m.done, true);
  assert.equal(m.won, false);
});

test('비김은 판수에 들지 않는다 — 그 판은 다시 낸다', () => {
  const m = applyRound(initMatch(), 'draw');
  assert.equal(m.rounds, 0, '비긴 판은 세지 않는다');
  assert.equal(m.wins, 0);
  assert.equal(m.losses, 0);
  assert.equal(m.done, false);
});

test('applyRound 는 인자를 변형하지 않는다', () => {
  const m0 = initMatch();
  const m1 = applyRound(m0, 'win');
  assert.equal(m0.wins, 0, '원본은 그대로');
  assert.notEqual(m0, m1, '새 객체를 돌려준다');
});

test('끝난 판에 더 내도 결과가 바뀌지 않는다', () => {
  const won = applyRound(applyRound(initMatch(), 'win'), 'win');
  const after = applyRound(won, 'lose');
  assert.equal(after.won, true);
  assert.equal(after.rounds, 2);
});

test('상대 수가 한쪽으로 치우치지 않는다', () => {
  const count = { rock: 0, scissors: 0, paper: 0 };
  for (let i = 0; i < 3000; i++) count[rollHand(i / 3000)]++;
  for (const h of HANDS) {
    assert.ok(count[h] > 900 && count[h] < 1100, `${h} 가 ${count[h]} 번 — 균등에서 벗어났다`);
  }
});

test('RPS_WIN 은 2 — 2선승제', () => assert.equal(RPS_WIN, 2));
