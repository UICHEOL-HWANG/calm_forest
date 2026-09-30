// ── ✉️ 이메일 6자리 코드 로그인 (웹·itch 전용) ─────────────────────
//   로그인 카드 A안: 첫 화면엔 버튼 하나 → 누르면 카드 내용이 이메일 단계 → 코드 단계로 통째로 바뀐다.
//   매직링크가 아니라 코드인 이유 — 링크가 메일 앱의 다른 브라우저로 열리면 게임 탭엔 세션이 안 잡힌다
//   (PWA·itch iframe 에서 특히). 코드는 게임 화면 안에서 끝난다.
//   세션이 잡히면 supabase-client 의 applySession → initAuth 콜백 → enterPlay 로 기존 경로 그대로 입장.
//
//   이 파일은 import 가 없다 — 순수 함수는 Node 테스트(tests/email-login.test.mjs)에서 바로 돈다.
//   화면 문구는 한국어 원문 그대로 넣고, 영어 전환은 i18n 옵저버(js/i18n.js)가 맡는다.

//  Supabase Auth > Email OTP Length 는 6~10 으로 바꿀 수 있다 — 한 값에 묶으면 설정이 바뀌는 순간
//  코드가 잘려 늘 틀린다(2026-09-30 실측). 범위만 거르고 맞는지는 서버가 판정한다.
export const CODE_MIN = 6;
export const CODE_MAX = 10;
export const RESEND_COOLDOWN_S = 60;    // Supabase 는 같은 주소로 60초 안에 다시 보내면 거절한다

export const MESSAGES = {
  invalid_email: '이메일 주소를 다시 확인해 주세요.',
  send_fail: '메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요.',
  rate_limit: '요청이 많아요. 잠시 후 다시 시도해 주세요.',
  invalid_code: '코드가 맞지 않거나 만료됐어요. 다시 받아 주세요.',
  network: '연결이 불안정해요. 잠시 후 다시 시도해 주세요.',
  retry: '확인하지 못했어요. 잠시 후 다시 시도해 주세요.',
};

export function normalizeEmail(s) {
  return String(s ?? '').trim().toLowerCase();
}

// 서버가 최종 판정한다 — 여기선 명백한 오타만 걸러 쓸데없는 발송 요청(=발송 한도 소모)을 막는다
export function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

// 메일에서 '482 193' 처럼 띄어 쓴 걸 붙여넣어도 된다
export function normalizeCode(s) {
  return String(s ?? '').replace(/\D/g, '').slice(0, CODE_MAX);
}

// 🔢 코드 칸 상태 — 칸은 최소 CODE_MIN 개, 더 길게 붙여넣으면 칸이 늘어 숫자가 숨지 않는다.
//   커서(on)는 포커스 중일 때 다음 빈 칸, 다 찼으면 마지막 칸.
export function otpCells(code, focused) {
  const n = Math.max(CODE_MIN, code.length);
  const cur = Math.min(code.length, n - 1);
  return Array.from({ length: n }, (_, i) => ({ d: code[i] || '', on: focused && i === cur }));
}

export function cooldownLeft(sentAt, now) {
  if (!sentAt) return 0;
  return Math.max(0, Math.ceil(RESEND_COOLDOWN_S - (now - sentAt) / 1000));
}

// Supabase AuthError → GA4 reason 키 (축은 키값 — 문구가 바뀌어도 집계가 안 흔들린다)
export function classifyAuthError(err) {
  if (!err) return 'unknown';
  const code = err.code || '';
  const msg = String(err.message || '');
  if (err.status === 429 || /rate_limit/.test(code)) return 'rate_limit';
  if (code === 'otp_expired' || /expired or is invalid/i.test(msg)) return 'invalid_code';
  if (code === 'email_address_invalid' || code === 'validation_failed') return 'invalid_email';
  if (err.name === 'AuthRetryableFetchError' || /failed to fetch|network/i.test(msg)) return 'network';
  return 'unknown';
}

// ── 화면 컨트롤러 ───────────────────────────────────────────────
//   deps: { $, requestCode(email), verifyCode(email, code), track(name, params), now? }
//   requestCode/verifyCode 는 { ok, error } 를 돌려준다(supabase-client 의 requestEmailCode/verifyEmailCode).
export function mountEmailLogin({ $, requestCode, verifyCode, track, now = () => Date.now() }) {
  const main = $('login-main'), emailStep = $('email-step'), codeStep = $('code-step');
  const emailInput = $('email-input'), emailSend = $('email-send'), emailErr = $('email-err');
  const codeInput = $('code-input'), codeVerify = $('code-verify'), codeErr = $('code-err');
  const sentTo = $('code-sent-to'), resendBtn = $('code-resend');
  const cells = $('code-cells');   // 보이는 칸(장식). 실제 입력은 그 위의 투명 code-input 하나
  //  sentEmail/sentAt = 마지막으로 코드가 **실제로 나간** 주소·시각. 확인은 늘 이 주소로 한다
  //  (입력칸은 뒤로 가서 바꿀 수 있다). 요청·확인은 따로 잠근다 — 재전송 중에도 코드 확인은 된다.
  let view = 'main', sentEmail = '', sentAt = 0, timer = null, sending = false, verifying = false;

  const show = (which) => {
    view = which;
    main.hidden = which !== 'main';
    emailStep.hidden = which !== 'email';
    codeStep.hidden = which !== 'code';
  };
  const stopTimer = () => { clearInterval(timer); timer = null; };
  const paintResend = () => {
    const left = cooldownLeft(sentAt, now());
    resendBtn.disabled = left > 0 || sending;
    resendBtn.textContent = left > 0 ? `${left}초 후 다시 받을 수 있어요` : '코드 다시 받기';
    if (!left) stopTimer();
  };
  //  칸 그리기 — 값은 normalizeCode 를 거친 숫자뿐이라 innerHTML 에 그대로 넣어도 안전
  let focused = false;
  const paintCells = () => {
    if (!cells) return;
    cells.innerHTML = otpCells(codeInput.value, focused)
      .map(c => `<span class="otp-cell${c.d ? ' f' : ''}${c.on ? ' on' : ''}">${c.d}</span>`).join('');
  };
  const openCode = () => { codeInput.value = ''; codeErr.textContent = ''; show('code'); codeInput.focus(); paintCells(); };

  // 요청 → 성공 여부만 돌려준다(화면 전환은 호출한 쪽이 지금 단계를 보고 정한다)
  async function send(email, errEl) {
    errEl.textContent = '';
    sending = true;
    const r = await requestCode(email);
    sending = false;
    const reason = r.ok ? undefined : classifyAuthError(r.error);
    track('email_login', { stage: 'request', result: r.ok ? 'ok' : 'fail', reason });
    if (!r.ok) {
      errEl.textContent = MESSAGES[reason === 'rate_limit' || reason === 'invalid_email' ? reason : 'send_fail'];
      return false;
    }
    sentEmail = email; sentAt = now();
    sentTo.textContent = `${email} 로 코드를 보냈어요.`;
    stopTimer(); timer = setInterval(paintResend, 1000); paintResend();
    return true;
  }

  $('email-btn').addEventListener('click', () => {
    track('email_login', { stage: 'open' });
    emailErr.textContent = '';
    show('email');
    emailInput.focus();
  });
  $('email-back').addEventListener('click', () => show('main'));
  $('code-back').addEventListener('click', () => { codeErr.textContent = ''; show('email'); emailInput.focus(); });

  emailStep.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending) return;
    const email = normalizeEmail(emailInput.value);
    if (!isValidEmail(email)) { emailErr.textContent = MESSAGES.invalid_email; return; }
    emailErr.textContent = '';
    //  방금 보낸 주소로 되돌아온 거면 다시 보내지 않는다 — 60초 안의 재요청은 Supabase 가 거절한다
    if (email === sentEmail && cooldownLeft(sentAt, now()) > 0) { openCode(); return; }
    emailSend.disabled = true; emailSend.textContent = '보내는 중…';
    const ok = await send(email, emailErr);
    emailSend.disabled = false; emailSend.textContent = '코드 받기';
    if (ok && view === 'email') openCode();   // 기다리는 사이 뒤로 갔으면 끌고 오지 않는다
  });

  resendBtn.addEventListener('click', async () => {
    if (sending || !sentEmail || cooldownLeft(sentAt, now()) > 0) return;
    resendBtn.disabled = true;
    const ok = await send(sentEmail, codeErr);
    if (!ok) paintResend();
  });

  codeInput.addEventListener('input', () => {
    const v = normalizeCode(codeInput.value);
    if (v !== codeInput.value) codeInput.value = v;
    paintCells();
  });
  codeInput.addEventListener('focus', () => { focused = true; paintCells(); });
  codeInput.addEventListener('blur', () => { focused = false; paintCells(); });

  codeStep.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (verifying) return;
    const code = normalizeCode(codeInput.value);
    if (code.length < CODE_MIN) { codeErr.textContent = MESSAGES.invalid_code; return; }
    codeErr.textContent = '';
    verifying = true; codeVerify.disabled = true; codeVerify.textContent = '확인하는 중…';
    const r = await verifyCode(sentEmail, code);
    verifying = false; codeVerify.disabled = false; codeVerify.textContent = '시작하기';
    const reason = r.ok ? undefined : classifyAuthError(r.error);
    track('email_login', { stage: 'verify', result: r.ok ? 'ok' : 'fail', reason });
    if (r.ok) { stopTimer(); return; }   // 세션 반영 → initAuth 콜백이 enterPlay
    codeErr.textContent = MESSAGES[['invalid_code', 'rate_limit', 'network'].includes(reason) ? reason : 'retry'];
    codeInput.select();
  });

  paintCells();   // 첫 진입 전에도 빈 칸 6개가 자리를 잡아 둔다(레이아웃이 튀지 않게)
  return { reset: () => { stopTimer(); show('main'); } };
}
