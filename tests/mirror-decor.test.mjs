import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('카탈로그 4종 · 🪞 결제 · 거울 마을 다녀온 뒤에만 목록에', () => {
  const cat = read('js/data/catalog.js');
  for (const [id, cost] of [['upsidePot', 6], ['waterMirror', 10], ['shadowBear', 14], ['mirrorLamp', 22]]) {
    assert.match(cat, new RegExp(`id: '${id}',[^\\n]*cost: ${cost},[^\\n]*pay: 'mirror', mirror: true`), id);
  }
  assert.match(cat, /id: 'upsidePot',[^\n]*sm: true/);
  assert.match(cat, /id: 'shadowBear', name: '거울 곰 인형'/);
  assert.match(cat, /id: 'mirrorLamp', name: '거울 등불'/);
  assert.match(read('js/game.js'), /\.filter\(d => !d\.mirror \|\| \(gameState\.mirror\?\.visits \|\| 0\) > 0 \|\| \(kept\[d\.id\] \|\| 0\) > 0\)/);
});

test('결제 — 부족 토스트·트래킹은 래퍼 경유·아이콘 🪞', () => {
  const ind = read('js/spaces/indoor.js');
  assert.match(ind, /pay === 'mirror' \? `거울 조각이 부족해요 \(필요 \$\{def\.cost\} 🪞\)`/);
  assert.match(ind, /if \(pay === 'mirror'\) MirrorT\.decorBuy\(\{ item: id, cost: def\.cost, left: gameState\.inventory\.mirror \}\);/);
  assert.match(ind, /MIRROR_DECOR_IDS\.includes\(id\)\) \{[^\n]*\n\s+g\.add\(buildMirrorDecor\(id\)\);/);
  const html = read('index.html');
  assert.match(html, /pay === 'mirror' \? '🪞'/);
  assert.match(html, /pay === 'mirror' \? '거울 조각이 부족해요 🪞'/);
});
