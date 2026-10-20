export const MP_MAX_EVENTS = 25;
export const MP_FLUSH_MS = 10000;
const NAME_RE = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;
const RESERVED = new Set(['ad_activeview', 'ad_click', 'ad_exposure', 'ad_impression', 'ad_query', 'adunit_exposure',
  'app_clear_data', 'app_install', 'app_update', 'app_remove', 'error', 'first_open', 'first_visit', 'in_app_purchase',
  'notification_dismiss', 'notification_foreground', 'notification_open', 'notification_receive', 'os_update',
  'screen_view', 'session_start', 'user_engagement']);

export const mpEventNameOk = (name) => typeof name === 'string' && NAME_RE.test(name) && !RESERVED.has(name);

export const MP_PARAM_MAX = 23;
export const MP_PENDING_MAX = 100;

export function mpParams(params = {}, max = MP_PARAM_MAX) {
  const out = {};
  for (const [k, v] of Object.entries(params || {})) {
    if (Object.keys(out).length >= max) break;
    if (!NAME_RE.test(k) || v == null) continue;
    if (typeof v === 'string') out[k] = v.slice(0, 100);
    else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean') out[k] = v ? 1 : 0;
  }
  return out;
}

export function mpUserProps(props = {}) {
  const out = {};
  for (const [k, v] of Object.entries(props || {})) {
    if (!NAME_RE.test(k) || v == null) continue;
    out[k] = { value: String(v).slice(0, 36) };
  }
  return out;
}

export function createMpQueue({ clientId, send, now = Date.now, sessionStart = now() }) {
  const sessionId = String(Math.floor(sessionStart / 1000));
  let events = [];
  let userId = null;
  let props = {};
  let last = sessionStart;

  function requeue(batch) {
    events = [...batch, ...events].slice(-MP_PENDING_MAX);
  }

  function flush() {
    if (!events.length) return Promise.resolve();
    const batch = events.slice(0, MP_MAX_EVENTS);
    events = events.slice(MP_MAX_EVENTS);
    const body = { client_id: clientId, events: batch };
    if (userId) body.user_id = userId;
    if (Object.keys(props).length) body.user_properties = props;
    return Promise.resolve(send(body)).then(ok => { if (ok === false) requeue(batch); }, () => requeue(batch));
  }

  function push(name, params) {
    if (!mpEventNameOk(name)) return;
    const t = now();
    const engagement = Math.min(Math.max(t - last, 1), 60000);
    last = t;
    events.push({ name, params: { ...mpParams(params), session_id: sessionId, engagement_time_msec: engagement } });
    if (events.length >= MP_MAX_EVENTS) flush();
  }

  return {
    push,
    flush,
    pending: () => events.length,
    setUser: (id) => { userId = id ? String(id).slice(0, 64) : null; },
    setProps: (p) => { props = mpUserProps(p); },
  };
}

export function mpGtag(q) {
  return function gtag(cmd, a, b) {
    if (cmd === 'event') q.push(a, b);
    else if (cmd === 'set' && a === 'user_properties') q.setProps(b);
    else if (cmd === 'set' && a && typeof a === 'object' && 'user_id' in a) q.setUser(a.user_id);
  };
}

export function startMpQueue({ endpoint, clientId }) {
  const send = (body) => {
    try {
      return fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true })
        .then(r => r.ok, () => false);
    } catch { return false; }
  };
  const q = createMpQueue({ clientId, send });
  setInterval(q.flush, MP_FLUSH_MS);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') q.flush(); });
  window.addEventListener('pagehide', q.flush);
  return q;
}
