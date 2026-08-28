// =============================================================
//  🏆 GET /api/leaderboard?board=rich[&uid=<uuid>]
//  ------------------------------------------------------------
//  Supabase RPC(public.leaderboard) 프록시 + 엣지 캐시 5분.
//  - 보드 데이터는 전 유저 동일 → 캐시 적중률이 높아 DB 부하 ~0
//  - uid 는 "내 순위" 표시용(선택) — 캐시 키에 포함되어 유저별로 분리 캐시
//  - 시크릿 불필요: RPC 가 anon 실행 허용(security definer, 식별자 미반환)
// =============================================================

const BOARDS = new Set(['boat', 'sea', 'rich', 'quest', 'mine', 'cook']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TTL = 300;   // 5분 — 주간 랭킹에 충분한 신선도

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extra },
  });
}

export async function onRequestGet({ request, env, waitUntil }) {
  const url = new URL(request.url);
  const board = url.searchParams.get('board') || 'rich';
  const uid = url.searchParams.get('uid') || '';
  if (!BOARDS.has(board)) return json({ error: 'unknown board' }, 400);
  if (uid && !UUID_RE.test(uid)) return json({ error: 'bad uid' }, 400);

  // 엣지 캐시 — 보드+uid 조합 키(같은 유저는 5분에 1번만 DB 도달)
  const cache = caches.default;
  const cacheKey = new Request(`${url.origin}/api/leaderboard?board=${board}&uid=${uid}`, { method: 'GET' });
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/leaderboard`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: env.SUPABASE_ANON_KEY,
      authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ p_board: board, p_uid: uid || null }),
  });
  if (!r.ok) {
    console.log(JSON.stringify({ evt: 'leaderboard_rpc_fail', status: r.status, body: (await r.text()).slice(0, 200) }));
    return json({ error: 'upstream' }, 502);
  }
  const data = await r.json();

  const out = json(data, 200, { 'cache-control': `public, max-age=${TTL}` });
  if (waitUntil) waitUntil(cache.put(cacheKey, out.clone()));
  return out;
}
