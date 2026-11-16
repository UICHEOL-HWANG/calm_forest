import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { footAngle, footHintCss } from '../js/guide/foot-ring.js';

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('footAngle 은 +z 를 0 으로, +x 를 오른쪽 90도로 잰다', () => {
  assert.equal(footAngle({ x: 0, z: 0 }, { x: 0, z: 5 }), 0);
  assert.equal(footAngle({ x: 1, z: 1 }, { x: 4, z: 1 }), Math.PI / 2);
  assert.equal(footAngle({ x: 0, z: 0 }, { x: 0, z: -2 }), Math.PI);
});

test('캐릭터 길 안내 세 곳이 모두 금빛 발밑 고리를 쓴다', () => {
  for (const p of ['js/guide/view.js', 'js/spaces/house-guide.js', 'js/auction/guide.js']) {
    const src = read(p);
    assert.match(src, /createFootRing\(THREE, /, p);
    assert.doesNotMatch(src, /pointer::before|ShapeGeometry\(sh\)/, p);
  }
});

test('말풍선 스타일은 선택자마다 같은 금색 테두리 알약', () => {
  const css = footHintCss('#x .h');
  assert.match(css, /^#x \.h\{/);
  assert.match(css, /#f3c55a/);
  assert.match(css, /#x \.h::before\{/);
});
