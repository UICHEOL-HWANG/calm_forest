// =============================================================
//  calm forest · toss-auth Worker
//  ------------------------------------------------------------
//  앱인토스 웹뷰의 "게임 사용자 식별키"를 Supabase 세션으로 바꿔준다.
//
//  ▶ 왜 토스 로그인(appLogin)이 아니라 식별키인가
//    토스 로그인은 사업자 등록을 거친 '토스로그인 약관 동의'가 있어야 쓸 수 있다.
//    게임 카테고리 미니앱은 getUserKeyForGame() 으로 약관 동의·유저 동의 화면
//    없이 안정적인 식별자(hash)를 받고, 파트너 서버가 mTLS 로 anon-key/verify 를
//    호출해 그 hash 가 진짜인지 검증한다.
//    (문서: /documentation/common/authentication/hash-key)
//
//  흐름:
//   ① 클라이언트 getUserKeyForGame() → { type:'HASH', hash }
//   ② 이 Worker 가 mTLS 로 anon-key/verify 호출해 hash 진위 확인
//   ③ hash 기반 Supabase 유저를 찾거나 생성(파생 비밀번호 방식)
//   ④ Supabase 세션(access/refresh 토큰)을 발급해 클라이언트로 반환
//
//  클라이언트(js/supabase-client.js signInWithToss)와 계약:
//   요청  POST { anonKey }
//   응답  200 { access_token, refresh_token } | 4xx/5xx { error }
//
//  ▶ 파생 비밀번호 방식: password = HMAC-SHA256(TOSS_USER_SECRET, anonKey)
//    비밀번호는 이 Worker 밖으로 절대 나가지 않음. 시크릿이 바뀌면
//    기존 토스 유저 로그인이 전부 깨지므로 TOSS_USER_SECRET 은 불변으로 관리.
// =============================================================

const VERIFY_PATH = '/api-partner/v1/apps-in-toss/users/anon-key/verify';

export default {
  async fetch(req, env) {
    const cors = corsHeaders(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return json({ error: 'POST only' }, 405, cors);

    try {
      const { anonKey } = await req.json();
      if (!anonKey) return json({ error: 'anonKey 가 필요합니다' }, 400, cors);
      // 토스 파트너 API 는 시크릿 헤더가 아니라 mTLS 로 파트너를 식별한다
      if (!env.TOSS_MTLS) return json({ error: 'mTLS 인증서 바인딩 미설정 — wrangler.toml 참고' }, 500, cors);

      // ①② 식별키 진위 검증 — 통과하지 못하면 여기서 끝
      await verifyGameKey(env, anonKey);

      // ③④ Supabase 유저 확보 + 세션 발급
      //    합성 이메일의 local part 는 64자 제한이라 식별자를 32자로 줄여 쓴다.
      //    원본 hash 는 Supabase 에 저장하지 않는다(파생값만 남김).
      const uid = (await sha256hex(anonKey)).slice(0, 32);
      const email = `toss-${uid}@toss.calmforest.local`;   // 합성 이메일(외부 발송 없음)
      const password = await derivePassword(env.TOSS_USER_SECRET, anonKey);
      let session = await passwordSignIn(env, email, password);
      if (!session) {
        await adminCreateUser(env, email, password, uid);   // 첫 진입 → 유저 생성
        session = await passwordSignIn(env, email, password);
      }
      if (!session) return json({ error: 'Supabase 세션 발급 실패' }, 500, cors);

      return json({ access_token: session.access_token, refresh_token: session.refresh_token }, 200, cors);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, err.status, cors);
      return json({ error: String(err?.message || err) }, 500, cors);
    }
  },
};

// ── ② 게임 사용자 식별키 검증 (getUserKeyForGame 의 hash) ─────────
//   검증 API 는 진위만 알려주고(resultType: SUCCESS) 식별자를 되돌려주지 않는다.
//   → 검증에 통과한 hash 자체가 그 유저의 식별자다.
async function verifyGameKey(env, anonKey) {
  const res = await env.TOSS_MTLS.fetch(env.TOSS_API_BASE + VERIFY_PATH, {
    method: 'POST',
    headers: { 'x-anon-key': anonKey },
  });
  if (!res.ok) throw new HttpError('식별키 검증 실패 HTTP ' + res.status + ' ' + await peek(res), 502);
  const data = await res.json();
  const ok = data.resultType === 'SUCCESS' || data.success === 'true' || data.success === true;
  if (!ok) throw new HttpError('식별키가 거절되었습니다: ' + JSON.stringify(data).slice(0, 200), 401);
}

// anonKey → 결정적 비밀번호(HMAC-SHA256, hex) — Worker 밖으로 나가지 않음
async function derivePassword(secret, anonKey) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('cf-toss:' + anonKey));
  return hex(sig);
}

async function sha256hex(s) {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
}

function hex(buf) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
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
async function adminCreateUser(env, email, password, uid) {
  const res = await fetch(env.SUPABASE_URL + '/auth/v1/admin/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY,
    },
    body: JSON.stringify({
      email, password, email_confirm: true,
      user_metadata: { toss: true, toss_user_key: uid, name: '토스 유저' },
    }),
  });
  if (!res.ok) throw new HttpError('유저 생성 실패 HTTP ' + res.status + ' ' + (await res.text()).slice(0, 200), 500);
}

// ── 헬퍼 ──
// 상태코드를 달고 던지는 에러 — fetch 핸들러가 그대로 JSON 응답으로 변환한다
class HttpError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

// 실패 응답의 본문 앞부분만 진단용으로 뽑는다(성공 응답에는 쓰지 않음 — 토큰 노출 방지)
async function peek(res) {
  try { return (await res.text()).slice(0, 200); } catch (e) { return '(본문 없음)'; }
}

function corsHeaders(req, env) {
  // 앱인토스 웹뷰의 번들 오리진은 토스가 정하고 예고 없이 바뀔 수 있다(실측: 허용 목록 매칭으로
  // 프리플라이트만 오고 본 요청이 막혔음). 식별키는 토스 서버 검증 + mTLS 가 지키므로
  // CORS 는 보안 경계가 아니다 → 오리진을 가리지 않고, 대신 어떤 오리진이 오는지 로그로 남긴다.
  const origin = req.headers.get('Origin') || '(없음)';
  console.log(JSON.stringify({ method: req.method, origin, ua: (req.headers.get('User-Agent') || '').slice(0, 80) }));
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...cors } });
}
