// =============================================================
//  🌾 GET /api/plaza?season=harvest-2026
//  ------------------------------------------------------------
//  Supabase RPC(public.plaza_progress) 프록시 + 엣지 캐시 60초.
//  - 전 유저 동일 데이터 → 캐시 적중률이 높아 DB 부하 ~0
//  - 기부 직후 내 화면은 plaza_donate 응답으로 즉시 갱신하므로 60초 지연은 남의 화면에만
//  - 시크릿 불필요: RPC 가 anon 실행 허용(security definer, 식별자 미반환)
//  로컬 미러: scripts/serve.py serve_plaza — 한쪽만 고치지 말 것
// =============================================================
const SEASON_RE = /^[a-z0-9-]{3,32}$/;
const TTL = 60;

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extra },
  });
}

export async function onRequestGet({ request, env, waitUntil }) {
  const url = new URL(request.url);
  const season = url.searchParams.get('season') || '';
  if (!SEASON_RE.test(season)) return json({ error: 'bad season' }, 400);

  const cache = caches.default;
  const cacheKey = new Request(`${url.origin}/api/plaza?season=${season}`, { method: 'GET' });
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/plaza_progress`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: env.SUPABASE_ANON_KEY,
      authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ p_season: season }),
  });
  if (!r.ok) {
    console.log(JSON.stringify({ evt: 'plaza_rpc_fail', status: r.status, body: (await r.text()).slice(0, 200) }));
    return json({ error: 'upstream' }, 502);
  }
  const out = json(await r.json(), 200, { 'cache-control': `public, max-age=${TTL}` });
  if (waitUntil) waitUntil(cache.put(cacheKey, out.clone()));
  return out;
}
