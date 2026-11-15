import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateKeyPairSync } from 'node:crypto';
import { runPush, runPushTick } from '../functions/push-cron.js';
import { isMarketTick, marketMessage, marketBudget, runMarketPush, MARKET_KIND } from '../functions/push/market.js';
import { WEEKLY_COPY } from '../js/weekly/copy.js';
import { weekIndex, marketOpen } from '../js/weekly/rules.js';
import { EN } from '../js/i18n-en.js';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const SA = JSON.stringify({ project_id: 'demo-proj', client_email: 'p@demo.iam.gserviceaccount.com',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) });
const FRI_2010 = Date.parse('2026-11-13T11:10:00Z');
const env = (o = {}) => ({ SUPABASE_URL: 'https://sb.test', SUPABASE_SERVICE_KEY: 'svc', FCM_SA_KEY: SA,
  NIGHT_SEED_SECRET: 'test-secret', CARDNEWS: { get: async () => 'ya29.cached', put: async () => {} }, ...o });

const mrow = (token, o = {}) => ({ token, user_id: `u-${token}`, lang: 'ko', updated_at: '2026-11-10T03:00:00Z', ...o });

function fakeFetch({ market = [], night = [], fcm = () => new Response('{}') } = {}) {
  const calls = [];
  const fn = async (url, init = {}) => {
    const u = String(url);
    calls.push({ url: u, body: init.body ? JSON.parse(init.body) : null });
    if (u.endsWith('/rpc/push_candidates')) return new Response(JSON.stringify(night));
    if (u.endsWith('/rpc/push_market_candidates')) return new Response(JSON.stringify(typeof market === 'function' ? market() : market));
    if (u.includes('fcm.googleapis.com')) return fcm(JSON.parse(init.body).message.token);
    return new Response(null, { status: 204 });
  };
  return { fn, calls };
}
const at = (iso) => Date.parse(iso);
const fcmCalls = (f) => f.calls.filter(c => c.url.includes('fcm.googleapis.com'));
const marketMark = (f) => f.calls.find(c => c.url.endsWith('rpc/push_market_mark'))?.body;

test('tick predicate: Friday push ticks from 20:10 KST on', () => {
  assert.equal(isMarketTick(at('2026-11-13T11:10:00Z')), true);
  assert.equal(isMarketTick(at('2026-11-13T11:30:00Z')), true);
  assert.equal(isMarketTick(at('2026-11-13T13:50:00Z')), true);
  assert.equal(isMarketTick(at('2026-11-13T14:10:00Z')), false);
  assert.equal(isMarketTick(at('2026-11-13T14:50:00Z')), false);
  assert.equal(isMarketTick(at('2026-11-13T11:00:00Z')), false);
  assert.equal(isMarketTick(at('2026-11-13T11:20:00Z')), false);
  assert.equal(isMarketTick(at('2026-11-13T10:50:00Z')), false);
  assert.equal(isMarketTick(at('2026-11-12T11:10:00Z')), false);
  assert.equal(isMarketTick(at('2026-11-14T11:10:00Z')), false);
  assert.equal(isMarketTick(at('2026-11-15T11:10:00Z')), false);
});

test('message: body is the approved banner, title follows the banner icon + market title', () => {
  assert.equal(marketMessage('ko').body, WEEKLY_COPY.banner);
  assert.equal(marketMessage('ko').title, `🛒 ${WEEKLY_COPY.market.title}`);
  assert.equal(marketMessage('en').body, EN[WEEKLY_COPY.banner]);
  assert.equal(marketMessage('en').title, `🛒 ${EN[WEEKLY_COPY.market.title]}`);
  assert.equal(marketMessage(undefined).body, WEEKLY_COPY.banner);
});

test('KST math agrees with rules.js at the send time', async () => {
  assert.equal(marketOpen(FRI_2010), true);
  const f = fakeFetch({ market: [mrow('t-a-aaaaaaaaaaaaaaaaaaaa')] });
  await runMarketPush(env(), { now: FRI_2010, fetch: f.fn, budget: 10 });
  const cand = f.calls.find(c => c.url.endsWith('rpc/push_market_candidates')).body;
  assert.equal(cand.p_week, weekIndex(FRI_2010));
  assert.equal(cand.p_today, '2026-11-13');
});

test('sends the market push, logs it with kind market, and marks each sent account for the week', async () => {
  const rows = [mrow('t-a-aaaaaaaaaaaaaaaaaaaa'), mrow('t-b-bbbbbbbbbbbbbbbbbbbb', { lang: 'en' })];
  const f = fakeFetch({ market: rows });
  const r = await runMarketPush(env(), { now: FRI_2010, fetch: f.fn, budget: 10 });
  assert.deepEqual({ sent: r.sent, failed: r.failed }, { sent: 2, failed: 0 });
  const msgs = fcmCalls(f).map(c => c.body.message);
  assert.equal(msgs[0].notification.body, WEEKLY_COPY.banner);
  assert.equal(msgs[1].notification.body, EN[WEEKLY_COPY.banner]);
  assert.equal(msgs[0].data.kind, MARKET_KIND);
  assert.match(msgs[0].data.send_id, /^[0-9a-f-]{36}$/);
  const logs = f.calls.find(c => c.url.endsWith('/rest/v1/push_logs')).body;
  assert.deepEqual(logs.map(l => [l.user_id, l.kind, l.status, l.sent_on]),
    rows.map(x => [x.user_id, 'market', 'sent', '2026-11-13']));
  assert.equal(logs[0].id, msgs[0].data.send_id);
  assert.deepEqual(marketMark(f), { p_week: weekIndex(FRI_2010), p_checked: rows.map(x => x.token), p_dead: [] });
});

test('the mark call carries exactly the sent ids and the current week; transient failures stay out', async () => {
  const rows = [mrow('t-ok1-aaaaaaaaaaaaaaaaaaaa'), mrow('t-flaky-bbbbbbbbbbbbbbbbbbb'), mrow('t-ok2-cccccccccccccccccccc')];
  const f = fakeFetch({ market: rows, fcm: tok => (tok.startsWith('t-flaky') ? new Response('{}', { status: 503 }) : new Response('{}')) });
  const r = await runMarketPush(env(), { now: FRI_2010, fetch: f.fn, budget: 10 });
  assert.equal(r.sent, 2);
  assert.deepEqual(marketMark(f), { p_week: weekIndex(FRI_2010), p_checked: ['t-ok1-aaaaaaaaaaaaaaaaaaaa', 't-ok2-cccccccccccccccccccc'], p_dead: [] });
});

test('no recipients means no FCM call and no error', async () => {
  const f = fakeFetch({ market: [] });
  const r = await runMarketPush(env(), { now: FRI_2010, fetch: f.fn, budget: 10 });
  assert.equal(r.error, undefined);
  assert.equal(fcmCalls(f).length, 0);
  assert.equal(marketMark(f), undefined);
});

test('send failures mirror the night push: transient left unmarked, 400 and dead marked, dead deleted', async () => {
  const rows = [mrow('t-ok-cccccccccccccccccccc'), mrow('t-flaky-dddddddddddddddddd'),
    mrow('t-bad-eeeeeeeeeeeeeeeeeeee'), mrow('t-dead-ffffffffffffffffffff')];
  const f = fakeFetch({ market: rows, fcm: tok => {
    if (tok.startsWith('t-flaky')) return new Response('{}', { status: 503 });
    if (tok.startsWith('t-bad')) return new Response('{}', { status: 400 });
    if (tok.startsWith('t-dead')) return new Response(JSON.stringify({ error: { details: [{ errorCode: 'UNREGISTERED' }] } }), { status: 404 });
    return new Response('{}');
  } });
  const r = await runMarketPush(env(), { now: FRI_2010, fetch: f.fn, budget: 10 });
  assert.equal(fcmCalls(f).length, 4, 'one failure does not stop the others');
  assert.equal(r.sent, 1);
  const mark = marketMark(f);
  assert.deepEqual(mark.p_checked, ['t-ok-cccccccccccccccccccc', 't-bad-eeeeeeeeeeeeeeeeeeee', 't-dead-ffffffffffffffffffff']);
  assert.deepEqual(mark.p_dead, ['t-dead-ffffffffffffffffffff']);
});

test('401 or 403 stops the batch and marks nobody', async () => {
  const f = fakeFetch({ market: [mrow('t-a-gggggggggggggggggggg'), mrow('t-b-hhhhhhhhhhhhhhhhhhhh')], fcm: () => new Response('{}', { status: 403 }) });
  const r = await runMarketPush(env(), { now: FRI_2010, fetch: f.fn, budget: 10 });
  assert.equal(r.error, 'fcm-auth');
  assert.equal(fcmCalls(f).length, 1);
  assert.deepEqual(marketMark(f).p_checked, []);
});

test('zero budget skips every call', async () => {
  const f = fakeFetch({ market: [mrow('t-a-iiiiiiiiiiiiiiiiiiii')] });
  const r = await runMarketPush(env(), { now: FRI_2010, fetch: f.fn, budget: 0 });
  assert.equal(r.skipped, 'budget');
  assert.equal(f.calls.length, 0);
});

test('rows beyond the budget are counted as left, without an extra subrequest', async () => {
  const rows = Array.from({ length: 7 }, (_, i) => mrow(`t-${String(i).padStart(20, '0')}`));
  const f = fakeFetch({ market: rows });
  const r = await runMarketPush(env(), { now: FRI_2010, fetch: f.fn, budget: 3 });
  assert.equal(r.sent, 3);
  assert.equal(r.left, 4);
  assert.equal(f.calls.filter(c => c.url.includes('push_market_candidates')).length, 1);
  assert.equal(marketMark(f).p_checked.length, 3);
});

test('left is zero when everything fit', async () => {
  const f = fakeFetch({ market: [mrow('t-a-mmmmmmmmmmmmmmmmmmmm')] });
  const r = await runMarketPush(env(), { now: FRI_2010, fetch: f.fn, budget: 5 });
  assert.equal(r.left, 0);
});

test('a failed push_logs insert is surfaced but the mark still happens', async () => {
  const f = fakeFetch({ market: [mrow('t-a-nnnnnnnnnnnnnnnnnnnn')] });
  const wrapped = async (url, init) => (String(url).endsWith('/rest/v1/push_logs') ? new Response('{}', { status: 500 }) : f.fn(url, init));
  const r = await runMarketPush(env(), { now: FRI_2010, fetch: wrapped, budget: 5 });
  assert.equal(r.sent, 1);
  assert.match(r.error, /logs 500/);
  assert.deepEqual(marketMark(f).p_checked, ['t-a-nnnnnnnnnnnnnnnnnnnn']);
});

test('a throwing push_logs insert is surfaced and does not skip the mark', async () => {
  const f = fakeFetch({ market: [mrow('t-a-oooooooooooooooooooo')] });
  const wrapped = async (url, init) => {
    if (String(url).endsWith('/rest/v1/push_logs')) throw new Error('net down');
    return f.fn(url, init);
  };
  const r = await runMarketPush(env(), { now: FRI_2010, fetch: wrapped, budget: 5 });
  assert.match(r.error, /logs net down/);
  assert.deepEqual(marketMark(f).p_checked, ['t-a-oooooooooooooooooooo']);
});

test('not configured skips quietly', async () => {
  const f = fakeFetch();
  const r = await runMarketPush(env({ FCM_SA_KEY: undefined }), { now: FRI_2010, fetch: f.fn, budget: 10 });
  assert.equal(r.skipped, 'not-configured');
  assert.equal(f.calls.length, 0);
});

test('marketBudget leaves the night push its own spend first and fits 50 subrequests', () => {
  assert.equal(marketBudget({ skipped: 'not-configured' }), 40);
  assert.equal(marketBudget({ candidates: 0, sent: 0, checked: 0 }), 40);
  assert.equal(marketBudget({ error: 'candidates 500' }), 40);
  const heavy = marketBudget({ candidates: 100, sent: 40, failed: 0, dead: 0, checked: 40 });
  assert.ok(heavy >= 0 && heavy <= 5);
  const light = marketBudget({ candidates: 3, sent: 1, failed: 0, dead: 0, checked: 3 });
  assert.ok(light > heavy && light <= 40);
  for (const n of [0, 1, 10, 40]) {
    const night = { candidates: n + 1, sent: n, failed: 0, dead: 0, checked: n, error: 'fcm-auth' };
    const nightMax = 1 + 1 + n + 1 + 2;
    assert.ok(nightMax + 4 + marketBudget(night) <= 50);
  }
});

test('runPushTick runs the market push on the Friday tick after the night push', async () => {
  const f = fakeFetch({ market: [mrow('t-a-jjjjjjjjjjjjjjjjjjjj')] });
  const r = await runPushTick(env(), { scheduledTime: FRI_2010, now: FRI_2010, fetch: f.fn });
  assert.equal(r.market.sent, 1);
  const order = f.calls.map(c => c.url.split('/').pop());
  assert.ok(order.indexOf('push_candidates') < order.indexOf('push_market_candidates'));
});

test('runPushTick does not touch the market on other days', async () => {
  const thu = at('2026-11-12T11:10:00Z');
  const f = fakeFetch({ market: [mrow('t-a-kkkkkkkkkkkkkkkkkkkk')] });
  const r = await runPushTick(env(), { scheduledTime: thu, now: thu, fetch: f.fn });
  assert.equal(r.market, undefined);
  assert.equal(f.calls.some(c => c.url.includes('push_market')), false);
});

test('a market job that throws leaves the night result intact and is reported', async () => {
  const r = await runPushTick(env(), { scheduledTime: FRI_2010, now: FRI_2010,
    runNight: async () => ({ candidates: 3, sent: 2, failed: 0, dead: 0, checked: 3 }),
    runMarket: async () => { throw new Error('boom'); } });
  assert.equal(r.sent, 2);
  assert.equal(r.market.error, 'market boom');
});

test('a night job that throws still lets the market run, with the worst-case budget', async () => {
  let given = null;
  const r = await runPushTick(env(), { scheduledTime: FRI_2010, now: FRI_2010,
    runNight: async () => { throw new Error('night down'); },
    runMarket: async (e, o) => { given = o.budget; return { sent: 1 }; } });
  assert.equal(given, 2);
  assert.equal(r.error, 'night night down');
  assert.deepEqual(r.market, { sent: 1 });
});

test('the market job is not run on non-market ticks', async () => {
  let ran = false;
  const thu = at('2026-11-12T11:10:00Z');
  const r = await runPushTick(env(), { scheduledTime: thu, now: thu,
    runNight: async () => ({ candidates: 0, sent: 0, checked: 0 }),
    runMarket: async () => { ran = true; return {}; } });
  assert.equal(ran, false);
  assert.equal(r.market, undefined);
});

const nightRow = (token) => ({ token, user_id: `u-${token}`, lang: 'ko', updated_at: new Date(FRI_2010 - 4 * 86400000).toISOString(),
  plots: [{ x: 0, z: 0, state: 'growing' }], outdoor: [], truce: null, night_last: null, craft: { slots: [] }, returns_7d: 0 });
const many = (prefix, n, make) => Array.from({ length: n }, (_, i) => make(`${prefix}-${String(i).padStart(20, '0')}`));

test('worst case: 45 night picks all sent plus plenty of market rows stays within 50 outgoing fetches', async () => {
  const f = fakeFetch({ night: many('n', 45, nightRow), market: many('m', 60, mrow) });
  const r = await runPushTick(env(), { scheduledTime: FRI_2010, now: FRI_2010, fetch: f.fn });
  assert.equal(r.sent, 40);
  assert.equal(r.market.sent, marketBudget(r));
  assert.equal(r.market.sent, 2);
  assert.ok(f.calls.length <= 50, `outgoing fetches ${f.calls.length}`);
  assert.equal(fcmCalls(f).length, 42);
});

test('worst case with an uncached token exchange still stays within 50', async () => {
  const f = fakeFetch({ night: many('n', 45, nightRow), market: many('m', 60, mrow) });
  let exchanges = 0;
  const wrapped = async (url, init) => {
    if (String(url).includes('oauth2.googleapis.com')) { exchanges++; return new Response(JSON.stringify({ access_token: 'ya29.fresh', expires_in: 3600 })); }
    return f.fn(url, init);
  };
  const r = await runPushTick(env({ CARDNEWS: { get: async () => null, put: async () => {} } }), { scheduledTime: FRI_2010, now: FRI_2010, fetch: wrapped });
  assert.equal(r.sent, 40);
  assert.ok(exchanges >= 1);
  assert.ok(f.calls.length + exchanges <= 50, `outgoing fetches ${f.calls.length + exchanges}`);
});

test('night push stopped by a 403 gives the market push the capped budget and stays within 50', async () => {
  const f = fakeFetch({ night: many('n', 45, nightRow), market: many('m', 60, mrow),
    fcm: tok => (tok.startsWith('n-') ? new Response('{}', { status: 403 }) : new Response('{}')) });
  const r = await runPushTick(env(), { scheduledTime: FRI_2010, now: FRI_2010, fetch: f.fn });
  assert.equal(r.error, 'fcm-auth');
  assert.equal(r.market.sent, 40);
  assert.equal(r.market.sent, marketBudget({ candidates: 45, sent: 0, failed: 0, dead: 0, error: 'fcm-auth' }));
  assert.ok(f.calls.length <= 50, `outgoing fetches ${f.calls.length}`);
});

test('worker routes the push tick through runPushTick with the scheduled time', () => {
  const w = readFileSync(new URL('../worker/index.js', import.meta.url), 'utf8');
  assert.match(w, /runPushTick\(env, \{ scheduledTime: event\.scheduledTime \}\)/);
  assert.match(w, /if \(isPushTick\(event\.scheduledTime\)\)/);
});

test('existing night runPush is unchanged for the same inputs', async () => {
  const f = fakeFetch({ night: [] });
  const r = await runPush(env(), { now: FRI_2010, fetch: f.fn });
  assert.deepEqual(r, { candidates: 0, sent: 0, checked: 0 });
});

const SQL = readFileSync(new URL('../sql/migrations/migrate_push_weekly_market.sql', import.meta.url), 'utf8');
const body = (name) => SQL.match(new RegExp(`create or replace function public\\.${name}[\\s\\S]*?\\$\\$;`))[0];

test('sql: functions exist, security definer with fixed search_path', () => {
  for (const n of ['push_market_candidates', 'push_market_mark']) {
    assert.match(body(n), /security definer set search_path = public/);
  }
  assert.match(SQL, /add column if not exists market_week int/);
});

test('sql: execute revoked from public/anon/authenticated and granted only to service_role', () => {
  assert.match(SQL, /revoke all on function public\.push_market_candidates\(int, date, int\) from public, anon, authenticated;/);
  assert.match(SQL, /revoke all on function public\.push_market_mark\(int, text\[\], text\[\]\) from public, anon, authenticated;/);
  assert.match(SQL, /grant execute on function public\.push_market_candidates\(int, date, int\) to service_role;/);
  assert.match(SQL, /grant execute on function public\.push_market_mark\(int, text\[\], text\[\]\) to service_role;/);
  assert.equal((SQL.match(/grant execute/g) || []).length, 2);
});

test('sql: recipient rules use game_saves.updated_at on the KST day boundary and the weekly marker', () => {
  const f = body('push_market_candidates');
  assert.match(f, /t\.enabled/);
  assert.match(f, /Asia\/Seoul/);
  assert.match(f, /interval '14 days'/);
  assert.match(f, /m\.market_week = p_week/);
  assert.match(f, /l\.sent_on = p_today/);
  assert.match(f, /not exists \(select 1 from public\.push_tokens j where j\.user_id = t\.user_id and j\.enabled and \(j\.last_checked_on is null or j\.last_checked_on < p_today\)\)/);
  assert.match(f, /t\.last_checked_on = p_today/);
});

test('sql: the market mark does not stamp last_checked_on', () => {
  assert.equal(/last_checked_on/.test(body('push_market_mark')), false);
});

test('sql: log kind keeps every existing kind and adds market', () => {
  const kinds = SQL.match(/push_logs_kind_check check \(kind in \(([^)]*)\)\)/)[1].match(/'([a-z]+)'/g).map(s => s.slice(1, -1));
  assert.deepEqual(kinds, ['night', 'craft', 'return', 'pond', 'market', 'season']);
  const drops = SQL.match(/\bdrop\b[^;]*;/gi) || [];
  assert.deepEqual(drops, ['drop constraint if exists push_logs_kind_check;']);
});

test('sql: one transaction, fail-fast lock timeout, drop immediately followed by the re-add', () => {
  const lines = SQL.split('\n').filter(Boolean);
  assert.equal(lines[0], 'begin;');
  assert.equal(lines[1], "set local lock_timeout = '3s';");
  assert.equal(lines[lines.length - 1], 'commit;');
  const i = lines.findIndex(l => l.includes('drop constraint if exists push_logs_kind_check'));
  assert.match(lines[i + 1], /^alter table public\.push_logs add constraint push_logs_kind_check check/);
});

test('sql: no comments in the migration', () => {
  assert.equal(/--|\/\*/.test(SQL), false);
});

const SELFTEST = readFileSync(new URL('../sql/tests/push_weekly_market_selftest.sql', import.meta.url), 'utf8');

test('selftest: array length comparisons cannot be NULL', () => {
  const bare = SELFTEST.split('\n').filter(l => /array_length\(/.test(l) && !/coalesce\(array_length\(/.test(l));
  assert.deepEqual(bare, []);
  assert.match(SELFTEST, /cut_off := coalesce\(array_length\(picked, 1\), 0\) >= 1000;/);
});

test('selftest: covers an account with a disabled never-stamped token next to a judged one', () => {
  assert.match(SELFTEST, /pm-selftest-token-dis-a-/);
  assert.match(SELFTEST, /pm-selftest-token-dis-b-[^)]*'android', false, 'ko', null, null\)/);
  assert.match(SELFTEST, /not \(ids\[17\] = any\(picked\)\) and not cut_off then raise exception 'FAIL: disabled unstamped token/);
});
