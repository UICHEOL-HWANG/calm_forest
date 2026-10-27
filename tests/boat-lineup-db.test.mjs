import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('../sql/migrations/migrate_boat_lineup.sql', import.meta.url), 'utf8');

test('boat_runs 새 컬럼 8개', () => {
  for (const col of ['course', 'boat_id', 'loadout', 'skill_used', 'combo_max', 'near_miss', 'mats', 'course_v']) {
    assert.match(sql, new RegExp(`add column if not exists ${col}\\b`), col);
  }
});

test('course CHECK 와 jsonb 크기 상한', () => {
  assert.match(sql, /course in \('calm', 'rapid'\)/);
  assert.match(sql, /pg_column_size\(loadout\)/);
  assert.match(sql, /pg_column_size\(mats\)/);
});

test('리더보드 boat 는 잔잔한 물길만, boat_rapid 는 급류만', () => {
  const boat = sql.slice(sql.indexOf("p_board = 'boat'"), sql.indexOf("p_board = 'boat_rapid'"));
  assert.match(boat, /coalesce\(course, 'calm'\) = 'calm'/);
  const rapid = sql.slice(sql.indexOf("p_board = 'boat_rapid'"), sql.indexOf("p_board = 'sea'"));
  assert.match(rapid, /course = 'rapid'/);
  assert.match(rapid, /least\(max\(score\), 5000\)/);
});

test('기존 보드(sea·rich·quest·mine·cook·sled)를 그대로 유지한다', () => {
  for (const b of ['sea', 'rich', 'quest', 'mine', 'cook', 'sled']) assert.match(sql, new RegExp(`p_board = '${b}'`), b);
  assert.match(sql, /course_v = 2 and phys_v in \(1, 2, 3, 4, 5\)/);
});
