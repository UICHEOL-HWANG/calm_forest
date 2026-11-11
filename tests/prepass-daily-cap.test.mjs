import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PREPASS_DAILY_CAP, dayCount, bumpDay } from '../js/guide/prepass-rules.js';
import { createRewarded } from '../js/ads/rewarded.js';

test('하루 안전 상한은 30회, 날이 바뀌면 0부터', () => {
  assert.equal(PREPASS_DAILY_CAP, 30);
  assert.equal(dayCount(null, '2026-11-12'), 0);
  assert.equal(dayCount({ d: '2026-11-11', n: 30 }, '2026-11-12'), 0);
  assert.equal(dayCount({ d: '2026-11-12', n: 7 }, '2026-11-12'), 7);
  assert.deepEqual(bumpDay({ d: '2026-11-11', n: 30 }, '2026-11-12'), { d: '2026-11-12', n: 1 });
  assert.deepEqual(bumpDay({ d: '2026-11-12', n: 7 }, '2026-11-12'), { d: '2026-11-12', n: 8 });
});

function setup(n) {
  let rec = { d: '2026-11-12', n };
  const r = createRewarded({
    enabled: () => true, forceArm: () => 'ad', clientId: () => 'c', platform: 'android',
    provider: () => ({ available: () => true, show: async () => ({ result: 'complete' }) }),
    track: () => {}, translate: (s) => s, toast: () => {},
    today: () => '2026-11-12', dayRecord: { get: () => rec, set: (v) => { rec = v; } },
  });
  return { r, rec: () => rec };
}

test('끝까지 본 광고만 센다, 30회가 차면 버튼 자리가 닫힌다', async () => {
  const a = setup(28);
  assert.equal(a.r.open(), true);
  assert.equal(await a.r.watch('bridge', () => {}), true);
  assert.equal(a.rec().n, 29);
  assert.equal(await a.r.watch('bridge', () => {}), true);
  assert.equal(a.rec().n, 30);
  assert.equal(a.r.open(), false);
  assert.equal(a.r.offer('farm2'), false);
  let granted = false;
  assert.equal(await a.r.watch('farm2', () => { granted = true; }), false);
  assert.equal(granted, false);
});

test('저장소를 못 읽어도 광고는 열린다', () => {
  const r = createRewarded({
    enabled: () => true, forceArm: () => 'ad', clientId: () => 'c', platform: 'android',
    provider: () => ({ available: () => true, show: async () => ({ result: 'complete' }) }),
    track: () => {}, translate: (s) => s, toast: () => {},
    today: () => '2026-11-12', dayRecord: { get: () => { throw new Error('blocked'); }, set: () => { throw new Error('blocked'); } },
  });
  assert.equal(r.open(), true);
});

test('game.js 는 오늘 날짜와 기기 저장소를 상한에 넘긴다', async () => {
  const { readFileSync } = await import('node:fs');
  const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.match(game, /today: todayStr,\n    dayRecord: \{ get: \(\) => JSON\.parse\(localStorage\.getItem\('cf_prepass_day'\) \|\| 'null'\), set: \(v\) => localStorage\.setItem\('cf_prepass_day', JSON\.stringify\(v\)\) \},/);
});
