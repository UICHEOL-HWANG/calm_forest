import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';

const faces = readFileSync(new URL('../js/animal-faces.js', import.meta.url), 'utf8');

test('animal-faces — 눈동자·하이라이트에 표식(스킨이 추측하지 않고 찾는다)', () => {
  const body = faces.slice(faces.indexOf('function eyes('), faces.indexOf('function ear('));
  assert.match(body, /userData\.part = 'pupil'/);
  assert.match(body, /userData\.part = 'highlight'/);
});
test('animal-faces — 머리 그룹 head · 첫 구 skull', () => {
  const body = faces.slice(faces.indexOf('export function buildAnimalHead('));
  assert.match(body, /g\.userData\.part = 'head'/);
  assert.match(body, /g\.children\[0\]\.userData\.part = 'skull'/);
});
test('game.js buildAnimalMesh — 몸통 body · 배 belly 표식 · kk 에 동물 id', () => {
  const src = gameSource();
  const i = src.indexOf('function buildAnimalMesh(');
  const body = src.slice(i, src.indexOf('\n}\n', i));
  assert.match(body, /body\.userData\.part = 'body'/);
  assert.match(body, /belly\.userData\.part = 'belly'/);
  assert.match(body, /const kk = \{ id: a\.id,/);
});
