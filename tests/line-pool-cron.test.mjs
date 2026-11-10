import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isLinePoolTick, runLinePool, CRON_MAX_CALLS, LINE_SPACING_MS } from '../functions/line-pool-cron.js';
import { CONCURRENCY } from '../functions/api/_exaone.js';

const env = { SUPABASE_URL: 'https://sb', SUPABASE_SERVICE_KEY: 's', EXAONE_API_KEY: 'k' };

function world({ counts = [], existing = [], exaone, runsStatus = 201 }) {
  const log = { inserts: [], runs: [], mails: [], exaone: 0 };
  const fetch = async (url, init = {}) => {
    if (url.endsWith('/rpc/line_pool_counts')) return new Response(JSON.stringify(counts));
    if (url.includes('/line_pool?select=')) return new Response(JSON.stringify(existing));
    if (url.includes('/line_pool?on_conflict')) { log.inserts.push(JSON.parse(init.body)); return new Response('', { status: 201 }); }
    if (url.endsWith('/line_pool_runs')) { log.runs.push(JSON.parse(init.body)); return new Response('', { status: runsStatus }); }
    if (url.includes('exaone')) { log.exaone++; return exaone(log.exaone); }
    throw new Error(`unexpected ${url}`);
  };
  const notify = async (...a) => { log.mails.push(a); };
  return { fetch, notify, log };
}
const ok = lines => new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ lines }) } }] }));

test('isLinePoolTick 은 UTC 일요일 21:30 한 번만', () => {
  assert.equal(isLinePoolTick(Date.parse('2026-11-15T21:30:00Z')), true);
  assert.equal(isLinePoolTick(Date.parse('2026-11-15T21:00:00Z')), false);
  assert.equal(isLinePoolTick(Date.parse('2026-11-16T21:30:00Z')), false);
});

test('설정이 없으면 건너뛴다', async () => {
  assert.deepEqual(await runLinePool({}, { notify: async () => {} }), { skipped: 'not_configured' });
});

test('모자란 칸을 채워 적재하고 성공도 기록한다', async () => {
  const items = ['moonswing', 'lanternarch', 'starvane'];
  const full = ['intro', 'open'].flatMap(slot => items.flatMap(key => ['ko', 'en'].map(lang => ({ kind: 'auction', key, slot, lang, n: 30 }))));
  const anyFull = ['raise_npc', 'raise_me', 'sold_me', 'sold_npc'].flatMap(slot => ['ko', 'en'].map(lang => ({ kind: 'auction', key: '_any', slot, lang, n: 30 })));
  const counts = [...full, ...anyFull, { kind: 'auction', key: '_any', slot: 'last', lang: 'en', n: 30 }, { kind: 'auction', key: '_any', slot: 'last', lang: 'ko', n: 28 }];
  const w = world({ counts, exaone: () => ok(['마지막이오!', '더 없소?', '자, 마지막이오!']) });
  const r = await runLinePool(env, { fetch: w.fetch, notify: w.notify, spacingMs: 0 });
  assert.equal(r.inserted, 2);
  assert.deepEqual(w.log.inserts[0].map(x => x.text), ['마지막이오!', '더 없소?']);
  assert.equal(w.log.runs[0].source, 'cron');
  assert.equal(w.log.runs[0].inserted, 2);
  assert.equal(w.log.mails.length, 0);
});

test('서브리퀘스트 예산: 빈 풀이어도 EXAONE 호출은 CRON_MAX_CALLS 까지', async () => {
  const w = world({ exaone: () => new Response('', { status: 500 }) });
  await runLinePool(env, { fetch: w.fetch, notify: w.notify, spacingMs: 0 });
  assert.equal(w.log.exaone, CRON_MAX_CALLS);
  assert.ok(CRON_MAX_CALLS + 5 <= 50);
});

test('EXAONE 이 매번 429 를 주면 실행 기록에 rate_limited 가 true', async () => {
  const w = world({ exaone: () => new Response('', { status: 429 }) });
  const r = await runLinePool(env, { fetch: w.fetch, notify: w.notify, spacingMs: 0 });
  assert.equal(r.rate_limited, true);
  assert.equal(w.log.runs[0].rate_limited, true);
});

test('401 이면 이미 출발한 호출 뒤로는 더 부르지 않고 메일', async () => {
  const w = world({ exaone: () => new Response('', { status: 401 }) });
  const r = await runLinePool(env, { fetch: w.fetch, notify: w.notify, spacingMs: 0 });
  assert.ok(w.log.exaone <= CONCURRENCY);
  assert.equal(r.calls, w.log.exaone);
  assert.match(r.error, /auth/);
  assert.equal(w.log.mails.length, 1);
});

test('worker 는 빛 공방 틱 중 UTC 일요일 21:30 을 문구 풀로 보낸다', () => {
  const src = readFileSync(new URL('../worker/index.js', import.meta.url), 'utf8');
  assert.match(src, /import \{ runLinePool, isLinePoolTick \} from '\.\.\/functions\/line-pool-cron\.js'/);
  const lp = src.indexOf('isLinePoolTick(event.scheduledTime)');
  const aura = src.indexOf('runAuraCron(env, { phase })');
  assert.ok(lp > 0 && lp < aura);
});

test('line_pool_runs 기록이 비정상 응답이어도 요약은 돌려주고 오류를 남긴다', async () => {
  const w = world({ runsStatus: 500, exaone: () => ok(['a']) });
  const errors = [];
  const orig = console.error;
  console.error = (...a) => { errors.push(a.join(' ')); };
  try {
    const r = await runLinePool(env, { fetch: w.fetch, notify: w.notify, spacingMs: 0 });
    assert.equal(typeof r.calls, 'number');
    assert.ok(errors.some(m => m.includes('line_pool_runs failed')));
  } finally {
    console.error = orig;
  }
});

test('줄 풀 호출 간격은 2초', () => {
  assert.equal(LINE_SPACING_MS, 2000);
});
