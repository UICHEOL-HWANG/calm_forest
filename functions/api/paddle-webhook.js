// functions/api/paddle-webhook.js
// =============================================================
//  calm forest · 💳 POST /api/paddle-webhook — Paddle 알림 → purchases 원장
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-30-paddle-checkout-design.md §4
//  ▶ 상태 코드가 곧 프로토콜이다:
//     401 서명 불일치 · 503 시크릿 미설정 · 400 JSON 아님 · 500 DB 실패(→ Paddle 이 재시도, 라이브 3일 60회)
//     200 은 "다시 보내도 소용없다" — 모르는 price_id·user_id 없음도 200 (재시도로 고쳐지지 않는다).
//  ▶ 원문 바디로 검증한다(request.text()). waitUntil 로 미루지 않는다 — 미루면 실패를 200 으로 덮는다.
//  ▶ 시크릿: `npx wrangler secret put PADDLE_WEBHOOK_SECRET`. 로컬 미러(scripts/serve.py)는 없다 —
//    Paddle 이 공개 URL 로만 보내므로 검증은 단위 테스트 + 샌드박스 실배달.
// =============================================================
import { verifySignature, ledgerRows, revokeTarget, priceIndex, checkoutEventRow } from './_paddle.js';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
const log = (o) => console.log(JSON.stringify({ evt: 'paddle_webhook', ...o }));

export async function onRequestPost({ request, env, fetchImpl = fetch, now }) {
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  if (!env.PADDLE_WEBHOOK_SECRET || !env.SUPABASE_SERVICE_KEY || !env.SUPABASE_URL) {
    log({ status: 'not_configured' });
    return json({ error: 'not configured' }, 503);
  }
  const raw = await request.text();
  const v = await verifySignature({ header: request.headers.get('paddle-signature'), rawBody: raw, secret: env.PADDLE_WEBHOOK_SECRET, now });
  if (!v.ok) { log({ status: v.reason }); return json({ error: 'bad signature' }, 401); }

  let evt;
  try { evt = JSON.parse(raw); } catch { log({ status: 'bad_json' }); return json({ error: 'bad json' }, 400); }

  const H = {
    apikey: env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    'content-type': 'application/json',
  };
  const base = `${env.SUPABASE_URL}/rest/v1/purchases`;

  const { rows, skipped } = ledgerRows(evt, env.__PRICE_INDEX || priceIndex());   // __PRICE_INDEX 는 테스트 전용 주입
  if (rows.length) {
    const r = await fetchImpl(`${base}?on_conflict=event_id`, {
      method: 'POST', headers: { ...H, Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify(rows),
    });
    if (!r.ok) { log({ type: evt.event_type, txn: rows[0].transaction_id, status: 'db_insert_fail', code: r.status }); return json({ error: 'db' }, 500); }
  }

  const rv = revokeTarget(evt);
  if (rv) {
    const r = await fetchImpl(`${base}?transaction_id=eq.${encodeURIComponent(rv.transaction_id)}&revoked_at=is.null`, {
      method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify({ revoked_at: rv.revoked_at }),
    });
    if (!r.ok) { log({ type: evt.event_type, txn: rv.transaction_id, status: 'db_revoke_fail', code: r.status }); return json({ error: 'db' }, 500); }
  }

  //  📊 결제 퍼널(서버 기준) — 실패해도 로그만 남긴다. 분석용 표가 원장 지급·Paddle 재시도를 좌우하면 안 된다
  //     (SQL 을 아직 안 돌렸으면 404 가 나는데, 그걸 500 으로 돌려주면 Paddle 이 같은 알림을 60번 다시 보낸다).
  let fr = null;
  try {
    fr = checkoutEventRow(evt, env.__PRICE_INDEX || priceIndex());   // 행 만들기도 try 안 — 이상한 알림이 500(재시도 폭풍)이 되지 않게
    if (fr) {
      const r = await fetchImpl(`${env.SUPABASE_URL}/rest/v1/checkout_events?on_conflict=event_id`, {
        method: 'POST', headers: { ...H, Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify([fr]),
      });
      if (!r.ok) log({ type: evt.event_type, txn: fr.transaction_id, status: 'funnel_insert_fail', code: r.status });
    }
  } catch (e) { log({ type: evt.event_type, txn: fr?.transaction_id ?? null, status: 'funnel_insert_fail', error: String(e?.message || e) }); }

  log({ type: evt.event_type, txn: evt.data?.id || rv?.transaction_id || null, user: rows[0]?.user_id || null,
        items: rows.map(r => r.item_id), skipped, revoked: !!rv, status: 'ok' });
  return json({ ok: true, inserted: rows.length, revoked: !!rv, skipped });
}
