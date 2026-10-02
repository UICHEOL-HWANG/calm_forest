// tests/hud-right-column.test.mjs — 📱 폰 오른쪽 열이 자원 패널 실제 높이를 따라간다(2026-10-02 토스 실기기 겹침)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('문의하기·도감은 자원 패널(#topright) 아래에 실측 배치 — 고정 top 이면 패널이 두 줄일 때 깔린다', () => {
  assert.match(html, /function layoutRightColumn\(\)/);
  assert.match(html, /new ResizeObserver\(layoutRightColumn\)\.observe\(\$\('topright'\)\)/);
  assert.match(html, /fb\.style\.top = Math\.round\(top\.bottom \+ 8\)/);
});
test('시설 배너도 오른쪽 열 아래로 — --rcol-bottom', () => {
  assert.match(html, /#hint-banner \{ top: max\(calc\(162px \+ var\(--top-inset\)\), var\(--rcol-bottom, 0px\)\)/);
});
