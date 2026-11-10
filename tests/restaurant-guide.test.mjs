import { test } from 'node:test';
import assert from 'node:assert/strict';
import { restaurantGuideSteps, guideStage, shownStep, villageVia, hallVia } from '../js/restaurant/guide-steps.js';
import { createGuide } from '../js/guide/runner.js';
import { createSession, tickSession, actAt } from '../js/restaurant/session.js';
import { HALL, RESTAURANT_GATE } from '../js/restaurant/data.js';

const base = { inside: true, running: true, served: 0, held: null, pan: null };

test('8단계 문구는 확정 후보 그대로', () => {
  const s = restaurantGuideSteps();
  assert.deepEqual(s.map(x => x.text), [
    '카페 옆 식당으로 가 보세요', '칠판을 눌러 영업을 시작해요', '🐟 상자에서 생선을 꺼내요', '팬에 올려요',
    '게이지가 초록일 때 눌러 뒤집어요', '다 익으면 꺼내요', '접시에 담아요', '손님에게 가져다줘요',
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

test('식당 뒤쪽에서는 옆으로 돌아가는 경유점', () => {
  const door = { x: RESTAURANT_GATE.x, z: RESTAURANT_GATE.z + 3.1 };
  const v = villageVia({ x: 12, z: 10 }, door);
  assert.ok(v && (v.x < 8 || v.x > 16));
  assert.equal(villageVia({ x: 12, z: 30 }, door), null);
  assert.deepEqual(villageVia({ x: 4, z: 30 }, door), { x: door.x, z: door.z + 2.8 });
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
