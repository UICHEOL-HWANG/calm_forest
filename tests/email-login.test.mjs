import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  normalizeEmail, isValidEmail, normalizeCode, CODE_MIN, CODE_MAX, RESEND_COOLDOWN_S,
  classifyAuthError, MESSAGES, cooldownLeft,
} from '../js/auth/email-login.js';

const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('이메일은 앞뒤 공백을 떼고 소문자로 맞춘다', () => {
  assert.equal(normalizeEmail('  Forest@Example.COM \n'), 'forest@example.com');
  assert.equal(normalizeEmail(undefined), '');
});

test('이메일 형식 검사 — 흔한 오타는 막고 정상 주소는 통과', () => {
  for (const ok of ['a@b.co', 'forest.bear+cf@mail.example.kr']) assert.equal(isValidEmail(ok), true, ok);
  for (const bad of ['', 'forest', 'forest@', '@example.com', 'forest@example', 'fo rest@example.com', 'a@b.c'])
    assert.equal(isValidEmail(bad), false, bad);
});



test('재전송 대기는 60초, 남은 초는 올림·음수 없음', () => {
  assert.equal(RESEND_COOLDOWN_S, 60);
  assert.equal(cooldownLeft(1000, 1000), 60);
  assert.equal(cooldownLeft(1000, 1000 + 18_200), 42);
  assert.equal(cooldownLeft(1000, 1000 + 60_000), 0);
  assert.equal(cooldownLeft(0, 999_999), 0, '보낸 적 없으면 0');
});

test('Supabase 오류를 사유 키로 분류한다(GA4 reason 축)', () => {
  assert.equal(classifyAuthError({ status: 429, code: 'over_email_send_rate_limit' }), 'rate_limit');
  assert.equal(classifyAuthError({ code: 'over_request_rate_limit' }), 'rate_limit');
  assert.equal(classifyAuthError({ status: 403, code: 'otp_expired' }), 'invalid_code');
  assert.equal(classifyAuthError({ message: 'Token has expired or is invalid' }), 'invalid_code');
  assert.equal(classifyAuthError({ code: 'email_address_invalid' }), 'invalid_email');
  assert.equal(classifyAuthError({ code: 'validation_failed' }), 'invalid_email');
  assert.equal(classifyAuthError({ name: 'AuthRetryableFetchError', message: 'Failed to fetch' }), 'network');
  assert.equal(classifyAuthError({ message: 'weird' }), 'unknown');
  assert.equal(classifyAuthError(null), 'unknown');
});

test('검수받은 문구 그대로', () => {
  assert.equal(MESSAGES.invalid_email, '이메일 주소를 다시 확인해 주세요.');
  assert.equal(MESSAGES.send_fail, '메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요.');
  assert.equal(MESSAGES.rate_limit, '요청이 많아요. 잠시 후 다시 시도해 주세요.');
  assert.equal(MESSAGES.invalid_code, '코드가 맞지 않거나 만료됐어요. 다시 받아 주세요.');
});

test('supabase-client 에 코드 요청·확인 함수 — 토스·플레이 앱에선 막힌다', () => {
  const sc = src('js/supabase-client.js');
  for (const fn of ['requestEmailCode', 'verifyEmailCode']) {
    const i = sc.indexOf(`export async function ${fn}`);
    assert.ok(i > 0, `${fn} 없음`);
    const body = sc.slice(i, sc.indexOf('\n}\n', i));
    assert.match(body, /IS_TOSS \|\| IS_NATIVE/, `${fn} 가 토스·앱(안드로이드·iOS)을 막지 않는다`);
  }
  assert.match(sc, /signInWithOtp\(\{\s*email/);
  assert.match(sc, /verifyOtp\(\{\s*email,\s*token[^}]*type: 'email'/);
});

test('로그인 화면: 이메일 버튼·단계 마크업과 토스·앱 숨김', () => {
  const html = src('index.html');
  assert.match(html, /id="email-btn"[^>]*>✉️ 이메일로 시작하기</);
  assert.match(html, /id="email-step"/);
  assert.match(html, /id="code-step"/);
  assert.match(html, /body\.platform-toss #email-btn[^{]*\{[^}]*display: none/);
  assert.match(html, /body\.platform-android #email-btn[^{]*\{[^}]*display: none/);
});

test('이메일 계정도 정식 계정 취급 — 로그아웃 라벨·상태 표시·활동 기록', () => {
  const html = src('index.html');
  assert.doesNotMatch(html, /provider === 'google'\) \? '로그아웃'/, '로그아웃 라벨이 구글만 본다');
  assert.doesNotMatch(html, /const label = s\.provider === 'google'/, '상태 표시가 구글만 본다');
  assert.doesNotMatch(html, /if \(authState\.provider !== 'google'\) \{\s*ui\.toast\('📊/, '활동 기록이 구글만 연다');
});

test('새 문구는 영어 사전에 전부 있다', () => {
  const en = src('js/i18n-en.js');
  const keys = [
    '✉️ 이메일로 시작하기', '이메일로 시작하기', '메일로 6자리 코드를 보내 드려요. 비밀번호는 필요 없어요.',
    '이메일 주소', '코드 받기', '← 다른 방법으로 시작하기', '코드 입력', '{0} 로 코드를 보냈어요.',
    '메일함에 없으면 스팸함도 확인해 주세요.', '6자리 코드', '시작하기', '코드 다시 받기',
    '{0#}초 후 다시 받을 수 있어요', '← 이메일 바꾸기', '보내는 중…', '확인하는 중…',
    ...Object.values(MESSAGES),
  ];
  for (const k of keys) assert.ok(en.includes(`'${k}':`), `영어 사전에 없음: ${k}`);
});

test('GA4 email_login — 단계·결과·사유 축', () => {
  const m = src('js/auth/email-login.js');
  assert.match(m, /'email_login'/);
  for (const stage of ['request', 'verify']) assert.match(m, new RegExp(`stage: '${stage}'`));
});

test('이메일 계정은 게스트가 아니다 — 도감 배너·앨범·로그인 넛지', () => {
  const html = src('index.html');
  const m = html.match(/const isGuestNow = \(\) => !\[([^\]]+)\]\.includes\(authState\.provider\)/);
  assert.ok(m, 'isGuestNow 목록을 못 찾음');
  assert.match(m[1], /'email'/, 'isGuestNow 가 이메일 유저를 게스트로 본다');
});

// ── 컨트롤러: 가짜 DOM 으로 경쟁 상태 잠그기 ─────────────────────
import { mountEmailLogin } from '../js/auth/email-login.js';

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
    'code-verify', 'code-err', 'code-sent-to', 'code-resend', 'email-btn', 'email-back', 'code-back']) mk(id);
  return { $: (id) => els[id], els };
}
const deferred = () => { let resolve; const p = new Promise(r => { resolve = r; }); return { p, resolve }; };
// 실패해도 재전송 타이머가 남아 프로세스가 안 끝나는 일이 없게 — 항상 reset
const withUi = async (ui, fn) => { try { await fn(); } finally { ui.reset(); } };
const step = (els) => ['login-main', 'email-step', 'code-step'].find(id => !els[id].hidden);

test('보내는 중에 뒤로 가면, 응답이 와도 코드 단계로 튀지 않는다', async () => {
  const { $, els } = fakeDom();
  const d = deferred();
  const ui = mountEmailLogin({ $, requestCode: () => d.p, verifyCode: async () => ({ ok: true }), track() {} });
  await withUi(ui, async () => {
    els['email-btn'].fire('click');
    els['email-input'].value = 'a@b.co';
    const pending = els['email-step'].fire('submit');
    els['email-back'].fire('click');
    assert.equal(step(els), 'login-main');
    d.resolve({ ok: true }); await pending;
    assert.equal(step(els), 'login-main', '뒤로 간 뒤에 코드 단계가 열렸다');
  });
});

test('재전송이 걸려 있어도 코드 확인은 된다', async () => {
  const { $, els } = fakeDom();
  let t = 0; const now = () => t;
  const resend = deferred(); let calls = 0; let verified = 0;
  const ui = mountEmailLogin({ $, now, track() {},
    requestCode: () => (++calls === 1 ? Promise.resolve({ ok: true }) : resend.p),
    verifyCode: async () => { verified++; return { ok: true }; } });
  await withUi(ui, async () => {
    els['email-btn'].fire('click');
    els['email-input'].value = 'a@b.co';
    await els['email-step'].fire('submit');
    assert.equal(step(els), 'code-step');
    t = 61_000;
    const r = els['code-resend'].fire('click');
    els['code-input'].value = '123456';
    await els['code-step'].fire('submit');
    assert.equal(verified, 1, '재전송 중이라 확인이 조용히 무시됐다');
    resend.resolve({ ok: true }); await r;
  });
});

test('코드 단계에서 뒤로 갔다가 같은 주소로 다시 오면 60초 안엔 재발송하지 않는다', async () => {
  const { $, els } = fakeDom();
  let t = 1_000; let calls = 0;   // Date.now() 는 0 이 아니다(0 = 보낸 적 없음)
  const ui = mountEmailLogin({ $, now: () => t, track() {}, requestCode: async () => { calls++; return { ok: true }; }, verifyCode: async () => ({ ok: true }) });
  await withUi(ui, async () => {
    els['email-btn'].fire('click');
    els['email-input'].value = 'a@b.co';
    await els['email-step'].fire('submit');
    els['code-back'].fire('click');
    t = 11_000;
    els['email-input'].value = 'A@B.co ';
    await els['email-step'].fire('submit');
    assert.equal(calls, 1, '쿨다운 중인데 또 보냈다(Supabase 가 거절)');
    assert.equal(step(els), 'code-step');
  });
});

test('알 수 없는 확인 실패는 "연결 불안정"이 아니라 다시 시도 안내', async () => {
  const { $, els } = fakeDom();
  const ui = mountEmailLogin({ $, track() {}, requestCode: async () => ({ ok: true }),
    verifyCode: async () => ({ ok: false, error: { status: 500, message: 'boom' } }) });
  await withUi(ui, async () => {
    els['email-btn'].fire('click');
    els['email-input'].value = 'a@b.co';
    await els['email-step'].fire('submit');
    els['code-input'].value = '123456';
    await els['code-step'].fire('submit');
    assert.equal(els['code-err'].textContent, MESSAGES.retry);
  });
});

test('코드는 숫자만 남긴다 — 공백·하이픈 섞어 붙여넣어도 되고, 6~10자리 설정 모두 받는다', () => {
  //  Supabase OTP 길이는 대시보드에서 6~10 으로 바뀐다. 6 으로 자르면 8자리 설정에서 늘 틀린다(2026-09-30 실측 거절)
  assert.equal(CODE_MIN, 6);
  assert.equal(CODE_MAX, 10);
  assert.equal(normalizeCode(' 482 193 '), '482193');
  assert.equal(normalizeCode('4821-9375'), '48219375');
  assert.equal(normalizeCode('12345678901234'), '1234567890');
  assert.equal(normalizeCode('abc'), '');
});

test('8자리 코드는 잘리지 않고 그대로 확인 요청된다', async () => {
  const { $, els } = fakeDom();
  let got = null;
  const ui = mountEmailLogin({ $, track() {}, requestCode: async () => ({ ok: true }),
    verifyCode: async (_e, code) => { got = code; return { ok: true }; } });
  await withUi(ui, async () => {
    els['email-btn'].fire('click');
    els['email-input'].value = 'a@b.co';
    await els['email-step'].fire('submit');
    els['code-input'].value = '4821 9375';
    await els['code-step'].fire('submit');
    assert.equal(got, '48219375');
  });
});

test('6자리 미만은 서버에 안 보내고 바로 안내', async () => {
  const { $, els } = fakeDom();
  let calls = 0;
  const ui = mountEmailLogin({ $, track() {}, requestCode: async () => ({ ok: true }),
    verifyCode: async () => { calls++; return { ok: true }; } });
  await withUi(ui, async () => {
    els['email-btn'].fire('click');
    els['email-input'].value = 'a@b.co';
    await els['email-step'].fire('submit');
    els['code-input'].value = '4821';
    await els['code-step'].fire('submit');
    assert.equal(calls, 0);
    assert.equal(els['code-err'].textContent, MESSAGES.invalid_code);
  });
});

// ── 🔢 코드 칸(A안 흰 타일) — 보이는 건 칸, 입력은 투명 input 하나(붙여넣기·iOS 코드 자동 채우기 유지) ──
import { otpCells } from '../js/auth/email-login.js';

test('칸은 6개, 숫자는 앞에서부터 채우고 커서는 다음 빈 칸', () => {
  assert.deepEqual(otpCells('48', true), [
    { d: '4', on: false }, { d: '8', on: false }, { d: '', on: true },
    { d: '', on: false }, { d: '', on: false }, { d: '', on: false },
  ]);
});

test('포커스가 없으면 커서 없음 · 다 차면 마지막 칸에 커서', () => {
  assert.ok(otpCells('48', false).every(c => !c.on));
  const full = otpCells('482193', true);
  assert.equal(full.length, 6);
  assert.deepEqual(full.map(c => c.on), [false, false, false, false, false, true]);
});

test('설정이 바뀌어 6자리를 넘게 붙여넣어도 숫자가 숨지 않게 칸이 늘어난다', () => {
  const c = otpCells('48219375', true);
  assert.equal(c.length, 8);
  assert.equal(c.map(x => x.d).join(''), '48219375');
});

test('로그인 화면: 코드 칸 마크업 — 입력은 하나, 칸은 장식', () => {
  const html = src('index.html');
  assert.match(html, /id="code-cells"[^>]*aria-hidden="true"/);
  assert.match(html, /id="code-input"[^>]*autocomplete="one-time-code"/);
  assert.match(html, /id="code-input"[^>]*aria-label="6자리 코드"/);
});

test('IS_NATIVE 는 안드로이드·iOS 둘 다 포함한다(이메일 로그인 차단 범위)', () => {
  assert.match(src('js/platform.js'), /export const IS_NATIVE = IS_ANDROID \|\| IS_IOS;/);
});
