import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGE_POS } from '../js/data/concert.js';
import { concertDefault } from '../js/concert/rules.js';
import { chartOf, lengthMs, PRACTICE_LENGTH_MS } from '../js/concert/songs.js';

globalThis.location ??= { search: '', hostname: 'localhost', origin: 'http://localhost' };
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.navigator ??= { language: 'ko-KR', userAgent: 'node' };
globalThis.window ??= globalThis;
globalThis.addEventListener ??= () => {};
globalThis.document ??= { createElement: () => ({}), head: { appendChild() {} }, addEventListener() {}, documentElement: {} };
const { onTrack } = await import('../js/analytics.js');
const { initConcert, updateConcert, concertSpotNow, openConcert, concertScatterBlocks } = await import('../js/concert/index.js');

function world(over = {}) {
  const w = { state: concertDefault(), saves: 0, clock: -330, log: [], hall: null, lanes: null, result: null, settled: [], abandoned: [], rolls: 0 };
  const deps = {
    getState: () => w.state,
    setState: (s) => { w.state = s; },
    requestSave: () => { w.saves += 1; },
    isGuest: () => false,
    login: () => w.log.push('login'),
    ownsDecor: () => false,
    grantDecorItem: () => true,
    today: () => '2026-11-14',
    stopMove: () => {},
    roll: () => { w.rolls += 1; return { ease: 1, arm: 1, dda: 1 }; },
    settle: (o) => w.settled.push(o),
    diffParams: (r) => ({ ease: r.ease, dda: r.dda, arm: r.arm, probe_v: 2 }),
    abandon: (r, stage, extra) => w.abandoned.push([stage, extra.song]),
    audio: () => ({ ctx: {}, out: {}, on: true }),
    stage: { enter: (id) => w.log.push(`enter:${id}`), strike: (lane) => w.log.push(`strike:${lane}`), update: () => {}, exit: () => w.log.push('exit') },
    bgm: { pause: () => w.log.push('bgm-off'), resume: () => w.log.push('bgm-on') },
    night: () => 0,
    showHall: (h) => { w.hall = h; },
    showLanes: (l) => { w.lanes = l; return { draw() {}, flash: (lane, kind) => w.log.push(`flash:${lane}:${kind}`), miss() {}, close: () => w.log.push('lanes-close') }; },
    showResult: (r) => { w.result = r; },
    createAudio: () => ({ start() {}, stop() {}, nowMs: () => w.clock, hit: (id, lane) => w.log.push(`hit:${id}:${lane}`) }),
    ...over,
  };
  initConcert(deps);
  return w;
}

const near = { x: STAGE_POS.x, z: STAGE_POS.z + 1 };
const openAt = (w) => { updateConcert(0.016, true, near); openConcert(); };
const playAll = (w, songId) => {
  for (const note of chartOf(songId)) { w.clock = note.t; w.lanes.onTap(note.lane); }
  w.clock = lengthMs(songId) + 1;
  updateConcert(0.016, true, near);
};

test('init writes no state and never saves', () => {
  const w = world();
  assert.equal(w.saves, 0);
  assert.deepEqual(w.state, concertDefault());
});

test('the spot is on only near the stage in the village', () => {
  world();
  updateConcert(0.016, true, { x: 0, z: 0 });
  assert.equal(concertSpotNow(), false);
  updateConcert(0.016, true, near);
  assert.equal(concertSpotNow(), true);
  updateConcert(0.016, false, near);
  assert.equal(concertSpotNow(), false);
});

test('the first show runs practice without a roll, then the song', () => {
  const w = world();
  w.state = { ...w.state, seen: true };
  openAt(w);
  w.hall.onPlay('morning');
  assert.equal(w.lanes.practice, true);
  assert.equal(w.rolls, 0);
  w.clock = PRACTICE_LENGTH_MS + 1;
  updateConcert(0.016, true, near);
  assert.equal(w.state.tutorial, true);
  assert.equal(w.saves, 1);
  assert.equal(w.lanes.practice, false);
  assert.equal(w.rolls, 1);
});

test('a perfect show pays four notes, saves once, and feeds the DDA', () => {
  const w = world();
  w.state = { ...w.state, tutorial: true, seen: true };
  openAt(w);
  w.hall.onPlay('morning');
  playAll(w, 'morning');
  assert.equal(w.state.notes, 4);
  assert.equal(w.state.best.morning, 1);
  assert.equal(w.saves, 1);
  assert.deepEqual(w.settled, [1]);
  assert.equal(w.result.view.stars, 3);
  assert.ok(w.log.includes('hit:drum:0'));
  assert.ok(w.log.includes('strike:1'));
  assert.deepEqual(w.log.slice(-3), ['lanes-close', 'exit', 'bgm-on']);
});

test('quitting pays nothing, keeps the day count, and logs an abandon without moving the DDA', () => {
  const w = world();
  w.state = { ...w.state, tutorial: true, seen: true };
  openAt(w);
  w.hall.onPlay('march');
  w.lanes.onQuit();
  assert.equal(w.state.notes, 0);
  assert.equal(w.state.paid, 0);
  assert.equal(w.saves, 0);
  assert.deepEqual(w.settled, []);
  assert.deepEqual(w.abandoned, [['play', 'march']]);
  assert.deepEqual(w.log.slice(-3), ['lanes-close', 'exit', 'bgm-on']);
});

test('a failed start rolls back the stage and leaves no show running', () => {
  const w = world({ showLanes: () => { throw new Error('lanes failed'); } });
  openAt(w);
  assert.throws(() => w.hall.onPlay('morning'), /lanes failed/);
  assert.ok(w.log.includes('exit'));
  assert.ok(w.log.includes('bgm-on'));
  updateConcert(0.016, true, near);
  assert.equal(concertSpotNow(), true);
});

test('starting while a show runs closes the first one', () => {
  const w = world();
  w.state = { ...w.state, tutorial: true };
  openAt(w);
  w.hall.onPlay('morning');
  w.hall.onPlay('march');
  assert.equal(w.log.filter(l => l === 'exit').length, 1);
  assert.equal(w.log.filter(l => l === 'lanes-close').length, 1);
  assert.equal(w.log.filter(l => l.startsWith('enter:')).length, 2);
});

test('quitting during practice logs no abandon', () => {
  const w = world();
  openAt(w);
  w.hall.onPlay('morning');
  w.lanes.onQuit();
  assert.deepEqual(w.abandoned, []);
  assert.equal(w.state.tutorial, false);
});

test('a missed tap neither sounds nor moves the character', () => {
  const w = world();
  w.state = { ...w.state, tutorial: true };
  openAt(w);
  w.hall.onPlay('morning');
  w.clock = 0;
  w.lanes.onTap(0);
  assert.ok(w.log.includes('flash:0:null'));
  assert.ok(!w.log.some(l => l.startsWith('hit:')));
  assert.ok(!w.log.some(l => l.startsWith('strike:')));
});

test('buying an instrument spends notes and saves, equipping saves once', () => {
  const w = world();
  w.state = { ...w.state, notes: 25, seen: true };
  openAt(w);
  assert.deepEqual(w.hall.onBuy({ id: 'bells', cost: 25, type: 'instrument' }), { ok: true });
  assert.equal(w.state.notes, 0);
  assert.deepEqual(w.state.owned, ['drum', 'bells']);
  assert.equal(w.saves, 1);
  w.hall.onEquip('bells');
  w.hall.onEquip('bells');
  assert.equal(w.state.equipped, 'bells');
  assert.equal(w.saves, 2);
});

test('guests cannot exchange and keep their notes', () => {
  const g = world({ isGuest: () => true });
  g.state = { ...g.state, notes: 99, seen: true };
  openAt(g);
  assert.equal(g.hall.onBuy({ id: 'bells', cost: 25, type: 'instrument' }).reason, 'guest');
  assert.equal(g.state.notes, 99);
  assert.equal(g.saves, 0);
});

const events = [];
onTrack((name, payload) => events.push([name, payload]));

test('the guest login button tracks the prompt and opens the login', () => {
  const g = world({ isGuest: () => true });
  g.state = { ...g.state, notes: 7 };
  events.length = 0;
  openAt(g);
  g.hall.onLogin();
  assert.deepEqual(g.log, ['login']);
  const hit = events.filter(e => e[0] === 'concert_login_prompt');
  assert.equal(hit.length, 1);
  assert.equal(hit[0][1].notes, 7);
});

test('the first hall open marks the stage seen and saves once, later opens do not', () => {
  const w = world();
  assert.equal(w.state.seen, false);
  openAt(w);
  assert.equal(w.state.seen, true);
  assert.equal(w.saves, 1);
  const before = w.state;
  openAt(w);
  assert.equal(w.saves, 1);
  assert.equal(w.state, before);
});

test('a seen stage never starts the guide again', () => {
  const { g } = guideWorld({ seen: true });
  updateConcert(0.016, true, far);
  assert.equal(g.starts, 0);
});

test('a throw while drawing ends the show once and restores the stage', () => {
  const w = world({ showLanes: (l) => { w.lanes = l; return { draw() { throw new Error('draw failed'); }, flash() {}, miss() {}, close: () => w.log.push('lanes-close') }; } });
  w.state = { ...w.state, tutorial: true, seen: true };
  openAt(w);
  w.hall.onPlay('morning');
  assert.throws(() => updateConcert(0.016, true, near), /draw failed/);
  assert.equal(w.log.filter(e => e === 'exit').length, 1);
  assert.ok(w.log.includes('bgm-on'));
  updateConcert(0.016, true, near);
  assert.equal(w.log.filter(e => e === 'exit').length, 1);
});

test('the village music stays off from practice into the song and returns on every real exit', () => {
  const w = world();
  w.state = { ...w.state, seen: true };
  openAt(w);
  w.hall.onPlay('morning');
  w.clock = PRACTICE_LENGTH_MS + 1;
  updateConcert(0.016, true, near);
  assert.equal(w.lanes.practice, false);
  assert.equal(w.log.filter(e => e === 'bgm-off').length, 1);
  assert.equal(w.log.filter(e => e === 'bgm-on').length, 0);
  w.lanes.onQuit();
  assert.equal(w.log.filter(e => e === 'bgm-on').length, 1);
});

test('the village music returns once when the song after practice ends', () => {
  const w = world();
  w.state = { ...w.state, seen: true };
  openAt(w);
  w.hall.onPlay('morning');
  w.clock = PRACTICE_LENGTH_MS + 1;
  updateConcert(0.016, true, near);
  playAll(w, 'morning');
  assert.equal(w.log.filter(e => e === 'bgm-on').length, 1);
});

test('decor without art is not sold', () => {
  const w = world();
  w.state = { ...w.state, notes: 99 };
  openAt(w);
  assert.equal(w.hall.onBuy({ id: 'nope', cost: 10, kind: 'indoor', type: 'decor' }).reason, 'soon');
  assert.equal(w.state.notes, 99);
});

test('scatter keeps a clearing of about 7 around the stage', () => {
  const at = (dx, dz) => concertScatterBlocks(STAGE_POS.x + dx, STAGE_POS.z + dz);
  for (const [dx, dz] of [[0, 0], [-6.9, 0], [6.9, 0], [0, -6.9], [-4.8, -4.8]]) assert.equal(at(dx, dz), true, `${dx},${dz}`);
  for (const [dx, dz] of [[-7.2, 0], [7.2, 0], [0, -7.2], [5.2, -5.2], [30, 0]]) assert.equal(at(dx, dz), false, `${dx},${dz}`);
});

test('the show camera lane in front of the stage stays clear of scatter', () => {
  const at = (dx, dz) => concertScatterBlocks(STAGE_POS.x + dx, STAGE_POS.z + dz);
  assert.equal(at(4.8, 9), true);
  assert.equal(at(-4.8, 11.8), true);
  assert.equal(at(4.8, 12.5), false);
  assert.equal(at(5.3, 9), false);
});

const thing = (dx, dz, visible = true) => ({ visible, position: { x: STAGE_POS.x + dx, z: STAGE_POS.z + dz } });

function viewWorld(over = {}) {
  const inLane = thing(1, 5);
  const outside = thing(8, -3);
  const hiddenBefore = thing(-1, 6, false);
  const w = world({ scene: { children: [inLane, outside, hiddenBefore] }, ...over });
  w.state = { ...w.state, tutorial: true };
  return { w, inLane, outside, hiddenBefore };
}

const seen = (v) => [v.inLane.visible, v.outside.visible, v.hiddenBefore.visible];

test('a show hides what stands in the camera lane and restores it after the song', () => {
  const v = viewWorld();
  openAt(v.w);
  v.w.hall.onPlay('morning');
  assert.deepEqual(seen(v), [false, true, false]);
  playAll(v.w, 'morning');
  assert.deepEqual(seen(v), [true, true, false]);
});

test('quitting restores the camera lane', () => {
  const v = viewWorld();
  openAt(v.w);
  v.w.hall.onPlay('march');
  v.w.lanes.onQuit();
  assert.deepEqual(seen(v), [true, true, false]);
});

test('a failed start hides nothing', () => {
  const v = viewWorld({ showLanes: () => { throw new Error('lanes failed'); } });
  openAt(v.w);
  assert.throws(() => v.w.hall.onPlay('morning'), /lanes failed/);
  assert.deepEqual(seen(v), [true, true, false]);
});

test('re-initialising mid-show restores the camera lane', () => {
  const v = viewWorld();
  openAt(v.w);
  v.w.hall.onPlay('morning');
  world();
  assert.deepEqual(seen(v), [true, true, false]);
});

function guideWorld(state) {
  const g = { checks: 0, starts: 0 };
  const guide = { active: false, start() { this.active = true; g.starts += 1; }, update() {}, cancel() { this.active = false; } };
  const count = (v) => () => { g.checks += 1; return v; };
  const guideEnv = {
    pastOnboarding: count(true), cameraFree: count(true), uiBusy: count(false), otherGuide: count(false),
    makeGuide: () => guide,
  };
  const w = world({ guideEnv });
  w.state = { ...w.state, ...state };
  return { w, g, guide };
}

const far = { x: STAGE_POS.x + 20, z: STAGE_POS.z };

test('players who no longer need the guide skip the other gates', () => {
  const { g } = guideWorld({ notes: 3 });
  updateConcert(0.016, true, far);
  assert.equal(g.checks, 0);
  assert.equal(g.starts, 0);
});

test('the guide counts one try per session and stops after two sessions', () => {
  const { w, g } = guideWorld({});
  updateConcert(0.016, true, far);
  updateConcert(0.016, true, far);
  assert.equal(w.state.guideTries, 1);
  assert.equal(w.saves, 1);
  assert.equal(g.starts, 1);
  const again = guideWorld({ guideTries: 1 });
  updateConcert(0.016, true, far);
  assert.equal(again.w.state.guideTries, 2);
  assert.equal(again.g.starts, 1);
  const spent = guideWorld({ guideTries: 2 });
  updateConcert(0.016, true, far);
  assert.equal(spent.g.starts, 0);
});

test('the guide does not come back after the player reached the stage once', () => {
  const { g, guide } = guideWorld({});
  updateConcert(0.016, true, far);
  assert.equal(guide.active, true);
  updateConcert(0.016, true, near);
  updateConcert(0.016, true, far);
  updateConcert(0.016, true, far);
  assert.equal(guide.active, false);
  assert.equal(g.starts, 1);
});

const bb = (x0, x1, z0, z1, y0 = 0, y1 = 3) => ({ min: { x: STAGE_POS.x + x0, y: y0, z: STAGE_POS.z + z0 }, max: { x: STAGE_POS.x + x1, y: y1, z: STAGE_POS.z + z1 } });
const mesh = (box, visible = true) => ({ isMesh: true, visible, bb: box, position: { x: 999, z: 999 }, children: [] });
const fakeThree = { Box3: class { setFromObject(o) { this.min = o.bb.min; this.max = o.bb.max; return this; } } };

test('a show also hides nested meshes and big objects whose origin is outside the lane', () => {
  const wall = mesh(bb(2, 6, 4, 6));
  const decor = mesh(bb(-1, 0, 7, 8));
  const ground = mesh(bb(-40, 40, -40, 40, -0.1, 0));
  const behind = mesh(bb(-1, 1, -6, -4));
  const group = { visible: true, position: { x: 999, z: 999 }, children: [decor, ground, behind] };
  const w = world({ scene: { children: [wall, group] }, THREE: fakeThree });
  w.state = { ...w.state, tutorial: true };
  openAt(w);
  w.hall.onPlay('morning');
  assert.deepEqual([wall.visible, decor.visible, ground.visible, behind.visible, group.visible], [false, false, true, true, true]);
  w.lanes.onQuit();
  assert.deepEqual([wall.visible, decor.visible, ground.visible, behind.visible, group.visible], [true, true, true, true, true]);
});
