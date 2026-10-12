// =============================================================
//  calm forest · 🔔 POST /api/push-register — 기기 푸시 토큰 등록·켜기/끄기
//  ------------------------------------------------------------
//  body: { token, enabled?, lang?, tz? }  → { ok: true }
//  ▶ 인증: Supabase JWT(게스트 포함) — orchard-events.js 의 verifyAnyUser.
//  ▶ 저장: 서비스 키로 push_tokens upsert(on_conflict=token). 한 기기에서 계정을 바꾸면
//    같은 토큰의 user_id 가 새 계정으로 넘어간다. 테이블은 RLS 정책이 없어 클라이언트가 못 만진다.
//  ▶ 본문의 user_id·last_checked_on 같은 필드는 옮기지 않는다(화이트리스트).
//  (테스트: node --test tests/push-register.test.mjs)
// =============================================================
import { verifyAnyUser } from './orchard-events.js';

const TOKEN_RE = /^[A-Za-z0-9:_-]{20,4096}$/;   // FCM 등록 토큰 문자 집합
const TZ_RE = /^[A-Za-z0-9_/+-]{1,64}$/;

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export async function onRequestPost({ request, env }) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_KEY) return json({ error: 'not_configured' }, 503);

  const user = await verifyAnyUser(env, request);
  if (!user) return json({ error: 'login_required' }, 401);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const token = String(body?.token || '');
  if (!TOKEN_RE.test(token)) return json({ error: 'bad_token' }, 400);

  const row = {
    token,
    user_id: user.id,
    platform: body?.platform === 'ios' ? 'ios' : 'android',   // 🍎 그 밖의 값은 android(DB CHECK 와 같음)
    enabled: body?.enabled !== false,
    lang: body?.lang === 'en' ? 'en' : 'ko',
    tz: TZ_RE.test(String(body?.tz || '')) ? String(body.tz) : null,
    updated_at: new Date().toISOString(),
  };

  try {
    const r = await fetch(`${env.SUPABASE_URL}/rest/v1/push_tokens?on_conflict=token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.SUPABASE_SERVICE_KEY,
        authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(row),
    });
    if (!r.ok) { console.warn('[push-register] upsert', r.status); return json({ error: 'store_failed' }, 502); }
  } catch (e) {
    console.warn('[push-register] upsert', e?.message);
    return json({ error: 'store_failed' }, 502);
  }
  return json({ ok: true });
}
