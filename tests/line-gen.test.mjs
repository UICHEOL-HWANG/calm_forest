import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLineRequest, parseLines, validateLines, planLineWork, generateCell, fillCells, PER_CALL, RATE_WAIT_MS } from '../functions/api/_line-gen.js';
import { cells } from '../js/lines/slots.js';

const env = { EXAONE_API_KEY: 'k' };
const reply = lines => async () => new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ lines }) } }] }));
const now = async fn => fn();

test('영어 요청에는 한글이 한 글자도 없다', () => {
  for (const c of cells('auction').filter(c => c.lang === 'en')) {
    const body = buildLineRequest(c, PER_CALL);
    assert.doesNotMatch(JSON.stringify(body.messages), /[가-힣]/, `${c.key}/${c.slot}`);
  }
});

test('한국어 요청은 하오체 상인과 slot 상한·개수를 담는다', () => {
  const body = buildLineRequest({ kind: 'auction', key: 'moonswing', slot: 'intro', lang: 'ko' }, 10);
  const all = body.messages.map(m => m.content).join('\n');
  assert.match(all, /하오체/);
  assert.match(all, /60자/);
  assert.match(all, /10줄/);
  assert.match(all, /초승달/);
  assert.equal(body.model, 'k-exaone_v2.5');
  assert.equal(body.reasoning_effort, 'low');
});

test('{who} slot 요청은 자리표시와 조사 규칙을 알려 준다', () => {
  const all = buildLineRequest({ kind: 'auction', key: '_any', slot: 'raise_npc', lang: 'ko' }, 10).messages.map(m => m.content).join('\n');
  assert.match(all, /\{who\}/);
  assert.match(all, /조사/);
});

test('parseLines 는 lines 배열의 문자열만 다듬어 꺼낸다', () => {
  assert.deepEqual(parseLines('```json\n{"lines":[" 좋소! ", 3, "\\"더 없소?\\""]}\n```'), ['좋소!', '더 없소?']);
  assert.throws(() => parseLines('없음'));
});

test('validateLines 는 문제 줄과 중복을 버리고 이유를 센다', () => {
  const seen = new Set(['더 없소?']);
  const r = validateLines(['더 없소?', '마지막이오!', '마지막이오!', '3초 남았소!', 'Last call!'], { kind: 'auction', key: '_any', slot: 'last', lang: 'ko' }, seen);
  assert.deepEqual(r.ok, ['마지막이오!']);
  assert.deepEqual(r.dropped, { dup: 2, digit: 1, lang: 1 });
});

test('planLineWork 는 모자란 칸을 적게 찬 순서로, 호출당 최대 PER_CALL 줄로 나눈다', () => {
  const counts = [{ kind: 'auction', key: '_any', slot: 'last', lang: 'ko', n: 25 }];
  const plan = planLineWork(counts, { kinds: ['auction'], cap: 30, maxCalls: 1000 });
  assert.equal(plan.length, 21 * 3 + 1);
  assert.deepEqual(plan.at(-1), { cell: { kind: 'auction', key: '_any', slot: 'last', lang: 'ko' }, want: 5 });
  assert.equal(planLineWork(counts, { kinds: ['auction'], cap: 30, maxCalls: 4 }).length, 4);
});

test('generateCell 은 검증한 줄을 want 개까지 돌려준다', async () => {
  const cell = { kind: 'auction', key: '_any', slot: 'last', lang: 'ko' };
  const r = await generateCell(env, cell, 1, { fetch: reply(['마지막이오!', '더 없소?']), seen: new Set() });
  assert.deepEqual(r.lines, ['마지막이오!']);
  assert.equal(r.failure, null);
});

test('generateCell 실패 분류', async () => {
  const cell = { kind: 'auction', key: '_any', slot: 'last', lang: 'ko' };
  assert.equal((await generateCell(env, cell, 5, { fetch: async () => new Response('', { status: 429 }), seen: new Set() })).failure, 'rate_limited');
  assert.equal((await generateCell(env, cell, 5, { fetch: async () => new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: '몰라요' } }] })), seen: new Set() })).failure, 'parse');
  assert.equal((await generateCell(env, cell, 5, { fetch: reply(['3초!']), seen: new Set() })).failure, 'empty');
});

test('fillCells 는 빈 응답을 RETRIES 번 다시 부르고, 429 는 기다렸다 다시 부르며, 인증 실패면 멈춘다', async () => {
  const cell = { kind: 'auction', key: '_any', slot: 'last', lang: 'ko' };
  const wait = async () => {};
  let n = 0;
  const flaky = async () => { n++; return n < 3 ? new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: 'x' } }] })) : reply(['마지막이오!'])(); };
  const a = await fillCells(env, [{ cell, want: 5 }], { fetch: flaky, pace: now, maxCalls: 10, limit: 1, wait });
  assert.equal(n, 3);
  assert.deepEqual(a.rows, [{ ...cell, text: '마지막이오!' }]);

  let m = 0;
  const limited = async () => { m++; return m < 3 ? new Response('', { status: 429 }) : reply(['마지막이오!'])(); };
  const waits = [];
  const b = await fillCells(env, [{ cell, want: 5 }], { fetch: limited, pace: now, maxCalls: 10, limit: 1, wait: async ms => { waits.push(ms); } });
  assert.deepEqual(b.rows, [{ ...cell, text: '마지막이오!' }]);
  assert.equal(b.stopped, null);
  assert.equal(b.calls, 3);
  assert.deepEqual(waits, [RATE_WAIT_MS, RATE_WAIT_MS]);

  const c = await fillCells(env, [{ cell, want: 5 }], { fetch: async () => new Response('', { status: 429 }), pace: now, maxCalls: 10, limit: 1, wait });
  assert.equal(c.failed, 1);
  assert.equal(c.stopped, null);
  assert.equal(c.calls, 3);
  assert.match(c.firstError, /rate_limited/);

  const d = await fillCells(env, [{ cell, want: 5 }, { cell, want: 5 }], { fetch: async () => new Response('', { status: 401 }), pace: now, maxCalls: 10, limit: 1, wait });
  assert.equal(d.stopped, 'auth');
  assert.equal(d.calls, 1);
});

test('fillCells 는 maxCalls 를 넘겨 부르지 않는다', async () => {
  const cell = { kind: 'auction', key: '_any', slot: 'last', lang: 'ko' };
  let n = 0;
  const fetch = async () => { n++; return new Response('', { status: 500 }); };
  const r = await fillCells(env, [{ cell, want: 5 }, { cell, want: 5 }], { fetch, pace: now, maxCalls: 4, limit: 1 });
  assert.equal(n, 4);
  assert.equal(r.calls, 4);
});

test('보강한 프롬프트: 하오체 어미·문장부호·고어 금지 지시가 들어간다', () => {
  const ko = buildLineRequest({ kind: 'auction', key: '_any', slot: 'last', lang: 'ko' }, 10).messages[0].content;
  assert.match(ko, /~구려/);
  assert.match(ko, /마침표, 느낌표, 물음표/);
  assert.match(ko, /더 없소\?/);
  const en = buildLineRequest({ kind: 'auction', key: '_any', slot: 'last', lang: 'en' }, 10).messages[0].content;
  assert.match(en, /Never use archaic words/);
  assert.match(en, /Any more bids\?/);
});
