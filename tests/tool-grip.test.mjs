import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameSource } from './helpers/game-source.mjs';   // game.js + js/data (분리 1단계)
import { pawRadius, gripForwardZ, GRIP_PAW_K } from '../js/data/grip.js';

// ✊ 도구 쥐는 점 — 자루를 발바닥 앞으로 빼는 거리를 발바닥 크기에 비례시킨다(2026-09-28).
//   고정 0.075 는 발 작은 🐰토끼에선 자루가 앞 가장자리에 걸려 "쥔" 모양이 됐지만,
//   발 큰 🐻곰·🐼판다에선 발바닥 한가운데에 묻혔다. 토끼 비율(≈0.67)을 전 캐릭터에 쓴다.
//   (sims/tool-grip-sim.html — 스윙 관통률은 원본과 같음 · 평상시 3.3%→2.2%)
const SRC = gameSource();

test('발바닥 반지름은 팔 조형과 같은 식 — 몸 반지름 × 0.23 × 1.06', () => {
  assert.ok(Math.abs(pawRadius(0.63) - 0.63 * 0.23 * 1.06) < 1e-12);
  assert.ok(Math.abs(pawRadius(0.46) - 0.46 * 0.23 * 1.06) < 1e-12);
});

test('앞 오프셋은 발바닥 반지름 × 0.67 — 토끼 비율', () => {
  assert.equal(GRIP_PAW_K, 0.67);
  assert.ok(Math.abs(gripForwardZ(0.46) - 0.67 * pawRadius(0.46)) < 1e-12);
});

test('큰 발일수록 자루가 더 앞으로 — 곰이 토끼보다 크다', () => {
  assert.ok(gripForwardZ(0.63) > gripForwardZ(0.46));
});

test('토끼는 기존 고정값(0.075)과 거의 같다 — 사용자가 고른 모습 그대로', () => {
  assert.ok(Math.abs(gripForwardZ(0.46) - 0.075) < 0.002);
});

test('자루가 발바닥 밖으로 나가지 않는다 — 자루 반지름(≈0.036)을 더해도 발바닥 안', () => {
  for (const R of [0.46, 0.50, 0.52, 0.56, 0.63]) {
    assert.ok(gripForwardZ(R) + 0.036 <= pawRadius(R), `bodyR ${R}`);
  }
});

test('game.js 가 긴 도구 쥐는 점에 발바닥 비례 오프셋을 쓴다', () => {
  assert.match(SRC, /gripForwardZ\(/);
  assert.match(SRC, /pawRadius\(/);
});

test('스윙 중에는 원본 쥐는 점으로 돌아간다 — 휘두르는 모션 불변(toolGripFade)', () => {
  assert.match(SRC, /toolGripFade = s/);
  assert.match(SRC, /\(1 - toolGripFade\)/);
});
