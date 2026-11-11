import { test } from 'node:test';
import assert from 'node:assert/strict';
import { callExaone, failKind, parseJsonObject, createPacer, mapLimit, EXAONE_URL, EXAONE_MODEL } from '../functions/api/_exaone.js';

const env = { EXAONE_API_KEY: 'k' };

test('callExaone 은 성공 응답에서 finish 와 text 를 꺼낸다', async () => {
  let seen;
  const fetch = async (url, init) => { seen = { url, init }; return new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: '{"lines":[]}' } }] })); };
  const r = await callExaone(env, { model: EXAONE_MODEL }, fetch);
  assert.deepEqual(r, { ok: true, finish: 'stop', text: '{"lines":[]}' });
  assert.equal(seen.url, EXAONE_URL);
  assert.equal(seen.init.headers.authorization, 'Bearer k');
});

test('callExaone 은 HTTP 오류와 네트워크 오류를 ok:false 로 돌려준다', async () => {
  assert.deepEqual(await callExaone(env, {}, async () => new Response('', { status: 429 })), { ok: false, status: 429, reason: 'http_429' });
  assert.deepEqual(await callExaone(env, {}, async () => { throw new TypeError('x'); }), { ok: false, status: 0, reason: 'network' });
});

test('failKind', () => {
  assert.equal(failKind({ ok: true }), null);
  assert.equal(failKind({ ok: false, status: 429 }), 'rate_limited');
  assert.equal(failKind({ ok: false, status: 401 }), 'auth');
  assert.equal(failKind({ ok: false, status: 403 }), 'auth');
  assert.equal(failKind({ ok: false, status: 500, reason: 'http_500' }), 'http_500');
});

test('parseJsonObject 는 코드펜스와 앞뒤 글자를 걷어 낸다', () => {
  assert.deepEqual(parseJsonObject('여기요\n```json\n{"a":1}\n```'), { a: 1 });
  assert.throws(() => parseJsonObject('없음'), /no_json/);
});

test('createPacer 는 호출 시작 사이에 간격을 둔다', async () => {
  const starts = [];
  const pace = createPacer(30);
  const t0 = Date.now();
  await Promise.all([1, 2, 3].map(() => pace(async () => { starts.push(Date.now() - t0); })));
  assert.ok(starts[1] - starts[0] >= 25);
  assert.ok(starts[2] - starts[1] >= 25);
});

test('mapLimit 은 동시 수를 지키고 halted 면 haltValue 를 채운다', async () => {
  let live = 0, peak = 0, stop = false;
  const out = await mapLimit([1, 2, 3, 4, 5], 2, async n => {
    live++; peak = Math.max(peak, live);
    await new Promise(r => setTimeout(r, 5));
    live--;
    if (n === 2) stop = true;
    return n;
  }, () => stop, 'H');
  assert.equal(peak, 2);
  assert.deepEqual(out.slice(0, 2), [1, 2]);
  assert.ok(out.includes('H'));
});
