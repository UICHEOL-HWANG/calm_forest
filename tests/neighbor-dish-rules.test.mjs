import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DISH_COINS, DISH_HOSTS_PER_DAY, DISH_TABLE_MAX, DISH_KEEP_DAYS, STAR_CUTS, BITE_STAR_MULT,
  dishStars, starLine, biteSecFor, giftable, leaveOutcome, inboxView, eatOutcome, rateOutcome, returnRows,
} from '../js/neighbors/dish-rules.js';
import { BITE_BASE_SEC } from '../js/data/table.js';

const UUID = '11111111-2222-4333-8444-555555555555';
const UUID2 = '66666666-7777-4888-9999-aaaaaaaaaaaa';
const RECIPES = [{ id: 'veg_stew', ico: '🍲', name: '채소 스튜', buff: 'speed' }, { id: 'bread', ico: '🍞', name: '빵', buff: 'luck' }];
const face = (c) => ({ bear: '🐻', rabbit: '🐰' }[c] || '🐾');

test('별: 88 이상 3, 65 이상 2, 그 밖 1 · 범위 밖·문자열도 안전', () => {
  assert.deepEqual(STAR_CUTS, [88, 65]);
  assert.deepEqual([100, 88, 87.4, 65, 64, 0, -5, 'x', null, 300].map(dishStars), [3, 3, 2, 2, 1, 1, 1, 1, 1, 3]);
});

test('별 줄은 1~3개의 ⭐ 만', () => {
  assert.equal(starLine(3), '⭐⭐⭐');
  assert.equal(starLine(0), '⭐');
  assert.equal(starLine(9), '⭐⭐⭐');
});

test('상한 수치', () => {
  assert.equal(DISH_COINS, 5);
  assert.equal(DISH_HOSTS_PER_DAY, 3);
  assert.equal(DISH_TABLE_MAX, 6);
  assert.equal(DISH_KEEP_DAYS, 7);
  assert.deepEqual(BITE_STAR_MULT, [1, 1.25, 1.5]);
});

test('한 입 시간 = 식탁 한 입 기본 × 별 배수', () => {
  assert.deepEqual([1, 2, 3].map(biteSecFor), [BITE_BASE_SEC, Math.round(BITE_BASE_SEC * 1.25), Math.round(BITE_BASE_SEC * 1.5)]);
  assert.equal(biteSecFor(7), Math.round(BITE_BASE_SEC * 1.5));
});

test('줄 수 있는 요리: 레시피만, 찬장 칸 번호를 지킨다, 자유 냄비·모르는 id 제외', () => {
  const pantry = [{ id: 'free:a+b', score: 90 }, { id: 'veg_stew', score: 70 }, { id: 'nope', score: 50 }, { id: 'bread', score: 20 }];
  const out = giftable(pantry, RECIPES);
  assert.deepEqual(out.map(d => [d.i, d.id, d.ico]), [[1, 'veg_stew', '🍲'], [3, 'bread', '🍞']]);
  assert.deepEqual(giftable(null, RECIPES), []);
});

test('올리기 결과: 성공만 찬장 차감·보상, 나머지는 사유별 안내', () => {
  assert.deepEqual(leaveOutcome({ ok: true, stars: 2, rewarded: true }), { reason: 'ok', stars: 2, give: true, reward: true });
  assert.equal(leaveOutcome({ ok: true, stars: 9, rewarded: false }).stars, 3);
  assert.equal(leaveOutcome({ ok: true, stars: 3, rewarded: false }).reward, false);
  for (const reason of ['dup', 'full', 'limit', 'login', 'private', 'upstream']) {
    const o = leaveOutcome({ ok: false, reason });
    assert.equal(o.give, false); assert.equal(o.reward, false); assert.equal(o.reason, reason);
  }
  assert.equal(leaveOutcome(null).reason, 'offline');
  assert.equal(leaveOutcome({ ok: false }).reason, 'offline');
});

test('식탁 접시 목록: 모르는 요리·잘못된 id 는 버리고, 답방 id 는 uuid 만', () => {
  const v = inboxView({ ok: true, ate_today: false, list: [
    { id: 7, recipe: 'veg_stew', stars: 3, nick: '도토리숲', character: 'bear', public_id: UUID },
    { id: 8, recipe: 'free:x', stars: 1, nick: 'x', character: 'bear', public_id: UUID },
    { id: 'bad', recipe: 'bread', stars: 2, nick: 'y', character: 'rabbit', public_id: UUID },
    { id: 9, recipe: 'bread', stars: 2, nick: '<b>달빛</b>', character: 'cat', public_id: 'nope' },
  ] }, RECIPES, face);
  assert.equal(v.ateToday, false);
  assert.deepEqual(v.rows.map(r => [r.id, r.ico, r.stars, r.face, r.publicId]), [[7, '🍲', 3, '🐻', UUID], [9, '🍞', 2, '🐾', null]]);
  assert.equal(v.rows[1].nick, '<b>달빛</b>');
  assert.equal(inboxView({ ok: true, ate_today: true, list: [] }, RECIPES, face).ateToday, true);
  assert.deepEqual(inboxView({ ok: false }, RECIPES, face), { ateToday: false, rows: [] });
  const many = Array.from({ length: 9 }, (_, k) => ({ id: k + 1, recipe: 'bread', stars: 1, nick: 'n', character: 'bear', public_id: UUID }));
  assert.equal(inboxView({ ok: true, list: many }, RECIPES, face).rows.length, DISH_TABLE_MAX);
});

test('먹기·평가 결과 사유', () => {
  assert.deepEqual(eatOutcome({ ok: true, stars: 2 }), { reason: 'ok', ate: true });
  assert.deepEqual(eatOutcome({ ok: false, reason: 'limit' }), { reason: 'limit', ate: false });
  assert.deepEqual(eatOutcome(undefined), { reason: 'offline', ate: false });
  assert.deepEqual(rateOutcome({ ok: true }), { reason: 'ok', done: true });
  assert.deepEqual(rateOutcome({ ok: false, reason: 'dup' }), { reason: 'dup', done: true });
  assert.deepEqual(rateOutcome({ ok: false, reason: 'upstream' }), { reason: 'upstream', done: false });
});

test('나를 찾아온 이웃: 다녀간 이웃·평가 회신을 합쳐 한 사람 한 줄, uuid 없는 줄은 뺀다', () => {
  const rows = returnRows({ ok: true, list: [
    { nick: '도토리숲', character: 'bear', emoji: 'heart', public_id: UUID, dish: 3 },
    { nick: '숨김', character: 'bear', emoji: 'wave', public_id: null, dish: null },
  ], replies: [
    { nick: '도토리숲', character: 'bear', emoji: 'star', public_id: UUID },
    { nick: '달빛', character: 'rabbit', emoji: 'flower', public_id: UUID2 },
    { nick: '이상', character: 'rabbit', emoji: 'poop', public_id: UUID2 },
  ] }, face, 3);
  assert.deepEqual(rows.map(r => [r.publicId, r.face, r.react, r.dish, r.reply]), [[UUID, '🐻', '❤️', 3, '⭐'], [UUID2, '🐰', null, null, '🌸']]);
  assert.deepEqual(returnRows({ ok: false }, face, 3), []);
  assert.equal(returnRows({ ok: true, list: [], replies: [{ nick: 'a', emoji: 'heart', public_id: UUID }, { nick: 'b', emoji: 'heart', public_id: UUID2 }] }, face, 1).length, 1);
});

test('요리 창 판: 간→A(hold), 끓이기·굽기→B(tap), 썰기→C(beat), 모르면 B', async () => {
  const { gameOf } = await import('../js/neighbors/dish-rules.js');
  assert.deepEqual(['season', 'pot', 'grill', 'chop', 'x'].map(gameOf), ['hold', 'tap', 'tap', 'beat', 'tap']);
});

test('판 별: 진한 초록 3 · 연한 초록 2 · 밖 1 · 박자는 맞힌 수(최소 1)', async () => {
  const { GAME_ZONES, zoneStars, beatStars } = await import('../js/neighbors/dish-rules.js');
  const z = GAME_ZONES.hold;
  assert.equal(zoneStars(z.best[0], z), 3);
  assert.equal(zoneStars(z.ok[0], z), 2);
  assert.equal(zoneStars(z.ok[1] + 1, z), 1);
  assert.equal(zoneStars(NaN, z), 1);
  assert.deepEqual([0, 1, 2, 3, 5].map(beatStars), [1, 1, 2, 3, 3]);
});

test('별 → 서버 점수는 서버 별 컷과 같은 별로 돌아온다', async () => {
  const { scoreOfStars, dishStars } = await import('../js/neighbors/dish-rules.js');
  assert.deepEqual([1, 2, 3].map(scoreOfStars).map(dishStars), [1, 2, 3]);
});
