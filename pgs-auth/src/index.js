// =============================================================
//  calm forest · pgs-auth Worker
//  ------------------------------------------------------------
//  구글 플레이 앱의 Play Games 로그인을 Supabase 세션으로 바꿔준다.
//  토스 식별키 Worker(toss-auth/)와 같은 구조 — 검증 단계만 mTLS 대신 구글 OAuth 교환.
//
//  흐름:
//   ① 앱이 Play Games v2 자동 로그인 → requestServerSideAccess → 1회용 authCode
//   ② 이 Worker 가 oauth2.googleapis.com/token 으로 교환(게임 서버 클라이언트 id/secret)
//   ③ games/v1/players/me 로 playerId 확정 — 구글이 발급한 토큰이라 위조 불가
//   ④ playerId 기반 Supabase 유저를 찾거나 생성(파생 비밀번호) → 세션 반환
//
//  클라이언트(js/supabase-client.js signInWithPlayGames)와 계약:
//   요청  POST { authCode }
//   응답  200 { access_token, refresh_token } | 4xx/5xx { error }
//
//  ▶ 파생 비밀번호: HMAC-SHA256(PGS_USER_SECRET, 'cf-pgs:' + playerId). Worker 밖으로 나가지 않는다.
//    PGS_USER_SECRET 을 바꾸면 기존 플레이 유저 로그인이 전부 깨진다 → 불변.
//  ▶ 별도 Worker 인 이유: 토스 경로(인증서 사고 이력)에 새 코드를 섞지 않고, 시크릿도 분리한다.
// =============================================================

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const TIMEOUT_MS = 8000;   // 구글·Supabase 가 멈춰도 Worker 가 끝까지 매달리지 않게
const PLAYER_URL = 'https://games.googleapis.com/games/v1/players/me';

export default {
  fetch(req, env) { return this.handle(req, env, { fetch: globalThis.fetch.bind(globalThis) }); },

  // deps.fetch 주입 — 테스트가 구글·Supabase 를 흉내 낸다
  async handle(req, env, { fetch }) {
    const cors = corsHeaders();
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return json({ error: 'POST only' }, 405, cors);

    try {
      // 계정 대량 생성·구글 쿼터 소진 방지 — IP 단위 속도 제한(wrangler.toml [[ratelimits]], 없으면 통과)
      if (env.PGS_LIMITER) {
        const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
        const { success } = await env.PGS_LIMITER.limit({ key: ip });
        if (!success) return json({ error: '요청이 너무 많아요 — 잠시 후 다시 시도해 주세요' }, 429, cors);
      }
      const { authCode } = await req.json().catch(() => ({}));
      if (!authCode) return json({ error: 'authCode 가 필요합니다' }, 400, cors);
      for (const k of ['PGS_CLIENT_ID', 'PGS_CLIENT_SECRET', 'PGS_USER_SECRET', 'SUPABASE_SERVICE_KEY', 'SUPABASE_ANON_KEY']) {
        if (!env[k]) return json({ error: k + ' 미설정 — README 참고' }, 500, cors);
      }

      // ②③ 구글 검증 — 통과하지 못하면 여기서 끝
      const accessToken = await exchangeCode({ fetch, clientId: env.PGS_CLIENT_ID, clientSecret: env.PGS_CLIENT_SECRET, code: authCode });
      const playerId = await fetchPlayerId({ fetch, accessToken });

      // ④ Supabase 유저 확보 + 세션 발급
      const { email, password, uid } = await pgsIdentity(env.PGS_USER_SECRET, playerId);
      let session = await passwordSignIn(fetch, env, email, password);
      if (!session) {
        await adminCreateUser(fetch, env, email, password, uid);   // 첫 진입 → 유저 생성(동시 요청이 먼저 만들었으면 그냥 통과)
        session = await passwordSignIn(fetch, env, email, password);
      }
      if (!session) return json({ error: 'Supabase 세션 발급 실패' }, 500, cors);

      return json({ access_token: session.access_token, refresh_token: session.refresh_token }, 200, cors);
    } catch (err) {
      // 진단 로그 — authCode·토큰 원문은 남기지 않는다. 상세(구글·Supabase 응답 앞부분)는 로그에만,
      // 클라이언트에는 단계 이름만 돌려준다(내부 구현 노출 방지 — 보안 리뷰 2026-09-25)
      const status = err instanceof HttpError ? err.status : 500;
      console.error(JSON.stringify({ pgsAuthFail: true, status, message: String(err?.message || err).slice(0, 300),
                                     ua: (req.headers.get('User-Agent') || '').slice(0, 80) }));
      return json({ error: err instanceof HttpError ? err.publicMessage : '서버 오류' }, status, cors);
    }
  },
};

// ② authCode → 구글 access_token. redirect_uri 는 빈 문자열(안드로이드 서버 코드 규약)
export async function exchangeCode({ fetch, clientId, clientSecret, code }) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST', signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code,
                                grant_type: 'authorization_code', redirect_uri: '' }).toString(),
  });
  if (!res.ok) throw new HttpError('authCode 교환 실패 HTTP ' + res.status + ' ' + await peek(res), 401, 'authCode 교환 실패');
  const data = await res.json();
  if (!data.access_token) throw new HttpError('구글 응답에 access_token 없음', 502, 'authCode 교환 실패');
  return data.access_token;
}

// ③ 구글이 인증한 플레이어 id
export async function fetchPlayerId({ fetch, accessToken }) {
  const res = await fetch(PLAYER_URL, { headers: { Authorization: 'Bearer ' + accessToken }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new HttpError('플레이어 조회 실패 HTTP ' + res.status + ' ' + await peek(res), 502, '플레이어 조회 실패');
  const data = await res.json();
  //  ⚠️ Games API Player 리소스의 필드는 playerId 다(id 아님 — 2026-09-25 실기기에서 '플레이어 id 없음'으로 실패)
  const playerId = data.playerId || data.id;
  if (!playerId) throw new HttpError('플레이어 id 없음 keys=' + Object.keys(data).join(','), 502, '플레이어 조회 실패');
  return playerId;
}

// playerId → 합성 이메일 + 파생 비밀번호. 원본 playerId 는 Supabase 에 남기지 않는다(해시만)
export async function pgsIdentity(secret, playerId) {
  const uid = (await sha256hex(playerId)).slice(0, 32);   // 이메일 local part 64자 제한
  return { uid, email: `pgs-${uid}@pgs.calmforest.local`, password: await hmacHex(secret, 'cf-pgs:' + playerId) };
}

async function hmacHex(secret, msg) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg)));
}

async function sha256hex(s) {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
}

function hex(buf) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// GoTrue 비밀번호 로그인 → 세션(access/refresh). 유저 없으면 null
async function passwordSignIn(fetch, env, email, password) {
  const res = await fetch(env.SUPABASE_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST', signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'Content-Type': 'application/json', apikey: env.SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return null;
  return await res.json();
}

// 관리자 API 로 플레이 유저 생성(이메일 확인 완료) — user_metadata.pgs 로 클라이언트가 식별
async function adminCreateUser(fetch, env, email, password, uid) {
  const res = await fetch(env.SUPABASE_URL + '/auth/v1/admin/users', {
    method: 'POST', signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      'Content-Type': 'application/json',
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY,
    },
    body: JSON.stringify({
      email, password, email_confirm: true,
      user_metadata: { pgs: true, pgs_player_key: uid, name: '플레이 게임즈 유저' },
    }),
  });
  if (res.ok) return;
  const body = (await res.text()).slice(0, 200);
  //  같은 플레이어의 동시 첫 요청이 먼저 만들었다 — 실패가 아니다(호출부가 로그인으로 이어간다)
  if (res.status === 422 && /email_exists|already/i.test(body)) return;
  throw new HttpError('유저 생성 실패 HTTP ' + res.status + ' ' + body, 500, '유저 생성 실패');
}

// ── 헬퍼 ──
// message = 로그용 상세, publicMessage = 클라이언트에 돌려줄 단계 이름
class HttpError extends Error {
  constructor(message, status, publicMessage = '서버 오류') { super(message); this.status = status; this.publicMessage = publicMessage; }
}

// 실패 응답 본문 앞부분만(성공 응답에는 쓰지 않음 — 토큰 노출 방지)
async function peek(res) {
  try { return (await res.text()).slice(0, 200); } catch { return '(본문 없음)'; }
}

// authCode 는 구글 교환이 지키므로 CORS 는 보안 경계가 아니다(toss-auth 와 같은 판단)
function corsHeaders() {
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
