import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOUSE_ADDONS, addonState } from '../js/house/addons.js';

test('HOUSE_ADDONS: 12종 · id 유일 · 단계 3~6 오름차순 · 가격 양수', () => {
  assert.equal(HOUSE_ADDONS.length, 12);
  assert.equal(new Set(HOUSE_ADDONS.map(a => a.id)).size, 12);
  for (let i = 1; i < HOUSE_ADDONS.length; i++) assert.ok(HOUSE_ADDONS[i].stage >= HOUSE_ADDONS[i - 1].stage);
  for (const a of HOUSE_ADDONS) {
    assert.ok(a.stage >= 3 && a.stage <= 6, a.id);
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
