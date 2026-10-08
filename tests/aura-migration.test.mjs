import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('../sql/migrations/migrate_aura_orders.sql', import.meta.url), 'utf8');

test('aura_orders 는 하루 1회 유일키·상태 CHECK·jsonb 크기 CHECK·RLS 본인 읽기만 가진다', () => {
  assert.match(sql, /create table if not exists public\.aura_orders/);
  assert.match(sql, /unique \(user_id, order_date\)/);
  assert.match(sql, /status in \('pending', 'submitted', 'done', 'fallback', 'claimed'\)/);
  assert.match(sql, /octet_length\(cards::text\) <= 4096/);
  assert.match(sql, /octet_length\(recipe::text\) <= 4096/);
  assert.match(sql, /char_length\(text\) between 1 and 60/);
  assert.match(sql, /references auth\.users\(id\) on delete cascade/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /for select to authenticated using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.doesNotMatch(sql, /for (insert|update|delete) to authenticated/, '쓰기는 Worker 서비스 키만');
  assert.match(sql, /alter table public\.ai_pregen_runs add column if not exists kind text/);
});
