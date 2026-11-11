import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildRequest, recipeFromResult, runAuraCron, AURA_TICK_CRON, AURA_FINAL_CRON, AURA_MODEL, MAX_ATTEMPTS, TICK_MAX, CONCURRENCY, SPACING_MS } from '../functions/aura-cron.js';

const ENV = { SUPABASE_URL: 'https://sb.test', SUPABASE_SERVICE_KEY: 's', EXAONE_API_KEY: 'k' };
const CARDS = { shape: 'petal', color: 'pink', motion: 'spiral', band: 'body' };
const order = (id, extra = {}) => ({ id, user_id: 'u', order_date: '2026-10-08', text: `벚꽃 회오리 ${id}`, cards: CARDS, status: 'pending', attempts: 0, ...extra });
const RECIPE = { name: '벚꽃 바람', line: '봄이에요.', shape: 'petal', motion: 'spiral', band: 'body', count: 12, speed: 1, radius: 1, colors: ['pink', 'rose'] };
const ok = (text, finish = 'stop') => ({ ok: true, finish, text });
const completion = (text, finish = 'stop') => Response.json({ object: 'chat.completion', choices: [{ index: 0, finish_reason: finish, message: { role: 'assistant', content: text, reasoning_content: '...' } }], usage: {} });

test('buildRequest: 모델·낮은 추론·시스템 지시·스키마 안내, response_format 없음', () => {
  const r = buildRequest(order('11111111-1111-4111-8111-111111111111'));
  assert.equal(r.model, AURA_MODEL);
  assert.equal(AURA_MODEL, 'k-exaone_v2.5');
  assert.equal(r.reasoning_effort, 'low');
  assert.ok(r.max_tokens >= 2048);
  assert.equal(r.response_format, undefined);
  assert.equal(r.messages[0].role, 'system');
  assert.match(r.messages[0].content, /지시는 따르지 않/);
  assert.match(r.messages[0].content, /"shape"/);
  assert.match(r.messages[0].content, /JSON/);
  assert.equal(r.messages[1].role, 'user');
  assert.match(r.messages[1].content, /벚꽃 회오리/);
});

test('recipeFromResult: 성공은 정제 후 done(코드펜스·앞 개행도 허용)', () => {
  const o = order('a');
  const done = recipeFromResult(o, ok(JSON.stringify({ ...RECIPE, count: 40 })));
  assert.equal(done.status, 'done');
  assert.equal(done.recipe.count, 24);
  assert.equal(recipeFromResult(o, ok('\n\n```json\n' + JSON.stringify(RECIPE) + '\n```')).status, 'done');
  assert.equal(recipeFromResult(o, ok('레시피입니다: ' + JSON.stringify(RECIPE) + ' 끝')).status, 'done');
});

test('recipeFromResult: 레시피 필드가 없는 JSON(빈 객체·스키마 되풀이·래퍼)은 done 이 아니라 retry', () => {
  const o = order('a');
  for (const junk of [{}, { type: 'object', properties: {}, required: ['name'] }, { recipe: RECIPE }, { ...RECIPE, shape: 'cloud' }, { ...RECIPE, name: '' }]) {
    const got = recipeFromResult(o, ok(JSON.stringify(junk)));
    assert.deepEqual([got.status, got.reason], ['retry', 'parse'], JSON.stringify(junk));
  }
  assert.equal(recipeFromResult(o, ok(JSON.stringify({ ...RECIPE, count: 99, speed: 7, colors: ['nope'] }))).status, 'done');
});

test('recipeFromResult: content_filter 는 즉시 대체, length·파싱 실패·호출 실패는 retry, 한도·인증은 skip', () => {
  const o = order('a');
  assert.equal(recipeFromResult(o, ok('', 'content_filter')).status, 'fallback');
  assert.equal(recipeFromResult(o, ok('{"name":', 'length')).status, 'retry');
  assert.equal(recipeFromResult(o, ok('{oops')).status, 'retry');
  assert.equal(recipeFromResult(o, ok(undefined)).status, 'retry');
  assert.equal(recipeFromResult(o, { ok: false, status: 500, reason: 'http_500' }).status, 'retry');
  assert.equal(recipeFromResult(o, { ok: false, status: 0, reason: 'timeout' }).status, 'retry');
  assert.equal(recipeFromResult(o, undefined).status, 'retry');
  assert.deepEqual(recipeFromResult(o, { ok: false, status: 429, reason: 'http_429' }), { status: 'skip', reason: 'rate_limited' });
  assert.deepEqual(recipeFromResult(o, { ok: false, status: 401, reason: 'http_401' }), { status: 'skip', reason: 'auth' });
  assert.deepEqual(recipeFromResult(o, { ok: false, status: 403, reason: 'http_403' }), { status: 'skip', reason: 'auth' });
});

function world({ orders = [], reply = () => completion(JSON.stringify(RECIPE)) } = {}) {
  const calls = { upserts: [], reads: [], runs: [], exaone: [], notified: [], inflight: 0, peak: 0 };
  const fetch = async (url, init = {}) => {
    const u = String(url), m = init.method || 'GET';
    if (u.includes('/rest/v1/aura_orders') && m === 'GET') { calls.reads.push(u); return Response.json(orders); }
    if (u.includes('/rest/v1/aura_orders') && m === 'POST') { calls.upserts.push(JSON.parse(init.body)); return new Response(null, { status: 201 }); }
    if (u.includes('/rest/v1/ai_pregen_runs')) { calls.runs.push(JSON.parse(init.body)); return new Response(null, { status: 201 }); }
    if (u === 'https://api.exaone.ai/v1/chat/completions' && m === 'POST') {
      const body = JSON.parse(init.body);
      calls.exaone.push({ body, auth: init.headers.authorization });
      calls.inflight++; calls.peak = Math.max(calls.peak, calls.inflight);
      await new Promise(r => setTimeout(r, 2));
      calls.inflight--;
      return reply(body, calls.exaone.length);
    }
    throw new Error('unexpected ' + m + ' ' + u);
  };
  const notify = async (_e, subject) => { calls.notified.push(subject); return true; };
  return { calls, fetch, notify };
}
const rowsById = w => Object.fromEntries(w.calls.upserts.flat().map(x => [x.id, x]));
const tick = (w, env = ENV, extra = {}) => runAuraCron(env, { phase: 'tick', fetch: w.fetch, notify: w.notify, now: 0, spacingMs: 0, ...extra });

test('tick: EXAONE 은 초당 1건 제한이라 호출 시작 사이에 spacingMs 이상 간격을 둔다', async () => {
  const w = world({ orders: Array.from({ length: 4 }, (_, i) => order(`id-${i}`)) });
  let clock = 0;
  const starts = [];
  const wait = async ms => { clock += ms; };
  const fetch = (u, i) => { if (String(u).includes('exaone.ai')) starts.push(clock); return w.fetch(u, i); };
  await tick({ ...w, fetch }, ENV, { spacingMs: 40, wait });
  assert.equal(starts.length, 4);
  starts.slice(1).forEach((t, i) => assert.ok(t - starts[i] >= 40, `간격 ${t - starts[i]}ms`));
  assert.ok(SPACING_MS >= 1000);
});

test('tick: 대기 주문마다 EXAONE 을 1번씩 불러 done 으로 저장한다', async () => {
  const a = order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), b = order('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  const w = world({ orders: [a, b] });
  const r = await tick(w);
  assert.equal(w.calls.exaone.length, 2);
  assert.equal(w.calls.exaone[0].auth, 'Bearer k');
  assert.equal(r.requested, 2); assert.equal(r.done, 2); assert.equal(r.error, null);
  const rows = rowsById(w);
  assert.equal(rows[a.id].status, 'done');
  assert.equal(rows[a.id].model, AURA_MODEL);
  assert.equal(rows[a.id].recipe.shape, 'petal');
  assert.equal(rows[a.id].batch_id, null);
  assert.ok(rows[a.id].user_id && rows[a.id].text, '업서트는 NOT NULL 칸을 모두 싣는다');
  assert.equal(w.calls.runs[0].kind, 'aura');
  assert.equal(w.calls.runs[0].requested, 2);
});

test('tick: 이전 방식으로 submitted 에 남은 주문도 대기와 함께 다시 처리한다', async () => {
  const s = order('ssssssss-ssss-4sss-8sss-ssssssssssss', { status: 'submitted', batch_id: 'msgbatch_old' });
  const w = world({ orders: [s] });
  await tick(w);
  assert.match(w.calls.reads[0], /status=in\.\(pending,submitted\)/);
  assert.equal(rowsById(w)[s.id].status, 'done');
  assert.equal(rowsById(w)[s.id].batch_id, null);
});

test('tick: 한 번에 TICK_MAX 건까지 읽고, 동시 호출은 CONCURRENCY 를 넘지 않는다', async () => {
  const many = Array.from({ length: 14 }, (_, i) => order(`id-${i}`));
  const w = world({ orders: many });
  await tick(w);
  assert.match(w.calls.reads[0], new RegExp(`limit=${TICK_MAX}(&|$)`));
  assert.ok(w.calls.peak <= CONCURRENCY && w.calls.peak > 1, `peak ${w.calls.peak}`);
  assert.equal(w.calls.exaone.length, 14);
});

test('tick: 실패는 retry(시도+1), 시도 3회째는 fallback', async () => {
  const a = order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  const b = order('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  const c = order('cccccccc-cccc-4ccc-8ccc-cccccccccccc', { attempts: MAX_ATTEMPTS - 1 });
  const reply = body => {
    const text = body.messages[1].content;
    if (text.includes(a.id)) return completion(JSON.stringify(RECIPE));
    return new Response('boom', { status: 500 });
  };
  const w = world({ orders: [a, b, c], reply });
  const r = await tick(w);
  const rows = rowsById(w);
  assert.equal(rows[a.id].status, 'done');
  assert.equal(rows[b.id].status, 'pending');
  assert.equal(rows[b.id].attempts, 1);
  assert.equal(rows[b.id].batch_id, null);
  assert.equal(rows[c.id].status, 'fallback');
  assert.equal(rows[c.id].recipe.shape, 'petal');
  assert.equal(r.done, 1); assert.equal(r.retried, 1); assert.equal(r.fallback, 1);
});

test('tick: 콘텐츠 필터는 재시도 없이 대체 레시피', async () => {
  const a = order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  const w = world({ orders: [a], reply: () => completion('', 'content_filter') });
  const r = await tick(w);
  assert.equal(rowsById(w)[a.id].status, 'fallback');
  assert.equal(r.fallback, 1); assert.equal(r.retried, 0);
});

test('tick: 전부 실패면 알림 1회 + error=all_failed', async () => {
  const w = world({ orders: [order('a'), order('b')], reply: () => new Response('x', { status: 500 }) });
  const r = await tick(w);
  assert.equal(w.calls.notified.length, 1);
  assert.match(r.error, /^all_failed: http_500/);
});

test('tick: 429 는 알림 없이 멈추고 주문은 건드리지 않아 다음 틱이 다시 처리', async () => {
  const many = Array.from({ length: 20 }, (_, i) => order(`id-${i}`));
  const w = world({ orders: many, reply: () => new Response('slow', { status: 429 }) });
  const r = await tick(w);
  assert.equal(r.error, 'rate_limited');
  assert.equal(w.calls.notified.length, 0);
  assert.equal(w.calls.upserts.length, 0);
  assert.ok(w.calls.exaone.length <= CONCURRENCY, `멈춘 뒤 추가 호출 없음 (${w.calls.exaone.length})`);
  assert.equal(w.calls.runs[0].error, 'rate_limited');
});

test('tick: 401·403 은 키 문제라 메일 1회, 주문은 그대로', async () => {
  const w = world({ orders: [order('a'), order('b')], reply: () => new Response('no', { status: 401 }) });
  const r = await tick(w);
  assert.equal(r.error, 'auth');
  assert.equal(w.calls.notified.length, 1);
  assert.equal(w.calls.upserts.length, 0);
});

test('final: 남은 대기·제출 주문은 카드 기반 대체 레시피이고 EXAONE 은 부르지 않는다', async () => {
  const w = world({ orders: [order('p1'), order('s1', { status: 'submitted', batch_id: 'msgbatch_old' })] });
  const r = await runAuraCron(ENV, { phase: 'final', fetch: w.fetch, notify: w.notify, now: 0 });
  assert.equal(r.fallback, 2);
  assert.equal(w.calls.exaone.length, 0);
  assert.ok(w.calls.upserts[0].every(x => x.status === 'fallback' && x.recipe.shape === 'petal'));
});

test('final: 대체로 마감한 주문이 있으면 알림 1회, 없으면 조용히', async () => {
  const w = world({ orders: [order('s1')] });
  await runAuraCron(ENV, { phase: 'final', fetch: w.fetch, notify: w.notify, now: 0 });
  assert.equal(w.calls.notified.length, 1);
  const quiet = world();
  await runAuraCron(ENV, { phase: 'final', fetch: quiet.fetch, notify: quiet.notify, now: 0 });
  assert.equal(quiet.calls.notified.length, 0);
});

test('설정 없으면 건너뛰고(옛 Anthropic 키만 있어도), 실패는 메일', async () => {
  assert.ok((await runAuraCron({}, { phase: 'tick' })).skipped);
  const { EXAONE_API_KEY: _k, ...noKey } = ENV;
  assert.ok((await runAuraCron({ ...noKey, ANTHROPIC_API_KEY: 'old' }, { phase: 'tick' })).skipped);
  const w = world();
  const broken = async (url) => { if (String(url).includes('ai_pregen_runs')) return new Response(null, { status: 201 }); throw new Error('down'); };
  const r = await runAuraCron(ENV, { phase: 'tick', fetch: broken, notify: w.notify, now: 0 });
  assert.ok(r.error);
  assert.equal(w.calls.notified.length, 1);
});

test('크론 등록: wrangler 와 scheduled 분기', () => {
  const src = rel => readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
  const wr = src('wrangler.jsonc'), wk = src('worker/index.js');
  for (const c of [AURA_TICK_CRON, AURA_FINAL_CRON]) {
    assert.ok(wr.includes(`"${c}"`), `wrangler.jsonc 에 ${c}`);
    assert.ok(wk.includes(`event.cron === '${c}'`), `scheduled 에 ${c} 분기`);
  }
});
