import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('세로 폰에서 길 안내 카드는 아래 안내 줄 위에 뜬다(의뢰 패널을 덮지 않게)', () => {
  assert.match(html, /@media \(orientation: portrait\) \{\n\s*body\.is-touch #guide-card \{ top: auto; bottom: calc\(280px \+ env\(safe-area-inset-bottom\)\); font-size: 12\.5px; padding: 3px 12px; \}\n\s*\}/);
});

test('아래 안내가 떠 있으면 그 위로 비켜 선다', () => {
  const fn = html.slice(html.indexOf('function placeGuideCard('), html.indexOf('function layoutPrompts('));
  assert.match(fn, /\['door-prompt', 'fish-prompt', 'zone-prompt'\]/);
  assert.match(fn, /card\.style\.bottom = top == null \? '' : Math\.round\(window\.innerHeight - top \+ PROMPT_GAP\) \+ 'px';/);
  const lp = html.slice(html.indexOf('function layoutPrompts('), html.indexOf("window.addEventListener('resize', layoutPrompts);"));
  assert.equal((lp.match(/placeGuideCard\(\);/g) || []).length, 3);
});
