import { BOT } from './app-link.js';

const HOME = 'https://calmforest.cloud/';
const CODE = /^\/go\/([A-Za-z0-9]{4,12})\/?$/;

const redirect = (url) => new Response(null, { status: 302, headers: { Location: url, 'Cache-Control': 'no-store' } });

async function bump(kv, code) {
  const key = `c:${code}`;
  const n = Number(await kv.get(key)) || 0;
  await kv.put(key, String(n + 1));
}

export async function handleGo(request, env, ctx) {
  const m = CODE.exec(new URL(request.url).pathname);
  if (!m || !env?.UTM_LINKS) return redirect(HOME);
  const raw = await env.UTM_LINKS.get(`l:${m[1]}`);
  let link = null;
  try { link = raw ? JSON.parse(raw) : null; } catch { link = null; }
  if (!link?.url) return redirect(HOME);
  if (request.method !== 'GET' || BOT.test(request.headers.get('user-agent') || '')) return redirect(link.url);
  ctx.waitUntil(bump(env.UTM_LINKS, m[1]).catch((err) => {
    console.error(JSON.stringify({ message: 'go click count failed', code: m[1], error: String(err?.message || err) }));
  }));
  return redirect(link.url);
}
