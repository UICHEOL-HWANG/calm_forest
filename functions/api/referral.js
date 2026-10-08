// functions/api/referral.js
// =============================================================
//  calm forest · 🤝 POST /api/referral — 친구 추천
//  ------------------------------------------------------------
//  계획: dev/active/referral-reward/referral-reward-plan.md
//  본문 { action }:
//    'code'  → 내 초대 코드(없으면 발급)               rpc referral_get_code
//    'bind'  → { code, platform } 초대받은 사람 연결   rpc referral_bind (웰컴 핀 지급)
//    'claim' → 활성화 판정 + 단계 보상 지급            rpc referral_claim (+ 개인 소식)
//  ▶ uid 는 **검증된 JWT 에서만** 꺼낸다 — 본문의 어떤 id 도 믿지 않는다.
//  ▶ 익명(게스트)은 401. 판정·지급 규칙은 전부 SQL(security definer)에 있다 — 여기서 중복 구현 X.
//  ▶ 소식 insert 실패는 삼키고 로그만 — 지급의 진실은 purchases 원장이다. 실패하면 그 소식은 다시 안 간다
//    (재정산 시 granted 가 비므로). 보상은 옷장·보관함에 그대로 있어 수용.
//  ▶ 남용 방지는 SQL 이 한다: claim 30초 쿨다운(throttled:true) · 틀린 코드 10회 후 bind 차단(too_many).
// =============================================================

const ACTIONS = new Set(['code', 'bind', 'claim']);
const CODE_RE = /^[A-HJ-NP-Z2-9]{8}$/;
const PLATFORMS = new Set(['web', 'toss', 'android', 'itch']);
const TIMEOUT_MS = 8000;   // 응답이 매달리지 않게 — Supabase 가 느리면 502 로 끊는다

/** 보상 소식 문구 — ⚠️ 사용자 검수 대기(ui-copy-review-first) */
export const REWARD_NOTICE = Object.freeze({
  tools_star: {
    title: '💎 무지개 크리스탈 세트를 받았어요',
    body: '초대한 친구가 숲에 자리를 잡았어요! 옷장 🧥 🪓 도구 탭에서 무지개 크리스탈 세트를 골라 보세요.',
    title_en: '💎 You got the Rainbow Crystal Set',
    body_en: 'A friend you invited has settled into the forest! Pick the Rainbow Crystal Set in the Wardrobe 🧥 🪓 Tools tab.',
  },
  friendarch: {
    title: '🌈 무지개 우정 아치를 받았어요',
    body: '친구 3명이 숲에 자리를 잡았어요! 작업대 🧺 보관함에서 아치를 꺼내 집 앞에 세워 보세요.',
    title_en: '🌈 You got the Rainbow Friendship Arch',
    body_en: 'Three friends have settled into the forest! Take the arch out of the Workbench 🧺 storage and place it by your house.',
  },
  friend_wing: {
    title: '🦋 별빛 우정 날개를 받았어요',
    body: '친구 5명이 숲에 자리를 잡았어요! 옷장 🧥 🎒 가방 탭에서 날개를 달아 보세요. 고마워요 💗',
    title_en: '🦋 You got the Starlight Friendship Wings',
    body_en: 'Five friends have settled into the forest! Put on the wings in the Wardrobe 🧥 🎒 Bag tab. Thank you 💗',
  },
});

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
const log = (o) => console.log(JSON.stringify({ evt: 'referral', ...o }));

async function verifiedUid(env, request, fetchImpl) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    const r = await fetchImpl(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: env.SUPABASE_ANON_KEY, authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u?.id && !u.is_anonymous ? u.id : null;     // 익명(게스트) 차단
  } catch (e) { return null; }
}

const serviceHeaders = (env) => ({
  'content-type': 'application/json',
  apikey: env.SUPABASE_SERVICE_KEY,
  authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
});

async function rpc(env, fetchImpl, name, args) {
  const r = await fetchImpl(`${env.SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST', headers: serviceHeaders(env), body: JSON.stringify(args), signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!r.ok) throw new Error(`rpc ${name} ${r.status}`);
  return r.json();
}

async function sendRewardNotices(env, fetchImpl, uid, granted) {
  const rows = granted.filter(id => REWARD_NOTICE[id]).map(id => ({ ...REWARD_NOTICE[id], target_user_id: uid }));
  if (!rows.length) return;
  try {
    const r = await fetchImpl(`${env.SUPABASE_URL}/rest/v1/notices`, {
      method: 'POST', headers: { ...serviceHeaders(env), prefer: 'return=minimal' }, body: JSON.stringify(rows),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!r.ok) log({ status: 'notice_fail', http: r.status });
  } catch (e) {
    log({ status: 'notice_throw', msg: String(e?.message || e).slice(0, 200) });
  }
}
/** 📊 연결 시도 1건 기록(관리자 대시보드 '연결 실패 사유'). 기록 실패는 연결 결과에 영향 없다 */
async function logBind(env, fetchImpl, uid, reason, platform) {
  try {
    const r = await fetchImpl(`${env.SUPABASE_URL}/rest/v1/referral_bind_log`, {
      method: 'POST', headers: { ...serviceHeaders(env), prefer: 'return=minimal' },
      body: JSON.stringify({ user_id: uid, reason: String(reason || 'unknown').slice(0, 32), platform }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!r.ok) log({ status: 'bind_log_fail', http: r.status });
  } catch (e) {
    log({ status: 'bind_log_throw', msg: String(e?.message || e).slice(0, 200) });
  }
}

export async function onRequestPost({ request, env, fetchImpl = fetch }) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_KEY) {
    log({ status: 'not_configured' });
    return json({ error: 'not configured' }, 503);
  }
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'bad_json' }, 400); }
  const action = body?.action;
  if (!ACTIONS.has(action)) return json({ error: 'bad_action' }, 400);

  const uid = await verifiedUid(env, request, fetchImpl);
  if (!uid) return json({ error: 'login_required' }, 401);

  try {
    if (action === 'code') return json(await rpc(env, fetchImpl, 'referral_get_code', { p_user: uid }));

    if (action === 'bind') {
      const code = String(body.code ?? '').trim().toUpperCase();
      const platform = PLATFORMS.has(body.platform) ? body.platform : null;
      if (!CODE_RE.test(code)) {
        await logBind(env, fetchImpl, uid, 'bad_code', platform);
        return json({ ok: false, reason: 'bad_code' });
      }
      const out = await rpc(env, fetchImpl, 'referral_bind', { p_invitee: uid, p_code: code, p_platform: platform });
      log({ status: 'bind', ok: !!out?.ok, reason: out?.reason ?? null });
      await logBind(env, fetchImpl, uid, out?.ok ? 'ok' : out?.reason, platform);
      return json(out);
    }

    const out = await rpc(env, fetchImpl, 'referral_claim', { p_inviter: uid });
    const granted = Array.isArray(out?.granted) ? out.granted : [];
    if (granted.length) {
      log({ status: 'granted', granted });
      await sendRewardNotices(env, fetchImpl, uid, granted);
    }
    return json(out);
  } catch (e) {
    log({ status: 'rpc_fail', action, msg: String(e?.message || e).slice(0, 200) });
    return json({ error: 'upstream' }, 502);
  }
}
