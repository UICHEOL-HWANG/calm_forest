// =============================================================
//  calm forest · 🔐 카드뉴스 API 인증 공통부
//  ------------------------------------------------------------
//  인증이 둘로 갈린다:
//    사람  → Supabase Auth 세션 JWT (Authorization: Bearer)
//    크론  → 시크릿 헤더 (x-cardnews-secret). 로그인한 사용자가 없다.
// =============================================================

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export function readBearer(request) {
  const raw = request.headers.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(raw.trim());
  return m ? m[1].trim() : null;
}

/** 길이가 같을 때 끝까지 훑어 비교한다. 빈 값끼리는 통과시키지 않는다. */
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length === 0 || b.length === 0) return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function isIngestAuthorized(request, env) {
  // ⚠️ 서버에 시크릿이 없으면 무조건 거부한다. 환경변수를 빠뜨린 채 배포했을 때
  //    아무나 쓰기가 되는 게 제일 나쁜 실패다.
  return safeEqual(request.headers.get('x-cardnews-secret') || '', env?.CARDNEWS_INGEST_SECRET || '');
}

/**
 * JWT 서명을 직접 검증하지 않고 Supabase 에 물어본다 — 사용자가 1명이라
 * 요청당 호출 1회가 부담이 아니고, 키 롤링·만료를 그쪽이 책임진다.
 * @returns 사용자 uuid, 아니면 null
 */
export async function getUserId(token, env) {
  if (!token || !env?.SUPABASE_URL || !env?.SUPABASE_ANON_KEY) return null;
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const user = await res.json().catch(() => null);
  return user?.id || null;
}
