import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STAGES, GIFT_DAILY_CAP, LETTER_MAX_STAGE, isAffinityNpc, stageIndex, stageProgress,
  lettersToIssue, markIssued, letterKey, giftGain, owlDailyGain,
} from '../js/affinity/stages.js';
import { HIDDEN_AFFINITY } from '../js/tool-blueprints.js';

test('단계 문턱은 1·3·6·10·15 이고 친구 문턱은 도면 문턱과 같다', () => {
  assert.deepEqual(STAGES.map(s => s.min), [1, 3, 6, 10, 15]);
  assert.equal(STAGES.find(s => s.id === 'friend').min, HIDDEN_AFFINITY);
  assert.deepEqual(STAGES.map(s => !!s.letter), [false, true, true, true, true]);
});

test('stageIndex 경계', () => {
  const cases = [[0, -1], [1, 0], [2, 0], [3, 1], [5, 1], [6, 2], [9, 2], [10, 3], [14, 3], [15, 4], [31, 4], [undefined, -1], [-3, -1]];
  for (const [n, want] of cases) assert.equal(stageIndex(n), want, `affinity ${n}`);
});

test('stageProgress 는 지금 단계와 다음 문턱을 준다', () => {
  assert.deepEqual(stageProgress(0), { idx: -1, value: 0, next: 1 });
  assert.deepEqual(stageProgress(7), { idx: 2, value: 7, next: 10 });
  assert.deepEqual(stageProgress(18), { idx: 4, value: 18, next: null });
});

test('카페 손님은 단계 대상이 아니다', () => {
  assert.equal(isAffinityNpc('builder'), true);
  assert.equal(isAffinityNpc('courier'), true);
  assert.equal(isAffinityNpc('guest_deer'), false);
  assert.equal(isAffinityNpc('nobody'), false);
});

test('편지는 아직 발행 안 한 편지 단계만 나온다', () => {
  assert.deepEqual(lettersToIssue({ builder: 2 }, {}), []);
  assert.deepEqual(lettersToIssue({ builder: 3 }, {}), [{ npc: 'builder', idx: 1 }]);
  assert.deepEqual(lettersToIssue({ builder: 3 }, { builder: 1 }), []);
  assert.deepEqual(lettersToIssue({ builder: 7 }, { builder: 1 }), [{ npc: 'builder', idx: 2 }]);
});

test('한 번에 문턱 둘을 건너면 편지 두 통', () => {
  assert.deepEqual(lettersToIssue({ farmer: 6 }, {}), [{ npc: 'farmer', idx: 1 }, { npc: 'farmer', idx: 2 }]);
});

test('편지는 가족 단계까지 발행하고, P1 에서 친구까지 받은 사람에겐 나머지만 소급한다', () => {
  assert.equal(LETTER_MAX_STAGE, 4);
  assert.deepEqual(lettersToIssue({ merchant: 31 }, {}).map(l => l.idx), [1, 2, 3, 4]);
  assert.deepEqual(lettersToIssue({ merchant: 31 }, { merchant: 2 }), [{ npc: 'merchant', idx: 3 }, { npc: 'merchant', idx: 4 }]);
  assert.deepEqual(markIssued({}, lettersToIssue({ merchant: 31 }, {})), { merchant: 4 });
});

test('소급 발행은 주민 여럿을 한꺼번에, 손님·모르는 id 는 건너뛴다', () => {
  const out = lettersToIssue({ merchant: 31, angler: 3, guest_deer: 15, ghost: 9 }, {});
  assert.deepEqual(out, [{ npc: 'merchant', idx: 1 }, { npc: 'merchant', idx: 2 }, { npc: 'merchant', idx: 3 }, { npc: 'merchant', idx: 4 }, { npc: 'angler', idx: 1 }]);
});

test('markIssued 는 원본을 바꾸지 않는다', () => {
  const before = { builder: 1 };
  const after = markIssued(before, [{ npc: 'builder', idx: 2 }]);
  assert.deepEqual(before, { builder: 1 });
  assert.deepEqual(after, { builder: 2 });
});

test('letterKey 는 주민:문턱', () => {
  assert.equal(letterKey('builder', 1), 'builder:3');
  assert.equal(letterKey('courier', 2), 'courier:6');
});

test('선물 하트는 주민당 하루 2까지', () => {
  assert.equal(GIFT_DAILY_CAP, 2);
  let r = giftGain(undefined, '2026-11-13', 'builder', 1);
  assert.deepEqual(r, { gain: 1, state: { d: '2026-11-13', by: { builder: 1 } } });
  r = giftGain(r.state, '2026-11-13', 'builder', 2);
  assert.equal(r.gain, 1);
  assert.deepEqual(r.state.by, { builder: 2 });
  r = giftGain(r.state, '2026-11-13', 'builder', 1);
  assert.equal(r.gain, 0);
  assert.deepEqual(r.state.by, { builder: 2 });
});

test('선물 상한은 주민마다 따로, 날이 바뀌면 새로', () => {
  const s = { d: '2026-11-13', by: { builder: 2 } };
  assert.equal(giftGain(s, '2026-11-13', 'farmer', 2).gain, 2);
  const next = giftGain(s, '2026-11-14', 'builder', 1);
  assert.deepEqual(next, { gain: 1, state: { d: '2026-11-14', by: { builder: 1 } } });
  assert.deepEqual(s, { d: '2026-11-13', by: { builder: 2 } });
});

test('선물 상한은 망가진 저장값을 새로 시작한다', () => {
  assert.equal(giftGain('junk', '2026-11-13', 'builder', 1).gain, 1);
  assert.equal(giftGain({ d: '2026-11-13', by: null }, '2026-11-13', 'builder', 2).gain, 2);
});

test('올빼미 일일 +1 은 하루 한 번', () => {
  assert.deepEqual(owlDailyGain(undefined, '2026-11-13'), { gain: 1, day: '2026-11-13' });
  assert.deepEqual(owlDailyGain('2026-11-13', '2026-11-13'), { gain: 0, day: '2026-11-13' });
  assert.deepEqual(owlDailyGain('2026-11-12', '2026-11-13'), { gain: 1, day: '2026-11-13' });
});

test('상시 줄은 시작한 주민 중 다음 보상이 가장 가까운 주민을 고른다', async () => {
  const { pickTracker } = await import('../js/affinity/stages.js');
  assert.equal(pickTracker({}, ['builder', 'farmer']), null);
  assert.deepEqual(pickTracker({ builder: 7, farmer: 2 }, ['builder', 'farmer']), { npc: 'farmer', value: 2, next: 3 });
  assert.deepEqual(pickTracker({ builder: 9, farmer: 2 }, ['builder', 'farmer']), { npc: 'builder', value: 9, next: 10 });
  assert.equal(pickTracker({ builder: 9 }, ['farmer']), null);
  assert.equal(pickTracker({ builder: 20, guest_deer: 2 }, ['builder', 'guest_deer']), null);
});
