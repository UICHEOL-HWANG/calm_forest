// =============================================================
//  calm forest · 🗂️ 소재 목록·숨김 (Pages Function)
//  ------------------------------------------------------------
//  GET   /api/cards-topics?date=2026-09-22[&showDismissed=1]
//  PATCH /api/cards-topics   { id, dismissed }
//
//  ⚠️ 사람이 부른다. owner 는 JWT 에서 꺼낸다 — 클라이언트가 보낸 owner 는 믿지 않는다.
// =============================================================
import { readBearer, getUserId, json } from './_cards-auth.js';

const COLS = 'id,source,category,title,excerpt,url,bundle_id,dismissed';

const H = (env) => ({
  apikey: env.SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
  'content-type': 'application/json',
  'accept-profile': 'cardnews',
  'content-profile': 'cardnews',
});

export async function onRequestGet({ request, env }) {
  const uid = await getUserId(readBearer(request), env);
  if (!uid) return json({ error: 'unauthorized' }, 401);

  const url = new URL(request.url);
  const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: 'bad date' }, 400);

  let q = `topics?select=${COLS}&owner=eq.${uid}&collected_on=eq.${date}&order=source.asc,created_at.asc`;
  if (url.searchParams.get('showDismissed') !== '1') q += '&dismissed=is.false';

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${q}`, { headers: H(env) });
  if (!res.ok) return json({ error: 'query failed' }, 502);
  return json({ topics: await res.json() });
}

export async function onRequestPatch({ request, env }) {
  const uid = await getUserId(readBearer(request), env);
  if (!uid) return json({ error: 'unauthorized' }, 401);

  const body = await request.json().catch(() => null);
  if (!body?.id || typeof body.dismissed !== 'boolean') return json({ error: 'bad body' }, 400);

  // owner=eq.<uid> 를 조건에 함께 건다 — 남의 행 id 를 보내도 0건이 걸린다
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/topics?id=eq.${body.id}&owner=eq.${uid}`,
    {
      method: 'PATCH',
      headers: { ...H(env), Prefer: 'return=minimal' },
      body: JSON.stringify({ dismissed: body.dismissed }),
    },
  );
  if (!res.ok) return json({ error: 'update failed' }, 502);
  return json({ ok: true });
}
