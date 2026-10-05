import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOUSE_ADDONS, addonState } from '../js/house/addons.js';

test('HOUSE_ADDONS: 12종 · id 유일 · 단계 3~6 오름차순 · 가격 양수', () => {
  assert.equal(HOUSE_ADDONS.length, 12);
  assert.equal(new Set(HOUSE_ADDONS.map(a => a.id)).size, 12);
  for (let i = 1; i < HOUSE_ADDONS.length; i++) assert.ok(HOUSE_ADDONS[i].stage >= HOUSE_ADDONS[i - 1].stage);
  for (const a of HOUSE_ADDONS) {
    assert.ok(a.stage >= 3 && a.stage <= 7, a.id);
    assert.ok(a.coins > 0 && typeof a.build === 'function', a.id);
  }
});

test('addonState: build 를 빼고 owned/locked/affordable 을 붙인다', () => {
  const items = addonState(HOUSE_ADDONS, ['garden_lamps'], 4, 100);
  const by = Object.fromEntries(items.map(i => [i.id, i]));
  assert.equal('build' in by.garden_lamps, false);
  assert.deepEqual([by.garden_lamps.owned, by.garden_lamps.locked, by.garden_lamps.affordable], [true, false, false]);   // 산 건 다시 못 산다
  assert.deepEqual([by.chimney_smoke.owned, by.chimney_smoke.locked, by.chimney_smoke.affordable], [false, false, true]); // 40 ≤ 100
  assert.deepEqual([by.ivy.locked, by.ivy.affordable], [false, false]);                                                     // 4단계지만 120 > 100
  assert.deepEqual([by.awning.locked, by.awning.affordable], [true, false]);                                                // 5단계부터
});

test('addonState: 코인이 딱 맞으면 살 수 있고, ownedIds 가 없어도 동작', () => {
  const items = addonState(HOUSE_ADDONS, undefined, 6, 900);
  assert.ok(items.every(i => !i.locked && !i.owned));
  assert.equal(items.find(i => i.id === 'rooftop_set').affordable, true);
  assert.equal(addonState(HOUSE_ADDONS, [], 6, 899).find(i => i.id === 'rooftop_set').affordable, false);
});

test('addonState: 집이 아직 없으면(0단계) 전부 잠김', () => {
  assert.ok(addonState(HOUSE_ADDONS, [], 0, 9999).every(i => i.locked && !i.affordable));
});

// 🏡 7단계(정원 저택)는 모던('7m')·한옥('7h') 자리가 따로 있다 — 6단계 이하에서 산 구성품이 7단계에서 외관에서 사라지지 않게.
//   (굴뚝 연기는 6단계 빌라도 굴뚝이 없어 null 이다 — 같은 규칙)
import { readFileSync } from 'node:fs';
import { K } from '../js/house/addons.js';
const ADDON_SRC = readFileSync(new URL('../js/house/addons.js', import.meta.url), 'utf8');

test('K — 7단계만 스타일로 갈린다', () => {
  assert.equal(K(6, 'hanok'), 6);
  assert.equal(K(7, 'hanok'), '7h');
  assert.equal(K(7, 'modern'), '7m');
  assert.equal(K(7, undefined), '7m');
});

test('구성품 위치 표 10종(조명·우편함·덩굴·벤치·화분·처마·차양·야자수·연못·옥상) 전부 7단계 모던·한옥 자리가 있다(굴뚝 연기 제외)', () => {
  for (const table of ['LAMP_POS', 'MAIL_POS', 'IVY_POS', 'BENCH_POS', 'PLANTER_POS', 'EAVE_POS', 'AWNING_POS', 'PALM_POS', 'POOL', 'ROOFTOP']) {
    const i = ADDON_SRC.indexOf(`const ${table} =`);
    assert.ok(i >= 0, `${table} 표가 없다`);
    const block = ADDON_SRC.slice(i, i + 1500);
    assert.ok(block.includes("'7m'") && block.includes("'7h'"), `${table} 에 7단계 자리('7m'·'7h')가 없다`);
  }
  assert.ok(/stage === 7/.test(ADDON_SRC), '천창 조명 7단계 분기');
});
