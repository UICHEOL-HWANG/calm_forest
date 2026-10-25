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

test('🧙 망토는 몸에 붙이고 앞자락을 여민다(D안, 2026-10-25) — 팔 옆에 떠 보이지 않게', () => {
  assert.match(src, /CAPE_HUG\s*=\s*\{\s*wrap:\s*1\.6,\s*tuck:\s*0\.12,\s*floor:\s*1\.04\b/);
  assert.match(src, /silhouette\(k, \{ head: 0, body: 1\.08, flare: 0\.12 \}\)/);
  assert.match(src, /silhouette\(k, \{ head: 0, body: 1\.08, flare: 0\.06 \}\)/);
  assert.doesNotMatch(src, /PI - 1\.75/, '옛 200° 감쌈은 남기지 않는다');
  assert.match(src, /post: hugPost\(/, '앞자락 여밈은 drape post 로');
});

test('🧙 망토 겨드랑이 트기(G안, 2026-10-25) — 휘두를 때 오른팔이 앞자락을 뚫지 않게 팔 높이만 뒤로', () => {
  assert.match(src, /CAPE_HUG\s*=\s*\{[^}]*sweep:\s*0\.45/);
  assert.match(src, /bodyY \+ R \* 0\.54/, '팔 축 높이는 game.js 팔 pivot 과 같은 식');
});
