import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restaurantGuideSteps, guideStage, shownStep, villageVia, hallVia } from '../js/restaurant/guide-steps.js';
import { createGuide } from '../js/guide/runner.js';
import { createSession, tickSession, actAt } from '../js/restaurant/session.js';
import { HALL, RESTAURANT_GATE, RESTAURANT_FACE, RESTAURANT_SIGN, restaurantLocal, restaurantScatterBlocks } from '../js/restaurant/data.js';

const base = { inside: true, running: true, served: 0, held: null, pan: null };

test('8단계 문구는 확정 후보 그대로', () => {
  const s = restaurantGuideSteps();
  assert.deepEqual(s.map(x => x.text), [
    '반딧불이 계곡 아래 식당으로 가 보세요', '칠판을 눌러 영업을 시작해요', '🐟 상자에서 생선을 꺼내요', '팬에 올려요',
    '막대가 초록 칸일 때 눌러 뒤집어요', '다 익으면 꺼내요', '접시에 담아요', '손님에게 가져다줘요',
  ]);
  for (const x of s) assert.doesNotMatch(x.text, /[—⬇➜]/u);
});

test('상태에서 단계 계산', () => {
  assert.equal(guideStage({ ...base, inside: false }), 0);
  assert.equal(guideStage({ ...base, running: false }), 1);
  assert.equal(guideStage(base), 2);
  assert.equal(guideStage({ ...base, held: { kind: 'fish' } }), 3);
  assert.equal(guideStage({ ...base, pan: { flipped: null, done: false } }), 4);
  assert.equal(guideStage({ ...base, pan: { flipped: false, done: false } }), 5);
  assert.equal(guideStage({ ...base, pan: { flipped: null, done: true } }), 5);
  assert.equal(guideStage({ ...base, held: { kind: 'grilled' } }), 6);
  assert.equal(guideStage({ ...base, held: { kind: 'grilled', plated: true } }), 7);
  assert.equal(guideStage({ ...base, served: 1 }), 8);
  assert.equal(guideStage({ ...base, held: { kind: 'burnt' } }), -1);
  assert.equal(guideStage({ ...base, held: { kind: 'rice' } }), -1);
});

test('뒤로 밀리면 그 단계 안내, 탄 것은 버리기 안내', () => {
  const s = restaurantGuideSteps();
  assert.equal(shownStep(s, 6, 2).id, 'fish');
  assert.equal(shownStep(s, 6, -1).id, 'trash');
  assert.equal(shownStep(s, 3, 5).id, 'pan');
});

test('식당은 반딧불이 계곡 남서쪽 잔디에, 다른 건물처럼 문을 카메라 쪽(남)으로 두고 선다', () => {
  assert.deepEqual(RESTAURANT_GATE, { x: -5, z: 35.5 });
  assert.equal(RESTAURANT_FACE, 1);
  assert.deepEqual(restaurantLocal(0, 3.1), { x: -5, z: 38.6 });
  assert.deepEqual(restaurantLocal(2, 0), { x: -3, z: 35.5 });
});

test('식당 건물·테라스는 마을 걷기 경계 안이고 계곡 나무와 겹치지 않는다', () => {
  const corners = [[-3.9, -3.0], [3.9, -3.0], [-3.9, 4.9], [3.9, 4.9]].map(([x, z]) => restaurantLocal(x, z));
  for (const c of corners) assert.ok(Math.hypot(c.x, c.z) < 41.5, JSON.stringify(c));
  for (const [x, z] of [[3.4, 34.6], [0, 30.9], [8.5, 34.5]]) assert.ok(!restaurantScatterBlocks(x, z, 1.3), `${x},${z}`);
});

test('식당 뒤쪽에서는 옆으로 돌아가는 경유점', () => {
  const door = restaurantLocal(0, 3.1);
  const v = villageVia(restaurantLocal(0, -8), door);
  const side = Math.abs((v.x - RESTAURANT_GATE.x) * RESTAURANT_FACE);
  assert.ok(v && side > 4, JSON.stringify(v));
  assert.equal(villageVia(restaurantLocal(0, 8), door), null);
  assert.deepEqual(villageVia(restaurantLocal(-8, 6), door), restaurantLocal(0, 5.9));
});

test('풀·꽃·나무는 식당 건물과 테라스 위에 나지 않는다', () => {
  assert.ok(restaurantScatterBlocks(...Object.values(restaurantLocal(-3.6, 4.4))));
  assert.ok(restaurantScatterBlocks(...Object.values(restaurantLocal(3.2, -2.5))));
  assert.ok(!restaurantScatterBlocks(...Object.values(restaurantLocal(0, 7))));
  assert.ok(!restaurantScatterBlocks(...Object.values(restaurantLocal(6, 0))));
});

test('홀과 주방 사이는 남쪽 통로로', () => {
  const v = hallVia({ x: -5.2, z: 3.2 }, { x: 1.9, z: -3.5 });
  assert.ok(v.z > HALL.half.z - 2);
  assert.equal(hallVia({ x: 3, z: -2 }, { x: 4.6, z: -3.5 }), null);
});

test('첫 영업 세션은 생선구이 손님 한 명, 인내 1.2배, 손님이 가면 끝', () => {
  const S = createSession({ star: 1, dda: { iv: 1, pat: 1, win: 1 }, first: true, rng: () => 0.99 });
  assert.equal(S.dda.pat, 1.2);
  let spawns = 0, ended = false;
  for (let i = 0; i < 1200 && !ended; i++) {
    for (const e of tickSession(S, 0.1)) {
      if (e.type === 'spawn') { spawns++; assert.equal(e.menu, 'grilled'); }
      if (e.type === 'end') ended = true;
    }
    if (S.tickets.length) {
      S.held = { kind: 'grilled', q: 1, plated: true };
      const tb = HALL.tables[S.tickets[0].table];
      actAt(S, { x: tb[0], z: tb[1] - 0.9 }, { take: () => true });
    }
  }
  assert.equal(spawns, 1);
  assert.ok(ended);
  assert.ok(S.time < 30);
});

test('가이드 러너로 8단계 끝까지', () => {
  const steps = restaurantGuideSteps();
  let done = false;
  const g = createGuide({ flow: 'restaurant', steps, now: () => 0, onDone: () => { done = true; } });
  const seq = [
    { ...base, inside: false }, { ...base, running: false }, base, { ...base, held: { kind: 'fish' } },
    { ...base, pan: { flipped: null, done: false } }, { ...base, pan: { flipped: true, done: false } },
    { ...base, held: { kind: 'grilled' } }, { ...base, held: { kind: 'grilled', plated: true } }, { ...base, served: 1 },
  ];
  for (const c of seq) g.tick({ ...c, stage: guideStage(c) });
  assert.ok(done);
});

test('식당 팻말은 옆으로 돌아 들어오는 길을 막지 않는다', () => {
  const door = restaurantLocal(0, 3.1);
  const sign = restaurantLocal(RESTAURANT_SIGN.x, RESTAURANT_SIGN.z);
  const segDist = (a, b, p) => {
    const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(a.x + dx * t - p.x, a.z + dz * t - p.z);
  };
  for (const side of [-1, 1]) {
    const lane = restaurantLocal(side * 4.7, 0);
    const corner = villageVia(restaurantLocal(side * 4.7, -1), door);
    const front = villageVia(corner, door);
    assert.ok(segDist(lane, corner, sign) > 0.7, `lane ${side}`);
    assert.ok(segDist(corner, front, sign) > 0.7, `front ${side}`);
  }
});
