// 🔭 별 잇기 정산 — 하루 1회 보상·세이브 상태 (js/observatory/star-run.js) 동작 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as rhythm from '../js/observatory/rhythm.js';
import { gameSource } from './helpers/game-source.mjs';

function run(day = '2026-10-04', starDay = null) {
  const paid = [], saves = [];
  const ctx = {
    gameState: { starDay },
    today: day,
    giveReward: (r, source, item) => paid.push([r, source, item]),
    requestSave: () => saves.push(1),
  };
  const c = vm.createContext({ ...rhythm, ...ctx, todayStr: () => c.today });
  vm.runInContext(readFileSync(new URL('../js/observatory/star-run.js', import.meta.url), 'utf8')
    .replace(/^import [\s\S]*?;\n/gm, '').replace(/^export /gm, ''), c);
  return { c, paid, saves };
}
const S = judges => rhythm.summarize(judges);
const ALL_PERFECT = Array(7).fill('perfect');
const FAILED = ['miss', 'miss', 'miss', 'miss', 'good', 'good', 'good'];

test('first success of the day pays 10 + 2×perfect, marks the day and saves', () => {
  const { c, paid, saves } = run();
  const r = c.starSettle(S(ALL_PERFECT));
  assert.deepEqual({ ...r }, { coins: 24, alreadyToday: false });
  assert.deepEqual(JSON.parse(JSON.stringify(paid)), [[{ coins: 24 }, 'star_rhythm', 'big_dipper']]);
  assert.equal(c.gameState.starDay, '2026-10-04');
  assert.equal(saves.length, 1);
});

test('same-day replay is practice — nothing paid', () => {
  const { c, paid } = run('2026-10-04', '2026-10-04');
  const r = c.starSettle(S(ALL_PERFECT));
  assert.equal(r.coins, 0);
  assert.equal(r.alreadyToday, true);
  assert.equal(paid.length, 0);
});

test('a failed run does not use up the day', () => {
  const { c, paid } = run();
  assert.equal(c.starSettle(S(FAILED)).coins, 0);
  assert.equal(c.gameState.starDay, null);
  assert.equal(c.starSettle(S(['good', 'good', 'good', 'good', 'good', 'good', 'perfect'])).coins, 12);
  assert.equal(paid.length, 1);
});

test('a new day pays again', () => {
  const { c } = run('2026-10-05', '2026-10-04');
  assert.equal(c.starSettle(S(ALL_PERFECT)).coins, 24);
  assert.equal(c.gameState.starDay, '2026-10-05');
});

test('starDay has a default and survives a save/load round trip', () => {
  const src = gameSource();
  assert.match(src, /starDay: null,/, 'gameState default');
  const restore = /if \(typeof saved\.starDay === 'string'\) gameState\.starDay = saved\.starDay;/;
  assert.match(src, restore, 'restore from save');
  // getGameState spreads gameState, so the field rides along in every save
  assert.match(src, /return \{ \.\.\.gameState,/);
});
