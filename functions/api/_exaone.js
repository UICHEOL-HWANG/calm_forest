export const EXAONE_URL = 'https://api.exaone.ai/v1/chat/completions';
export const EXAONE_MODEL = 'k-exaone_v2.5';
export const SPACING_MS = 1100;
export const CONCURRENCY = 6;
export const CALL_TIMEOUT_MS = 90000;

const wait = ms => (ms > 0 ? new Promise(r => setTimeout(r, ms)) : Promise.resolve());

export async function callExaone(env, body, fetch = globalThis.fetch) {
  try {
    const r = await fetch(EXAONE_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${env.EXAONE_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    });
    if (!r.ok) return { ok: false, status: r.status, reason: `http_${r.status}` };
    const choice = (await r.json())?.choices?.[0];
    return { ok: true, finish: choice?.finish_reason, text: choice?.message?.content };
  } catch (e) {
    return { ok: false, status: 0, reason: e?.name === 'TimeoutError' ? 'timeout' : 'network' };
  }
}

export function failKind(res) {
  if (res?.ok) return null;
  if (res?.status === 429) return 'rate_limited';
  if (res?.status === 401 || res?.status === 403) return 'auth';
  return res?.reason || 'error';
}

export function parseJsonObject(text) {
  const body = String(text ?? '').replace(/```(?:json)?/gi, '');
  const from = body.indexOf('{'), to = body.lastIndexOf('}');
  if (from < 0 || to <= from) throw new Error('no_json');
  return JSON.parse(body.slice(from, to + 1));
}

export function createPacer(spacingMs, sleep = wait) {
  let gate = Promise.resolve();
  return async fn => {
    const turn = gate;
    gate = turn.then(() => sleep(spacingMs));
    await turn;
    return fn();
  };
}

export async function mapLimit(items, limit, fn, halted = () => false, haltValue = null) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const k = next++;
      out[k] = halted() ? haltValue : await fn(items[k]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
