// tests/halloween-skin-witch.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../js/cosmetics/skin-witch.js', import.meta.url), 'utf8');

test('🧙 마녀 2종 — export · 모자는 skinhead · 망토·빗자루는 skinback', () => {
  assert.match(src, /export function applyWitchClassic\(THREE, built\)/);
  assert.match(src, /export function applyWitchStarry\(THREE, built\)/);
  assert.match(src, /part\s*=\s*'skinhead'/);
  assert.match(src, /part\s*=\s*'skinback'/);
  assert.match(src, /HAT_FIT/, '동물별 모자 보정(토끼 귀 충돌)');
  assert.match(src, /rabbit/, '토끼 보정');
  assert.match(src, /skinOwned\s*=\s*true/);
  assert.doesNotMatch(src, /witchPumpkin|호박 마녀/, '탈락안은 이식하지 않는다');
  assert.ok(src.split('\n').length < 800);
  assert.doesNotMatch(src, /from '\.\/skin\.js'/, 'skin.js 를 import 하면 순환이 된다');
});
