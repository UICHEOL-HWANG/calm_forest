import { test } from 'node:test';
import assert from 'node:assert/strict';
import { heartAdOpen, heartAdGain, giftGain, GIFT_DAILY_CAP } from '../js/affinity/stages.js';
import { extraPlay, paidLeft, concertDefault } from '../js/concert/rules.js';
import { PAID_PLAYS } from '../js/data/concert.js';
import { adTicketOpen, adTicket, weeklyDefault } from '../js/weekly/rules.js';
import { TICKET_CAP } from '../js/data/weekly.js';
import { growOneTree } from '../js/orchard.js';
import { forgeComplete } from '../js/workbench/rules.js';
import { rerollPick } from '../js/quests.js';
import { DAILY_POOL } from '../js/data/npcs.js';
import { extraRoll, extraRollOpen, rollDrop } from '../js/decor-drops/rules.js';
import { DROP_SOURCES } from '../js/data/decor-sets.js';

const D = '2026-11-15';

test('하트 광고는 오늘 선물 하트를 다 쓴 주민에게만, 하루 한 칸 더', () => {
  const full = { d: D, by: { farmer: GIFT_DAILY_CAP } };
  assert.equal(heartAdOpen(null, D, 'farmer'), false);
  assert.equal(heartAdOpen({ d: D, by: { farmer: 1 } }, D, 'farmer'), false);
  assert.equal(heartAdOpen(full, D, 'farmer'), true);
  assert.equal(heartAdOpen({ d: '2026-11-14', by: { farmer: 2 } }, D, 'farmer'), false);
  const r = heartAdGain(full, D, 'farmer');
  assert.equal(r.gain, 1);
  assert.equal(r.state.by.farmer, GIFT_DAILY_CAP + 1);
  assert.equal(full.by.farmer, GIFT_DAILY_CAP);
  assert.equal(heartAdOpen(r.state, D, 'farmer'), false);
  assert.equal(giftGain(r.state, D, 'farmer', 2).gain, 0);
  assert.equal(heartAdGain({ d: D, by: { farmer: 1 } }, D, 'farmer').gain, 0);
});

test('음악회 한 번 더는 오늘 공연을 다 썼을 때만 한 판을 돌려준다', () => {
  const used = { ...concertDefault(), day: D, paid: PAID_PLAYS };
  const r = extraPlay(used, D);
  assert.equal(paidLeft(r, D), 1);
  assert.equal(used.paid, PAID_PLAYS);
  const fresh = { ...concertDefault(), day: D, paid: 1 };
  assert.equal(extraPlay(fresh, D), fresh);
  const yesterday = { ...concertDefault(), day: '2026-11-14', paid: PAID_PLAYS };
  assert.equal(extraPlay(yesterday, D), yesterday);
});

test('주간 티켓 +1은 상한을 넘지 않는다', () => {
  const s = { ...weeklyDefault(), tickets: 4 };
  assert.equal(adTicketOpen(s), true);
  assert.equal(adTicket(s).tickets, 5);
  assert.equal(s.tickets, 4);
  const full = { ...weeklyDefault(), tickets: TICKET_CAP };
  assert.equal(adTicketOpen(full), false);
  assert.equal(adTicket(full).tickets, TICKET_CAP);
});

test('과수원 하루 당기기는 다 자라기 가장 가까운 나무 한 그루만 하루 키운다', () => {
  const trees = [
    { kind: 'apple', stage: 'mature', age: 3, fruit: 2 },
    { kind: 'pear', stage: 'growing', age: 1 },
    { kind: 'apple', stage: 'growing', age: 2 },
    { kind: 'peach', stage: 'sapling', age: 0 },
  ];
  const r = growOneTree(trees, []);
  assert.equal(r.index, 2);
  assert.equal(r.trees[2].stage, 'mature');
  assert.deepEqual(r.matured, [{ kind: 'apple', grew_days: 3 }]);
  assert.equal(r.trees[1].age, 1);
  assert.equal(r.trees[0].fruit, 2);
  assert.equal(trees[2].stage, 'growing');
  assert.equal(growOneTree([{ kind: 'apple', stage: 'mature', age: 3 }], []), null);
});

test('작업대 바로 완성은 망치질을 마친 강화만 그날 끝낸다', () => {
  const state = { toolStars: { rod: 0 }, forge: { tool: 'rod', star: 1, day: D, coins: 120, score: 7 } };
  assert.equal(forgeComplete(state, D, false), null);
  assert.deepEqual(forgeComplete(state, D, true).done, { tool: 'rod', star: 1 });
  assert.equal(forgeComplete({ forge: { ...state.forge, score: null } }, D, true), null);
});

test('의뢰 바꾸기는 오늘 목록에 없는 종류로만 바꾼다', () => {
  const quests = DAILY_POOL.slice(0, 5);
  const ctx = { houseStage: 3, coopBuilt: true, neighbors: 3 };
  for (let seed = 1; seed < 40; seed++) {
    const q = rerollPick(DAILY_POOL, quests, seed, ctx);
    assert.ok(q);
    assert.ok(!quests.some(x => x.type === q.type), q.type);
  }
  assert.equal(rerollPick(quests, quests, 1, ctx), null);
});

test('꾸미기 한 번 더 뽑기는 확정 보장 카운터를 건드리지 않는다', () => {
  const def = DROP_SOURCES.mine;
  const missed = rollDrop(null, [], 'mine', 0.99).drops;
  assert.equal(missed.tries.mine, 1);
  assert.equal(extraRollOpen(missed, [], 'mine'), true);
  assert.equal(extraRollOpen(null, [], 'mine'), false);
  assert.equal(extraRollOpen(missed, [def.item], 'mine'), false);
  const miss = extraRoll(missed, [], 'mine', 0.99);
  assert.equal(miss.hit, false);
  assert.equal(miss.drops.tries.mine, 1);
  const hit = extraRoll(missed, [], 'mine', 0);
  assert.equal(hit.hit, true);
  assert.equal(hit.item, def.item);
  assert.equal(hit.drops.tries.mine, 1);
  assert.equal(extraRoll(missed, [def.item], 'mine', 0).hit, false);
});

test('a rerolled daily request is marked so the late AI upgrade leaves it alone', async () => {
  const { readFileSync } = await import('node:fs');
  const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  const reroll = game.slice(game.indexOf('function rerollDailyQuest('), game.indexOf('export function questRerollAd('));
  assert.match(reroll, /st\.progress = 0; st\.readyToasted = false; st\.qsrc = 'reroll';/);
  const ai = game.slice(game.indexOf('async function upgradeDailyQuestsAI('), game.indexOf('function rollLuckyBox('));
  assert.match(ai, /if \(st\.qsrc\) return;/);
  assert.match(ai, /if \(st\.qsrc \|\| st\.given \|\| st\.idx > 0 \|\| st\.progress > 0\) return;[^\n]*\n\s+st\.quests = built;/);
});
