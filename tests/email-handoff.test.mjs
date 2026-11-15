import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { requestEmailHandoff, pendingEmailHandoff, takeEmailHandoff } from '../js/auth/email-handoff.js';

const memStorage = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    size: () => m.size,
  };
};
const brokenStorage = {
  getItem: () => { throw new Error('denied'); },
  setItem: () => { throw new Error('denied'); },
  removeItem: () => { throw new Error('denied'); },
};

test('요청 → 미리보기는 소비하지 않고 → 꺼내면 from 과 함께 한 번만 나온다', () => {
  const s = memStorage();
  assert.equal(pendingEmailHandoff(s), false);
  assert.equal(requestEmailHandoff(s, 'harvest'), true);
  assert.equal(pendingEmailHandoff(s), true);
  assert.equal(pendingEmailHandoff(s), true);
  assert.deepEqual(takeEmailHandoff(s), { from: 'harvest' });
  assert.equal(takeEmailHandoff(s), null);
  assert.equal(pendingEmailHandoff(s), false);
  assert.equal(s.size(), 0);
});

test('from 이 없으면 login_nudge 로 채운다', () => {
  const s = memStorage();
  requestEmailHandoff(s);
  assert.deepEqual(takeEmailHandoff(s), { from: 'login_nudge' });
});

test('저장소가 막혀 있거나 없으면 던지지 않고 요청 없음으로 본다', () => {
  for (const s of [brokenStorage, null, undefined]) {
    assert.equal(requestEmailHandoff(s, 'dex'), false);
    assert.equal(pendingEmailHandoff(s), false);
    assert.equal(takeEmailHandoff(s), null);
  }
});

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const html = read('index.html');
const supa = read('js/supabase-client.js');
const bootSrc = html.slice(html.lastIndexOf('(async () => {'));

test('부팅: 이메일 가입 요청이 남아 있으면 initAuth 가 게스트 세션으로 바로 들어가지 않는다', () => {
  assert.match(bootSrc, /holdGuest: pendingEmailHandoff\(sessionStorage\)/);
  const init = supa.match(/export async function initAuth\([\s\S]*?\n\}/)[0];
  const hold = init.search(/if \(holdGuest && !IS_TOSS && !IS_NATIVE\) \{ heldAnon = s; return \{ needLogin: true, offline: false \}; \}/);
  const keep = init.search(/if \(keepGuest && !IS_TOSS && !IS_NATIVE\)/);
  assert.ok(hold >= 0, '게스트 세션을 붙잡아 두는 분기가 없다');
  assert.ok(hold < keep, '이어 가기(keepGuest)보다 먼저 판단해야 한다');
});

test('로그인 화면이 요청을 꺼내 이메일 창을 연다', () => {
  const fn = html.match(/function showLoginScreen\([\s\S]*?\n    \}/)[0];
  assert.match(fn, /const handoff = takeEmailHandoff\(sessionStorage\);[\s\S]*?if \(handoff\) emailLogin\.openEmail\(\{ from: handoff\.from \}\);/);
});

test('넛지 이메일 버튼은 요청을 남기고 새로고침한다', () => {
  assert.match(html, /requestEmailHandoff\(sessionStorage, from\);\s*\n\s*location\.reload\(\);/);
  assert.doesNotMatch(html, /sessionStorage\.setItem\('cf_login_email'/);
});

test('가입을 그만두고 게스트를 고르면 붙잡아 둔 마을로 돌아간다', () => {
  assert.match(supa, /export function resumeHeldGuest\(\) \{/);
  assert.match(html, /\$\('guest-btn'\)\.addEventListener\('click', async \(\) => \{\s*\n\s*const r = resumeHeldGuest\(\) \|\| await signInAsGuest\(\);/);
});
