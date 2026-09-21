import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HANDS, RPS_WIN, rollHand, judge,
         initMatch as rpsInit, applyRound as rpsRound } from '../js/duel/rps.js';
import { SHELL_COUNT, SHELL_ROUNDS, makeSwaps, finalPos,
         initMatch as shellInit, applyRound as shellRound } from '../js/duel/shells.js';
import { TRUCE_NIGHTS, DUEL_ANIMALS, addDays, truceUntil, truceActive, blockedAnimals } from '../js/duel/truce.js';
import { pickAnimal } from '../functions/api/night-visit.js';

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

// ── 🤝 발길 끊기 ───────────────────────────────────────────
test('휴전은 2밤 — 서버가 재는 상한과 같은 값', () => {
  assert.equal(TRUCE_NIGHTS, 2);
  assert.deepEqual(DUEL_ANIMALS, ['boar', 'raccoon']);
});

test('addDays: 달·해를 넘는다', () => {
  assert.equal(addDays('2026-09-21', 2), '2026-09-23');
  assert.equal(addDays('2026-09-30', 1), '2026-10-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-09-21', 0), '2026-09-21');
});

test('truceUntil: 오늘 이긴 값은 오늘+2', () => {
  assert.equal(truceUntil('2026-09-21'), '2026-09-23');
});

test('오늘 이하로 만료된 휴전은 무효', () => {
  assert.equal(truceActive('2026-09-21', '2026-09-21'), false, '오늘까지면 오늘 밤은 이미 지났다');
  assert.equal(truceActive('2026-09-20', '2026-09-21'), false);
  assert.equal(truceActive('', '2026-09-21'), false, '빈 값');
  assert.equal(truceActive(null, '2026-09-21'), false, 'null');
});

test('내일·모레는 유효', () => {
  assert.equal(truceActive('2026-09-22', '2026-09-21'), true);
  assert.equal(truceActive('2026-09-23', '2026-09-21'), true);
});

test('상한 초과는 무효 — 세이브를 고쳐 1년 휴전을 만들 수 없다', () => {
  assert.equal(truceActive('2026-09-24', '2026-09-21'), false, '오늘+3');
  assert.equal(truceActive('2027-09-21', '2026-09-21'), false, '1년 뒤');
});

test('형식이 깨진 값은 무효 — 서버가 받는 입력이라 믿지 않는다', () => {
  assert.equal(truceActive('2026-9-22', '2026-09-21'), false, '0 채움 없음');
  assert.equal(truceActive('나중에', '2026-09-21'), false);
  assert.equal(truceActive('2026-09-22T00:00', '2026-09-21'), false);
});

test('blockedAnimals: 유효한 것만 막고, 두 동물은 서로 독립이다', () => {
  const today = '2026-09-21';
  assert.deepEqual(blockedAnimals({ boar: '2026-09-23', raccoon: null }, today), ['boar']);
  assert.deepEqual(blockedAnimals({ boar: '2026-09-20', raccoon: '2026-09-22' }, today), ['raccoon'],
    '만료된 멧돼지는 풀리고 너구리만 남는다');
  assert.deepEqual(blockedAnimals({ boar: '2026-09-22', raccoon: '2026-09-23' }, today), ['boar', 'raccoon']);
  assert.deepEqual(blockedAnimals({}, today), []);
  assert.deepEqual(blockedAnimals(null, today), [], '아예 없는 세이브(옛 판)');
  assert.deepEqual(blockedAnimals({ bear: '2026-09-23' }, today), [], '모르는 동물은 무시');
});

test('달력 검증: 13월·32일·00일은 던지지 않고 false', () => {
  // 핵심: 13월 입력이 RangeError 를 던지지 않고, false 를 돌려야 한다
  assert.doesNotThrow(() => truceActive('2026-13-02', '2026-13-01'), '13월도 던지지 않는다');
  assert.equal(truceActive('2026-13-02', '2026-13-01'), false);
  assert.equal(truceActive('2026-13-01', '2026-09-21'), false, '13월 until');
  assert.equal(truceActive('2026-09-21', '2026-13-01'), false, '13월 today');
  assert.equal(truceActive('2026-09-32', '2026-09-21'), false, '32일');
  assert.equal(truceActive('2026-09-00', '2026-09-21'), false, '00일');
  assert.equal(truceActive('2026-02-30', '2026-02-28'), false, '2월 30일');
});

test('addDays: 달력상 무효한 입력은 null', () => {
  assert.equal(addDays('2026-13-01', 1), null, '13월');
  assert.equal(addDays('2026-09-32', 0), null, '32일');
  assert.equal(addDays('2026-02-30', 0), null, '2월 30일 — 굴러가지 않는다');
  assert.equal(addDays('2026-02-28', 1), '2026-03-01', '평년 2월 경계는 맞다');
});

test('truceUntil: 무효한 입력은 null', () => {
  assert.equal(truceUntil('2026-13-01'), null);
  assert.equal(truceUntil('2026-09-32'), null);
  assert.equal(truceUntil('2026-02-30'), null);
  assert.equal(truceUntil('2026-09-21'), '2026-09-23', '유효한 입력은 여전히 맞다');
});

// ── 🌙 서버 판정의 동물 선택 ────────────────────────────────
test('pickAnimal: 아무도 안 막혔으면 난수대로', () => {
  assert.equal(pickAnimal(0.2, []), 'raccoon');
  assert.equal(pickAnimal(0.8, []), 'boar');
});

test('pickAnimal: 막힌 동물이 뽑히면 남은 쪽으로 넘긴다', () => {
  assert.equal(pickAnimal(0.8, ['boar']), 'raccoon', '멧돼지가 쉬면 너구리가 온다');
  assert.equal(pickAnimal(0.2, ['raccoon']), 'boar');
});

test('pickAnimal: 안 막힌 쪽이 뽑히면 그대로 둔다', () => {
  assert.equal(pickAnimal(0.2, ['boar']), 'raccoon');
  assert.equal(pickAnimal(0.8, ['raccoon']), 'boar');
});

test('pickAnimal: 둘 다 막히면 null — 그 밤은 아무도 안 온다', () => {
  assert.equal(pickAnimal(0.2, ['boar', 'raccoon']), null);
  assert.equal(pickAnimal(0.8, ['boar', 'raccoon']), null);
});
