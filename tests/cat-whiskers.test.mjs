import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../js/animal-faces.js', import.meta.url), 'utf8');

test('고양이 수염은 위 가닥이 위로, 아래 가닥이 아래로 벌어진다', () => {
  assert.match(src, /pv\.rotation\.set\(0, -s \* 0\.55, -s \* \(i - 1\) \* 0\.08\)/);
});

test('고양이 수염 윗가닥이 눈을 찌르지 않게 시작점을 주둥이 쪽으로 내린다', () => {
  assert.match(src, /pv\.position\.set\(s \* 0\.30, -0\.28 \+ dy, 0\.95\)/);
});
