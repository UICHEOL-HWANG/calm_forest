import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NIGHT_MIN, WAKE_TIME, daylightAt, nightLevelAt, isNightAt } from '../js/daynight.js';

test('daylightAt — 자정 0, 정오 1, 일출·노을 0.5', () => {
  assert.ok(Math.abs(daylightAt(0) - 0) < 1e-9);
  assert.ok(Math.abs(daylightAt(0.25) - 0.5) < 1e-9);
  assert.ok(Math.abs(daylightAt(0.5) - 1) < 1e-9);
  assert.ok(Math.abs(daylightAt(0.75) - 0.5) < 1e-9);
});

test('daylightAt — game.js updateDayNight 의 식과 같다', () => {
  // sin(t*2π - π/2)*0.5 + 0.5 — 이 식이 바뀌면 밤 판정도 같이 틀어진다
  for (const t of [0, 0.1, 0.27, 0.5, 0.73, 0.9]) {
    const expected = Math.sin(t * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5;
    assert.ok(Math.abs(daylightAt(t) - expected) < 1e-12, `t=${t}`);
  }
});

test('nightLevelAt = 1 - daylight, 주기는 1', () => {
  assert.ok(Math.abs(nightLevelAt(0.3) + daylightAt(0.3) - 1) < 1e-9);
  // 주기 바깥 값도 감싼다(음수 포함) — 자다가 t 가 1 을 넘어가는 계산에 쓴다
  assert.ok(Math.abs(nightLevelAt(1.3) - nightLevelAt(0.3)) < 1e-9);
  assert.ok(Math.abs(nightLevelAt(-0.7) - nightLevelAt(0.3)) < 1e-9);
});

test('isNightAt — 밤 구간은 자정을 감싸는 t≥0.734 또는 t≤0.266', () => {
  assert.equal(isNightAt(0), true);      // 자정
  assert.equal(isNightAt(0.5), false);   // 정오
  assert.equal(isNightAt(0.25), true);   // 일출 직전 — daylight 0.5 < 0.55
  assert.equal(isNightAt(0.75), true);   // 노을 직후
  // 경계 근처: NIGHT_MIN 0.45 → daylight 0.55 → cos(2πt) = -0.1
  const edge = Math.acos(-0.1) / (Math.PI * 2);   // ≈ 0.2659
  assert.ok(isNightAt(edge - 0.005), '경계 바로 앞은 밤');
  assert.ok(!isNightAt(edge + 0.005), '경계 바로 뒤는 낮');
  assert.ok(!isNightAt(1 - edge - 0.005), '저녁 경계 앞은 낮');
  assert.ok(isNightAt(1 - edge + 0.005), '저녁 경계 뒤는 밤');
});

test('isNightAt — game.js 의 nightLevel >= NIGHT_MIN 과 같은 판정', () => {
  for (let i = 0; i < 200; i++) {
    const t = i / 200;
    assert.equal(isNightAt(t), nightLevelAt(t) >= NIGHT_MIN, `t=${t}`);
  }
});

test('WAKE_TIME — 자고 일어난 아침은 밤이 아니어야 한다', () => {
  assert.equal(isNightAt(WAKE_TIME), false);
  // 해가 막 뜬 아침이지 한낮이 아니다 — 정오(0.5)보다 확실히 이르다
  assert.ok(WAKE_TIME > 0.266 && WAKE_TIME < 0.4, `WAKE_TIME=${WAKE_TIME}`);
  // 경계에 너무 붙으면 깨자마자 다시 밤 프롬프트가 뜬다 — 최소 여유 확보
  assert.ok(nightLevelAt(WAKE_TIME) < NIGHT_MIN - 0.05);
});
