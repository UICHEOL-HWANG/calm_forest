import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bookHtml } from '../js/hud/collection-book.js';

const src = readFileSync(new URL('../js/hud/collection-book.js', import.meta.url), 'utf8');

test('잡은 칸은 아이콘+이름, 빈 칸은 ❔', () => {
  const html = bookHtml({ sections: [{ title: '강 물고기', slots: [{ id: 'common', ico: '🐟', label: '피라미', got: true }, { id: 'rare', ico: '🌈', label: '무지개', got: false }] }] });
  assert.match(html, /<div class="cb-sec">강 물고기<\/div>/);
  assert.match(html, /<button class="cb-slot" data-k="0:0">🐟<small>피라미<\/small><\/button>/);
  assert.match(html, /<button class="cb-slot empty" data-k="0:1">❔<\/button>/);
  assert.doesNotMatch(html, /무지개/);
});

test('섹션 번호가 data-k 에 들어간다', () => {
  const html = bookHtml({ sections: [{ title: 'A', slots: [] }, { title: 'B', slots: [{ id: 'x', ico: '🐠', label: '9.2kg', got: true }] }] });
  assert.match(html, /data-k="1:0"/);
});

test('글자는 이스케이프', () => {
  const html = bookHtml({ sections: [{ title: '<b>', slots: [{ id: 'x', ico: '🐟', label: 'a"<', got: true }] }] });
  assert.match(html, /&lt;b&gt;/);
  assert.match(html, /a&quot;&lt;/);
});

test('모달 id 는 -modal 로 끝난다(anyModalOpen)', () => {
  assert.match(src, /'collection-book-modal'/);
});

test('주석 없음', () => {
  assert.doesNotMatch(src, /^\s*\/\//m);
  assert.doesNotMatch(src, /\/\*/);
});

test('열려 있는 동안 Escape 로 닫힌다', () => {
  const s = readFileSync(new URL('../js/hud/collection-book.js', import.meta.url), 'utf8');
  assert.match(s, /document\.addEventListener\('keydown', e => \{ if \(e\.key === 'Escape' && isBookOpen\(\)\) closeBook\(\); \}\);/);
});
