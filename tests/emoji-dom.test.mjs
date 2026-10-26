import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { emojiPattern, splitByIcons } from '../js/icons/emoji-dom.js';
import { ICON_ALL } from '../js/icons/toss-icons-all.js';

const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const MAP = { '🎨': 'A', '⚙': 'B', '🧑‍🌾': 'C', '🧑': 'D', '🪙': 'E', '💎': 'F' };
const re = emojiPattern(MAP);

test('아이콘이 있는 이모지만 떼어내고 나머지 글자는 그대로 둔다', () => {
  assert.deepEqual(splitByIcons('🎨 꾸미기', re), [{ key: '🎨', raw: '🎨' }, ' 꾸미기']);
  assert.deepEqual(splitByIcons('🛸 UFO', re), null);
  assert.deepEqual(splitByIcons('그냥 글자', re), null);
});

test('변형 선택자가 붙은 이모지도 같은 아이콘으로 바꾸고 원래 글자는 보관한다', () => {
  assert.deepEqual(splitByIcons('⚙️ 설정', re), [{ key: '⚙', raw: '⚙️' }, ' 설정']);
});

test('ZWJ 이모지는 통째로 먼저 맞춘다', () => {
  assert.deepEqual(splitByIcons('🧑‍🌾 농부 🧑', re), [{ key: '🧑‍🌾', raw: '🧑‍🌾' }, ' 농부 ', { key: '🧑', raw: '🧑' }]);
});

test('여러 개가 붙어 있어도 순서대로 나눈다', () => {
  assert.deepEqual(splitByIcons('🪙340 · 💎2', re), [{ key: '🪙', raw: '🪙' }, '340 · ', { key: '💎', raw: '💎' }, '2']);
});

test('전체 맵의 이모지는 모두 패턴에 걸린다', () => {
  const all = emojiPattern(ICON_ALL);
  for (const e of Object.keys(ICON_ALL)) assert.deepEqual(splitByIcons(`x${e}y`, all)?.[1]?.key, e, e);
});

test('게임 부팅이 번역 감시 뒤에 이모지 변환을 켠다', () => {
  const html = src('index.html');
  const watch = html.indexOf('watchDom(document.body)');
  const start = html.indexOf('startEmojiIcons(');
  assert.ok(watch > 0 && start > watch, 'startEmojiIcons 는 watchDom 다음');
});
