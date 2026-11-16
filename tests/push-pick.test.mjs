// 🔔 푸시 — 오늘 누구에게 무엇을 보낼지(순수). 하루 1통·우선순위 🦝 > 🔥🫙 > 🌱
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kstDates, nightInput, pickPush, messageFor } from '../functions/push/pick-kind.js';

// 2026-10-13 20:00 KST = 11:00 UTC
const NOW = Date.parse('2026-10-13T11:00:00Z');
const D = kstDates(NOW);
const growing = [{ x: 0, z: 0, state: 'growing', crop: 'carrot' }];
const row = (o = {}) => ({
  updated_at: '2026-10-13T01:00:00Z',     // 오늘 10시 KST 에 접속
  plots: growing, outdoor: [], truce: null,
  night_last: '2026-10-13', craft: { slots: [] }, returns_7d: 0, ...o,
});

test('kstDates — UTC 11:00 은 KST 같은 날 20:00', () => {
  assert.deepEqual(D, { today: '2026-10-13', yesterday: '2026-10-12', tomorrow: '2026-10-14', todayStartMs: Date.parse('2026-10-12T15:00:00Z') });
  assert.equal(kstDates(Date.parse('2026-10-13T16:00:00Z')).today, '2026-10-14', 'UTC 16시 = KST 다음날 01시');
});

test('nightInput — 자라는 밭·감시 시작(night_last)이 있어야 판정 대상', () => {
  assert.equal(nightInput(row({ plots: [] }), '2026-10-14', D), null);
  assert.equal(nightInput(row({ plots: [{ x: 0, z: 0, state: 'empty' }] }), '2026-10-14', D), null);
  assert.equal(nightInput(row({ night_last: null }), '2026-10-14', D), null, '감시 시작 전엔 첫 접속이 lastDate 만 찍는다');
  const n = nightInput(row({ outdoor: [{ id: 'scarecrow', x: 1, z: 1 }], truce: { boar: '2026-10-15' } }), '2026-10-14', D);
  assert.equal(n.plotCount, 1);
  assert.equal(n.scarecrow, true);
  assert.equal(n.fence, false);
  assert.deepEqual(n.blocked, ['boar']);
});

test('nightInput — 오늘 접속(night_last=오늘)한 사람만. 아니면 다음 접속일 판정이라 예고가 어긋난다', () => {
  assert.ok(nightInput(row(), '2026-10-14', D));
  assert.equal(nightInput(row({ night_last: '2026-10-12' }), '2026-10-14', D), null);
});

test('computeNightDefense — 세이브의 null 항목에 죽지 않는다', () => {
  assert.ok(nightInput(row({ outdoor: [null, { id: 'scarecrow', x: 1, z: 1 }] }), '2026-10-14', D).scarecrow);
});

test('우선순위 — 밤손님이 오면 가공 완료보다 먼저', () => {
  const r = row({ updated_at: '2026-10-12T10:00:00Z', craft: { slots: [{ item: 'charcoal', day: '2026-10-12' }] } });
  assert.equal(pickPush(r, D, { visited: true }).kind, 'night');
  assert.equal(pickPush(r, D, { visited: false }).kind, 'craft');
});

test('🔥 가공 완료 — 어젯밤 넣은 것 & 오늘 아직 안 들어온 사람만', () => {
  const slots = [{ item: 'charcoal', day: '2026-10-12' }];
  assert.equal(pickPush(row({ updated_at: '2026-10-12T10:00:00Z', craft: { slots } }), D, null).kind, 'craft');
  assert.equal(pickPush(row({ craft: { slots } }), D, null), null, '오늘 이미 접속했으면 게임 안에서 봤다');
  assert.equal(pickPush(row({ updated_at: '2026-10-12T10:00:00Z', craft: { slots: [{ item: 'charcoal', day: '2026-10-10' }] } }), D, null), null,
    '며칠 묵은 완성품으로 매일 울리지 않는다');
  assert.equal(pickPush(row({ updated_at: '2026-10-12T10:00:00Z', craft: { slots: [{ item: 'charcoal', day: '2026-10-13' }] } }), D, null), null, '오늘 넣은 건 아직');
});

test('🌱 복귀 — 3일 이상 & 7일 2회 & 30일 넘으면 그만 · 밭이 비면 출석 선물 문구', () => {
  const away = d => new Date(NOW - d * 86400000).toISOString();
  assert.equal(pickPush(row({ updated_at: away(2) }), D, null), null);
  assert.equal(pickPush(row({ updated_at: away(3) }), D, null).kind, 'return');
  assert.deepEqual(pickPush(row({ updated_at: away(3) }), D, null), { kind: 'return' });
  assert.deepEqual(pickPush(row({ updated_at: away(3), plots: [] }), D, null), { kind: 'return', bare: true });
  assert.equal(pickPush(row({ updated_at: away(2), plots: [] }), D, null), null);
  assert.equal(pickPush(row({ updated_at: away(4), plots: [], returns_7d: 2 }), D, null), null);
  assert.equal(pickPush(row({ updated_at: away(31), plots: [] }), D, null), null);
  assert.equal(pickPush(row({ updated_at: away(4), returns_7d: 2 }), D, null), null);
  assert.equal(pickPush(row({ updated_at: away(31) }), D, null), null);
});

test('messageFor — 확정 문구·장치 이름·영어', () => {
  assert.deepEqual(messageFor({ kind: 'night' }, 'ko'), { title: '🌙 밭이 조금 수상해요', body: '오늘 밤 누군가 찾아올지도 몰라요.' });
  assert.deepEqual(messageFor({ kind: 'craft', stations: ['kiln'] }, 'ko'), { title: '🔥 화덕에 넣어 둔 게 다 됐어요', body: '꺼내러 와 주세요 🌿' });
  assert.equal(messageFor({ kind: 'craft', stations: ['vat'] }, 'ko').title, '🫙 발효통에 넣어 둔 게 다 됐어요');
  assert.equal(messageFor({ kind: 'craft', stations: ['kiln', 'vat'] }, 'ko').title, '🔥🫙 화덕·발효통에 넣어 둔 게 다 됐어요');
  assert.deepEqual(messageFor({ kind: 'return' }, 'ko'), { title: '🍓 수확할 게 생겼을지도 몰라요', body: '숲이 조용히 기다리고 있어요.' });
  assert.deepEqual(messageFor({ kind: 'return', bare: true }, 'ko'), { title: '🌿 숲이 조용히 기다리고 있어요', body: '오늘의 출석 선물이 준비돼 있어요.' });
  for (const k of [{ kind: 'night' }, { kind: 'craft', stations: ['vat'] }, { kind: 'pond' }, { kind: 'return' }, { kind: 'return', bare: true }]) {
    const m = messageFor(k, 'en');
    assert.ok(m.title && m.body && !/[가-힣]/.test(m.title + m.body), `영어판에 한국어 혼입: ${k.kind}`);
  }
});

test('🐟 연못 — 어제 연못을 만들고 오늘 아직 안 들어온 사람', () => {
  const away = { updated_at: '2026-10-12T05:00:00Z', plots: [], pond_day: '2026-10-12' };
  assert.deepEqual(pickPush(row(away), D, null), { kind: 'pond' });
  assert.equal(pickPush(row({ ...away, pond_day: '2026-10-11' }), D, null), null, '그저께 만든 연못은 안 보낸다');
  assert.equal(pickPush(row({ ...away, pond_day: null }), D, null), null);
  assert.equal(pickPush(row({ pond_day: '2026-10-12', plots: [] }), D, null), null, '오늘 이미 들어왔다');
});

test('🐟 연못 — 밤손님이 먼저', () => {
  assert.deepEqual(pickPush(row({ updated_at: '2026-10-12T05:00:00Z', pond_day: '2026-10-12' }), D, { visited: true }), { kind: 'night' });
});

test('🐟 연못 문구', () => {
  assert.deepEqual(messageFor({ kind: 'pond' }, 'ko'), { title: '🐟 연못 물고기들이 기다려요', body: '오늘 먹이를 주러 와 주세요 🌿' });
  assert.deepEqual(messageFor({ kind: 'pond' }, 'en'), { title: '🐟 Your pond fish are waiting', body: 'Come feed them today 🌿' });
});

import { readFileSync } from 'node:fs';
import { seasonCtx, SEASON_LIMITED_IDS } from '../functions/push/season-limited.js';

const CTX = { id: 'spring', name: '봄', ico: '🌸', left: 3,
  limited: [{ cat: 'fish', id: 'sakura_trout' }, { cat: 'bug', id: 'petal' }, { cat: 'forage', id: 'mugwort' }] };
const AWAY = row({ updated_at: '2026-10-12T05:00:00Z' });

test('season push: last three days, something missing, not sent this season', () => {
  const r = { ...AWAY, dex: { fish: { sakura_trout: 1 }, bug: {}, forage: {} }, season_7d: 0 };
  assert.deepEqual(pickPush(r, D, null, CTX), { kind: 'season', season: 'spring' });
});

test('season push: silent when everything is owned, already sent, too early, played today, or column missing', () => {
  const all = { fish: { sakura_trout: 1 }, bug: { petal: 1 }, forage: { mugwort: 1 } };
  assert.equal(pickPush({ ...AWAY, dex: all, season_7d: 0 }, D, null, CTX), null);
  assert.equal(pickPush({ ...AWAY, dex: {}, season_7d: 1 }, D, null, CTX), null);
  assert.equal(pickPush({ ...AWAY, dex: {}, season_7d: 0 }, D, null, { ...CTX, left: 4 }), null);
  assert.equal(pickPush(row({ dex: {}, season_7d: 0 }), D, null, CTX), null);
  assert.equal(pickPush({ ...AWAY, dex: {} }, D, null, CTX), null);
});

test('season push: ranks below night and above return; missing ctx keeps old behaviour', () => {
  const r = { ...AWAY, dex: {}, season_7d: 0 };
  assert.equal(pickPush(r, D, { visited: true }, CTX).kind, 'night');
  const away5 = { ...r, updated_at: '2026-10-08T05:00:00Z' };
  assert.equal(pickPush(away5, D, null, CTX).kind, 'season');
  assert.equal(pickPush(away5, D, null, undefined).kind, 'return');
  assert.equal(pickPush({ ...r, dex: null }, D, null, CTX).kind, 'season');
});

test('season push message: confirmed ko copy for all four seasons, en has no Korean', () => {
  assert.deepEqual(messageFor({ kind: 'season', season: 'spring' }, 'ko', CTX),
    { title: '🌸 봄이 3일 남았어요', body: '봄에만 나오는 물고기·반디·채집물, 도감에 아직 빈칸이 있어요' });
  for (const [id, name] of [['summer', '여름'], ['autumn', '가을'], ['winter', '겨울']]) {
    const m = messageFor({ kind: 'season', season: id }, 'ko', { ...CTX, id, name, ico: '🌿', left: 2 });
    assert.equal(m.title, `🌿 ${name}이 2일 남았어요`);
    assert.ok(!(m.title + m.body).includes('—'));
  }
  const en = messageFor({ kind: 'season', season: 'spring' }, 'en', CTX);
  assert.doesNotMatch(en.title + en.body, /[가-힣]/);
});

test('seasonCtx: built from the KST date, matches the client season tables', () => {
  const c = seasonCtx('2026-11-17');
  assert.deepEqual({ id: c.id, name: c.name, left: c.left }, { id: 'spring', name: '봄', left: 3 });
  assert.deepEqual(c.limited, CTX.limited);
  const src = f => readFileSync(new URL('../js/data/' + f, import.meta.url), 'utf8');
  const table = (file, name) => new Function('return ' + src(file).match(new RegExp('export const ' + name + ' = (\\[[\\s\\S]*?\\n\\]);'))[1])();
  const fish = table('catalog.js', 'FISH_KINDS'), bug = table('places.js', 'BUG_KINDS'), forage = table('places.js', 'FORAGE_KINDS');
  for (const [season, list] of Object.entries(SEASON_LIMITED_IDS)) {
    assert.deepEqual(list, [
      { cat: 'fish', id: fish.find(k => k.season === season).rarity },
      { cat: 'bug', id: bug.find(k => k.season === season).id },
      { cat: 'forage', id: forage.find(k => k.season === season).id },
    ], season);
  }
  assert.deepEqual(Object.keys(SEASON_LIMITED_IDS).sort(), ['autumn', 'spring', 'summer', 'winter']);
});

test('season push in English says 1 day, not 1 days', () => {
  const ctx = { id: 'spring', name: '봄', ico: '🌸', left: 1, limited: [] };
  assert.equal(messageFor({ kind: 'season' }, 'en', ctx).title, '🌸 1 day of spring left');
  assert.equal(messageFor({ kind: 'season' }, 'en', { ...ctx, left: 3 }).title, '🌸 3 days of spring left');
});
