import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { mountEmailLogin } from '../js/auth/email-login.js';

const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('auth-popup: 토큰은 자기 오리진으로만 보낸다(itch 공유 오리진·localhost 금지)', () => {
  const html = src('pages/auth-popup.html');
  for (const bad of ['itch.zone', 'hwcdn.net', 'localhost', '127.0.0.1']) assert.ok(!html.includes(bad), bad);
  assert.match(html, /postMessage\(msg,\s*location\.origin\)/);
});

test('supabase-client: itch 는 구글 OAuth 를 열지 않는다', () => {
  const s = src('js/supabase-client.js');
  assert.ok(!/signInWithGooglePopup|GOOGLE_POPUP_/.test(s), '팝업 로그인 코드가 남아 있다');
  const body = s.slice(s.indexOf('export async function signInWithGoogle'), s.indexOf('export async function requestEmailCode'));
  assert.match(body, /if \(IS_ITCH\) return/);
  assert.ok(body.indexOf('IS_ITCH') < body.indexOf('signInWithOAuth'));
});

test('supabase-client: itch 는 세션을 저장하지 않고 예전 저장분을 지운다', () => {
  const s = src('js/supabase-client.js');
  assert.match(s, /persistSession:\s*!IS_ITCH/);
  assert.match(s, /if \(IS_ITCH\) dropStoredSession\(\)/);
  assert.match(s, /function dropStoredSession\(\)/);
});

test('index: itch 구글 버튼은 이메일 단계(C안 문구)로 연결', () => {
  const h = src('index.html');
  assert.match(h, /body\.platform-itch #google-btn/);
  assert.match(h, /body\.platform-itch #email-btn/);
  assert.match(h, /ITCH_GOOGLE_COPY/);
  assert.match(h, /emailLogin\.openEmail\(ITCH_GOOGLE_COPY\)/);
  assert.match(h, /if \(!inAppLogin\.inApp && !IS_ITCH\) return signInWithGoogle\(\)/);
  assert.match(h, /id="email-title"/);
  assert.match(h, /id="email-hint"/);
});

function fakeDom() {
  const els = {};
  const mk = (id) => {
    const l = {};
    return els[id] = { id, hidden: false, disabled: false, value: '', textContent: '',
      addEventListener: (ev, fn) => { l[ev] = fn; },
      fire: (ev) => l[ev]?.({ preventDefault() {} }),
      focus() {}, select() {} };
  };
  for (const id of ['login-main', 'email-step', 'code-step', 'email-input', 'email-send', 'email-err', 'code-input',
    'code-verify', 'code-err', 'code-sent-to', 'code-resend', 'email-btn', 'email-back', 'code-back', 'email-title', 'email-hint']) mk(id);
  els['email-title'].textContent = '이메일로 시작하기';
  els['email-hint'].textContent = '메일로 6자리 코드를 보내 드려요. 비밀번호는 필요 없어요.';
  return { $: (id) => els[id], els };
}

test('openEmail: 다른 제목·안내로 열고, 일반 버튼으로 열면 원래 문구로 돌아온다', () => {
  const { $, els } = fakeDom();
  const tracked = [];
  const ui = mountEmailLogin({ $, requestCode: async () => ({ ok: true }), verifyCode: async () => ({ ok: true }), track: (n, p) => tracked.push([n, p]) });
  try {
    ui.openEmail({ title: 'Gmail로 이어하기', hint: '안내', from: 'itch_google' });
    assert.equal(els['email-step'].hidden, false);
    assert.equal(els['login-main'].hidden, true);
    assert.equal(els['email-title'].textContent, 'Gmail로 이어하기');
    assert.equal(els['email-hint'].textContent, '안내');
    assert.deepEqual(tracked.at(-1), ['email_login', { stage: 'open', from: 'itch_google' }]);
    els['email-back'].fire('click');
    els['email-btn'].fire('click');
    assert.equal(els['email-title'].textContent, '이메일로 시작하기');
    assert.equal(els['email-hint'].textContent, '메일로 6자리 코드를 보내 드려요. 비밀번호는 필요 없어요.');
  } finally { ui.reset(); }
});

test('i18n: C안 문구가 영어로 번역된다', async () => {
  globalThis.location ??= { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
  globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  globalThis.crypto ??= { randomUUID: () => 'test-uuid' };
  const { t, setLang } = await import('../js/i18n.js');
  setLang('en');
  assert.equal(t('구글로 가입하셨나요?'), 'Signed up with Google?');
  assert.equal(t('Gmail로 이어하기'), 'Use your Gmail');
  assert.equal(t('itch 안에서는 구글 로그인을 쓸 수 없어요. Gmail 주소를 넣으면 같은 계정으로 코드를 보내 드려요.'),
    "Google sign-in isn't available inside itch. Enter your Gmail address and we'll send a code to the same account.");
});

test('SQL: 사용자가 직접 이메일을 확인하는 순간 미리 걸린 비밀번호를 지운다', () => {
  const p = 'sql/migrations/migrate_auth_confirm_clears_password.sql';
  assert.ok(existsSync(new URL('../' + p, import.meta.url)), p);
  const s = src(p).toLowerCase();
  assert.match(s, /before update of email_confirmed_at on auth\.users/);
  assert.match(s, /old\.email_confirmed_at is null and new\.email_confirmed_at is not null/);
  assert.ok(!s.includes('confirmation_token'), 'confirmation_token 은 최신 GoTrue 에서 비어 있을 수 있다');
  assert.match(s, /not like '%\.calmforest\.local'/);
  assert.match(s, /new\.encrypted_password := ''/);
  assert.match(s, /update auth\.users set encrypted_password = ''\s+where not is_anonymous\s+and coalesce\(email, ''\) not like '%\.calmforest\.local'/);
  assert.match(s, /set search_path = ''/);
  assert.match(s, /revoke all on function public\._auth_confirm_clears_password\(\) from public, anon, authenticated/);
});

test('SQL: 차단하면 차단한 사람의 public_id 를 새로 뽑는다', () => {
  const p = 'sql/migrations/migrate_neighbors_block_rotate.sql';
  assert.ok(existsSync(new URL('../' + p, import.meta.url)), p);
  const s = src(p).toLowerCase();
  const fn = s.slice(s.indexOf('create or replace function public.neighbor_block'));
  for (const kept of ["'auth'", "'not_found'", "'self'", "'limit'", 'v_today >= 50', 'on conflict do nothing'])
    assert.ok(fn.includes(kept), kept);
  assert.match(fn, /if found then\s+update village_profiles set public_id = gen_random_uuid\(\), updated_at = now\(\) where user_id = v_uid;/);
  assert.match(fn, /security definer set search_path = public/);
});

test('SQL: 신고 목록은 교체된 현재 public_id 로 관리자 조치가 닿는다 · 기존 차단자도 한 번 교체', () => {
  const s = src('sql/migrations/migrate_neighbors_block_rotate.sql').toLowerCase();
  assert.match(s, /create or replace function public\.admin_village_reports/);
  assert.match(s, /coalesce\(vp\.public_id, vr\.target_public_id\) as public_id/);
  assert.match(s, /cf_is_admin\(\)/);
  assert.match(s, /update village_profiles set public_id = gen_random_uuid\(\), updated_at = now\(\)\s+where user_id in \(select distinct blocker from village_blocks\)/);
});
