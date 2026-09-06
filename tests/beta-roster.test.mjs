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

test('4명 미만이면 던진다 (맵 순서를 엇갈리게 할 수 없다)', () => {
  assert.throws(() => assignRoster(EMAILS.slice(0, 3)), /4/);
});

test('인원이 10명이 아니어도 최대한 고르게 나눈다 — 7명: A4/B3, sea_first A2/B1', () => {
  const rows = assignRoster(EMAILS.slice(0, 7), seeded());
  assert.equal(rows.filter(r => r.grp === 'A').length, 4);
  assert.equal(rows.filter(r => r.grp === 'B').length, 3);
  assert.equal(rows.filter(r => r.grp === 'A' && r.map_order === 'sea_first').length, 2);
  assert.equal(rows.filter(r => r.grp === 'B' && r.map_order === 'sea_first').length, 1);
});

test('12명: A6/B6, sea_first A3/B3 — 짝수면 번들 안에서도 반반', () => {
  const rows = assignRoster([...EMAILS, 'k@x.com', 'l@x.com'], seeded());
  assert.equal(rows.filter(r => r.grp === 'A').length, 6);
  assert.equal(rows.filter(r => r.grp === 'A' && r.map_order === 'sea_first').length, 3);
  assert.equal(rows.filter(r => r.grp === 'B' && r.map_order === 'sea_first').length, 3);
});

test('SQL 은 insert 한 문장 + on conflict 갱신', () => {
  const sql = rosterSql(assignRoster(EMAILS, seeded()));
  assert.match(sql, /insert into public\.beta_testers \(email, grp, map_order, note\)/);
  assert.match(sql, /on conflict \(email\) do update/);
  assert.equal((sql.match(/\('t\d+@example\.com'/g) || []).length, 10);
});
