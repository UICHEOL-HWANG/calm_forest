import { json, verifiedUid, serviceHeaders, rpc } from './referral.js';

const TIMEOUT_MS = 8000;

export const GIFT_NOTICE = Object.freeze({
  giftsprout: {
    title: '🪴 가입 선물로 첫 새싹 화분을 받았어요',
    body: '숲에 오신 걸 환영해요! 작업대 🧺 보관함에서 화분을 꺼내 마당에 놓아 보세요.',
    title_en: '🪴 Your sign-up gift: the First Sprout Pot',
    body_en: 'Welcome to the forest! Take the pot out of the Workbench 🧺 storage and place it in your yard.',
  },
  giftmailbox: {
    title: '📮 가입 선물로 새집 우편함을 받았어요',
    body: '숲에 오신 걸 환영해요! 작업대 🧺 보관함에서 우편함을 꺼내 집 앞에 세워 보세요.',
    title_en: '📮 Your sign-up gift: the Birdhouse Mailbox',
    body_en: 'Welcome to the forest! Take the mailbox out of the Workbench 🧺 storage and set it by your house.',
  },
  giftlantern: {
    title: '🏮 가입 선물로 환영 등불을 받았어요',
    body: '숲에 오신 걸 환영해요! 작업대 🧺 보관함에서 등불을 꺼내 마당에 놓아 보세요. 밤이 되면 불이 켜져요.',
    title_en: '🏮 Your sign-up gift: the Welcome Lantern',
    body_en: 'Welcome to the forest! Take the lantern out of the Workbench 🧺 storage and place it in your yard. It lights up at night.',
  },
});

const log = (o) => console.log(JSON.stringify({ evt: 'signup_gift', ...o }));

async function sendNotice(env, fetchImpl, uid, item) {
  const n = GIFT_NOTICE[item];
  if (!n) return;
  try {
    const r = await fetchImpl(`${env.SUPABASE_URL}/rest/v1/notices`, {
      method: 'POST', headers: { ...serviceHeaders(env), prefer: 'return=minimal' },
      body: JSON.stringify([{ ...n, target_user_id: uid }]), signal: AbortSignal.timeout(TIMEOUT_MS),
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
  if (body?.action !== 'claim') return json({ error: 'bad_action' }, 400);

  const uid = await verifiedUid(env, request, fetchImpl);
  if (!uid) return json({ error: 'login_required' }, 401);

  try {
    const out = await rpc(env, fetchImpl, 'signup_gift_claim', { p_user: uid });
    if (out?.ok && out.new) {
      log({ status: 'granted', item: out.item });
      await sendNotice(env, fetchImpl, uid, out.item);
    }
    return json(out);
  } catch (e) {
    log({ status: 'rpc_fail', msg: String(e?.message || e).slice(0, 200) });
    return json({ error: 'upstream' }, 502);
  }
}
