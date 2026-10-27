import { test } from 'node:test';
import assert from 'node:assert/strict';
globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', languages: ['en-US'] }; } catch {}
globalThis.crypto ??= { randomUUID: () => 'test-uuid' };
const { t, setLang } = await import('../js/i18n.js');
setLang('en');

const KO = [
  '눈의 가지', '썰매지기', '땔감 꾸러미', '코코아 꾸러미', '눈사람', '펭귄', '물범', '눈토끼', '늑대', '반달곰',
  '빈터를 꾸미면 🛷 썰매지기의 산장에 불이 켜져요', '🛷 썰매지기의 산장에 불이 켜졌어요',
  '❄️ 눈의 가지', '정상 산장에 불이 켜졌어요',
  '얼어붙은 가지', '눈의 가지 빈터 꾸미기',
  '🛷 설산 정상의 썰매지기를 찾아가 보자. 얼어붙은 가지 이야기를 들려줄 거예요.',
  '눈의 가지에 온기가 돌아요. 산장 창에 불이 켜졌어요.',
  '안개가 걷혔어요. "와 줘서 고마워. 그런데 정상의 가지 하나가 아직 얼어 있단다."',
  '❄️ 눈의 가지 빈터 0/1', '❄️ 눈의 가지 빈터 1/1', '🌳 눈의 가지 빈터 0/1',
  '🌳 물의 가지 빈터 0/1', '🌳 밭의 가지 빈터 0/1', '🌳 부엌의 가지 빈터 0/1', '🌳 숲의 가지 빈터 0/1',
];

test('눈의 가지 문구는 전부 영어가 있다', () => {
  for (const s of KO) assert.doesNotMatch(t(s), /[가-힣]/, s);
});
