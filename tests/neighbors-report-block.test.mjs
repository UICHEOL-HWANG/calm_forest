// 🚩🚫 이웃 신고·차단 — App Store 가이드라인 1.2 (js/neighbors/api.js · track.js · migrate_neighbors_report_block.sql)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createNeighborApi } from '../js/neighbors/api.js';
import { evReport, evBlock } from '../js/neighbors/track.js';
import { RESERVED_TRAFFIC_KEYS } from '../js/ga-params.js';

const ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const mk = (rpc) => { const calls = []; return { calls, api: createNeighborApi({ rpc: async (fn, a) => { calls.push([fn, a]); return rpc(fn, a); }, fetchFn: async () => new Response('{}') }) }; };
const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('report: 사유 3종만 서버로 · 결과 정규화', async () => {
  const { api, calls } = mk(async () => ({ ok: true, dup: false }));
  assert.deepEqual(await api.report(ID, 'nick'), { ok: true, dup: false });
  assert.deepEqual(calls[0], ['neighbor_report', { p_public_id: ID, p_reason: 'nick' }]);
  assert.deepEqual(await api.report(ID, 'spam'), { ok: false, reason: 'reason' });
  assert.equal(calls.length, 1, '잘못된 사유는 호출하지 않는다');
  assert.deepEqual(await api.report('nope', 'nick'), { ok: false, reason: 'bad_id' });
  assert.deepEqual(await mk(async () => ({ ok: false, reason: 'limit' })).api.report(ID, 'other'), { ok: false, reason: 'limit' });
  assert.deepEqual(await mk(async () => { throw new Error('net'); }).api.report(ID, 'decor'), { ok: false, reason: 'offline' });
});

test('block: 인자와 정규화', async () => {
  const { api, calls } = mk(async () => ({ ok: true }));
  assert.deepEqual(await api.block(ID), { ok: true });
  assert.deepEqual(calls[0], ['neighbor_block', { p_public_id: ID }]);
  assert.deepEqual(await api.block('x'), { ok: false, reason: 'bad_id' });
  assert.deepEqual(await mk(async () => null).api.block(ID), { ok: false, reason: 'upstream' });
});

test('GA4: neighbor_report · neighbor_block — 키 4개 이하, 예약어 없음', () => {
  assert.deepEqual(evReport(ID, 'nick', 'list', true), ['neighbor_report', { host: ID, reason: 'nick', from: 'list', ok: 1 }]);
  assert.deepEqual(evBlock(ID, 'visit', false), ['neighbor_block', { host: ID, from: 'visit', ok: 0 }]);
  for (const [, p] of [evReport(ID, 'decor', 'visit', true), evBlock(ID, 'list', true)]) {
    assert.ok(Object.keys(p).length <= 4);
    for (const k of Object.keys(p)) assert.ok(!(k in RESERVED_TRAFFIC_KEYS), k);
  }
});

test('SQL: 차단은 양방향 제외 · 게스트 허용 · 관리자 가드', () => {
  const sql = src('sql/migrations/migrate_neighbors_report_block.sql');
  assert.match(sql, /not _nb_blocked\(p_caller, gs\.user_id\)/, '오늘의 이웃 후보에서 차단 제외');
  assert.match(sql, /\(b\.blocker = p_a and b\.blocked = p_b\) or \(b\.blocker = p_b and b\.blocked = p_a\)/, '양방향');
  assert.match(sql, /_nb_blocked\(v_uid, v_host\)[^\n]*'private'/, '차단 관계 반응은 private');
  assert.match(sql, /not _nb_blocked\(v_uid, v\.visitor\)/, '다녀간 이웃에서 제외');
  assert.match(sql, /unique \(reporter, target, day\)/, '같은 대상 하루 1건');
  assert.match(sql, /v_today >= 20/, '하루 20건');
  const fnBody = (name) => sql.slice(sql.indexOf(`function public.${name}`), sql.indexOf('end $$;', sql.indexOf(`function public.${name}`)));
  for (const f of ['neighbor_report', 'neighbor_block']) assert.doesNotMatch(fnBody(f), /is_anonymous/, f + ' 는 게스트도 허용(심사관이 게스트로 확인)');
  for (const f of ['admin_village_reports', 'admin_village_report_done']) assert.match(fnBody(f), /cf_is_admin\(\)/, f);
  assert.match(sql, /revoke all on public\.village_reports from anon, authenticated/);
  assert.match(sql, /revoke all on public\.village_blocks from anon, authenticated/);
});

test('UI: ⋯ 입구 두 곳(목록 각 줄·구경 중 상단 줄) · 모달 id 는 -modal · innerHTML 금지', () => {
  const ui = src('js/neighbors/ui.js');
  assert.match(ui, /openPickerModal\(rows, rewardedToday, onGo, onMore\)/);
  assert.match(ui, /showNeighborHud\(nickname, onExit, onMore\)/);
  assert.match(ui, /'nb-report-modal'/);
  assert.match(ui, /'nb-block-modal'/);
  assert.doesNotMatch(ui, /innerHTML/);
});

test('검수된 문구 그대로(시안 C, 2026-10-11)', () => {
  const ui = src('js/neighbors/ui.js'), ctl = src('js/spaces/neighbor.js');
  for (const s of ['신고하기', '차단하기', '운영자가 확인 후 조치해요.', '부적절한 닉네임', '부적절한 꾸미기', '기타', '신고 보내기',
    '🚫 이 이웃을 차단할까요?', '오늘의 이웃 목록과 방문 기록에서 사라지고, 상대도 내 마을에 올 수 없어요.', '차단']) assert.ok(ui.includes(`'${s}'`), s);
  assert.ok(ctl.includes("'🚫 차단했어요. 이 이웃은 다시 나오지 않아요.'"));
});

test('후속(리뷰 반영): 방문 시작도 차단 · 차단 하루 50 · 후보는 not exists · 신고 증거 보존', () => {
  const sql = src('sql/migrations/migrate_neighbors_report_block_2.sql');
  assert.match(sql, /function public\.neighbor_view_start[\s\S]*_nb_blocked\(v_uid, v_host\)[^\n]*'private'/);
  assert.match(sql, /v_today >= 50/);
  assert.match(sql, /not exists \(select 1 from village_blocks b/);
  assert.match(sql, /on delete set null/);
  assert.match(sql, /target_nick/);
  const ctl = src('js/spaces/neighbor.js');
  assert.match(ctl, /r\.reason === 'private'[\s\S]{0,80}exitNeighbor\(\)/, '방문 시작이 막히면 내보낸다');
  assert.ok(ctl.includes("'🔒 지금은 이 마을에 갈 수 없어요'"));
  assert.match(src('js/neighbors/ui.js'), /#nb-pick-modal \.nb-more'\)\.forEach/, '가는 중엔 ⋯ 잠금');
});

// 🏡 하루 한 번 배너(2026-10-11) — 팻말·열기구가 북향 카메라에 안 잡혀 진입 경로를 배너로
test('daily neighbor banner: KST day gate + GA4 act', async () => {
  const { kstDay, bannerDue } = await import('../js/neighbors/rules.js');
  const { evBanner } = await import('../js/neighbors/track.js');
  const utc1459 = Date.UTC(2026, 9, 10, 14, 59);   // KST 10/10 23:59
  const utc1500 = Date.UTC(2026, 9, 10, 15, 0);    // KST 10/11 00:00
  assert.equal(kstDay(utc1459), '2026-10-10');
  assert.equal(kstDay(utc1500), '2026-10-11');
  assert.equal(bannerDue('2026-10-10', utc1459), false);
  assert.equal(bannerDue('2026-10-10', utc1500), true);
  assert.equal(bannerDue(null, utc1500), true);
  assert.deepEqual(evBanner('tap'), ['neighbor_banner', { act: 'tap' }]);
  const SRC = readFileSync(new URL('../js/spaces/neighbor.js', import.meta.url), 'utf8');
  assert.match(SRC, /openNeighborPicker\('banner'\)/);
  assert.match(SRC, /if \(visit \|\| !inVillage2\(\) \|\| ui\.anyModalOpen\?\.\(\)\) return;/);
  assert.match(SRC, /reason !== 'tap'/);
});
