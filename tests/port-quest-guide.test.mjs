import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUESTS } from '../js/port/data.js';
import { pickQuestGuide, questSteps, askSteps } from '../js/port/quest-guide.js';

const st = over => Object.fromEntries(QUESTS.map(q => [q.id, { state: 'avail', got: 0, ...(over[q.id] || {}) }]));
const pos = Object.fromEntries(QUESTS.map(q => [q.id, { x: q.pos[0], z: q.pos[1] }]));

test('an active open quest is guided before any new ask', () => {
  const g = pickQuestGuide(st({ yatai: { state: 'active', got: 1 } }), false, { x: 31.2, z: 11.6 }, pos);
  assert.deepEqual(g, { id: 'yatai', mode: 'run' });
});

test('with nothing active the nearest open resident with ❗ is suggested', () => {
  assert.deepEqual(pickQuestGuide(st({}), false, { x: 34, z: -3 }, pos), { id: 'yatai', mode: 'ask' });
});

test('the night-only lighthouse quest is never suggested in the day', () => {
  const day = st({ fisher: { state: 'done' }, yatai: { state: 'done' }, farm: { state: 'done' } });
  assert.equal(pickQuestGuide(day, false, { x: 57, z: -5 }, pos), null);
  assert.deepEqual(pickQuestGuide(day, true, { x: 57, z: -5 }, pos), { id: 'light', mode: 'ask' });
});

test('nothing is guided once every quest is done', () => {
  const all = st(Object.fromEntries(QUESTS.map(q => [q.id, { state: 'done' }])));
  assert.equal(pickQuestGuide(all, true, { x: 40, z: 0 }, pos), null);
});

test('every quest has a pickup hint and its steps go collect then turn in', () => {
  for (const q of QUESTS) {
    assert.ok(q.hint && !/—|놀/.test(q.hint), q.id);
    const [collect, turnin] = questSteps(q);
    assert.equal(collect.id, 'collect');
    assert.equal(turnin.id, 'turnin');
    assert.equal(collect.text({ got: 1 }), `${q.hint} (1/${q.need})`);
    assert.ok(collect.done({ state: 'active', got: q.need }));
    assert.ok(!collect.done({ state: 'active', got: q.need - 1 }));
    assert.ok(!turnin.done({ state: 'active', got: q.need }));
    assert.ok(turnin.done({ state: 'done', got: q.need }));
    assert.ok(collect.expect.includes('port_pick'));
    assert.ok(turnin.expect.includes('port_talk'));
  }
});

test('the ask step ends as soon as the quest is accepted', () => {
  const [ask] = askSteps(QUESTS[1]);
  assert.match(ask.text, /❗/);
  assert.ok(!ask.done({ state: 'avail' }));
  assert.ok(ask.done({ state: 'active' }));
});

test('an ask suggestion sticks while walking past other residents', () => {
  const s = st({});
  const first = pickQuestGuide(s, false, { x: 34, z: -3 }, pos);
  assert.deepEqual(pickQuestGuide(s, false, { x: 31, z: 11 }, pos, first), first);
  assert.deepEqual(pickQuestGuide(st({ fisher: { state: 'active' } }), false, { x: 31, z: 11 }, pos, first), { id: 'fisher', mode: 'run' });
});
