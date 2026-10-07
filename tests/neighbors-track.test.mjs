import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evOpen, evVisitStart, evReact, evVisitEnd, evNotice, evToggle, evFail } from '../js/neighbors/track.js';
import { RESERVED_TRAFFIC_KEYS } from '../js/ga-params.js';

const ID = '0f8fad5b-d9cb-469f-a165-70867728950e';

test('7종 이벤트 이름·파라미터(스펙 §7)', () => {
  assert.deepEqual(evOpen({ list: [1, 2], rewardedToday: 1 }, 'sign'), ['neighbors_open', { shown: 2, rewarded_today: 1, via: 'sign' }]);
  assert.deepEqual(evVisitStart({ publicId: ID, slot: 2, revisit: true, loadMs: 412.6 }), ['neighbor_visit_start', { host: ID, slot: 2, revisit: 1, load_ms: 413 }]);
  assert.deepEqual(evReact(ID, 'heart', { reward: true, reason: 'ok' }), ['neighbor_react', { host: ID, emoji: 'heart', rewarded: 1, reason: 'ok' }]);
  assert.deepEqual(evReact(ID, 'star', { reward: false, reason: 'login' }), ['neighbor_react', { host: ID, emoji: 'star', rewarded: 0, reason: 'login' }]);
  assert.deepEqual(evVisitEnd(ID, 41.4, false), ['neighbor_visit_end', { host: ID, sec: 41, reacted: 0 }]);
  assert.deepEqual(evVisitEnd(ID, -3, true), ['neighbor_visit_end', { host: ID, sec: 0, reacted: 1 }]);
  assert.deepEqual(evNotice(3, 12), ['neighbor_visitors_notice', { n: 3, total: 12 }]);
  assert.deepEqual(evToggle(false), ['village_public_toggle', { on: 0 }]);
  assert.deepEqual(evFail('showcase', 404), ['neighbor_load_fail', { stage: 'showcase', code: '404' }]);
  assert.deepEqual(evFail('today', undefined), ['neighbor_load_fail', { stage: 'today', code: 'unknown' }]);
});

test('GA4 예약어(source·medium·campaign…)를 쓰지 않는다', () => {
  const all = [evOpen({ list: [], rewardedToday: 0 }, 'sign'), evVisitStart({ publicId: ID, slot: 0, revisit: false, loadMs: 1 }),
    evReact(ID, 'wave', { reward: false, reason: 'ok' }), evVisitEnd(ID, 1, true), evNotice(1, 1), evToggle(true), evFail('react', 'x')];
  for (const [, p] of all) for (const k of Object.keys(p)) assert.ok(!(k in RESERVED_TRAFFIC_KEYS), k);
});
