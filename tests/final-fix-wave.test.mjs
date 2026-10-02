// tests/final-fix-wave.test.mjs — 💎 프리미엄 스킨 최종 리뷰 보정(옷장 탭·/shop 표·스킨 마감)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';
import { emptyCosmetics } from '../js/cosmetics/equip.js';
import { wardrobeTabVisible } from '../js/cosmetics/wardrobe.js';
import { ITEMS } from '../js/cosmetics/catalog.js';
import { shopRows } from '../scripts/lib/shop-rows.mjs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('wardrobeTabVisible: 웹은 늘 보인다', () => {
  assert.equal(wardrobeTabVisible('skin', emptyCosmetics(), 'web'), true);
});
test('wardrobeTabVisible: 비웹 + 스킨 미보유면 스킨 탭만 숨긴다', () => {
  for (const p of ['toss', 'android', 'itch']) {
    assert.equal(wardrobeTabVisible('skin', emptyCosmetics(), p), false);
    assert.equal(wardrobeTabVisible('head', emptyCosmetics(), p), true);
  }
});
test('wardrobeTabVisible: 비웹이어도 스킨을 가졌으면 보인다', () => {
  const cos = { ...emptyCosmetics(), owned: ['plush_doll'] };
  assert.equal(wardrobeTabVisible('skin', cos, 'toss'), true);
});
test('wardrobe.js 배선: 숨긴 칸이 현재 칸이면 head 로 되돌린다', () => {
  const src = read('js/spaces/wardrobe.js');
  assert.match(src, /wardrobeTabVisible/);
  assert.match(src, /PLATFORM/);
  assert.match(src, /slot = 'head'/);
});

test('shopRows: 현금 상품(premium)만 — 코인 전용 아이템에 원화 가격을 붙이지 않는다(Paddle 심사)', () => {
  const rows = shopRows(ITEMS);
  assert.equal(rows.length, ITEMS.filter(i => i.premium).length);
  assert.ok(rows.length >= 4);
  for (const it of ITEMS.filter(i => !i.premium)) assert.ok(!rows.some(r => r.includes(`${it.ico} ${it.name}<`)), it.id);
});
test('shopRows: 3칸(구분·아이템·가격) — 스킨은 🧥 스킨 · 원화', () => {
  const rows = shopRows(ITEMS);
  const spirit = rows.find(r => r.includes('숲의 정령')), plush = rows.find(r => r.includes('플러시 인형'));
  assert.match(spirit, /🧥 스킨/); assert.match(spirit, /₩10,000/); assert.match(plush, /₩9,000/);
  assert.equal((spirit.match(/<td>/g) || []).length, 3);
  assert.doesNotMatch(rows.join(''), /현금 전용|🪙/);
});
test('shop.template: 표 머리 3칸 · 펫 줄 없음', () => {
  const tpl = read('pages/shop.template.html');
  assert.match(tpl, /<tr><th>구분<\/th><th>아이템<\/th><th>가격<\/th><\/tr>/);
  assert.doesNotMatch(read('scripts/build-web.mjs'), /petShopRows/);
});
test('build-web 이 shopRows 를 쓴다', () => {
  assert.match(read('scripts/build-web.mjs'), /shopRows/);
});

test('game.js: 배 런 early-return 앞에서 스케일 복구 + skinTick 호출', () => {
  const src = gameSource();
  const i = src.indexOf('function updatePlayer(dt, t)');
  const body = src.slice(i, i + 700);
  const boat = body.indexOf('if (boat.active)'), ret = body.indexOf('return updateBoatRun');
  const tick = body.indexOf('skinTick'), scale = body.indexOf('scale.setScalar(1)');
  assert.ok(boat > -1 && ret > boat);
  assert.ok(tick > boat && tick < ret, 'skinTick 이 배 분기 안, 반환 앞');
  assert.ok(scale > boat && scale < ret, '스케일 복구가 반환 앞');
});
test('game.js: 미리보기 rebuild 는 effectiveTrail 을 쓴다', () => {
  const src = gameSource();
  const i = src.indexOf('function rebuild()');
  assert.match(src.slice(i, i + 900), /effectiveTrail\(cos\)/);
  assert.doesNotMatch(src.slice(i, i + 900), /const tid = cos\?\.equipped\?\.trail/);
});
test('game.js: 기본 cosmetics.equipped 에 skin: null', () => {
  assert.match(gameSource(), /equipped: \{ head: null, neck: null, back: null, trail: null, skin: null \}/);
});
test('skin.js: 정령 반투명 메시는 그림자를 드리우지 않는다', () => {
  const src = read('js/cosmetics/skin.js');
  const i = src.indexOf('function applySpirit');
  assert.match(src.slice(i, i + 1200), /castShadow = false/);
});
test('purchase-reveal.js: HERO 주석은 한국어', () => {
  const src = read('js/shop/purchase-reveal.js');
  assert.doesNotMatch(src, /buildCharacterMesh origin is the feet/);
});
test('build-web: storeOpen 이면 /terms /refund 도 복사한다(STORE_PAGES) — /shop 블록과 별개', () => {
  assert.match(read('scripts/build-web.mjs'), /for \(const \[from, to\] of STORE_PAGES\) await copyInto/);
});
