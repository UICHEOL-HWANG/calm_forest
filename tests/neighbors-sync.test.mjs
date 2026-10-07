import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { REWARD_CAP, NOTICE_MAX, EMOJI_IDS, houseSolidR } from '../js/neighbors/rules.js';
import { YARD_R, DECOR_MAX } from '../js/neighbors/sanitize.js';

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
