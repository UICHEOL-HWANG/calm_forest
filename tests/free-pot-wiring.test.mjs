import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameSource } from './helpers/game-source.mjs';

const src = gameSource();
const fn = (name) => { const i = src.indexOf(`function ${name}(`); return src.slice(i, src.indexOf('\n}\n', i)); };

test('kitchenStart·kitchenFinish 는 dishOf 로 요리를 찾는다(자유 요리도 같은 길)', () => {
  assert.match(fn('kitchenStart'), /dishOf\(id\)/);
  assert.match(fn('kitchenFinish'), /dishOf\(id\)/);
});
test('자유 요리는 도감(cook)에 올리지 않는다', () => {
  assert.match(fn('kitchenFinish'), /if \(!isFreeId\(id\)\) dexDiscover\('cook', id\)/);
});
test('찬장·먹기도 dishOf 를 쓴다(자유 요리를 보관해도 안 깨진다)', () => {
  for (const f of ['pantryView', 'cookResolve', 'pantryEat']) assert.match(fn(f), /dishOf\(/, f);
});
test('자유 요리 결과·시작·먹기에 축 파라미터가 실린다', () => {
  for (const p of ['combo_key', 'taste', 'is_new', 'found', 'buff', 'dur_base']) assert.match(fn('kitchenFinish'), new RegExp(`${p}:`), p);
  for (const p of ['combo_key', 'n_ing', 'stage']) assert.match(fn('kitchenStart'), new RegExp(`${p}:`), p);
  assert.match(fn('eatDish'), /taste:/);
  assert.match(fn('cookResolve'), /taste:/);
});

test('세이브 복원: 찬장의 자유 요리(free:<조합>)를 버리지 않고, 있으면 표를 미리 불러온다', () => {
  const i = src.indexOf('if (Array.isArray(saved.pantry))');
  const blk = src.slice(i, src.indexOf('\n  }\n', i));
  assert.match(blk, /isFreeId\(f\.id\) && freeDishOf\(f\.id\)/);   // 레시피 목록에 없어도 형식이 맞는 자유 요리는 살린다
  assert.match(blk, /loadFreePot\(\)/);
});
