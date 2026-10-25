import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPest, stepPest, tapPest, baitPest, pickableBeforeBat, canPick, RING_SEC, BAIT_EAT_SEC } from '../js/delve/pests.js';

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

test('숨은 도롱뇽도 톡 치면 놀라 달아난다(뱉을 게 없으면 이벤트 없음)', () => {
  const hit = tapPest(createPest('axolotl', { x: 0, z: 0 }, { x: 5, z: 5 }), { x: 1, z: 0 });
  assert.equal(hit.pest.state, 'flee');
  assert.equal(hit.events.length, 0);
});

test('수정집게에게 미끼를 던지면 6초 먹고 조각을 안 노린다', () => {
  assert.equal(baitPest(createPest('bat', { x: 0, z: 0 }, { x: 5, z: 5 }), { x: 1, z: 0 }), null);
  const p = baitPest(createPest('crab', { x: 0, z: 0 }, { x: 5, z: 5 }), { x: 1, z: 0 });
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
