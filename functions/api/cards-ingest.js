// =============================================================
//  calm forest · 📥 카드뉴스 소재 수집 업로드 (Pages Function)
//  ------------------------------------------------------------
//  POST /api/cards-ingest   헤더: x-cardnews-secret
//    body { date: 'YYYY-MM-DD', sources: { jobplanet:[...], ... } }
//    → { ok: true, count: N }
//
//  ⚠️ 크론이 부른다. 로그인한 사용자가 없으므로 owner 를 auth.uid() 에서
//     꺼낼 수 없다 — 환경변수 CARDNEWS_OWNER_UID 를 쓴다.
//  ⚠️ upsert 다. 크론은 부팅·로그인마다 깨어나므로 같은 날 여러 번 올라온다.
// =============================================================
import { normalizeTopics } from './_cards-normalize.js';
import { isIngestAuthorized, json } from './_cards-auth.js';

export async function onRequestPost({ request, env }) {
  if (!isIngestAuthorized(request, env)) return json({ error: 'unauthorized' }, 401);

  const owner = env.CARDNEWS_OWNER_UID;
  if (!owner) return json({ error: 'CARDNEWS_OWNER_UID missing' }, 500);

  const raw = await request.json().catch(() => null);
  if (!raw) return json({ error: 'bad json' }, 400);

  // raw.date 를 믿지 않는다 — 크론이 자정을 넘겨 돌 수 있다. 다만 주면 존중한다.
  const collectedOn = /^\d{4}-\d{2}-\d{2}$/.test(raw.date || '')
    ? raw.date
    : new Date().toISOString().slice(0, 10);

  const rows = normalizeTopics(raw, { collectedOn }).map(r => ({ ...r, owner }));
  if (rows.length === 0) return json({ ok: true, count: 0 });

  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/topics?on_conflict=owner,collected_on,source,title`,
    {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'content-type': 'application/json',
        'content-profile': 'cardnews',         // public 이 아니라 cardnews 스키마
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(rows),
    },
  );
  if (!res.ok) return json({ error: 'upsert failed', detail: await res.text() }, 502);

  return json({ ok: true, count: rows.length });
}
