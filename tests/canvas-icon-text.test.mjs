import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setCanvasIcons, fillIconText, measureIconText, iconSrc } from '../js/icons/canvas-text.js';

const WOOD = { id: 'wood' }, ROCK = { id: 'rock' };

function fakeCtx(font = 'bold 20px Pretendard') {
  const calls = [];
  const state = { font, textAlign: 'center', textBaseline: 'alphabetic', direction: 'ltr' };
  const stack = [];
  return Object.assign(state, {
    calls,
    measureText: (s) => ({ width: s.length * 10 }),
    fillText: (...a) => calls.push(['text', ...a]),
    drawImage: (img, x, y, w, h) => calls.push(['img', img.id, Math.round(x), Math.round(y), Math.round(w)]),
    save: () => stack.push({ textAlign: state.textAlign }),
    restore: () => Object.assign(state, stack.pop()),
    translate: (x) => calls.push(['tx', Math.round(x)]),
    scale: (k) => calls.push(['sx', k]),
  });
}

setCanvasIcons({ '🪵': WOOD, '🪨': ROCK });

test('이모지가 없으면 fillText 그대로(maxWidth 포함)', () => {
  const c = fakeCtx();
  fillIconText(c, '무너진 다리', 100, 50);
  fillIconText(c, '닭장', 100, 50, 300);
  assert.deepEqual(c.calls, [['text', '무너진 다리', 100, 50], ['text', '닭장', 100, 50, 300]]);
});

test('이모지는 아이콘 그림으로, 글자는 이어서 왼쪽 기준으로 그리고 정렬은 되돌린다', () => {
  const c = fakeCtx();
  fillIconText(c, '🪵10 🪨5', 256, 136);
  const imgs = c.calls.filter((k) => k[0] === 'img').map((k) => k[1]);
  const texts = c.calls.filter((k) => k[0] === 'text').map((k) => k[1]);
  assert.deepEqual(imgs, ['wood', 'rock']);
  assert.deepEqual(texts, ['10 ', '5']);
  assert.equal(c.textAlign, 'center');
  const w = measureIconText(c, '🪵10 🪨5').width;
  assert.equal(c.calls.find((k) => k[0] === 'tx')[1], Math.round(256 - w / 2));
});

test('폭: 아이콘은 글자 크기의 약 1.2배, 변형 선택자(FE0F)도 같은 아이콘', () => {
  const c = fakeCtx('20px x');
  const w = measureIconText(c, '🪵').width;
  assert.ok(w > 20 && w < 28);
  assert.equal(measureIconText(c, '🪵️').width, w);
  assert.equal(measureIconText(c, 'abc').width, 30);
});

test('maxWidth 를 넘으면 가로로 줄인다', () => {
  const c = fakeCtx();
  fillIconText(c, '🪵 아주아주아주긴글자', 0, 0, 50);
  const k = c.calls.find((x) => x[0] === 'sx')[1];
  assert.ok(k < 1 && k > 0);
});

test('middle 기준선이면 아이콘을 y 가운데에', () => {
  const c = fakeCtx('40px x'); c.textBaseline = 'middle';
  fillIconText(c, '🪵', 64, 64);
  const [, , , y, size] = c.calls.find((k) => k[0] === 'img');
  assert.equal(y, Math.round(64 - size / 2));
});

test('iconSrc: 인라인 SVG 는 data URL, 토스페이스 원본은 상대 경로', () => {
  assert.match(iconSrc('<svg class="ti" viewBox="0 0 24 24"><path d="M0"/></svg>'), /^data:image\/svg\+xml;charset=utf-8,%3Csvg%20width%3D%2296%22/);
  assert.equal(iconSrc('<img class="ti" src="js/icons/tossface/u1F330.svg" alt="">'), 'js/icons/tossface/u1F330.svg');
});
