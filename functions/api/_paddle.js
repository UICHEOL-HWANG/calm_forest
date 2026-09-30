// functions/api/_paddle.js
// =============================================================
//  calm forest · 💳 Paddle 웹훅 순수 로직 — 서명 검증 · 이벤트 → 원장 행
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-30-paddle-checkout-design.md §4
//  ▶ 네트워크·env 를 만지지 않는다 — tests/paddle.test.mjs 가 잠근다. 핸들러는 paddle-webhook.js.
//  ▶ 서명: 헤더 `Paddle-Signature: ts=<unix초>;h1=<hex>` (키 교체 중엔 h1 이 둘). 서명 대상은
//    `${ts}:${원문 바디}` 의 HMAC-SHA256. 바디를 파싱 후 재직렬화하면 어긋난다 — 원문 그대로.
//  ▶ item 은 price_id 를 카탈로그에서 역조회해 정한다. custom_data 는 user_id 만 믿는다.
// =============================================================
import { ITEMS } from '../../js/cosmetics/catalog.js';
import { PET_KINDS } from '../../js/pet/rules.js';

export const TOLERANCE_SEC = 300;   // Paddle SDK 기본 5초는 시계 오차에 너무 빡빡하다
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX64 = /^[0-9a-f]{64}$/i;
const enc = new TextEncoder();

export function parseSignature(header) {
  if (typeof header !== 'string') return null;
  let ts = null; const h1 = [];
  for (const part of header.split(';')) {
    const i = part.indexOf('='); if (i < 0) continue;
    const k = part.slice(0, i).trim(), v = part.slice(i + 1).trim();
    if (k === 'ts') ts = Number(v);
    else if (k === 'h1' && HEX64.test(v)) h1.push(v.toLowerCase());
  }
  if (!Number.isFinite(ts) || h1.length === 0) return null;
  return { ts, h1 };
}

export async function hmacHex(secret, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function equalHex(a, b) {   // 상수 시간 비교 — 둘 다 64자일 때만 의미 있다
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function verifySignature({ header, rawBody, secret, now = Date.now() / 1000, toleranceSec = TOLERANCE_SEC }) {
  if (typeof secret !== 'string' || !secret) return { ok: false, reason: 'bad_sig' };
  if (typeof rawBody !== 'string') return { ok: false, reason: 'bad_sig' };
  const p = parseSignature(header);
  if (!p) return { ok: false, reason: 'bad_header' };
  if (Math.abs(now - p.ts) > toleranceSec) return { ok: false, reason: 'stale' };
  const expect = await hmacHex(secret, `${p.ts}:${rawBody}`);
  return p.h1.some(h => equalHex(expect, h)) ? { ok: true } : { ok: false, reason: 'bad_sig' };
}

/** priceId → { itemId, kind } — cash 가 있는 항목만. 가격표 단일 출처(카탈로그) */
export function priceIndex() {
  const m = new Map();
  for (const it of ITEMS) if (it.price.cash) m.set(it.price.cash.priceId, { itemId: it.id, kind: 'cosmetic' });
  for (const k of PET_KINDS) if (k.cash) m.set(k.cash.priceId, { itemId: k.id, kind: 'pet' });
  return m;
}

/** transaction.completed → 원장 행(항목당 1). 모르는 price_id 는 skipped 에 담고 계속 */
export function ledgerRows(evt, index = priceIndex()) {
  if (evt?.event_type !== 'transaction.completed') return { rows: [], skipped: [] };
  const d = evt.data || {};
  const uid = d.custom_data?.user_id;
  if (typeof uid !== 'string' || !UUID_RE.test(uid)) return { rows: [], skipped: ['no_user'] };
  if (typeof evt.notification_id !== 'string' || !evt.notification_id) return { rows: [], skipped: ['no_ids'] };
  if (typeof d.id !== 'string' || !d.id) return { rows: [], skipped: ['no_ids'] };
  const t = d.details?.totals?.total;
  const total = (t == null || t === '') ? NaN : Number(t);
  const rows = [], skipped = [];
  const seenPriceIds = new Set();
  for (const it of Array.isArray(d.items) ? d.items : []) {
    const pid = it?.price?.id;
    const hit = pid && index.get(pid);
    if (!hit) { skipped.push(String(pid)); continue; }
    if (seenPriceIds.has(pid)) continue;
    seenPriceIds.add(pid);
    rows.push({
      event_id: `${evt.notification_id}:${pid}`,
      transaction_id: d.id,
      user_id: uid,
      item_id: hit.itemId,
      kind: hit.kind,
      price_id: pid,
      amount: Number.isFinite(total) ? total : null,
      currency: d.currency_code || null,
      occurred_at: evt.occurred_at,
      raw: d,
    });
  }
  return { rows, skipped };
}

/** adjustment.created/updated 중 승인된 환불·차지백만 → 취소 대상 */
export function revokeTarget(evt) {
  if (!/^adjustment\.(created|updated)$/.test(evt?.event_type || '')) return null;
  const d = evt.data || {};
  if (!['refund', 'chargeback'].includes(d.action) || d.status !== 'approved') return null;
  if (typeof d.transaction_id !== 'string') return null;
  return { transaction_id: d.transaction_id, revoked_at: evt.occurred_at };
}
