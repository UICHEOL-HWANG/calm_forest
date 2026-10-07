// =============================================================
//  🏡 GET /api/neighbor?id=<public_id>
//  ------------------------------------------------------------
//  Supabase RPC(public.neighbor_showcase) 프록시 + 엣지 캐시 10분.
//  - 응답은 SQL 이 허용 목록 키만 골라 만든 jsonb — 여기서 더 붙이거나 빼지 않는다
//  - null(비공개·익명·없음)은 404 이고 캐시하지 않는다(다시 켠 마을이 10분 동안 안 보이면 안 된다)
//  - 시크릿 불필요: RPC 가 anon 실행 허용(security definer, user_id 미반환)
//  로컬 미러: scripts/serve.py serve_neighbor — 한쪽만 고치지 말 것
// =============================================================
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TTL = 600;

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extra },
  });
}

export async function onRequestGet({ request, env, waitUntil }) {
  const url = new URL(request.url);
  const id = (url.searchParams.get('id') || '').toLowerCase();
  if (!UUID_RE.test(id)) return json({ error: 'bad id' }, 400);

  const cache = caches.default;
  const cacheKey = new Request(`${url.origin}/api/neighbor?id=${id}`, { method: 'GET' });
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  let r;
  try {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/neighbor_showcase`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: env.SUPABASE_ANON_KEY,
        authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ p_public_id: id }),
    });
  } catch (e) {
    console.log(JSON.stringify({ evt: 'neighbor_rpc_throw', msg: String(e && e.message || e).slice(0, 200) }));
    return json({ error: 'upstream' }, 502);
  }
  if (!r.ok) {
    console.log(JSON.stringify({ evt: 'neighbor_rpc_fail', status: r.status, body: (await r.text()).slice(0, 200) }));
    return json({ error: 'upstream' }, 502);
  }
  const data = await r.json();
  if (!data) return json({ error: 'not_found' }, 404);
  const out = json(data, 200, { 'cache-control': `public, max-age=${TTL}` });
  if (waitUntil) waitUntil(cache.put(cacheKey, out.clone()));
  return out;
}
