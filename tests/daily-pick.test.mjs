import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAILY_PICK_POOL, pickIndex, pickOf, halfPrice, priceOf, msLeft, cleanDailyPick } from '../js/data/daily-pick.js';

const addDays = (key, n) => {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
};

test('풀은 겨울·숲·크리스마스·바닷가·디저트·밤하늘·설날·캠핑·벚꽃·비 오는 날·찻집·아틀리에 96종 + 도구 세트 11종, id 중복 없음', () => {
  assert.equal(DAILY_PICK_POOL.length, 107);
  assert.equal(DAILY_PICK_POOL.filter(p => p.kind === 'cos').length, 59);
  assert.equal(DAILY_PICK_POOL.filter(p => p.kind === 'decor').length, 48);
  assert.equal(new Set(DAILY_PICK_POOL.map(p => p.id)).size, 107);
  for (const id of ['tools_snowman', 'tools_squirrel', 'tools_candy', 'tools_octopus', 'tools_starry', 'tools_strawberry', 'tools_penguin', 'tools_tangerine', 'tools_watermelon', 'tools_sunflower', 'tools_peach']) assert.equal(DAILY_PICK_POOL.find(p => p.id === id)?.price, 3600);
  for (const p of DAILY_PICK_POOL) assert.ok(Number.isInteger(p.price) && p.price > 0);
});

test('같은 날짜는 언제나 같은 아이템', () => {
  assert.equal(pickOf('2026-12-01').id, pickOf('2026-12-01').id);
  assert.equal(pickIndex('2026-12-01'), pickIndex('2026-12-01'));
});

test('풀 크기만큼 연속된 날이면 전부 한 번씩, 그다음 날은 첫날과 같다', () => {
  const start = '2026-11-28', n = DAILY_PICK_POOL.length;
  const ids = Array.from({ length: n }, (_, i) => pickOf(addDays(start, i)).id);
  assert.equal(new Set(ids).size, n);
  assert.equal(pickOf(addDays(start, n)).id, ids[0]);
});

test('월·해가 바뀌어도 하루씩 이어진다', () => {
  const n = DAILY_PICK_POOL.length;
  assert.equal((pickIndex('2026-12-31') + 1) % n, pickIndex('2027-01-01'));
  assert.equal((pickIndex('2027-02-28') + 1) % n, pickIndex('2027-03-01'));
});

test('반값은 올림', () => {
  assert.equal(halfPrice(1200), 600);
  assert.equal(halfPrice(1101), 551);
});

test('반값은 같은 날·같은 아이템에만', () => {
  const day = '2026-12-01';
  const pick = pickOf(day);
  assert.equal(priceOf(pick, null, day), pick.price);
  assert.equal(priceOf(pick, { d: day, id: pick.id, half: true }, day), halfPrice(pick.price));
  assert.equal(priceOf(pick, { d: addDays(day, -1), id: pick.id, half: true }, day), pick.price);
  assert.equal(priceOf(pick, { d: day, id: 'other', half: true }, day), pick.price);
  assert.equal(priceOf(pick, { d: day, id: pick.id, half: false }, day), pick.price);
});

test('남은 시간은 로컬 자정까지', () => {
  const now = new Date(2026, 11, 1, 22, 30, 0).getTime();
  assert.equal(msLeft(now), 90 * 60 * 1000);
  assert.ok(msLeft(new Date(2026, 11, 1, 0, 0, 0).getTime()) <= 24 * 3600 * 1000);
});

test('세이브 복원은 올바른 모양만 받는다', () => {
  assert.deepEqual(cleanDailyPick({ d: '2026-12-01', id: 'wp_knit_scarf', half: true }), { d: '2026-12-01', id: 'wp_knit_scarf', half: true });
  assert.equal(cleanDailyPick(null), null);
  assert.equal(cleanDailyPick('x'), null);
  assert.equal(cleanDailyPick({ d: '12/01', id: 'wp_knit_scarf', half: true }), null);
  assert.equal(cleanDailyPick({ d: '2026-12-01', id: 'unknown', half: true }), null);
  assert.equal(cleanDailyPick({ d: '2026-12-01', id: 'wp_knit_scarf', half: 'yes' }), null);
  assert.deepEqual(Object.keys(cleanDailyPick({ d: '2026-12-01', id: 'wp_knit_scarf', half: true, extra: 1 })), ['d', 'id', 'half']);
});

test('카드 상태: 이미 있음 > 반값 > 광고 > 광고 없음', async () => {
  const { cardState } = await import('../js/data/daily-pick.js');
  assert.equal(cardState({ owned: true, half: true, adOpen: true }), 'owned');
  assert.equal(cardState({ owned: false, half: true, adOpen: true }), 'half');
  assert.equal(cardState({ owned: false, half: false, adOpen: true }), 'ad');
  assert.equal(cardState({ owned: false, half: false, adOpen: false }), 'noad');
});

test('남은 시간 표시는 시:분', async () => {
  const { leftLabel } = await import('../js/data/daily-pick.js');
  assert.equal(leftLabel((13 * 60 + 42) * 60000 + 30000), '13:42');
  assert.equal(leftLabel(5 * 60000), '0:05');
  assert.equal(leftLabel(0), '0:00');
});

test('가구 보유: 보관함·실내·마당 어디든 하나 있으면 가짐', async () => {
  const { decorOwned } = await import('../js/data/daily-pick.js');
  assert.equal(decorOwned({}, 'wp_hearth'), false);
  assert.equal(decorOwned({ house: { stored: { wp_hearth: 1 } } }, 'wp_hearth'), true);
  assert.equal(decorOwned({ house: { stored: { wp_hearth: 0 }, decor: [{ id: 'wp_hearth' }] } }, 'wp_hearth'), true);
  assert.equal(decorOwned({ outdoorStored: { wp_snowman: 1 } }, 'wp_snowman'), true);
  assert.equal(decorOwned({ outdoor: [{ id: 'wp_snowman' }] }, 'wp_snowman'), true);
  assert.equal(decorOwned({ outdoor: [{ id: 'other' }] }, 'wp_snowman'), false);
});

test('구매 판단: 카드에 보인 아이템·가격 그대로만 판다', async () => {
  const { planBuy, pickOf, halfPrice } = await import('../js/data/daily-pick.js');
  const day = '2026-12-01', pick = pickOf(day);
  const shown = { d: day, id: pick.id };
  assert.deepEqual(planBuy({ day, shown, dp: null, coins: 5000, owned: false }), { ok: true, pick, price: pick.price, half: false });
  const half = { d: day, id: pick.id, half: true };
  assert.deepEqual(planBuy({ day, shown, dp: half, coins: 5000, owned: false }), { ok: true, pick, price: halfPrice(pick.price), half: true });
  assert.deepEqual(planBuy({ day, shown, dp: null, coins: 5000, owned: true }), { ok: false, msg: '이미 있어요' });
  assert.deepEqual(planBuy({ day, shown, dp: null, coins: pick.price - 1, owned: false }), { ok: false, msg: '코인이 모자라요' });
  assert.deepEqual(planBuy({ day, shown: { d: '2026-11-30', id: pick.id }, dp: null, coins: 5000, owned: false }), { ok: false, msg: '오늘의 꾸미기가 바뀌었어요', stale: true });
  assert.deepEqual(planBuy({ day, shown: { d: day, id: 'other' }, dp: null, coins: 5000, owned: false }), { ok: false, msg: '오늘의 꾸미기가 바뀌었어요', stale: true });
});

test('광고 반값은 버튼을 만들 때 보인 카드에만 준다', async () => {
  const { adGrant, pickOf } = await import('../js/data/daily-pick.js');
  const day = '2026-12-01', pick = pickOf(day);
  assert.deepEqual(adGrant({ d: day, id: pick.id }, day), { d: day, id: pick.id, half: true });
  assert.equal(adGrant({ d: '2026-11-30', id: pickOf('2026-11-30').id }, day), null);
});

test('풀의 캐릭터 꾸미기는 모두 카탈로그 코인 가격과 같고 가게 탭에는 없다', async () => {
  const { findItem, SLOTS } = await import('../js/cosmetics/catalog.js');
  const { shopRows } = await import('../js/cosmetics/sprout.js');
  for (const p of DAILY_PICK_POOL.filter(x => x.kind === 'cos')) {
    const it = findItem(p.id);
    assert.ok(it, p.id);
    assert.equal(it.group, 'daily', p.id);
    assert.equal(it.price.coins, p.price, p.id);
    assert.ok(!it.price.cash, p.id);
    assert.ok(!SLOTS.some(s => shopRows(s).some(r => r.id === p.id)), p.id);
  }
});
