import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FEED_BUFF_SEC, FEED_AD_PER_DAY, feedStatus, afterFeed, afterFeedAd, daysUntilSeason, fishBook } from '../js/pond/actions.js';

const IDS = ['spring', 'summer', 'autumn', 'winter'];
const RIVER = [
  { id: 'common', ico: '🐟', name: '피라미' },
  { id: 'rare', ico: '🌈', name: '무지개 물고기' },
  { id: 'maple_carp', ico: '🍁', name: '단풍 잉어', season: 'autumn' },
  { id: 'ice_smelt', ico: '❄️', name: '얼음 빙어', season: 'winter' },
  { id: 'sakura_trout', ico: '🌸', name: '벚꽃 송어', season: 'spring' },
];
const SEA = [{ id: 'aji', ico: '🐟', name: '전갱이' }, { id: 'buri', ico: '🐠', name: '방어' }];

test('상수', () => {
  assert.equal(FEED_BUFF_SEC, 30);
  assert.equal(FEED_AD_PER_DAY, 1);
});

test('먹이: 오늘 안 줬으면 줄 수 있다', () => {
  assert.deepEqual(feedStatus({}, '2026-11-12'), { fed: false, adLeft: 1 });
  assert.deepEqual(feedStatus(null, '2026-11-12'), { fed: false, adLeft: 1 });
  assert.deepEqual(feedStatus({ pondFeedDay: '2026-11-11' }, '2026-11-12'), { fed: false, adLeft: 1 });
});

test('먹이: 같은 날 두 번은 안 된다', () => {
  const h = afterFeed({ pond: true }, '2026-11-12');
  assert.deepEqual(h, { pond: true, pondFeedDay: '2026-11-12' });
  assert.equal(feedStatus(h, '2026-11-12').fed, true);
});

test('먹이: 원본을 바꾸지 않는다', () => {
  const h = { pond: true };
  afterFeed(h, '2026-11-12');
  afterFeedAd(h, '2026-11-12');
  assert.deepEqual(h, { pond: true });
});

test('광고 한 번 더: 하루 1번, 날짜 바뀌면 다시', () => {
  const h = afterFeedAd(afterFeed({}, '2026-11-12'), '2026-11-12');
  assert.deepEqual(h.pondFeedAd, { d: '2026-11-12', n: 1 });
  assert.equal(feedStatus(h, '2026-11-12').adLeft, 0);
  assert.equal(feedStatus(h, '2026-11-13').adLeft, 1);
});

test('계절까지 남은 날: left 는 오늘 포함 이번 계절 남은 날', () => {
  assert.equal(daysUntilSeason('autumn', 5, 'autumn', IDS), 0);
  assert.equal(daysUntilSeason('autumn', 5, 'winter', IDS), 5);
  assert.equal(daysUntilSeason('autumn', 5, 'spring', IDS), 19);
  assert.equal(daysUntilSeason('autumn', 5, 'summer', IDS), 33);
  assert.equal(daysUntilSeason('winter', 14, 'spring', IDS), 14);
});

test('수첩: 잡은 칸·빈 칸 힌트', () => {
  const b = fishBook({ dexFish: { common: 10, maple_carp: 20 }, seaBest: { buri: 9.24 } }, { river: RIVER, sea: SEA }, { season: 'autumn', left: 5 }, IDS);
  assert.equal(b.total, 7);
  assert.equal(b.got, 3);
  assert.deepEqual(b.river.map(s => s.got), [true, false, true, false, false]);
  assert.deepEqual(b.river[1].hint, { kind: 'lake' });
  assert.deepEqual(b.river[3].hint, { kind: 'season', season: 'winter', days: 5 });
  assert.deepEqual(b.river[4].hint, { kind: 'season', season: 'spring', days: 19 });
  assert.equal(b.river[0].hint, null);
  assert.deepEqual(b.sea[0], { id: 'aji', ico: '🐟', name: '전갱이', got: false, w: null, hint: { kind: 'sea' } });
  assert.deepEqual(b.sea[1], { id: 'buri', ico: '🐠', name: '방어', got: true, w: 9.2, hint: null });
});

test('수첩: 지금 계절 물고기를 못 잡았으면 호수 힌트(now)', () => {
  const b = fishBook({ dexFish: {}, seaBest: {} }, { river: RIVER, sea: SEA }, { season: 'autumn', left: 5 }, IDS);
  assert.deepEqual(b.river[2].hint, { kind: 'lake', now: true });
});

test('수첩: 이상한 입력에 죽지 않는다', () => {
  const b = fishBook({ dexFish: { common: 'x', shark: 1 }, seaBest: { aji: -1, buri: NaN } }, { river: RIVER, sea: SEA }, { season: 'autumn', left: 5 }, IDS);
  assert.equal(b.got, 0);
  const e = fishBook(undefined, { river: RIVER, sea: SEA }, { season: 'autumn', left: 5 }, IDS);
  assert.equal(e.got, 0);
});
