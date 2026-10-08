// =============================================================
//  🏮 /api/aura-order — 빛 공방 주문·조회·수령
//  GET               → 내 최근 주문 3건
//  POST {text,cards} → 오늘(KST) 주문 1건 접수(하루 1회는 DB 유일키가 강제)
//  POST ?claim=<id>  → 완성된 주문을 수령 처리(멱등)
//  ▶ user_id 는 언제나 토큰에서. 쓰기는 서비스 키(RLS 는 본인 읽기만 연다).
//  ▶ 밤 시간 판정은 클라이언트(게임 시간). 서버는 KST 날짜로 하루 1회만 지킨다.
// =============================================================
import { isNicknameBlocked } from '../../js/nickname-filter.js';
import { sanitizeCards, TEXT_MAX } from '../../js/aura/recipe.js';
import { kstDate } from './_game-day.js';
import { storeHeaders, storeReady } from './_ai-store.js';

const BODY_MAX = 4096;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SELECT = 'id,order_date,status,recipe,cards,created_at,ready_at,claimed_at';
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

// orchard-events.js 와 같은 방식 — GoTrue 에 토큰이 살아 있는지 묻는다(게스트 허용)
async function verifyAnyUser(env, request) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    const r = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: env.SUPABASE_ANON_KEY, authorization: 'Bearer ' + token },
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u?.id ? { id: u.id } : null;
  } catch (e) { return null; }
}

async function listMine(env, base, uid) {
  const r = await fetch(`${base}?user_id=eq.${uid}&select=${SELECT}&order=created_at.desc&limit=3`, { headers: storeHeaders(env) });
  if (!r.ok) return json({ error: 'read_failed' }, 502);
  return json({ orders: await r.json() });
}

async function claim(env, base, uid, id, now) {
  if (!UUID_RE.test(id)) return json({ error: 'bad_id' }, 400);
  const r = await fetch(`${base}?id=eq.${id}&user_id=eq.${uid}&status=in.(done,fallback)`, {
    method: 'PATCH', headers: storeHeaders(env, 'return=representation'),
    body: JSON.stringify({ status: 'claimed', claimed_at: new Date(now).toISOString() }),
  });
  if (!r.ok) return json({ error: 'update_failed' }, 502);
  const rows = await r.json();
  if (rows.length) return json({ ok: true, order: rows[0] });
  const g = await fetch(`${base}?id=eq.${id}&user_id=eq.${uid}&select=${SELECT}`, { headers: storeHeaders(env) });
  const [row] = g.ok ? await g.json() : [];
  if (row?.status === 'claimed') return json({ ok: true, order: row });   // 두 번 눌러도 같은 결과
  return json({ error: 'not_ready' }, 409);
}

async function place(env, base, uid, request, now) {
  if (Number(request.headers.get('content-length')) > BODY_MAX) return json({ error: 'too_large' }, 413);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > BODY_MAX) return json({ error: 'too_large' }, 413);   // UTF-8 바이트 기준
  let body;
  try { body = JSON.parse(raw); } catch { return json({ error: 'bad_json' }, 400); }
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (!text || text.length > TEXT_MAX) return json({ error: 'bad_text' }, 400);
  const cards = sanitizeCards(body.cards);
  if (!cards) return json({ error: 'bad_cards' }, 400);
  if (isNicknameBlocked(text)) return json({ error: 'blocked' }, 422);
  const row = {
    user_id: uid, order_date: kstDate(now), text, cards, status: 'pending',
    client_id: typeof body.client_id === 'string' ? body.client_id.slice(0, 64) : null,
    platform: typeof body.platform === 'string' ? body.platform.slice(0, 16) : null,
  };
  const r = await fetch(base, { method: 'POST', headers: storeHeaders(env, 'return=representation'), body: JSON.stringify(row) });
  if (r.status === 409) return json({ error: 'limit' }, 409);
  if (!r.ok) return json({ error: 'insert_failed' }, 502);
  const [o] = await r.json();
  return json({ order: { id: o.id, order_date: o.order_date, status: o.status } }, 201);
}

export async function onRequest({ request, env, now = Date.now() }) {
  if (!storeReady(env) || !env?.SUPABASE_ANON_KEY) return json({ error: 'not_configured' }, 503);
  const user = await verifyAnyUser(env, request);
  if (!user) return json({ error: 'login_required' }, 401);
  const base = `${env.SUPABASE_URL}/rest/v1/aura_orders`;
  try {
    if (request.method === 'GET') return await listMine(env, base, user.id);
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
    const claimId = new URL(request.url).searchParams.get('claim');
    return claimId !== null ? await claim(env, base, user.id, claimId, now) : await place(env, base, user.id, request, now);
  } catch (e) {
    return json({ error: 'server_error' }, 500);
  }
}
