// =============================================================
//  calm forest · 🍎 과수원 이벤트 원장 적재 API (Cloudflare Pages Function)
//  ------------------------------------------------------------
//  POST /api/orchard-events
//    body: { event, kind?, n?, near_stream?, method?, trees?, platform? }
//    → { ok: true }
//
//  ▶ 왜 있나: GA4 는 광고차단에 유실되고 BigQuery export 가 일별이라 당일
//    확인이 안 된다. 과수원은 리텐션 측정이 존재 이유인 기능이라 핵심
//    생애주기 이벤트를 sql/orchard_events.sql 테이블에도 직접 남긴다.
//    game_logs(좌표 전용)와 섞지 않는다.
//
//  ▶ 인증: Authorization: Bearer <Supabase JWT> → GoTrue /auth/v1/user 로 검증.
//    photo.js 의 verifyUser 와 달리 게스트(익명)도 통과시킨다 — 플레이어
//    대부분이 게스트이고, 리텐션 측정은 게스트를 빼면 의미가 없다.
//  ▶ user_id 는 클라이언트가 보내지 않는다 — 검증된 JWT 의 sub(유저 id)를
//    서버가 그대로 쓴다(남의 uid 로 대신 기록하는 통로를 원천 차단).
//  ▶ insert 는 service_role 이 아니라 유저 자신의 access token 으로 PostgREST 를
//    호출한다 — RLS 의 (select auth.uid()) 가 이 토큰의 sub 로 풀려 본인 행만 쓴다.
//  ▶ 실패해도 게임을 막지 않는다 — 클라이언트가 fire-and-forget 으로 호출한다.
// =============================================================

// js/game.js 가 실제로 쏘는 이벤트만 허용한다(sql/orchard_events.sql 의 열 주석과 짝).
const EVENTS = new Set(['sapling_plant', 'tree_water', 'fruit_ready', 'fruit_harvest', 'fruit_capped', 'tree_chop']);
const KINDS = new Set(['apple', 'pear', 'peach', 'persimmon', 'chestnut']);

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

// GoTrue 로 토큰을 검증한다 — photo.js 의 verifyUser 와 달리 익명(게스트)도 통과.
async function verifyAnyUser(env, request) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    const r = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: env.SUPABASE_ANON_KEY, authorization: 'Bearer ' + token },
    });
    if (!r.ok) return null;
    const u = await r.json();
    if (!u?.id) return null;
    return { id: u.id, token };
  } catch (e) { return null; }
}

function clampInt(v, max = 999) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(0, Math.min(n, max)) : undefined;
}

export async function onRequestPost({ request, env }) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return json({ error: 'not_configured' }, 503);

  const user = await verifyAnyUser(env, request);
  if (!user) return json({ error: 'login_required' }, 401);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'bad_json' }, 400); }

  const event = String(body?.event || '');
  if (!EVENTS.has(event)) return json({ error: 'unknown_event' }, 400);

  // 입력 정규화 — 화이트리스트 밖 값은 조용히 버리고, 모르는 필드는 애초에 옮기지 않는다.
  const row = { user_id: user.id, event };
  const kind = String(body?.kind || '');
  if (KINDS.has(kind)) row.kind = kind;
  if (body?.n !== undefined) { const n = clampInt(body.n); if (n !== undefined) row.n = n; }
  if (body?.near_stream !== undefined) row.near_stream = body.near_stream === true;
  if (body?.method !== undefined) row.method = String(body.method).slice(0, 40);   // 'source' 금지(GA4 예약어) — 이 필드가 그 대체
  if (body?.trees !== undefined) { const t = clampInt(body.trees); if (t !== undefined) row.trees = t; }
  if (body?.platform !== undefined) row.platform = String(body.platform).slice(0, 20);

  try {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/orchard_events`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: env.SUPABASE_ANON_KEY,
        authorization: `Bearer ${user.token}`,   // 유저 본인 토큰 — RLS auth.uid() 가 이 sub 로 풀린다
        prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    });
    if (!r.ok) {
      const detail = (await r.text()).slice(0, 300);
      console.error(JSON.stringify({ message: 'orchard-events insert failed', status: r.status, detail }));
      return json({ error: 'insert_failed' }, 502);
    }
    return json({ ok: true });
  } catch (e) {
    console.error(JSON.stringify({ message: 'orchard-events failed', error: e.message }));
    return json({ error: 'server_error' }, 500);
  }
}
