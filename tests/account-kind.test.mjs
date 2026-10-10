import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { accountKind, TOSS_EMAIL_DOMAIN, PGS_EMAIL_DOMAIN } from '../js/auth/account-kind.js';

const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const user = (email, user_metadata = {}) => ({ email, user_metadata });

test('Worker 가 만든 합성 이메일 도메인으로 토스·플레이 게임즈를 가른다', () => {
  assert.equal(accountKind(user('toss-ab12@toss.calmforest.local')), 'toss');
  assert.equal(accountKind(user('pgs-cd34@pgs.calmforest.local')), 'pgs');
  assert.equal(accountKind(user('forest@gmail.com')), null);
});

test('기존 유저(user_metadata 도 세팅된 계정)는 그대로 인식된다', () => {
  assert.equal(accountKind(user('toss-ab12@toss.calmforest.local', { toss: true })), 'toss');
  assert.equal(accountKind(user('pgs-cd34@pgs.calmforest.local', { pgs: true })), 'pgs');
});

test('user_metadata 는 본인이 updateUser 로 바꿀 수 있으니 믿지 않는다', () => {
  assert.equal(accountKind(user('forest@gmail.com', { toss: true })), null);
  assert.equal(accountKind(user('forest@gmail.com', { pgs: true })), null);
  // 반대로 지워도 합성 계정은 합성 계정
  assert.equal(accountKind(user('toss-ab12@toss.calmforest.local', { toss: false })), 'toss');
});

test('도메인은 끝자리 정확 일치 — 비슷한 주소·대소문자·빈 값', () => {
  assert.equal(accountKind(user('x@toss.calmforest.local.evil.com')), null);
  assert.equal(accountKind(user('x@nottoss.calmforest.local')), null);
  assert.equal(accountKind(user('TOSS-AB@TOSS.CALMFOREST.LOCAL')), 'toss');
  assert.equal(accountKind(user(null)), null);
  assert.equal(accountKind(null), null);
});

test('도메인 상수가 Worker 의 합성 이메일과 같다', () => {
  assert.match(src('toss-auth/src/index.js'), new RegExp('@' + TOSS_EMAIL_DOMAIN.replace(/\./g, '\\.') + '`'));
  assert.match(src('pgs-auth/src/index.js'), new RegExp('@' + PGS_EMAIL_DOMAIN.replace(/\./g, '\\.') + '`'));
});

test('supabase-client 는 user_metadata.toss/pgs 로 판정하지 않는다', () => {
  const s = src('js/supabase-client.js');
  assert.doesNotMatch(s, /user_metadata\?\.(toss|pgs)/);
  assert.match(s, /accountKind\(session\.user\)/);
});

test('🍎 게임센터 합성 계정 — gc.calmforest.local, gc-auth Worker 와 같은 도메인', async () => {
  const { GC_EMAIL_DOMAIN } = await import('../js/auth/account-kind.js');
  assert.equal(accountKind(user('gc-ef56@gc.calmforest.local')), 'gc');
  assert.equal(accountKind(user('x@gc.calmforest.local.evil.com')), null);
  assert.equal(accountKind(user('forest@gmail.com', { gc: true })), null);
  assert.match(src('gc-auth/src/index.js'), new RegExp('@' + GC_EMAIL_DOMAIN.replace(/\./g, '\\.') + '`'));
});
