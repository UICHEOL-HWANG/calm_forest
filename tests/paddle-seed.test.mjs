import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildPlan, labelToAmount, patchPriceIds } from '../scripts/lib/paddle-seed.mjs';
import { ITEMS } from '../js/cosmetics/catalog.js';
import { PET_KINDS } from '../js/pet/rules.js';
import { PRICE_IDS } from '../js/shop/price-ids.js';

test('labelToAmount — 원화 라벨을 Paddle 최소 단위 문자열로(KRW 는 소수 없음)', () => {
  assert.equal(labelToAmount('₩1,500'), '1500');
  assert.equal(labelToAmount('₩4,900'), '4900');
  assert.throws(() => labelToAmount('$1.99'));
});

test('buildPlan — 카탈로그 18 + 펫 4 = 22, PRICE_IDS 키와 정확히 일치', () => {
  const plan = buildPlan(ITEMS, PET_KINDS);
  assert.equal(plan.length, 22);
  assert.deepEqual(plan.map(p => p.itemId).sort(), Object.keys(PRICE_IDS).sort());
});

test('buildPlan — 금액은 cash.js 등급표, 이름은 한국어', () => {
  const by = Object.fromEntries(buildPlan(ITEMS, PET_KINDS).map(p => [p.itemId, p]));
  assert.equal(by.star_pin.amount, '1500');
  assert.equal(by.straw_hat.amount, '2500');
  assert.equal(by.sparkle.amount, '3900');
  assert.equal(by.golem.amount, '4900');
  assert.equal(by.straw_hat.name, '밀짚모자');
  assert.equal(by.flower.name, '꽃 자국');     // '꽃' 만으로는 무엇인지 모른다
  assert.equal(by.leaf.name, '펫 씨앗이');
  assert.equal(by.leaf.kind, 'pet');
  assert.equal(by.cap.kind, 'cosmetic');
});

test('patchPriceIds — 지정한 id 만 바꾸고 접두가 같은 id(star/star_pin, cap/cape)는 건드리지 않는다', () => {
  const src = readFileSync(new URL('../js/shop/price-ids.js', import.meta.url), 'utf8');
  const out = patchPriceIds(src, { star: 'pri_01aaa', cap: 'pri_01bbb', leaf: 'pri_01ccc' });
  assert.match(out, /\bstar: 'pri_01aaa'/);
  assert.match(out, /\bstar_pin: null/);
  assert.match(out, /\bcap: 'pri_01bbb'/);
  assert.match(out, /\bcape: null/);
  assert.match(out, /\bleaf: 'pri_01ccc'/);
  assert.match(out, /\bleaf_band: null/);
  // 재실행 — 이미 채워진 값도 교체된다(라이브 전환)
  const again = patchPriceIds(out, { star: 'pri_01zzz' });
  assert.match(again, /\bstar: 'pri_01zzz'/);
});

test('patchPriceIds — 표에 없는 id 나 잘못된 priceId 는 거부', () => {
  const src = readFileSync(new URL('../js/shop/price-ids.js', import.meta.url), 'utf8');
  assert.throws(() => patchPriceIds(src, { nope: 'pri_01aaa' }));
  assert.throws(() => patchPriceIds(src, { star: 'abc' }));
});
