import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HANDS, RPS_WIN, rollHand, judge,
         initMatch as rpsInit, applyRound as rpsRound } from '../js/duel/rps.js';
import { SHELL_COUNT, SHELL_ROUNDS, makeSwaps, finalPos,
         initMatch as shellInit, applyRound as shellRound } from '../js/duel/shells.js';

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
  let m = rpsInit();
  m = rpsRound(m, 'win');
  assert.equal(m.done, false, '1승은 아직');
  m = rpsRound(m, 'win');
  assert.equal(m.done, true);
  assert.equal(m.won, true);
  assert.equal(m.rounds, 2, '두 판만 치렀다');
});

test('2패 하면 진다', () => {
  const m = rpsRound(rpsRound(rpsInit(), 'lose'), 'lose');
  assert.equal(m.done, true);
  assert.equal(m.won, false);
});

test('비김은 판수에 들지 않는다 — 그 판은 다시 낸다', () => {
  const m = rpsRound(rpsInit(), 'draw');
  assert.equal(m.rounds, 0, '비긴 판은 세지 않는다');
  assert.equal(m.wins, 0);
  assert.equal(m.losses, 0);
  assert.equal(m.done, false);
});

test('applyRound 는 인자를 변형하지 않는다', () => {
  const m0 = rpsInit();
  const m1 = rpsRound(m0, 'win');
  assert.equal(m0.wins, 0, '원본은 그대로');
  assert.notEqual(m0, m1, '새 객체를 돌려준다');
});

test('끝난 판에 더 내도 결과가 바뀌지 않는다', () => {
  const won = rpsRound(rpsRound(rpsInit(), 'win'), 'win');
  const after = rpsRound(won, 'lose');
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

// ── 🦝 그릇 섞기 ───────────────────────────────────────────
test('바가지는 3개 · 3판이고 판이 갈수록 빨라진다', () => {
  assert.equal(SHELL_COUNT, 3);
  assert.equal(SHELL_ROUNDS.length, 3);
  assert.deepEqual(SHELL_ROUNDS.map(r => r.swaps), [4, 6, 8]);
  for (let i = 1; i < SHELL_ROUNDS.length; i++) {
    assert.ok(SHELL_ROUNDS[i].ms < SHELL_ROUNDS[i - 1].ms, '뒤 판이 더 빠르다');
  }
});

test('finalPos: 스왑을 차례로 적용한 자리를 낸다', () => {
  assert.equal(finalPos(0, [[0, 1]]), 1);
  assert.equal(finalPos(1, [[0, 1]]), 0);
  assert.equal(finalPos(2, [[0, 1]]), 2, '나와 무관한 스왑은 자리를 안 바꾼다');
  assert.equal(finalPos(0, [[0, 1], [1, 2]]), 2, '따라가며 옮겨간다');
  assert.equal(finalPos(0, [[0, 1], [0, 1]]), 0, '같은 스왑 두 번이면 제자리');
});

test('makeSwaps: 요청한 횟수만큼, 늘 서로 다른 두 자리', () => {
  const rolls = Array.from({ length: 8 }, (_, i) => (i * 0.37) % 1);
  const sw = makeSwaps(8, rolls);
  assert.equal(sw.length, 8);
  for (const [a, b] of sw) {
    assert.notEqual(a, b, '자기 자신과는 바꾸지 않는다');
    assert.ok(a >= 0 && a < SHELL_COUNT && b >= 0 && b < SHELL_COUNT);
  }
});

test('makeSwaps: 같은 쌍이 연달아 나오지 않는다 — 되감기면 눈이 속지 않는다', () => {
  const rolls = Array.from({ length: 20 }, () => 0);   // 최악의 입력: 늘 첫 후보
  const sw = makeSwaps(20, rolls);
  for (let i = 1; i < sw.length; i++) {
    assert.notDeepEqual(sw[i], sw[i - 1], `${i}번째가 직전과 같은 쌍이다`);
  }
});

test('makeSwaps: 같은 rolls 면 같은 시퀀스 (재현 가능)', () => {
  const rolls = [0.1, 0.9, 0.5, 0.3];
  assert.deepEqual(makeSwaps(4, rolls), makeSwaps(4, rolls));
});

test('3판 전승이어야 이긴다', () => {
  let m = shellInit();
  m = shellRound(m, true);
  assert.equal(m.done, false, '1판만으론 안 끝난다');
  m = shellRound(m, true);
  assert.equal(m.done, false);
  m = shellRound(m, true);
  assert.equal(m.done, true);
  assert.equal(m.won, true);
  assert.equal(m.round, 3);
});

test('한 판이라도 틀리면 그 자리에서 진다', () => {
  const m = shellRound(shellRound(shellInit(), true), false);
  assert.equal(m.done, true);
  assert.equal(m.won, false);
  assert.equal(m.round, 2, '틀린 판까지 세고 멈춘다');
});

test('shells: applyRound 는 인자를 변형하지 않는다', () => {
  const m0 = shellInit();
  const m1 = shellRound(m0, true);
  assert.equal(m0.round, 0);
  assert.notEqual(m0, m1);
});
