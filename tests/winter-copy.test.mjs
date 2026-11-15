import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WINTER_COPY, winterToast } from '../js/plaza/winter-copy.js';
import { ARROW_LABEL, FIRST_VISIT } from '../js/guide/feature-rules.js';

globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', languages: ['en-US'] }; } catch { }
globalThis.crypto ??= { randomUUID: () => 'test-uuid' };
const { t, setLang } = await import('../js/i18n.js');
setLang('en');

const strings = (o) => (typeof o === 'string' ? [o] : Object.values(o).flatMap(strings));
const ALL = [...strings(WINTER_COPY), ARROW_LABEL.fountain, FIRST_VISIT.fountain.title, FIRST_VISIT.fountain.line,
  '광고 보고', '재료 채우기', '한 번 더 받기', '꼬마 분수', '겨울 분수를 다 지은 선물', '겨울 등불', '마을 등불 선물. 밤에 빛나요', '물고기'].filter(Boolean);

test('문구 규칙: 엠대시·놀다·화살표 이모지 없음', () => {
  for (const s of ALL) {
    assert.ok(!s.includes('—'), s);
    assert.ok(!/놀/.test(s), s);
    assert.ok(!/[⬅➡⬆⬇↗↘↙↖]/u.test(s), s);
  }
});

test('모든 겨울 문구에 영어가 있다', () => {
  for (const s of ALL.filter(x => /[가-힣]/.test(x))) assert.ok(!/[가-힣]/.test(t(s)), `영어 없음: ${s}`);
});

test('확정 문구 조합', () => {
  assert.equal(winterToast('ok', 'fish', 5), '🐟 물고기 5개를 보탰어요!');
  assert.equal(winterToast('???', 'fish', 0), '연결이 불안정해요. 잠시 뒤 다시 해 주세요 (재료는 그대로예요)');
  assert.equal(WINTER_COPY.stages.length, 5);
  assert.equal(ARROW_LABEL.fountain, '광장으로 가요');
  assert.deepEqual(FIRST_VISIT.fountain, { key: 'visitFountain', ico: '❄️', title: '겨울 분수', line: '재료를 보태면 내 분수가 올라가요' });
});

test('게스트 등불 토스트는 로그인 안내, 영어 번역이 있다', async () => {
  const { readFileSync } = await import('node:fs');
  assert.equal(WINTER_COPY.lampToastGuest, '🏮 등불 {0}개가 켜졌어요! 로그인하면 선물을 받아요');
  assert.ok(readFileSync(new URL('../js/i18n-en.js', import.meta.url), 'utf8').includes(`'${WINTER_COPY.lampToastGuest}':`));
});
