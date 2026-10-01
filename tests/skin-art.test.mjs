import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../js/cosmetics/skin.js', import.meta.url), 'utf8');

test('부위는 표식으로 찾는다 — 어두운 구 추측 금지', () => {
  assert.match(src, /=== 'pupil'/);
  assert.match(src, /=== 'highlight'/);
  assert.match(src, /=== 'skull'/);
  assert.doesNotMatch(src, /radiusOf\(m\) < 0\.25/);
});
test('밝기 판정은 sRGB(getHex) — Color 내부는 선형이다', () => {
  assert.match(src, /getHex\(\)/);
});
test('캐릭터 재질을 dispose 하지 않는다 — skinOwned 지오메트리만', () => {
  const d = src.slice(src.indexOf('export function disposeSkin('));
  assert.match(d, /skinOwned/);
  assert.doesNotMatch(d, /material\.dispose/);
});
test('바늘땀·단추는 병합 — mergeGeos 를 쓴다', () => {
  assert.match(src, /import \{ mergeGeos \} from '\.\/trail\.js'/);
});
test('정령 빛 알갱이는 깊이 검사를 끄지 않는다(월드에서 벽 너머로 비치지 않게)', () => {
  assert.doesNotMatch(src, /depthTest: false/);
});
test('색 상수 — 블룸 임계 0.85 아래(넓은 면: 정령 몸·새싹). 배 패치 0xf6e6c8 은 시안 승인색이라 존재만 확인', () => {
  const luma = h => (0.2126 * ((h >> 16) & 255) + 0.7152 * ((h >> 8) & 255) + 0.0722 * (h & 255)) / 255;
  for (const hex of [0x5fc4a8, 0x9be07a]) assert.ok(luma(hex) < 0.85, hex.toString(16));
  for (const hex of [0x5fc4a8, 0x9be07a, 0xf6e6c8]) assert.match(src, new RegExp('0x' + hex.toString(16)));
});
