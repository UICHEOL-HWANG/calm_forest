import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('game.js 에는 광장 연결 줄만 — 로직은 js/plaza/ 에', () => {
  const game = read('js/game.js');
  const lines = game.split('\n').filter(l => /plaza/i.test(l));
  assert.ok(lines.length <= 14, `game.js 에 plaza 줄이 ${lines.length}개 — 14 이하여야 한다:\n${lines.join('\n')}`);
  assert.ok(!/function\s+\w*plaza/i.test(game), 'game.js 에 plaza 함수 정의가 생겼다 — js/plaza/ 로 옮길 것');
  assert.ok(!/(const|let)\s+\w*plaza\w*\s*=\s*(\(|function|\{)/i.test(game), 'game.js 에 plaza 로직 선언이 생겼다');
});
