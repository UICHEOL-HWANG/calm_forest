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

// ⚡ 드로우콜 — 모형 하나 = 메시 1~2개(정점색으로 색을 합친다). 썰기 노트 8개 × 부속 4~10개가 그대로 콜이 되던 문제(2026-09-29)
test('ingredientModel: 부속을 재질 종류별로 합치고(mergeGeos+정점색) 형상은 재료마다 한 번만 굽는다', () => {
  assert.match(ART, /mergeGeos\(/);
  assert.match(ART, /vertexColors: true/);
  assert.match(ART, /const BAKED = new Map\(\)/);
  assert.match(ART, /BAKED\.get\(key\)/);
});

// 🪵 면 겹침 — 거의 같은 면(간격 < 0.005)은 멀리서 줄무늬로 깜빡인다(lowpoly-surface-pitfalls)
test('겹침: 포도즙 라벨은 병보다 확실히 두껍고, 옥수수 윗면은 머리 구 안으로 숨는다', () => {
  const r = (re) => ART.match(re).slice(1).map(Number);
  const [body] = r(/case 'juice':[\s\S]*?CylinderGeometry\(([\d.]+), [\d.]+, 0\.3,/);
  const [label] = r(/CylinderGeometry\(([\d.]+), [\d.]+, 0\.1, 10\), clay\(0xf1e6cf\)/);
  assert.ok(label - body >= 0.008, `label ${label} body ${body}`);
  const [cornTop] = r(/case 'corn':[\s\S]*?CylinderGeometry\(([\d.]+),/);
  const [cornHead] = r(/SphereGeometry\(([\d.]+), 8, 6\), clay\(0xf5d340\)/);
  assert.ok(cornHead - cornTop >= 0.008, `corn top ${cornTop} head ${cornHead}`);
});
