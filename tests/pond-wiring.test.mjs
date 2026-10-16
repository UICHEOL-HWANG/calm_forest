import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('fishMesh 는 색을 덮어쓸 수 있다', () => {
  assert.match(src('js/game.js'), /function fishMesh\(rarity, colOverride\)/);
  assert.match(src('js/game.js'), /const col = colOverride \?\? FISH_KINDS/);
});

test('연못 조형은 불투명 1 + 물 1 메시, 물고기 그림자 없음', () => {
  const b = src('js/pond/build.js');
  assert.equal((b.match(/new THREE\.Mesh\(/g) || []).length, 2);
  assert.match(b, /castShadow = false/);
  assert.match(b, /POND_SEA_SCALE/);
});
