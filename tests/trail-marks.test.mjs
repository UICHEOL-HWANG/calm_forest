// tests/trail-marks.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tintTrailMark } from '../js/cosmetics/trail.js';

const src = readFileSync(new URL('../js/cosmetics/trail.js', import.meta.url), 'utf8');

test('TRAIL 표에 firefly·rainbow 빌더가 있다', () => {
  assert.match(src, /\n\s+firefly: \(g, s, o\) =>/);
  assert.match(src, /\n\s+rainbow: \(g, s, o, id\) =>/);
});

test('tintTrailMark — 그 자국 메시들의 재질 color 만 바꾼다', () => {
  const hexes = [];
  const mesh = { isMesh: true, material: { color: { setHex: (h) => hexes.push(h) } } };
  const other = { isMesh: false };
  const mark = { traverse: (fn) => [mesh, other].forEach(fn) };
  tintTrailMark(mark, 0xff0000);
  assert.deepEqual(hexes, [0xff0000]);
});

test('firefly 빌더 — 반딧불 잎은 petalOf 기본 평평함을 쓴다(rotation.x 없음)', () => {
  const match = src.match(/firefly: \(g, s, o\) =>[\s\S]*?(?=\n\s+rainbow:)/);
  assert(match, 'firefly builder found');
  const body = match[0];
  assert.doesNotMatch(body, /rotation\.x/, 'firefly builder should not contain rotation.x');
});
