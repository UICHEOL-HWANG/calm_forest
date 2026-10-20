import { mpEventNameOk, mpParams, MP_MAX_EVENTS } from '../../js/ga-mp.js';

export const MP_MEASUREMENT_ID = 'G-ELBTR8BXBF';
const ALLOWED_ORIGINS = ['capacitor://app.calmforest.cloud', 'capacitor://localhost'];
const ID_RE = /^[A-Za-z0-9._-]{1,64}$/;
const IP_RE = /^[0-9a-fA-F:.]{3,45}$/;
const MAX_BODY = 32768;
const BLOCKED = new Set(['purchase', 'refund']);

const reply = (status) => new Response(null, { status, headers: { 'cache-control': 'no-store' } });

function userProps(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw).slice(0, 25)) {
    if (/^[A-Za-z][A-Za-z0-9_]{0,23}$/.test(k) && v && v.value != null) out[k] = { value: String(v.value).slice(0, 36) };
  }
  return out;
}

export async function onRequestPost({ request, env }) {
  if (!ALLOWED_ORIGINS.includes(request.headers.get('origin') || '')) return reply(403);
  if (!env.GA4_MP_SECRET) return reply(503);

  const text = await request.text();
  if (text.length > MAX_BODY) return reply(413);
  let body;
  try { body = JSON.parse(text); } catch { return reply(400); }
  const events = Array.isArray(body?.events) ? body.events : [];
  if (!events.length || events.length > MP_MAX_EVENTS) return reply(400);
  if (!ID_RE.test(String(body?.client_id || ''))) return reply(400);

  const out = {
    client_id: body.client_id,
    events: events.filter(e => mpEventNameOk(e?.name) && !BLOCKED.has(e.name)).map(e => ({ name: e.name, params: mpParams(e.params, 25) })),
  };
  if (!out.events.length) return reply(204);
  if (body.user_id && ID_RE.test(String(body.user_id))) out.user_id = String(body.user_id);
  const props = userProps(body.user_properties);
  if (Object.keys(props).length) out.user_properties = props;
  const ip = request.headers.get('cf-connecting-ip') || '';
  if (IP_RE.test(ip)) out.ip_override = ip;

  try {
    const r = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${MP_MEASUREMENT_ID}&api_secret=${encodeURIComponent(env.GA4_MP_SECRET)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(out),
    });
    if (!r.ok) { console.warn('[ga-mp] upstream', r.status); return reply(502); }
  } catch (e) {
    console.warn('[ga-mp] upstream', e?.message);
    return reply(502);
  }
  return reply(204);
}
