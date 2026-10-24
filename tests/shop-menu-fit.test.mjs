import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('PC 좌판 창은 화면 높이 안에 들고, 목록만 스크롤되어 닫기가 늘 보인다', () => {
  const rule = html.match(/\n  #shop-menu \{[^}]*\}/)[0];
  assert.match(rule, /max-height: max\(220px, calc\(100dvh - var\(--menu-bottom\) - var\(--top-inset\) - 12px\)\)/);
  assert.match(rule, /overflow: hidden/);
  assert.match(html, /#shop-menu > \*:not\(#sell-items\):not\(#buy-items\) \{ flex: 0 0 auto; \}/);
  const list = html.match(/\n  #sell-items, #buy-items \{[^}]*\}/)[0];
  assert.match(list, /flex: 1 1 auto; min-height: 0; overflow-y: auto/);
});

test('좌판 판매 탭 아이콘은 SELL_ICO_G 하나만 쓴다', () => {
  assert.doesNotMatch(html, /const SELL_ICO = \{/);
  assert.match(html, /import \{ SELL_ICO_G \} from '\.\/js\/data\/places\.js';/);
  assert.match(html, /<span class="ck-ico">\$\{SELL_ICO_G\[k\] \|\| '📦'\}<\/span>/);
});
