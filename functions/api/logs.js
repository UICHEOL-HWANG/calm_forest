// =============================================================
//  calm forest · 🧯 클라이언트 오류 로그 수신 API
//  ------------------------------------------------------------
//  POST /api/logs   body: { v:1, ctx:{platform,uid(앞 8자),path}, events:[{id,ts,kind,msg,stack?,url?,status?}], suppressed }
//    → 200 { ok, n }  |  413 too_large  |  503 (DB 실패·설정 없음 → 기기가 지우지 않고 다음에 재전송)
//
//  ▶ 인증 없음 — 로그인 전 오류도 받아야 하고 sendBeacon 은 헤더를 못 붙인다.
//    🛟 쿠션: IP 당 요청 상한(LOGS_LIMITER) · 본문 바이트 상한(청크 전송 포함) · 이벤트 20개 · 항목별 형식 검증 ·
//            서버 재마스킹(길이 묶인 정규식) · ts 범위 · DB 함수의 하루 상한.
//  ▶ 형식이 틀린 요청은 400 이 아니라 200 으로 버린다 — 400 이면 기기가 같은 묶음을 계속 다시 보낸다.
//  ▶ Workers Logs 에도 한 줄 남긴다(Supabase 가 실패해도 대시보드에서 볼 수 있는 무료 백업).
//  스펙: dev/active/client-logs/client-logs-plan.md · DDL: sql/migrations/migrate_client_errors.sql
// =============================================================

import { maskText, stripUrl } from '../../js/client-errors.js';

export const MAX_LOG_BODY = 64 * 1024;
const MAX_EVENTS = 20;
const KINDS = new Set(['error', 'resource', 'rejection', 'console', 'http', 'network']);
const PLATFORMS = new Set(['web', 'toss', 'itch', 'android', 'ios']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

const YEAR_MS = 365 * 24 * 3600 * 1000;

// 문자열만 받는다(객체·배열은 버림) · maskText 가 먼저 자르고 가린다
const clip = (v, max) => (typeof v !== 'string' || v === '' ? null : maskText(v, max - 1));

export function sanitizeBatch(body) {
  if (!body || typeof body !== 'object' || body.v !== 1 || !Array.isArray(body.events)) return [];
  const ctx = body.ctx && typeof body.ctx === 'object' ? body.ctx : {};
  const platform = PLATFORMS.has(ctx.platform) ? ctx.platform : null;
  const uid8 = /^[0-9a-f]{8}$/.test(String(ctx.uid || '')) ? ctx.uid : null;
  const path = clip(ctx.path, 120);
  const now = Date.now();
  const suppressed = Number.isInteger(body.suppressed) && body.suppressed >= 0 ? Math.min(body.suppressed, 100000) : 0;

  return body.events.slice(0, MAX_EVENTS)
    .filter(e => e && UUID_RE.test(String(e.id)) && KINDS.has(e.kind))
    .map(e => ({
      id: String(e.id).toLowerCase(),
      ts: Number.isFinite(e.ts) && Math.abs(e.ts - now) < YEAR_MS ? e.ts : null,
      kind: e.kind,
      msg: clip(typeof e.msg === 'string' ? e.msg : JSON.stringify(e.msg ?? '').slice(0, 600), 600) || '(empty)',
      stack: clip(e.stack, 1100),
      url: typeof e.url === 'string' && e.url ? clip(stripUrl(e.url.slice(0, 2000)), 320) : null,
      status: Number.isInteger(e.status) && e.status >= 0 && e.status <= 999 ? e.status : null,
      platform, uid8, path,
    }))
    .map((r, i) => ({ ...r, suppressed: i === 0 ? suppressed : 0 }));   // 묶음 단위 값 — 첫 행에만
}

// 바이트 단위로 읽다가 상한을 넘으면 멈춘다 — content-length 가 없는 청크 전송도 막는다
async function readCapped(request, max) {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) { try { await reader.cancel(); } catch (e) { /* 무시 */ } return null; }
    chunks.push(value);
  }
  const buf = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { buf.set(c, off); off += c.byteLength; }
  return new TextDecoder().decode(buf);
}

export async function onRequestPost({ request, env, fetchFn = fetch }) {
  if (env?.LOGS_LIMITER) {
    const key = request.headers.get('cf-connecting-ip') || 'unknown';
    try {
      const { success } = await env.LOGS_LIMITER.limit({ key });
      if (!success) return json({ error: 'rate_limited' }, 429);
    } catch (e) { /* 제한기 장애는 통과 — 하루 상한이 뒤에 있다 */ }
  }
  if (Number(request.headers.get('content-length') || 0) > MAX_LOG_BODY) return json({ error: 'too_large' }, 413);
  let text;
  try { text = await readCapped(request, MAX_LOG_BODY); } catch (e) { return json({ ok: true, n: 0 }); }
  if (text === null) return json({ error: 'too_large' }, 413);

  let body = null;
  try { body = JSON.parse(text); } catch (e) { /* 아래에서 빈 배열 */ }
  const rows = sanitizeBatch(body);
  if (!rows.length) return json({ ok: true, n: 0 });

  console.log(JSON.stringify({ message: 'client_errors', n: rows.length, platform: rows[0].platform,
    kinds: [...new Set(rows.map(r => r.kind))], first: rows[0].msg.slice(0, 200) }));

  if (!env?.SUPABASE_URL || !env?.SUPABASE_SERVICE_KEY) return json({ error: 'not_configured' }, 503);
  try {
    const res = await fetchFn(`${env.SUPABASE_URL}/rest/v1/rpc/ingest_client_errors`, {
      method: 'POST',
      headers: { apikey: env.SUPABASE_SERVICE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ rows }),
    });
    if (!res.ok) {
      console.error(JSON.stringify({ message: 'client_errors ingest failed', status: res.status }));
      // 4xx = 이 묶음은 DB 가 영영 안 받는다(형식·CHECK) → 버리라고 200. 5xx 만 재시도.
      if (res.status >= 400 && res.status < 500) return json({ ok: true, n: 0, dropped: true });
      return json({ error: 'ingest_failed' }, 503);
    }
  } catch (e) {
    console.error(JSON.stringify({ message: 'client_errors ingest threw', error: String(e?.message || e) }));
    return json({ error: 'ingest_failed' }, 503);
  }
  return json({ ok: true, n: rows.length });
}
