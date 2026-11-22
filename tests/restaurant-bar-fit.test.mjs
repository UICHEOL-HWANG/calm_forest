import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

globalThis.location ??= { search: '', hostname: 'localhost', href: 'http://localhost/', reload() {} };
try { globalThis.navigator ??= { language: 'ko-KR', userAgent: 'node' }; } catch {}
const { barDrop } = await import('../js/restaurant/hud.js');
const R = (left, top, right, bottom) => ({ left, top, right, bottom });

test('주문표가 오른쪽 위 버튼과 겹치면 버튼 아래로 내린다', () => {
  const items = [R(200, 10, 270, 46), R(290, 10, 352, 70), R(430, 10, 492, 70)];
  assert.equal(barDrop(items, [R(438, 16, 614, 68)]), 68 + 8 - 10);
});

test('내린 자리에서 또 겹치면(왼쪽 의뢰 칩) 그 아래까지 내린다', () => {
  const items = [R(120, 10, 200, 60), R(210, 10, 272, 68), R(438, 10, 500, 68)];
  assert.equal(barDrop(items, [R(438, 16, 614, 68), R(26, 114, 140, 130)]), 130 + 8 - 10);
});

test('겹치지 않으면 그대로 둔다', () => {
  const items = [R(200, 10, 270, 46), R(290, 10, 352, 70)];
  assert.equal(barDrop(items, [R(438, 16, 614, 68), R(12, 16, 94, 98)]), 0);
  assert.equal(barDrop([], [R(0, 0, 999, 99)]), 0);
});

test('HUD: 주문표가 바뀔 때 겹침을 재고, 안내 카드도 같이 내려간다', () => {
  const src = readFileSync(new URL('../js/restaurant/hud.js', import.meta.url), 'utf8');
  assert.match(src, /fitBar\(\);/);
  assert.match(src, /'#topright', '#minimap', '#coach'\]\.map\(q => doc\.querySelector\(q\)\)\.filter\(e => e\?\.getClientRects\(\)\.length\)/);
  assert.match(src, /#guide-card\{top:calc\(env\(safe-area-inset-top\) \+ 80px \+ var\(--rest-bar-drop, 0px\)\)\}/);
});
