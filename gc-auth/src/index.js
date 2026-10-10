// =============================================================
//  calm forest · gc-auth Worker
//  ------------------------------------------------------------
//  iOS 앱의 게임센터 로그인을 Supabase 세션으로 바꿔준다.
//  플레이 게임즈 Worker(pgs-auth/)와 같은 구조 — 검증 단계만 구글 OAuth 교환 대신 Apple 서명 검증.
//
//  흐름:
//   ① 앱이 GKLocalPlayer 자동 인증 → fetchItems(forIdentityVerificationSignature:)
//      → { publicKeyUrl, signature, salt, timestamp, teamPlayerID, bundleID }
//   ② 이 Worker 가 publicKeyUrl(https · *.apple.com)에서 인증서(DER)를 받아 공개키를 꺼내
//      teamPlayerID ‖ bundleID ‖ timestamp(u64 BE) ‖ salt 에 대한 RSA-SHA256 서명을 검증
//   ③ bundleID 는 우리 앱(env.GC_BUNDLE_ID)이어야 하고, timestamp 는 신선해야 한다(재사용 방지)
//   ④ teamPlayerID 기반 Supabase 유저를 찾거나 생성(파생 비밀번호) → 세션 반환
//
//  클라이언트(js/supabase-client.js signInWithGameCenter)와 계약:
//   요청  POST { publicKeyUrl, signature(b64), salt(b64), timestamp(ms), teamPlayerID, bundleID }
//   응답  200 { access_token, refresh_token } | 4xx/5xx { error }
//
//  ▶ 인증서 신뢰: Apple 문서는 발급 체인 확인을 권하지만, Worker 에는 X.509 체인 검증기가 없다.
//    대신 URL 을 https + apple.com 하위 도메인으로 묶는다 — TLS 가 그 호스트의 진위를 보증하므로
//    공격자가 자기 인증서를 내밀 수 없다.
//  ▶ 파생 비밀번호: HMAC-SHA256(GC_USER_SECRET, 'cf-gc:' + teamPlayerID). Worker 밖으로 나가지 않는다.
//    GC_USER_SECRET 을 바꾸면 기존 게임센터 유저 로그인이 전부 깨진다 → 불변.
// =============================================================

const TIMEOUT_MS = 8000;                 // Apple·Supabase 가 멈춰도 Worker 가 끝까지 매달리지 않게
const MAX_AGE_MS = 10 * 60 * 1000;       // 서명 유효 시간 — 이보다 오래된 서명은 재사용으로 본다
const MAX_SKEW_MS = 5 * 60 * 1000;       // 기기 시계가 앞선 경우 허용치
const certCache = new Map();             // publicKeyUrl → 인증서 DER (isolate 수명 동안)

export default {
  fetch(req, env) { return this.handle(req, env, { fetch: globalThis.fetch.bind(globalThis) }); },

  // deps.fetch 주입 — 테스트가 Apple·Supabase 를 흉내 낸다
  async handle(req, env, { fetch }) {
    const cors = corsHeaders();
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return json({ error: 'POST only' }, 405, cors);

    try {
      // 계정 대량 생성 방지 — IP 단위 속도 제한(wrangler.toml [[ratelimits]], 없으면 통과)
      if (env.GC_LIMITER) {
        const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
        const { success } = await env.GC_LIMITER.limit({ key: ip });
        if (!success) return json({ error: '요청이 너무 많아요 — 잠시 후 다시 시도해 주세요' }, 429, cors);
      }
      for (const k of ['GC_USER_SECRET', 'GC_BUNDLE_ID', 'SUPABASE_SERVICE_KEY', 'SUPABASE_ANON_KEY']) {
        if (!env[k]) return json({ error: k + ' 미설정 — README 참고' }, 500, cors);
      }
      const body = parseBody(await req.json().catch(() => null));

      // ②③ Apple 서명 검증 — 통과하지 못하면 여기서 끝(Supabase 는 부르지 않는다)
      if (body.bundleID !== env.GC_BUNDLE_ID) throw new HttpError('bundleID 불일치 ' + body.bundleID, 401, '앱 불일치');
      const age = Date.now() - Number(body.timestamp);
      if (age > MAX_AGE_MS || age < -MAX_SKEW_MS) throw new HttpError('timestamp 범위 밖 age=' + age, 401, '서명 만료');
      const certDer = await fetchCert(fetch, body.publicKeyUrl);
      if (!await verifyGcSignature({ certDer, ...body })) throw new HttpError('서명 불일치', 401, '서명 검증 실패');

      // ④ Supabase 유저 확보 + 세션 발급
      const { email, password, uid } = await gcIdentity(env.GC_USER_SECRET, body.teamPlayerID);
      let session = await passwordSignIn(fetch, env, email, password);
      if (!session) {
        await adminCreateUser(fetch, env, email, password, uid);   // 첫 진입 → 유저 생성(동시 요청이 먼저 만들었으면 그냥 통과)
        session = await passwordSignIn(fetch, env, email, password);
      }
      if (!session) return json({ error: 'Supabase 세션 발급 실패' }, 500, cors);

      return json({ access_token: session.access_token, refresh_token: session.refresh_token }, 200, cors);
    } catch (err) {
      // 진단 로그 — 서명·플레이어 id 원문은 남기지 않는다. 클라이언트에는 단계 이름만.
      const status = err instanceof HttpError ? err.status : 500;
      console.error(JSON.stringify({ gcAuthFail: true, status, message: String(err?.message || err).slice(0, 300),
                                     ua: (req.headers.get('User-Agent') || '').slice(0, 80) }));
      return json({ error: err instanceof HttpError ? err.publicMessage : '서버 오류' }, status, cors);
    }
  },
};

// 요청 본문 모양 검사 — 모자라거나 이상하면 400
function parseBody(b) {
  const str = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= max;
  if (!b || !str(b.teamPlayerID, 200) || !str(b.bundleID, 200) || !str(b.signature, 4096) || !str(b.salt, 512)
      || !/^\d{1,16}$/.test(String(b.timestamp ?? '')) || !str(b.publicKeyUrl, 500)) {
    throw new HttpError('본문 형식 오류', 400, '요청 형식 오류');
  }
  if (!checkPublicKeyUrl(b.publicKeyUrl)) throw new HttpError('publicKeyUrl 거부 ' + b.publicKeyUrl.slice(0, 80), 400, '요청 형식 오류');
  return { teamPlayerID: b.teamPlayerID, bundleID: b.bundleID, signature: b.signature, salt: b.salt,
           timestamp: String(b.timestamp), publicKeyUrl: b.publicKeyUrl };
}

// https 의 apple.com(하위 도메인 포함)만 — 공격자가 자기 인증서를 내밀지 못하게
export function checkPublicKeyUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && (u.hostname === 'apple.com' || u.hostname.endsWith('.apple.com'));
  } catch { return false; }
}

async function fetchCert(fetch, url) {
  if (certCache.has(url)) return certCache.get(url);
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new HttpError('인증서 다운로드 실패 HTTP ' + res.status, 502, '인증서 확인 실패');
  const der = new Uint8Array(await res.arrayBuffer());
  certCache.set(url, der);
  return der;
}

// 서명 대상 바이트: teamPlayerID(UTF-8) ‖ bundleID(UTF-8) ‖ timestamp(u64 big-endian) ‖ salt
export function signedPayload({ teamPlayerID, bundleID, timestamp, salt }) {
  const enc = new TextEncoder();
  const a = enc.encode(teamPlayerID), b = enc.encode(bundleID);
  const ts = new Uint8Array(8);
  new DataView(ts.buffer).setBigUint64(0, BigInt(timestamp), false);
  const out = new Uint8Array(a.length + b.length + 8 + salt.length);
  out.set(a, 0); out.set(b, a.length); out.set(ts, a.length + b.length); out.set(salt, a.length + b.length + 8);
  return out;
}

export async function verifyGcSignature({ certDer, signature, salt, timestamp, teamPlayerID, bundleID }) {
  try {
    const key = await crypto.subtle.importKey('spki', spkiFromCertDer(certDer),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const data = signedPayload({ teamPlayerID, bundleID, timestamp, salt: b64(salt) });
    return await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64(signature), data);
  } catch (e) {
    console.warn('[gc-auth] 검증 예외', String(e?.message || e).slice(0, 120));
    return false;
  }
}

// X.509 DER → SubjectPublicKeyInfo DER. WebCrypto 는 인증서를 직접 못 읽으므로 최소한의 ASN.1 탐색.
//  Certificate ::= SEQ { tbs SEQ { [0] version?, serial, sigAlg, issuer, validity, subject, spki, ... }, ... }
export function spkiFromCertDer(der) {
  const cert = tlv(der, 0);
  const tbs = tlv(der, cert.start);
  let p = tbs.start;
  if (der[p] === 0xa0) p = tlv(der, p).end;          // [0] EXPLICIT version
  for (let i = 0; i < 5; i++) p = tlv(der, p).end;   // serial · sigAlg · issuer · validity · subject
  const spki = tlv(der, p);
  if (spki.tag !== 0x30) throw new Error('SPKI 를 찾지 못함');
  return der.slice(spki.at, spki.end);
}

function tlv(b, at) {
  if (at + 2 > b.length) throw new Error('DER 길이 부족');
  const tag = b[at];
  let len = b[at + 1], p = at + 2;
  if (len & 0x80) {
    const n = len & 0x7f;
    if (n < 1 || n > 4) throw new Error('DER 길이 형식 오류');
    len = 0;
    for (let i = 0; i < n; i++) len = len * 256 + b[p++];
  }
  if (p + len > b.length) throw new Error('DER 범위 초과');
  return { tag, at, start: p, end: p + len };
}

// teamPlayerID → 합성 이메일 + 파생 비밀번호. 원본 id 는 Supabase 에 남기지 않는다(해시만)
export async function gcIdentity(secret, teamPlayerID) {
  const uid = (await sha256hex(teamPlayerID)).slice(0, 32);   // 이메일 local part 64자 제한
  return { uid, email: `gc-${uid}@gc.calmforest.local`, password: await hmacHex(secret, 'cf-gc:' + teamPlayerID) };
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

function b64(s) {
  const bin = atob(s);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
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

// 관리자 API 로 게임센터 유저 생성(이메일 확인 완료) — 클라이언트는 합성 이메일 도메인으로 식별(js/auth/account-kind.js)
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
      user_metadata: { gc: true, gc_player_key: uid, name: '게임 센터 유저' },
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

// 서명은 Apple 이 지키므로 CORS 는 보안 경계가 아니다(pgs-auth 와 같은 판단)
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
