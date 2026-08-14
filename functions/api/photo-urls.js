// =============================================================
//  calm forest · 📸 사진 표시 URL 일괄 발급 (Cloudflare Pages Function)
//  ------------------------------------------------------------
//  POST /api/photo-urls  { keys: ["photos/<uid>/<ts>.jpg", ...] }
//    → { urls: { "<key>": "https://...presigned...", ... } }
//
//  <img> 태그는 Authorization 헤더를 못 붙이므로, 로그인 검증을 여기서 하고
//  1시간짜리 presigned GET URL 을 발급한다(<img> 렌더링은 CORS 무관).
//  본인 prefix(photos/<내 uid>/) 밖의 키는 조용히 무시 — 남의 사진 열람 차단.
// =============================================================

import { verifyUser, presignGet, ociReady } from './photo.js';

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

export async function onRequestPost({ request, env }) {
  if (!ociReady(env)) return json({ error: 'not_configured' }, 503);
  const user = await verifyUser(env, request);
  if (!user) return json({ error: 'login_required' }, 403);

  let keys;
  try { ({ keys } = await request.json()); } catch (e) { return json({ error: 'bad_json' }, 400); }
  if (!Array.isArray(keys)) return json({ error: 'keys_required' }, 400);

  const prefix = `photos/${user.id}/`;
  const urls = {};
  for (const key of keys.slice(0, 120)) {                      // 한도(100장) + 여유
    if (typeof key !== 'string' || !key.startsWith(prefix)) continue;
    urls[key] = await presignGet(env, `/${env.OCI_BUCKET}/${key}`, 3600);
  }
  return json({ urls });
}
