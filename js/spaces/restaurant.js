import * as THREE from 'three';
import {
  $w, camera, gameState, makeSignpost, obstacles, player, refreshInventoryUI, requestSave, scene,
  setFogExempt, setSpaceVisible, snapCamera, solidBox, solidCircle, spawnFloatText, ui,
} from '../game.js';
import { trackEvent } from '../analytics.js';
import { logEcon } from '../metrics.js';
import { NPCS } from '../data/npcs.js';
import { buildNPCFigure } from './npc.js';
import { RESTAURANT, RESTAURANT_GATE, RESTAURANT_FACE, HALL, STAR, restaurantLocal, restaurantBox } from '../restaurant/data.js';
import { buildBistro, setBistroEvening } from '../restaurant/exterior.js';
import { buildHall } from '../restaurant/hall.js';
import { grantStarter, panState } from '../restaurant/rules.js';
import { createRestaurantRuntime } from '../restaurant/runtime.js';
import { restaurantGuideSteps, guideStage, shownStep, villageVia, hallVia } from '../restaurant/guide-steps.js';
import { createGuide } from '../guide/runner.js';
import { createGuideView } from '../guide/view.js';
import { createNav } from '../guide/path.js';
import { STOP_SOLIDS } from '../restaurant/nav-solids.js';
import { CAFE_GATE } from '../data/places.js';

export const RESTAURANT_DOOR = restaurantLocal(0, 3.1);
export const restaurantExitSpot = () => restaurantLocal(0, 3.9);
const OUT_HEADING = RESTAURANT_FACE < 0 ? Math.PI : 0;
export const RESTAURANT_COPY = {
  sign: '🍽️ 식당',
  enter: '🍽️ 식당에 들어가기',
  exit: '🚪 나가기',
  empty: '창고에 재료가 없어요. 포구 섬에서 구해 와요',
  starter: '첫 영업 재료를 받았어요 🐟4 🍚4',
  done: '영업 끝!',
  starUp: n => `⭐${n} 식당이 됐어요`,
  chop: '박자에 맞춰 네 번 눌러요',
};

const DBG = typeof location !== 'undefined' && new URLSearchParams(location.search).has('dbg');
const GUEST_POOL = NPCS.filter(d => d.id !== 'courier' && d.id !== 'merchant');
const EXIT_R = 1.2;
const free = new Map();
let exterior = null, hall = null, runtime = null, chopHinted = false;
const stationSolids = [], tableSolids = [];
const projV = new THREE.Vector3();

export function spawnRestaurantGate() {
  const { x, z } = RESTAURANT_GATE;
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = OUT_HEADING;
  exterior = buildBistro(THREE);
  g.add(exterior);
  g.add(makeSignpost(RESTAURANT_COPY.sign, -4.3, 3.0));
  scene.add(g);
  obstacles.push({ x, z, r: 3.4 });
  const box = (x1, z1, x2, z2) => { const b = restaurantBox(x1, z1, x2, z2); solidBox(b.x1, b.z1, b.x2, b.z2); };
  const dot = (lx, lz, r) => { const p = restaurantLocal(lx, lz); solidCircle(p.x, p.z, r); };
  box(-3.3, -2.65, 3.3, 2.45);
  box(-2.75, 2.45, -1.35, 2.8);
  box(1.35, 2.45, 2.75, 2.8);
  for (const s of [-1, 1]) {
    dot(s * 3.35, 2.2, 0.35);
    dot(s * 2, 3.85, 0.75);
    dot(s * 3.25, 4.5, 0.15);
  }
}

function hallSolids() {
  const wx = v => RESTAURANT.x + v, wz = v => RESTAURANT.z + v;
  for (const s of HALL.stations) {
    if (s.kind === 'pass') continue;
    const c = s.kind === 'trash'
      ? solidCircle(wx(s.x), wz(s.z), 0.4)
      : solidBox(wx(s.x - 0.55), wz(s.z - 0.5), wx(s.x + 0.55), wz(s.z + 0.5));
    stationSolids.push({ s, c });
  }
  solidBox(wx(HALL.board.x - 0.62), wz(HALL.board.z - 0.5), wx(HALL.board.x + 0.62), wz(HALL.board.z + 0.35));
  solidBox(wx(0.55), wz(-1.7), wx(1.05), wz(-0.1));
  solidBox(wx(0.65), wz(-4.2), wx(0.95), wz(-1.7));
  solidBox(wx(0.65), wz(0.3), wx(0.95), wz(1.7));
  HALL.tables.forEach(([tx, tz]) => {
    tableSolids.push([solidCircle(wx(tx), wz(tz), 0.78), solidCircle(wx(tx), wz(tz - 1.0), 0.32)]);
  });
}

function syncSolids() {
  const star = gameState.restaurant.star;
  for (const { s, c } of stationSolids) c.off = !!s.need && star < s.need;
  tableSolids.forEach((pair, i) => { for (const c of pair) c.off = i >= STAR[star].tables; });
}

const guestDef = id => GUEST_POOL[(id - 1) % GUEST_POOL.length];

function takeGuest(id) {
  const def = guestDef(id);
  const m = free.get(def.id)?.pop() || buildNPCFigure(def).group;
  m.userData.restGuest = def.id;
  setFogExempt(m, true);
  return m;
}

function releaseGuest(m) {
  const id = m.userData.restGuest;
  if (!id) return;
  if (!free.has(id)) free.set(id, []);
  free.get(id).push(m);
}

function project(p) {
  projV.copy(p).project(camera);
  const on = projV.z < 1 && Math.abs(projV.x) < 1.1 && Math.abs(projV.y) < 1.1;
  return { on, x: (projV.x + 1) / 2 * innerWidth, y: (1 - projV.y) / 2 * innerHeight };
}

export function buildRestaurantHall() {
  hall = buildHall(THREE);
  hall.group.position.set(RESTAURANT.x, 0, RESTAURANT.z);
  hall.group.visible = false;
  scene.add(hall.group);
  setFogExempt(hall.group, true);
  $w.restaurantInGroup = hall.group;
  hallSolids();
  runtime = createRestaurantRuntime({
    THREE, hall, doc: document, player, copy: RESTAURANT_COPY,
    rest: () => gameState.restaurant,
    setRest: r => { gameState.restaurant = r; },
    port: () => gameState.port,
    setPort: p => { gameState.port = p; },
    takeGuest, releaseGuest, project,
    popAt: (p, ico) => spawnFloatText(p.x, p.y, p.z, ico, '#ffffff', 1.1),
    toast: t => ui.toast?.(t),
    earnCoins: n => {
      if (n <= 0) return;
      gameState.inventory.coins = (gameState.inventory.coins || 0) + n;
      logEcon('restaurant_service', 'restaurant', n, gameState.inventory.coins);
      refreshInventoryUI();
    },
    trackEvent, requestSave,
    sessionOpts: () => (restaurantGuideActive() ? { first: true } : {}),
    onChopStart: () => { if (chopHinted) return; chopHinted = true; ui.toast?.(RESTAURANT_COPY.chop); },
    onFinish: () => syncSolids(),
  });
  runtime.refresh();
  syncSolids();
  if (DBG) window.__restaurant = runtime;
}

export function enterRestaurant() {
  $w.atRestaurant = true;
  document.body.classList.add('at-restaurant');
  setFogExempt(player, true);
  const g = grantStarter(gameState.restaurant, gameState.port);
  if (g.given) {
    gameState.restaurant = g.rest;
    gameState.port = g.port;
    ui.toast?.(RESTAURANT_COPY.starter);
    requestSave();
  }
  runtime?.refresh();
  syncSolids();
  player.position.set(RESTAURANT.x + HALL.door.x + 1.2, 0, RESTAURANT.z + HALL.door.z - 0.9);
  player.rotation.y = Math.PI;
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null;
  snapCamera(); setSpaceVisible();
  trackEvent('enter_restaurant');
}

export function exitRestaurant() {
  runtime?.abort();
  $w.atRestaurant = false;
  document.body.classList.remove('at-restaurant');
  setFogExempt(player, false);
  const out = restaurantExitSpot();
  player.position.set(out.x, 0, out.z);
  player.rotation.y = OUT_HEADING;
  $w.nearDoor = null; ui.setDoorPrompt?.(null);
  snapCamera(); setSpaceVisible();
  trackEvent('exit_restaurant');
}

export function nearRestaurantDoor(p) {
  return Math.hypot(p.x - RESTAURANT_DOOR.x, p.z - RESTAURANT_DOOR.z) < 2.2;
}

export function nearRestaurantExit(p) {
  if (runtime?.running()) return false;
  return Math.hypot(p.x - (RESTAURANT.x + HALL.door.x), p.z - (RESTAURANT.z + HALL.door.z + 0.3)) < EXIT_R;
}

export function updateRestaurantInteract() {
  return runtime ? runtime.prompt() : null;
}

export function restaurantAction() {
  return runtime ? runtime.action() : false;
}

export function tickRestaurant(dt) {
  runtime?.frame(dt);
}

export function updateRestaurantNight(k) {
  if (exterior) setBistroEvening(exterior, k);
}

const W = (x, z) => ({ x: RESTAURANT.x + x, y: 0, z: RESTAURANT.z + z });
const STAND = 0.9;
const standAt = s => (s.x > HALL.half.x - 1.2 ? W(s.x - STAND, s.z) : s.z < 0 ? W(s.x, s.z + STAND) : W(s.x, s.z - STAND));
const STATION_AT = Object.fromEntries(HALL.stations.map(s => [s.id, standAt(s)]));
const GUIDE_AT = { door: { ...RESTAURANT_DOOR, y: 0 }, board: W(HALL.board.x, HALL.board.z + STAND + 0.1), crate: STATION_AT.crate_fish, pan: STATION_AT.pan0, plates: STATION_AT.plates, trash: STATION_AT.trash };
const GUIDE_STEPS = restaurantGuideSteps();
const TABLE_AT = HALL.tables.map(([x, z]) => W(x, z - 0.9));
const NAV_R = 35, NAV_MIN_R = 0.5, NAV_STEP = 0.3;
let guide = null, view = null, pointKey = null, villageNav = null;
const navMemo = { x: Infinity, z: Infinity, tx: NaN, tz: NaN, res: null };
const gCtx = { inside: false, running: false, served: 0, held: null, pan: null, stage: 0, at: { ...GUIDE_AT, table: null } };

export const restaurantGuideActive = () => !!guide?.active();

export function maybeStartRestaurantGuide(ok) {
  const r = gameState.restaurant;
  if (!ok || guide || !runtime || r.guideDone || r.services > 0) return;
  view ??= createGuideView({ scene, camera, root: document.body });
  guide = createGuide({
    flow: 'restaurant', steps: GUIDE_STEPS, now: () => performance.now(),
    onStep: e => trackEvent('guide_step', e),
    onDone: () => {
      gameState.restaurant = { ...gameState.restaurant, guideDone: true };
      requestSave(); view.hide(); setPoint(null); guide = null;
      if (DBG) window.__restGuide = { step: null };
    },
  });
}

function guideCtx() {
  const S = runtime.session(), pan = S?.stations.pan0;
  gCtx.inside = $w.atRestaurant;
  gCtx.running = !!S;
  gCtx.served = S?.stats.served ?? 0;
  gCtx.held = S?.held ?? null;
  gCtx.pan = pan?.item ? { flipped: pan.flipped, done: panState(pan.t) !== 'raw' } : null;
  const g = S?.tickets[0] ?? S?.guests.find(x => x.state !== 'leave');
  gCtx.at.table = g ? TABLE_AT[g.table] : null;
  gCtx.stage = guideStage(gCtx);
  return gCtx;
}

const toLocal = p => ({ x: p.x - RESTAURANT.x, z: p.z - RESTAURANT.z });
function hallRoute(me, tgt) {
  const v = hallVia(toLocal(me), toLocal(tgt));
  return v ? W(v.x, v.z) : tgt;
}
const NAV_PAD = 1.3, NAV_CLEAR = 0.3;
const CAFE_SOLIDS = [[{ x: CAFE_GATE.x, z: CAFE_GATE.z - 1.2 }, 4.2], [{ x: CAFE_GATE.x + 3.05, z: CAFE_GATE.z + 0.95 }, 1.2]];
function buildVillageNav() {
  const near = obstacles.filter(o => o.r >= NAV_MIN_R && Math.hypot(o.x - RESTAURANT_DOOR.x, o.z - RESTAURANT_DOOR.z) < NAV_R);
  return createNav([...near.map(o => [{ x: o.x, z: o.z }, o.r]), ...CAFE_SOLIDS, ...STOP_SOLIDS], () => true, { pad: NAV_PAD, clear: NAV_CLEAR });
}
function escapeCafe(me) {
  for (const [c, r] of CAFE_SOLIDS) {
    const d = Math.hypot(me.x - c.x, me.z - c.z);
    if (d > 0 && d < r + NAV_CLEAR) return { x: c.x + (me.x - c.x) / d * (r + NAV_PAD), z: c.z + (me.z - c.z) / d * (r + NAV_PAD) };
  }
  return null;
}
function villageRoute(me, tgt) {
  const out = escapeCafe(me);
  if (out) return out;
  const goal = villageVia(me, RESTAURANT_DOOR) ?? tgt;
  if (navMemo.res && goal.x === navMemo.tx && goal.z === navMemo.tz && Math.hypot(me.x - navMemo.x, me.z - navMemo.z) < NAV_STEP) return navMemo.res;
  villageNav ??= buildVillageNav();
  navMemo.res = villageNav.route({ x: me.x, z: me.z }, { x: goal.x, z: goal.z });
  navMemo.x = me.x; navMemo.z = me.z; navMemo.tx = goal.x; navMemo.tz = goal.z;
  return navMemo.res;
}

function setPoint(k) {
  if (k === pointKey) return;
  pointKey = k;
  document.getElementById('action-btn')?.classList.toggle('point', k === 'btn');
}

const STEP_STATION = { fish: 'crate_fish', pan: 'pan0', flip: 'pan0', take: 'pan0', plate: 'plates', trash: 'trash' };

function wantPoint(step) {
  if (step.id === 'walk') return $w.nearDoor === 'restaurant';
  if (step.id === 'start') return !runtime.running() && !!runtime.prompt();
  const c = runtime.context();
  if (!c) return false;
  return step.id === 'serve' ? c.do === 'serve' : c.id === STEP_STATION[step.id];
}

export function updateRestaurantGuide(visible) {
  if (!guide) return;
  const ctx = guideCtx();
  guide.tick(ctx);
  if (!guide) return;
  const step = shownStep(GUIDE_STEPS, guide.index(), ctx.stage);
  if (!visible || !step) { view.hide(); setPoint(null); return; }
  const idx = step.id === 'trash' ? guide.index() : Math.min(guide.index(), Math.max(0, ctx.stage));
  view.show(step, idx, guide.total, ctx, player.position, ctx.inside ? hallRoute : villageRoute, 0);
  setPoint(wantPoint(step) ? 'btn' : null);
  if (DBG) {
    const t = step.target(ctx), w = t && (ctx.inside ? hallRoute : villageRoute)(player.position, t);
    window.__restGuide = { step: step.id, index: guide.index(), stage: ctx.stage, point: pointKey, target: t ? { x: t.x, z: t.z } : null, via: w ? { x: w.x, z: w.z } : null };
  }
}
