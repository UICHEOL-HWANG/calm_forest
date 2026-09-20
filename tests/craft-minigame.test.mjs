import { test } from 'node:test';
import assert from 'node:assert/strict';
import { millScore, fireScore, knead2Score, gradeOfScore, crushScore } from '../js/craft/minigame.js';

test('millScore: 일정한 속도로 돌리면 만점에 가깝다', () => {
  const even = Array.from({ length: 30 }, (_, i) => ({ t: i * 100, a: i * 0.4 }));
  assert.ok(millScore(even) > 0.9, `고른 회전은 높은 점수 — 실제 ${millScore(even)}`);
});

test('millScore: 속도가 들쭉날쭉하면 깎인다', () => {
  const jerky = Array.from({ length: 30 }, (_, i) => ({ t: i * 100, a: i % 2 ? i * 0.1 : i * 0.9 }));
  assert.ok(millScore(jerky) < 0.6, `불규칙한 회전은 낮은 점수 — 실제 ${millScore(jerky)}`);
});

test('millScore: 빠르기가 아니라 고르기다 — 느려도 고르면 높다', () => {
  const slowEven = Array.from({ length: 30 }, (_, i) => ({ t: i * 100, a: i * 0.08 }));
  const fastEven = Array.from({ length: 30 }, (_, i) => ({ t: i * 100, a: i * 0.9 }));
  assert.ok(Math.abs(millScore(slowEven) - millScore(fastEven)) < 0.05,
    '서두른다고 유리하지 않아야 한다');
});

test('millScore: 표본이 모자라면 0', () => {
  assert.equal(millScore([]), 0);
  assert.equal(millScore([{ t: 0, a: 0 }]), 0);
  assert.equal(millScore(undefined), 0);
});

test('millScore: 멈춰 있으면 0 — 손을 안 대고 통과할 수 없다', () => {
  const still = Array.from({ length: 20 }, (_, i) => ({ t: i * 100, a: 0 }));
  assert.equal(millScore(still), 0);
});

test('gradeOfScore: 0~3 등급 — 경계값', () => {
  assert.equal(gradeOfScore(0.0), 0);
  assert.equal(gradeOfScore(0.49), 0);
  assert.equal(gradeOfScore(0.5), 1);
  assert.equal(gradeOfScore(0.74), 1);
  assert.equal(gradeOfScore(0.75), 2);
  assert.equal(gradeOfScore(0.89), 2);
  assert.equal(gradeOfScore(0.9), 3);
  assert.equal(gradeOfScore(1.0), 3);
});

// ── ⚫ 숯: 불 조절 — 게이지가 오갈 때 초록 구간에서 멈춘다 ──
test('fireScore: 목표 한가운데면 만점, 멀수록 깎인다', () => {
  assert.equal(fireScore(0.5, 0.5, 0.12), 1);
  assert.ok(fireScore(0.56, 0.5, 0.12) > 0.4, '구간 안이면 점수가 남는다');
  assert.equal(fireScore(0.9, 0.5, 0.12), 0, '구간 밖은 0');
  assert.equal(fireScore(0.1, 0.5, 0.12), 0);
});

test('fireScore: 구간 경계 — 폭이 판정을 정한다(난이도는 이 값으로만 조절)', () => {
  assert.equal(fireScore(0.62, 0.5, 0.12), 0, '경계 밖');
  assert.ok(fireScore(0.615, 0.5, 0.12) >= 0, '경계 안쪽은 0 이상');
  assert.ok(fireScore(0.55, 0.5, 0.25) > fireScore(0.55, 0.5, 0.12), '폭이 넓으면 관대하다');
});

// ── 🧱 벽돌: 반죽 다지기 — 꾹 눌렀다 목표 시간에 뗀다 ──
test('knead2Score: 목표 시간에 떼면 만점', () => {
  assert.equal(knead2Score(1200, 1200, 400), 1);
  assert.ok(knead2Score(1300, 1200, 400) > 0.7);
  assert.equal(knead2Score(2000, 1200, 400), 0, '너무 오래 누르면 0');
  assert.equal(knead2Score(300, 1200, 400), 0, '너무 일찍 떼도 0');
});

test('knead2Score: 누르지 않으면 0', () => {
  assert.equal(knead2Score(0, 1200, 400), 0);
});

// 🍷 포도 밟기 — 박자를 맞춘다. 빠르기가 아니라 **목표 간격에 얼마나 붙느냐** 다
test('crushScore: 목표 박자에 딱 맞으면 만점', () => {
  const taps = [0, 520, 1040, 1560, 2080];
  assert.equal(crushScore(taps), 1);
});

test('crushScore: 박자가 흔들릴수록 깎인다', () => {
  const steady = crushScore([0, 520, 1040, 1560, 2080]);
  const wobbly = crushScore([0, 380, 980, 1400, 2100]);
  assert.ok(wobbly < steady, '들쭉날쭉하면 낮다');
  assert.ok(wobbly > 0, '그래도 밟기는 했으니 0 은 아니다');
});

test('crushScore: 너무 적게 밟으면 0 — 한두 번 눌러 통과할 수 없다', () => {
  assert.equal(crushScore([]), 0);
  assert.equal(crushScore([0, 520]), 0);
  assert.equal(crushScore([0, 520, 1040]), 0);
});

test('crushScore: 목표에서 절반 넘게 벗어나면 0', () => {
  assert.equal(crushScore([0, 60, 120, 180, 240]), 0, '연타로 뭉개도 점수가 없다');
});
