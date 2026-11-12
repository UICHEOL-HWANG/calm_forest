import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captureTouch, playReferrer } from '../js/app-banner.js';

const id = () => 'J1';

test('첫 방문 기록에 gift 를 담고 새 코드가 오면 바꾼다', () => {
  const a = captureTouch('?gift=insta1', null, 1, id);
  assert.equal(a.gift, 'INSTA1');
  assert.equal(captureTouch('', a, 2, id), a);
  const c = captureTouch('?gift=THREAD2', a, 3, id);
  assert.equal(c.gift, 'THREAD2');
  assert.equal(c.jid, 'J1');
  assert.equal(captureTouch('', null, 1, id).gift, undefined);
});

test('Play referrer 에 gift 를 싣는다', () => {
  assert.match(decodeURIComponent(playReferrer({ jid: 'J1', utm: { source: 'meta' }, gift: 'INSTA1' })), /(^|&)gift=INSTA1(&|$)/);
  assert.doesNotMatch(decodeURIComponent(playReferrer({ jid: 'J1', gift: 'bad!' })), /gift=/);
});

test('app-banner 는 첫 화면 번들을 위해 code.js 만 가져온다', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../js/app-banner.js', import.meta.url), 'utf8');
  assert.match(src, /from '\.\/promo-gift\/code\.js'/);
  assert.doesNotMatch(src, /promo-gift\/rules\.js/);
});
