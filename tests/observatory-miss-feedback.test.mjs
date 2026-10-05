import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { missWhy } from '../js/observatory/rhythm.js';

// 🔭 놓쳤을 때 '왜' 를 보여 준다 — 빨랐는지 늦었는지 몰라 그만둔 판이 천문대 페르소나 8판 중 5판(2026-10-05)
const UI = readFileSync(new URL('../js/observatory/ui.js', import.meta.url), 'utf8');
const RENDER = readFileSync(new URL('../js/observatory/render.js', import.meta.url), 'utf8');
const COPY = readFileSync(new URL('../js/observatory/copy.js', import.meta.url), 'utf8');
const EN = readFileSync(new URL('../js/i18n-en.js', import.meta.url), 'utf8');

test('missWhy — 판정 시각보다 먼저 누르면 early, 늦게 누르거나 안 누르면(null) late', () => {
  assert.equal(missWhy(-250), 'early');
  assert.equal(missWhy(300), 'late');
  assert.equal(missWhy(null), 'late');
});

test('탭·시간 초과 miss 모두 이유를 플래시에 싣는다', () => {
  assert.match(UI, /state\.flash = \{ judge, why: judge === 'miss' \? missWhy\(offset\) : null/);
  assert.match(UI, /state\.flash = \{ judge: 'miss', why: 'late'/);
});

test('놓친 수를 빨랐던 것·늦었던 것으로 센다', () => {
  assert.match(UI, /countMiss\(state, missWhy\(offset\)\)/);
  assert.match(UI, /countMiss\(state, 'late'\)/);
});

test('플래시 문구가 이유별로 갈린다', () => {
  assert.match(RENDER, /why === 'early' \? t\(COPY\.missEarly\) : t\(COPY\.missLate\)/);
});

test('결과 카드에 빨랐어요·늦었어요 수가 나온다', () => {
  assert.match(UI, /COPY\.missEarly/);
  assert.match(UI, /COPY\.missLate/);
});

test('문구와 영어 번역', () => {
  assert.match(COPY, /missEarly: '빨랐어요'/);
  assert.match(COPY, /missLate: '늦었어요'/);
  assert.ok(EN.includes("'빨랐어요':") && EN.includes("'늦었어요':"));
});
