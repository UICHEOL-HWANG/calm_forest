import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { UI_FONT, needsEmojiFont, fontsReady, EMOJI_CSS } from '../js/fonts.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

function fakeDoc() {
  const loads = [];
  const added = [];
  return {
    loads, added,
    fonts: { load: (font, text) => { loads.push([font, text]); return Promise.resolve([]); } },
    createElement: () => ({}),
    head: { appendChild: (el) => { added.push(el); el.onload(); } },
  };
}

test('UI_FONT: Pretendard 가 맨 앞, 이모지 글꼴이 sans-serif 앞에 있다', () => {
  assert.match(UI_FONT, /^Pretendard, /);
  assert.match(UI_FONT, /"Segoe UI Emoji", "Noto Color Emoji", sans-serif$/);
});

test('needsEmojiFont: 윈도우만', () => {
  assert.equal(needsEmojiFont('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120'), true);
  assert.equal(needsEmojiFont('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'), false);
  assert.equal(needsEmojiFont('Mozilla/5.0 (Linux; Android 14)'), false);
});

test('fontsReady: 맥은 Pretendard 두 굵기만, 윈도우는 이모지 CSS 를 붙이고 새 이모지까지 받는다', async () => {
  const mac = fakeDoc();
  await fontsReady({ doc: mac, ua: 'Macintosh' });
  assert.deepEqual(mac.loads.map(([f]) => f), ['400 16px Pretendard', '700 16px Pretendard']);
  assert.equal(mac.added.length, 0);
  const win = fakeDoc();
  await fontsReady({ doc: win, ua: 'Windows NT 10.0' });
  assert.equal(win.added[0].href, EMOJI_CSS);
  assert.ok(win.loads.some(([f, t]) => f.includes('Noto Color Emoji') && t.includes('🪵') && t.includes('🪨')));
});

test('fontsReady: 글꼴이 안 오면 기다리지 않고 넘어간다', async () => {
  const doc = { fonts: { load: () => new Promise(() => {}) } };
  await fontsReady({ doc, ua: 'Macintosh', timeout: 5 });
  await fontsReady({ doc: {} });
});

test('index.html: Pretendard 를 저장소에서 싣고, 월드를 짓기 전에 글꼴을 기다린다', () => {
  const html = read('index.html');
  assert.match(html, /@font-face \{ font-family: Pretendard; font-weight: 100 599;[^}]*Pretendard-Regular\.subset\.woff2/);
  assert.match(html, /@font-face \{ font-family: Pretendard; font-weight: 600 900;[^}]*Pretendard-Bold\.subset\.woff2/);
  assert.match(html, /html, body \{[^}]*font-family: Pretendard, /);
  assert.match(html, /worldP = Promise\.all\(\[loadGameModules\(\), fontsReady\(\), loadCanvasIcons\(\)\.catch\(\(\) => \{\}\)\]\)/);
  for (const w of ['Regular', 'Bold']) assert.ok(statSync(new URL(`../assets/fonts/Pretendard-${w}.subset.woff2`, import.meta.url)).size > 200000);
});

test('모든 빌드가 assets/fonts 를 싣는다', () => {
  assert.match(read('scripts/build-web.mjs'), /'assets\/fonts',/);
  assert.match(read('scripts/build-ait.mjs'), /cpSync\('assets\/fonts', 'dist-toss\/assets\/fonts'/);
  assert.match(read('scripts/build-cap.mjs'), /cpSync\('assets\/fonts', `\$\{OUT\}\/assets\/fonts`/);
  assert.match(read('scripts/build-itch.mjs'), /cpSync\('assets\/fonts', `\$\{OUT\}\/assets\/fonts`/);
});

test('캔버스 글자는 맨 sans-serif 만 쓰지 않는다(윈도우에서 맑은 고딕·□ 이모지)', () => {
  const root = new URL('../js/', import.meta.url).pathname;
  const bad = [];
  const walk = (d) => readdirSync(d).forEach((n) => {
    const p = join(d, n);
    if (statSync(p).isDirectory()) return walk(p);
    if (!p.endsWith('.js')) return;
    readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
      if (/\.font\s*=/.test(line) && /sans-serif/.test(line) && !/Color Emoji/.test(line)) bad.push(`${p}:${i + 1}`);
    });
  });
  walk(root);
  assert.deepEqual(bad, []);
});
