import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';
import { SALE_WINDOWS } from '../js/shop/sale-window.js';

const SRC = gameSource();
const block = (open) => SRC.slice(SRC.indexOf(open), SRC.indexOf('\n];', SRC.indexOf(open)));
const sale = (b) => b.split('\n').filter(l => l.includes("sale: 'halloween'"));
const idOf = (l) => l.match(/id: '(\w+)'/)[1];
const IN = sale(block('const DECOR = ['));
const OUT = sale(block('const OUTDOOR = ['));
const PRICE = { ghostCandle: 150, miniGrave: 200, witchCauldron: 450, ghostlamp: 200, gravefence: 280, webarch: 500 };

test('6종이 정확히 들어 있다(실내 3 + 야외 3)', () => {
  assert.deepEqual(IN.map(idOf).sort(), ['ghostCandle', 'miniGrave', 'witchCauldron']);
  assert.deepEqual(OUT.map(idOf).sort(), ['ghostlamp', 'gravefence', 'webarch']);
});
test('B안 가격이다(코인 전용)', () => {
  for (const l of IN) { assert.match(l, /pay: 'coins'/); assert.equal(+l.match(/cost: (\d+)/)[1], PRICE[idOf(l)]); }
  for (const l of OUT) assert.equal(+l.match(/cost: \{ coins: (\d+) \}/)[1], PRICE[idOf(l)]);
});
test('집 단계 제한이 없다(stage·outdoorOnly·hidden 없음)', () => {
  for (const l of [...IN, ...OUT]) assert.doesNotMatch(l, /stage:|outdoorOnly|hidden/);
});
test('sale 키가 SALE_WINDOWS 에 있다 — 항목에 날짜를 복제하지 않는다', () => {
  assert.ok(SALE_WINDOWS.halloween);
  for (const l of [...IN, ...OUT]) assert.doesNotMatch(l, /20\d\d-\d\d-\d\d/);
});
test('호박 계열이 아니다', () => {
  for (const l of [...IN, ...OUT]) assert.doesNotMatch(l, /pumpkin|harvest|호박|허수아비/);
});
test('유령 촛불은 탁상 소품(sm + h)이다', () => {
  const l = IN.find(x => idOf(x) === 'ghostCandle');
  assert.match(l, /sm: true/); assert.match(l, /\bh: 0\.5\b/);
});
test('묘비 울타리는 밤손님 방어 울타리로 세지 않는다', () => {
  const nv = readFileSync(new URL('../js/spaces/night-visit.js', import.meta.url), 'utf8');
  assert.doesNotMatch(nv, /gravefence/);
});
test('영어 이름이 있다', () => {
  const en = readFileSync(new URL('../js/i18n-en.js', import.meta.url), 'utf8');
  for (const n of ['유령 촛불', '미니 묘비', '마녀 솥', '유령 정원등', '묘비 울타리', '거미줄 아치']) assert.ok(en.includes(`'${n}'`), n);
});
