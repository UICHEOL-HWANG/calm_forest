import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('폰에서 섬 바구니는 왼쪽에 붙고 행동 버튼 자리를 비운 폭에 7칸이 들어간다', () => {
  assert.match(html, /body\.is-touch #port-basket \{ left: max\(12px, env\(safe-area-inset-left\)\); transform: none; --pb: min\(38px, calc\(\(100vw - 144px - 40px\) \/ 7\)\); gap: 3px; \}/);
  assert.match(html, /body\.is-touch #port-basket \.pb-slot \{ width: var\(--pb\); height: var\(--pb\); \}/);
  assert.match(html, /body\.is-touch #port-basket \.pb-slot i \{ font-size: calc\(var\(--pb\) \* 0\.56\); \}/);
});

test('390px 폰에서 바구니 오른쪽 끝이 행동 버튼(왼쪽 끝 266px)에 닿지 않는다', () => {
  const vw = 390, slot = Math.min(38, (vw - 144 - 40) / 7);
  const right = 12 + 7 * slot + 6 * 3 + 16 + 6;
  assert.ok(right <= vw - 20 - 104 - 4, `right=${right}`);
});
