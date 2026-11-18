import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('사용자 속성에 E7 무리가 실린다', () => {
  const src = read('js/analytics.js');
  assert.ok(src.includes("from './exp-e7-boot.js'"));
  assert.ok(src.includes('...e7UserProps(e7Decision())'));
});

test('세션 기록에 E7 무리 표시가 남는다', () => {
  const src = read('js/metrics.js');
  assert.ok(src.includes('e7SessionMark(e7Decision())'));
  assert.ok(src.includes('if (e7Mark) counts[e7Mark] = 1;'));
});

test('게임이 기본 이름 생성을 Input 으로 내보낸다', () => {
  const src = read('js/game.js');
  assert.ok(src.includes("from './nickname-default.js'"));
  assert.ok(/defaultNickname\(animal\)\s*\{/.test(src));
});
