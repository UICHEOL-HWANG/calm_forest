import { test } from 'node:test';
import assert from 'node:assert/strict';
import { YARD_IDLE_SEC, YARD_PIER, GO_REACH, YARD_MAX_TRIES, YARD_STALL_SEC, guideStalled, bridgeDone, yardIdle, yardReady, yardSteps, goStep, d1Ready, d1Steps } from '../js/pond/yard-steps.js';
import { createGuide } from '../js/guide/runner.js';

const COPY = { stepLake: 'L', stepCast: 'C', stepCatch: 'K', stepPond: 'P', stepFeed: 'F', stepD1: 'D' };
const base = { me: { x: 0, z: 0 }, pier: YARD_PIER, pond: null, hasPond: false, nearLake: false, fishing: false, nearPond: false, fedToday: false };

test('상수', () => {
  assert.equal(YARD_IDLE_SEC, 5);
  assert.deepEqual(YARD_PIER, { x: 12.8, z: 9 });
  assert.equal(GO_REACH, 3);
});

test('한가한 시간: 바쁘면 0 으로', () => {
  assert.equal(yardIdle(2, 0.5, true), 2.5);
  assert.equal(yardIdle(4.9, 0.5, false), 0);
});

test('시작 조건: 스위치·다리·미완료·5초', () => {
  const ok = { on: true, bridge: true, done: false, idleSec: 5 };
  assert.equal(yardReady(ok), true);
  assert.equal(yardReady({ ...ok, on: false }), false);
  assert.equal(yardReady({ ...ok, bridge: false }), false);
  assert.equal(yardReady({ ...ok, done: true }), false);
  assert.equal(yardReady({ ...ok, idleSec: 4.9 }), false);
});

test('단계 순서와 문구', () => {
  const s = yardSteps(COPY);
  assert.deepEqual(s.map(x => x.id), ['lake', 'cast', 'catch', 'pond', 'feed']);
  assert.deepEqual(s.map(x => x.text), ['L', 'C', 'K', 'P', 'F']);
  assert.deepEqual(s[0].target(base), YARD_PIER);
  assert.equal(s[3].target(base), null);
  assert.deepEqual(s[4].target({ ...base, pond: { x: 1, z: 2 } }), { x: 1, z: 2 });
});

test('처음부터: 호수 → 던짐 → 낚음 → 연못 → 먹이', () => {
  const g = createGuide({ flow: 'yard_fill', steps: yardSteps(COPY), now: () => 0 });
  g.tick(base);
  assert.equal(g.current().id, 'lake');
  g.tick({ ...base, nearLake: true });
  assert.equal(g.current().id, 'cast');
  g.tick({ ...base, nearLake: true, fishing: true });
  assert.equal(g.current().id, 'catch');
  g.tick({ ...base, hasPond: true, pond: { x: 1, z: 1 } });
  assert.equal(g.current().id, 'pond');
  g.tick({ ...base, hasPond: true, pond: { x: 1, z: 1 }, nearPond: true });
  assert.equal(g.current().id, 'feed');
  g.tick({ ...base, hasPond: true, pond: { x: 1, z: 1 }, nearPond: true, fedToday: true });
  assert.equal(g.active(), false);
});

test('이미 연못이 있으면 첫 틱에 연못 단계로 건너뛴다', () => {
  const g = createGuide({ flow: 'yard_fill', steps: yardSteps(COPY), now: () => 0 });
  g.tick({ ...base, hasPond: true, pond: { x: 1, z: 1 } });
  assert.equal(g.current().id, 'pond');
});

test('장소 이동 단계: 3 안에 들면 끝', () => {
  const s = goStep({ x: 10, z: 0 }, 'G');
  assert.equal(s.id, 'go');
  assert.equal(s.text, 'G');
  assert.deepEqual(s.target(base), { x: 10, z: 0 });
  assert.equal(s.done({ ...base, me: { x: 7.1, z: 0 } }), true);
  assert.equal(s.done({ ...base, me: { x: 6.9, z: 0 } }), false);
});

test('다음 날 안내: 마당 채우기 끝·다른 날·먹이 전·한 번만', () => {
  const ok = { on: true, yardDone: true, d1Done: false, pondDay: '2026-11-12', today: '2026-11-13', fedToday: false, idleSec: 5 };
  assert.equal(d1Ready(ok), true);
  assert.equal(d1Ready({ ...ok, on: false }), false);
  assert.equal(d1Ready({ ...ok, yardDone: false }), false);
  assert.equal(d1Ready({ ...ok, d1Done: true }), false);
  assert.equal(d1Ready({ ...ok, today: '2026-11-12' }), false, '연못 생긴 날엔 안 한다');
  assert.equal(d1Ready({ ...ok, pondDay: null }), false);
  assert.equal(d1Ready({ ...ok, fedToday: true }), false);
  assert.equal(d1Ready({ ...ok, idleSec: 4 }), false);
});

test('다음 날 안내 단계', () => {
  const s = d1Steps(COPY);
  assert.deepEqual(s.map(x => x.id), ['d1_pond', 'd1_feed']);
  assert.deepEqual(s.map(x => x.text), ['D', 'F']);
  const g = createGuide({ flow: 'pond_d1', steps: s, now: () => 0 });
  g.tick({ ...base, hasPond: true, pond: { x: 1, z: 1 } });
  assert.equal(g.current().id, 'd1_pond');
  g.tick({ ...base, hasPond: true, pond: { x: 1, z: 1 }, nearPond: true });
  assert.equal(g.current().id, 'd1_feed');
  g.tick({ ...base, hasPond: true, pond: { x: 1, z: 1 }, nearPond: true, fedToday: true });
  assert.equal(g.active(), false);
});

test('시작 횟수 상한', () => {
  const ok = { on: true, bridge: true, done: false, idleSec: 5 };
  assert.equal(YARD_MAX_TRIES, 2);
  assert.equal(yardReady({ ...ok, tries: 0 }), true);
  assert.equal(yardReady({ ...ok, tries: 1 }), true);
  assert.equal(yardReady({ ...ok, tries: 2 }), false);
  assert.equal(yardReady(ok), true);
});

test('멈춘 안내 판정 경계', () => {
  assert.equal(YARD_STALL_SEC, 600);
  assert.equal(guideStalled(0, 599), false);
  assert.equal(guideStalled(0, 600), true);
});

test('다리 완료: 플래그 또는 레거시 집 3단계', () => {
  assert.equal(bridgeDone({ unlocks: { flags: { bridge: true } } }), true);
  assert.equal(bridgeDone({ unlocks: { legacy: true }, houseStage: 3 }), true);
  assert.equal(bridgeDone({ unlocks: { legacy: true }, houseStage: 2 }), false);
  assert.equal(bridgeDone({ unlocks: {}, houseStage: 3 }), false);
  assert.equal(bridgeDone(null), false);
});
