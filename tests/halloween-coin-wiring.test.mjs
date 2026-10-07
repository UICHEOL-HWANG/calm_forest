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
test('placeDecor 는 신규 구매에서만 기간을 막는다', () => {
  const s = SRC.indexOf('function placeDecor(');
  const body = SRC.slice(s, SRC.indexOf('\nconst DECOR_WALL_PAD', s));
  assert.match(body, /!silent && !free && !fromStore && def\.sale && !saleOpen\(def\)/);
});
test('placeOutdoor 는 신규 구매에서만 기간을 막고 한정 코인 구매를 기록한다', () => {
  const s = SRC.indexOf('function placeOutdoor(');
  const body = SRC.slice(s, s + 5000);
  assert.match(body, /!silent && !moved && !taken && def\.sale && !saleOpen\(def\)/);
  assert.match(body, /logEcon\('outdoor_buy', id, -def\.cost\.coins/);
  assert.match(body, /trackEvent\('outdoor_buy_coins'/);
});

test('decorMesh·outdoorMesh 가 조형 모듈로 6종을 만든다', () => {
  assert.match(SRC, /HALLOWEEN_INDOOR_IDS\.includes\(id\)[\s\S]{0,200}buildHalloween\(THREE, id, HALLOWEEN_STYLE\[id\]/);
  assert.match(SRC, /HALLOWEEN_OUTDOOR_IDS\.includes\(id\)[\s\S]{0,260}buildHalloween\(THREE, id, HALLOWEEN_STYLE\[id\]/);
});
test('유령 정원등·묘비 울타리는 막고 거미줄 아치는 걸어 통과한다', () => {
  assert.match(SRC, /'fence', 'stonewall', 'postlamp', 'brazier', 'scarecrow', 'spiritlamp', 'ghostlamp', 'gravefence'/);
  assert.doesNotMatch(SRC, /\['fence'[^\]]*'webarch'/);   // webarch 는 솔리드 목록에 없다
});
