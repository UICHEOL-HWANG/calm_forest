import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STAR_CUTS, DISH_HOSTS_PER_DAY, DISH_TABLE_MAX, DISH_KEEP_DAYS } from '../js/neighbors/dish-rules.js';
import { EMOJI_IDS } from '../js/neighbors/rules.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SQL = read('sql/migrations/migrate_neighbor_dishes.sql');
const fn = (name) => SQL.match(new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\n(?:end )?\\$\\$;`))[0];

test('별 컷이 JS 와 같다', () => {
  assert.ok(fn('_nb_dish_stars').includes(`when p_score >= ${STAR_CUTS[0]} then 3 when p_score >= ${STAR_CUTS[1]} then 2 else 1`));
});

test('상한: 하루 집 수 · 식탁 접시 · 보관 일수', () => {
  const leave = fn('neighbor_dish_leave');
  assert.ok(leave.includes(`if v_cnt >= ${DISH_HOSTS_PER_DAY} then return jsonb_build_object('ok', false, 'reason', 'limit')`));
  assert.ok(leave.includes(`if v_cnt >= ${DISH_TABLE_MAX} then return jsonb_build_object('ok', false, 'reason', 'full')`));
  for (const name of ['neighbor_dish_leave', 'my_table_dishes', 'neighbor_dish_eat']) assert.ok(fn(name).includes(`interval '${DISH_KEEP_DAYS} days'`), name);
  assert.ok(fn('my_table_dishes').includes(`limit ${DISH_TABLE_MAX}\n`));
});

test('레시피 허용 목록이 게임 RECIPES 와 같다 · 반응 4종', () => {
  const cat = read('js/data/catalog.js'), at = cat.indexOf('export const RECIPES');
  const ids = [...cat.slice(at, cat.indexOf('];', at)).matchAll(/id: '([a-z_]+)'/g)].map(m => m[1]);
  const quoted = ids.map(i => `'${i}'`).join(',');
  assert.equal(SQL.split(`in (${quoted})`).length - 1, 2);
  const emoji = EMOJI_IDS.map(e => `'${e}'`);
  assert.ok(SQL.includes(`check (emoji in (${emoji.join(',')}))`));
  assert.ok(fn('neighbor_dish_rate').includes(`p_emoji not in (${emoji.join(', ')})`));
});

test('테이블 잠금 · RPC 는 authenticated 만 · 남의 식별자는 public_id 만', () => {
  assert.match(SQL, /alter table public\.village_dishes enable row level security;/);
  assert.match(SQL, /revoke all on table public\.village_dishes from public, anon, authenticated;/);
  for (const sig of ['neighbor_dish_leave(uuid, text, int)', 'my_table_dishes()', 'neighbor_dish_eat(bigint)', 'neighbor_dish_rate(bigint, text)', 'my_visitors(timestamptz)']) {
    assert.ok(SQL.includes(`revoke all on function public.${sig} from public, anon;`), sig);
    assert.ok(SQL.includes(`grant execute on function public.${sig} to authenticated;`), sig);
  }
  for (const name of ['neighbor_dish_leave', 'my_table_dishes', 'neighbor_dish_eat', 'neighbor_dish_rate', 'my_visitors', '_nb_open_id']) {
    assert.ok(fn(name).includes('set search_path = public'), name);
  }
  for (const name of ['neighbor_dish_leave', 'my_table_dishes', 'neighbor_dish_eat', 'neighbor_dish_rate', 'my_visitors']) {
    assert.ok(fn(name).includes("if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then return jsonb_build_object('ok', false, 'reason', 'login');"), name);
  }
  assert.doesNotMatch(SQL, /'(giver|host|user_id|visitor)',\s/);
});

test('올리기: 페르소나 분리 · 관리자 숨김 이용자 거절', () => {
  const dom = read('tools/persona-sim/supabase-admin.mjs').match(/PERSONA_DOMAIN = '([^']+)'/)[1];
  const leave = fn('neighbor_dish_leave');
  assert.equal(leave.split(`like '%@${dom}'`).length - 1, 2);
  assert.ok(leave.includes("where user_id = v_uid and hidden_by_admin"));
});

test('my_visitors 는 운영 본문의 차단·공개 규칙을 유지한다', () => {
  const mv = fn('my_visitors');
  assert.ok(mv.includes('not _nb_blocked(v_uid, u.visitor)'));
  assert.ok(mv.includes("'is_public', v_pub"));
  assert.ok(mv.includes("'public_id', _nb_open_id(x.visitor)"));
  assert.ok(mv.includes('dd.created_at desc limit 10'));
});

test('셀프테스트: DO 블록 하나 안에 접시 검사', () => {
  const self = read('sql/tests/neighbors_selftest.sql');
  assert.equal(self.match(/^do \$\$/gm).length, 1);
  assert.ok(self.indexOf("raise notice 'dish checks pass'") < self.indexOf("raise notice 'NEIGHBORS SELFTEST ALL PASS'"));
  for (const r of ["'dup'", "'limit'", "'full'", "'private'", "'self'", "'recipe'", "'gone'", "'emoji'"]) assert.ok(self.includes(`<> ${r}`), r);
  assert.ok(self.includes("->>'reason' <> 'login'"));
});
