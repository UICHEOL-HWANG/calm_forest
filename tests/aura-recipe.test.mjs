import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AURA_PALETTE, PALETTE_IDS, hexOf } from '../js/aura/palette.js';
import {
  SHAPES, MOTIONS, BANDS, COUNT_MAX, COUNT_MIN, DEFAULT_RECIPE, SLOT_MAX,
  sanitizeRecipe, sanitizeCards, cardsFromText, swapCard, fallbackRecipe, RECIPE_JSON_SCHEMA, restoreAura,
} from '../js/aura/recipe.js';

test('팔레트는 24색, id 는 유일하고 hexOf 는 모르는 id 에 첫 색을 준다', () => {
  assert.equal(AURA_PALETTE.length, 24);
  assert.equal(new Set(PALETTE_IDS).size, 24);
  assert.equal(hexOf('nope'), AURA_PALETTE[0].hex);
});

test('sanitizeRecipe: 범위 밖은 자르고 모르는 값은 기본값', () => {
  const r = sanitizeRecipe({ v: 9, name: '아주아주아주아주긴이름입니다', line: 'x'.repeat(80), shape: 'laser',
    motion: 'spiral', band: 'head', count: 99, speed: 1.4, radius: 0.1, colors: ['pink', 'neon', 'mint'] });
  assert.equal(r.v, 1);
  assert.equal(r.name.length, 12);
  assert.equal(r.line.length, 40);
  assert.equal(r.shape, DEFAULT_RECIPE.shape);
  assert.equal(r.motion, 'spiral');
  assert.equal(r.band, 'head');
  assert.equal(r.count, COUNT_MAX);
  assert.equal(r.speed, 1.5);
  assert.equal(r.radius, 0.7);
  assert.deepEqual(r.colors, ['pink', 'mint']);
});

test('sanitizeRecipe: 빈 입력·금칙어 이름은 대체값', () => {
  const blocked = s => s.includes('나쁜');
  const r = sanitizeRecipe({ name: '나쁜말', count: 'abc', colors: [] }, { isBlocked: blocked });
  assert.equal(r.name, DEFAULT_RECIPE.name);
  assert.equal(r.count, DEFAULT_RECIPE.count);
  assert.deepEqual(r.colors, DEFAULT_RECIPE.colors);
  assert.equal(sanitizeRecipe(null).shape, DEFAULT_RECIPE.shape);
  assert.ok(sanitizeRecipe({ count: 1 }).count >= COUNT_MIN);
});

test('sanitizeCards: 네 칸이 모두 허용값이어야 한다', () => {
  assert.deepEqual(sanitizeCards({ shape: 'drop', color: 'mint', motion: 'fall', band: 'body' }),
    { shape: 'drop', color: 'mint', motion: 'fall', band: 'body' });
  assert.equal(sanitizeCards({ shape: 'drop', color: 'mint', motion: 'fall' }), null);
  assert.equal(sanitizeCards({ shape: 'laser', color: 'mint', motion: 'fall', band: 'body' }), null);
});

test('cardsFromText: 키워드를 카드로, 없으면 기본 카드', () => {
  const c = cardsFromText('비 온 뒤 풀잎에 맺힌 물방울처럼');
  assert.equal(c.shape, 'drop');
  assert.ok(PALETTE_IDS.includes(c.color));
  assert.deepEqual(Object.keys(c).sort(), ['band', 'color', 'motion', 'shape']);
  assert.equal(cardsFromText('벚꽃잎이 빙글빙글').shape, 'petal');
  assert.equal(cardsFromText('벚꽃잎이 빙글빙글').motion, 'spiral');
  assert.equal(cardsFromText('머리 위에 별').band, 'head');
  assert.equal(cardsFromText('비눗방울이 둥실').shape, 'bubble');
  assert.notEqual(cardsFromText('비밀의 정원').shape, 'drop');
  assert.ok(SHAPES.includes(cardsFromText('').shape));
});

test('swapCard: 같은 칸의 다음 후보로 순환하고 원본은 그대로', () => {
  const c = { shape: 'bubble', color: 'gold', motion: 'pulse', band: 'head' };
  assert.equal(swapCard(c, 'shape').shape, SHAPES[0]);
  assert.equal(swapCard(c, 'motion').motion, MOTIONS[0]);
  assert.equal(swapCard(c, 'band').band, BANDS[0]);
  assert.equal(swapCard(c, 'color').color, PALETTE_IDS[0]);
  assert.equal(c.shape, 'bubble');
});

test('fallbackRecipe: 카드 그대로, 같은 시드면 같은 결과', () => {
  const cards = { shape: 'petal', color: 'pink', motion: 'spiral', band: 'body' };
  const a = fallbackRecipe(cards, 'order-1');
  assert.deepEqual(a, fallbackRecipe(cards, 'order-1'));
  assert.equal(a.shape, 'petal');
  assert.equal(a.colors[0], 'pink');
  assert.ok(a.count >= 10 && a.count <= 18);
  assert.deepEqual(sanitizeRecipe(a), a);
});

test('RECIPE_JSON_SCHEMA 의 enum 이 상수와 같다', () => {
  const p = RECIPE_JSON_SCHEMA.properties;
  assert.deepEqual(p.shape.enum, [...SHAPES]);
  assert.deepEqual(p.motion.enum, [...MOTIONS]);
  assert.deepEqual(p.colors.items.enum, [...PALETTE_IDS]);
  assert.equal(RECIPE_JSON_SCHEMA.additionalProperties, false);
});

test('restoreAura: 3칸 상한·모르는 장착 id 제거·레시피 정제', () => {
  const slot = id => ({ id, recipe: { shape: 'star', count: 99 }, tune: { count: 5, speed: 9, radius: 1, colors: ['x'] } });
  const out = restoreAura({ slots: [slot('a'), slot('b'), slot('c'), slot('d')], equipped: 'zzz' });
  assert.equal(out.slots.length, SLOT_MAX);
  assert.equal(out.equipped, null);
  assert.equal(out.slots[0].recipe.count, COUNT_MAX);
  assert.equal(out.slots[0].tune.count, COUNT_MIN);
  assert.equal(out.slots[0].tune.speed, 1.5);
  assert.deepEqual(restoreAura(undefined), { slots: [], equipped: null });
  assert.equal(restoreAura({ slots: [slot('a')], equipped: 'a' }).equipped, 'a');
});
