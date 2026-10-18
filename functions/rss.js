const SITE = 'https://calmforest.cloud';
const TTL = 600;
const LIMIT = 20;

const esc = (s) => String(s ?? '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function rssXml(rows) {
  const items = rows.map(r => [
    '    <item>',
    `      <title>${esc(r.title)}</title>`,
    `      <link>${SITE}/news/${r.id}</link>`,
    `      <guid isPermaLink="false">calmforest-notice-${r.id}</guid>`,
    `      <pubDate>${new Date(r.created_at).toUTCString()}</pubDate>`,
    `      <description>${esc(r.body).replace(/\n/g, '&lt;br&gt;')}</description>`,
    '    </item>',
  ].join('\n')).join('\n');
  const last = rows[0] ? new Date(rows[0].created_at).toUTCString() : new Date(0).toUTCString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>고요한 숲 소식</title>
    <link>${SITE}/</link>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
    <description>포근한 3D 힐링 마을 게임 고요한 숲의 업데이트와 공지</description>
    <language>ko</language>
    <lastBuildDate>${last}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

export async function onRequestGet({ request, env, waitUntil }) {
  const cache = caches.default;
  const cacheKey = new Request(new URL('/rss.xml', request.url).toString(), { method: 'GET' });
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/public_notices`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: env.SUPABASE_ANON_KEY,
      authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ n: LIMIT }),
  });
  if (!r.ok) {
    console.log(JSON.stringify({ evt: 'rss_rpc_fail', status: r.status, body: (await r.text()).slice(0, 200) }));
    return new Response('upstream error', { status: 502 });
  }
  const out = new Response(rssXml(await r.json()), {
    headers: { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': `public, max-age=${TTL}` },
  });
  if (waitUntil) waitUntil(cache.put(cacheKey, out.clone()));
  return out;
}
