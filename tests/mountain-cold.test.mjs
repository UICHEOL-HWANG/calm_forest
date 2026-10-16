import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COLD, COLD_START, stepCold, drinkWarm, coldStage, coldSpeedMult, noticeCold } from '../js/mountain/cold.js';
import { EN } from '../js/i18n-en.js';

const ctx = (o = {}) => ({ key: 'day', nearFire: false, inCafe: false, frozen: false, ...o });
const run = (s, secs, c) => { let x = s; for (let i = 0; i < secs * 10; i++) x = stepCold(x, 0.1, c); return x; };

test('rates per second follow the spec by mountain theme', () => {
  assert.deepEqual({ ...COLD.rate }, { day: 0.6, dusk: 0.8, night: 1.2, snow: 1.2 });
  assert.ok(Math.abs(run(COLD_START, 10, ctx()).v - 6) < 1e-6);
  assert.ok(Math.abs(run(COLD_START, 10, ctx({ key: 'night' })).v - 12) < 1e-6);
  assert.ok(Math.abs(run(COLD_START, 10, ctx({ key: 'snow' })).v - 12) < 1e-6);
});

test('stages: shiver from 60, slow from 80 at three quarters walking speed', () => {
  assert.equal(coldStage(59.9), 'ok');
  assert.equal(coldStage(60), 'shiver');
  assert.equal(coldStage(80), 'slow');
  assert.equal(coldSpeedMult(79.9), 1);
  assert.equal(coldSpeedMult(80), 0.75);
});

test('the index is capped, frozen while sledding and immutable', () => {
  const s = { ...COLD_START, v: 99 };
  const a = stepCold(s, 5, ctx({ key: 'night' }));
  assert.equal(a.v, 100);
  assert.equal(s.v, 99);
  assert.equal(stepCold(s, 5, ctx({ frozen: true })), s);
});

test('the campfire and the cafe warm you for free', () => {
  const s = { ...COLD_START, v: 90 };
  assert.ok(Math.abs(stepCold(s, 1, ctx({ nearFire: true, key: 'night' })).v - 85) < 1e-6);
  assert.ok(Math.abs(stepCold(s, 1, ctx({ inCafe: true, key: 'night' })).v - 82) < 1e-6);
  assert.equal(stepCold({ ...COLD_START, v: 2 }, 1, ctx({ inCafe: true })).v, 0);
});

test('a drink resets to zero and holds for three minutes', () => {
  const w = drinkWarm({ ...COLD_START, v: 95 });
  assert.equal(w.v, 0);
  assert.equal(w.warmT, 180);
  assert.equal(run(w, 179, ctx({ key: 'night' })).v, 0);
  assert.ok(run(w, 182, ctx({ key: 'night' })).v > 0);
});

test('notices fire once when crossing 60 for the first time and when crossing 80', () => {
  assert.deepEqual(noticeCold({ v: 59 }, { v: 60 }, false), { hint: true, slow: false });
  assert.deepEqual(noticeCold({ v: 59 }, { v: 60 }, true), { hint: false, slow: false });
  assert.deepEqual(noticeCold({ v: 79 }, { v: 80 }, true), { hint: false, slow: true });
  assert.deepEqual(noticeCold({ v: 81 }, { v: 82 }, true), { hint: false, slow: false });
});

test('wiring: walking speed, hut event, drink, HUD and copy', () => {
  const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.match(game, /const speed = 6 \* \(buffOn\('speed'\) \? 1\.4 : 1\) \* mountainSpeedMult\(\);/);
  const m = readFileSync(new URL('../js/spaces/mountain.js', import.meta.url), 'utf8');
  assert.match(m, /trackEvent\('mountain_hut', \{ run_id: run\.runId, climb_ms: run\.climbMs, acorns: run\.taken\.filter\(Boolean\)\.length, cold: Math\.round\(cold\.v\) \}\)/);
  assert.match(m, /function onDrink\(\) \{ cold = drinkWarm\(cold\); \}/);
  assert.match(m, /trackEvent\('mountain_cold', \{ stage: 'slow' \}\)/);
  assert.match(m, /showColdHud\(/);
  for (const ko of ['🥶 추워요. 모닥불이나 산장 카페에서 몸을 녹여요', '🥶 너무 추워서 걸음이 느려졌어요']) assert.ok(EN[ko], ko);
});

test('wiring: breath puffs are skipped while sledding', () => {
  const m = readFileSync(new URL('../js/spaces/mountain.js', import.meta.url), 'utf8');
  assert.match(m, /!inCafe\(\) && !sledActive\(\) && coldStage\(cold\.v\) !== 'ok' && breathT <= 0/);
});
