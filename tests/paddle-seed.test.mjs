import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan, labelToAmount, patchPriceIds } from '../scripts/lib/paddle-seed.mjs';
import { ITEMS } from '../js/cosmetics/catalog.js';
import { PRICE_IDS } from '../js/shop/price-ids.js';

// 실제 price-ids.js 는 채워지면 null 이 없어진다 — 같은 모양의 고정 원문으로 검사한다
const FIXTURE = `export const PRICE_IDS = Object.freeze({
  cap: null, star_pin: null, leaf_band: null,
  cape: null,
  star: null, leaf: null,
});
`;

test('labelToAmount — 원화 라벨을 Paddle 최소 단위 문자열로(KRW 는 소수 없음)', () => {
  assert.equal(labelToAmount('₩1,500'), '1500');
  assert.equal(labelToAmount('₩4,900'), '4900');
  assert.throws(() => labelToAmount('$1.99'));
});

test('buildPlan — 프리미엄(현금 전용)만, PRICE_IDS 에 칸이 있다', () => {
  const plan = buildPlan(ITEMS);
  assert.deepEqual(plan.map(p => p.itemId), ['firefly', 'rainbow', 'pumpkin_glow', 'bat_swirl', 'forest_spirit', 'plush_doll', 'ghost_nightcap', 'ghost_cloud', 'witch_classic', 'witch_starry', 'tools_shroom', 'tools_moon', 'tools_bloom', 'tools_batnight', 'tools_harvest', 'bat_wing', 'bat_cape']);
  for (const p of plan) assert.ok(p.itemId in PRICE_IDS, p.itemId);
});

test('buildPlan — 금액은 won, 이름은 "○○ 자국"', () => {
  const by = Object.fromEntries(buildPlan(ITEMS).map(p => [p.itemId, p]));
  assert.equal(by.firefly.amount, '4000');
  assert.equal(by.rainbow.amount, '3000');
  assert.equal(by.firefly.name, '반딧불 자국');
  assert.equal(by.firefly.kind, 'cosmetic');
  assert.equal(by.firefly.currency, 'KRW');
  assert.equal(by.forest_spirit.amount, '10000');
  assert.equal(by.plush_doll.amount, '9000');
  assert.equal(by.forest_spirit.name, '숲의 정령');   // 스킨은 "○○ 자국" 이 붙지 않는다
});

test('patchPriceIds — 지정한 id 만 바꾸고 접두가 같은 id(star/star_pin, cap/cape)는 건드리지 않는다', () => {
  const src = FIXTURE;
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
  const src = FIXTURE;
  assert.throws(() => patchPriceIds(src, { nope: 'pri_01aaa' }));
  assert.throws(() => patchPriceIds(src, { star: 'abc' }));
});
