import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EN } from '../js/i18n-en.js';

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('RPC keeps every existing board and adds sled over today finished runs', () => {
  const sql = read('sql/migrations/migrate_leaderboard_sled.sql');
  assert.match(sql, /p_board = 'sled'/);
  assert.match(sql, /-min\(time_ms\)/);
  assert.match(sql, /outcome = 'finish'/);
  assert.match(sql, /run_date = kst_today/);
  assert.match(sql, /course_v = 1/);
  assert.match(sql, /phys_v = 1/);
  assert.match(sql, /_nb_nick\(gs\.state/);
  for (const b of ['boat', 'sea', 'rich', 'mine', 'cook', 'quest']) assert.match(sql, new RegExp(`'${b}'`), b);
  assert.doesNotMatch(sql, /--/);
});

test('proxy whitelists sled', () => {
  assert.match(read('functions/api/leaderboard.js'), /'sled'/);
});

test('client board formats the negated score back to seconds', () => {
  const html = read('index.html');
  assert.match(html, /id:\s*'sled'/);
  assert.match(html, /\(-v \/ 1000\)\.toFixed\(2\)/);
  assert.ok(EN['🛷 썰매']);
  assert.ok(EN['오늘 설산 썰매 최고 기록']);
});
