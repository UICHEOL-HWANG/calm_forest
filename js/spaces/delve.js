import {
  $w, atMine, dexDiscover, dist2D, firstHint, isOpen, doPlayerAction, gameState, player, questEvent, refreshInventoryUI, requestSave, scene,
  removeSolid, setSpaceVisible, situation, snapCamera, solidCircle, spawnDust, spawnFloatText, spawnSparkle, ui, todayStr,
} from '../game.js';
import { trackEvent } from '../analytics.js';
import { weeklyNote } from '../weekly/index.js';
import { DELVE, MINE, MINE_HALF } from '../data/places.js';
import { DELVE_HALF, DELVE_CHEST_FLOORS, PEST_COPY, PEST_LINES, PESTS, VEIN_HP, SOFT_WINDOW } from '../data/delve.js';
import {
  floorSeed, layoutFloor, ladderRevealed, themeOf, oreOdds, rollOre, makeRng, noteReach, oreAllowed, markOreFloor,
  bumpCount, canDescendFrom0, stopsOpen, liftPanelRows, bumpJob, jobProgress, reclaimGive, stepView, claimStep, noteChest, jobFor, hashSeed, chestSpot,
} from '../delve/rules.js';
import { rollChest, chestGive } from '../boat-chest.js';
import { makeChestMesh } from '../boat-chest-art.js';
import { jobCard, owedMinerRewards, minerTalk } from '../delve/miner-card.js';
import { playMinerLines, advanceMinerTalk, minerTalkOpen, closeMinerTalk } from '../delve/miner-talk.js';
import { createPest, stepPest, tapPest, baitPest, canPick, pushOffPlayer, catchAtBreak, counterFor, grabChunk, floorTally, darkPest, plugPest, softOk, rollerAtBreak, mimicSpot, repelPest, softPeriodFor, ringSecFor, peekWake, plugReady, TAP_R, BAIT_R, DARK_R, DOZE_NEAR, PICK_R } from '../delve/pests.js';
import { newStreak, streakStep } from '../delve/streak.js';
import { pestSfx } from '../delve/pest-sfx.js';
import { heartCount, tacticCues, streakCues, badgeFor } from '../delve/pest-rounds.js';
import { bindTactics, tickTactic, tickFloorTactics, bounceChunk, startShuffle, screenRight, layTrail, decoyNear, digDecoy, sfxLater } from '../delve/pest-tactics.js';
import { makePest, makeOreChunk, makePuddle, makeBurrow, makeRing, makeBait, makeShaft, makeLadderUp, makeRock, makeLift, emojiBubble, makeGlowCrystal, makeMoleHole } from '../delve/pest-art.js';
import { makeMiner } from '../delve/miner.js';
import { makeStateBadge, makeGroundGlow, makeHearts, makeGift } from '../delve/state-badge.js';
import { badgePop, badgeBob, heartsCenterY } from '../delve/badge-math.js';
import { placeRootShrine, clearRootShrine } from '../delve/root-scene.js';
import { openLiftPanel } from '../delve/lift-panel.js';
import { Sound } from '../sound.js';
import * as THREE from 'three';

let run = null;
let group = null;
let visitN = 0;
let liftMesh = null;
let minerMesh = null;
let minerSolid = null;
let spareLamp = null;
let liftSolids = [];
let roomSolids = [];
const ROCK_R = 0.35;
const CHEST_R = 0.55;
let ride = null;
const LIFT_SOLIDS = [[-1.1, 0, 0.22], [1.1, 0, 0.22], [1.55, 0, 0.4], [0, 0, 0.9]];
const RIDE = { sink: 1.5, fade: 1.05, hold: 0.7 };
const bumpTodayJob = () => { gameState.delve = bumpJob(gameState.delve, todayStr()); };
export function delveJobProgress() { return jobProgress(gameState.delve, todayStr()); }
const lineSec = () => (gameState.delve.startedAt ? Math.max(0, Math.round((Date.now() - gameState.delve.startedAt) / 1000)) : 0);

export function delveFloorNow() { return run ? run.floor : 0; }

export function delveGuideSpots() {
  return { miner: minerMesh?.position || null, lift: liftMesh?.position || null };
}

export function delveMinimapMarks() {
  if (!run) return [];
  const a = run.layout.arrival, marks = [{ x: DELVE.x + a.x, z: DELVE.z + a.z - 1, c: '#c8905a', kind: 'exit' }];
  if (run.ladderShown) marks.push({ x: DELVE.x + run.layout.ladderAt.x, z: DELVE.z + run.layout.ladderAt.z, c: '#ffe48a', r: 3.2 });
  if (run.chest) marks.push({ x: DELVE.x + run.chest.at.x, z: DELVE.z + run.chest.at.z, c: '#f0c04a', r: 2.8 });
  return marks;
}

const W = (lx, lz) => new THREE.Vector3(DELVE.x + lx, 0, DELVE.z + lz);
const L = (pos) => ({ x: pos.x - DELVE.x, z: pos.z - DELVE.z });
const FLOOR_Y = 0.15;
const MINER_R = 0.5;

export function placeLift() {
  if (liftMesh) return;
  liftMesh = makeLift();
  liftMesh.position.set(MINE.x + 5, FLOOR_Y, MINE.z - MINE_HALF + 4);
  scene.add(liftMesh);
  liftSolids = LIFT_SOLIDS.map(([x, z, r]) => solidCircle(liftMesh.position.x + x, liftMesh.position.z + z, r));
  placeMiner();
}

function placeMiner() {
  if (minerMesh) return;
  minerMesh = makeMiner();
  minerMesh.position.set(MINE.x + 1.6, FLOOR_Y, MINE.z - MINE_HALF + 4.2);
  minerMesh.rotation.y = 0.4;
  scene.add(minerMesh);
  minerSolid = solidCircle(minerMesh.position.x, minerMesh.position.z, MINER_R);
  syncMinerPresence();
}

function syncMinerPresence() {
  if (!minerMesh) return;
  const here = isOpen('miner');
  minerMesh.visible = here;
  if (minerSolid) minerSolid.off = !here;
}

export function settleMinerRewards() {
  const owed = owedMinerRewards(gameState.delve, gameState.cosmetics.owned);
  for (const id of owed.cosmetic) $w.grantCosmetic?.(id);
  for (const id of owed.decor) {
    if ($w.grantDecor?.(id)) gameState.delve = { ...gameState.delve, granted: { ...gameState.delve.granted, [id]: true } };
  }
}

function disposeObj(root) {
  root.traverse(o => {
    if (o.isInstancedMesh) o.dispose();
    o.geometry?.dispose();
    for (const m of [o.material].flat().filter(Boolean)) { m.map?.dispose(); m.emissiveMap?.dispose(); m.dispose(); }
  });
}

function clearRoom() {
  clearRootShrine();
  roomSolids.forEach(removeSolid);
  roomSolids = [];
  if (group) { disposeObj(group); scene.remove(group); }
  group = null;
}

function buildRoom(floor, layout) {
  clearRoom();
  const theme = themeOf(floor);
  group = new THREE.Group();
  const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(DELVE_HALF * 2 + 2, 0.2, DELVE_HALF * 2 + 2), new THREE.MeshStandardMaterial({ color: theme.floor, roughness: 1 }));
  floorMesh.position.copy(W(0, 0)); floorMesh.position.y = 0.05; floorMesh.receiveShadow = true; group.add(floorMesh);
  const wallGeo = new THREE.IcosahedronGeometry(1, 0), wallMat = new THREE.MeshStandardMaterial({ color: theme.rock, roughness: 1, flatShading: true });
  const spots = [];
  for (let t = -DELVE_HALF; t <= DELVE_HALF; t += 1.1) {
    for (const [x, z] of [[t, DELVE_HALF + 0.3], [t, -DELVE_HALF - 0.3], [DELVE_HALF + 0.3, t], [-DELVE_HALF - 0.3, t]]) spots.push({ x, z, t, lip: z > DELVE_HALF });
  }
  const walls = new THREE.InstancedMesh(wallGeo, wallMat, spots.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), at = new THREE.Vector3();
  spots.forEach(({ x, z, t, lip }, i) => {
    at.copy(W(x, z)); at.y = lip ? 0.3 : 1;
    sc.set(0.9, lip ? 0.4 : 1.6 + Math.abs(Math.sin(t * 3 + x)) * 0.8, 0.9);
    walls.setMatrixAt(i, m4.compose(at, q, sc));
  });
  group.add(walls);
  const up = makeLadderUp(); up.position.copy(W(layout.arrival.x, layout.arrival.z - 1)); up.position.y = FLOOR_Y; group.add(up);
  const light = new THREE.PointLight(0xffb866, 2.0, 18, 1.2); light.position.copy(W(0, 0)); light.position.y = 4; group.add(light);
  run.light = light;
  spareLamp = new THREE.PointLight(0xffb866, 0, 6, 1.3); group.add(spareLamp);
  run.rockMeshes = layout.rocks.map(r => { const m = makeRock(r.vein && run.oreOk, theme); m.position.copy(W(r.x, r.z)); m.position.y = FLOOR_Y; m.userData.hp = r.vein && run.oreOk ? VEIN_HP : 3; group.add(m); const s = solidCircle(m.position.x, m.position.z, ROCK_R); roomSolids.push(s); m.userData.solid = s; return m; });
  for (const p of layout.puddles) { const m = makePuddle(0.85); m.position.copy(W(p.x, p.z)); m.position.y = FLOOR_Y; group.add(m); }
  for (const b of layout.burrows) { const m = makeBurrow(); m.position.copy(W(b.x, b.z)); m.position.y = FLOOR_Y; group.add(m); }
  scene.add(group);
}

function spawnPests(layout) {
  run.pests = layout.pests.map((kind, i) => {
    const home = layout.burrows[i];
    const at = kind === 'axolotl' && layout.puddles[0] ? layout.puddles[0] : home;
    return pestEntry(createPest(kind, at, home, { asleep: !run.oreOk }), i);
  });
  if (layout.pests.includes('moth')) {
    const far = DELVE_HALF - 1.2;
    run.lureAt = { x: layout.arrival.x > 0 ? -far : far, z: far };
    const crystal = makeGlowCrystal();
    crystal.position.copy(W(run.lureAt.x, run.lureAt.z)); crystal.position.y = FLOOR_Y;
    group.add(crystal);
  }
}

function pestEntry(sim, i) {
  const kind = sim.kind, art = makePest(kind, { submerged: kind === 'axolotl' });
  const top = new THREE.Box3().setFromObject(art.g).max.y;
  group.add(art.g);
  const hole = kind === 'mole' ? makeMoleHole() : null;
  if (hole) { hole.visible = false; group.add(hole); }
  return { sim, art, top, hole, tilt: (i % 2 ? 1 : -1) * 0.05, met: false, bubble: null, glow: null, badgeRef: null, bubbleAge: 0, hearts: null, heartN: 0 };
}

bindTactics({ W, Y: FLOOR_Y, dispose: disposeObj, run: () => run, group: () => group, scoreStreak, newPest: pestEntry });

export function enterFloor(floor, via) {
  const date = todayStr();
  const layout = layoutFloor({ seed: floorSeed(date, floor, visitN++), floor });
  const oreOk = oreAllowed(gameState.delve, date, floor);
  const prevSec = run ? Math.round((performance.now() - run.enteredAt) / 1000) : 0, prevRocks = run ? run.broken : 0;
  const prev = closeFloorTally();
  run = { enteredAt: performance.now(), floor, layout, oreOk, broken: 0, ladderShown: false, chunks: [], carried: new Map(), stash: [], ore: 0, chunkN: 0, trail: null, kept: 0, lost: 0, lurkAt: null, soft: null, softRing: null, lureAt: null, streak: newStreak(), gifts: [], wasDark: false };
  buildRoom(floor, layout);
  spawnPests(layout);
  run.chest = null;
  if (DELVE_CHEST_FLOORS.includes(floor) && !gameState.delve.chests[floor]) {
    const mesh = makeChestMesh({ buoy: false });
    const at = chestSpot(layout.ladderAt, DELVE_HALF);
    mesh.position.copy(W(at.x, at.z)); mesh.position.y = FLOOR_Y; group.add(mesh);
    run.chest = { at, mesh, solid: solidCircle(mesh.position.x, mesh.position.z, CHEST_R) };
    roomSolids.push(run.chest.solid);
  }
  gameState.delve = noteReach(gameState.delve, floor);
  if (oreOk) gameState.delve = markOreFloor(gameState.delve, date, floor);
  player.position.copy(W(layout.arrival.x, layout.arrival.z));
  player.rotation.y = 0;
  $w.nearDoor = null; ui.setDoorPrompt?.(null); snapCamera(); setSpaceVisible();
  if (layout.shrine) { const at = W(layout.shrine.x, layout.shrine.z); at.y = FLOOR_Y; placeRootShrine(group, at, themeOf(floor), layout.shrine.x > 0 ? 1 : -1, spareLamp); }
  trackEvent('delve_floor', { floor, via, stops: stopsOpen(gameState.delve).length, sec: prevSec, rocks: prevRocks, kept: prev.kept, lost: prev.lost });
  if (via === 'ladder') weeklyNote('delve');
  const depleted = '⛏️ 이 층 광맥은 오늘 다 캤어요. 내일 다시 차올라요';
  if (prev.any) ui.toast?.(prev.line, 3200);
  if (!oreOk && prev.any) { const here = run; setTimeout(() => { if (run === here) ui.toast?.(depleted, 3200); }, 3300); }
  else if (!oreOk) ui.toast?.(depleted, 3200);
  $w.refreshQuestPanel?.();
}

function rideLift(floor) {
  if (ride || !liftMesh || !atMine || run) return;
  trackEvent('delve_enter', { floor, stops: stopsOpen(gameState.delve).length });
  $w.sleeping = true;
  $w.nearDoor = null; ui.setDoorPrompt?.(null);
  for (const s of liftSolids) s.off = true;
  player.position.set(liftMesh.position.x, FLOOR_Y, liftMesh.position.z);
  player.rotation.y = 0;
  Sound.blip?.();
  ride = { floor, t: 0, faded: false };
}

function endRide() {
  ride = null;
  $w.sleeping = false;
  liftMesh.userData.setRide(0);
  for (const s of liftSolids) s.off = false;
  player.position.y = 0;
}

function tickLift(dt) {
  if (!ride) return;
  if (!atMine) { endRide(); ui.sleepFade?.(0); return; }
  ride.t += dt;
  const { cage, setRide } = liftMesh.userData;
  setRide(Math.min(1, ride.t / RIDE.sink));
  player.position.y = FLOOR_Y + cage.position.y;
  if (!ride.faded && ride.t >= RIDE.fade) { ride.faded = true; ui.sleepFade?.(1); }
  if (ride.t < RIDE.sink + RIDE.hold) return;
  const floor = ride.floor;
  endRide();
  try { enterFloor(floor, 'lift'); } finally { ui.sleepFade?.(0); }
}

function closeFloorTally() {
  if (!run) return { kept: 0, lost: 0, any: false, best: 0, line: '' };
  const t = floorTally({ kept: run.kept, lost: run.lost, pending: run.stash.length + run.carried.size, best: run.streak.best });
  return { ...t, best: run.streak.best, line: PEST_LINES.result(run.floor, t.kept, t.lost, run.streak.best) };
}

export function leaveToFloor0(reason) {
  const t = closeFloorTally();
  trackEvent('delve_exit', { floor: delveFloorNow(), reason, ore: run?.ore || 0, kept: t.kept, lost: t.lost, best: t.best });
  clearRoom(); run = null;
  if (t.any) ui.toast?.(t.line, 3200);
  player.position.set(MINE.x + 5, 0, MINE.z - MINE_HALF + 5.5);
  $w.nearDoor = null; ui.setDoorPrompt?.(null); snapCamera(); setSpaceVisible();
}

export function clampDelve(pos) {
  const h = DELVE_HALF - 0.7;
  pos.x = Math.max(DELVE.x - h, Math.min(DELVE.x + h, pos.x));
  pos.z = Math.max(DELVE.z - h, Math.min(DELVE.z + h, pos.z));
}

function nearestRock(maxD) {
  let best = -1, bd = maxD;
  run.layout.rocks.forEach((r, i) => {
    if (!run.rockMeshes[i].visible) return;
    const d = dist2D(W(r.x, r.z), player.position);
    if (d < bd) { bd = d; best = i; }
  });
  return best;
}

function dropChunk(lx, lz, ore) {
  const mesh = makeOreChunk(); mesh.position.copy(W(lx, lz)); mesh.position.y = FLOOR_Y + 0.12; group.add(mesh);
  const ring = makeRing(0.5); ring.position.copy(W(lx, lz)); ring.position.y = FLOOR_Y + 0.02; ring.visible = false; group.add(ring);
  const c = { id: `c${run.chunkN++}`, x: lx, z: lz, age: 0, ore, mesh, ring };
  run.chunks.push(c);
  if (batAlive()) { pestSfx('ringdrop'); bounceChunk(c, liveBat().sim); }
  return c;
}

function carryOff(p, c, line = PEST_COPY[p.sim.kind].took, cues = ['snatch']) {
  run.chunks = run.chunks.filter(x => x !== c);
  group.remove(c.ring); disposeObj(c.ring);
  run.carried.set(c.id, c);
  p.grabAt = { x: c.x, z: c.z };
  ui.toast?.(line, 2400);
  cues.forEach(pestSfx);
  scoreStreak(false);
}

const rollHere = (k) => rollOre(makeRng((Date.now() ^ (k * 2654435761)) >>> 0), oreOdds(run.floor, situation().weather));

function grantOre(ore, x, z, label) {
  gameState.inventory[ore] = (gameState.inventory[ore] || 0) + 1;
  run.ore++;
  refreshInventoryUI();
  spawnFloatText(x, 1.4, z, label, ore === 'gem' ? '#5ad0e0' : '#cfc8b8');
  dexDiscover('ore', ore);
  questEvent('mine', 1);
}

function scoreStreak(ok) {
  const prev = run.streak.cur, step = streakStep(run.streak, ok);
  run.streak = { cur: step.cur, best: step.best };
  streakCues(prev, step).forEach(pestSfx);
  if (step.bonus) {
    grantOre(rollHere(run.chunkN + 7), player.position.x, player.position.z, '✨+1');
    ui.toast?.(PEST_LINES.bonus(step.cur), 2400);
  }
  return step.cur;
}

function dropGift(e) {
  const mesh = makeGift(); mesh.position.copy(W(e.x, e.z)); mesh.position.y = FLOOR_Y + 0.4; group.add(mesh);
  run.gifts = [...run.gifts, { x: e.x, z: e.z, mesh }];
}

function pickGift(g) {
  run.gifts = run.gifts.filter(x => x !== g);
  group.remove(g.mesh); disposeObj(g.mesh);
  Sound.harvest();
  grantOre(rollHere(run.chunkN + 13), g.mesh.position.x, g.mesh.position.z, '+1');
}

function spitChunk(e) {
  const c = run.carried.get(e.chunkId);
  if (!c) return;
  run.carried.delete(e.chunkId); group.remove(c.mesh); disposeObj(c.mesh);
  dropChunk(e.x, e.z, c.ore);
}

function repel(p, was) {
  const round = p?.sim.round || 0;
  if (!p) return { round, streak: scoreStreak(true) };
  const before = p.sim.grit, { pest, events } = repelPest(p.sim);
  p.sim = pest;
  if (pest.grit === before) return { round, streak: run.streak.cur };
  const streak = scoreStreak(true);
  pestSfx('heart');
  for (const e of events) {
    if (e.type === 'spit') spitChunk(e);
    if (e.type !== 'gift') continue;
    dropGift(e);
    ui.toast?.(PEST_LINES.giveup(PESTS[e.kind].name), 2800);
    sfxLater(300, 'giveUp'); sfxLater(650, 'gift');
    trackEvent('pest_counter', { pest: e.kind, method: 'giveup', ok: 1, state: was, round, streak });
  }
  return { round, streak };
}

function showLadder() {
  run.ladderShown = true;
  const s = makeShaft(); s.position.copy(W(run.layout.ladderAt.x, run.layout.ladderAt.z)); s.position.y = FLOOR_Y; group.add(s);
  const lr = run.rockMeshes[run.layout.ladderRock]; if (lr) { lr.visible = false; removeSolid(lr.userData.solid); }
  spawnSparkle(s.position.x, 0.6, s.position.z, 18);
  ui.toast?.('🪜 아래로 가는 길이 보여요');
}

export function tryDelveMine() {
  const i = nearestRock(2.4);
  if (i < 0) { ui.toast?.('가까운 바위가 없어요 ⛏️'); return; }
  const r = run.layout.rocks[i], m = run.rockMeshes[i];
  doPlayerAction(m.position.x, m.position.z);
  Sound.chop(); spawnDust(m.position.x, m.position.z, 8);
  m.userData.hp -= 1;
  const ore = r.vein && run.oreOk;
  if (ore) run.lurkAt = { x: r.x, z: r.z };
  if (ore && m.userData.hp === 1) run.soft = { i, since: performance.now() };
  if (ore) wakePeeker(i);
  if (m.userData.hp > 0) return;
  breakRock(i, false);
}

function breakRock(i, soft) {
  const r = run.layout.rocks[i], m = run.rockMeshes[i];
  m.visible = false;
  removeSolid(m.userData.solid);
  run.broken++;
  run.soft = null;
  if (!run.ladderShown && ladderRevealed({ broken: run.broken, hitLadderRock: i === run.layout.ladderRock })) showLadder();
  if (!(r.vein && run.oreOk)) return false;
  run.lurkAt = null;
  const c = dropChunk(r.x, r.z, rollHere(i));
  const at = { x: r.x, z: r.z }, sims = run.pests.map(p => p.sim);
  const k = catchAtBreak(sims, at, { soft });
  if (k >= 0) { const p = run.pests[k]; if (p.sim.state === 'doze') pestSfx('wake'); p.sim = grabChunk(p.sim, c.id); carryOff(p, c); return true; }
  const ri = rollerAtBreak(sims, at);
  if (ri >= 0) { const s = mimicSpot(c, screenRight(), q => run.layout.rocks.some((o, j) => run.rockMeshes[j].visible && Math.hypot(o.x - q.x, o.z - q.z) < ROCK_R + 0.4) || dist2D(W(q.x, q.z), player.position) < PICK_R + 0.3), p = run.pests[ri]; p.sim = { ...p.sim, state: 'mimic', x: s.x, z: s.z, mimicOf: c.id, spot: null }; pestSfx('curl'); startShuffle(p, c); }
  return false;
}

const dozerNear = (i) => {
  const r = run.layout.rocks[i];
  return run.pests.find(p => p.sim.state === 'doze' && Math.hypot(p.sim.x - r.x, p.sim.z - r.z) <= DOZE_NEAR);
};
const dozerAt = (i) => !!dozerNear(i);

function wakePeeker(i) {
  const p = dozerNear(i), next = p && peekWake(p.sim, p.peek);
  if (!next) return false;
  p.sim = next;
  ui.toast?.(PEST_LINES.peek, 2400); pestSfx('wake'); scoreStreak(false);
  return true;
}

const liveBat = () => run.pests.find(p => p.sim.kind === 'bat' && p.sim.grit > 0 && !['gone', 'sleep'].includes(p.sim.state));
const batAlive = () => !!liveBat();
const batRingSec = () => ringSecFor(liveBat()?.sim || {});

function pickUp(c) {
  run.chunks = run.chunks.filter(x => x !== c);
  for (const o of [c.mesh, c.ring]) { group.remove(o); disposeObj(o); }
  gameState.inventory[c.ore] = (gameState.inventory[c.ore] || 0) + 1;
  run.ore++;
  run.kept++;
  refreshInventoryUI();
  Sound.harvest();
  spawnFloatText(c.mesh.position.x, 1.4, c.mesh.position.z, `+1`, c.ore === 'gem' ? '#5ad0e0' : '#cfc8b8');
  questEvent('mine', 1);
  dexDiscover('ore', c.ore);
  if (batAlive() && c.age < batRingSec()) {
    gameState.delve = bumpCount(gameState.delve, 'grab');
    const bat = liveBat(), was = bat.sim.state, { round, streak } = repel(bat, was);
    trackEvent('pest_counter', { pest: 'bat', method: 'grab', ok: 1, state: was, round, streak });
  }
  const j = jobFor(todayStr());
  if (gameState.delve.stage >= 8 && j.kind === 'ore' && run.floor >= j.floorMin) bumpTodayJob();
}

const TALK_CLOSE_R = 4;
let minerBubble = null;

function syncMinerBubble() {
  const k = minerTalk(gameState.delve, gameState.inventory)?.kind;
  const want = k === 'meet' ? '❗' : k === 'claim' ? '✅' : null;
  if ((minerBubble?.userData.txt || null) === want) return;
  if (minerBubble) { minerMesh.remove(minerBubble); minerBubble.material.map.dispose(); minerBubble.material.dispose(); minerBubble = null; }
  if (!want) return;
  minerBubble = emojiBubble(want, 0.7);
  minerBubble.userData.txt = want;
  minerBubble.position.set(0, 1.9, 0);
  minerMesh.add(minerBubble);
}

export function delvePrompt() {
  if (!run) {
    syncMinerPresence();
    if (minerMesh?.visible) {
      syncMinerBubble();
      const d = dist2D(minerMesh.position, player.position);
      if (minerTalkOpen() && d > TALK_CLOSE_R) closeMinerTalk();
      if (minerTalkOpen()) return { nd: 'delve_talk_next', prompt: '▶' };
    }
    if (minerMesh?.visible && dist2D(minerMesh.position, player.position) < 1.8) {
      if (jobCard(gameState.delve, gameState.inventory, true, todayStr(), delveJobProgress())?.ready) return { nd: 'delve_job_claim', prompt: '⛏️ 광부 아저씨 · 받기' };
      const k = minerTalk(gameState.delve, gameState.inventory)?.kind;
      if (k === 'claim') return { nd: 'delve_miner_claim', prompt: '⛏️ 광부 아저씨 · 받기' };
      if (k) return { nd: 'delve_miner_talk', prompt: '💬 광부 아저씨와 대화' };
    }
    if (liftMesh && dist2D(liftMesh.position, player.position) < 2.0) {
      return canDescendFrom0(gameState.delve) ? { nd: 'delve_lift', prompt: '🛗 승강기 타기' } : { nd: 'delve_lift_locked', prompt: '🛗 승강기 고장' };
    }
    return null;
  }
  const lp = L(player.position);
  const near = (p, r) => Math.hypot(lp.x - p.x, lp.z - p.z) < r;
  if (near({ x: run.layout.arrival.x, z: run.layout.arrival.z - 1 }, 1.6)) return { nd: 'delve_up', prompt: '🪜 올라가기' };
  if (run.ladderShown && near(run.layout.ladderAt, 1.6)) return run.floor >= 20 ? { nd: 'delve_bottom', prompt: '🪜 가장 깊은 곳' } : { nd: 'delve_down', prompt: '🪜 내려가기' };
  if (run.chest && near(run.chest.at, 1.6)) return { nd: 'delve_chest', prompt: '🧰 상자 열기' };
  for (const p of run.pests) {
    if (counterFor(p.sim) === 'tap' && near(p.sim, TAP_R)) return { nd: 'delve_tap', prompt: PEST_COPY.axolotl.prompt };
    if (counterFor(p.sim) === 'bait' && near(p.sim, BAIT_R)) return { nd: 'delve_bait', prompt: PEST_COPY.crab.prompt };
    if (counterFor(p.sim) === 'dark' && near(p.sim, DARK_R)) return { nd: 'delve_dark', prompt: PEST_COPY.moth.prompt };
    if (plugReady(p.sim, lp)) return { nd: 'delve_plug', prompt: PEST_COPY.mole.prompt };
  }
  if (run.soft && run.rockMeshes[run.soft.i].visible && dozerAt(run.soft.i) && near(run.layout.rocks[run.soft.i], 2.4)) return { nd: 'delve_soft', prompt: PEST_COPY.dormouse.prompt };
  if (run.stash.length && decoyNear(lp, 1.4)) return { nd: 'delve_dig_decoy', prompt: PEST_COPY.grub.prompt };
  if (run.stash.length && run.layout.burrows.some(b => near(b, 1.4))) return { nd: 'delve_dig', prompt: PEST_COPY.grub.prompt };
  return null;
}

export function handleDelveDoor(nd) {
  if (nd === 'delve_job_claim') {
    const jc = jobCard(gameState.delve, gameState.inventory, true, todayStr(), delveJobProgress());
    if (jc?.ready) {
      gameState.delve = { ...gameState.delve, jobDate: todayStr() };
      gameState.inventory.gem = (gameState.inventory.gem || 0) + 1;
      gameState.inventory.crystal = (gameState.inventory.crystal || 0) + 1;
      refreshInventoryUI(); requestSave(); ui.toast?.('⛏️ 오늘 일감 끝! 💎 +1 · 🔮 +1');
      trackEvent('delve_step', { step: 'job', stage: 8, sec: lineSec() });
      $w.refreshQuestPanel?.();
    }
    return true;
  }
  if (nd === 'delve_chest') {
    if (!run?.chest) return true;
    const loot = chestGive(rollChest(hashSeed(`delvechest:${todayStr()}:${run.floor}`)), { unlocked: false });
    for (const [k, v] of Object.entries(loot.give)) gameState.inventory[k] = (gameState.inventory[k] || 0) + v;
    removeSolid(run.chest.solid); group.remove(run.chest.mesh); disposeObj(run.chest.mesh); run.chest = null;
    gameState.delve = noteChest(gameState.delve, run.floor);
    refreshInventoryUI(); requestSave();
    ui.toast?.(`🧰 ${loot.name}`);
    trackEvent('delve_chest', { floor: run.floor, loot: loot.id });
    $w.refreshQuestPanel?.();
    return true;
  }
  if (nd === 'delve_talk_next') { advanceMinerTalk(); return true; }
  if (nd === 'delve_miner_talk') {
    const m = minerTalk(gameState.delve, gameState.inventory);
    if (!m) return true;
    if (m.kind === 'meet') {
      playMinerLines(m.lines, () => {
        gameState.delve = { ...gameState.delve, started: true, startedAt: Date.now() };
        requestSave();
        trackEvent('delve_step', { step: 'meet', stage: gameState.delve.stage, sec: 0 });
        $w.refreshQuestPanel?.();
      });
    } else {
      playMinerLines(m.lines.map((l, i) => (i === m.lines.length - 1 ? `${l} ${m.progress}` : l)));
    }
    return true;
  }
  if (nd === 'delve_miner_claim') {
    const c = claimStep(gameState.delve, gameState.inventory);
    if (!c) return true;
    gameState.delve = c.delve;
    Object.assign(gameState.inventory, c.inv);
    settleMinerRewards();
    refreshInventoryUI();
    requestSave();
    trackEvent('delve_step', { step: c.stepId, stage: c.delve.stage, sec: lineSec() });
    $w.refreshQuestPanel?.();
    playMinerLines(minerTalk.next(c.delve.stage));
    return true;
  }
  if (nd === 'delve_lift_locked') { ui.toast?.(isOpen('miner') ? '🛗 승강기가 고장 났어요. 광부 아저씨에게 가 봐요' : '🛗 승강기가 고장 났어요. 세계수 ⛏️ 광산의 가지를 채우면 광부 아저씨가 돌아와요', 3600); return true; }
  if (nd === 'delve_lift') {
    const rows = liftPanelRows(gameState.delve);
    if (rows.filter(r => r.open).length === 1) { rideLift(1); return true; }
    openLiftPanel(rows, rideLift);
    return true;
  }
  if (nd === 'delve_up') { leaveToFloor0('ladder'); return true; }
  if (nd === 'delve_down') { enterFloor(run.floor + 1, 'ladder'); return true; }
  if (nd === 'delve_bottom') { ui.toast?.('🪜 여기가 가장 깊은 곳이에요'); return true; }
  if (nd === 'delve_tap') {
    const lp = L(player.position);
    for (const p of run.pests) {
      const was = p.sim.state;
      const r = tapPest(p.sim, lp);
      if (!r) continue;
      p.sim = r.pest;
      r.events.forEach(spitChunk);
      const axo = p.sim.kind === 'axolotl';
      if (axo) gameState.delve = bumpCount(gameState.delve, 'tap');
      if (axo || r.events.length) ui.toast?.(r.events.length ? PEST_LINES.spat : PEST_LINES.ran, 2400);
      pestSfx('tap'); pestSfx('startle');
      const { round, streak } = repel(p, was);
      trackEvent('pest_counter', { pest: p.sim.kind, method: 'tap', ok: r.events.length ? 1 : 0, state: was, round, streak });
      $w.refreshQuestPanel?.();
      return true;
    }
    return true;
  }
  if (nd === 'delve_bait') {
    if ((gameState.inventory.forage || 0) <= 0) { ui.toast?.('🍄 미끼로 줄 버섯이 없어요. 채집 숲에서 주워 와요', 3200); return true; }
    const at = L(player.position);
    for (const p of run.pests) {
      const was = p.sim.state;
      const next = baitPest(p.sim, at);
      if (!next) continue;
      p.sim = next;
      gameState.inventory.forage -= 1; refreshInventoryUI();
      const b = makeBait(); b.position.copy(W(p.sim.x, p.sim.z + 0.5)); b.position.y = FLOOR_Y; group.add(b);
      const g = group; setTimeout(() => { g.remove(b); disposeObj(b); }, next.t * 1000);
      gameState.delve = bumpCount(gameState.delve, 'bait');
      ui.toast?.(PEST_LINES.eat(next.t), 2600);
      pestSfx('bait'); sfxLater(450, 'munch');
      const { round, streak } = repel(p, was);
      trackEvent('pest_counter', { pest: 'crab', method: 'bait', ok: 1, state: was, round, streak });
      $w.refreshQuestPanel?.();
      return true;
    }
    return true;
  }
  if (nd === 'delve_dark') {
    const lp = L(player.position);
    let n = 0;
    for (const p of run.pests) {
      const was = p.sim.state;
      const next = darkPest(p.sim, lp);
      if (!next) continue;
      p.sim = next; n++;
      if (n === 1) { ui.toast?.(PEST_LINES.dark, 2600); pestSfx('lightsOff'); pestSfx('flutter'); }
      const { round, streak } = repel(p, was);
      trackEvent('pest_counter', { pest: 'moth', method: 'dark', ok: 1, state: was, round, streak });
    }
    return true;
  }
  if (nd === 'delve_plug') {
    const lp = L(player.position);
    for (const p of run.pests) {
      const was = p.sim.state;
      const next = plugPest(p.sim, lp, p.sim.home);
      if (!next) continue;
      p.sim = next;
      spawnDust(player.position.x, player.position.z, 6);
      ui.toast?.(PEST_LINES.plug, 2600);
      pestSfx('plug'); pestSfx('confused');
      const { round, streak } = repel(p, was);
      trackEvent('pest_counter', { pest: 'mole', method: 'plug', ok: 1, state: was, round, streak });
      return true;
    }
    return true;
  }
  if (nd === 'delve_soft') {
    if (!run.soft || !run.rockMeshes[run.soft.i].visible) return true;
    const { i, since } = run.soft, m = run.rockMeshes[i], dozer = dozerNear(i);
    const ok = softOk((performance.now() - since) / 1000, softPeriodFor(dozer?.sim || {}));
    doPlayerAction(m.position.x, m.position.z);
    Sound.chop(); spawnDust(m.position.x, m.position.z, ok ? 3 : 8);
    const woke = wakePeeker(i);
    m.userData.hp = 0;
    const caught = breakRock(i, ok && !woke);
    const won = ok && !woke && !caught;
    if (won) { ui.toast?.(PEST_LINES.soft, 2400); pestSfx('hush'); }
    const { round, streak } = won ? repel(dozer, 'doze') : { round: dozer?.sim.round || 0, streak: run.streak.cur };
    trackEvent('pest_counter', { pest: 'dormouse', method: 'soft', ok: won ? 1 : 0, state: 'doze', round, streak });
    return true;
  }
  if (nd === 'delve_dig_decoy') return digDecoy();
  if (nd === 'delve_dig') {
    const give = reclaimGive(run.stash);
    const got = Object.values(give).reduce((a, b) => a + b, 0);
    run.kept += run.stash.length;
    for (const [ore, n] of Object.entries(give)) gameState.inventory[ore] = (gameState.inventory[ore] || 0) + n;
    run.stash = [];
    refreshInventoryUI();
    spawnFloatText(player.position.x, 1.6, player.position.z, `+${got}`, '#ffe48a');
    gameState.delve = bumpCount(gameState.delve, 'reclaim');
    pestSfx('dig'); sfxLater(350, 'reclaim');
    const { round, streak } = repel(run.pests.find(p => p.sim.kind === 'grub' && p.sim.grit > 0), 'stash');
    trackEvent('pest_counter', { pest: 'grub', method: 'reclaim', ok: 1, state: 'stash', round, streak });
    if (gameState.delve.stage >= 8 && jobFor(todayStr()).kind === 'reclaim') bumpTodayJob();
    $w.refreshQuestPanel?.();
    return true;
  }
  return false;
}

function meetCard(kind) {
  const c = PEST_COPY[kind], key = `delve_meet_${kind}`;
  if (gameState.hintsSeen[key]) return;
  firstHint(`delve_meet_${kind}`, c.ico, c.title, { steps: c.steps, note: c.line, ...(c.prompt ? { chip: c.prompt } : {}) });
  trackEvent('pest_meet', { pest: kind, floor: run.floor });
}

function tickMimics(lp) {
  for (const p of run.pests) {
    if (p.sim.state !== 'mimic') continue;
    const real = run.chunks.find(c => c.id === p.sim.mimicOf);
    if (!real) {
      const picked = !run.carried.has(p.sim.mimicOf);
      p.sim = { ...p.sim, state: 'flee', mimicOf: null };
      if (picked) {
        ui.toast?.(PEST_LINES.real, 2400); pestSfx('real');
        const { round, streak } = repel(p, 'mimic');
        trackEvent('pest_counter', { pest: 'roller', method: 'pick', ok: 1, state: 'mimic', round, streak });
      }
      continue;
    }
    if (!canPick(p.sim, lp)) continue;
    p.sim = { ...grabChunk(p.sim, real.id), mimicOf: null };
    carryOff(p, real, PEST_LINES.fake, ['fake', 'roll']);
    trackEvent('pest_counter', { pest: 'roller', method: 'pick', ok: 0, state: 'mimic', round: p.sim.round, streak: run.streak.cur });
  }
}

function syncHearts(p) {
  const n = heartCount(p.sim);
  if (n !== p.heartN) {
    if (p.hearts) { group.remove(p.hearts); disposeObj(p.hearts); }
    p.hearts = n ? makeHearts(n) : null;
    if (p.hearts) group.add(p.hearts);
    p.heartN = n;
  }
  if (!p.hearts) return;
  if (p.bubble) p.hearts.position.copy(p.bubble.position);
  else p.hearts.position.set(p.art.g.position.x, p.art.g.position.y + p.top + 0.3, p.art.g.position.z);
  p.hearts.center.y = heartsCenterY(p.bubble ? p.bubble.scale.y : 0);
}

function tickSoftRing() {
  const dozer = run.soft && run.rockMeshes[run.soft.i].visible && dozerNear(run.soft.i);
  if (!dozer) { if (run.softRing) run.softRing.visible = false; return; }
  if (!run.softRing) { run.softRing = makeRing(0.95); group.add(run.softRing); }
  const r = run.layout.rocks[run.soft.i], sec = (performance.now() - run.soft.since) / 1000, period = softPeriodFor(dozer.sim);
  const ph = (sec % period) / period;
  run.softRing.visible = true;
  run.softRing.position.copy(W(r.x, r.z)); run.softRing.position.y = FLOOR_Y + 0.03;
  run.softRing.scale.setScalar(1.6 - ph * 0.9);
  run.softRing.material.color.setHex(softOk(sec, period) ? 0x6fd17a : (ph < SOFT_WINDOW[0] ? 0xffe48a : 0xd98a5a));
}

export function updateDelve(dt, t) {
  tickLift(dt);
  if (!run || !atMine) return;
  const lp = L(player.position);
  const ringOn = batAlive(), ringSec = batRingSec();
  for (const c of [...run.chunks]) {
    c.age += dt;
    c.ring.visible = ringOn && c.age < ringSec;
    if (c.ring.visible) c.ring.scale.setScalar(1 - (c.age / ringSec) * 0.6);
    if (canPick(c, lp)) pickUp(c);
  }
  for (const g of run.gifts) if (canPick(g, lp)) pickGift(g);
  tickMimics(lp);
  tickSoftRing();
  tickFloorTactics(dt);
  const dark = run.pests.some(p => p.sim.state === 'away');
  if (run.light) run.light.intensity += ((dark ? 0.55 : 2.0) - run.light.intensity) * Math.min(1, dt * 4);
  if (run.wasDark && !dark) pestSfx('lightsOn');
  run.wasDark = dark;
  const paused = !!ui.anyModalOpen?.();
  const rest = !run.chunks.length && !run.layout.rocks.some((r, i) => r.vein && run.oreOk && run.rockMeshes[i].visible);
  for (const [j, p] of run.pests.entries()) {
    const world = { chunks: run.chunks, burrowAt: p.sim.home, lurkAt: run.lurkAt, lureAt: run.lureAt, rest, lurkTurn: (j - (run.pests.length - 1) / 2) * 1.1 };
    const prev = p.sim;
    const { pest, events } = paused ? { pest: p.sim, events: [] } : stepPest(p.sim, dt, world);
    p.sim = pest;
    tacticCues(prev, pest).forEach(pestSfx);
    if (pest.state === 'doze' && Math.hypot(lp.x - pest.x, lp.z - pest.z) < 3 && t - (p.snoreAt ?? -9) > 2.5) { p.snoreAt = t; pestSfx('snore'); }
    p.sim = pushOffPlayer(p.sim, lp);
    if (!p.met && ['lurk', 'approach', 'doze'].includes(pest.state)) { p.met = true; meetCard(pest.kind); }
    p.art.pose?.(pest.state, t);
    for (const e of events) {
      if (e.type === 'grab') {
        const c = run.chunks.find(x => x.id === e.chunkId);
        if (c) carryOff(p, c, undefined, [pest.kind === 'bat' ? 'swoop' : 'snatch']);
      }
      if (e.type === 'stash') {
        const c = run.carried.get(e.chunkId);
        run.carried.delete(e.chunkId);
        if (c) {
          group.remove(c.mesh); disposeObj(c.mesh);
          pestSfx('lost'); scoreStreak(false);
          if (pest.kind !== 'grub') run.lost++;
          if (pest.kind === 'grub') { run.stash.push(c); layTrail(p, c); }
        }
      }
    }
    p.art.g.position.copy(W(p.sim.x, p.sim.z)); p.art.g.position.y = FLOOR_Y + (p.art.hover || 0);
    p.art.g.visible = pest.state !== 'gone';
    if (p.hole) { p.hole.visible = pest.state === 'lurk'; p.hole.position.copy(W(pest.x, pest.z)); p.hole.position.y = FLOOR_Y; }
    tickTactic(p, dt, t);
    const badge = badgeFor(p.sim, p.peek);
    if (p.badgeRef !== badge) {
      for (const o of [p.bubble, p.glow]) if (o) group.remove(o);
      if (p.bubble) disposeObj(p.bubble);
      if (p.glow) disposeObj(p.glow);
      p.bubble = badge ? makeStateBadge(badge[0], badge[1], p.tilt) : null;
      p.glow = badge ? makeGroundGlow(badge[1]) : null;
      for (const o of [p.bubble, p.glow]) if (o) group.add(o);
      p.badgeRef = badge; p.bubbleAge = 0;
    }
    if (p.bubble) {
      p.bubbleAge += dt;
      p.bubble.scale.setScalar(badgePop(p.bubbleAge));
      p.bubble.position.set(p.art.g.position.x, p.art.g.position.y + p.top + 0.5 + badgeBob(t), p.art.g.position.z);
      p.glow.position.set(p.art.g.position.x, FLOOR_Y + 0.035, p.art.g.position.z);
    }
    syncHearts(p);
    if (pest.carryId) { const c = run.carried.get(pest.carryId); if (c) c.mesh.position.copy(p.art.g.position).add(new THREE.Vector3(0, 0.5, 0)); }
  }
}
