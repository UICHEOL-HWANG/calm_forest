// =============================================================
//  calm forest · 📦 소재 묶음 (Pages Function)
//  ------------------------------------------------------------
//  GET   /api/cards-bundles
//  POST  /api/cards-bundles   { title, memo, topic_ids: [] }
//  PATCH /api/cards-bundles   { id, title?, memo?, status? }
//
//  묶음 하나 = 카드뉴스 한 편의 씨앗. status='ready' 가 "초안 만들어 달라" 신호다.
// =============================================================
import { readBearer, getUserId, json, isUuid } from './_cards-auth.js';

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

  // topics(count) 로 묶인 소재 수를 함께 센다 — 목록에 "3건" 을 보여주려고
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/bundles?select=id,title,memo,status,created_at,topics(count)&owner=eq.${uid}&order=created_at.desc`,
    { headers: H(env) },
  );
  if (!res.ok) return json({ error: 'query failed' }, 502);
  const rows = await res.json();
  return json({
    bundles: rows.map(b => ({
      id: b.id, title: b.title, memo: b.memo, status: b.status,
      created_at: b.created_at, topic_count: b.topics?.[0]?.count ?? 0,
    })),
  });
}

export async function onRequestPost({ request, env }) {
  const uid = await getUserId(readBearer(request), env);
  if (!uid) return json({ error: 'unauthorized' }, 401);

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  if (!title) return json({ error: 'title required' }, 400);
  const ids = Array.isArray(body?.topic_ids) ? body.topic_ids.filter(isUuid) : [];

  const made = await fetch(`${env.SUPABASE_URL}/rest/v1/bundles`, {
    method: 'POST',
    headers: { ...H(env), Prefer: 'return=representation' },
    body: JSON.stringify([{ owner: uid, title, memo: typeof body?.memo === 'string' ? body.memo.trim() : '' }]),
  });
  if (!made.ok) return json({ error: 'insert failed' }, 502);
  const bundle = (await made.json())[0];

  // 소재를 묶음에 건다. 여기서 실패해도 묶음은 남는다 — 화면에서 다시 담으면 된다.
  if (ids.length) {
    await fetch(
      `${env.SUPABASE_URL}/rest/v1/topics?owner=eq.${uid}&id=in.(${ids.join(',')})`,
      {
        method: 'PATCH',
        headers: { ...H(env), Prefer: 'return=minimal' },
        body: JSON.stringify({ bundle_id: bundle.id }),
      },
    );
  }
  return json({ ok: true, id: bundle.id });
}

export async function onRequestPatch({ request, env }) {
  const uid = await getUserId(readBearer(request), env);
  if (!uid) return json({ error: 'unauthorized' }, 401);

  const body = await request.json().catch(() => null);
  if (!isUuid(body?.id)) return json({ error: 'id required' }, 400);

  const patch = {};
  if (typeof body.title === 'string') patch.title = body.title.trim();
  if (typeof body.memo === 'string') patch.memo = body.memo.trim();
  if (body.status === 'draft' || body.status === 'ready') patch.status = body.status;
  if (Object.keys(patch).length === 0) return json({ error: 'nothing to update' }, 400);

  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/bundles?id=eq.${body.id}&owner=eq.${uid}`,
    { method: 'PATCH', headers: { ...H(env), Prefer: 'return=minimal' }, body: JSON.stringify(patch) },
  );
  if (!res.ok) return json({ error: 'update failed' }, 502);
  return json({ ok: true });
}
