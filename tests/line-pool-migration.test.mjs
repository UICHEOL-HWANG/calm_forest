import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('../sql/migrations/migrate_line_pool.sql', import.meta.url), 'utf8');

test('세 테이블 모두 RLS 를 켜고 정책을 열지 않는다', () => {
  for (const t of ['line_pool', 'line_picks', 'line_pool_runs']) {
    assert.match(sql, new RegExp(`alter table public\\.${t}\\s+enable row level security`));
  }
  assert.doesNotMatch(sql, /create policy/i);
});

test('RPC 는 service_role 에만 연다', () => {
  for (const f of ['line_pick_many', 'line_pool_counts']) {
    assert.match(sql, new RegExp(`revoke all on function public\\.${f}\\([^)]*\\) from public, anon, authenticated`));
    assert.match(sql, new RegExp(`grant execute on function public\\.${f}\\([^)]*\\) to service_role`));
  }
  assert.doesNotMatch(sql, /to anon/);
});

test('같은 칸 같은 문장은 한 번만, 뽑기는 hidden 을 빼고 md5 시드로', () => {
  assert.match(sql, /unique index if not exists line_pool_uniq on public\.line_pool \(kind, key, slot, lang, text\)/);
  assert.match(sql, /md5\(p_seed \|\| '\/' \|\| p\.key \|\| '\/' \|\| p\.id::text\)/);
  assert.match(sql, /not p\.hidden/);
});
