import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('../sql/migrations/migrate_sled_runs.sql', import.meta.url), 'utf8');
const client = readFileSync(new URL('../js/supabase-client.js', import.meta.url), 'utf8');
const config = readFileSync(new URL('../js/config.js', import.meta.url), 'utf8');

test('table has every column sled-run.js sends', () => {
  for (const col of ['run_id', 'outcome', 'abandon_stage', 'time_ms', 'flags_passed', 'penalty_ms', 'rewarded', 'coins', 'splits', 'boosts_at', 'hits', 'steer_left_ms', 'steer_right_ms', 'attempt_n', 'days_since_unlock', 'best_before_ms', 'acorns_available', 'acorns_collected', 'climb_ms', 'input', 'orientation', 'fps_avg', 'course_v', 'phys_v', 'ease', 'arm', 'dda', 'probe_v', 'user_id', 'session_id', 'client_id', 'is_guest', 'variant', 'platform', 'run_date']) {
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
