import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SLOT_CAPS, slotLeft, bumpDay, adQuiet, AD_PARTS } from '../js/guide/prepass-rules.js';
import { createRewarded } from '../js/ads/rewarded.js';
import { rvGroup } from '../js/tenjin-events.js';

const NEW_SLOTS = ['affinity_heart', 'concert_play', 'weekly_ticket', 'orchard_grow', 'forge_rush', 'quest_reroll', 'drop_reroll_mine', 'drop_reroll_firefly', 'restaurant_double', 'bait_box'];

test('자리별 상한: 반복 코인 자리와 새 자리', () => {
  assert.equal(SLOT_CAPS.sell_bonus, 5);
  assert.equal(SLOT_CAPS.farm_rush, 3);
  assert.equal(SLOT_CAPS.craft_rush, 2);
  assert.equal(SLOT_CAPS.weekly_ticket, 3);
  for (const s of NEW_SLOTS.filter(s => s !== 'weekly_ticket')) assert.equal(SLOT_CAPS[s], 1, s);
});

test('새 자리 이름은 텐진 묶음 표와 맞고 문구가 있다', () => {
  for (const s of NEW_SLOTS) {
    assert.notEqual(rvGroup(s), 'other', s);
    assert.ok(Array.isArray(AD_PARTS[s]) && AD_PARTS[s][0] === '광고 보고', s);
  }
  for (const s of ['pond2', 'pond3']) assert.notEqual(rvGroup(s), 'other', s);
  assert.equal(rvGroup('table_bite_more'), 'pond');
  assert.equal(rvGroup('cook_ingredient'), 'cafe');
});

test('자리 횟수는 날이 바뀌면 0, 주간 자리는 주가 바뀌어야 0', () => {
  const at = { day: '2026-11-15', week: 100 };
  let rec = null;
  for (let i = 0; i < 5; i++) rec = bumpDay(rec, at.day, 'sell_bonus', at);
  assert.equal(rec.n, 5);
  assert.equal(slotLeft(rec, 'sell_bonus', at), 0);
  assert.equal(slotLeft(rec, 'farm_rush', at), 3);
  assert.equal(slotLeft(rec, 'house1', at), Infinity);
  const next = { day: '2026-11-16', week: 100 };
  assert.equal(slotLeft(rec, 'sell_bonus', next), 5);
  rec = bumpDay(rec, at.day, 'weekly_ticket', at);
  rec = bumpDay(rec, at.day, 'weekly_ticket', at);
  rec = bumpDay(rec, next.day, 'weekly_ticket', next);
  assert.equal(slotLeft(rec, 'weekly_ticket', next), 0);
  assert.equal(slotLeft(rec, 'weekly_ticket', { day: '2026-11-20', week: 101 }), 3);
  assert.equal(rec.n, 1);
});

test('슬롯 없이 세면 예전 기록 모양 그대로', () => {
  assert.deepEqual(bumpDay({ d: '2026-11-11', n: 30 }, '2026-11-12'), { d: '2026-11-12', n: 1 });
});

test('튜토리얼·연출·팝업 대기 중 하나라도 있으면 조용히', () => {
  assert.equal(adQuiet({}), false);
  for (const k of ['tutorial', 'coaching', 'spotlight', 'e1', 'cutscene', 'charSelect', 'modalQueue']) assert.equal(adQuiet({ [k]: true }), true, k);
});

function setup({ quiet = false, rec = null, available = true } = {}) {
  let r0 = rec;
  const events = [];
  let q = quiet;
  const r = createRewarded({
    enabled: () => true, forceArm: () => 'ad', clientId: () => 'c', platform: 'android',
    provider: () => ({ available: () => available, show: async () => ({ result: 'complete' }) }),
    track: (name, p) => events.push([name, p]), translate: (s) => s, toast: () => {},
    today: () => '2026-11-15', week: () => 100, quiet: () => q,
    dayRecord: { get: () => r0, set: (v) => { r0 = v; } },
  });
  return { r, events, rec: () => r0, setQuiet: (v) => { q = v; } };
}

test('조용한 동안엔 제안도 기록도 없다, 풀리면 그때 처음 기록', () => {
  const a = setup({ quiet: true });
  assert.equal(a.r.offer('house1'), false);
  assert.equal(a.r.open('house1'), false);
  assert.equal(a.events.length, 0);
  a.setQuiet(false);
  assert.equal(a.r.offer('house1'), true);
  assert.deepEqual(a.events, [['prepass_eligible', { slot: 'house1', arm: 'ad' }]]);
});

test('광고 공급자가 없으면(웹) 제안 기록도 남기지 않는다', () => {
  const a = setup({ available: false });
  assert.equal(a.r.offer('sell_bonus'), false);
  assert.equal(a.events.length, 0);
});

test('자리 상한이 차면 그 자리만 닫히고 결과 이벤트는 자리 이름을 싣는다', async () => {
  const a = setup();
  for (let i = 0; i < 2; i++) assert.equal(await a.r.watch('craft_rush', () => {}), true);
  assert.equal(a.r.open('craft_rush'), false);
  assert.equal(a.r.offer('craft_rush'), false);
  assert.equal(await a.r.watch('craft_rush', () => {}), false);
  assert.equal(a.r.open('sell_bonus'), true);
  assert.equal(a.rec().n, 2);
  const res = a.events.filter(([n]) => n === 'prepass_ad_result');
  assert.equal(res.length, 2);
  assert.equal(res[0][1].slot, 'craft_rush');
});

test('버튼이 떠 있는 동안 팝업이 끼어도 누른 광고는 볼 수 있다', async () => {
  const a = setup();
  a.setQuiet(true);
  let got = false;
  assert.equal(await a.r.watch('daily_double', () => { got = true; }), true);
  assert.equal(got, true);
});

test('광고는 켜져 있고 토스는 토스 광고, 웹은 공급자 없음', async () => {
  const { PREPASS_ON } = await import('../js/tuning.js');
  assert.equal(PREPASS_ON, true);
  const { createRewardedAds } = await import('../js/ads/rewarded-native.js');
  for (const platform of ['web', 'toss']) assert.equal(createRewardedAds({ platform, plugin: {}, listen: () => {} }).available, false, platform);
  const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.match(game, /setPrepassProvider\(IS_TOSS \? createTossRewarded\(/);
});

test('game.js 는 같은 저장 키에 주 번호와 조용함 판정을 넘긴다', () => {
  const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.match(game, /week: \(\) => weekIndex\(DEV_NOW \|\| Date\.now\(\)\)/);
  assert.match(game, /quiet: \(\) => \{[\s\S]{0,120}return adQuiet\(\{/);
});
