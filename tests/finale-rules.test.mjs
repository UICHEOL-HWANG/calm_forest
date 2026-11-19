import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FINALE_CH, FINALE_KEY, finaleDue, finaleVia, hasKeeperTitle, isKeeperRow, markFinaleSeen, showTeaser } from '../js/world/finale-rules.js';
import { buildStoryView } from '../js/story/rules.js';
import { STORY } from '../js/story/chapters.js';
import { pickerRows } from '../js/neighbors/rules.js';

const S = (ch, hintsSeen = {}) => ({ story: { ch }, hintsSeen });

test('칭호는 9장을 끝낸 세이브만 받는다', () => {
  assert.equal(FINALE_CH, 9);
  assert.equal(hasKeeperTitle(S(8)), false);
  assert.equal(hasKeeperTitle(S(9)), true);
  assert.equal(hasKeeperTitle(S(10)), true);
  assert.equal(hasKeeperTitle(S('9')), true);
  assert.equal(hasKeeperTitle(S('abc')), false);
  assert.equal(hasKeeperTitle({}), false);
  assert.equal(hasKeeperTitle(null), false);
});

test('엔딩은 칭호가 있고 아직 안 본 세이브에서 한 번만 돈다', () => {
  assert.equal(finaleDue(S(9)), true);
  assert.equal(finaleDue(S(9, { [FINALE_KEY]: '2026-11-20' })), false);
  assert.equal(finaleDue(S(8)), false);
});

test('예고는 칭호가 없을 때만 보인다', () => {
  assert.equal(showTeaser(S(3)), true);
  assert.equal(showTeaser(S(9)), false);
});

test('via: 다시 보기 > 이번 접속에 9장을 끝냄 > 소급', () => {
  assert.equal(finaleVia(8, S(9), false), 'live');
  assert.equal(finaleVia(9, S(9), false), 'boot');
  assert.equal(finaleVia(null, S(9), false), 'boot');
  assert.equal(finaleVia(8, S(9), true), 'replay');
});

test('본 기록은 새 객체로 남기고 원본은 그대로 둔다', () => {
  const h = { a: true };
  const out = markFinaleSeen(h, '2026-11-20');
  assert.deepEqual(out, { a: true, treeFinale: '2026-11-20' });
  assert.deepEqual(h, { a: true });
  assert.deepEqual(markFinaleSeen(undefined, '2026-11-20'), { treeFinale: '2026-11-20' });
});

test('이웃 행 칭호는 서버 title 값만 믿는다', () => {
  assert.equal(isKeeperRow({ title: 'keeper' }), true);
  assert.equal(isKeeperRow({ title: null }), false);
  assert.equal(isKeeperRow({}), false);
  assert.equal(isKeeperRow(null), false);
});

test('순수 모듈: import 없음', () => {
  assert.doesNotMatch(readFileSync(new URL('../js/world/finale-rules.js', import.meta.url), 'utf8'), /^import /m);
});

test('이야기 뷰: 9장을 끝내면 keeper', () => {
  assert.equal(buildStoryView(STORY, { story: { ch: 9 } }).keeper, true);
  assert.equal(buildStoryView(STORY, { story: { ch: 4 } }).keeper, false);
});

test('이웃 행: 서버 title 이 keeper 면 배지', () => {
  const rows = pickerRows([{ public_id: 'a', nick: 'x', title: 'keeper' }, { public_id: 'b', nick: 'y', title: null }], () => '🐻');
  assert.deepEqual(rows.map(r => r.keeper), [true, false]);
});
