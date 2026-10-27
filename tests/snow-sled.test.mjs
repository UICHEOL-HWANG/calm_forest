import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SLED_LINEUP, SLED_IDS, physOf, CASH_SLED_IDS } from '../js/mountain/sled-lineup.js';
import { rowOf, grantSnowSled, SNOW_SLED_LOCK, cafeState } from '../js/mountain/cafe-shop.js';
import { cafeItem } from '../js/mountain/cafe-catalog.js';

test('세계수 썰매는 기본 썰매와 같은 능력치·물리, 팔지 않는다', () => {
  const s = SLED_LINEUP.worldtree;
  assert.ok(SLED_IDS.includes('worldtree'));
  assert.deepEqual([...s.stats], [3, 3, 3, 3]);
  assert.equal(s.model, 'davos');
  assert.equal(s.coins, 0);
  assert.ok(!CASH_SLED_IDS.includes('worldtree'));
  assert.deepEqual(physOf('worldtree'), physOf('basic'));
});

test('눈의 가지 전엔 잠겨 있고, 받은 뒤엔 탈 수 있다', () => {
  const st = cafeState({ inventory: { coins: 99999 }, cosmetics: { owned: [], equipped: {} }, mountain: {} });
  assert.deepEqual(rowOf(cafeItem('worldtree'), st), { kind: 'locked', label: SNOW_SLED_LOCK, disabled: true });
  const hut = grantSnowSled(st.hut);
  assert.ok(hut.sleds.includes('worldtree'));
  assert.equal(grantSnowSled(hut), hut);
  assert.equal(rowOf(cafeItem('worldtree'), { ...st, hut }).kind, 'ride');
});

test('DB 제약 마이그레이션에 모든 썰매 id 가 있다', () => {
  const sql = readFileSync(new URL('../sql/migrations/migrate_sled_worldtree.sql', import.meta.url), 'utf8');
  assert.match(sql, /sled_runs_sled/);
  for (const id of SLED_IDS) assert.match(sql, new RegExp(`'${id}'`), id);
});
