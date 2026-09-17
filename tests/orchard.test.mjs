import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FRUITS, TREE_SLOTS, STREAM_SLOTS, STREAM_R, YIELD_PER_DAY, CAP_DAYS,
         fruitOf, fruitKeyOf, sapKeyOf, growDaysOf } from '../js/orchard.js';

test('FRUITS: 스펙 §5 표 — 5종의 id·묘목값·자람일·판매가가 정확히 일치한다', () => {
  assert.deepEqual(FRUITS.map(f => f.id), ['apple', 'pear', 'peach', 'persimmon', 'chestnut']);
  assert.deepEqual(FRUITS.map(f => f.sapCoin), [90, 130, 180, 240, 300]);
  assert.deepEqual(FRUITS.map(f => f.growDays), [3, 3, 4, 4, 5]);
  assert.deepEqual(FRUITS.map(f => f.price), [5, 6, 8, 10, 12]);
  for (const f of FRUITS) {
    assert.ok(f.fruitColor > 0 && f.leafColor > 0, `${f.id}: 색이 있어야 인스턴스로 그린다`);
    assert.ok(typeof f.name === 'string' && f.name.length > 0, `${f.id}: 한국어 이름`);
  }
});

test('상한 상수: 나무 자리 10 · 시냇가 4 · 반경 5 · 하루 2개 · 3일치까지', () => {
  assert.equal(TREE_SLOTS, 10);
  assert.equal(STREAM_SLOTS, 4);
  assert.ok(STREAM_SLOTS < TREE_SLOTS, '시냇가는 일부여야 "어디 심을까" 고민이 생긴다');
  assert.equal(STREAM_R, 5);
  assert.equal(YIELD_PER_DAY, 2);
  assert.equal(CAP_DAYS, 3);
});

test('fruitOf: id 로 찾고, 모르는 값은 null', () => {
  assert.equal(fruitOf('apple').price, 5);
  assert.equal(fruitOf('bogus'), null);
  assert.equal(fruitOf(null), null);
});

test('fruitKeyOf / sapKeyOf: 인벤 키는 id 에서만 파생된다 — 한글·자리번호 금지', () => {
  assert.equal(fruitKeyOf('apple'), 'apple');
  assert.equal(sapKeyOf('apple'), 'sap_apple');
  assert.equal(sapKeyOf('chestnut'), 'sap_chestnut');
});

test('growDaysOf: 모르는 id 는 가장 짧은 3일로 안전하게 떨어진다', () => {
  assert.equal(growDaysOf('chestnut'), 5);
  assert.equal(growDaysOf('bogus'), 3);
});
