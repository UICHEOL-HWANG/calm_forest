import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameSource } from './helpers/game-source.mjs';
const src = gameSource();
const fn = (name) => { const i = src.indexOf(`function ${name}(`); assert.ok(i >= 0, name); return src.slice(i, src.indexOf('\n}\n', i)); };

test('applyCharacter — buildAnimalMesh 직후 applySkin, 그다음 applyCosmetics · 옛 캐릭터 disposeSkin', () => {
  const b = fn('applyCharacter');
  const build = b.indexOf('buildAnimalMesh('), skin = b.indexOf('applySkin(THREE, built'), cos = b.indexOf('applyCosmetics(');
  assert.ok(build > 0 && skin > build && cos > skin);
  assert.match(b, /disposeSkin\(charGroup\)/);
});
test('applyCosmetics — 스킨이 바뀌면 캐릭터를 다시 조립한다 · 스킨은 앵커 꾸미기가 아니다', () => {
  const b = fn('applyCosmetics');
  assert.match(b, /!== charSkin/);
  assert.match(b, /applyCharacter\(/);
  assert.match(b, /it\.slot === 'skin'/);
});
test('buildCharacterMesh — 미리보기도 스킨을 입힌다(꾸미기보다 먼저)', () => {
  const b = fn('buildCharacterMesh');
  const skin = b.indexOf('applySkin('), cos = b.indexOf('buildCosmetic(');
  assert.ok(skin > 0 && cos > skin);
  assert.match(b, /it\.slot === 'skin'/);
});
test('updateTrail — 자국 id 는 effectiveTrail 이 정한다(정령 새싹)', () => {
  assert.match(fn('updateTrail'), /const id = effectiveTrail\(gameState\.cosmetics\)/);
});
test('메인 루프 — 말랑(squashOf)과 skinTick', () => {
  assert.match(src, /squashOf\(walkPhase, moving && skinSquashes\(charSkin\)\)/);
  assert.match(src, /charGroup\?\.userData\.skinTick\?\.\(t\)/);
});
test('미리보기 — skinTick · rebuild 때 disposeSkin', () => {
  assert.match(src, /mesh\?\.userData\?\.skinTick\?\.\(now \/ 1000\)/);
  assert.match(src, /if \(mesh\) \{ pivot\.remove\(mesh\); disposeSkin\(mesh\); \}/);
});
