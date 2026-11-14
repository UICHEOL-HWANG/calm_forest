import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weeklyDefault, progressOf } from '../js/weekly/rules.js';
import { MARKET_THEMES, TICKET_CAP } from '../js/data/weekly.js';

globalThis.location ??= { search: '', hostname: 'localhost', origin: 'http://localhost' };
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.navigator ??= { language: 'ko-KR', userAgent: 'node' };
globalThis.window ??= globalThis;
globalThis.addEventListener ??= () => {};
globalThis.document ??= { createElement: () => ({}), head: { appendChild() {} }, addEventListener() {}, documentElement: {} };
const { initWeekly, updateWeekly, weeklyNote, openWeekly, weeklyDev } = await import('../js/weekly/index.js');

const THURSDAY = Date.parse('2026-11-12T03:00:00Z');
const FRIDAY = Date.parse('2026-11-13T03:00:00Z');

const stateDeps = (box, clock) => ({
  getState: () => box.state,
  setState: (s) => { box.state = s; box.sets += 1; },
  canDo: () => true,
  isGuest: () => false,
  ownsDecor: () => false,
  grantDecorItem: () => true,
  now: () => clock.t,
  requestSave: () => {},
});

test('weeklyDev is null before initWeekly', () => {
  assert.equal(weeklyDev(), null);
});

const devSetup = () => {
  const clock = { t: THURSDAY };
  const box = { state: weeklyDefault(), sets: 0 };
  const saves = { n: 0 };
  const grants = [];
  initWeekly({ ...stateDeps(box, clock), requestSave: () => { saves.n += 1; }, grantDecorItem: (item) => { grants.push(item); return true; } });
  return { box, saves, grants, dev: weeklyDev() };
};

test('weeklyDev tickets sets the balance without saving', () => {
  const { box, saves, dev } = devSetup();
  dev.tickets(7);
  assert.equal(box.state.tickets, 7);
  assert.equal(dev.state().tickets, 7);
  assert.equal(saves.n, 0);
});

test('weeklyDev tickets clamps to the cap and ignores non-integers', () => {
  const { box, dev } = devSetup();
  dev.tickets(99);
  assert.equal(box.state.tickets, TICKET_CAP);
  dev.tickets(-4);
  assert.equal(box.state.tickets, 0);
  dev.tickets(5);
  dev.tickets(2.5);
  assert.equal(box.state.tickets, 5);
});

test('weeklyDev fill makes a quest claimable without saving', () => {
  const { box, saves, dev } = devSetup();
  const id = dev.state().quests[0];
  assert.equal(dev.fill(id), true);
  assert.equal(progressOf(box.state, id).done, true);
  assert.equal(saves.n, 0);
});

test('weeklyDev fill ignores unknown quest ids', () => {
  const { box, dev } = devSetup();
  const before = dev.state();
  assert.equal(dev.fill('nope'), false);
  assert.deepEqual(box.state.counts, before.counts);
  assert.deepEqual(dev.state(), before);
});

test('weeklyDev grant hands out a market item once and leaves tickets alone', () => {
  const { box, grants, dev } = devSetup();
  dev.tickets(3);
  const item = MARKET_THEMES[0].hero;
  assert.equal(dev.grant(item.id), true);
  assert.equal(grants.length, 1);
  assert.equal(grants[0].id, item.id);
  assert.equal(grants[0], item);
  assert.equal(box.state.tickets, 3);
});

test('weeklyDev grant refuses unknown ids', () => {
  const { grants, dev } = devSetup();
  assert.equal(dev.grant('nope'), false);
  assert.equal(grants.length, 0);
});

test('weeklyDev theme names this week\'s market theme and its three items', () => {
  const { dev } = devSetup();
  const t = dev.theme();
  const known = MARKET_THEMES.find(m => m.id === t.id);
  assert.ok(known);
  assert.deepEqual(t.items, [known.hero.id, ...known.props.map(p => p.id)]);
});

test('initWeekly with state-only deps does not throw and notes update the state', () => {
  const clock = { t: THURSDAY };
  const box = { state: weeklyDefault(), sets: 0 };
  assert.doesNotThrow(() => initWeekly(stateDeps(box, clock)));
  const before = box.sets;
  weeklyNote('harvest', 3);
  assert.ok(box.sets > before);
  assert.doesNotThrow(() => updateWeekly(0.016, true, { x: 0, z: 0 }));
});

test('scene work: colliders once, one group, rebuild on the Friday flip, idempotent init', () => {
  const clock = { t: THURSDAY };
  const box = { state: weeklyDefault(), sets: 0 };
  const log = { added: [], removed: [], disposed: [], circles: [], built: [] };
  const scene = { add: (o) => log.added.push(o), remove: (o) => log.removed.push(o) };
  const deps = {
    ...stateDeps(box, clock),
    scene,
    THREE: {},
    solidCircle: (x, z, r) => { const c = { x, z, r, off: false }; log.circles.push(c); return c; },
    buildMarket: (T, { open }) => { const g = { open }; log.built.push(g); return g; },
    disposeMarket: (g) => log.disposed.push(g),
  };
  initWeekly(deps);
  assert.equal(log.circles.length, 3);
  const merchant = log.circles[2];
  assert.equal(merchant.off, true);
  assert.equal(log.added.length, 1);
  assert.equal(log.added[0].open, false);
  for (let i = 0; i < 5; i++) updateWeekly(0.016, true, { x: 0, z: 0 });
  assert.equal(log.added.length, 1);
  assert.equal(log.removed.length, 0);
  clock.t = FRIDAY;
  updateWeekly(0.016, true, { x: 0, z: 0 });
  assert.equal(log.removed.length, 1);
  assert.equal(log.removed[0], log.added[0]);
  assert.deepEqual(log.disposed, [log.added[0]]);
  assert.equal(log.added.length, 2);
  assert.equal(log.added[1].open, true);
  assert.equal(merchant.off, false);
  updateWeekly(0.016, true, { x: 0, z: 0 });
  assert.equal(log.added.length, 2);
  initWeekly(deps);
  assert.equal(log.circles.length, 3);
  const live = log.added.filter((g) => !log.removed.includes(g));
  assert.equal(live.length, 1);
  assert.equal(live[0].open, true);
});

const gate = (over = {}) => ({
  pastOnboarding: () => true, cameraFree: () => true, uiBusy: () => false, cine: () => false, otherGuide: () => false,
  showBanner(burn) { this.banners += 1; burn?.(); }, banners: 0, made: [],
  makeGuide(name) { const g = { name, active: false, ups: 0, start() { g.active = true; }, update() { g.ups += 1; }, cancel() { g.active = false; } }; this.made.push(g); return g; },
  ...over,
});

test('guide starts once, banner once per week, and stops when the dialog is opened', () => {
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
  const clock = { t: FRIDAY };
  const box = { state: weeklyDefault(), sets: 0 };
  const env = gate();
  initWeekly({ ...stateDeps(box, clock), guideEnv: env });
  updateWeekly(0.1, true, { x: 0, z: 0 });
  updateWeekly(0.1, true, { x: 0, z: 0 });
  assert.equal(env.made.length, 1);
  assert.equal(env.made[0].name, 'weekly-market');
  assert.equal(env.made[0].active, true);
  assert.equal(env.banners, 1);
  box.state = { ...box.state, seenMarket: box.state.week };
  updateWeekly(0.1, true, { x: 0, z: 0 });
  assert.equal(env.made[0].active, false);
});

test('lamps follow the night level and stay dim by day', () => {
  const clock = { t: FRIDAY };
  const box = { state: weeklyDefault(), sets: 0 };
  const night = { v: 0 };
  const lamps = [{ emissiveIntensity: 0 }, { emissiveIntensity: 0 }];
  initWeekly({
    ...stateDeps(box, clock), scene: { add() {}, remove() {} }, THREE: {}, solidCircle: () => ({ off: false }),
    buildMarket: () => ({ userData: { lamps } }), disposeMarket() {}, night: () => night.v,
  });
  updateWeekly(0.016, true, FAR);
  const day = lamps[0].emissiveIntensity;
  night.v = 1;
  updateWeekly(0.016, true, FAR);
  assert.ok(lamps[0].emissiveIntensity > day + 1);
  assert.equal(lamps[1].emissiveIntensity, lamps[0].emissiveIntensity);
});

test('arrow yields to another guide but the market banner still shows; onboarding blocks both', () => {
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  const clock = { t: FRIDAY };
  const box = { state: weeklyDefault(), sets: 0 };
  const env = gate({ otherGuide: () => true, cameraFree: () => false });
  initWeekly({ ...stateDeps(box, clock), guideEnv: env });
  updateWeekly(0.1, true, { x: 0, z: 0 });
  assert.equal(env.made.length, 0);
  assert.equal(env.banners, 1);
  const busy = gate({ uiBusy: () => true });
  initWeekly({ ...stateDeps(box, clock), guideEnv: busy });
  updateWeekly(0.1, true, { x: 0, z: 0 });
  assert.equal(busy.banners, 0);
  const env2 = gate({ pastOnboarding: () => false });
  initWeekly({ ...stateDeps(box, clock), guideEnv: env2 });
  updateWeekly(0.1, true, { x: 0, z: 0 });
  assert.equal(env2.made.length, 0);
  assert.equal(env2.banners, 0);
});

test('weekday visit guides to the board with no banner', () => {
  const clock = { t: THURSDAY };
  const box = { state: weeklyDefault(), sets: 0 };
  const env = gate();
  initWeekly({ ...stateDeps(box, clock), guideEnv: env });
  updateWeekly(0.1, true, { x: 0, z: 0 });
  assert.equal(env.made[0].name, 'weekly-board');
  assert.equal(env.banners, 0);
});

const FAR = { x: 0, z: 0 };
const NEXT_FRIDAY = FRIDAY + 7 * 86400000;
const tickN = (n, pos = FAR) => { for (let i = 0; i < n; i++) updateWeekly(0.1, true, pos); };

test('banner shows once when storage throws on every call', () => {
  globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() {} };
  const box = { state: weeklyDefault(), sets: 0 };
  const env = gate();
  initWeekly({ ...stateDeps(box, { t: FRIDAY }), guideEnv: env });
  tickN(30);
  assert.equal(env.banners, 1);
});

test('storage is read at most once and written exactly once', () => {
  const calls = { get: 0, set: 0 };
  globalThis.localStorage = { getItem() { calls.get += 1; return null; }, setItem() { calls.set += 1; }, removeItem() {} };
  const box = { state: weeklyDefault(), sets: 0 };
  const env = gate();
  initWeekly({ ...stateDeps(box, { t: FRIDAY }), guideEnv: env });
  tickN(30);
  assert.ok(calls.get <= 1);
  assert.equal(calls.set, 1);
});

test('a banner shown in one week shows again the next week', () => {
  globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() {} };
  const clock = { t: FRIDAY };
  const box = { state: weeklyDefault(), sets: 0 };
  const env = gate();
  initWeekly({ ...stateDeps(box, clock), guideEnv: env });
  tickN(5);
  clock.t = NEXT_FRIDAY;
  tickN(5);
  assert.equal(env.banners, 2);
});

test('reaching the market without opening it does not mute the guide in a later week', async () => {
  const { MARKET_POS } = await import('../js/data/weekly.js');
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  const clock = { t: FRIDAY };
  const box = { state: weeklyDefault(), sets: 0 };
  const env = gate();
  initWeekly({ ...stateDeps(box, clock), guideEnv: env });
  tickN(2);
  const g = env.made[0];
  g.active = false;
  tickN(2, MARKET_POS);
  assert.equal(g.active, false);
  clock.t = NEXT_FRIDAY;
  tickN(2);
  assert.equal(g.active, true);
});

test('re-init cancels a live guide once and drops it', () => {
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  const box = { state: weeklyDefault(), sets: 0 };
  const env = gate();
  let cancels = 0;
  const make = env.makeGuide;
  env.makeGuide = function (...a) { const g = make.apply(this, a); const c = g.cancel; g.cancel = () => { cancels += 1; c(); }; return g; };
  initWeekly({ ...stateDeps(box, { t: FRIDAY }), guideEnv: env });
  tickN(2);
  assert.equal(env.made[0].active, true);
  const env2 = gate();
  initWeekly({ ...stateDeps(box, { t: FRIDAY }), guideEnv: env2 });
  assert.equal(cancels, 1);
  assert.equal(env.made[0].active, false);
  tickN(2);
  assert.equal(env2.made.length, 1);
});

const saveDeps = (box, clock, saves, over = {}) => ({ ...stateDeps(box, clock), requestSave: () => { saves.n += 1; }, ...over });

test('initWeekly writes no state and never saves', () => {
  const box = { state: weeklyDefault(), sets: 0 };
  const saves = { n: 0 };
  initWeekly(saveDeps(box, { t: THURSDAY }, saves));
  assert.equal(saves.n, 0);
  assert.equal(box.sets, 0);
});

test('initWeekly survives a requestSave that throws', () => {
  const box = { state: weeklyDefault(), sets: 0 };
  const deps = saveDeps(box, { t: THURSDAY }, { n: 0 }, { requestSave: () => { throw new Error('no player'); } });
  assert.doesNotThrow(() => initWeekly(deps));
});

test('rollover happens lazily on update and never saves, including a Monday boundary', async () => {
  const { weekIndex } = await import('../js/weekly/rules.js');
  const clock = { t: THURSDAY };
  const box = { state: weeklyDefault(), sets: 0 };
  const saves = { n: 0 };
  initWeekly(saveDeps(box, clock, saves));
  updateWeekly(0.016, true, FAR);
  assert.equal(box.state.week, weekIndex(THURSDAY));
  assert.equal(box.state.quests.length, 5);
  tickN(30);
  const MONDAY = Date.parse('2026-11-16T03:00:00Z');
  clock.t = MONDAY;
  updateWeekly(0.016, true, FAR);
  assert.equal(box.state.week, weekIndex(MONDAY));
  assert.notEqual(weekIndex(MONDAY), weekIndex(THURSDAY));
  assert.equal(saves.n, 0);
});

test('weeklyNote updates counts without saving', () => {
  const box = { state: weeklyDefault(), sets: 0 };
  const saves = { n: 0 };
  initWeekly(saveDeps(box, { t: THURSDAY }, saves));
  weeklyNote('harvest', 3);
  assert.equal(box.state.counts.harvest, 3);
  assert.equal(saves.n, 0);
});

const looseEl = () => new Proxy(function () {}, {
  get: (_, k) => (k === 'children' ? [] : k === 'style' || k === 'classList' ? looseEl() : k === Symbol.toPrimitive ? () => '' : looseEl()),
  set: () => true,
  apply: () => looseEl(),
});

test('opening the board saves once per week, not on every open', async () => {
  globalThis.document = { createElement: looseEl, createElementNS: looseEl, head: looseEl(), body: looseEl() };
  const { weekIndex } = await import('../js/weekly/rules.js');
  const { BOARD_POS } = await import('../js/data/weekly.js');
  const clock = { t: THURSDAY };
  const box = { state: weeklyDefault(), sets: 0 };
  const saves = { n: 0 };
  initWeekly(saveDeps(box, clock, saves));
  updateWeekly(0.1, true, BOARD_POS);
  const base = box.sets;
  openWeekly();
  openWeekly();
  assert.equal(saves.n, 1);
  assert.equal(box.sets - base, 1);
  assert.equal(box.state.seenBoard, weekIndex(THURSDAY));
  clock.t = THURSDAY + 7 * 86400000;
  updateWeekly(0.1, true, BOARD_POS);
  const saved = saves.n;
  openWeekly();
  openWeekly();
  assert.equal(saves.n, saved + 1);
});

test('opening the market saves once per week, not on every open', async () => {
  const { MARKET_POS } = await import('../js/data/weekly.js');
  const clock = { t: FRIDAY };
  const box = { state: weeklyDefault(), sets: 0 };
  const saves = { n: 0 };
  initWeekly(saveDeps(box, clock, saves));
  updateWeekly(0.1, true, MARKET_POS);
  const base = box.sets;
  openWeekly();
  openWeekly();
  assert.equal(saves.n, 1);
  assert.equal(box.sets - base, 1);
  clock.t = NEXT_FRIDAY;
  updateWeekly(0.1, true, MARKET_POS);
  const saved = saves.n;
  openWeekly();
  openWeekly();
  assert.equal(saves.n, saved + 1);
});
