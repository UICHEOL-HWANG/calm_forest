// =============================================================
//  calm forest · 📤 수집 결과를 인박스 API 로 올린다
//  ------------------------------------------------------------
//  사용: node ingest-upload.mjs decks/_inbox/2026-09-22-community.json
//  환경: CARDNEWS_API_BASE, CARDNEWS_INGEST_SECRET
//
//  ⚠️ 실패해도 크론 전체를 죽이지 않는다 — 호출하는 쪽이 판단한다.
// =============================================================
import { readFile } from 'node:fs/promises';

const file = process.argv[2];
const base = process.env.CARDNEWS_API_BASE;
const secret = process.env.CARDNEWS_INGEST_SECRET;

if (!file) { console.error('사용: node ingest-upload.mjs <수집 json>'); process.exit(1); }
if (!base || !secret) { console.error('CARDNEWS_API_BASE / CARDNEWS_INGEST_SECRET 이 없다'); process.exit(1); }

const raw = JSON.parse(await readFile(file, 'utf8'));

const res = await fetch(`${base}/api/cards-ingest`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-cardnews-secret': secret },
  body: JSON.stringify({ date: raw.date, sources: raw.sources }),
});

const text = await res.text();
if (!res.ok) { console.error(`업로드 실패 ${res.status}: ${text}`); process.exit(1); }
console.log(`업로드 완료: ${text}`);
