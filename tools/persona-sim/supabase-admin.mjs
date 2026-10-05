// =============================================================
//  🧑‍🤝‍🧑 페르소나 계정 — Supabase admin API (service_role)
//  ------------------------------------------------------------
//  이메일 계정을 만들고(메일 발송 없음) 로그인 세션을 바로 발급한다.
//  세션은 run.mjs 가 Aside 브라우저 localStorage 에 넣는다 — 로그인 화면을 거치지 않는다.
//
//  필요한 환경변수(.env): SUPABASE_URL · SUPABASE_SERVICE_KEY · SUPABASE_ANON_KEY
// =============================================================

export const PERSONA_DOMAIN = 'sim.calmforest.local';
export const personaEmail = (id) => `persona-${id}@${PERSONA_DOMAIN}`;

function env(name) {
  const v = process.env[name];
  if (!v) throw new Error(`.env 에 ${name} 가 없다 — node --env-file=.env 로 실행할 것`);
  return v;
}

async function call(path, { key, body }) {
  const res = await fetch(`${env('SUPABASE_URL')}${path}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { ok: res.ok, status: res.status, json };
}

/** 계정이 없으면 만든다. 이미 있으면 그대로 둔다. accountId = '<persona id>-<a~e>' */
export async function ensureUser(accountId, personaId) {
  const key = env('SUPABASE_SERVICE_KEY');
  const r = await call('/auth/v1/admin/users', {
    key,
    body: { email: personaEmail(accountId), email_confirm: true, user_metadata: { persona_id: personaId, persona_account: accountId } },
  });
  if (r.ok) return { created: true };
  const code = r.json.error_code || r.json.code;
  if (r.status === 422 && /exists|registered/i.test(`${code} ${r.json.msg || r.json.message}`)) return { created: false };
  throw new Error(`계정 생성 실패 ${accountId}: ${r.status} ${JSON.stringify(r.json)}`);
}

/** 매직링크 토큰을 발급해 바로 검증 → supabase-js 가 저장하는 세션 객체를 돌려준다. */
export async function mintSession(accountId) {
  const link = await call('/auth/v1/admin/generate_link', {
    key: env('SUPABASE_SERVICE_KEY'),
    body: { type: 'magiclink', email: personaEmail(accountId) },
  });
  const tokenHash = link.json.hashed_token || link.json.properties?.hashed_token;
  if (!link.ok || !tokenHash) throw new Error(`링크 발급 실패 ${accountId}: ${link.status} ${JSON.stringify(link.json)}`);

  const v = await call('/auth/v1/verify', {
    key: env('SUPABASE_ANON_KEY'),
    body: { type: 'magiclink', token_hash: tokenHash },
  });
  if (!v.ok || !v.json.access_token) throw new Error(`세션 검증 실패 ${accountId}: ${v.status} ${JSON.stringify(v.json)}`);
  const s = v.json;
  return { ...s, expires_at: s.expires_at ?? Math.floor(Date.now() / 1000) + s.expires_in };
}

/** supabase-js v2 의 localStorage 키 — sb-<project ref>-auth-token */
export function storageKey() {
  return `sb-${new URL(env('SUPABASE_URL')).hostname.split('.')[0]}-auth-token`;
}
