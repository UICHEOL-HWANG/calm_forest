import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PREPASS_CAPS, PREPASS_DAILY, houseShort, prepassGrant, prepassCan, prepassUse, prepassArm, sanitizePrepass } from '../js/guide/prepass-rules.js';

test('집 단계마다 다음 단계 재료 중 모자란 것만 센다', () => {
  assert.deepEqual(houseShort(0, { wood: 9 }), { slot: 'house1', stage: 1, list: [{ k: 'wood', need: 15, have: 9, more: 6 }] });
  assert.deepEqual(houseShort(1, { wood: 20, stone: 4 }).list, [{ k: 'stone', need: 10, have: 4, more: 6 }]);
  assert.equal(houseShort(2, { wood: 30, stone: 20, coins: 50 }).slot, 'house3');
  assert.equal(houseShort(0, { wood: 15 }), null);
  assert.equal(houseShort(3, {}), null);
});

test('광고 보상은 모자란 만큼, 재료마다 상한까지만 준다', () => {
  assert.deepEqual(prepassGrant([{ k: 'wood', more: 6 }]), { wood: 6 });
  assert.deepEqual(prepassGrant([{ k: 'wood', more: 30 }, { k: 'stone', more: 2 }, { k: 'coins', more: 80 }]), { wood: PREPASS_CAPS.wood, stone: 2, coins: PREPASS_CAPS.coins });
  assert.deepEqual(prepassGrant([{ k: 'gem', more: 3 }]), {});
  assert.deepEqual(prepassGrant([]), {});
});

test('하루 전체 횟수와 같은 자리 한 번만', () => {
  let s = sanitizePrepass(null);
  assert.equal(prepassCan(s, 'house1', '2026-11-10'), true);
  s = prepassUse(s, 'house1', '2026-11-10');
  assert.equal(prepassCan(s, 'house1', '2026-11-10'), false);
  assert.equal(prepassCan(s, 'house2', '2026-11-10'), true);
  for (const k of ['house2', 'house3']) s = prepassUse(s, k, '2026-11-10');
  assert.equal(s.n, PREPASS_DAILY);
  assert.equal(prepassCan(s, 'water_place', '2026-11-10'), false);
  assert.equal(prepassCan(s, 'water_place', '2026-11-11'), true);
  assert.equal(prepassCan(s, 'house1', '2026-11-11'), false);
});

test('사용 기록은 새 객체로 돌려준다', () => {
  const s = sanitizePrepass(null);
  const t = prepassUse(s, 'house1', '2026-11-10');
  assert.notEqual(s, t);
  assert.equal(s.n, 0);
});

test('세이브 복원은 모르는 값을 버린다', () => {
  assert.deepEqual(sanitizePrepass({ date: '2026-11-10', n: 99, used: { house1: true, x: 'y' } }), { date: '2026-11-10', n: PREPASS_DAILY, used: { house1: true } });
  assert.deepEqual(sanitizePrepass('bad'), { date: null, n: 0, used: {} });
});

test('배정은 기기마다 고정이고 50:50 에 가깝다', () => {
  const a = prepassArm('abc', 'android');
  assert.ok(['ad', 'control'].includes(a));
  assert.equal(prepassArm('abc', 'android'), a);
  const n = Array.from({ length: 2000 }, (_, i) => prepassArm(`d${i}`, 'android')).filter(x => x === 'ad').length;
  assert.ok(n > 900 && n < 1100, String(n));
});
