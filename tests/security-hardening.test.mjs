// 🛡️ 보안 감사 후속(2026-10-07) — sql/migrations/migrate_security_hardening.sql · functions/api/*
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ITEMS } from '../js/cosmetics/catalog.js';
import { isOwnPhotoKey } from '../functions/api/photo.js';
import { isCardsAdmin, CARDS_ADMIN_UIDS } from '../functions/api/_cards-auth.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const MIG = read('sql/migrations/migrate_security_hardening.sql');

test('💎 SQL _premium_cosmetic_ids() = 카탈로그의 현금 전용(won) 품목 — 코인 품목이 섞이면 회수 오판', () => {
  const body = MIG.match(/_premium_cosmetic_ids\(\)[\s\S]*?array\[([\s\S]*?)\]::text\[\]/);
  assert.ok(body, 'SQL 에서 프리미엄 목록을 못 찾음');
  const sqlIds = [...body[1].matchAll(/'([a-z_]+)'/g)].map(m => m[1]).sort();
  const catIds = ITEMS.filter(i => i.premium).map(i => i.id).sort();
  assert.deepEqual(sqlIds, catIds);
});

test('🏆 리더보드·명판 닉네임은 _nb_nick 단일 출처', () => {
  assert.ok(!/state->>'nickname'/.test(MIG), '원시 닉네임 식이 남아 있다');
  assert.match(MIG, /_nb_nick\(gs\.state, r\.user_id\) as nick/);
  assert.match(MIG, /_nb_nick\(gs\.state, f\.user_id\) as nick/);
});

test('📸 isOwnPhotoKey — 본인 형태 키만', () => {
  const me = '11111111-2222-3333-4444-555555555555';
  const other = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  assert.equal(isOwnPhotoKey(`photos/${me}/1700000000000.jpg`, me), true);
  assert.equal(isOwnPhotoKey(`photos/${me}/../${other}/1700000000000.jpg`, me), false);
  assert.equal(isOwnPhotoKey(`photos/${other}/1700000000000.jpg`, me), false);
  assert.equal(isOwnPhotoKey(`photos/${me}/x.jpg`, me), false);
  assert.equal(isOwnPhotoKey(`photos/${me}/1.jpg?x=1`, me), false);
  assert.equal(isOwnPhotoKey(null, me), false);
});

test('📰 카드뉴스 API 는 관리자(비익명)만', () => {
  const [admin] = CARDS_ADMIN_UIDS;
  assert.equal(isCardsAdmin({ id: admin, is_anonymous: false }), true);
  assert.equal(isCardsAdmin({ id: admin, is_anonymous: true }), false);
  assert.equal(isCardsAdmin({ id: '11111111-2222-3333-4444-555555555555', is_anonymous: false }), false);
  assert.equal(isCardsAdmin(null), false);
});

test('📰 관리자 UUID 는 SQL cf_is_admin 가드와 같다', () => {
  const sql = read('sql/migrations/migrate_admin_uid_guard.sql');
  for (const id of CARDS_ADMIN_UIDS) assert.ok(sql.includes(id), id);
});

test('☕ 카페 손님 count 상한 = 크론 적재 인원(PREGEN_COUNT)', () => {
  const src = read('functions/api/cafe-guests.js');
  assert.ok(!/MAX_COUNT/.test(src), 'MAX_COUNT 가 남아 있다');
  assert.match(src, /const count = Math\.min\(PREGEN_COUNT,/);
});

// ── LOW 3건(2026-10-08) ───────────────────────────────────────
import { decodeJpegBody, MAX_BODY } from '../functions/api/photo.js';
import { onRequestPost as nightVisit } from '../functions/api/night-visit.js';

const jpegBody = (bytes) => JSON.stringify({ image: 'data:image/jpeg;base64,' + Buffer.from(bytes).toString('base64') });

test('📸 decodeJpegBody — JPEG 시그니처·크기·형식', () => {
  assert.equal(decodeJpegBody(jpegBody([0xFF, 0xD8, 0xFF, 0xE0, 1, 2])).bin.length, 6);
  assert.equal(decodeJpegBody(jpegBody([0x89, 0x50, 0x4E, 0x47])).error, 'jpeg_only');      // PNG 를 jpeg 로 위장
  assert.equal(decodeJpegBody('{"image":"data:image/png;base64,AAAA"}').error, 'jpeg_only');
  assert.equal(decodeJpegBody('{"image":"data:image/jpeg;base64,@@@"}').error, 'jpeg_only');
  assert.equal(decodeJpegBody('not json').error, 'bad_json');
  assert.equal(decodeJpegBody('x'.repeat(MAX_BODY + 1)).status, 413);
});

test('🦝 NIGHT_SEED_SECRET 없으면 밤손님은 쉰다(공개 기본값 금지)', async () => {
  const src = read('functions/api/night-visit.js');
  assert.ok(!/calm-forest-night/.test(src), '하드코딩 기본값이 남아 있다');
  const req = new Request('https://x/api/night-visit', { method: 'POST',
    body: JSON.stringify({ uid: '11111111-2222-3333-4444-555555555555', nights: 1, plots: [{ id: 0 }], date: '2026-10-08' }) });
  const res = await nightVisit({ request: req, env: {} });
  const body = await res.json();
  assert.deepEqual(body, { visited: false, reason: 'not-configured' });
});

test('🔒 _headers — HSTS·최소 CSP', () => {
  const h = read('_headers');
  assert.match(h, /Strict-Transport-Security: max-age=\d+/);
  assert.match(h, /Content-Security-Policy: object-src 'none'; base-uri 'self'; frame-ancestors 'self'/);
  assert.ok(!/includeSubDomains/.test(h.split('\n').filter(l => !l.startsWith('#')).join('\n')));
});

test('🗄️ 클라 jsonb 크기 상한 마이그레이션', () => {
  const sql = read('sql/migrations/migrate_security_size_caps.sql');
  assert.match(sql, /game_saves_state_size[\s\S]*?<= 524288/);
  for (const t of ['boat_runs', 'cafe_guests', 'feedback', 'retention_guidance_scores', 'session_logs', 'star_runs'])
    assert.match(sql, new RegExp(`alter table public\\.${t} add constraint`), t);
});
