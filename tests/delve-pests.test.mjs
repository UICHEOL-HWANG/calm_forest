import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPest, stepPest, tapPest, baitPest, pickableBeforeBat, canPick, catchAtBreak, counterFor, grabChunk, floorTally, RING_SEC, BAIT_EAT_SEC } from '../js/delve/pests.js';
import { PEST_LURK_DIST, PEST_CATCH_R } from '../js/data/delve.js';

const W = (chunks, extra = {}) => ({ chunks, burrowAt: { x: 5, z: 5 }, ...extra });
const run = (p, w, sec, dt = 0.1) => {
  const ev = [];
  for (let t = 0; t < sec; t += dt) {
    const r = stepPest(p, dt, w);
    p = r.pest; ev.push(...r.events);
    for (const e of r.events) if (e.type === 'grab') w.chunks = w.chunks.filter(c => c.id !== e.chunkId);
  }
  return { p, ev };
};

test('조각이 없으면 가만히 있다', () => {
  const { p, ev } = run(createPest('crab', { x: 0, z: 0 }, { x: 5, z: 5 }), W([]), 3);
  assert.equal(p.state, 'idle');
  assert.equal(ev.length, 0);
});

test('수정집게는 조각에 다가가 물고 굴로 가져간다', () => {
  const { ev } = run(createPest('crab', { x: 0, z: 0 }, { x: 5, z: 5 }), W([{ id: 'a', x: 2, z: 0, age: 0 }]), 20);
  assert.deepEqual(ev.map(e => e.type), ['grab', 'stash']);
});

test('박쥐는 노란 원(3초)이 끝나기 전엔 조각을 노리지 않는다', () => {
  const w = W([{ id: 'a', x: 1, z: 0, age: 0 }]);
  let p = createPest('bat', { x: 0, z: 0 }, { x: 5, z: 5 });
  for (let t = 0; t < RING_SEC - 0.2; t += 0.1) { w.chunks[0].age += 0.1; const r = stepPest(p, 0.1, w); p = r.pest; assert.equal(r.events.length, 0); }
  assert.equal(pickableBeforeBat({ age: RING_SEC - 0.1 }), true);
  assert.equal(pickableBeforeBat({ age: RING_SEC }), false);
});

test('도롱뇽은 숨어 있다 조각이 생기면 문다. 물고 갈 때 톡 치면 뱉는다', () => {
  let p = createPest('axolotl', { x: 0, z: 0 }, { x: 5, z: 5 });
  assert.equal(p.state, 'hide');
  const w = W([{ id: 'a', x: 1, z: 0, age: 0 }]);
  let grabbed = false;
  for (let t = 0; t < 5 && !grabbed; t += 0.1) { const r = stepPest(p, 0.1, w); p = r.pest; grabbed = r.events.some(e => e.type === 'grab'); }
  assert.ok(grabbed);
  assert.equal(p.state, 'carry');
  assert.equal(tapPest(p, { x: p.x + 5, z: p.z }), null);
  const hit = tapPest(p, { x: p.x + 1, z: p.z });
  assert.equal(hit.events[0].type, 'spit');
  assert.equal(hit.events[0].chunkId, 'a');
  assert.equal(hit.pest.state, 'flee');
  assert.equal(hit.pest.carryId, null);
});

test('숨어 있거나 가만히 있는 도롱뇽은 톡 칠 수 없다(노릴 때만)', () => {
  assert.equal(tapPest(createPest('axolotl', { x: 0, z: 0 }, { x: 5, z: 5 }), { x: 1, z: 0 }), null);
  const lurking = { ...createPest('axolotl', { x: 0, z: 0 }, { x: 5, z: 5 }), state: 'lurk' };
  const hit = tapPest(lurking, { x: 1, z: 0 });
  assert.equal(hit.pest.state, 'flee');
  assert.equal(hit.events.length, 0);
});

test('노리는 수정집게에게 미끼를 던지면 6초 먹고 조각을 안 노린다', () => {
  assert.equal(baitPest(createPest('bat', { x: 0, z: 0 }, { x: 5, z: 5 }), { x: 1, z: 0 }), null);
  assert.equal(baitPest(createPest('crab', { x: 0, z: 0 }, { x: 5, z: 5 }), { x: 1, z: 0 }), null);
  const p = baitPest({ ...createPest('crab', { x: 0, z: 0 }, { x: 5, z: 5 }), state: 'lurk' }, { x: 1, z: 0 });
  assert.equal(p.state, 'eat');
  const { ev, p: after } = run(p, W([{ id: 'a', x: 0.3, z: 0, age: 0 }]), BAIT_EAT_SEC - 0.5);
  assert.equal(ev.filter(e => e.type === 'grab').length, 0);
  assert.equal(after.state, 'eat');
});

test('등불벌레가 굴에 넣으면 stash 이벤트(되찾기 대상)', () => {
  const { ev } = run(createPest('grub', { x: 0, z: 0 }, { x: 3, z: 0 }), W([{ id: 'a', x: 1, z: 0, age: 0 }], { burrowAt: { x: 3, z: 0 } }), 15);
  assert.ok(ev.some(e => e.type === 'stash' && e.chunkId === 'a'));
});

test('줍기 반경', () => {
  assert.equal(canPick({ x: 0, z: 0 }, { x: 0.5, z: 0 }), true);
  assert.equal(canPick({ x: 0, z: 0 }, { x: 1.2, z: 0 }), false);
});

const vein = { x: 4, z: 0 };

test('광맥을 치기 시작하면 근처 몹이 광맥 옆으로 와서 기다린다', () => {
  const { p, ev } = run(createPest('crab', { x: 0, z: 0 }, { x: -5, z: 0 }), W([], { lurkAt: vein }), 8);
  assert.equal(p.state, 'lurk');
  assert.ok(Math.abs(Math.hypot(p.x - vein.x, p.z - vein.z) - PEST_LURK_DIST) < 0.05);
  assert.ok(p.x < vein.x);
  assert.equal(ev.length, 0);
});

test('광맥에서 멀리 있는 몹은 기다리러 오지 않는다', () => {
  const { p } = run(createPest('crab', { x: -7, z: -7 }, { x: -7, z: -7 }), W([], { lurkAt: { x: 7, z: 7 } }), 3);
  assert.equal(p.state, 'idle');
});

test('캐기를 멈추면 기다리던 몹은 제자리 상태로 돌아간다', () => {
  const lurk = run(createPest('axolotl', { x: 0, z: 0 }, { x: -5, z: 0 }), W([], { lurkAt: vein }), 4).p;
  const { p } = run(lurk, W([]), 0.2);
  assert.equal(p.state, 'hide');
});

test('깨지는 순간 기다리던 몹 중 가장 가까운 하나가 받아 문다(박쥐·먹는 중 제외)', () => {
  const at = { x: 0, z: 0 };
  const mk = (kind, x, state) => ({ ...createPest(kind, { x, z: 0 }, { x: 9, z: 9 }), state });
  assert.equal(catchAtBreak([mk('crab', 0.9, 'lurk'), mk('axolotl', 0.6, 'lurk')], at), 1);
  assert.equal(catchAtBreak([mk('bat', 0.5, 'lurk')], at), -1);
  assert.equal(catchAtBreak([mk('crab', 0.5, 'eat')], at), -1);
  assert.equal(catchAtBreak([mk('crab', PEST_CATCH_R + 0.2, 'lurk')], at), -1);
  assert.equal(catchAtBreak([mk('grub', 0.7, 'lurk')], at), 0);
});

test('받아 문 몹은 물고 굴로 간다', () => {
  const p = grabChunk({ ...createPest('crab', { x: 0, z: 0 }, { x: 3, z: 0 }), state: 'lurk' }, 'c1');
  assert.equal(p.state, 'carry');
  assert.equal(p.carryId, 'c1');
  const { ev } = run(p, W([], { burrowAt: { x: 3, z: 0 } }), 6);
  assert.deepEqual(ev.map(e => e.type), ['stash']);
});

test('버튼은 할 이유가 있을 때만: 도롱뇽 톡(노림·물고 감), 수정집게 미끼(노림)', () => {
  const s = (kind, state) => counterFor({ ...createPest(kind, { x: 0, z: 0 }, { x: 1, z: 1 }), state });
  assert.equal(s('axolotl', 'hide'), null);
  assert.equal(s('axolotl', 'lurk'), 'tap');
  assert.equal(s('axolotl', 'approach'), 'tap');
  assert.equal(s('axolotl', 'carry'), 'tap');
  assert.equal(s('axolotl', 'flee'), null);
  assert.equal(s('crab', 'idle'), null);
  assert.equal(s('crab', 'lurk'), 'bait');
  assert.equal(s('crab', 'approach'), 'bait');
  assert.equal(s('crab', 'carry'), null);
  assert.equal(s('crab', 'eat'), null);
  assert.equal(s('bat', 'lurk'), null);
  assert.equal(s('grub', 'lurk'), null);
});

test('오늘 다 캔 층의 몹은 처음부터 잔다', () => {
  const p = createPest('crab', { x: 0, z: 0 }, { x: 5, z: 5 }, { asleep: true });
  assert.equal(p.state, 'sleep');
  const { p: after, ev } = run(p, W([{ id: 'a', x: 0.5, z: 0, age: 9 }], { lurkAt: vein }), 3);
  assert.equal(after.state, 'sleep');
  assert.equal(ev.length, 0);
});

test('광맥이 다 깨지고 바닥 조각도 없으면 굴로 돌아가 잔다', () => {
  const { p } = run(createPest('crab', { x: 0, z: 0 }, { x: 2, z: 0 }), W([], { rest: true }), 5);
  assert.equal(p.state, 'sleep');
  assert.ok(Math.hypot(p.x - 2, p.z) < 0.35);
});

test('층 결과: 지킴은 주운 수, 뺏김은 굴에 들어간 수 + 못 되찾은 수', () => {
  assert.deepEqual(floorTally({ kept: 2, lost: 1, pending: 1 }), { kept: 2, lost: 2, any: true });
  assert.deepEqual(floorTally({ kept: 0, lost: 0, pending: 0 }), { kept: 0, lost: 0, any: false });
});
