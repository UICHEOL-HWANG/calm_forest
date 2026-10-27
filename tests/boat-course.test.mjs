import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COURSE_V, COURSES, courseSeedKey, buildCourseData, FORK_X } from '../js/boat/course.js';

const SEEDS = Array.from({ length: 40 }, (_, i) => 1000 + i * 7919);
const count = (items, kinds) => items.filter(i => kinds.includes(i.kind)).length;
const OBS = ['rock', 'log', 'pile', 'whirl'];

test('버전·시드 키·정산 배율', () => {
  assert.equal(COURSE_V, 2);
  assert.equal(courseSeedKey(2, 'rapid'), 'river:2:rapid');
  assert.equal(COURSES.calm.matMul, 1); assert.equal(COURSES.rapid.matMul, 1.5);
  assert.equal(COURSES.calm.speedMul, 1); assert.equal(COURSES.rapid.speedMul, 1.2);
});

test('같은 시드는 같은 코스', () => {
  for (const course of ['calm', 'rapid']) {
    assert.deepEqual(buildCourseData(42, { night: false, course }), buildCourseData(42, { night: false, course }));
  }
});

test('잔잔한 물길: 첫 장애물 70m 이후, 1구간엔 바위만', () => {
  for (const s of SEEDS) {
    const obs = buildCourseData(s, { night: false, course: 'calm' }).items.filter(i => OBS.includes(i.kind));
    assert.ok(obs[0].d >= 70, `seed ${s}: ${obs[0].d}`);
    assert.ok(obs.filter(o => o.d / 620 < 0.34).every(o => o.kind === 'rock'), `seed ${s}`);
  }
});

test('급류: 장애물이 더 많고, 별·수집물 수는 잔잔한 물길과 비슷', () => {
  let cs = 0, rs = 0, co = 0, ro = 0, cp = 0, rp = 0;
  for (const s of SEEDS) {
    const c = buildCourseData(s, { night: true, course: 'calm' }).items;
    const r = buildCourseData(s, { night: true, course: 'rapid' }).items;
    cs += count(c, ['star']); rs += count(r, ['star']);
    co += count(c, ['rock', 'log', 'pile']); ro += count(r, ['rock', 'log', 'pile']);
    cp += count(c, ['pick']); rp += count(r, ['pick']);
  }
  assert.ok(rs / cs >= 0.9 && rs / cs <= 1.1, `별 비율 ${(rs / cs).toFixed(3)}`);
  assert.ok(rp / cp >= 0.85 && rp / cp <= 1.15, `수집물 비율 ${(rp / cp).toFixed(3)}`);
  assert.ok(ro > co * 1.2, `장애물 ${co} → ${ro}`);
});

test('급류: 갈림길 섬 안과 폭포 ±10m 엔 장애물이 없다', () => {
  for (const s of SEEDS) {
    const { items, fork, falls } = buildCourseData(s, { night: false, course: 'rapid' });
    assert.deepEqual([fork.d0, fork.d1, fork.x0, fork.x1], [270, 330, FORK_X[0], FORK_X[1]]);
    assert.deepEqual(falls, [180, 450]);
    for (const o of items.filter(i => OBS.includes(i.kind))) {
      const inIsland = o.d > fork.d0 && o.d < fork.d1 && o.x > fork.x0 - 1 && o.x < fork.x1 + 1;
      assert.ok(!inIsland, `seed ${s}: 섬 위 장애물 ${o.kind}@${o.d}`);
      assert.ok(falls.every(f => Math.abs(o.d - f) >= 10), `seed ${s}: 폭포 옆 ${o.d}`);
    }
  }
});

test('잔잔한 물길엔 갈림길·폭포가 없다', () => {
  const r = buildCourseData(7, { night: false, course: 'calm' });
  assert.equal(r.fork, null); assert.deepEqual(r.falls, []);
});

test('상자: 루프 뒤에만 난수를 써서 상자 없는 날 코스가 같다', () => {
  const a = buildCourseData(99, { night: false, course: 'calm', chest: false }).items;
  const b = buildCourseData(99, { night: false, course: 'calm', chest: true }).items;
  assert.equal(count(b, ['chest']), 1);
  assert.deepEqual(b.filter(i => i.kind !== 'chest'), a);
});

test('밤 전용 수집물은 낮에 안 나온다', () => {
  for (const s of SEEDS) assert.ok(buildCourseData(s, { night: false, course: 'rapid' }).items.every(i => i.pick !== 'moon_fish'));
});

test('급류: 별과 수집물이 갈림 섬 위나 폭포 앞뒤 10m 안에 놓이지 않음', () => {
  const cfg = COURSES.rapid;
  for (const s of SEEDS) {
    const { items, fork } = buildCourseData(s, { night: true, course: 'rapid' });
    for (const o of items.filter(i => i.kind === 'pick' || (i.kind === 'star' && i.x < FORK_X[1] + 1.01))) {
      const onIsland = o.d >= fork.d0 && o.d <= fork.d1 && o.x >= FORK_X[0] - 1 && o.x <= FORK_X[1] + 1;
      assert.ok(!onIsland, `seed ${s}: ${o.kind} d${o.d} x${o.x} on island`);
      assert.ok(cfg.falls.every(f => Math.abs(o.d - f) >= 10), `seed ${s}: ${o.kind} d${o.d} near fall`);
    }
  }
});
