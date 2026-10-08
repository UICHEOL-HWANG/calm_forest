import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUESTS_PER_DAY, RESIDENTS, ITEMS, pickQuests, normalizeMirror, rewardFor, questAt } from '../js/mirror/quests.js';
import { spotOf } from '../js/mirror/layout.js';

const DAYS = [...Array.from({ length: 28 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`), '2026-11-03', '2027-01-01'];

test('같은 날 = 같은 배정(결정적), 같은 날 다시 부르면 같은 객체', () => {
  const a = JSON.stringify(pickQuests('2026-10-09'));
  pickQuests('2026-10-10');
  assert.equal(JSON.stringify(pickQuests('2026-10-09')), a);
  assert.equal(pickQuests('2026-10-09'), pickQuests('2026-10-09'));
});

test('하루 3건 — 주민 3명 각 1건, 물건·표지물 서로 다름, 1번 그대로 / 2·3번 왼·오 반전', () => {
  for (const d of DAYS) {
    const q = pickQuests(d);
    assert.equal(q.length, QUESTS_PER_DAY);
    assert.deepEqual(q.map(x => x.n), [1, 2, 3]);
    assert.equal(new Set(q.map(x => x.npc)).size, 3);
    assert.equal(new Set(q.map(x => x.item)).size, 3);
    assert.equal(new Set(q.map(x => spotOf(x.spot).landmark)).size, 3, d);
    assert.equal(q[0].flipped, false);
    for (const x of q.slice(1)) {
      assert.equal(x.flipped, true);
      assert.ok(['left', 'right'].includes(spotOf(x.spot).side), `${d} ${x.spot}`);
    }
    for (const x of q) { assert.ok(RESIDENTS.some(r => r.id === x.npc)); assert.ok(ITEMS.some(i => i.id === x.item)); }
  }
});

test('날마다 배정이 바뀐다(30일 중 자리 조합 20가지 이상)', () => {
  assert.ok(new Set(DAYS.map(d => pickQuests(d).map(x => x.spot).join())).size >= 20);
});

test('normalizeMirror — 타입·범위 검증, 날이 바뀌면 done·hinted 초기화', () => {
  assert.deepEqual(normalizeMirror(null, '2026-10-09'), { visits: 0, day: '2026-10-09', done: 0, hinted: [], total: 0 });
  assert.deepEqual(normalizeMirror({ visits: 3, day: '2026-10-09', done: 2, hinted: [2], total: 7 }, '2026-10-09'),
    { visits: 3, day: '2026-10-09', done: 2, hinted: [2], total: 7 });
  assert.deepEqual(normalizeMirror({ visits: 3, day: '2026-10-08', done: 3, hinted: [1, 2], total: 9 }, '2026-10-09'),
    { visits: 3, day: '2026-10-09', done: 0, hinted: [], total: 9 });
  assert.deepEqual(normalizeMirror({ visits: -1, day: '2026-10-09', done: 9, hinted: [5, 'x', 2, 2, 3], total: 'a' }, '2026-10-09'),
    { visits: 0, day: '2026-10-09', done: 3, hinted: [2, 3], total: 0 });
  assert.deepEqual(normalizeMirror({ day: '2026-10-09', done: 1, hinted: [1, 3] }, '2026-10-09').hinted, [1], '아직 안 한 의뢰의 힌트는 버린다');
});

test('보상·다음 의뢰', () => {
  assert.equal(rewardFor(false), 3);
  assert.equal(rewardFor(true), 2);
  const st = normalizeMirror({ day: '2026-10-09', done: 1 }, '2026-10-09');
  assert.equal(questAt(st, '2026-10-09').n, 2);
  assert.equal(questAt({ ...st, done: 3 }, '2026-10-09'), null);
});
