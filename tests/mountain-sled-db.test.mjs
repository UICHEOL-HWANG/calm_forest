import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('../sql/migrations/migrate_sled_runs.sql', import.meta.url), 'utf8');
const client = readFileSync(new URL('../js/supabase-client.js', import.meta.url), 'utf8');
const config = readFileSync(new URL('../js/config.js', import.meta.url), 'utf8');

test('table has every column sled-run.js sends', () => {
  for (const col of ['run_id', 'outcome', 'abandon_stage', 'time_ms', 'flags_passed', 'penalty_ms', 'rewarded', 'coins', 'splits', 'boosts_at', 'hits', 'steer_left_ms', 'steer_right_ms', 'attempt_n', 'days_since_unlock', 'best_before_ms', 'acorns_available', 'acorns_collected', 'climb_ms', 'idle_ms', 'input', 'orientation', 'fps_avg', 'course_v', 'phys_v', 'ease', 'arm', 'dda', 'probe_v', 'user_id', 'session_id', 'client_id', 'is_guest', 'variant', 'platform', 'run_date']) {
    assert.match(sql, new RegExp(`\\b${col}\\b`), col);
  }
});

test('RLS uses the select auth.uid() rule for select and insert', () => {
  assert.match(sql, /enable row level security/);
  assert.match(sql, /for select to authenticated using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(sql, /for insert to authenticated with check \(\(select auth\.uid\(\)\) = user_id\)/);
});

test('json size cap, minimum-time trigger and platform check exist', () => {
  assert.match(sql, /sled_runs_json_size/);
  assert.match(sql, /sled_runs_min_time/);
  assert.match(sql, /platform in \('web', 'toss', 'itch', 'android', 'ios'\)/);
});

test('client sends through SLED_TABLE and skips dev sessions', () => {
  assert.match(config, /SLED_TABLE:\s*'sled_runs'/);
  assert.match(client, /export async function sendSledRun\(row\)\s*\{\s*if \(IS_DEV_SESSION\) return;/);
  assert.match(client, /from\(CONFIG\.SLED_TABLE\)\.insert/);
});

test('min-time trigger looks up the floor by version and rejects unknown versions', () => {
  assert.doesNotMatch(sql, /course_v = 1 and/);
  assert.match(sql, /case new\.course_v when 1 then 13750 else null end/);
  assert.match(sql, /floor_ms is null or new\.time_ms is null or new\.time_ms < floor_ms/);
});

test('version checks, octet_length cap, nonneg check and server-set run_date', () => {
  assert.match(sql, /sled_runs_course_v check \(course_v = 1\)/);
  assert.match(sql, /sled_runs_phys_v check \(phys_v = 1\)/);
  assert.match(sql, /octet_length\(splits::text\)/);
  assert.doesNotMatch(sql, /pg_column_size/);
  assert.match(sql, /sled_runs_nonneg/);
  assert.match(sql, /new\.run_date := \(now\(\) at time zone 'Asia\/Seoul'\)::date/);
});

test('min-time trigger function pins search_path', () => {
  assert.match(sql, /create or replace function public\.sled_runs_min_time\(\) returns trigger\nlanguage plpgsql set search_path = public as \$\$/);
});

test('idle_ms is a non-negative integer column', () => {
  assert.match(sql, /add column if not exists idle_ms integer;/);
  assert.match(sql, /drop constraint if exists sled_runs_idle_nonneg;/);
  assert.match(sql, /idle_ms is null or idle_ms >= 0/);
});
