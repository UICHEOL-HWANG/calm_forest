import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CRAFT_RECIPES, recipeOf, yieldOf, canAfford, lackOf , stationDef } from '../js/craft/recipes.js';

test('표: 화덕 품목 3종 — 스펙 §3 수치 그대로', () => {
  assert.deepEqual(CRAFT_RECIPES.filter(r => r.station === 'kiln').map(r => r.id), ['charcoal', 'flour', 'brick']);
  assert.deepEqual(recipeOf('charcoal').cost, { wood: 8 });
  assert.deepEqual(recipeOf('flour').cost, { wheat: 4 });
  assert.deepEqual(recipeOf('brick').cost, { stone: 6, coal: 2 });
  const kiln = CRAFT_RECIPES.filter(r => r.station === 'kiln');
  assert.deepEqual(kiln.map(r => r.sell), [9, 18, 12]);
  assert.deepEqual(kiln.map(r => r.mg), ['grill', 'mill', 'season']);
});

test('yieldOf: 등급 0~3 → 2·3·4·5', () => {
  assert.deepEqual([0, 1, 2, 3].map(g => yieldOf('charcoal', g)), [2, 3, 4, 5]);
  assert.equal(yieldOf('flour', 0), 2, '아쉬워도 최소 2개는 나온다 — 완성 여부는 등급과 무관');
  assert.equal(yieldOf('brick', 3), 5);
});

test('yieldOf: 등급이 범위 밖이면 양끝으로 물린다', () => {
  assert.equal(yieldOf('charcoal', -1), 2);
  assert.equal(yieldOf('charcoal', 9), 5);
  assert.equal(yieldOf('charcoal', undefined), 2, '세이브에 등급이 없으면 최소');
});

test('canAfford / lackOf: 재료가 모자란 키를 짚는다', () => {
  assert.equal(canAfford('brick', { stone: 6, coal: 2 }), true);
  assert.equal(canAfford('brick', { stone: 6, coal: 1 }), false);
  assert.deepEqual(lackOf('brick', { stone: 2, coal: 2 }), ['stone']);
  assert.deepEqual(lackOf('brick', { stone: 2 }), ['stone', 'coal']);
  assert.deepEqual(lackOf('brick', { stone: 6, coal: 2 }), []);
  assert.deepEqual(lackOf('charcoal', {}), ['wood'], '빈 인벤토리도 터지지 않는다');
});

test('recipeOf: 없는 id 는 undefined', () => {
  assert.equal(recipeOf('bread'), undefined, '빵은 가공 시설이 아니라 부엌 소관이다');
});

// ── 🫙 발효통(2단계) — 시설이 둘이 되면서 station 으로 갈린다 ──
import { recipesOf, STATIONS } from '../js/craft/recipes.js';

test('표: 시설이 둘 — 화덕(kiln)과 발효통(vat)', () => {
  assert.deepEqual(STATIONS.map(s => s.id), ['kiln', 'vat']);
  assert.deepEqual(recipesOf('kiln').map(r => r.id), ['charcoal', 'flour', 'brick']);
  assert.deepEqual(recipesOf('vat').map(r => r.id), ['juice']);
});

test('🍷 포도주스 — 포도 4로 2~5개. 포도가 드디어 쓸 데가 생긴다', () => {
  assert.deepEqual(recipeOf('juice').cost, { grape: 4 });
  assert.deepEqual(recipeOf('juice').yields, [2, 3, 4, 5]);
  assert.equal(recipeOf('juice').station, 'vat');
});

test('recipesOf: 없는 시설은 빈 배열 — 호출부가 터지지 않는다', () => {
  assert.deepEqual(recipesOf('nope'), []);
  assert.deepEqual(recipesOf(), []);
});

test('모든 레시피에 station 이 있다 — 없으면 어느 시설 목록에도 안 뜬다', () => {
  for (const r of CRAFT_RECIPES) assert.ok(STATIONS.some(s => s.id === r.station), `${r.id} 의 station 이 이상하다`);
});

test('STATIONS: 창 문구는 표에서 온다 — 조각을 코드에서 잇지 않는다', () => {
  for (const st of STATIONS) {
    assert.ok(st.ask && st.claim && st.hint, `${st.id} 문구가 다 있다`);
    assert.ok(!/구워/.test(st.id === 'vat' ? st.ask + st.claim + st.hint : ''), '발효통이 굽는다고 말하지 않는다');
  }
  assert.equal(stationDef('vat').name, '발효통');
  assert.equal(stationDef('없는것').id, 'kiln', '모르는 시설은 화덕으로 — 창이 비지 않게');
});
