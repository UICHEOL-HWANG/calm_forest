// =============================================================
//  calm forest · 🔔 FCM HTTP v1 (Workers 런타임, 의존성 없음)
//  ------------------------------------------------------------
//  ▶ 인증: 서비스 계정 JSON(시크릿 FCM_SA_KEY)으로 RS256 JWT 를 WebCrypto 로 서명 →
//    oauth2 토큰 교환 → access_token 을 KV(CARDNEWS, 'fcm:token')에 55분 캐시.
//    cron 한 번에 subrequest 를 아끼려고 캐시가 있으면 교환을 건너뛴다.
//  ▶ 실패는 던지지 않고 null / { ok:false } — 푸시가 안 가는 것뿐, 게임·다른 cron 은 그대로.
//  ▶ dead: FCM 이 UNREGISTERED(앱 삭제·토큰 만료)라고 답한 토큰 — 호출부가 지운다.
//    일시 장애(5xx·네트워크)로는 지우지 않는다.
//  (테스트: node --test tests/push-fcm.test.mjs)
// =============================================================

const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const KV_KEY = 'fcm:token';
const CACHE_TTL_S = 3300;      // 토큰 수명 1시간 — 5분 여유
const TIMEOUT_MS = 8000;

const b64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlJson = obj => b64url(new TextEncoder().encode(JSON.stringify(obj)));

function pemToPkcs8(pem) {
  const body = String(pem).replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  return Uint8Array.from(atob(body), c => c.charCodeAt(0));
}

/** 서비스 계정 → 서명된 JWT(assertion). nowSec 은 테스트용 */
export async function signJwt(sa, nowSec = Math.floor(Date.now() / 1000)) {
  const head = b64urlJson({ alg: 'RS256', typ: 'JWT' });
  const claim = b64urlJson({ iss: sa.client_email, scope: SCOPE, aud: sa.token_uri, iat: nowSec, exp: nowSec + 3600 });
  const key = await crypto.subtle.importKey('pkcs8', pemToPkcs8(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${head}.${claim}`));
  return `${head}.${claim}.${b64url(sig)}`;
}

/** 시크릿 JSON 파싱 — 형태가 아니면 null */
export function readServiceAccount(env) {
  try {
    const sa = JSON.parse(env?.FCM_SA_KEY || '');
    if (!sa?.client_email || !sa?.private_key || !sa?.project_id) return null;
    // token_uri 는 고정 — 시크릿을 잘못 넣어도 서명된 JWT 가 엉뚱한 곳으로 가지 않게(보안 리뷰 L3)
    return { ...sa, token_uri: 'https://oauth2.googleapis.com/token' };
  } catch { return null; }
}

function withTimeout(fetchFn, url, init) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  return fetchFn(url, { ...init, signal: ctl.signal }).finally(() => clearTimeout(t));
}

/** access token(캐시 우선) — 없거나 실패면 null */
export async function getAccessToken(env, { fetch: fetchFn = fetch, now = Date.now() } = {}) {
  const sa = readServiceAccount(env);
  if (!sa) return null;
  const kv = env.CARDNEWS;
  try { const hit = await kv?.get(KV_KEY); if (hit) return hit; } catch { /* 캐시 실패는 교환으로 대체 */ }
  try {
    const assertion = await signJwt(sa, Math.floor(now / 1000));
    const res = await withTimeout(fetchFn, sa.token_uri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }).toString(),
    });
    if (!res.ok) { console.warn('[fcm] token exchange failed', res.status); return null; }
    const { access_token: token, expires_in: exp } = await res.json();
    if (!token) return null;
    const ttl = Math.max(60, Math.min(CACHE_TTL_S, (Number(exp) || 3600) - 300));
    try { await kv?.put(KV_KEY, token, { expirationTtl: ttl }); } catch { /* 캐시 못 해도 이번 발송은 진행 */ }
    return token;
  } catch (e) {
    console.warn('[fcm] token error', e?.message);
    return null;
  }
}

/** 한 기기에 한 통 — data 값은 FCM 규칙상 전부 문자열이어야 한다 */
export async function sendFcm({ projectId, accessToken, token, title, body, data = {} }, { fetch: fetchFn = fetch } = {}) {
  const message = {
    token,
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    android: { priority: 'high', notification: { icon: 'ic_stat_leaf', color: '#5f9e6e', channel_id: 'garden' } },   // channel_id = js/push-native.js PUSH_CHANNEL
    apns: { payload: { aps: { sound: 'default' } } },   // 🍎 iOS — 소리 없이 조용히 쌓이지 않게
  };
  try {
    const res = await withTimeout(fetchFn, `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ message }),
    });
    if (res.ok) return { ok: true, status: res.status, dead: false };
    // dead 는 UNREGISTERED 일 때만 — 프로젝트 오설정도 404 NOT_FOUND 라 상태 코드만 보면 멀쩡한 토큰을 지운다
    let dead = false;
    try { dead = ((await res.json())?.error?.details || []).some(d => d?.errorCode === 'UNREGISTERED'); } catch { /* 본문 없음 */ }
    return { ok: false, status: res.status, dead };
  } catch {
    return { ok: false, status: 0, dead: false };
  }
}
