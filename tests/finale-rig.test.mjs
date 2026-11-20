import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FINALE_T, createFinaleRig, pointAt, rootPoints } from '../js/world/finale-rig.js';

const TREE = { x: 4, z: -35 }, GATE = { x: -4, z: 25 };
const home = (p, l) => { p.x = 0; p.y = 14; p.z = 16; l.x = 0; l.y = 1.2; l.z = 0; };
const from = { pos: { x: 0, y: 14, z: 16 }, look: { x: 0, y: 1.2, z: 0 } };
const make = (aspect = 1.6) => createFinaleRig({ from, pts: rootPoints(TREE, GATE), tree: TREE, aspect, home });

test('뿌리 점: 입구에서 시작해 세계수 앞에서 끝난다', () => {
  const pts = rootPoints(TREE, GATE);
  assert.equal(pts.length, 10);
  assert.ok(Math.abs(pts[0].x - GATE.x) < 0.01 && Math.abs(pts[0].z - GATE.z) < 0.01);
  assert.ok(Math.abs(pts[9].x - TREE.x) < 0.01 && Math.abs(pts[9].z - (TREE.z + 2.6)) < 0.01);
  assert.ok(pts.every(p => p.y > 0 && p.y < 0.2));
});

test('pointAt: 끝점 고정·범위 밖은 자른다', () => {
  const pts = rootPoints(TREE, GATE);
  assert.deepEqual(pointAt(pts, 0), pts[0]);
  assert.deepEqual(pointAt(pts, 1), pts[9]);
  assert.deepEqual(pointAt(pts, -1), pts[0]);
  assert.deepEqual(pointAt(pts, 2), pts[9]);
});

test('흐름: fly → root → bloom → card 에서 멈추고, 번짐·꽃은 줄지 않는다', () => {
  const r = make();
  const seen = [];
  let lastReveal = 0, lastBloom = 0, t = 0;
  while (r.phase !== 'card' && t < 20) {
    r.update(1 / 60); t += 1 / 60;
    if (seen.at(-1) !== r.phase) seen.push(r.phase);
    assert.ok(r.reveal >= lastReveal - 1e-9 && r.bloom >= lastBloom - 1e-9);
    if (r.phase === 'fly' || r.phase === 'root') assert.equal(r.bloom, 0);
    assert.equal(r.caption, r.phase === 'root');
    lastReveal = r.reveal; lastBloom = r.bloom;
  }
  assert.deepEqual(seen, ['fly', 'root', 'bloom', 'card']);
  const total = FINALE_T.fly + FINALE_T.root + FINALE_T.bloom;
  assert.ok(Math.abs(t - total) < 0.1, String(t));
  assert.equal(r.reveal, 1);
  assert.equal(r.bloom, 1);
  for (let i = 0; i < 600; i++) r.update(1 / 60);
  assert.equal(r.phase, 'card');
});

test('건너뛰기: 바로 끝 카드, 번짐·꽃은 다 찬다', () => {
  const r = make();
  r.update(0.5);
  r.skip();
  assert.equal(r.phase, 'card');
  assert.equal(r.reveal, 1);
  assert.equal(r.bloom, 1);
  r.skip();
  assert.equal(r.phase, 'card');
});

test('닫기: 카드에서만 집 시점으로 돌아가 끝난다', () => {
  const r = make();
  r.close();
  assert.equal(r.phase, 'fly');
  r.skip();
  r.close();
  assert.equal(r.phase, 'out');
  let t = 0;
  while (r.update(1 / 60) !== 'done' && t < 5) t += 1 / 60;
  assert.ok(t <= FINALE_T.out + 0.05);
  assert.ok(Math.abs(r.cur.pos.z - 16) < 1e-6 && Math.abs(r.cur.look.y - 1.2) < 1e-6);
});

test('폰 세로는 세계수를 더 멀리서 올려다본다', () => {
  const land = make(1.6), port = make(390 / 844);
  land.skip(); port.skip();
  const d = (r) => Math.hypot(r.cur.pos.x - TREE.x, r.cur.pos.z - TREE.z);
  assert.ok(d(port) > d(land) * 1.5, `${d(port)} vs ${d(land)}`);
});
