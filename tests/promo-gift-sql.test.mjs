import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { REWARD_DECOR } from '../js/data/reward-decor.js';

const SQL = readFileSync(new URL('../sql/migrations/migrate_promo_gift.sql', import.meta.url), 'utf8');
const ids = (s) => [...s.matchAll(/'([a-z_]+)'/g)].map(m => m[1]);
const fn = (name) => SQL.match(new RegExp(`create or replace function public\\.${name}[\\s\\S]*?end \\$\\$;`))[0];

test('가드 목록은 보상 장식 전부, 선물 목록은 promo 두 개', () => {
  const guard = SQL.match(/_reward_decor_ids\(\)[\s\S]*?array\[([\s\S]*?)\]::text\[\]/)[1];
  assert.deepEqual(ids(guard), REWARD_DECOR.map(d => d.id));
  const promo = SQL.match(/_promo_decor_ids\(\)[\s\S]*?array\[([\s\S]*?)\]::text\[\]/)[1];
  assert.deepEqual(ids(promo), ['promoballoon', 'promosuitcase']);
  assert.deepEqual(REWARD_DECOR.filter(d => d.reward === 'promo').map(d => d.id), ['promoballoon', 'promosuitcase']);
});

test('원장 출처에 promo 를 더하고 기존 값을 유지한다', () => {
  assert.match(SQL, /purchases_source_check check \(source in \('paddle', 'referral', 'signup', 'promo'\)\)/);
});

test('두 표는 RLS 를 켜고 일반 역할 접근을 막는다', () => {
  for (const t of ['promo_codes', 'promo_redemptions']) {
    assert.match(SQL, new RegExp(`create table if not exists public\\.${t}`));
    assert.match(SQL, new RegExp(`alter table public\\.${t} enable row level security`));
    assert.match(SQL, new RegExp(`revoke all on public\\.${t} from anon, authenticated`));
  }
  assert.ok(SQL.includes("check (code ~ '^[A-Z0-9]{4,16}$')"));
  assert.match(SQL, /primary key \(user_id, stage\)/);
});

test('check 는 단계별로 기간·한도를 다르게 본다', () => {
  const f = fn('promo_code_check');
  for (const r of ['unknown', 'inactive', 'not_started', 'expired', 'full']) assert.match(f, new RegExp(`'${r}'`));
  assert.match(f, /interval '7 days'/);
  assert.match(f, /stage = 1/);
});

test('claim 은 익명 2단계를 막고 단계당 한 번만 기록하고 promo 원장을 남긴다', () => {
  const f = fn('promo_gift_claim');
  assert.match(f, /security definer/);
  assert.match(f, /'anonymous'/);
  assert.match(f, /'bad_stage'/);
  assert.match(f, /on conflict \(user_id, stage\) do nothing/);
  assert.ok(f.includes("'promo_gift:' || p_user || ':' || v_id"));
  assert.match(f, /on conflict \(event_id\) do nothing/);
  assert.match(f, /'promo'\)/);
});

test('RPC 는 service_role 만 실행한다', () => {
  for (const name of ['promo_code_check(text, int)', 'promo_gift_claim(uuid, text, int)', '_promo_decor_ids()']) {
    assert.ok(SQL.includes(`revoke all on function public.${name}`), name);
  }
  assert.doesNotMatch(SQL, /grant execute on function public\.\w+\([^)]*\)\s+to (anon|authenticated)/);
  assert.match(SQL, /grant execute on function public\.promo_gift_claim\(uuid, text, int\)\s+to service_role;/);
  assert.match(SQL, /grant execute on function public\.promo_code_check\(text, int\)\s+to service_role;/);
});
