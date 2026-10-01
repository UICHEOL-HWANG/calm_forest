import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const cafe = readFileSync(new URL('../js/spaces/cafe.js', import.meta.url), 'utf8');
const rev = readFileSync(new URL('../js/shop/purchase-reveal.js', import.meta.url), 'utf8');

test('오버레이 마크업과 버튼', () => {
  for (const id of ['buy-reveal', 'br-canvas', 'br-name', 'br-desc', 'br-walk', 'br-close']) assert.match(html, new RegExp(`id="${id}"`), id);
});
test('id 중복 없음(런 결과 창과 br-close 충돌 방지)', () => {
  assert.equal((html.match(/id="br-close"/g) || []).length, 1);
});
test('연출은 reveal-pose 의 시간축·문구를 쓴다', () => {
  assert.match(rev, /from '\.\/reveal-pose\.js'/);
});
test('가게 onGranted 가 프리미엄 현금 구매에 연출을 띄운다', () => {
  assert.match(cafe, /playPurchaseReveal\(\{ itemId: c\.itemId/);
  assert.match(cafe, /trackEvent\('premium_reveal_close'/);
});
test('onGranted — 연출은 저장 뒤, try 안에서(장식이 지급 저장을 막지 않는다)', () => {
  const body = cafe.slice(cafe.indexOf('function onGranted('));
  const save = body.indexOf('requestSave()'), play = body.indexOf('playPurchaseReveal(');
  assert.ok(save > 0 && play > save, 'requestSave 가 먼저');
  assert.match(body.slice(save, play), /try \{\s*$/);
});
test('stopPurchaseReveal 이 --br-dim 을 0 으로 되돌린다', () => {
  assert.match(rev, /setProperty\('--br-dim', '0'\)/);
});
