// tests/halloween-tool-skins.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TOOL_THEMES, SKIN_TOOLS, themeOf, toolSkinOf } from '../js/cosmetics/tool-skin-rules.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('🎃 테마 5종 — 기존 3 + 달밤 보라(batnight) + 수확제(harvest)', () => {
  assert.deepEqual([...TOOL_THEMES], ['shroom', 'moon', 'bloom', 'batnight', 'harvest']);
  assert.equal(themeOf('tools_batnight'), 'batnight');
  assert.equal(themeOf('tools_harvest'), 'harvest');
  assert.equal(themeOf('tools_moon'), 'moon', '기존 달밤 세트와 안 섞인다');
  assert.equal(toolSkinOf({ equipped: { tools: 'tools_harvest' } }), 'harvest');
});

test('🎃 새 테마 파일 — 9종 전부 · 우산 · themeBuilders 에 펼침', () => {
  const h = read('../js/cosmetics/tool-skins-halloween.js');
  assert.match(h, /export function halloweenThemes\(THREE, K\)/);
  for (const theme of ['batnight', 'harvest']) assert.match(h, new RegExp(`${theme}:`), theme);
  for (const tool of SKIN_TOOLS) assert.match(h, new RegExp(`\\b${tool}\\b`), `도구 ${tool}`);
  const ts = read('../js/cosmetics/tool-skins.js');
  assert.match(ts, /\.\.\.halloweenThemes\(THREE, K\)/);
  assert.match(ts, /batnight:\s*\{/);
  assert.match(ts, /harvest:\s*\{/);   // UMBRELLAS
});

test('🎃 스윙·쥐기 값은 건드리지 않는다(새 파일이 모션 상수를 정의하지 않음)', () => {
  const h = read('../js/cosmetics/tool-skins-halloween.js');
  assert.doesNotMatch(h, /TOOL_GRIP\s*=|TOOL_QREST_HOLD\s*=|[sS]wing/);
  assert.ok(h.split('\n').length < 800);
});
