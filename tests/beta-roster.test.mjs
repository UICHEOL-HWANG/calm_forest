import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assignRoster, rosterSql } from '../scripts/beta-roster.mjs';

const EMAILS = Array.from({ length: 10 }, (_, i) => `T${i + 1}@Example.com`);
// 결정적 난수 — 테스트가 매번 같은 배정을 내게
function seeded(seed = 7) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

test('10명을 A/B 5:5 로 나눈다', () => {
  const rows = assignRoster(EMAILS, seeded());
  assert.equal(rows.length, 10);
  assert.equal(rows.filter(r => r.grp === 'A').length, 5);
  assert.equal(rows.filter(r => r.grp === 'B').length, 5);
});

test('맵 순서는 A 안에서 sea_first 3 · B 안에서 sea_first 2 (교차 배정)', () => {
  const rows = assignRoster(EMAILS, seeded());
  const seaA = rows.filter(r => r.grp === 'A' && r.map_order === 'sea_first').length;
  const seaB = rows.filter(r => r.grp === 'B' && r.map_order === 'sea_first').length;
  assert.equal(seaA, 3);
  assert.equal(seaB, 2);
  assert.equal(rows.filter(r => r.map_order === 'mist_first').length, 5);
});

test('이메일은 소문자·중복 없음, 같은 시드면 같은 결과', () => {
  const a = assignRoster(EMAILS, seeded(3));
  const b = assignRoster(EMAILS, seeded(3));
  assert.deepEqual(a, b);
  assert.ok(a.every(r => r.email === r.email.toLowerCase()));
  assert.equal(new Set(a.map(r => r.email)).size, 10);
});

test('10명이 아니면 던진다', () => {
  assert.throws(() => assignRoster(EMAILS.slice(0, 9)), /10/);
});

test('SQL 은 insert 한 문장 + on conflict 갱신', () => {
  const sql = rosterSql(assignRoster(EMAILS, seeded()));
  assert.match(sql, /insert into public\.beta_testers \(email, grp, map_order, note\)/);
  assert.match(sql, /on conflict \(email\) do update/);
  assert.equal((sql.match(/\('t\d+@example\.com'/g) || []).length, 10);
});
