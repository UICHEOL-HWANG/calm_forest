import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashId, probeArm, easeFor, nextDda, defaultDifficulty, mergeDifficulty, PROBE_SCHEME } from '../js/difficulty.js';
import { gameSource } from './helpers/game-source.mjs';

test('probe 팔은 블록 단위로 고르게 — 3판 블록마다 세 팔이 한 번씩 나온다', () => {
  for (const id of ['user-a', 'user-b', 'device-xyz']) {
    for (let b = 0; b < 20; b++) {
      const arms = [0, 1, 2].map(i => probeArm('fish', id, b * 3 + i));
      assert.deepEqual([...arms].sort(), [0, 1, 2], `${id} 의 ${b}번째 블록이 세 팔을 다 쓰지 않는다`);
    }
  }
});

test('직전 팔이 다음 팔을 정하지 않는다 — 고정 순회면 어려운 팔 뒤에 늘 같은 팔이 와서 DDA·좌절이 한 팔에 몰린다', () => {
  // 블록 안의 연속 쌍 (n, n+1) 에서 팔 0 다음에 온 팔을 센다. 고정 순회였다면 항상 1 이다.
  const next = [0, 0, 0];
  for (let u = 0; u < 300; u++) {
    const id = `client-${u}`;
    for (let n = 0; n < 30; n++) {
      if (n % 3 === 2) continue;                       // 블록 경계는 건너뛴다
      if (probeArm('fish', id, n) === 0) next[probeArm('fish', id, n + 1)] += 1;
    }
  }
  assert.equal(next[0], 0, '블록 안에서 같은 팔이 두 번 나왔다');
  const [, a, b] = next;
  assert.ok(Math.min(a, b) / Math.max(a, b) > 0.8, `팔 0 다음 팔이 한쪽으로 쏠렸다: ${next.join('/')}`);
});

test('블록 순서는 게임마다 따로 흔든다 — 한 기기의 낚시·바다 순서가 같이 움직이지 않는다', () => {
  let same = 0;
  for (let u = 0; u < 200; u++) {
    const seq = g => [0, 1, 2].map(n => probeArm(g, `client-${u}`, n)).join('');
    if (seq('fish') === seq('mist')) same += 1;
  }
  assert.ok(same < 70, `낚시·안개 순서가 너무 자주 같다: ${same}/200 (독립이면 약 1/6)`);
});

test('배정 방식 버전이 있다 — 옛 순회(1)와 블록 셔플(2) 판을 분석에서 가른다', () => {
  assert.equal(PROBE_SCHEME, 2);
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

// ── 결과 없이 끝난 판도 남긴다 — 어려운 팔에서 포기가 많으면 기록된 판만의 성공률이 부풀어 보인다 ──
const SRC = gameSource();
const fnBody = (name) => {
  const i = SRC.indexOf(`function ${name}(`);
  assert.ok(i >= 0, `${name} 가 없다`);
  const rest = SRC.slice(i + 1);
  const j = rest.search(/\n(?:async )?function |\nconst [A-Za-z_$]+ = /);
  return SRC.slice(i, i + 1 + (j < 0 ? rest.length : j));
};

test('포기 이벤트는 난이도 세 값과 배정 버전을 싣는다', () => {
  const body = fnBody('trackDiffAbandon');
  assert.match(body, /trackEvent\('minigame_abandon'/);
  assert.match(body, /diffParams\(/);
  assert.match(SRC, /probe_v:\s*PROBE_SCHEME/, 'diffParams 에 probe_v 가 없다');
});

test('낚시 — 줄을 걷거나 도구를 바꿔 끝난 판을 남긴다', () => {
  assert.match(fnBody('tryFish'), /trackDiffAbandon\('fish'/);
  assert.match(fnBody('updateFishing'), /trackDiffAbandon\('fish'/);
});

test('바다 — 출구는 idle 에서만 열린다. 판은 늘 catch/miss 로 끝나니 포기 경로가 없다', () => {
  // 이 전제가 깨지면(판 도중 나갈 길이 생기면) exitSea 에 trackDiffAbandon('sea', …) 를 넣어야 한다.
  assert.match(SRC, /if \(seaMG\.st === 'idle' && dist2D\([^)]*SEA_DECK_Z0[^\n]*nd = 'seaexit'/);
});

test('안개 — 자리를 뜨거나 정화가 끝나 취소된 달래기를 남긴다', () => {
  assert.match(fnBody('cancelSoothe'), /trackDiffAbandon\('mist'/);
  assert.match(fnBody('clearMistSpirits'), /trackDiffAbandon\('mist'/);
});

test('포기는 DDA 를 움직이지 않는다 — 실력 결과가 아니다', () => {
  assert.doesNotMatch(fnBody('trackDiffAbandon'), /settleDifficulty/);
});
