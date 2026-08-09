// =============================================================
//  calm forest · toss-auth Worker
//  ------------------------------------------------------------
//  앱인토스 웹뷰의 appLogin() 인가코드를 받아:
//   ① 토스 파트너 API(mTLS)로 액세스 토큰 교환(generate-token)
//   ② login-me 로 userKey 조회
//   ③ userKey 기반 Supabase 유저를 찾거나 생성(파생 비밀번호 방식)
//   ④ Supabase 세션(access/refresh 토큰)을 발급해 클라이언트로 반환
//
//  클라이언트(js/supabase-client.js signInWithToss)와 계약:
//   요청  POST { authorizationCode, referrer }
//   응답  200 { access_token, refresh_token } | 4xx/5xx { error }
//
//  ▶ 파생 비밀번호 방식: password = HMAC-SHA256(TOSS_USER_SECRET, userKey)
//    비밀번호는 이 Worker 밖으로 절대 나가지 않음. 시크릿이 바뀌면
//    기존 토스 유저 로그인이 전부 깨지므로 TOSS_USER_SECRET 은 불변으로 관리.
// =============================================================

const TOKEN_PATH = '/api-partner/v1/apps-in-toss/user/oauth2/generate-token';
const ME_PATH = '/api-partner/v1/apps-in-toss/user/oauth2/login-me';

export default {
  async fetch(req, env) {
    const cors = corsHeaders(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return json({ error: 'POST only' }, 405, cors);

    try {
      const { authorizationCode, referrer } = await req.json();
      if (!authorizationCode) return json({ error: 'authorizationCode 누락' }, 400, cors);

      // ① 인가코드 → 토스 액세스 토큰 (mTLS 바인딩 필수)
      if (!env.TOSS_MTLS) return json({ error: 'mTLS 인증서 바인딩 미설정 — wrangler.toml 참고' }, 500, cors);
      const tokenRes = await env.TOSS_MTLS.fetch(env.TOSS_API_BASE + TOKEN_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorizationCode, referrer: referrer || 'DEFAULT' }),
      });
      if (!tokenRes.ok) return json({ error: '토스 토큰 교환 실패 HTTP ' + tokenRes.status }, 502, cors);
      const tokenData = await tokenRes.json();
      const accessToken = tokenData.accessToken || tokenData.success?.accessToken;
      if (!accessToken) return json({ error: '토스 응답에 accessToken 없음' }, 502, cors);

      // ② 토스 유저 식별자(userKey) 조회
      const meRes = await env.TOSS_MTLS.fetch(env.TOSS_API_BASE + ME_PATH, {
        headers: { Authorization: 'Bearer ' + accessToken },
      });
      if (!meRes.ok) return json({ error: 'login-me 실패 HTTP ' + meRes.status }, 502, cors);
      const me = await meRes.json();
      const userKey = me.userKey || me.success?.userKey;
      if (!userKey) return json({ error: '토스 응답에 userKey 없음' }, 502, cors);

      // ③④ Supabase 유저 확보 + 세션 발급
      const email = `toss-${userKey}@toss.calmforest.local`;   // 합성 이메일(외부 발송 없음)
      const password = await derivePassword(env.TOSS_USER_SECRET, String(userKey));
      let session = await passwordSignIn(env, email, password);
      if (!session) {
        await adminCreateUser(env, email, password, userKey);   // 첫 로그인 → 유저 생성
        session = await passwordSignIn(env, email, password);
      }
      if (!session) return json({ error: 'Supabase 세션 발급 실패' }, 500, cors);

      return json({ access_token: session.access_token, refresh_token: session.refresh_token }, 200, cors);
    } catch (err) {
      return json({ error: String(err?.message || err) }, 500, cors);
    }
  },
};

// userKey → 결정적 비밀번호(HMAC-SHA256, hex) — Worker 밖으로 나가지 않음
async function derivePassword(secret, userKey) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('cf-toss:' + userKey));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// GoTrue 비밀번호 로그인 → 세션(access/refresh) 획득. 유저 없으면 null
async function passwordSignIn(env, email, password) {
  const res = await fetch(env.SUPABASE_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: env.SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return null;
  return await res.json();
}

// 관리자 API 로 토스 유저 생성(이메일 확인 완료 상태) — user_metadata.toss 로 클라이언트가 식별
async function adminCreateUser(env, email, password, userKey) {
  const res = await fetch(env.SUPABASE_URL + '/auth/v1/admin/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY,
    },
    body: JSON.stringify({
      email, password, email_confirm: true,
      user_metadata: { toss: true, toss_user_key: String(userKey), name: '토스 유저' },
    }),
  });
  if (!res.ok) throw new Error('유저 생성 실패 HTTP ' + res.status + ' ' + (await res.text()).slice(0, 200));
}

// ── 헬퍼 ──
function corsHeaders(req, env) {
  const origin = req.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim());
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0] || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors } });
}
