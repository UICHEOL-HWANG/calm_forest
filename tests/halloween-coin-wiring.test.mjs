// tests/halloween-coin-wiring.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';

const SRC = gameSource();
const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('getDecor 는 hidden 을 빼고 기간 밖 항목을 거르며 태그를 싣는다', () => {
  assert.ok(SRC.includes('DECOR.filter(d => !d.hidden)'));   // 기존 단언(house-floors.test)과 같은 부분 문자열 유지
  const s = SRC.indexOf('getDecor() {');
  const body = SRC.slice(s, SRC.indexOf('getKitchen()', s));
  assert.match(body, /catalogVisible\(d, \{ stored:/);
  assert.match(body, /tag: saleTagOf\(d\)/);
});
test('getOutdoor 는 기간 밖·보관분 0 항목을 거른다', () => {
  const s = SRC.indexOf('getOutdoor() {');
  const body = SRC.slice(s, s + 400);
  assert.match(body, /catalogVisible\(o, \{ stored: gameState\.outdoorStored/);
  assert.match(body, /tag: saleTagOf\(o\)/);
});
test('행 렌더가 태그를 그린다(라벨과 날짜는 별개 노드)', () => {
  assert.match(HTML, /class="di-tag">\$\{d\.tag\.label\}<\/span><span class="di-tag">\$\{d\.tag\.until\}/);
  assert.match(HTML, /class="ck-tag">\$\{o\.tag\.label\}<\/span><span class="ck-tag">\$\{o\.tag\.until\}/);
});
