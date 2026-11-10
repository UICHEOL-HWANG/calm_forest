import * as THREE from 'three';
import {
  $w, camera, gameState, makeSignpost, obstacles, player, refreshInventoryUI, requestSave, scene,
  setFogExempt, setSpaceVisible, snapCamera, solidBox, solidCircle, spawnFloatText, ui,
} from '../game.js';
import { trackEvent } from '../analytics.js';
import { logEcon } from '../metrics.js';
import { NPCS } from '../data/npcs.js';
import { buildNPCFigure } from './npc.js';
import { RESTAURANT, RESTAURANT_GATE, HALL, STAR } from '../restaurant/data.js';
import { buildBistro, setBistroEvening } from '../restaurant/exterior.js';
import { buildHall } from '../restaurant/hall.js';
import { grantStarter } from '../restaurant/rules.js';
import { createRestaurantRuntime } from '../restaurant/runtime.js';

export const RESTAURANT_DOOR = { x: RESTAURANT_GATE.x, z: RESTAURANT_GATE.z + 3.1 };
export const RESTAURANT_COPY = {
  sign: '🍽️ 식당',
  enter: '🍽️ 식당에 들어가기',
  exit: '🚪 나가기',
  empty: '창고에 재료가 없어요. 포구 섬에서 구해 와요',
  starter: '첫 영업 재료를 받았어요 🐟4 🍚4',
  done: '영업 끝!',
  starUp: n => `⭐${n} 식당이 됐어요`,
};

const DBG = typeof location !== 'undefined' && new URLSearchParams(location.search).has('dbg');
const GUEST_POOL = NPCS.filter(d => d.id !== 'courier' && d.id !== 'merchant');
const EXIT_R = 1.2;
const free = new Map();
let exterior = null, hall = null, runtime = null;
const stationSolids = [], tableSolids = [];
const projV = new THREE.Vector3();

export function spawnRestaurantGate() {
  const { x, z } = RESTAURANT_GATE;
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  exterior = buildBistro(THREE);
  g.add(exterior);
  g.add(makeSignpost(RESTAURANT_COPY.sign, -4.3, 3.0));
  scene.add(g);
  obstacles.push({ x, z, r: 3.4 });
  solidBox(x - 3.3, z - 2.65, x + 3.3, z + 2.45);
  solidBox(x - 2.75, z + 2.45, x - 1.35, z + 2.8);
  solidBox(x + 1.35, z + 2.45, x + 2.75, z + 2.8);
  for (const s of [-1, 1]) {
    solidCircle(x + s * 3.35, z + 2.2, 0.35);
    solidCircle(x + s * 2, z + 3.85, 0.75);
    solidCircle(x + s * 3.25, z + 4.5, 0.15);
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
    onFinish: () => syncSolids(),
  });
  runtime.refresh();
  syncSolids();
  if (DBG) window.__restaurant = runtime;
}

export function enterRestaurant() {
  $w.atRestaurant = true;
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
  setFogExempt(player, false);
  player.position.set(RESTAURANT_DOOR.x, 0, RESTAURANT_DOOR.z + 0.8);
  player.rotation.y = 0;
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
