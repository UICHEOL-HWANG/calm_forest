import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { REWARD_CAP, NOTICE_MAX, EMOJI_IDS, houseSolidR } from '../js/neighbors/rules.js';
import { YARD_R, DECOR_MAX } from '../js/neighbors/sanitize.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SQL = read('sql/migrations/migrate_neighbors.sql');

test('보상 상한 — SQL 과 JS 가 같은 값', () => {
  assert.match(SQL, new RegExp(`v_rew := v_cnt < ${REWARD_CAP};`));
});

test('앞마당 반경·장식 상한·집 터 좌표 — SQL·sanitize·places.js 가 같다', () => {
  assert.match(SQL, new RegExp(`\\(\\((?:e\\.)?o->>'x'\\)::float8 \\+ 8\\) \\^ 2 \\+ \\(\\((?:e\\.)?o->>'z'\\)::float8 \\+ 8\\) \\^ 2 <= ${YARD_R} \\* ${YARD_R}`));
  assert.match(SQL, new RegExp(`limit ${DECOR_MAX}\\n`));
  assert.match(read('js/data/places.js'), /export const HOUSE_POS = new THREE\.Vector3\(-8, 0, -8\)/);
});

test('알림 10건 · 반응 4종', () => {
  assert.match(SQL, new RegExp(`order by dd\\.created_at desc limit ${NOTICE_MAX}`));
  assert.ok(SQL.includes(`check (emoji in (${EMOJI_IDS.map(e => `'${e}'`).join(',')}))`));
});

test('집 충돌 반경 표가 js/spaces/house.js houseSolidR 와 같다', () => {
  assert.ok(read('js/spaces/house.js').includes('return s >= 7 ? 3.9 : s >= 6 ? 2.7 : s >= 5 ? 2.55 : s >= 4 ? 2.4 : 2.2;'));
  assert.deepEqual([3, 4, 5, 6, 7].map(houseSolidR), [2.2, 2.4, 2.55, 2.7, 3.9]);
});
