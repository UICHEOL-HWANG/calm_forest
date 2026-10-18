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

test('옛 버튼 묶음(#util-btns)의 버튼은 전부 ☰ 카드에도 있다', () => {
  const start = HTML.indexOf('<div id="util-btns"');
  const block = HTML.slice(start, HTML.indexOf('id="feedback-tab"', start));
  const ids = [...block.matchAll(/<button[^>]*\bid="([^"]+)"/g)].map(m => m[1]);
  assert.ok(ids.length >= 10, `util-btns 버튼이 ${ids.length}개`);
  const cats = SHEET.slice(SHEET.indexOf('const CATS = ['), SHEET.indexOf('];', SHEET.indexOf('const CATS = [')));
  for (const id of ids) assert.ok(cats.includes(`'${id}'`), `${id} 가 ☰ 카드(CATS)에 없다`);
});

test('🎁 꾸미기 세트는 📒 기록 묶음, 사진첩 바로 다음', () => {
  assert.match(SHEET, /\['📒', '기록', \[\['album-btn', '📸'\], \['decor-set-btn', '🎁'\],/);
});
