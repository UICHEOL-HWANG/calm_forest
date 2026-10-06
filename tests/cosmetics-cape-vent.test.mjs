// tests/cosmetics-cape-vent.test.mjs — 망토 뒤트임이 꼬리 "객체"를 읽는지 (여우·고양이는 넓게)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tailType } from '../js/cosmetics/anchors.js';

test('tailType — game.js 의 객체 형태와 옛 문자열 형태를 모두 읽는다', () => {
  assert.equal(tailType({ type: 'bushy', color: 0xf0883a }), 'bushy');
  assert.equal(tailType({ type: 'long' }), 'long');
  assert.equal(tailType('bushy'), 'bushy');
  assert.equal(tailType(undefined), '');
  assert.equal(tailType(null), '');
});

test('game.js — 여우 bushy · 고양이 long 은 큰 꼬리, 나머지는 아니다', () => {
  const src = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  const types = [...src.matchAll(/id:\s*'(\w+)'[\s\S]*?tail:\s*\{\s*type:\s*'(\w+)'/g)];
  assert.ok(types.length >= 5, 'ANIMALS 정의를 읽지 못했다');
  const big = types.filter(([, , t]) => ['bushy', 'long'].includes(tailType({ type: t })));
  assert.ok(big.length >= 2);
});

test('art.js — 망토 BIG_TAIL 은 tailType 으로 판정한다(문자열 직접 비교 금지)', () => {
  const src = readFileSync(new URL('../js/cosmetics/art.js', import.meta.url), 'utf8');
  assert.match(src, /BIG_TAIL = \[[^\]]*\]\.includes\(tailType\(k\.tail\)\)/);
  assert.doesNotMatch(src, /k\.tail === '/);
});
