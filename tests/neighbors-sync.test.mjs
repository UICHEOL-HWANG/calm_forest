import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { REWARD_CAP, NOTICE_MAX, EMOJI_IDS, houseSolidR } from '../js/neighbors/rules.js';
import { YARD_R, DECOR_MAX, ROOM_MAX, ROOM_MAX_XY } from '../js/neighbors/sanitize.js';
import { MAX_POND_STAGE } from '../js/pond/stage.js';
import { RIM_IDS } from '../js/pond/rim.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SQL = read('sql/migrations/migrate_neighbors.sql');

test('보상 상한 — SQL 과 JS 가 같은 값', () => {
  assert.match(SQL, new RegExp(`v_rew := v_cnt < ${REWARD_CAP};`));
});

test('앞마당 반경·장식 상한·집 터 좌표 — SQL·sanitize·places.js 가 같다', () => {
  assert.match(SQL, new RegExp(`\\(\\((?:e\\.)?o->>'x'\\)::float8 \\+ 8\\) \\^ 2 \\+ \\(\\((?:e\\.)?o->>'z'\\)::float8 \\+ 8\\) \\^ 2 <= ${YARD_R} \\* ${YARD_R}`));
  assert.match(SQL, new RegExp(`limit ${DECOR_MAX}\\n`));
  assert.match(read('js/data/places.js'), /export const HOUSE_POS = new THREE\.Vector3\(-8, 0, -8\)/);
});

test('알림 10건 · 반응 4종', () => {
  assert.match(SQL, new RegExp(`order by dd\\.created_at desc limit ${NOTICE_MAX}`));
  assert.ok(SQL.includes(`check (emoji in (${EMOJI_IDS.map(e => `'${e}'`).join(',')}))`));
});

test('집 충돌 반경 표가 js/spaces/house.js houseSolidR 와 같다', () => {
  assert.ok(read('js/spaces/house.js').includes('return s >= 7 ? 3.9 : s >= 6 ? 2.7 : s >= 5 ? 2.55 : s >= 4 ? 2.4 : 2.2;'));
  assert.deepEqual([3, 4, 5, 6, 7].map(houseSolidR), [2.2, 2.4, 2.55, 2.7, 3.9]);
});

test('🧑‍🤝‍🧑 페르소나 분리 — 후보 함수가 PERSONA_DOMAIN 으로 나누고, 분리 마이그레이션과 본 파일이 같다', () => {
  const dom = read('tools/persona-sim/supabase-admin.mjs').match(/PERSONA_DOMAIN = '([^']+)'/)[1];
  const fn = (s) => s.match(/create or replace function public\._nb_candidates[\s\S]*?\n\$\$;/)[0];
  const main = fn(SQL), split = read('sql/migrations/migrate_neighbors_sim_split.sql');
  const clause = `(lower(coalesce(u.email, '')) like '%@${dom}') = exists (select 1 from auth.users c where c.id = p_caller and lower(coalesce(c.email, '')) like '%@${dom}')`;
  assert.ok(main.includes(clause));
  // 분리 마이그레이션은 그 시점 스냅숏 — 이후 🛡️ 모더레이션이 hidden_by_admin 한 줄만 더했다(최신본은 moderation 파일과 같다)
  assert.equal(fn(split), main.replace("    and not coalesce(vp.hidden_by_admin, false)\n", ''));
  assert.equal(fn(read('sql/migrations/migrate_neighbors_moderation.sql')), main);
  assert.match(split, /revoke all on function public\._nb_candidates\(uuid, date, int\) from public, anon, authenticated;/);
  const selftest = read('sql/tests/neighbors_selftest.sql');
  assert.equal(selftest.match(/^do \$\$/gm).length, 1);
  assert.ok(selftest.includes(`'nb-selftest-sim@${dom}'`) && selftest.includes('ids := ids || j;'));
});

test('🏠 실내 상한 — SQL _nb_room 과 sanitize 가 같다 · 운영 파일이 최종본과 같다', () => {
  const room = (s) => s.match(/create or replace function public\._nb_room[\s\S]*?\n\$\$;/)[0];
  const show = (s) => s.match(/create or replace function public\.neighbor_showcase[\s\S]*?\nend \$\$;/)[0];
  const ROOM_SQL = read('sql/migrations/migrate_neighbors_room.sql');
  assert.equal(room(ROOM_SQL), room(SQL));
  assert.equal(show(ROOM_SQL), show(SQL).replace(",\n    'pond',       _nb_pond(s),\n    'table',      _nb_table(s)", ''));
  assert.match(room(SQL), new RegExp(`abs\\(\\(e\\.o->>'x'\\)::numeric\\) <= ${ROOM_MAX_XY}`));
  assert.match(room(SQL), new RegExp(`abs\\(\\(e\\.o->>'z'\\)::numeric\\) <= ${ROOM_MAX_XY}`));
  assert.match(room(SQL), new RegExp(`limit ${ROOM_MAX}\\n`));
  assert.match(show(SQL), /'outdoor',\s+_nb_yard\(s\),\n\s+'room',\s+_nb_room\(s\),/);
  assert.match(ROOM_SQL, /⚠️ 적용 순서/);
});

test('🐟 연못 — _nb_pond·neighbor_showcase 가 최종본과 같고 id 목록이 게임과 같다', () => {
  const pond = (s) => s.match(/create or replace function public\._nb_pond[\s\S]*?\n\$\$;/)[0];
  const show = (s) => s.match(/create or replace function public\.neighbor_showcase[\s\S]*?\nend \$\$;/)[0];
  const POND_SQL = read('sql/migrations/migrate_neighbor_pond.sql');
  const STAGE_SQL = read('sql/migrations/migrate_neighbor_pond_stage.sql');
  assert.equal(pond(STAGE_SQL), pond(SQL));
  const seaOrder = "order by w desc, array_position(array['aji','buri','mola','tuna'], sp)";
  assert.ok(pond(SQL).includes(`'sea', (select jsonb_build_object('sp', sp, 'w', w) from sea ${seaOrder} limit 1),`));
  assert.ok(pond(SQL).includes(`'seas', coalesce((select jsonb_agg(jsonb_build_object('sp', sp, 'w', w) ${seaOrder}) from sea), '[]'::jsonb),`));
  assert.equal(pond(POND_SQL), pond(SQL).replace(` ${seaOrder} limit 1),`, '),').replace(/\n    'seas', [^\n]*/, '').replace(/\n    'rim', [^\n]*/, '').replace(/,\n    'stage', [^\n]*(?=\);\n)/, '').replace('    limit 4\n', '    limit 1\n'));
  assert.equal((pond(SQL).match(/::numeric/g) || []).length, 3);
  assert.equal((pond(SQL).match(/::int/g) || []).length, 1);
  assert.ok(pond(SQL).includes(`'stage', case when p_state #>> '{hintsSeen,pondStage}' ~ '^[0-9]{1,9}$' then least(${MAX_POND_STAGE}, greatest(1, (p_state #>> '{hintsSeen,pondStage}')::int)) else 1 end);`));
  assert.ok(pond(SQL).includes(`'rim', case when p_state->'hintsSeen'->>'pondRim' in (${RIM_IDS.slice(1).map(i => `'${i}'`).join(',')}) then p_state->'hintsSeen'->>'pondRim' else '${RIM_IDS[0]}' end,\n`));
  assert.doesNotMatch(STAGE_SQL, /neighbor_showcase/);
  assert.equal(show(POND_SQL), show(SQL).replace(",\n    'table',      _nb_table(s)", ''));
  assert.match(show(SQL), /'coop',[^\n]*,\n\s+'pond',\s+_nb_pond\(s\),\n\s+'table',\s+_nb_table\(s\)\n/);
  const river = ['sakura_trout', 'puffer', 'maple_carp', 'ice_smelt', 'rare', 'uncommon', 'common'];
  const sea = ['aji', 'buri', 'mola', 'tuna'];
  const list = (ids) => `array[${ids.map(i => `'${i}'`).join(',')}]`;
  const inList = (ids) => `in (${ids.map(i => `'${i}'`).join(',')})`;
  assert.ok(pond(SQL).includes(`k.key ${inList(river)}`));
  assert.ok(pond(SQL).includes(`array_position(${list(river)}, k.key)`));
  assert.ok(pond(SQL).includes(`k.key ${inList(sea)}`));
  assert.ok(pond(SQL).includes(`array_position(${list(sea)}, k.key)`));
  const rev = 'revoke all on function public._nb_pond(jsonb) from public, anon, authenticated;';
  assert.ok(SQL.includes(rev) && POND_SQL.includes(rev) && STAGE_SQL.includes(rev));
  assert.ok(pond(SQL).includes('set search_path = public'));
});

test('🍽️ 식탁 — _nb_table·neighbor_showcase 가 최종본과 같고 레시피·등급이 게임과 같다', () => {
  const table = (s) => s.match(/create or replace function public\._nb_table[\s\S]*?\n\$\$;/)[0];
  const show = (s) => s.match(/create or replace function public\.neighbor_showcase[\s\S]*?\nend \$\$;/)[0];
  const keys = (s) => [...show(s).matchAll(/^    '([a-zA-Z]+)',\s/gm)].map(m => m[1]);
  const TABLE_SQL = read('sql/migrations/migrate_neighbor_table.sql');
  assert.equal(table(TABLE_SQL), table(SQL));
  assert.equal(show(TABLE_SQL), show(SQL));
  const before = keys(read('sql/migrations/migrate_neighbor_pond.sql'));
  assert.deepEqual(keys(SQL), [...before, 'table']);
  const cat = read('js/data/catalog.js'), at = cat.indexOf('export const RECIPES');
  const ids = [...cat.slice(at, cat.indexOf('];', at)).matchAll(/id: '([a-z_]+)'/g)].map(m => m[1]);
  const quoted = ids.map(i => `'${i}'`).join(',');
  assert.ok(table(SQL).includes(`k.key in (${quoted})`));
  assert.ok(table(SQL).includes(`array_position(array[${quoted}], id)`));
  const tiers = [...read('js/spaces/cooking.js').matchAll(/\{ id: '([a-z]+)',\s+min: (\d+),/g)].map(m => [m[1], +m[2]]);
  const cuts = tiers.filter(([, min]) => min > 0).map(([id, min]) => `when s >= ${min} then '${id}'`).join(' ');
  assert.ok(table(SQL).includes(`case ${cuts} else '${tiers.at(-1)[0]}' end`));
  assert.ok(table(SQL).includes("p_state #> '{kitchen,best}') = 'object'"));
  assert.ok(table(SQL).includes('immutable set search_path = public'));
  const rev = 'revoke all on function public._nb_table(jsonb) from public, anon, authenticated;';
  assert.ok(SQL.includes(rev) && TABLE_SQL.includes(rev));
  assert.match(TABLE_SQL, /migrate_neighbor_pond\.sql/);
});
