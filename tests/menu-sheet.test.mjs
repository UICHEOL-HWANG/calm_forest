import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SHEET = read('js/hud/menu-sheet.js');
const MOBILE = read('js/hud/mobile-hud.js');
const HTML = read('index.html');

test('카드 메뉴는 한 모듈·한 개 — 모바일 HUD 는 넘겨받은 카드를 연다', () => {
  assert.match(SHEET, /export function createMenuSheet\(/);
  assert.equal((HTML.match(/createMenuSheet\(\{/g) || []).length, 1, 'index.html 에서 한 번만 만든다(id 중복 방지)');
  assert.match(HTML, /initHudShell\(\{ Input, t, trackEvent, menu: menuSheet \}\)/);
  assert.match(read('js/hud/hud-shell.js'), /menu\.open\(\);/);
  assert.doesNotMatch(MOBILE, /const CATS = \[/);
});

test('카드는 화면 높이를 넘으면 스크롤 — 옛 iOS(dvh 미지원)엔 vh 로 먼저 깐다', () => {
  assert.match(SHEET, /max-height: calc\(100vh[^;]*;\s*max-height: calc\(100dvh[^;]*; overflow-y: auto;/);
});

test('PC ☰ 도 긴 목록 대신 같은 카드를 연다', () => {
  assert.match(HTML, /import \{ createMenuSheet \} from '\.\/js\/hud\/menu-sheet\.js';/);
  assert.match(HTML, /\$\('menu-btn'\)\.addEventListener\('click', \(\) => \{ \$\('emote-pop'\)\.classList\.remove\('show'\); menuSheet\.open\(\); \}\);/);
  assert.doesNotMatch(HTML, /\$\('topleft'\)\.classList\.toggle\('open'\)/);
});

test('안 읽은 소식 점은 PC ☰ 에도 붙는다', () => {
  assert.match(HTML, /setUnread\(n\) \{ shell\?\.setUnread\(n\); menuSheet\.setUnread\(n\); \}/);
});
