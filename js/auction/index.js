import * as THREE from 'three';
import {
  $w, _camLook, camera, gameState, heldGroup, isOpen, mgView, nightLevel, npcObjs, obstacles, outdoorMeshes, player,
  refreshHeldTool, refreshInventoryUI, requestSave, scene, snapCamera, solidCircle, todayStr,
} from '../game.js';
import { buildNPCFigure, setNpcHidden } from '../spaces/npc.js';
import { inVillage2 } from '../spaces/doors.js';
import { NPCS } from '../data/npcs.js';
import { OUTDOOR } from '../data/catalog.js';
import { DAY_SPEED } from '../data/world.js';
import { trackEvent } from '../analytics.js';
import { logEcon } from '../metrics.js';
import { t } from '../i18n.js';
import { AUCTION_STAGE, AUCTION_STAGE_R, AUCTION_SPOTS, AUCTION_BIDDERS } from '../data/auction.js';
import { lotFor, joinMode, secondsUntilOpen } from './rules.js';
import { buildAuctionStage } from './stage.js';
import { createActors, faceStage } from './actors.js';
import { createAuctionScene } from './scene.js';
import { createAuctionUi } from './ui.js';
import { auctionItemMesh } from './items.js';
import { auctionCamera } from './layout.js';

export { auctionDefault, restoreAuction } from './rules.js';

const X = AUCTION_STAGE.x, Z = AUCTION_STAGE.z;
const SPOT_R = 2.4;
const SPIN_SPEED = 0.8;
const CAM_EASE = 2.6;
const PROMPTS = { closed: '🔨 경매는 저녁에 열려요', done: '🔨 오늘 경매 끝', bid: '🔨 경매 참가', watch: '🔨 경매 참가' };

let stage = null, panel = null, actors = null, run = null;
let shownDay = '', dayCheck = 0, heldWas = null, hidden = [];
const camGoal = new THREE.Vector3(), lookGoal = new THREE.Vector3(), camLook = new THREE.Vector3();

const catalogDef = id => OUTDOOR.find(d => d.id === id);

const auctionOpen = () => isOpen('merchant');
const openBidders = () => AUCTION_BIDDERS.filter(b => isOpen(b.id));

function modeNow(day) {
  const lot = lotFor(day);
  if (!auctionOpen()) return { lot, coins: 0, mode: 'hidden' };
  const coins = gameState.inventory.coins || 0;
  const mode = joinMode({ t: gameState.timeOfDay, day, lastDate: gameState.auction?.lastDate, coins, start: lot.start });
  return { lot, coins, mode };
}

function ensurePanel() {
  if (panel) return panel;
  const names = Object.fromEntries(AUCTION_BIDDERS.map(b => [b.id, NPCS.find(n => n.id === b.id)?.name || b.id]));
  panel = createAuctionUi({
    t, names,
    itemName: id => catalogDef(id)?.name || id,
    itemIcon: id => catalogDef(id)?.ico || '🔨',
    onJoin: mode => join(mode),
    onBid: inc => run?.playerBid(inc),
    onClose: () => teardown(),
  });
  return panel;
}

export function initAuction() {
  stage = buildAuctionStage(THREE);
  stage.group.position.set(X, 0, Z);
  scene.add(stage.group);
  for (const dx of [-2.4, -0.8, 0.8, 2.4]) solidCircle(X + dx, Z, 0.95);
  solidCircle(X + 1.75, Z + 0.5, 0.6);
  for (const side of [-1, 1]) solidCircle(X + side * 6.4, Z + 4.0, 0.25);
  obstacles.push({ x: X, z: Z, r: AUCTION_STAGE_R });
  shownDay = todayStr();
  stage.setItem(lotFor(shownDay).id);
}

export function updateAuction(dt, inVillage) {
  if (!stage) return;
  stage.group.visible = inVillage;
  if (!run) stage.setNight(nightLevel);
  dayCheck += dt;
  if (dayCheck > 1 && !run) {
    dayCheck = 0;
    const day = todayStr();
    if (day !== shownDay) { shownDay = day; stage.setItem(lotFor(day).id); }
  }
  const lotMesh = stage.pedestal.children[0];
  if (lotMesh?.userData.spin) lotMesh.userData.spin.rotation.y += dt * SPIN_SPEED;
  for (const m of outdoorMeshes) if (m.userData.spin) m.userData.spin.rotation.y += dt * SPIN_SPEED;
}

export function auctionSpotNow() {
  return !!stage && auctionOpen() && inVillage2() && !mgView && Math.hypot(player.position.x - X, player.position.z - (Z + 3.2)) < SPOT_R;
}

export function auctionPrompt() {
  return PROMPTS[modeNow(todayStr()).mode] || '';
}

export function openAuction() {
  const { lot, coins, mode } = modeNow(todayStr());
  if (mode === 'hidden') return;
  if (mode === 'bid' || mode === 'watch') trackEvent('auction_open', { item_id: lot.id, coins });
  ensurePanel().open({ mode, itemId: lot.id, appraisal: lot.appraisal, start: lot.start, coins, secondsToOpen: secondsUntilOpen(gameState.timeOfDay, DAY_SPEED) });
}

function join(mode) {
  try {
    startRun(mode);
  } catch (e) {
    teardown();
    throw e;
  }
}

function startRun(mode) {
  const [mx, mz] = AUCTION_SPOTS.me;
  player.position.x = X + mx;
  player.position.z = Z + mz;
  player.rotation.y = faceStage(mx, mz);
  if (heldGroup) { heldWas = heldGroup.visible; heldGroup.visible = false; }
  const bidders = openBidders();
  const cast = new Set(['merchant', ...bidders.map(b => b.id)]);
  hidden = npcObjs.filter(o => cast.has(o.def.id)).map(o => ({ o, was: !!o.hidden }));
  hidden.forEach(h => setNpcHidden(h.o, true));
  actors = createActors(THREE, { buildFigure: buildNPCFigure, npcDefs: NPCS, parent: stage.group, bidders });
  if ($w.playerArms) actors.attachPlayer($w.playerArms);
  camLook.copy(_camLook);
  $w.mgView = { type: 'auction' };
  run = createAuctionScene({
    getCoins: () => gameState.inventory.coins || 0,
    setCoins: c => { gameState.inventory.coins = c; },
    getStored: () => gameState.outdoorStored || {},
    setStored: s => { gameState.outdoorStored = s; },
    getAuction: () => gameState.auction,
    setAuction: a => { gameState.auction = a; },
    day: () => todayStr(),
    now: () => performance.now() / 1000,
    rng: Math.random,
    bidders,
    getNight: () => nightLevel,
    stage, actors,
    onUi: s => panel.render(s),
    onDone: () => refreshInventoryUI(),
    track: trackEvent,
    econ: logEcon,
    save: requestSave,
  });
  run.begin(mode);
}

let viewKey = '';

function applyViewShift(cam, [sx, sy]) {
  const w = window.innerWidth, h = window.innerHeight;
  const key = `${w}x${h}x${sx}x${sy}`;
  if (key === viewKey) return;
  viewKey = key;
  cam.setViewOffset(w, h, sx, sy, w, h);
}

function aimCamera(dt) {
  const cam = auctionCamera(window.innerWidth, window.innerHeight);
  applyViewShift(camera, cam.shift);
  const k = 1 - Math.exp(-dt * CAM_EASE);
  camGoal.set(X + cam.pos[0], cam.pos[1], Z + cam.pos[2]);
  lookGoal.set(X + cam.look[0], cam.look[1], Z + cam.look[2]);
  camera.position.lerp(camGoal, k);
  camLook.lerp(lookGoal, k);
  camera.lookAt(camLook);
}

export function updateAuctionScene(dt, time) {
  if (!run) { teardown(); return; }
  try {
    for (const h of hidden) if (!h.o.hidden) setNpcHidden(h.o, true);
    run.update(dt, time);
    aimCamera(dt);
  } catch (e) {
    teardown();
    throw e;
  }
}

function teardown() {
  const wasRunning = !!run || !!actors;
  if (run) run.end();
  run = null;
  if (mgView?.type === 'auction') $w.mgView = null;
  if (actors) { actors.detachPlayer(); actors.dispose(); actors = null; }
  if (heldGroup && heldWas !== null) { heldGroup.visible = heldWas; heldWas = null; refreshHeldTool(); }
  hidden.forEach(h => setNpcHidden(h.o, h.was));
  hidden = [];
  if (stage) { stage.focus(-1.25, -0.05); stage.gavel.rotation.z = 0; stage.bell.rotation.z = 0; }
  if (viewKey) { camera.clearViewOffset(); viewKey = ''; }
  if (wasRunning) snapCamera();
  if (panel) panel.close();
}

export function auctionScatterBlocks(x, z) {
  return Math.hypot(x - X, z - (Z + 2)) < AUCTION_STAGE_R + 3.5;
}

export function auctionOutdoorMesh(id) {
  return auctionItemMesh(THREE, id);
}
