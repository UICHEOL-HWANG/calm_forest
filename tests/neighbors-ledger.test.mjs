// 🏡 이웃 마을 원장 2종 — 방문 원장(village_views) · 🛡️ 모더레이션 감사 로그(moderation_log)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createNeighborApi } from '../js/neighbors/api.js';
import { gameSource } from './helpers/game-source.mjs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const LEDGER = read('sql/migrations/migrate_neighbors_ledger.sql');
const SELF = read('sql/tests/neighbors_selftest.sql');
const ADMIN = read('dashboards/notices_admin.html');
const SRC = gameSource();
const ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const fnBlocks = (src) => [...src.matchAll(/create or replace function public\.([a-z_]+)\([\s\S]*?\n(?:\$\$;|end \$\$;)\n/g)]
  .map(m => ({ name: m[1], text: m[0] }));
const fn = (src, name) => fnBlocks(src).find(b => b.name === name)?.text || '';
const mk = (rpc) => {
  const calls = [];
  const api = createNeighborApi({ rpc: async (f, a) => { calls.push([f, a]); return rpc(f, a); }, fetchFn: async () => new Response('{}') });
  return { api, calls };
};

// ── api.js ──
test('viewStart: 인자 · view_id 를 돌려준다 · 실패는 { ok:false, reason }', async () => {
  const { api, calls } = mk(async () => ({ ok: true, view_id: 42 }));
  assert.deepEqual(await api.viewStart(ID, 2, true), { ok: true, viewId: 42 });
  assert.deepEqual(calls[0], ['neighbor_view_start', { p_public_id: ID, p_slot: 2, p_revisit: true }]);
  await api.viewStart(ID, undefined, 0);
  assert.deepEqual(calls[1], ['neighbor_view_start', { p_public_id: ID, p_slot: null, p_revisit: false }]);
  assert.deepEqual(await mk(async () => ({ ok: false, reason: 'limit' })).api.viewStart(ID, 0, false), { ok: false, reason: 'limit' });
  assert.deepEqual(await mk(async () => ({ ok: true })).api.viewStart(ID, 0, false), { ok: false, reason: 'upstream' });   // view_id 없음
  assert.deepEqual(await mk(async () => null).api.viewStart(ID, 0, false), { ok: false, reason: 'upstream' });
  assert.deepEqual(await mk(async () => { throw new Error('x'); }).api.viewStart(ID, 0, false), { ok: false, reason: 'offline' });
});

test('viewEnd: 인자(sec 반올림·0 아래 자름) · view_id 없으면 부르지 않는다 · 실패는 { ok:false, reason }', async () => {
  const { api, calls } = mk(async () => ({ ok: true }));
  assert.deepEqual(await api.viewEnd(42, 12.6, 1), { ok: true });
  assert.deepEqual(calls[0], ['neighbor_view_end', { p_view_id: 42, p_sec: 13, p_reacted: true }]);
  await api.viewEnd(42, -3, false);
  assert.deepEqual(calls[1], ['neighbor_view_end', { p_view_id: 42, p_sec: 0, p_reacted: false }]);
  assert.deepEqual(await api.viewEnd(null, 5, false), { ok: false, reason: 'no_view' });
  assert.equal(calls.length, 2);
  assert.deepEqual(await mk(async () => ({ ok: false, reason: 'dup' })).api.viewEnd(1, 5, false), { ok: false, reason: 'dup' });
  assert.deepEqual(await mk(async () => { throw new Error('x'); }).api.viewEnd(1, 5, false), { ok: false, reason: 'offline' });
});

test('supabase-client 허용 RPC 에 원장 2종이 있다', () => {
  assert.match(read('js/supabase-client.js'),
    /const NEIGHBOR_RPCS = new Set\(\['neighbors_today', 'neighbor_react', 'my_visitors', 'set_village_public', 'neighbor_view_start', 'neighbor_view_end'\]\);/);
});

// ── spaces/neighbor.js 배선 ──
function bodyOf(name) {
  const i = SRC.indexOf(`function ${name}(`);
  assert.ok(i >= 0, `${name} 함수가 없다`);
  const rest = SRC.slice(i + 1);
  const j = rest.search(/\n(?:async )?function |\nconst [A-Za-z_$]+ = /);
  return SRC.slice(i, i + 1 + (j < 0 ? rest.length : j));
}

test('입장: viewStart 를 기다리지 않고 부른다 · 실패는 evFail(view_start)', () => {
  const enter = bodyOf('enterNeighbor');
  assert.match(enter, /startView\(visit\);/);
  assert.doesNotMatch(enter, /await /);
  const sv = bodyOf('startView');
  assert.match(sv, /neighborApi\.viewStart\(v\.publicId, v\.slot, v\.revisit\)/);
  assert.match(sv, /trackEvent\(\.\.\.evFail\('view_start', r\.reason\)\)/);
  assert.match(sv, /v\.viewId = r\.viewId/);
});

test('퇴장: GA4 neighbor_visit_end 와 같은 sec·reacted 로 viewEnd · 실패는 evFail(view_end)', () => {
  const exit = bodyOf('exitNeighbor');
  assert.match(exit, /const sec = \(performance\.now\(\) - v\.t0\) \/ 1000;/);
  assert.match(exit, /trackEvent\(\.\.\.evVisitEnd\(v\.publicId, sec, v\.reacted\)\);/);
  assert.match(exit, /endView\(v, sec, v\.reacted\);/);
  const ev = bodyOf('endView');
  assert.match(ev, /v\.viewReq/);   // 시작 응답이 늦게 와도 기다렸다 닫는다
  assert.match(ev, /neighborApi\.viewEnd\(id, sec, reacted\)/);
  assert.match(ev, /trackEvent\(\.\.\.evFail\('view_end', r\.reason\)\)/);
});

// ── SQL 마이그레이션(정적 검사 — 실제 동작은 sql/tests/neighbors_selftest.sql) ──
test('ledger 마이그레이션: 트랜잭션 · 테이블 2종 RLS on · 직접 접근 차단', () => {
  assert.match(LEDGER, /^begin;$/m);
  assert.match(LEDGER, /^commit;$/m);
  assert.match(LEDGER, /create table if not exists public\.village_views \(/);
  assert.match(LEDGER, /check \(visitor <> host\)/);
  assert.match(LEDGER, /create index if not exists village_views_host_created on public\.village_views \(host, created_at desc\);/);
  assert.match(LEDGER, /create index if not exists village_views_visitor_day on public\.village_views \(visitor, day\);/);
  assert.match(LEDGER, /create table if not exists public\.moderation_log \(/);
  assert.match(LEDGER, /target\s+uuid references auth\.users\(id\) on delete set null/);
  for (const t of ['village_views', 'moderation_log']) {
    assert.match(LEDGER, new RegExp(`alter table public\\.${t}\\s+enable row level security;`));
    assert.match(LEDGER, new RegExp(`revoke all on table public\\.${t}\\s+from public, anon, authenticated;`));
  }
  assert.doesNotMatch(LEDGER, /create policy/i);
});

test('RPC: security definer · search_path · authenticated 만 · 응답에 user_id 없음', () => {
  for (const [name, sig] of [['neighbor_view_start', 'uuid, int, boolean'], ['neighbor_view_end', 'bigint, int, boolean'], ['admin_moderation_log', 'int']]) {
    assert.match(fn(LEDGER, name), /security definer set search_path = public/, name);
    assert.ok(LEDGER.includes(`revoke all on function public.${name}(${sig}) from public, anon;`), name);
    assert.ok(LEDGER.includes(`grant execute on function public.${name}(${sig}) to authenticated;`), name);
  }
  const start = fn(LEDGER, 'neighbor_view_start');
  assert.match(start, /coalesce\(\(auth\.jwt\(\) ->> 'is_anonymous'\)::boolean, false\)/);
  for (const r of ['self', 'not_found', 'private', 'limit']) assert.ok(start.includes(`'${r}'`), r);
  assert.match(start, /v_cnt >= 30/);
  assert.match(start, /pg_advisory_xact_lock/);
  assert.match(start, /jsonb_build_object\('ok', true, 'view_id', v_id\)/);
  const end = fn(LEDGER, 'neighbor_view_end');
  assert.match(end, /where id = p_view_id and visitor = v_uid and ended_at is null/);
  assert.match(end, /least\(3600, greatest\(0, coalesce\(p_sec, 0\)\)\)/);
  const log = fn(LEDGER, 'admin_moderation_log');
  assert.match(log.split('\nbegin\n')[1], /^\s*if not coalesce\(public\.cf_is_admin\(\), false\) then return jsonb_build_object\('ok', false, 'reason', 'forbidden'\); end if;/);
  assert.match(log, /_nb_nick\(gs\.state, m\.target\)/);
  const keys = [...log.matchAll(/'([a-z_]+)', /g)].map(m => m[1]);
  assert.deepEqual([...new Set(keys)].filter(k => !['ok', 'reason'].includes(k)).sort(), ['action', 'after', 'at', 'before', 'list', 'nick']);
});

test('admin_village_moderate: 최신 본문 그대로 + 바뀐 플래그만 감사 로그', () => {
  const mod = fn(LEDGER, 'admin_village_moderate');
  assert.match(mod.split('\nbegin\n')[1], /^\s*if not coalesce\(public\.cf_is_admin\(\), false\) then return jsonb_build_object\('ok', false, 'reason', 'forbidden'\); end if;/);
  assert.match(mod, /set hidden_by_admin = coalesce\(p_hide, hidden_by_admin\),/);
  assert.match(mod, /nick_hidden\s+= coalesce\(p_hide_nick, nick_hidden\),/);
  for (const a of ["'hide'", "'unhide'", "'hide_nick'", "'unhide_nick'"]) assert.ok(mod.includes(a), a);
  assert.match(mod, /insert into moderation_log \(admin_uid, target, action, before, after\)/);
  assert.match(mod, /if v_act <> '' then/);
  assert.match(mod, /return jsonb_build_object\('ok', true, 'hidden_by_admin', v_hid, 'nick_hidden', v_nh\);/);
  assert.ok(LEDGER.includes('grant execute on function public.admin_village_moderate(uuid, boolean, boolean) to authenticated;'));
});

// ── 셀프테스트 ──
test('자가 테스트: 여전히 DO 블록 하나 · 원장 구간은 정리보다 앞 · 로그 정리', () => {
  assert.equal(SELF.match(/^do \$\$/gm).length, 1);
  const at = SELF.indexOf('⑦ 📒 원장'), clean = SELF.indexOf('-- ── 정리:');
  assert.ok(at > 0 && at < clean);
  for (const s of ['neighbor_view_start(', 'neighbor_view_end(', "'limit'", 'is_guest', 'admin_moderation_log(', 'ledger checks pass'])
    assert.ok(SELF.includes(s), s);
  const cl = SELF.slice(clean);
  const del = cl.indexOf('delete from public.moderation_log where target = any(ids);');
  assert.ok(del >= 0 && del < cl.indexOf('delete from auth.users'), '사용자 삭제(set null) 전에 로그를 지운다');
});

// ── 관리자 화면 ──
test('관리자 화면: 최근 조치 — admin_moderation_log · textContent 만 · 토글 뒤 새로고침', () => {
  assert.ok(ADMIN.includes('최근 조치'));
  assert.match(ADMIN, /sb\.rpc\('admin_moderation_log', \{ p_limit: 30 \}\)/);
  const at = ADMIN.indexOf('// ── 🏡 이웃 마을 관리');
  const js = ADMIN.slice(at, ADMIN.indexOf('</script>', at));
  assert.doesNotMatch(js, /innerHTML\s*=(?!\s*'')/);
  const mod = js.slice(js.indexOf('async function moderateVillage('));
  assert.match(mod, /loadModerationLog\(\);/);
  assert.match(ADMIN, /wire\(\); wireVillage\(\); loadModerationLog\(\);/);
});

test('스펙 §7 에 원장 2종', () => {
  const spec = read('docs/superpowers/specs/2026-10-07-neighbor-village-design.md');
  const s7 = spec.slice(spec.indexOf('## 7.'), spec.indexOf('## 8.'));
  assert.ok(s7.includes('village_views') && s7.includes('moderation_log'));
});
