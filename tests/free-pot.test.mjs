import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INGREDIENTS, comboKey, parseKey, allCombos, BLOCKED, freeCombos, capTaste, buffOf, durOf, stageOf,
         costOf, validateEntry } from '../js/free-pot/rules.js';
import { recipesFromSource } from '../tools/free-pot/recipes-src.mjs';

const RECIPES = recipesFromSource();   // catalog.js 는 three 때문에 import 불가 → 원문 파싱

test('recipesFromSource: 레시피 11종의 id·name·cost 를 읽는다', () => {
  assert.equal(RECIPES.length, 11);
  assert.deepEqual(RECIPES.find(r => r.id === 'omelette').cost, { egg: 2, crop: 1 });
  assert.equal(RECIPES.find(r => r.id === 'grape_juice').name, '포도주스');
});

test('comboKey: 재료 순서가 달라도 같은 키, 중복은 유지', () => {
  assert.equal(comboKey(['honey', 'fish', 'apple']), 'fish+honey+apple');
  assert.equal(comboKey(['apple', 'honey', 'fish']), 'fish+honey+apple');
  assert.equal(comboKey(['egg', 'egg']), 'egg+egg');
  assert.deepEqual(parseKey('fish+honey+apple'), ['fish', 'honey', 'apple']);
});

test('allCombos: 14종 크기 1~3 중복조합 = 14+105+560', () => {
  const all = allCombos();
  assert.equal(INGREDIENTS.length, 14);
  assert.equal(all.length, 679);
  assert.equal(new Set(all).size, 679);
});

test('BLOCKED: 재료가 레시피와 똑같은 조합은 전부 막는다(리터럴 ↔ 원문 대조)', () => {
  const expect = {};
  for (const r of RECIPES) {
    const ids = Object.entries(r.cost).flatMap(([k, n]) => Array(n).fill(k));
    if (ids.length > 3 || !ids.every(k => INGREDIENTS.includes(k))) continue;
    (expect[comboKey(ids)] ||= []).push(r.id);
  }
  assert.deepEqual(BLOCKED, expect);
  for (const r of RECIPES) {
    const ids = Object.entries(r.cost).flatMap(([k, n]) => Array(n).fill(k));
    if (ids.length > 3 || !ids.every(k => INGREDIENTS.includes(k))) continue;
    assert.ok(BLOCKED[comboKey(ids)]?.includes(r.id), `${r.id} 가 막혀야 한다`);
  }
  assert.deepEqual([...BLOCKED['crop+forage+forage']].sort(), ['baked_yam', 'herb_salad']);
  assert.equal(freeCombos().length, 672);   // 679 − 막힌 7
  assert.ok(freeCombos().every(k => !BLOCKED[k]));
});

test('capTaste: 한 재료만 반복하면 최대 ★3, 1~5 범위로 자른다', () => {
  assert.equal(capTaste('honey+honey+honey', 5), 3);
  assert.equal(capTaste('honey', 4), 3);
  assert.equal(capTaste('apple+honey', 5), 5);
  assert.equal(capTaste('apple+honey', 9), 5);
  assert.equal(capTaste('apple+honey', 0), 1);
});

test('buffOf: 재료 계열 다수결, 동률은 luck>speed>chop>mine', () => {
  assert.equal(buffOf('fish+fish+honey'), 'luck');
  assert.equal(buffOf('grape+pear'), 'speed');
  assert.equal(buffOf('egg+flour+wheat'), 'chop');
  assert.equal(buffOf('crop+egg'), 'mine');
  assert.equal(buffOf('fish+honey'), 'luck');
  assert.equal(buffOf('crop+corn'), 'chop');
});

test('durOf: 맛 → 기본 지속(★3 이 ★1 레시피 60초보다 짧게)', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(durOf), [20, 30, 45, 60, 90]);
});

test('stageOf: 생선 있으면 굽기, 과일·꿀만이면 썰기, 나머지 끓이기', () => {
  assert.equal(stageOf('fish+honey'), 'grill');
  assert.equal(stageOf('honey+apple+pear'), 'chop');
  assert.equal(stageOf('egg+corn'), 'pot');
});

test('costOf: 키 → 재료 개수', () => {
  assert.deepEqual(costOf('egg+egg+honey'), { egg: 2, honey: 1 });
});

test('validateEntry: 시큰둥 금지어·길이·이모지·이름 충돌·괴요리 태그·중복', () => {
  const ctx = () => ({ recipeNames: new Set(RECIPES.map(r => r.name)), seenNames: new Set() });
  const ok = { name: '꿀 배숙', name_en: 'Honey Poached Pear', ico: '🍐', taste: 4,
               judge: '목을 따뜻하게 감싸주는 보약 같아요.', judge_en: 'A soothing sweet remedy.', tags: ['sweet', 'fruity'] };
  assert.deepEqual(validateEntry('honey+pear', ok, ctx()), []);
  assert.ok(validateEntry('peach+peach', { ...ok, judge: '그냥 복숭아 맛이에요.' }, ctx()).some(m => m.includes('금지어')));
  assert.ok(validateEntry('honey+pear', { ...ok, ico: 'persimmon' }, ctx()).some(m => m.includes('이모지')));
  assert.ok(validateEntry('honey+pear', { ...ok, name: '포도주스' }, ctx()).some(m => m.includes('레시피')));
  assert.ok(validateEntry('honey+pear', { ...ok, name: '수상한포도밀생선범벅' }, ctx()).some(m => m.includes('이름 길이')));
  assert.ok(validateEntry('honey+pear', { ...ok, judge: '가'.repeat(29) }, ctx()).some(m => m.includes('평 길이')));
  assert.ok(validateEntry('honey+pear', { ...ok, taste: 2 }, ctx()).some(m => m.includes('weird')));
  const c = ctx(); validateEntry('honey+pear', ok, c);
  assert.ok(validateEntry('honey+apple', ok, c).some(m => m.includes('중복')));
});
