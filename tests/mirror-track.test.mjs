import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { bindTracker, T, EVENTS } from '../js/mirror/track.js';

const sent = [];
bindTracker((name, params) => sent.push([name, params]), { strict: true });

test('11종 이름·파라미터가 스펙 §8 그대로(Task 15 정리: 기존 키 재사용 · 2026-10-09 돌려주기 mirror_deliver 추가)', () => {
  assert.deepEqual(Object.keys(EVENTS).sort(), ['decor_buy_mirror', 'mirror_board', 'mirror_clue', 'mirror_cutscene_end', 'mirror_deliver', 'mirror_enter', 'mirror_found', 'mirror_hint', 'mirror_leave', 'mirror_onboard', 'mirror_stop_shown']);
  assert.deepEqual(EVENTS.mirror_deliver, ['quest_n', 'npc', 'item', 'hinted', 'elapsed_s']);   // 새 키 없이 기존 키만(GA4 키 과다 방지)
  assert.deepEqual(EVENTS.mirror_found, ['quest_n', 'item', 'spot_id', 'flipped', 'hinted', 'elapsed_s']);
  assert.deepEqual(EVENTS.mirror_clue, ['quest_n', 'npc', 'spot_id', 'flipped']);
  assert.deepEqual(EVENTS.mirror_hint, ['quest_n', 'spot_id', 'elapsed_s']);
  for (const e of ['mirror_board', 'mirror_enter', 'mirror_leave']) assert.ok(EVENTS[e].includes('left_today'), e);
  const keys = new Set(Object.values(EVENTS).flat());
  for (const k of ['npc_id', 'item_id', 'wait_s', 'search_s', 'done_today', 'reward']) assert.ok(!keys.has(k), `옛 키 ${k}`);
});

test('불린은 0/1 · 키 순서 무관', () => {
  sent.length = 0;
  T.found({ hinted: false, quest_n: 2, item: 'yarn', spot_id: 'clock-r', flipped: true, elapsed_s: 12.3 });
  assert.deepEqual(sent[0], ['mirror_found', { quest_n: 2, item: 'yarn', spot_id: 'clock-r', flipped: 1, hinted: 0, elapsed_s: 12.3 }]);
});

test('strict — 빠진 키·모르는 키·열거값 밖은 throw', () => {
  assert.throws(() => T.clue({ quest_n: 1, npc: 'farmer', spot_id: 'well-l' }), /flipped/);
  assert.throws(() => T.onboard({ step: 'stop', source: 'x' }), /source/);
  assert.throws(() => T.onboard({ step: 'oops' }), /step/);
});

test('strict — undefined·NaN 값은 throw 하고 아무것도 보내지 않는다', () => {
  const base = { quest_n: 1, item: 'ring', spot_id: 'well-l', flipped: false, hinted: false, elapsed_s: 3 };
  const n = sent.length;
  assert.throws(() => T.found({ ...base, elapsed_s: undefined }), /elapsed_s/);
  assert.throws(() => T.found({ ...base, elapsed_s: NaN }), /elapsed_s/);
  assert.throws(() => T.found(undefined), /missing/);
  assert.equal(sent.length, n);
});

test('예약 파라미터 이름 금지 · 호출부는 trackEvent 를 직접 부르지 않는다', { skip: !existsSync(new URL('../js/spaces/mirror.js', import.meta.url)) && 'Task 10 전' }, () => {
  for (const keys of Object.values(EVENTS)) for (const k of keys) assert.doesNotMatch(k, /^(source|medium|campaign|campaign_id|term|content)$/);
  const src = readFileSync(new URL('../js/spaces/mirror.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /trackEvent\('/);
  for (const fn of ['stopShown', 'board', 'cutsceneEnd', 'enter', 'clue', 'hint', 'found', 'deliver', 'leave', 'onboard']) assert.match(src, new RegExp(`T\\.${fn}\\(`), fn);
  for (const step of ['stop', 'arrive', 'flip', 'return']) assert.match(src, new RegExp(`T\\.onboard\\(\\{ step: '${step}' \\}\\)`), step);
});
