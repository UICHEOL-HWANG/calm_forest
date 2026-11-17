import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPrefill } from '../js/char-prefill.js';

const maker = () => { let n = 0; return (id) => `${id}${++n}`; };

test('캐릭터를 바꾸면 손대기 전까지 이름이 따라 바뀐다', () => {
  const pf = createPrefill({ make: maker() });
  assert.equal(pf.seed('fox'), 'fox1');
  assert.equal(pf.seed('bear'), 'bear2');
  assert.equal(pf.touched(), false);
  assert.equal(pf.isDefault('bear2'), true);
});

test('직접 고치면 캐릭터를 바꿔도 이름을 덮어쓰지 않는다', () => {
  const pf = createPrefill({ make: maker() });
  pf.seed('fox');
  pf.edited('내이름');
  assert.equal(pf.touched(), true);
  assert.equal(pf.seed('bear'), null);
  assert.equal(pf.isDefault('내이름'), false);
});

test('같은 값으로 입력 이벤트가 와도 손댄 것으로 치지 않는다', () => {
  const pf = createPrefill({ make: maker() });
  const v = pf.seed('fox');
  pf.edited(v);
  assert.equal(pf.touched(), false);
});

test('다시 뽑으면 기본 이름 상태로 돌아간다', () => {
  const pf = createPrefill({ make: maker() });
  pf.seed('fox');
  pf.edited('내이름');
  assert.equal(pf.reroll('fox'), 'fox2');
  assert.equal(pf.touched(), false);
  assert.equal(pf.isDefault('fox2'), true);
});
