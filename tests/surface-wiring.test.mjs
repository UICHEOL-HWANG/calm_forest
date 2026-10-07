// tests/surface-wiring.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameSource } from './helpers/game-source.mjs';

const SRC = gameSource();
const fn = (name) => {   // 함수 본문 텍스트(다음 최상위 function / 대문자 const 까지)
  const s = SRC.indexOf(`function ${name}(`); assert.ok(s >= 0, `${name} 없음`);
  const rest = SRC.slice(s + 10); const m = rest.search(/\n(?:export )?function \w+\(|\nconst [A-Z_]+ = /);
  return SRC.slice(s, s + 10 + (m < 0 ? rest.length : m));
};

test('placeDecor 는 상판 높이로 앉히고 상판 위 소품엔 충돌체를 걸지 않고 reseat 한다', () => {
  const b = fn('placeDecor');
  assert.match(b, /surfaceFor\(/);
  assert.match(b, /if \(def\.foot && !on\)/);
  assert.match(b, /reseatDecor\(\)/);
});
test('고스트·조준·가까운 가구·들기가 같은 규칙을 쓴다', () => {
  assert.match(fn('updateDecorGhost'), /surfaceFor\(/);
  assert.match(fn('floorHitFromEvent'), /intersectObjects\(targets/);
  assert.match(fn('nearestDecor'), /surfaceFor\(/);
  assert.match(fn('pickDecor'), /reseatDecor\(\)/);
});
test('reseatDecor 는 층을 따라 높이를 앉힌다', () => {
  const b = fn('reseatDecor');
  assert.match(b, /floorBaseY\(f\)/);
  assert.match(b, /removeSolid/);
  assert.match(b, /solidBox/);
});
test('힌트 배너는 상판 위 소품에서만 뜬다', () => {
  assert.match(SRC, /userData\.onSurface\) firstHintBanner\('decorStack'/);
});
