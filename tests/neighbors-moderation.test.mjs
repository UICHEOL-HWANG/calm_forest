// 🛡️ 이웃 마을 UGC 자율 관리 — SQL(표시 필터·관리자 숨김)과 JS 금칙어의 일치 + 관리자 화면 배선
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NICK_BLOCK_PATTERNS, isNicknameBlocked } from '../js/nickname-filter.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const MAIN = read('sql/migrations/migrate_neighbors.sql');
const MOD = read('sql/migrations/migrate_neighbors_moderation.sql');
const SELF = read('sql/tests/neighbors_selftest.sql');
const ADMIN = read('dashboards/notices_admin.html');
const fnBlocks = (src) => [...src.matchAll(/create or replace function public\.([a-z_]+)\([\s\S]*?\n(?:\$\$;|end \$\$;)\n/g)]
  .map(m => ({ name: m[1], text: m[0] }));
const fn = (src, name) => fnBlocks(src).find(b => b.name === name)?.text || '';

// 서버 정규화를 흉내 — lower → 한글·영문 외 제거 → 반복 접기 → ~* 패턴
const SQL_RE = MOD.match(/~\* '([^']+)';/)[1];
// translate(normalize(…, NFKC), '조합용 자모', '호환 자모') — js/nickname-filter.js JAMO 표와 같아야 한다
const range = (from, n) => [...Array(n)].map((_, i) => String.fromCharCode(from + i)).join('');
const JAMO_FROM = range(0x1100, 19) + range(0x1161, 21);
const JAMO_TO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ' + range(0x314F, 21);
const sqlBlocked = (s) => new RegExp(SQL_RE, 'i').test(
  [...[...String(s)].slice(0, 64).join('').normalize('NFKC')].map((c) => { const i = JAMO_FROM.indexOf(c); return i < 0 ? c : JAMO_TO[i]; }).join('')
    .toLowerCase().replace(/[^a-z가-힣ㄱ-ㆎ]/g, '').replace(/(.)\1+/g, '$1'));

test('서버 금칙어 패턴 = js/nickname-filter.js NICK_BLOCK_PATTERNS (두 SQL 파일 모두)', () => {
  assert.equal(SQL_RE, NICK_BLOCK_PATTERNS.join('|'));
  assert.ok(MAIN.includes(`~* '${NICK_BLOCK_PATTERNS.join('|')}';`));
  assert.ok(MOD.includes(`'[^a-z가-힣ㄱ-ㆎ]', '', 'g'), '(.)\\1+', '\\1', 'g')`));
  assert.ok(MOD.includes(`lower(translate(normalize(left(coalesce(p_nick, ''), 64), NFKC),\n           '${JAMO_FROM}',\n           '${JAMO_TO}'))`));
});

test('서버 정규화로도 대표 금칙어·우회 표기는 걸리고 평범한 닉네임은 통과', () => {
  for (const s of ['시발', '시 발', '씨.발', 'ㅅㅂ', 'ｆｕｃｋ', '\uFFB5\uFFB2', '병1신', '개새끼', 'f.u.c.k', 'fuuuck', 'SHIT', '섹스', 'nigger', '씨.발 selftest-bad'])
    assert.equal(sqlBlocked(s), true, s);
  for (const s of ['조용한 곰 #1234', 'Woodland Bear #4821', '시바견', 'Shiitake Bear', '보지마', 'selftest-a', 'selftest-f',
    'selftest-hid', 'selftest-nh', '이름 없는 여행자'])
    assert.equal(sqlBlocked(s), false, s);
  // 클라에서 통과한 평범한 이름이 서버에서 가려지지 않는다
  for (const s of ['조용한 곰 #1234', 'Shiitake Bear', '시바견']) assert.equal(isNicknameBlocked(s), sqlBlocked(s));
  assert.equal(sqlBlocked('a'.repeat(100) + 'fuck'), false);   // 앞 64자만(정규식 비용 상한)
  assert.equal(isNicknameBlocked('a'.repeat(100) + 'fuck'), false);
});

test('이 파일의 함수 본문은 migrate_neighbors.sql(최종 상태)과 글자 그대로 같다', () => {
  const blocks = fnBlocks(MOD);
  assert.deepEqual(blocks.map(b => b.name).sort(), ['_nb_candidates', '_nb_nick', '_nb_nick_blocked', 'admin_village_find',
    'admin_village_moderate', 'my_visitors', 'neighbor_react', 'neighbor_showcase', 'neighbors_today']);
  for (const b of blocks) assert.equal(fn(MAIN, b.name), b.text, b.name);
  for (const src of [MAIN, MOD]) {
    assert.match(src, /add column if not exists hidden_by_admin boolean not null default false,\n\s*add column if not exists nick_hidden boolean not null default false;/);
  }
});

test('닉네임은 세 RPC 모두 _nb_nick 하나로만 — 인라인 닉네임 식이 남지 않는다', () => {
  assert.doesNotMatch(MAIN, /state->>'nickname', ''\), '이름 없는 여행자'\)/);
  assert.match(fn(MAIN, 'neighbors_today'), /'nick', _nb_nick\(gs\.state, c\.uid\),/);
  assert.match(fn(MAIN, 'neighbor_showcase'), /'nickname',\s+to_jsonb\(_nb_nick\(s, v_user\)\),/);
  assert.match(fn(MAIN, 'my_visitors'), /'nick', _nb_nick\(gs\.state, x\.visitor\),/);
  const nick = fn(MAIN, '_nb_nick');
  assert.match(nick, /vp\.nick_hidden\) then '이름 없는 여행자'/);
  assert.match(nick, /_nb_nick_blocked\(left\(n\.v, 16\)\) then '이름 없는 여행자'/);
  assert.match(nick, /else left\(n\.v, 16\)/);
});

test('관리자 숨김은 후보·구경·반응에서 빠진다 · 정규식은 잘린 입력에만', () => {
  assert.match(fn(MAIN, '_nb_candidates'), /and not coalesce\(vp\.hidden_by_admin, false\)/);
  assert.match(fn(MAIN, 'neighbor_react'), /if not v_pub or v_hid then return jsonb_build_object\('ok', false, 'reason', 'private'\); end if;/);
  assert.match(fn(MAIN, '_nb_nick'), /_nb_nick_blocked\(left\(n\.v, 16\)\)/);
  assert.match(fn(MAIN, 'admin_village_find'), /_nb_nick_blocked\(left\(gs\.state->>'nickname', 40\)\)/);
  assert.match(fn(MAIN, 'neighbor_showcase'), /if not found or not v_pub or v_hid then return null; end if;/);
});

test('관리자 RPC: cf_is_admin 가드가 맨 앞 · authenticated 만 실행 · user_id/email 을 내보내지 않는다', () => {
  for (const name of ['admin_village_find', 'admin_village_moderate']) {
    const body = fn(MAIN, name).split('\nbegin\n')[1];
    assert.match(body, /^\s*if not coalesce\(public\.cf_is_admin\(\), false\) then return jsonb_build_object\('ok', false, 'reason', 'forbidden'\); end if;/, name);
  }
  for (const src of [MAIN, MOD]) {
    assert.match(src, /revoke all on function public\.admin_village_find\(text\) from public, anon;/);
    assert.match(src, /revoke all on function public\.admin_village_moderate\(uuid, boolean, boolean\) from public, anon;/);
    assert.match(src, /grant execute on function public\.admin_village_find\(text\) to authenticated;/);
    assert.match(src, /grant execute on function public\.admin_village_moderate\(uuid, boolean, boolean\) to authenticated;/);
    assert.match(src, /revoke all on function public\._nb_nick\(jsonb, uuid\) from public, anon, authenticated;/);
    assert.match(src, /revoke all on function public\._nb_nick_blocked\(text\) from public, anon, authenticated;/);
  }
  const keys = [...fn(MAIN, 'admin_village_find').matchAll(/'([a-z_]+)', /g)].map(m => m[1]);
  assert.ok(!keys.includes('user_id') && !keys.includes('email'), keys.join());
});

test('자가 테스트: DO 블록 하나 · 모더레이션 구간이 정리보다 앞', () => {
  assert.equal(SELF.match(/^do \$\$/gm).length, 1);
  const at = SELF.indexOf('⑥ 🛡️ 모더레이션'), clean = SELF.indexOf('-- ── 정리:');
  assert.ok(at > 0 && at < clean);
  for (const s of ["'nb-selftest-a@example.invalid'", 'ids := ids || array[bad, hid, nh];', 'ids := ids || simcaller;',
    "'forbidden'", 'insufficient_privilege', "admin_village_find('selftest_hid')", 'moderation checks pass'])
    assert.ok(SELF.includes(s), s);
  assert.match(SELF.slice(clean), /delete from public\.village_profiles where updated_at >= now\(\);/);
});

test('관리자 화면: 🏡 이웃 마을 관리 — 피드백 뒤 · RPC 2종 · 닉네임은 textContent 로만', () => {
  const sec = ADMIN.indexOf('🏡 이웃 마을 관리');
  assert.ok(sec > ADMIN.indexOf('받은 피드백'), '피드백 구간 뒤에 둔다');
  assert.match(ADMIN, /sb\.rpc\('admin_village_find', \{ p_nick: /);
  assert.match(ADMIN, /sb\.rpc\('admin_village_moderate', \{ p_public_id: /);
  const at = ADMIN.indexOf('// ── 🏡 이웃 마을 관리');
  assert.ok(at > 0);
  const js = ADMIN.slice(at, ADMIN.indexOf('</script>', at));
  assert.doesNotMatch(js, /innerHTML\s*=(?!\s*'')/, 'UGC 닉네임 — innerHTML 금지');
  for (const s of ['이웃 목록에서 숨기기', '이웃 목록에 보이기', '닉네임 가리기', '닉네임 보이기']) assert.ok(ADMIN.includes(s), s);
});
