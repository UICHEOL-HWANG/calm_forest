import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameSource } from './helpers/game-source.mjs';

// 🛋️ 들고 있던 가구(pickDecor 로 들어 올려 기록이 이미 지워진 상태)를 두고 다른 가구를 고르면
//    startDecorPlacing 이 pickedDecor 를 null 로 덮어써 가구가 영구 삭제됐다. 야외(selectOutdoor)와 같은 가드.

const src = gameSource();

test('selectDecor: 들고 있던 가구는 제자리로 돌려놓고 새 가구를 든다', () => {
  const line = src.split('\n').find(l => /^\s*selectDecor\(id\)/.test(l));
  assert.ok(line, 'selectDecor 없음');
  assert.match(line, /if \(pickedDecor\) stopDecorPlacing\(true\);\s*startDecorPlacing\(id\)/);
});
