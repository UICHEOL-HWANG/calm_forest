import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PLAZA_SEASONS, WINTER_NEEDS, PLAZA_ITEMS, PLAZA_DAILY_CAP } from '../js/data/plaza.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const sql = read('sql/migrations/migrate_plaza_winter.sql');
const selftest = read('sql/tests/plaza_winter_selftest.sql');
const winter = PLAZA_SEASONS.find(s => s.id === 'winter-2026');

test('겨울 시즌 행: 기간·상한·게스트·1인 목표가 시즌 목록과 같다', () => {
  assert.ok(winter && winter.kind === 'winter' && winter.guests === true);
  const row = `('winter-2026', '${winter.opensKst} 00:00:00+09', '${winter.closesKst} 00:00:00+09', ${PLAZA_DAILY_CAP}, true, true)`;
  assert.ok(sql.includes(row), row);
});

test('1인 목표 재료가 WINTER_NEEDS 와 같고 표시 정보가 있다', () => {
  const rows = [...sql.matchAll(/\('winter-2026', (\d), '([a-z_]+)', (\d+)\)/g)].map(m => ({ stage: Number(m[1]), item: m[2], need: Number(m[3]) }));
  assert.deepEqual(rows, WINTER_NEEDS.map(n => ({ ...n })));
  assert.equal(WINTER_NEEDS.reduce((a, n) => a + n.need, 0), 95);
  for (const n of WINTER_NEEDS) assert.ok(PLAZA_ITEMS[n.item], n.item);
});

test('plaza_give: 게스트 허용은 시즌 칸으로만, 단계는 인자, 로그인 계정 역할에만 실행 권한', () => {
  assert.ok(sql.includes('create or replace function public.plaza_give(p_season text, p_stage int, p_item text, p_qty int)'));
  assert.ok(sql.includes("if not v_s.allow_guests and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then"));
  assert.ok(sql.includes("'village_before', v_before"));
  assert.ok(sql.includes('revoke all on function public.plaza_give(text, int, text, int) from public, anon;'));
  assert.ok(sql.includes('grant execute on function public.plaza_give(text, int, text, int) to authenticated;'));
});

test('plaza_donate 는 1인 목표 시즌을 거절하고, plaza_progress 는 total·per_user 를 준다', () => {
  assert.ok(sql.includes('if not found or v_s.per_user or now() < v_s.starts_at or now() >= v_s.ends_at then'));
  assert.ok(sql.includes("'total', v_total"));
  assert.ok(sql.includes("'per_user', v_s.per_user"));
});

test('셀프테스트는 DO 블록 하나이고 끝에서 스스로 되돌린다', () => {
  assert.equal(selftest.match(/do \$\$/g)?.length, 1);
  assert.ok(selftest.includes("raise exception 'WINTER_SELFTEST_OK'"));
  assert.ok(!/\bcommit\b/i.test(selftest));
});
