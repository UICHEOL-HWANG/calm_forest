import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tableGuideReady, tableSteps } from '../js/table/guide-steps.js';
import { TABLE_COPY } from '../js/table/copy.js';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const ok = { on: true, has: true, done: false, tries: 0, idleSec: 5 };

test('첫 요리 안내는 식탁이 있고, 안 끝났고, 두 번 미만 시도, 5초 쉬었을 때만 시작한다', () => {
  assert.equal(tableGuideReady(ok), true);
  assert.equal(tableGuideReady({ ...ok, on: false }), false);
  assert.equal(tableGuideReady({ ...ok, has: false }), false);
  assert.equal(tableGuideReady({ ...ok, done: true }), false);
  assert.equal(tableGuideReady({ ...ok, tries: 1 }), true);
  assert.equal(tableGuideReady({ ...ok, tries: 2 }), false);
  assert.equal(tableGuideReady({ ...ok, tries: undefined }), true);
  assert.equal(tableGuideReady({ ...ok, idleSec: 4.9 }), false);
});

test('세 단계: 식탁까지, 한 입, 한 입 뒤 요리책', () => {
  const steps = tableSteps(TABLE_COPY);
  assert.deepEqual(steps.map(s => s.id), ['table', 'bite', 'book']);
  assert.deepEqual(steps.map(s => s.text), [TABLE_COPY.stepTable, TABLE_COPY.stepBite, TABLE_COPY.stepBook]);
  const at = { x: 1, z: 2 };
  const c = (o) => ({ table: at, nearTable: false, bitToday: false, bookAfterBite: false, ...o });
  for (const s of steps) assert.equal(s.target(c()), at);
  const [table, bite, book] = steps;
  assert.equal(table.done(c()), false);
  assert.equal(table.done(c({ nearTable: true })), true);
  assert.equal(table.done(c({ bitToday: true })), true);
  assert.equal(bite.done(c({ nearTable: true })), false);
  assert.equal(bite.done(c({ bitToday: true })), true);
  assert.equal(book.done(c({ bookAfterBite: true })), false);
  assert.equal(book.done(c({ bitToday: true })), false);
  assert.equal(book.done(c({ bitToday: true, bookAfterBite: true })), true);
});

test('마당 안내 안에서 돈다: 흐름 이름, 기록 키, 다른 흐름 중엔 안 끼어듦', () => {
  const y = src('js/pond/yard-guide.js');
  assert.match(y, /run\('table_first', tableSteps\(TABLE_COPY\)/);
  assert.match(y, /h\.tableGuideTries = \(h\.tableGuideTries \| 0\) \+ 1;/);
  assert.match(y, /deps\.state\(\)\.hintsSeen\.tableGuide = true;/);
  assert.match(y, /tableGuideReady\(\{ on, has: !!deps\.tablePos\?\.\(\), done: !!h\.tableGuide, tries: h\.tableGuideTries, idleSec: idle \}\)/);
  assert.match(y, /if \(kind === 'kitchen'\)/);
  for (const f of ['js/table/guide-steps.js']) assert.doesNotMatch(src(f), /^\s*\/\//m);
});
