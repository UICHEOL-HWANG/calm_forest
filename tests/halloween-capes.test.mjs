// tests/halloween-capes.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('🦇 망토 2종 — art-bats.js export · art.js BACK 표에 등록', () => {
  const b = read('../js/cosmetics/art-bats.js');
  assert.match(b, /export function buildBatWing\(THREE, g, k, h\)/);
  assert.match(b, /export function buildBatCape\(THREE, g, k, h\)/);
  assert.doesNotMatch(b, /from '\.\/art\.js'/, '순환 import 금지');
  const a = read('../js/cosmetics/art.js');
  assert.match(a, /bat_wing:\s*\(g, k\)\s*=>\s*buildBatWing\(THREE, g, k, h\)/);
  assert.match(a, /bat_cape:\s*\(g, k\)\s*=>\s*buildBatCape\(THREE, g, k, h\)/);
});

test('🦇 탈락안(B 뾰족 짧은 망토)은 이식하지 않는다', () => {
  assert.doesNotMatch(read('../js/cosmetics/art-bats.js'), /톱니|jagged|serrated/i);
});
