// tests/halloween-skin-ghost.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../js/cosmetics/skin-ghost.js', import.meta.url), 'utf8');

test('👻 유령 2종 — export · 표식 · 소유 표시', () => {
  assert.match(src, /export function applyGhostNightcap\(THREE, built\)/);
  assert.match(src, /export function applyGhostCloud\(THREE, built\)/);
  assert.match(src, /part\s*=\s*'skinhead'/, '후드 끝은 머리 꾸미기에 숨는다');
  assert.match(src, /skinOwned\s*=\s*true/, 'disposeSkin 이 지오메트리를 버리게');
  assert.doesNotMatch(src, /\.dispose\(\)/, '캐릭터 원본 재질은 dispose 금지');
  assert.ok(src.split('\n').length < 800, '800줄 이하');
});
