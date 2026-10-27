import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const CAFE = src('js/spaces/cafe.js');
const open = CAFE.slice(CAFE.indexOf('export function openMuseumView'), CAFE.indexOf('export function closeMuseumView'));
const close = CAFE.slice(CAFE.indexOf('export function closeMuseumView'), CAFE.indexOf('export function updateMuseumView'));

test('확대하는 동안 진열장 안 원래 전시물을 숨기고 닫으면 되돌린다', () => {
  assert.equal((CAFE.match(/ex\.userData\.slot = i;/g) || []).length, 2);
  assert.match(open, /userData\.slot === i/);
  assert.match(open, /inCase\.visible = false/);
  assert.match(close, /inCase\.visible = true/);
});

test('관람 중엔 도구 바퀴·도구 이름을 숨긴다', () => {
  assert.match(open, /classList\.add\('museum-view'\)/);
  assert.match(close, /classList\.remove\('museum-view'\)/);
  assert.match(src('js/hud/mobile-hud.js'), /body\.museum-view #tool-btn, body\.museum-view #tool-name \{ display: none; \}/);
});

test('돌아가기 버튼은 🔙 아이콘, 명판 문구는 엠대시 없이 번역 글루 형식', () => {
  assert.match(src('index.html'), /\|🎁\|🔙(\|🎃)?(\|🪏)?\)\/u\.test\(t\)/);
  assert.doesNotMatch(open.split('\n').find(l => l.includes('setZoneHint')), /—/);
  assert.match(open, /· \$\{d\.getFullYear\(\)\}\.\$\{d\.getMonth\(\) \+ 1\}\.\$\{d\.getDate\(\)\} 처음 발견/);
  assert.match(src('js/i18n-en.js'), /'\{0\} \{1\} · \{2\}\.\{3\}\.\{4\} 처음 발견'/);
});
