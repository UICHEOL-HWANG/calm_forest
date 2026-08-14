// =============================================================
//  calm forest · 📸 사진 업로드/삭제 프록시 (Cloudflare Pages Function)
//  ------------------------------------------------------------
//  POST   /api/photo        { image: "data:image/jpeg;base64,..." } → OCI 버킷 저장
//  DELETE /api/photo?key=photos/<uid>/<ts>.jpg                      → 오브젝트 삭제
//
//  왜 서버 프록시인가:
//  · OCI Object Storage 는 버킷 CORS 설정을 지원하지 않아 브라우저가
//    직접 fetch PUT 을 할 수 없다(프리플라이트 실패). 프록시는 같은 오리진이라 무관.
//  · PAR(사전인증 URL)를 클라이언트에 심으면 익명 스팸 업로드 통로가 된다.
//    OCI Customer Secret Key(S3 호환)는 서버 환경변수에만 둔다.
//
//  인증: Authorization: Bearer <Supabase JWT> → GoTrue /auth/v1/user 로 검증.
//        게스트(익명)는 403 — 사진첩은 구글(영구) 계정 전용(회원 전환 훅).
//  한도: 유저당 100장(S3 ListObjectsV2 로 오브젝트 수 확인, 저장소가 원본 기준).
//
//  환경변수(로컬 .env / Cloudflare Pages Environment variables):
//    OCI_NAMESPACE (기본 id8g5usnkx1c) · OCI_REGION · OCI_BUCKET
//    OCI_ACCESS_KEY · OCI_SECRET_KEY   (OCI 콘솔 > 내 프로필 > 고객 비밀 키)
//    SUPABASE_URL · SUPABASE_ANON_KEY  (JWT 검증용 — anon key 는 원래 공개값)
// =============================================================

const MAX_PHOTOS = 100;                 // 유저당 보관 한도(초과 시 409 album_full)
const MAX_BYTES = 1_500_000;            // 장당 최대 1.5MB(공유 카드 JPEG 는 보통 200~400KB)

// ── AWS SigV4 서명 (OCI S3 호환 API) ─────────────────────────
const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
async function sha256hex(data) {
  return hex(await crypto.subtle.digest('SHA-256', typeof data === 'string' ? enc.encode(data) : data));
}
async function hmac(key, msg) {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}
async function sigKey(secret, date, region) {
  let k = await hmac(enc.encode('AWS4' + secret), date);
  k = await hmac(k, region); k = await hmac(k, 's3');
  return hmac(k, 'aws4_request');
}
function amzTime() {
  const ts = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  return { ts, date: ts.slice(0, 8) };
}
export function ociHost(env) {
  return `${env.OCI_NAMESPACE || 'id8g5usnkx1c'}.compat.objectstorage.${env.OCI_REGION}.oraclecloud.com`;
}
export function ociReady(env) {
  return !!(env.OCI_REGION && env.OCI_BUCKET && env.OCI_ACCESS_KEY && env.OCI_SECRET_KEY);
}

// 헤더 서명 방식 — PUT/DELETE/GET(list) 공용
export async function s3Fetch(env, method, path, { query = '', body = null, contentType } = {}) {
  const host = ociHost(env);
  const { ts, date } = amzTime();
  const payloadHash = await sha256hex(body || '');
  const headers = { host, 'x-amz-content-sha256': payloadHash, 'x-amz-date': ts };
  if (contentType) headers['content-type'] = contentType;
  const names = Object.keys(headers).sort();
  const canon = [
    method, path, query,
    names.map(h => `${h}:${headers[h]}\n`).join(''),
    names.join(';'), payloadHash,
  ].join('\n');
  const scope = `${date}/${env.OCI_REGION}/s3/aws4_request`;
  const strToSign = ['AWS4-HMAC-SHA256', ts, scope, await sha256hex(canon)].join('\n');
  const sig = hex(await hmac(await sigKey(env.OCI_SECRET_KEY, date, env.OCI_REGION), strToSign));
  const h = { ...headers, authorization: `AWS4-HMAC-SHA256 Credential=${env.OCI_ACCESS_KEY}/${scope}, SignedHeaders=${names.join(';')}, Signature=${sig}` };
  delete h.host;   // fetch 가 host 를 직접 설정
  return fetch(`https://${host}${path}${query ? '?' + query : ''}`, { method, headers: h, body });
}

// 쿼리 서명(presigned GET) — <img src> 로 바로 열 수 있는 1시간짜리 URL
export async function presignGet(env, path, expires = 3600) {
  const host = ociHost(env);
  const { ts, date } = amzTime();
  const scope = `${date}/${env.OCI_REGION}/s3/aws4_request`;
  const qs = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', `${env.OCI_ACCESS_KEY}/${scope}`],
    ['X-Amz-Date', ts],
    ['X-Amz-Expires', String(expires)],
    ['X-Amz-SignedHeaders', 'host'],
  ].map(([k, v]) => `${k}=${encodeURIComponent(v)}`).sort().join('&');
  const canon = ['GET', path, qs, `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const strToSign = ['AWS4-HMAC-SHA256', ts, scope, await sha256hex(canon)].join('\n');
  const sig = hex(await hmac(await sigKey(env.OCI_SECRET_KEY, date, env.OCI_REGION), strToSign));
  return `https://${host}${path}?${qs}&X-Amz-Signature=${sig}`;
}

// ── Supabase JWT 검증 — 유저 확인 + 게스트(익명) 차단 ────────────
export async function verifyUser(env, request) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    const r = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: env.SUPABASE_ANON_KEY, authorization: 'Bearer ' + token },
    });
    if (!r.ok) return null;
    const u = await r.json();
    if (!u?.id || u.is_anonymous) return null;   // 익명(게스트) 차단 — 영구 계정만
    return u;
  } catch (e) { return null; }
}

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

// ── POST /api/photo — 공유 카드 JPEG 업로드 ──────────────────────
export async function onRequestPost({ request, env }) {
  if (!ociReady(env)) return json({ error: 'not_configured' }, 503);
  const user = await verifyUser(env, request);
  if (!user) return json({ error: 'login_required' }, 403);

  let image;
  try { ({ image } = await request.json()); } catch (e) { return json({ error: 'bad_json' }, 400); }
  const m = /^data:image\/jpeg;base64,(.+)$/.exec(image || '');
  if (!m) return json({ error: 'jpeg_only' }, 400);
  const bin = Uint8Array.from(atob(m[1]), c => c.charCodeAt(0));
  if (bin.length > MAX_BYTES) return json({ error: 'too_large' }, 413);

  const prefix = `photos/${user.id}/`;
  // 한도 확인 — 오브젝트 저장소를 원본 기준으로 센다(메타 행 유실과 무관하게 정확)
  const list = await s3Fetch(env, 'GET', `/${env.OCI_BUCKET}`,
    { query: `list-type=2&max-keys=${MAX_PHOTOS}&prefix=${encodeURIComponent(prefix)}` });
  if (!list.ok) return json({ error: 'storage_list_failed', status: list.status }, 502);
  const count = parseInt((await list.text()).match(/<KeyCount>(\d+)<\/KeyCount>/)?.[1] || '0', 10);
  if (count >= MAX_PHOTOS) return json({ error: 'album_full', count }, 409);

  const key = `${prefix}${Date.now()}.jpg`;
  const put = await s3Fetch(env, 'PUT', `/${env.OCI_BUCKET}/${key}`, { body: bin, contentType: 'image/jpeg' });
  if (!put.ok) return json({ error: 'storage_put_failed', status: put.status }, 502);
  return json({ ok: true, key, count: count + 1, max: MAX_PHOTOS });
}

// ── DELETE /api/photo?key=... — 본인 소유 오브젝트만 ─────────────
export async function onRequestDelete({ request, env }) {
  if (!ociReady(env)) return json({ error: 'not_configured' }, 503);
  const user = await verifyUser(env, request);
  if (!user) return json({ error: 'login_required' }, 403);
  const key = new URL(request.url).searchParams.get('key') || '';
  if (!key.startsWith(`photos/${user.id}/`)) return json({ error: 'forbidden' }, 403);   // 남의 키 차단
  const del = await s3Fetch(env, 'DELETE', `/${env.OCI_BUCKET}/${key}`);
  if (!del.ok && del.status !== 404) return json({ error: 'storage_delete_failed', status: del.status }, 502);
  return json({ ok: true });
}
