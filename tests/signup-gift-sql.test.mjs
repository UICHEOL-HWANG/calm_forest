import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { REWARD_DECOR } from '../js/data/reward-decor.js';

const SQL = readFileSync(new URL('../sql/migrations/migrate_signup_gift.sql', import.meta.url), 'utf8');
const ids = (s) => [...s.matchAll(/'([a-z_]+)'/g)].map(m => m[1]);

test('장식 가드 목록에 보상 장식 전부가 들어 있다', () => {
  const decor = SQL.match(/_reward_decor_ids\(\)[\s\S]*?array\[([\s\S]*?)\]::text\[\]/)[1];
  assert.deepEqual(ids(decor), REWARD_DECOR.map(d => d.id));
});

test('선물 후보는 reward signup 3종과 같다', () => {
  const pool = SQL.match(/_signup_gift_pool\(\)[\s\S]*?array\[([\s\S]*?)\]::text\[\]/)[1];
  assert.deepEqual(ids(pool), REWARD_DECOR.filter(d => d.reward === 'signup').map(d => d.id));
  assert.equal(ids(pool).length, 3);
});

test('원장 출처에 signup 을 더하고 기존 값은 유지한다', () => {
  assert.match(SQL, /purchases_source_check check \(source in \('paddle', 'referral', 'signup'\)\)/);
  assert.doesNotMatch(SQL, /purchases_kind_check/);
});

test('시작 시각은 마이그레이션을 적용한 순간으로 한 번만 정한다', () => {
  assert.match(SQL, /create table if not exists public\.signup_gift_config/);
  assert.match(SQL, /on conflict do nothing/);
  assert.match(SQL, /alter table public\.signup_gift_config enable row level security/);
});

test('claim 은 익명·출시 전 계정을 거절하고 계정당 한 번만 기록한다', () => {
  const fn = SQL.match(/create or replace function public\.signup_gift_claim[\s\S]*?end \$\$;/)[0];
  assert.match(fn, /security definer/);
  assert.match(fn, /is_anonymous/);
  assert.match(fn, /'anonymous'/);
  assert.match(fn, /'too_early'/);
  assert.match(fn, /'signup_gift:' \|\| p_user/);
  assert.match(fn, /on conflict \(event_id\) do nothing/);
  assert.match(fn, /random\(\)/);
  assert.match(fn, /'signup'\)/);
});

test('claim 은 service_role 만 부를 수 있다', () => {
  assert.match(SQL, /revoke all on function public\.signup_gift_claim\(uuid\)\s+from public, anon, authenticated;/);
  assert.match(SQL, /grant execute on function public\.signup_gift_claim\(uuid\)\s+to service_role;/);
  assert.match(SQL, /revoke all on function public\._signup_gift_pool\(\)\s+from public, anon, authenticated;/);
});
