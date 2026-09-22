import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readBearer, safeEqual, isIngestAuthorized } from '../functions/api/_cards-auth.js';

const req = (headers) => new Request('https://x/api/cards-topics', { headers });

test('readBearer: Authorization 헤더에서 토큰만 꺼낸다', () => {
  assert.equal(readBearer(req({ Authorization: 'Bearer abc.def' })), 'abc.def');
  assert.equal(readBearer(req({ Authorization: 'bearer abc' })), 'abc', '대소문자를 가리지 않는다');
  assert.equal(readBearer(req({ Authorization: 'Basic abc' })), null);
  assert.equal(readBearer(req({})), null);
});

test('safeEqual: 길이가 달라도 터지지 않고 false', () => {
  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('abc', 'abcd'), false);
  assert.equal(safeEqual('', ''), false, '빈 값끼리는 통과시키지 않는다 — 시크릿 미설정 사고 방지');
  assert.equal(safeEqual(undefined, undefined), false);
});

test('isIngestAuthorized: 시크릿이 맞을 때만 true', () => {
  const env = { CARDNEWS_INGEST_SECRET: 's3cret' };
  assert.equal(isIngestAuthorized(req({ 'x-cardnews-secret': 's3cret' }), env), true);
  assert.equal(isIngestAuthorized(req({ 'x-cardnews-secret': 'wrong' }), env), false);
  assert.equal(isIngestAuthorized(req({}), env), false);
});

test('isIngestAuthorized: 서버에 시크릿이 없으면 무조건 false', () => {
  // 환경변수를 안 넣은 채 배포하면 아무나 통과하는 사고가 난다 — 막아 둔다
  assert.equal(isIngestAuthorized(req({ 'x-cardnews-secret': '' }), {}), false);
  assert.equal(isIngestAuthorized(req({ 'x-cardnews-secret': 'anything' }), {}), false);
});
