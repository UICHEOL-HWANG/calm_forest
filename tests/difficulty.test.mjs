import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashId, probeArm, easeFor, nextDda, defaultDifficulty, mergeDifficulty } from '../js/difficulty.js';

test('probe 팔은 추첨이 아니라 순회 — 연속 3판이면 세 팔이 모두 나온다', () => {
  for (const id of ['user-a', 'user-b', 'device-xyz']) {
    const arms = [0, 1, 2].map(n => probeArm('fish', id, n));
    assert.deepEqual([...arms].sort(), [0, 1, 2], `${id} 가 3판에 세 팔을 다 쓰지 않는다`);
  }
});

test('유저마다 시작 팔이 흩어진다 — 모두가 팔 0 으로 시작하면 표본이 쏠린다', () => {
  const starts = Array.from({ length: 300 }, (_, i) => probeArm('fish', `client-${i}`, 0));
  const counts = [0, 1, 2].map(a => starts.filter(s => s === a).length);
  for (const c of counts) assert.ok(c > 60, `시작 팔 분포가 쏠렸다: ${counts.join('/')}`);
});

test('hashId 는 같은 입력에 같은 값 — 세션이 바뀌어도 팔 순서가 이어진다', () => {
  assert.equal(hashId('abc'), hashId('abc'));
  assert.notEqual(hashId('abc'), hashId('abd'));
  assert.ok(Number.isInteger(hashId(null)) && hashId(null) >= 0);
});

test('최종 계수는 dda × 팔 — 낚시 기본 입질창 1.4초가 팔마다 0.63 / 0.91 / 1.4초가 된다', () => {
  const secs = [0, 1, 2]
    .map(n => Math.round(1.4 * easeFor('fish', 'fixed-user', n, 1).ease * 100) / 100)
    .sort((a, b) => a - b);
  assert.deepEqual(secs, [0.63, 0.91, 1.4]);
});

test('DDA 는 목표 쪽으로 간다 — 계속 놓치면 쉬워지고 한 번도 안 놓치면 어려워진다', () => {
  let never = 1, always = 1;
  for (let i = 0; i < 100; i++) { never = nextDda('fish', never, 1); always = nextDda('fish', always, 0); }
  assert.ok(never < 1, `한 번도 안 놓치는 사람은 어려워져야 한다 (${never})`);
  assert.ok(always > 1, `계속 놓치는 사람은 쉬워져야 한다 (${always})`);
});

test('결과가 목표와 같으면 DDA 는 제자리 — 불필요하게 흔들지 않는다', () => {
  assert.equal(nextDda('fish', 1.2, 0.88), 1.2);
});

test('DDA 는 꼬리만 잡는다 — 0.7 ~ 1.5 를 벗어나지 않는다', () => {
  let lo = 1, hi = 1;
  for (let i = 0; i < 500; i++) { lo = nextDda('fish', lo, 1); hi = nextDda('fish', hi, 0); }
  assert.equal(lo, 0.7);
  assert.equal(hi, 1.5);
});

test('1주 차 요리·가공은 DDA 가 안 움직인다 — probe 만 돈다', () => {
  assert.equal(nextDda('cook', 1, 0), 1);
  assert.equal(nextDda('craft', 1, 1), 1);
  assert.notEqual(probeArm('cook', 'u', 0), probeArm('cook', 'u', 1));
});

test('최종 계수에도 상한이 있다 — 바다 최대 팔 × DDA 최대가 2.5 를 안 넘는다', () => {
  assert.equal(easeFor('sea', 'u', 0, 1.5).ease <= 2.5, true);
});

test('표에 없는 게임은 난이도를 안 건드린다 — 조각·승부는 1차 대상이 아니다', () => {
  assert.deepEqual(easeFor('carve', 'u', 0, 1), { ease: 1, arm: null, dda: 1 });
  assert.equal(nextDda('duel', 1.3, 0), 1.3);
});

test('difficulty 필드 없는 옛 세이브는 기본값으로 뜬다', () => {
  assert.deepEqual(mergeDifficulty(undefined), defaultDifficulty());
  assert.deepEqual(mergeDifficulty({ fish: { dda: 99, n: -5 } }).fish, { dda: 1.5, n: 0 });
  assert.equal(mergeDifficulty({ fish: { dda: 1.2, n: 7 } }).fish.n, 7);
});
