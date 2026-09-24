import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kstDate } from '../js/kst-date.js';

test('kstDate — UTC 15:00 이후는 KST 다음 날(새벽 기록이 어제로 새던 사고)', () => {
  assert.equal(kstDate(Date.UTC(2026, 8, 24, 15, 34)), '2026-09-25');   // KST 09-25 00:34
  assert.equal(kstDate(Date.UTC(2026, 8, 24, 14, 59)), '2026-09-24');   // KST 09-24 23:59
  assert.equal(kstDate(Date.UTC(2026, 11, 31, 15, 0)), '2027-01-01');   // 해 넘김
});

test('sea_records·boat_runs 의 run_date 는 kstDate() 로 보낸다(UTC toISOString 금지)', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../js/supabase-client.js', import.meta.url), 'utf8');
  assert.ok(!/run_date:\s*new Date\(\)\.toISOString/.test(src), 'run_date 가 아직 UTC 날짜다');
  assert.equal((src.match(/run_date:\s*kstDate\(\)/g) || []).length, 2);
});
