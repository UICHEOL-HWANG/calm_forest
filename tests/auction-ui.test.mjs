import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { whoLine, resultLine, feedLine, barColor, itemVisual, callLine, waitHtml } from '../js/auction/ui.js';

const names = { curator: '큐레이터', stargazer: '별 보는 아이', builder: '목수 아저씨' };
const t = s => s;

test('whoLine', () => {
  assert.equal(whoLine(null, names, t), '시작가예요');
  assert.equal(whoLine('me', names, t), '🙋 지금 1등');
  assert.equal(whoLine('builder', names, t), '목수 아저씨 1등');
});

test('feedLine', () => {
  assert.equal(feedLine({ who: 'me', inc: 30, price: 260 }, names, t), '🙋 내 입찰 +30 → 🪙260');
  assert.equal(feedLine({ who: 'stargazer', inc: 10, price: 270 }, names, t), '별 보는 아이 +10 → 🪙270');
});

test('resultLine win', () => {
  assert.deepEqual(resultLine({ outcome: 'win', price: 430, leader: 'me' }, '달빛 그네', names, t), { title: '달빛 그네 낙찰!', sub: '🧺 보관함에 넣었어요' });
});

test('resultLine lose and watch name the villager', () => {
  assert.equal(resultLine({ outcome: 'lose', price: 450, leader: 'curator' }, '달빛 그네', names, t).title, '큐레이터에게 낙찰');
  assert.equal(resultLine({ outcome: 'watch', price: 380, leader: 'stargazer' }, '달빛 그네', names, t).title, '별 보는 아이에게 낙찰');
});

test('resultLine unsold, including a null leader', () => {
  assert.deepEqual(resultLine({ outcome: 'none', price: 0, leader: null }, '달빛 그네', names, t), { title: '유찰됐어요', sub: '' });
  assert.equal(resultLine({ outcome: 'none', price: 200, leader: 'curator' }, '달빛 그네', names, t).title, '유찰됐어요');
  assert.equal(resultLine({ outcome: 'watch', price: 200, leader: null }, '달빛 그네', names, t).title, '유찰됐어요');
  assert.equal(resultLine({ outcome: 'lose', price: 200, leader: null }, '달빛 그네', names, t).title, '유찰됐어요');
});

test('resultLine routes every string through t', () => {
  const up = s => `<${s}>`;
  assert.equal(resultLine({ outcome: 'win', price: 1, leader: 'me' }, '그네', names, up).title, '<{0} 낙찰!>'.replace('{0}', '<그네>'));
});

test('barColor', () => {
  assert.equal(barColor(6), '#8fd3a0');
  assert.equal(barColor(3), '#f2c14e');
  assert.equal(barColor(1), '#e8774a');
});

test('itemVisual shows the catalog icon, not an image', () => {
  const html = itemVisual('🌙');
  assert.match(html, /<span class="au-ico"[^>]*>🌙<\/span>/);
  assert.doesNotMatch(html, /<img/);
  assert.equal(itemVisual('<b>'), '<span class="au-ico" aria-hidden="true">&lt;b&gt;</span>');
});

test('callLine routes the countdown and extension through t', () => {
  const up = s => `<${s}>`;
  assert.equal(callLine('⏱️ 연장!', up), '<⏱️ 연장!>');
  assert.equal(callLine('3…', up), '<3…>');
  assert.equal(callLine('', up), '');
});

test('the waiting view can be closed without joining', () => {
  for (const mode of ['bid', 'watch']) {
    const html = waitHtml({ mode, start: 200 }, t);
    assert.match(html, /data-act="close"[^>]*>닫기</, mode);
    assert.match(html, /data-act="watch"/, mode);
  }
  assert.match(waitHtml({ mode: 'bid', start: 200 }, t), /data-act="bid"/);
  assert.doesNotMatch(waitHtml({ mode: 'watch', start: 200 }, t), /data-act="bid"/);
  assert.match(waitHtml({ mode: 'watch', start: 200 }, t), /시작가 🪙200/);
});

test('the window takes an icon getter, not a thumbnail renderer', () => {
  const src = readFileSync(new URL('../js/auction/ui.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /itemThumb|<img/);
  assert.match(src, /createAuctionUi\(\{[^}]*itemIcon/);
  assert.match(src, /call\.textContent = callLine\(state\.call, t\)/);
});
