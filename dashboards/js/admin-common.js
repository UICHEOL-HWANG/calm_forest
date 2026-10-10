// =============================================================
//  calm forest · 관리자 페이지 공통 (허브 · 애널리틱스 · 실험)
//  - Supabase 클라이언트 · 로그인 게이트 · 임시 공유 링크(?k=)
//  - "분석 중" 로딩 배너(캐릭터가 단계를 바꿔 가며 안내)
//  - 색은 _dash.css 토큰에서만 읽는다(V)
// =============================================================
import { CONFIG, isSupabaseConfigured } from '../../js/config.js';

export const $ = (id) => document.getElementById(id);
export const V = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
export const CHAR = (id) => `img/chars/${id}.png`;
export const nf = (n) => (n ?? 0).toLocaleString('ko-KR');
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function showMsg(html) {
  const m = $('msg');
  if (!m) return;
  m.style.display = 'block';
  m.innerHTML = html;
}

// 임시 공개 링크: ?k=<토큰> — cf_share_links 표에서 발급(docs/ops/DEPLOY.md). 유효성은 서버 RPC 가 판정.
export const shareKey = new URLSearchParams(location.search).get('k') || '';

/** Supabase 를 열고 로그인 게이트를 통과하면 클라이언트를 돌려준다. 통과 못 하면 null(안내는 화면에 띄움). */
export async function bootAdmin({ allowShare = true } = {}) {
  if (!isSupabaseConfigured()) {
    showMsg('⚠️ Supabase 키가 설정되지 않았습니다. <code>js/config.js</code>를 먼저 채워 주세요.');
    return null;
  }
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const sb = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, { auth: { detectSessionInUrl: true, persistSession: true } });
  if (allowShare && shareKey) return sb;

  const { data } = await sb.auth.getSession();
  if (!data?.session) {
    showMsg(`<img class="msg-char" src="${CHAR('panda')}" alt="">로그인이 필요합니다.<br><br><button id="lg">구글로 로그인</button>
      <br><small style="opacity:.6">또는 게임에서 먼저 로그인한 뒤 이 페이지를 여세요</small>`);
    $('lg').onclick = () => sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
    return null;
  }
  return sb;
}

/** RPC 오류를 사람이 읽을 안내로 바꾼다. */
export function explainRpcError(error, fn) {
  const msg = String(error?.message || error);
  if (msg.includes('권한')) {
    return shareKey
      ? '🔒 공유 링크가 만료됐거나 올바르지 않습니다.<br><small style="opacity:.6">관리자에게 새 링크를 요청해 주세요.</small>'
      : '🚫 관리자 계정이 아닙니다.<br><small style="opacity:.6">cf_is_admin() 의 허용 목록(이메일+UUID)을 확인하세요.</small>';
  }
  if (/function|does not exist/i.test(msg)) {
    return `함수 <code>${esc(fn)}</code> 를 찾을 수 없습니다.<br><small style="opacity:.6">sql/ 의 해당 파일을 DB 에 적용했는지 확인하세요.</small>`;
  }
  return '오류: ' + esc(msg);
}

// ── "분석 중" 로딩 배너 ─────────────────────────────────────────
//   화면을 비우지 않는다: 이전 숫자는 흐리게(.is-loading) 두고, 배너에서 캐릭터가 단계를 바꿔 가며 안내.
//   단계는 실제 서버 작업 순서(롤업 → 키 묶기 → 리텐션 → 퍼널)를 따라가는 연출 — 응답이 오면 바로 끝낸다.
const STEPS = [
  ['fox', '여우가 오늘 세션을 말아 두는 중'],
  ['panda', '판다가 기기별로 유저를 묶는 중'],
  ['bear', '곰이 코호트 리텐션을 세는 중'],
  ['chick', '병아리가 퍼널 단계를 줄 세우는 중'],
];
export function createLoader(root, el) {
  let timer = null;
  const img = el.querySelector('img'), step = el.querySelector('.step'), bar = el.querySelector('.bar i'), label = el.querySelector('.t');
  const show = (i) => {
    const [c, text] = STEPS[i % STEPS.length];
    img.src = CHAR(c);
    step.textContent = text;
    bar.style.width = `${Math.min(90, (i + 1) * 22)}%`;
  };
  return {
    start(text) {
      label.textContent = text;
      root.classList.add('is-loading');
      let i = 0;
      show(i);
      clearInterval(timer);
      timer = setInterval(() => show(++i), 650);
    },
    done() {
      clearInterval(timer);
      bar.style.width = '100%';
      root.classList.remove('is-loading');
    },
  };
}
