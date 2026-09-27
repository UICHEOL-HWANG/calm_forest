import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PLAZA_SEASON, PLAZA_OPENS_KST, PLAZA_DAILY_CAP, PLAZA_TIERS, PLAZA_ITEMS } from '../js/data/plaza.js';

const sql = readFileSync(new URL('../sql/migrations/migrate_plaza.sql', import.meta.url), 'utf8');

test('시즌 시작일·상한이 SQL 시드와 같다', () => {
  const m = sql.match(new RegExp(`\\('${PLAZA_SEASON}', '(\\d{4}-\\d{2}-\\d{2}) 00:00:00\\+09', '[^']+', (\\d+)\\)`));
  assert.ok(m, 'SQL 에서 시즌 시드를 못 찾았다');
  assert.equal(m[1], PLAZA_OPENS_KST);
  assert.equal(Number(m[2]), PLAZA_DAILY_CAP);
});

test('등급 임계값이 SQL _plaza_tier 와 같다', () => {
  for (const t of PLAZA_TIERS) {
    assert.ok(sql.includes(`when p_total >= ${t.min} then '${t.id}'`), `SQL 에 ${t.id}≥${t.min} 이 없다`);
  }
});

test('SQL 시드 품목은 전부 표시 정보가 있다', () => {
  const items = [...sql.matchAll(new RegExp(`\\('${PLAZA_SEASON}', \\d, '([a-z_]+)', \\d+\\)`, 'g'))].map(m => m[1]);
  assert.ok(items.length >= 8);
  for (const k of items) assert.ok(PLAZA_ITEMS[k], `js/data/plaza.js PLAZA_ITEMS 에 ${k} 가 없다`);
});
