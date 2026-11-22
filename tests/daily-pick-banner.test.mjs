import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAILY_PICK_POOL, pickIndex, pickOf, themeOf, nextDayKey, tomorrowPick, daysUntil, dexLabel, themeBook } from '../js/data/daily-pick.js';

test('id 접두사로 테마를 정하고 모르는 접두사는 기타로', () => {
  assert.equal(themeOf('wp_hearth').name, '겨울 준비');
  assert.equal(themeOf('tools_candy').emoji, '🛠️');
  assert.equal(themeOf('sf_firework').name, '여름밤 축제');
  assert.equal(themeOf('mu_drum').emoji, '🎵');
  assert.equal(themeOf('bk_globe').name, '숲속 책방');
  assert.equal(themeOf('bk_globe').emoji, '📚');
  assert.equal(themeOf('kn_knit_pot').name, '뜨개 공방');
  assert.equal(themeOf('kn_knit_pot').emoji, '🧶');
  assert.equal(themeOf('tr_station_clock').name, '기차 여행');
  assert.equal(themeOf('tr_station_clock').emoji, '🚂');
  assert.equal(themeOf('au_igloo_lamp').name, '오로라 마을');
  assert.equal(themeOf('au_igloo_lamp').emoji, '🌌');
  assert.equal(themeOf('zz_new').name, '기타');
  assert.equal(themeOf('zz_new').emoji, '🎀');
});

test('지금 풀은 전부 알려진 테마에 들어간다', () => {
  for (const p of DAILY_PICK_POOL) assert.notEqual(themeOf(p.id).key, 'etc', p.id);
});

test('내일 키는 달·해를 넘긴다', () => {
  assert.equal(nextDayKey('2026-11-30'), '2026-12-01');
  assert.equal(nextDayKey('2026-12-31'), '2027-01-01');
  assert.equal(nextDayKey('2028-02-28'), '2028-02-29');
});

test('내일의 꾸미기는 풀 순서상 다음 칸', () => {
  const n = DAILY_PICK_POOL.length;
  for (const d of ['2026-11-21', '2026-12-31']) {
    assert.equal(tomorrowPick(d).id, DAILY_PICK_POOL[(pickIndex(d) + 1) % n].id);
    assert.equal(tomorrowPick(d).id, pickOf(nextDayKey(d)).id);
  }
});

test('n일 뒤는 (아이템 칸 - 오늘 칸) mod 풀 크기', () => {
  assert.equal(daysUntil(5, 5, 10), 0);
  assert.equal(daysUntil(6, 5, 10), 1);
  assert.equal(daysUntil(2, 5, 10), 7);
  assert.equal(dexLabel(0, true), '오늘 특가');
  assert.equal(dexLabel(0, false), '오늘');
  assert.equal(dexLabel(1, true), '내일');
  assert.equal(dexLabel(4), '4일 뒤');
  assert.equal(dexLabel(13), '13일 뒤');
  assert.equal(dexLabel(14), '2주 뒤');
  assert.equal(dexLabel(59), '8주 뒤');
  assert.equal(dexLabel(60), '2달 뒤');
  assert.equal(dexLabel(105), '4달 뒤');
});

test('테마별 모은 수·전체 수·완성', () => {
  const entries = [
    { id: 'wp_a', owned: true }, { id: 'fp_a', owned: false }, { id: 'wp_b', owned: true },
    { id: 'zz_x', owned: false }, { id: 'fp_b', owned: true },
  ];
  const book = themeBook(entries, 1);
  assert.deepEqual(book.map(t => [t.name, t.got, t.total, t.full]), [['겨울 준비', 2, 2, true], ['숲속 친구', 1, 2, false], ['기타', 0, 1, false]]);
  assert.deepEqual(book[1].items.map(e => e.days), [0, 3]);
  assert.equal(book[0].items[0].days, 4);
});

test('실제 풀 도감 합계는 풀 크기와 같다', () => {
  const book = themeBook(DAILY_PICK_POOL.map(p => ({ id: p.id, owned: false })), 0);
  assert.equal(book.reduce((s, t) => s + t.total, 0), DAILY_PICK_POOL.length);
  assert.equal(book.find(t => t.key === 'tools_').total, 17);
});
