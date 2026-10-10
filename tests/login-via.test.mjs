// 🔑 로그인 수단(loginVia) — 계정 종류(provider)와 분리. GA4 login{method} 오염 방지
//   Apple ID 이메일이 기존 구글 계정과 같으면 Supabase 가 그 계정에 apple 신원을 붙여 provider 가 'google' 로 남는다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveLoginVia } from '../js/auth/login-via.js';

const user = (...providers) => ({ identities: providers.map(provider => ({ provider })) });

test('기기에 남긴 수단이 이 계정에 실제로 붙어 있으면 그 수단', () => {
  assert.equal(resolveLoginVia({ provider: 'google', user: user('google', 'apple'), stored: 'apple' }), 'apple');
});

test('붙어 있지 않은 수단이 남아 있으면 무시하고 계정 종류', () => {
  assert.equal(resolveLoginVia({ provider: 'google', user: user('google'), stored: 'apple' }), 'google');
});

test('남긴 수단이 없으면 계정 종류 그대로(웹·토스·플레이 앱 기존 동작)', () => {
  assert.equal(resolveLoginVia({ provider: 'pgs', user: user('email'), stored: null }), 'pgs');
  assert.equal(resolveLoginVia({ provider: 'anonymous', user: user(), stored: 'apple' }), 'anonymous');
});

test('합성 계정(게임센터·토스·PGS)은 신원이 email 이라도 계정 종류를 쓴다', () => {
  assert.equal(resolveLoginVia({ provider: 'gc', user: user('email'), stored: 'apple' }), 'gc');
});
