import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tenjinEventFor, onceSeed } from '../js/tenjin-events.js';

test('업데이트 전부터 하던 사람은 첫 경험 이벤트를 이미 보낸 것으로 친다', () => {
  assert.deepEqual(onceSeed(false), []);
  assert.deepEqual(onceSeed(true).sort(), ['first_chop', 'first_harvest', 'first_share', 'house_complete', 'push_granted', 'tutorial_complete']);
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
  assert.deepEqual(tenjinEventFor('prepass_ad_result', { result: 'complete', sec: 31.6 }), { name: 'rewarded_ad_complete', value: 32 });
  assert.deepEqual(tenjinEventFor('prepass_ad_result', { result: 'complete' }), { name: 'rewarded_ad_complete' });
  assert.equal(tenjinEventFor('prepass_ad_result', { result: 'skip', sec: 4 }), null);
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
