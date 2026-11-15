import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createArbiter } from '../js/guide/arbiter.js';
import { quiets, markGuided, sameGoal, goalFocus, focusKey } from '../js/guide/quiet.js';
import { portFocus } from '../js/port/quest-guide.js';
import { snapshot, progressed } from '../js/hud/quest-chips-model.js';

const flag = (v = null) => { let on = v; const f = () => on; f.set = (x) => { on = x; }; return f; };

test('focus is null while no guide has a target', () => {
  const a = createArbiter();
  a.register({ name: 'port', active: () => true });
  a.register({ name: 'weekly', active: () => false, target: () => null });
  assert.equal(a.focus(), null);
});

test('focus returns the target of the highest ranked guide that has one', () => {
  const a = createArbiter();
  const port = flag(), aff = flag();
  a.register({ name: 'affinity', active: () => true, target: aff });
  a.register({ name: 'port', active: () => true, target: port });
  aff.set({ npc: 'owl' });
  assert.deepEqual(a.focus(), { npc: 'owl' });
  port.set({ quest: 'port_quest', npc: 'port:fisher' });
  assert.deepEqual(a.focus(), { quest: 'port_quest', npc: 'port:fisher' });
});

test('focus follows a dynamic priority', () => {
  const a = createArbiter();
  let p = 40;
  a.register({ name: 'affinity', active: () => true, priority: () => p, target: () => ({ npc: 'owl' }) });
  a.register({ name: 'goal', active: () => true, target: () => ({ text: '집 짓기' }) });
  assert.deepEqual(a.focus(), { text: '집 짓기' });
  p = 85;
  assert.deepEqual(a.focus(), { npc: 'owl' });
});

test('only the matching quest card, npc glyph and banner step back', () => {
  const f = { quest: 'port_quest', npc: 'port:fisher', banner: 'weekly' };
  assert.equal(quiets(f, 'quest', 'port_quest'), true);
  assert.equal(quiets(f, 'quest', 'cos_onboard'), false);
  assert.equal(quiets(f, 'npc', 'port:fisher'), true);
  assert.equal(quiets(f, 'npc', 'port:yatai'), false);
  assert.equal(quiets(f, 'banner', 'weekly'), true);
  assert.equal(quiets(f, 'banner', 'concert'), false);
  assert.equal(quiets(null, 'npc', 'port:fisher'), false);
  assert.equal(quiets({}, 'npc', undefined), false);
});

test('markGuided flags only the guided card and keeps the list immutable', () => {
  const list = Object.freeze([Object.freeze({ id: 'port_quest', title: 'a' }), Object.freeze({ id: 'owl', title: 'b' })]);
  const out = markGuided(list, { quest: 'port_quest' });
  assert.deepEqual(out, [{ id: 'port_quest', title: 'a', guided: true }, { id: 'owl', title: 'b' }]);
  assert.equal(out[1], list[1]);
  assert.equal(markGuided(list, null), list);
});

test('sameGoal ignores emoji and spacing and accepts a shorter wording of the same goal', () => {
  assert.equal(sameGoal('🧑‍🦳 할아버지 만나기', '할아버지 만나기'), true);
  assert.equal(sameGoal('🏠 집 짓기', '내 집 짓기'), true);
  assert.equal(sameGoal('🪓 나무 베기', '물의 가지 빈터 꾸미기'), false);
  assert.equal(sameGoal('', '내 집 짓기'), false);
  assert.equal(sameGoal('🏠', '내 집 짓기'), false);
});

test('goalFocus links goal keys to their quest card or npc and story flows to the chip', () => {
  assert.deepEqual(goalFocus({ key: 'cosShop', flow: 'tut' }, '🎀 새 옷 고르기'), { quest: 'cos_onboard', text: '🎀 새 옷 고르기' });
  assert.deepEqual(goalFocus({ key: 'museum', flow: 'tut' }, '🧑‍🦳 할아버지 만나기'), { npc: 'curator', text: '🧑‍🦳 할아버지 만나기' });
  assert.deepEqual(goalFocus({ key: 'story_worldTree', flow: 'story' }, '🌳 세계수 살펴보기'), { story: true, text: '🌳 세계수 살펴보기' });
  assert.deepEqual(goalFocus({ key: 'tree', flow: 'tut' }, '🪓 나무 베기'), { text: '🪓 나무 베기' });
  assert.equal(goalFocus(null, 'x'), null);
});

test('portFocus points the fisher steps and the quest guide at their card and resident', () => {
  assert.equal(portFocus('npc', null), null);
  assert.deepEqual(portFocus('collect', null), { quest: 'port_quest', npc: 'port:fisher' });
  assert.deepEqual(portFocus('turnin', null), { quest: 'port_quest', npc: 'port:fisher' });
  assert.equal(portFocus('sail', null), null);
  assert.equal(portFocus('island', { id: 'yatai', mode: 'run' }), null);
  assert.deepEqual(portFocus(null, { id: 'yatai', mode: 'run' }), { quest: 'port_quest', npc: 'port:yatai' });
  assert.deepEqual(portFocus(null, { id: 'yatai', mode: 'ask' }), { npc: 'port:yatai' });
  assert.equal(portFocus(null, null), null);
});

test('focusKey changes only when the target changes', () => {
  assert.equal(focusKey(null), '');
  assert.equal(focusKey({ npc: 'a' }), focusKey({ npc: 'a' }));
  assert.notEqual(focusKey({ npc: 'a' }), focusKey({ npc: 'b' }));
});

test('a guided card no longer makes the quest button glow', () => {
  const q = (id, p, guided) => ({ id, title: id, progress: p, target: 3, ...(guided ? { guided } : {}) });
  const before = snapshot([q('port_quest', 1, true), q('owl', 0)], null);
  assert.deepEqual(progressed(before, snapshot([q('port_quest', 2, true), q('owl', 0)], null)), []);
  assert.deepEqual(progressed(before, snapshot([q('port_quest', 2), q('owl', 0)], null)), []);
  assert.deepEqual(progressed(before, snapshot([q('port_quest', 2, true), q('owl', 1)], null)), ['q']);
});
