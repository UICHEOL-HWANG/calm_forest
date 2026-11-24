import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GOALS, ARRIVE, VILLAGE_KEYS, minerMeetGoal } from '../js/guide/guide-rules.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('광부가 안 열렸거나 이미 만났으면 첫 만남 안내는 없다', () => {
  assert.equal(minerMeetGoal({ started: false }, false, false, {}), null);
  assert.equal(minerMeetGoal({ started: true }, true, true, {}), null);
});

test('광산 안에서는 광부를 비추는 시네마틱', () => {
  assert.deepEqual(minerMeetGoal({ started: false }, true, true, {}), { key: 'minerMeet', cine: true });
});

test('마을에서는 광산 입구, 세계수 광산 장면을 봤으면 시네마틱 없이 화살표만', () => {
  assert.deepEqual(minerMeetGoal({ started: false }, true, false, {}), { key: 'mineGate', cine: true });
  assert.deepEqual(minerMeetGoal({ started: false }, true, false, { treeShot_mine_habitat: true }), { key: 'mineGate', cine: false });
});

test('문구와 도착 거리', () => {
  assert.equal(GOALS.mineGate.title, '⛏️ 광부 아저씨가 돌아왔어요');
  assert.equal(GOALS.minerMeet.title, '⛏️ 광부 아저씨에게 말을 걸어 봐요');
  assert.ok(VILLAGE_KEYS.has('mineGate'));
  assert.ok(ARRIVE.mineGate > 0 && ARRIVE.minerMeet > 0);
});

test('길 안내가 첫 만남 목표를 쓰고 대상 자리를 안다', () => {
  const g = read('js/guide/goal-guide.js');
  assert.match(g, /minerMeetGoal\(gs\.delve, deps\.minerOpen\?\.\(\), deps\.atMine\(\), gs\.hintsSeen\)/);
  assert.match(g, /if \(key === 'mineGate'\) return inV \? \{ at: deps\.mineGate, g: GOALS\.mineGate, arrive: GATE_ARRIVE \} : null;/);
  assert.match(g, /if \(key === 'minerMeet'\) return \{ at: spots\.miner, g: GOALS\.minerMeet \};/);
  assert.match(read('js/game.js'), /minerOpen: \(\) => isOpen\('miner'\)/);
});
