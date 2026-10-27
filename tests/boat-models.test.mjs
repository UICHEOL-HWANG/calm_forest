import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../js/boat/models.js', import.meta.url), 'utf8');

test('1차 4척 조형 함수와 진입점', () => {
  assert.match(src, /export function makeBoatModel\(boatId\)/);
  for (const f of ['ferryModel', 'lotusModel', 'raftModel', 'koiModel']) assert.match(src, new RegExp(`function ${f}\\(`), f);
  for (const k of ['oars', 'fpHide']) assert.match(src, new RegExp(`userData\\.${k}`), k);
});

test('나룻배는 기존 선체·등불에 카약 노를 쓴다', () => {
  assert.match(src, /makeBoatHull\(/);
  assert.match(src, /makeKayakPaddle\(/);
  assert.match(src, /BOAT_LAMP_POST/);
});

test('재질은 공유한다', () => {
  assert.match(src, /const MAT = \{/);
  assert.ok((src.match(/new THREE\.MeshStandardMaterial/g) || []).length <= 16);
});

test('비단잉어는 1인칭에서 몸통 메시를 모두 숨긴다', () => {
  const i = src.indexOf('function koiModel(');
  const body = src.slice(i, src.indexOf('\n}\n', i));
  assert.match(body, /g\.userData\.fpHide = g\.children\.filter\(c => c\.isMesh\)/);
});
