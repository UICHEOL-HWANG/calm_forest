import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SEA_PAT, RING_LEAD, RING_PERFECT, RING_GOOD, rollPhaseLen, scheduleRings, judgeRing,
  CAST_REL, CAST_END, CAST_WIND, castPose, pumpPose, buoyFlight,
  createRope, stepRope, collidePier,
} from '../js/sea-feel.js';

const SPECIES = ['aji', 'buri', 'mola', 'tuna'];

test('어종 네 개 모두 패턴이 있고 범위가 올바르다', () => {
  for (const id of SPECIES) {
    const p = SEA_PAT[id];
    assert.ok(p, id);
    assert.ok(p.run[0] < p.run[1] && p.rest[0] < p.rest[1], id);
    assert.ok(p.hook >= .4 && p.hook <= .6, `${id} 챔질 창`);
    assert.ok(p.tempo > .25 && p.tempo < .7, `${id} 박자`);
  }
});

test('어종마다 성격이 다르다 — 참치만 가짜 휴식, 개복치만 쉬면서도 당김, 방어가 가장 옆으로 달린다', () => {
  assert.ok(SEA_PAT.tuna.feint > 0 && SEA_PAT.aji.feint === 0);
  assert.equal(SEA_PAT.mola.steady, true);
  assert.ok(!SEA_PAT.tuna.steady);
  assert.ok(SEA_PAT.buri.side > SEA_PAT.tuna.side && SEA_PAT.tuna.side > SEA_PAT.aji.side);
  assert.ok(SEA_PAT.aji.run[1] < SEA_PAT.tuna.run[0], '전갱이 발버둥이 참치 질주보다 짧다');
});

test('구간 길이는 범위 안이고, 참치 가짜 휴식은 0.45초다', () => {
  for (const r of [0, .3, .99]) {
    const run = rollPhaseLen(SEA_PAT.buri, 'run', () => r);
    assert.ok(run >= SEA_PAT.buri.run[0] && run <= SEA_PAT.buri.run[1]);
  }
  assert.equal(rollPhaseLen(SEA_PAT.tuna, 'rest', () => 0), .45);
  const rest = rollPhaseLen(SEA_PAT.tuna, 'rest', () => .9);
  assert.ok(rest >= SEA_PAT.tuna.rest[0] && rest <= SEA_PAT.tuna.rest[1]);
});

test('링은 쉬는 구간 안에서 박자 간격으로만 잡힌다', () => {
  const rings = scheduleRings(10, 1.0, .32);
  assert.ok(rings.length >= 2);
  assert.ok(Math.abs(rings[0].hit - 10.25) < 1e-9);
  rings.forEach((r, i) => {
    assert.ok(r.hit < 11 - .05 + 1e-9, '쉬는 구간을 넘는 링');
    assert.equal(r.done, false);
    if (i) assert.ok(Math.abs(r.hit - rings[i - 1].hit - .32) < 1e-9);
  });
  assert.deepEqual(scheduleRings(0, .2, .32), [], '너무 짧은 휴식엔 링이 없다');
  assert.ok(RING_LEAD > .4, '링이 미리 보여야 예고가 된다');
});

test('링 판정 — 완벽 / 좋아 / 헛손질, 이미 맞춘 링은 다시 안 잡히고 입력을 바꾸지 않는다', () => {
  const rings = [{ hit: 5, done: false }, { hit: 5.4, done: false }];
  const snapshot = JSON.stringify(rings);
  assert.deepEqual(judgeRing(rings, 5 + RING_PERFECT * .5), { index: 0, grade: 'perfect' });
  assert.deepEqual(judgeRing(rings, 5 - (RING_PERFECT + RING_GOOD) / 2), { index: 0, grade: 'good' });
  assert.deepEqual(judgeRing(rings, 5.2 + .001), { index: 1, grade: 'good' });
  assert.equal(judgeRing(rings, 4.5), null);
  assert.equal(JSON.stringify(rings), snapshot);
  assert.equal(judgeRing([{ hit: 5, done: true }], 5), null);
});

test('던지기 — 예비에서 뒤로 젖히고 로드를 넘겼다가, 채찍 뒤 앞으로 쏠리고, 끝엔 대기 자세로 돌아온다', () => {
  const idle = .6;
  const a = castPose(0, idle), wind = castPose(CAST_WIND, idle), end = castPose(CAST_END, idle);
  assert.ok(Math.abs(a.elev - idle) < 1e-6 && a.lean === 0);
  assert.ok(wind.elev > Math.PI / 2, '예비 끝엔 로드가 머리 뒤로 넘어간다');
  assert.ok(wind.lean < 0 && wind.twist > 0 && wind.squash < 0);
  const after = castPose(CAST_REL + .06, idle);
  assert.ok(after.lean > 0 && after.elev < 1, '릴리스 직후엔 앞으로 쏠리고 로드가 앞으로 뻗는다');
  assert.ok(Math.abs(end.elev - idle) < .02 && Math.abs(end.lean) < .02 && Math.abs(end.squash) < .02);
  assert.ok(CAST_REL > CAST_WIND && CAST_REL < CAST_END);
});

test('펌핑 — 내달릴 땐 로드를 높이 세우고 뒤로 젖히며, 쉬는 동안 링을 맞추면 확 들었다 내린다', () => {
  const run = pumpPose('run', 0, 0), rest0 = pumpPose('rest', 0, 0), rest1 = pumpPose('rest', 1, 0);
  assert.ok(run.elev > 1 && run.lean < -.2);
  assert.ok(rest1.elev > rest0.elev + .5 && rest1.lean < rest0.lean);
});

test('찌 비행 — 출발점에서 떠나 위로 솟았다가 착수점에 떨어진다', () => {
  const from = { x: 0, y: 2, z: 0 }, to = { x: 1, y: .06, z: -10 }, T = .85;
  const p0 = buoyFlight(from, to, T, 0), pT = buoyFlight(from, to, T, T), mid = buoyFlight(from, to, T, T * .25);
  for (const k of ['x', 'y', 'z']) { assert.ok(Math.abs(p0[k] - from[k]) < 1e-9); assert.ok(Math.abs(pT[k] - to[k]) < 1e-9); }
  assert.ok(mid.y > from.y, '처음엔 위로 솟는다');
});

const PIER = { halfW: 1.7, z0: 4, z1: -10, top: .07, water: .06, posts: [{ x: 1.6, z: 3.4, r: .15, top: .75 }] };

test('부두 충돌 — 데크 위 점은 널판 아래로 못 내려가고, 기둥은 바깥으로 밀어내고, 물 밖 점은 수면 위', () => {
  assert.equal(collidePier({ x: 0, y: -.5, z: 0 }, PIER).y, PIER.top);
  assert.equal(collidePier({ x: 5, y: -.5, z: 0 }, PIER).y, PIER.water);
  const pushed = collidePier({ x: 1.58, y: .3, z: 3.4 }, PIER);
  assert.ok(Math.hypot(pushed.x - 1.6, pushed.z - 3.4) >= .15 - 1e-9);
  const above = collidePier({ x: 1.6, y: 1, z: 3.4 }, PIER);
  assert.equal(above.x, 1.6);
});

test('로프 — 양 끝은 고정, 마디는 늘어나지 않고, 물·데크 아래로 안 내려간다', () => {
  const a = { x: .5, y: 1.4, z: -2 }, b = { x: 1, y: .1, z: -14 };
  const rope = createRope(18, a);
  for (let i = 0; i < 240; i++) stepRope(rope, a, b, 1.1, 1 / 60, PIER);
  const n = rope.length, seg = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) * 1.1 / (n - 1);
  assert.deepEqual([rope[0].p.x, rope[0].p.y, rope[0].p.z], [a.x, a.y, a.z]);
  assert.deepEqual([rope[n - 1].p.x, rope[n - 1].p.y, rope[n - 1].p.z], [b.x, b.y, b.z]);
  for (let i = 0; i < n - 1; i++) {
    const p = rope[i].p, q = rope[i + 1].p;
    assert.ok(Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z) <= seg * 1.05, `마디 ${i} 가 늘어났다`);
  }
  for (const { p } of rope.slice(1, -1)) {
    const onDeck = Math.abs(p.x) <= PIER.halfW && p.z <= PIER.z0 && p.z >= PIER.z1;
    assert.ok(p.y >= (onDeck ? PIER.top : PIER.water) - 1e-9, '로프가 물·데크를 뚫었다');
  }
});

test('느슨한 로프는 가운데가 처진다 — 직선 막대가 아니다', () => {
  const a = { x: 0, y: 3, z: 0 }, b = { x: 0, y: 3, z: -8 };
  const rope = createRope(18, a);
  for (let i = 0; i < 300; i++) stepRope(rope, a, b, 1.15, 1 / 60, null);
  assert.ok(rope[9].p.y < 2.2, `가운데 높이 ${rope[9].p.y}`);
});
