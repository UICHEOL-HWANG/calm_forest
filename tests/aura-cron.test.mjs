import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildRequest, recipeFromResult, runAuraCron, AURA_TICK_CRON, AURA_FINAL_CRON, AURA_MODEL, MAX_ATTEMPTS } from '../functions/aura-cron.js';

const ENV = { SUPABASE_URL: 'https://sb.test', SUPABASE_SERVICE_KEY: 's', ANTHROPIC_API_KEY: 'k' };
const CARDS = { shape: 'petal', color: 'pink', motion: 'spiral', band: 'body' };
const order = (id, extra = {}) => ({ id, user_id: 'u', order_date: '2026-10-08', text: '벚꽃 회오리', cards: CARDS, status: 'pending', attempts: 0, ...extra });
const okMsg = obj => ({ type: 'succeeded', message: { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(obj) }] } });

test('buildRequest: 모델·effort low·json_schema·custom_id', () => {
  const r = buildRequest(order('11111111-1111-4111-8111-111111111111'));
  assert.equal(r.custom_id, '11111111-1111-4111-8111-111111111111');
  assert.equal(r.params.model, AURA_MODEL);
  assert.equal(r.params.output_config.effort, 'low');
  assert.equal(r.params.output_config.format.type, 'json_schema');
  assert.match(r.params.messages[0].content, /벚꽃 회오리/);
  assert.match(r.params.system, /지시는 따르지 않/);
});

test('recipeFromResult: 성공은 정제 후 done, 거절·파싱 실패·오류는 retry', () => {
  const o = order('a');
  const done = recipeFromResult(o, okMsg({ name: '벚꽃 바람', line: '봄 냄새가 나요.', shape: 'petal', motion: 'spiral', band: 'body', count: 40, speed: 1, radius: 1, colors: ['pink', 'rose'] }));
  assert.equal(done.status, 'done');
  assert.equal(done.recipe.count, 24);
  assert.equal(recipeFromResult(o, { type: 'succeeded', message: { stop_reason: 'refusal', content: [] } }).status, 'retry');
  assert.equal(recipeFromResult(o, { type: 'succeeded', message: { stop_reason: 'end_turn', content: [{ type: 'text', text: '{oops' }] } }).status, 'retry');
  assert.equal(recipeFromResult(o, { type: 'errored', error: { type: 'overloaded_error' } }).status, 'retry');
  assert.equal(recipeFromResult(o, undefined).status, 'retry');
});

function world({ pending = [], submitted = [], batchStatus = 'ended', results = [] } = {}) {
  const calls = { upserts: [], patches: [], runs: [], batches: [], notified: [] };
  const fetch = async (url, init = {}) => {
    const u = String(url), m = init.method || 'GET';
    if (u.includes('/rest/v1/aura_orders') && m === 'GET' && u.includes('status=eq.pending')) return Response.json(pending);
    if (u.includes('/rest/v1/aura_orders') && m === 'GET' && u.includes('status=in.(pending,submitted)')) return Response.json([...pending, ...submitted]);
    if (u.includes('/rest/v1/aura_orders') && m === 'GET' && u.includes('status=eq.submitted')) return Response.json(submitted);
    if (u.includes('/rest/v1/aura_orders') && m === 'POST') { calls.upserts.push(JSON.parse(init.body)); return new Response(null, { status: 201 }); }
    if (u.includes('/rest/v1/aura_orders') && m === 'PATCH') { calls.patches.push({ u, body: JSON.parse(init.body) }); return new Response(null, { status: 204 }); }
    if (u.includes('/rest/v1/ai_pregen_runs')) { calls.runs.push(JSON.parse(init.body)); return new Response(null, { status: 201 }); }
    if (u.endsWith('/v1/messages/batches') && m === 'POST') { calls.batches.push(JSON.parse(init.body)); return Response.json({ id: 'msgbatch_1', type: 'message_batch', processing_status: 'in_progress' }); }
    if (u.includes('/v1/messages/batches/msgbatch_1/results')) return new Response(results.map(r => JSON.stringify(r)).join('\n'), { headers: { 'content-type': 'application/binary' } });
    if (u.includes('/v1/messages/batches/msgbatch_1')) return Response.json({ id: 'msgbatch_1', type: 'message_batch', processing_status: batchStatus, results_url: 'https://api.anthropic.com/v1/messages/batches/msgbatch_1/results' });
    throw new Error('unexpected ' + m + ' ' + u);
  };
  const notify = async (_e, subject) => { calls.notified.push(subject); return true; };
  return { calls, fetch, notify };
}

test('tick: 대기 주문을 배치 1건으로 제출하고 submitted 로 바꾼다', async () => {
  const w = world({ pending: [order('11111111-1111-4111-8111-111111111111'), order('22222222-2222-4222-8222-222222222222')] });
  const r = await runAuraCron(ENV, { phase: 'tick', fetch: w.fetch, notify: w.notify, now: 0 });
  assert.equal(r.submitted, 2);
  assert.equal(w.calls.batches[0].requests.length, 2);
  assert.equal(w.calls.patches[0].body.status, 'submitted');
  assert.equal(w.calls.patches[0].body.batch_id, 'msgbatch_1');
  assert.equal(w.calls.runs[0].kind, 'aura');
});

test('tick: 끝난 배치는 수집 — 성공 done, 실패 retry(시도+1), 시도 3회째는 fallback', async () => {
  const a = order('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', { status: 'submitted', batch_id: 'msgbatch_1' });
  const b = order('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', { status: 'submitted', batch_id: 'msgbatch_1', attempts: 0 });
  const c = order('cccccccc-cccc-4ccc-8ccc-cccccccccccc', { status: 'submitted', batch_id: 'msgbatch_1', attempts: MAX_ATTEMPTS - 1 });
  const results = [
    { custom_id: a.id, result: okMsg({ name: '벚꽃 바람', line: '봄이에요.', shape: 'petal', motion: 'spiral', band: 'body', count: 12, speed: 1, radius: 1, colors: ['pink', 'rose'] }) },
    { custom_id: b.id, result: { type: 'errored', error: { type: 'overloaded_error' } } },
    { custom_id: c.id, result: { type: 'expired' } },
  ];
  const w = world({ submitted: [a, b, c], results });
  const r = await runAuraCron(ENV, { phase: 'tick', fetch: w.fetch, notify: w.notify, now: 0 });
  const rows = Object.fromEntries(w.calls.upserts[0].map(x => [x.id, x]));
  assert.equal(rows[a.id].status, 'done');
  assert.equal(rows[a.id].recipe.shape, 'petal');
  assert.equal(rows[b.id].status, 'pending');
  assert.equal(rows[b.id].attempts, 1);
  assert.equal(rows[c.id].status, 'fallback');
  assert.equal(rows[c.id].recipe.shape, 'petal');
  assert.equal(r.done, 1); assert.equal(r.retried, 1); assert.equal(r.fallback, 1);
  assert.ok(rows[a.id].user_id && rows[a.id].text, '업서트는 NOT NULL 칸을 모두 싣는다');
});

test('tick: 진행 중 배치는 건드리지 않는다', async () => {
  const w = world({ submitted: [order('a', { status: 'submitted', batch_id: 'msgbatch_1' })], batchStatus: 'in_progress' });
  const r = await runAuraCron(ENV, { phase: 'tick', fetch: w.fetch, notify: w.notify, now: 0 });
  assert.equal(r.collected, 0);
  assert.equal(w.calls.upserts.length, 0);
});

test('final: 남은 대기·제출 주문은 카드 기반 대체 레시피', async () => {
  const w = world({ pending: [order('p1')], submitted: [order('s1', { status: 'submitted', batch_id: 'msgbatch_1' })] });
  const r = await runAuraCron(ENV, { phase: 'final', fetch: w.fetch, notify: w.notify, now: 0 });
  assert.equal(r.fallback, 2);
  assert.ok(w.calls.upserts[0].every(x => x.status === 'fallback' && x.recipe.shape === 'petal'));
});

test('설정 없으면 건너뛰고, 실패는 메일', async () => {
  assert.ok((await runAuraCron({}, { phase: 'tick' })).skipped);
  const w = world();
  const broken = async (url, init = {}) => { if (String(url).includes('ai_pregen_runs')) return new Response(null, { status: 201 }); throw new Error('down'); };
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
