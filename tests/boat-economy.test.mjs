import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unlockCheck, unlockBoat, addRunMats, needValue } from '../js/boat/economy.js';
import { boatDefaults } from '../js/boat/save.js';

const st = (o = {}) => ({ ...boatDefaults(), ...o });

test('연잎배: 별·연꽃·완주 3번이 모두 차야 해금', () => {
  const s = st({ clears: 2, mat: { lotus: 10, driftwood: 0, shell: 0, moon_fish: 0 } });
  const c = unlockCheck('lotus', s, { star: 600, coins: 0 });
  assert.equal(c.ok, false);
  assert.deepEqual(c.lacks, [{ key: 'need:clears', have: 2, need: 3 }]);
  assert.equal(unlockCheck('lotus', { ...s, clears: 3 }, { star: 600, coins: 0 }).ok, true);
});

test('부족한 항목을 전부 나열한다', () => {
  const c = unlockCheck('raft', st(), { star: 100, coins: 50 });
  assert.deepEqual(c.lacks.map(l => l.key), ['star', 'coins', 'mat:driftwood']);
});

test('해금하면 별·코인·재료를 빼고 own 에 넣는다(입력 불변)', () => {
  const s = st({ mat: { lotus: 0, driftwood: 30, shell: 0, moon_fish: 0 } });
  const inv = { star: 1500, coins: 3500, wood: 9 };
  const r = unlockBoat('raft', s, inv);
  assert.equal(r.ok, true);
  assert.equal(r.inv.star, 300); assert.equal(r.inv.coins, 500); assert.equal(r.inv.wood, 9);
  assert.equal(r.st.mat.driftwood, 5); assert.equal(r.st.own.raft, 1);
  assert.equal(r.spentCoins, 3000);
  assert.equal(inv.star, 1500); assert.equal(s.mat.driftwood, 30); assert.equal(s.own.raft, undefined);
});

test('이미 가진 배·2차 배는 해금 불가', () => {
  assert.equal(unlockCheck('ferry', st(), { star: 99999, coins: 99999 }).ok, false);
  const rich = { star: 99999, coins: 99999 };
  const full = st({ mat: { lotus: 99, driftwood: 99, shell: 99, moon_fish: 99 } });
  const c = unlockCheck('catamaran', full, rich);
  assert.equal(c.live, false); assert.equal(c.ok, false);
  assert.equal(unlockBoat('catamaran', full, rich).ok, false);
});

test('비단잉어는 급류 무피해 완주가 있어야', () => {
  const s = st({ mat: { lotus: 0, driftwood: 0, shell: 20, moon_fish: 0 } });
  assert.equal(unlockCheck('koi', s, { star: 1500, coins: 0 }).ok, false);
  assert.equal(unlockCheck('koi', { ...s, stat: { ...s.stat, rapidPerfect: 1 } }, { star: 1500, coins: 0 }).ok, true);
});

test('재료 적립: 급류 1.5배 반올림, 모르는 재료는 무시', () => {
  const s = st();
  assert.deepEqual(addRunMats(s, { lotus: 2, shell: 1 }, 1).mat, { lotus: 2, driftwood: 0, shell: 1, moon_fish: 0 });
  assert.deepEqual(addRunMats(s, { lotus: 1, shell: 3, rock: 5 }, 1.5).mat, { lotus: 2, driftwood: 0, shell: 5, moon_fish: 0 });
  assert.equal(s.mat.lotus, 0);
});

test('needValue', () => {
  const s = st({ clears: 4, stat: { ...boatDefaults().stat, raftClears: 2 } });
  assert.equal(needValue('clears', s), 4);
  assert.equal(needValue('raftClears', s), 2);
});
