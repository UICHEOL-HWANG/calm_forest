import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// 🐾 캐릭터 선택 모달의 3D 프리뷰(#char-preview) — 모달이 닫힌 뒤에도 두 번째 WebGL 렌더러가
//    계속 그리던 문제(2026-10-05 실측: 닫힌 뒤 1.5초에 draw 2,160회). 열 때 start, 닫을 때 stop.

const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const body = (() => {
  const i = HTML.indexOf('showCharacterSelect(opts = {}) {');
  assert.ok(i >= 0, 'showCharacterSelect 없음');
  return HTML.slice(i, HTML.indexOf('showTutorial(src', i));
})();

test('모달을 열면 프리뷰 렌더 루프를 다시 켠다(바꾸기 모드로 다시 열 때)', () => {
  assert.match(body, /ui\._charPreview\.start\(\)/);
});

test('열기 rAF 전에 닫혔으면 프리뷰를 만들거나 켜지 않는다', () => {
  const raf = body.slice(body.indexOf('requestAnimationFrame(() => {'));
  const guard = raf.indexOf("if (!$('char-modal').classList.contains('show')) return;");
  assert.ok(guard > 0 && guard < raf.indexOf('_charPreview.start()'), '가드가 start 보다 먼저');
});

test('모달을 닫는 길은 모두 프리뷰 루프를 세운다', () => {
  const closes = body.match(/\$\('char-modal'\)\.classList\.remove\('show'\)/g) || [];
  assert.equal(closes.length, 1, '닫기는 closeCharModal 한 곳에서만 — 직접 remove 하면 루프가 남는다');
  assert.match(body, /const closeCharModal = \(\) => \{[^}]*classList\.remove\('show'\);[^}]*_charPreview\?\.stop\(\)/);
  assert.match(body, /\$\('char-cancel'\)\.onclick = closeCharModal/);
  const confirm = body.slice(body.indexOf("$('char-confirm').onclick"));
  assert.match(confirm, /closeCharModal\(\)/);
});

test('js/ 쪽에서 char-modal 을 직접 닫지 않는다(닫으면 stop 이 빠진다)', () => {
  const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.doesNotMatch(game, /char-modal'\)\.classList\.remove/);
});
