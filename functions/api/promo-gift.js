import { json, verifiedUser, serviceHeaders, rpc } from './referral.js';
import { normalizeGiftCode } from '../../js/promo-gift/rules.js';

const TIMEOUT_MS = 8000;
const ACTIONS = new Set(['check', 'claim']);

export const PROMO_NOTICE = Object.freeze({
  title: '🎈 약속한 꾸미기 세트가 도착했어요',
  body: '꼬마 열기구와 여행 가방 더미를 작업대 🧺 보관함에 넣어 뒀어요. 마당에 놓아 보세요.',
  title_en: '🎈 Your promised decor set has arrived',
  body_en: 'We put the Little Hot-Air Balloon and the Suitcase Stack in the Workbench 🧺 storage. Place them in your yard.',
});

const log = (o) => console.log(JSON.stringify({ evt: 'promo_gift', ...o }));

async function sendNotice(env, fetchImpl, uid) {
  try {
    const r = await fetchImpl(`${env.SUPABASE_URL}/rest/v1/notices`, {
      method: 'POST', headers: { ...serviceHeaders(env), prefer: 'return=minimal' },
      body: JSON.stringify([{ ...PROMO_NOTICE, target_user_id: uid }]), signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!r.ok) log({ status: 'notice_fail', http: r.status });
  } catch (e) {
    log({ status: 'notice_throw', msg: String(e?.message || e).slice(0, 200) });
  }
}

export async function onRequestPost({ request, env, fetchImpl = fetch }) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_KEY) {
    log({ status: 'not_configured' });
    return json({ error: 'not configured' }, 503);
  }
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'bad_json' }, 400); }
  if (!ACTIONS.has(body?.action)) return json({ error: 'bad_action' }, 400);
  const code = normalizeGiftCode(body.code);
  if (!code) return json({ ok: false, reason: 'bad_code' }, 400);
  const stage = body.action === 'check' ? 1 : Number(body.stage);
  if (stage !== 1 && stage !== 2) return json({ error: 'bad_stage' }, 400);

  const user = await verifiedUser(env, request, fetchImpl);
  if (!user) return json({ error: 'login_required' }, 401);
  if (body.action === 'claim' && stage === 2 && user.anonymous) return json({ ok: false, reason: 'anonymous' });

  try {
    if (body.action === 'check') return json(await rpc(env, fetchImpl, 'promo_code_check', { p_code: code, p_stage: 1 }));
    const out = await rpc(env, fetchImpl, 'promo_gift_claim', { p_user: user.id, p_code: code, p_stage: stage });
    if (out?.ok && out.new) log({ status: 'granted', stage, code });
    if (out?.ok && out.new && stage === 2) await sendNotice(env, fetchImpl, user.id);
    return json(out);
  } catch (e) {
    log({ status: 'rpc_fail', msg: String(e?.message || e).slice(0, 200) });
    return json({ error: 'upstream' }, 502);
  }
}
