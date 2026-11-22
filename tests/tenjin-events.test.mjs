import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tenjinEventFor, onceSeed, rvGroup, RV_GROUPS, tallyEvents, RV_TALLY, bumpTally } from '../js/tenjin-events.js';

test('업데이트 전부터 하던 사람은 첫 경험 이벤트를 이미 보낸 것으로 친다', () => {
  assert.deepEqual(onceSeed(false), []);
  assert.deepEqual(onceSeed(true).sort(), ['bridge_fixed', 'first_chop', 'first_harvest', 'first_share', 'house_complete', 'push_granted', 'tutorial_complete']);
});
import { createRewarded } from '../js/ads/rewarded.js';

test('첫 경험 이벤트는 기기당 한 번만 보낸다', () => {
  assert.deepEqual(tenjinEventFor('tutorial_complete'), { name: 'tutorial_complete', once: true });
  assert.deepEqual(tenjinEventFor('first_chop', { tree_id: 't1' }), { name: 'first_chop', once: true });
  assert.deepEqual(tenjinEventFor('harvest_crop', { qty: 3 }), { name: 'first_harvest', once: true });
  assert.deepEqual(tenjinEventFor('house_complete'), { name: 'house_complete', once: true });
  assert.deepEqual(tenjinEventFor('photo_share'), { name: 'first_share', once: true });
});

test('푸시는 허용했을 때만 보낸다', () => {
  assert.deepEqual(tenjinEventFor('push_permission', { result: 'granted' }), { name: 'push_granted', once: true });
  assert.equal(tenjinEventFor('push_permission', { result: 'denied' }), null);
});

test('스토리 장은 몇 번째 장인지 값으로, 소급 기록은 뺀다', () => {
  assert.deepEqual(tenjinEventFor('story_chapter_complete', { n: 3, retro: 0 }), { name: 'story_chapter', value: 3 });
  assert.equal(tenjinEventFor('story_chapter_complete', { n: 3, retro: 1 }), null);
});

test('의뢰 완료는 매번 보낸다', () => {
  assert.deepEqual(tenjinEventFor('quest_complete', { quest_id: 'q1' }), { name: 'quest_complete' });
});

test('보상형 광고는 끝까지 본 것만, 시청 초를 값으로', () => {
  const evs = tenjinEventFor('prepass_ad_result', { slot: 'sell_bonus', result: 'complete', sec: 31.6 });
  assert.deepEqual(evs[0], { name: 'rewarded_ad_complete', value: 32 });
  assert.deepEqual(tenjinEventFor('prepass_ad_result', { slot: 'x', result: 'complete' })[0], { name: 'rewarded_ad_complete' });
  assert.equal(tenjinEventFor('prepass_ad_result', { result: 'skip', sec: 4 }), null);
});

test('튜토리얼 단계는 순서가 바뀌어도 같은 이름으로, 기기당 한 번 보낸다', () => {
  assert.deepEqual(tenjinEventFor('tutorial_step', { step: 2, key: 'chop' }), { name: 'tut_chop', once: true });
  assert.deepEqual(tenjinEventFor('tutorial_step', { step: 5, key: 'chop', auto: 1 }), { name: 'tut_chop', once: true });
  assert.equal(tenjinEventFor('tutorial_step', { step: 3, key: 'Bad Key!' }), null);
  assert.equal(tenjinEventFor('tutorial_step', {}), null);
});

test('튜토리얼 건너뛰기는 환영 창과 코치 중간을 따로, 도움말 닫기는 빼고', () => {
  assert.deepEqual(tenjinEventFor('tutorial_skip', { at: 'welcome' }), { name: 'tutorial_skip_welcome', once: true });
  assert.deepEqual(tenjinEventFor('tutorial_skip', { at: 1 }), { name: 'tutorial_skip_step', once: true, value: 2 });
  assert.deepEqual(tenjinEventFor('tutorial_skip', { at: 0 }), { name: 'tutorial_skip_step', once: true, value: 1 });
  assert.equal(tenjinEventFor('tutorial_skip', { at: 'help' }), null);
  assert.equal(tenjinEventFor('tutorial_skip', { at: -1 }), null);
});

test('목록에 없는 이벤트는 보내지 않는다', () => {
  assert.equal(tenjinEventFor('chop_tree'), null);
  assert.equal(tenjinEventFor('session_time', { seconds: 60 }), null);
});

test('보상형 광고 결과에 시청 시간(초)을 싣는다', async () => {
  const sent = [];
  const times = [1_000, 16_400];
  const r = createRewarded({
    enabled: () => true, forceArm: () => 'ad', clientId: () => 'c', platform: 'android',
    provider: () => ({ available: () => true, show: async () => ({ result: 'complete' }) }),
    track: (name, p) => sent.push([name, p]), translate: (s) => s, toast: () => {},
    now: () => times.shift(),
  });
  assert.equal(await r.watch('bridge', () => {}), true);
  const [, p] = sent.find(([name]) => name === 'prepass_ad_result');
  assert.equal(p.sec, 15);
});

const names = (r) => [r].flat().map((e) => e.name).filter(Boolean);

test('첫 광고 완료는 한 번만, 매번 완료와 그룹 이벤트, 누적 집계가 따라온다', () => {
  const evs = tenjinEventFor('prepass_ad_result', { slot: 'sell_bonus', result: 'complete', sec: 20 });
  assert.deepEqual(names(evs), ['rewarded_ad_complete', 'rv_sell', 'rv_first_complete']);
  assert.deepEqual(evs.find((e) => e.name === 'rv_first_complete'), { name: 'rv_first_complete', once: true });
  assert.deepEqual(evs.find((e) => e.name === 'rv_sell'), { name: 'rv_sell' });
  assert.ok(evs.some((e) => e.tally === RV_TALLY));
});

test('광고 실험군 구분과 첫 제안은 기기당 한 번', () => {
  assert.deepEqual(names(tenjinEventFor('prepass_eligible', { slot: 'bridge', arm: 'ad' })), ['rv_arm_ad', 'rv_first_offer']);
  assert.deepEqual(names(tenjinEventFor('prepass_eligible', { slot: 'bridge', arm: 'control' })), ['rv_arm_control']);
  for (const e of [tenjinEventFor('prepass_eligible', { slot: 'a', arm: 'ad' })].flat()) assert.equal(e.once, true);
});

test('다리 수리는 bridge_fixed 한 번', () => {
  assert.deepEqual(tenjinEventFor('bridge_repaired', { wood: 1 }), { name: 'bridge_fixed', once: true });
});

test('슬롯은 고정 그룹표로 묶고 모르는 슬롯은 other', () => {
  const cases = { house1: 'house', house3: 'house', bridge: 'house', farm2: 'house', farm3: 'house', pond2: 'house', pond3: 'house', branch_a: 'house', cafe_order: 'cafe',
    farm_rush: 'rush', craft_rush: 'rush', orchard_x: 'rush', forge_y: 'rush', sell_bonus: 'sell', daily_double: 'daily', pond_feed_more: 'pond', table_bite_more: 'pond', cook_ingredient: 'cafe',
    affinity_heart: 'limit', concert_play: 'limit', weekly_ticket: 'limit', quest_reroll: 'reroll', drop_reroll_a: 'reroll',
    restaurant_double: 'double', bait_box: 'double', nope: 'other', undefined: 'other' };
  for (const [slot, g] of Object.entries(cases)) assert.equal(rvGroup(slot === 'undefined' ? undefined : slot), g, slot);
  assert.equal(RV_GROUPS.length, 10);
  for (const g of RV_GROUPS) assert.ok(`rv_${g}`.length <= 30 && /^[a-z_]+$/.test(`rv_${g}`));
});

test('누적 3번째·10번째 완료에서 한 번짜리 이벤트를 낸다', () => {
  assert.deepEqual(tallyEvents(1), []);
  assert.deepEqual(tallyEvents(2), []);
  assert.deepEqual(tallyEvents(3), [{ name: 'rv_complete_3', once: true }]);
  assert.deepEqual(tallyEvents(9).map((e) => e.name), ['rv_complete_3']);
  assert.deepEqual(tallyEvents(10).map((e) => e.name), ['rv_complete_3', 'rv_complete_10']);
});

test('누적 카운터는 저장소에 남아 새로고침해도 이어진다', () => {
  const mem = {};
  const store = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } };
  assert.equal(bumpTally(store), 1);
  assert.equal(bumpTally(store), 2);
  assert.equal(bumpTally(store), 3);
  const reloaded = { getItem: store.getItem, setItem: store.setItem };
  assert.equal(bumpTally(reloaded), 4);
});

test('저장소가 막혀도 던지지 않는다', () => {
  const broken = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
  assert.equal(bumpTally(broken), 1);
});
