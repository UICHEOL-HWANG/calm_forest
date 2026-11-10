import { cellId } from '../js/lines/slots.js';
import { planLineWork, fillCells } from './api/_line-gen.js';
import { createPacer } from './api/_exaone.js';
import { storeHeaders, storeReady } from './api/_ai-store.js';

const defaultNotify = async (...args) => (await import('./notify.js')).notify(...args);

export const LIVE_KINDS = ['auction'];
export const CRON_MAX_CALLS = 36;
export const LINE_SPACING_MS = 2000;

export function isLinePoolTick(scheduledTime) {
  const d = new Date(scheduledTime);
  return d.getUTCDay() === 0 && d.getUTCHours() === 21 && d.getUTCMinutes() === 30;
}

export async function runLinePool(env, {
  fetch = globalThis.fetch, notify = defaultNotify, spacingMs = LINE_SPACING_MS,
  maxCalls = CRON_MAX_CALLS, wait, source = 'cron', kinds = LIVE_KINDS,
} = {}) {
  if (!storeReady(env) || !env?.EXAONE_API_KEY) return { skipped: 'not_configured' };
  const t0 = Date.now();
  const base = `${env.SUPABASE_URL}/rest/v1`;
  const out = { requested: 0, inserted: 0, failed: 0, calls: 0, rate_limited: false, error: null };
  try {
    const cr = await fetch(`${base}/rpc/line_pool_counts`, { method: 'POST', headers: storeHeaders(env), body: '{}', signal: AbortSignal.timeout(10000) });
    if (!cr.ok) throw new Error(`counts ${cr.status}`);
    const counts = await cr.json();
    const er = await fetch(`${base}/line_pool?select=kind,key,slot,lang,text&kind=in.(${kinds.join(',')})&limit=10000`, { headers: storeHeaders(env), signal: AbortSignal.timeout(10000) });
    if (!er.ok) throw new Error(`existing ${er.status}`);
    const existing = new Map();
    for (const r of await er.json()) {
      const id = cellId(r);
      existing.set(id, [...(existing.get(id) || []), r.text]);
    }
    const plan = planLineWork(counts, { kinds, maxCalls });
    out.requested = plan.reduce((s, p) => s + p.want, 0);
    const got = await fillCells(env, plan, { fetch, pace: createPacer(spacingMs), existing, maxCalls, wait });
    out.calls = got.calls;
    out.failed = got.failed;
    out.rate_limited = got.rateLimited > 0;
    if (got.rows.length) {
      const ins = await fetch(`${base}/line_pool?on_conflict=kind,key,slot,lang,text`, {
        method: 'POST', headers: storeHeaders(env, 'resolution=ignore-duplicates,return=minimal'), body: JSON.stringify(got.rows), signal: AbortSignal.timeout(10000),
      });
      if (!ins.ok) throw new Error(`insert ${ins.status}: ${(await ins.text()).slice(0, 200)}`);
      out.inserted = got.rows.length;
    }
    if (got.stopped) out.error = got.stopped;
    else if (got.failed && !out.inserted) out.error = got.firstError;
  } catch (e) {
    out.error = String(e?.message || e).slice(0, 400);
  }
  out.duration_ms = Date.now() - t0;
  await fetch(`${base}/line_pool_runs`, {
    method: 'POST', headers: storeHeaders(env, 'return=minimal'), body: JSON.stringify({ source, ...out }), signal: AbortSignal.timeout(10000),
  }).then(r => { if (!r.ok) console.error(JSON.stringify({ message: 'line_pool_runs failed', status: r.status })); }).catch(e => console.error(JSON.stringify({ message: 'line_pool_runs failed', error: e.message })));
  if (out.error) await notify(env, `🔴 문구 풀 ${source} 실패`, `적재 ${out.inserted} · 호출 ${out.calls} · 실패 ${out.failed}\n오류: ${out.error}`);
  return out;
}
