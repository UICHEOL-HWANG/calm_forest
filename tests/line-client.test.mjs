import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLineClient, LOAD_TIMEOUT_MS, RETRY_MS } from '../js/lines/client.js';
import { FALLBACK } from '../js/lines/fallback.js';
import { AUCTION_ITEMS, ANY, slotsFor, lineProblem } from '../js/lines/slots.js';

const body = { date: '2026-11-10', src: 'pool', lines: { _any: { raise_npc: [{ id: 1, text: '{who}께서 부르셨소!' }, { id: 2, text: '오, {who}!' }], last: [{ id: 3, text: '{oops} 더 없소?' }] } } };
const okFetch = async () => new Response(JSON.stringify(body));

test('기본 문구는 모든 경매 칸을 채우고 검증을 통과한다', () => {
  for (const key of [...AUCTION_ITEMS, ANY]) {
    for (const slot of slotsFor('auction', key)) {
      const list = FALLBACK.auction[key]?.[slot];
      assert.ok(list?.length, `${key}/${slot}`);
      for (const text of list) assert.equal(lineProblem(text, { kind: 'auction', slot, lang: 'ko' }), null, text);
    }
  }
});

test('기본 문구 영어가 i18n-en 에 모두 있다', () => {
  const en = readFileSync(new URL('../js/i18n-en.js', import.meta.url), 'utf8');
  for (const slots of Object.values(FALLBACK.auction)) for (const list of Object.values(slots)) for (const ko of list) assert.ok(en.includes(`'${ko}'`), ko);
});

test('load 는 한 번만 부르고 결과를 캐시한다', async () => {
  let n = 0;
  const c = createLineClient({ api: '/api/lines', lang: 'ko', fetch: async (...a) => { n++; return okFetch(...a); } });
  const [a, b] = await Promise.all([c.load('auction', ['moonswing', ANY], '2026-11-10'), c.load('auction', ['moonswing', ANY], '2026-11-10')]);
  assert.equal(n, 1);
  assert.equal(a, b);
  assert.equal(c.peek('auction', ['moonswing', ANY], '2026-11-10').src, 'pool');
});

test('실패·api 없음이면 fallback', async () => {
  const c1 = createLineClient({ api: '/api/lines', lang: 'ko', fetch: async () => new Response('', { status: 500 }) });
  assert.equal((await c1.load('auction', [ANY], '2026-11-10')).src, 'fallback');
  const c2 = createLineClient({ api: '', lang: 'ko', fetch: okFetch });
  assert.equal((await c2.load('auction', [ANY], '2026-11-10')).src, 'fallback');
  assert.ok(LOAD_TIMEOUT_MS <= 3000);
});

test('line 은 풀 문구를 i 로 돌려 쓰고, 자리표시가 남으면 기본 문구로', async () => {
  const c = createLineClient({ api: '/api/lines', lang: 'ko', fetch: okFetch });
  const got = await c.load('auction', [ANY], '2026-11-10');
  assert.equal(c.line(got, 'auction', ANY, 'raise_npc', 0, { who: '목수 아저씨' }), '목수 아저씨께서 부르셨소!');
  assert.equal(c.line(got, 'auction', ANY, 'raise_npc', 3, { who: '목수 아저씨' }), '오, 목수 아저씨!');
  assert.equal(c.line(got, 'auction', ANY, 'last', 0), FALLBACK.auction[ANY].last[0]);
  assert.equal(c.line(null, 'auction', 'moonswing', 'intro', 0), FALLBACK.auction.moonswing.intro[0]);
});

test('기본 문구는 t 로 번역해 채운다', () => {
  const c = createLineClient({ api: '', lang: 'en', t: s => (s === FALLBACK.auction[ANY].sold_npc[0] ? 'It goes to {who}!' : s) });
  assert.equal(c.line(null, 'auction', ANY, 'sold_npc', 0, { who: 'Carpenter' }), 'It goes to Carpenter!');
});

test('실패한 불러오기는 1분 뒤에 다시 시도한다', async () => {
  let n = 0, clock = 1000, ok = false;
  const c = createLineClient({ api: '/api/lines', lang: 'ko', now: () => clock, fetch: async (...a) => { n++; return ok ? okFetch(...a) : new Response('', { status: 500 }); } });
  assert.equal(RETRY_MS, 60000);
  assert.equal((await c.load('auction', [ANY], '2026-11-10')).src, 'fallback');
  assert.equal(n, 1);
  clock += RETRY_MS - 1;
  assert.equal((await c.load('auction', [ANY], '2026-11-10')).src, 'fallback');
  assert.equal(n, 1);
  assert.equal(c.peek('auction', [ANY], '2026-11-10').src, 'fallback');
  ok = true;
  clock += 1;
  assert.equal((await c.load('auction', [ANY], '2026-11-10')).src, 'pool');
  assert.equal(n, 2);
});

test('성공한 불러오기는 1분이 지나도 다시 부르지 않는다', async () => {
  let n = 0, clock = 0;
  const c = createLineClient({ api: '/api/lines', lang: 'ko', now: () => clock, fetch: async (...a) => { n++; return okFetch(...a); } });
  await c.load('auction', [ANY], '2026-11-10');
  clock += RETRY_MS * 5;
  await c.load('auction', [ANY], '2026-11-10');
  assert.equal(n, 1);
});

test('api 가 비면 다시 시도하지 않는다', async () => {
  let n = 0, clock = 0;
  const c = createLineClient({ api: '', lang: 'ko', now: () => clock, fetch: async () => { n++; return okFetch(); } });
  await c.load('auction', [ANY], '2026-11-10');
  clock += RETRY_MS * 5;
  assert.equal((await c.load('auction', [ANY], '2026-11-10')).src, 'fallback');
  assert.equal(n, 0);
});
