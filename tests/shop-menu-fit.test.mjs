import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('PC 좌판 창은 화면 높이 안에서 스크롤된다', () => {
  const rule = html.match(/\n  #shop-menu \{[^}]*\}/)[0];
  assert.match(rule, /max-height: calc\(100dvh - 114px - env\(safe-area-inset-bottom\) - var\(--top-inset, 0px\)\)/);
  assert.match(rule, /overflow-y: auto/);
});

test('좌판 판매 탭 아이콘은 SELL_ICO_G 하나만 쓴다', () => {
  assert.doesNotMatch(html, /const SELL_ICO = \{/);
  assert.match(html, /import \{ SELL_ICO_G \} from '\.\/js\/data\/places\.js';/);
  assert.match(html, /<span class="ck-ico">\$\{SELL_ICO_G\[k\] \|\| '📦'\}<\/span>/);
});
