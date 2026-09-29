import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MODEL_KEYS, grillKeyOf, stageKeys } from '../js/cook-ingredients.js';
import { INGREDIENTS } from '../js/free-pot/rules.js';
import { recipesFromSource } from '../tools/free-pot/recipes-src.mjs';

// 🍲 조리 무대 재료 — 이모지 스프라이트 대신 3D 모형(사용자 "이모지 말고 만들어서 넣어", 2026-09-29)
const RECIPES = recipesFromSource();
const CAT = readFileSync(new URL('../js/data/catalog.js', import.meta.url), 'utf8');
const stagesOf = (id) => JSON.parse(CAT.match(new RegExp(`id: '${id}'[^\\n]*stages: (\\[[^\\]]*\\])`))[1].replace(/'/g, '"'));
const ART = readFileSync(new URL('../js/cook-ingredient-art.js', import.meta.url), 'utf8');

test('모형 키: 레시피 재료 전부 + 보글보글 냄비 14종 + 석쇠 전용(고구마·빵 반죽)', () => {
  for (const r of RECIPES) for (const k of Object.keys(r.cost)) assert.ok(MODEL_KEYS.includes(k), `${r.id}: ${k}`);
  for (const k of INGREDIENTS) assert.ok(MODEL_KEYS.includes(k), k);
  for (const k of ['yam', 'bread']) assert.ok(MODEL_KEYS.includes(k), k);
  for (const k of MODEL_KEYS) assert.match(ART, new RegExp(`case '${k}'`), `${k} 모형 없음`);
  assert.doesNotMatch(ART, /Sprite\(/);
});

test('grillKeyOf: 석쇠엔 굽는 재료 — 생선 든 요리는 fish, 군고구마 yam, 빵 bread, 자유 요리는 fish', () => {
  const grill = RECIPES.filter(r => stagesOf(r.id).includes('grill'));
  assert.ok(grill.length >= 3);
  const byId = Object.fromEntries(grill.map(r => [r.id, grillKeyOf({ id: r.id, cost: r.cost })]));
  assert.equal(byId.grilled_fish, 'fish');
  assert.equal(byId.baked_yam, 'yam');
  assert.equal(byId.bread, 'bread');
  assert.equal(byId.forest_feast, 'fish');
  assert.equal(grillKeyOf({ id: 'free:fish+honey', cost: { fish: 1, honey: 1 }, free: { key: 'fish+honey' } }), 'fish');
  for (const k of Object.values(byId)) assert.ok(MODEL_KEYS.includes(k));
});

test('stageKeys: 재료 키 목록(중복 그대로, 최대 3) — 끓이기 국물 위·썰기 노트에 쓴다', () => {
  assert.deepEqual(stageKeys({ cost: { crop: 3 } }), ['crop', 'crop', 'crop']);
  assert.deepEqual(stageKeys({ cost: { forage: 2, crop: 2, fish: 1 } }), ['forage', 'forage', 'crop']);
  assert.deepEqual(stageKeys({ cost: { fish: 1, honey: 1 } }), ['fish', 'honey']);
});
