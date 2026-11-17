import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const en = readFileSync(new URL('../js/i18n-en.js', import.meta.url), 'utf8');

test('미리 채움 분기가 캐릭터 선택창에 연결돼 있다', () => {
  assert.ok(html.includes("from './js/exp-e7-boot.js'"));
  assert.ok(html.includes("from './js/char-prefill.js'"));
  assert.ok(html.includes('const prefill = !change && namePrefillOn(e7Decision());'));
  assert.ok(html.includes("$('char-modal').classList.toggle('prefill', prefill);"));
  assert.ok(html.includes('id="nick-dice"'));
});

test('기본 이름 그대로 시작하면 source 가 default 다', () => {
  assert.ok(html.includes("pf?.isDefault(nick.value.trim()) ? 'default' : 'new'"));
});

test('모바일 배치 변경은 세로 화면에만 적용된다', () => {
  assert.ok(html.includes('@media (max-width: 640px) and (orientation: portrait) {\n    #char-modal.prefill #char-layout { flex-direction: column; }'));
});

test('새 문구에 영어가 있다', () => {
  assert.ok(html.includes('이름은 메뉴에서 언제든 바꿀 수 있어요'));
  assert.ok(en.includes("'이름은 메뉴에서 언제든 바꿀 수 있어요': 'You can change your name anytime from the menu'"));
});
