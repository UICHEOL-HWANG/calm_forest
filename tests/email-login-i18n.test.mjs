import { test } from 'node:test';
import assert from 'node:assert/strict';

// ✉️ 이메일 로그인 문구가 영어에서 실제로 끝까지 번역되는지(사전에 키가 있다 ≠ 번역된다 — 글루 패턴 함정)
globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', languages: ['en-US'] }; } catch { /* 이미 있음 */ }
globalThis.crypto ??= { randomUUID: () => 'test-uuid' };

const { t, setLang } = await import('../js/i18n.js');
setLang('en');

test('주소가 끼는 문장·초가 끼는 문장', () => {
  assert.equal(t('forest.bear+cf@example.com 로 코드를 보냈어요.'), 'We sent a code to forest.bear+cf@example.com.');
  assert.equal(t('42초 후 다시 받을 수 있어요'), 'Resend in 42s');
  assert.equal(t('✉️ 이메일로 시작하기'), '✉️ Start with email');
});
