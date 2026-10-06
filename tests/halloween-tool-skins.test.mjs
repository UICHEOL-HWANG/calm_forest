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
  // 테마 블록별로 잘라 두 테마 모두 9종을 갖췄는지 본다
  const body = h.slice(h.indexOf('export function halloweenThemes'));
  const bi = body.indexOf('batnight: {'), hi = body.indexOf('harvest: {');
  assert.ok(bi > 0 && hi > bi, '테마 블록 순서');
  const blocks = { batnight: body.slice(bi, hi), harvest: body.slice(hi) };
  for (const [theme, src] of Object.entries(blocks)) {
    for (const tool of SKIN_TOOLS) assert.match(src, new RegExp(`\\b${tool}\\(g\\)`), `${theme}.${tool}`);
  }
  const ts = read('../js/cosmetics/tool-skins.js');
  assert.match(ts, /\.\.\.halloweenThemes\(THREE, K\)/);
  const umb = ts.slice(ts.indexOf('const UMBRELLAS = {'));
  const umbTable = umb.slice(0, umb.indexOf('\n};'));
  assert.match(umbTable, /batnight:\s*\{/);   // UMBRELLAS 표
  assert.match(umbTable, /harvest:\s*\{/);
});

test('🎃 스윙·쥐기 값은 건드리지 않는다(새 파일이 모션 상수를 정의하지 않음)', () => {
  const h = read('../js/cosmetics/tool-skins-halloween.js');
  assert.doesNotMatch(h, /TOOL_GRIP\s*=|TOOL_QREST_HOLD\s*=|[sS]wing/);
  assert.ok(h.split('\n').length < 800);
});
