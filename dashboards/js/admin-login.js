import { MESSAGES, CODE_MIN, normalizeEmail, isValidEmail, normalizeCode, classifyAuthError } from '../../js/auth/email-login.js';

export function createLoginFlow(sb) {
  let email = '';
  return {
    get email() { return email; },
    async send(raw) {
      const e = normalizeEmail(raw);
      if (!isValidEmail(e)) return { ok: false, msg: MESSAGES.invalid_email };
      try {
        const { error } = await sb.auth.signInWithOtp({ email: e, options: { shouldCreateUser: false } });
        if (error) return { ok: false, msg: sendFailMsg(error) };
        email = e;
        return { ok: true };
      } catch (err) {
        return { ok: false, msg: sendFailMsg(err) };
      }
    },
    async verify(raw) {
      const token = normalizeCode(raw);
      if (!email || token.length < CODE_MIN) return { ok: false, msg: MESSAGES.invalid_code };
      try {
        const { data, error } = await sb.auth.verifyOtp({ email, token, type: 'email' });
        if (error || !data?.session) return { ok: false, msg: MESSAGES[classifyAuthError(error)] || MESSAGES.retry };
        return { ok: true };
      } catch (err) {
        return { ok: false, msg: MESSAGES[classifyAuthError(err)] || MESSAGES.retry };
      }
    },
  };
}

function sendFailMsg(err) {
  const reason = classifyAuthError(err);
  if (reason === 'rate_limit' || reason === 'network' || reason === 'invalid_email') return MESSAGES[reason];
  if (/signups? not allowed|user not found/i.test(String(err?.message || ''))) return '등록된 계정이 아니에요. 관리자 이메일을 확인해 주세요.';
  return MESSAGES.send_fail;
}

export const LOGIN_GATE_HTML = `
  <div class="lg-gate">
    <button id="lgGoogle" type="button">구글로 로그인</button>
    <div class="lg-or">또는 이메일 코드로</div>
    <form id="lgEmailForm" class="lg-row">
      <input id="lgEmail" type="email" autocomplete="email" placeholder="관리자 이메일" required>
      <button type="submit">코드 받기</button>
    </form>
    <form id="lgCodeForm" class="lg-row" hidden>
      <input id="lgCode" inputmode="numeric" autocomplete="one-time-code" placeholder="메일로 받은 코드" maxlength="14">
      <button type="submit">확인</button>
    </form>
    <div id="lgNote" class="lg-note" aria-live="polite"></div>
  </div>`;

export function mountLoginGate(sb, { onSignedIn = () => location.reload() } = {}) {
  const q = (id) => document.getElementById(id);
  const flow = createLoginFlow(sb);
  const note = (t, bad = false) => { q('lgNote').textContent = t; q('lgNote').classList.toggle('bad', bad); };
  const busy = (form, on) => form.querySelectorAll('button, input').forEach((x) => { x.disabled = on; });

  q('lgGoogle').onclick = () => sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });

  q('lgEmailForm').onsubmit = async (ev) => {
    ev.preventDefault();
    busy(ev.target, true);
    const r = await flow.send(q('lgEmail').value);
    busy(ev.target, false);
    if (!r.ok) return note(r.msg, true);
    q('lgCodeForm').hidden = false;
    q('lgCode').focus();
    note(`${flow.email} 로 코드를 보냈어요.`);
  };

  q('lgCodeForm').onsubmit = async (ev) => {
    ev.preventDefault();
    busy(ev.target, true);
    const r = await flow.verify(q('lgCode').value);
    if (!r.ok) { busy(ev.target, false); return note(r.msg, true); }
    note('로그인됐어요. 불러오는 중…');
    onSignedIn();
  };
}
