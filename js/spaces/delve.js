import {
  $w, atMine, dexDiscover, dist2D, doPlayerAction, gameState, player, questEvent, refreshInventoryUI, requestSave, scene,
  setSpaceVisible, situation, snapCamera, solidCircle, spawnDust, spawnFloatText, spawnSparkle, ui, todayStr,
} from '../game.js';
import { trackEvent } from '../analytics.js';
import { DELVE, MINE, MINE_HALF } from '../data/places.js';
import { DELVE_HALF, DELVE_CHEST_FLOORS, PEST_COPY } from '../data/delve.js';
import {
  floorSeed, layoutFloor, ladderRevealed, themeOf, oreOdds, rollOre, makeRng, noteReach, oreAllowed, markOreFloor,
  bumpCount, canDescendFrom0, stopsOpen, liftTargets, bumpJob, jobProgress, reclaimGive, stepView, claimStep, noteChest, jobFor, hashSeed, chestSpot,
} from '../delve/rules.js';
import { rollChest, chestGive } from '../boat-chest.js';
import { makeChestMesh } from '../boat-chest-art.js';
import { jobCard, owedMinerRewards } from '../delve/miner-card.js';
import { createPest, stepPest, tapPest, baitPest, canPick, RING_SEC, TAP_R, BAIT_R } from '../delve/pests.js';
import { makePest, makeOreChunk, makePuddle, makeBurrow, makeRing, makeBait, makeShaft, makeLadderUp, makeRock, makeLift, emojiBubble, makeTrail } from '../delve/pest-art.js';
import { makeMiner } from '../delve/miner.js';
import * as THREE from 'three';

let run = null;
let group = null;
let visitN = 0;
let liftMesh = null;
let minerMesh = null;
const bumpTodayJob = () => { gameState.delve = bumpJob(gameState.delve, todayStr()); };
export function delveJobProgress() { return jobProgress(gameState.delve, todayStr()); }
const lineSec = () => (gameState.delve.startedAt ? Math.max(0, Math.round((Date.now() - gameState.delve.startedAt) / 1000)) : 0);

export function delveFloorNow() { return run ? run.floor : 0; }

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
  placeMiner();
}

function placeMiner() {
  if (minerMesh) return;
  minerMesh = makeMiner();
  minerMesh.position.set(MINE.x + 1.6, FLOOR_Y, MINE.z - MINE_HALF + 4.2);
  minerMesh.rotation.y = 0.4;
  scene.add(minerMesh);
  solidCircle(minerMesh.position.x, minerMesh.position.z, MINER_R);
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
    o.geometry?.dispose();
    for (const m of [o.material].flat().filter(Boolean)) { m.map?.dispose(); m.dispose(); }
  });
}

function clearRoom() {
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
  run.rockMeshes = layout.rocks.map(r => { const m = makeRock(r.vein, theme); m.position.copy(W(r.x, r.z)); m.position.y = FLOOR_Y; m.userData.hp = 3; group.add(m); return m; });
  for (const p of layout.puddles) { const m = makePuddle(0.85); m.position.copy(W(p.x, p.z)); m.position.y = FLOOR_Y; group.add(m); }
  for (const b of layout.burrows) { const m = makeBurrow(); m.position.copy(W(b.x, b.z)); m.position.y = FLOOR_Y; group.add(m); }
  scene.add(group);
}

function spawnPests(layout) {
  run.pests = layout.pests.map((kind, i) => {
    const home = layout.burrows[i];
    const at = kind === 'axolotl' && layout.puddles[0] ? layout.puddles[0] : home;
    const art = makePest(kind, { submerged: kind === 'axolotl' });
    group.add(art.g);
    return { sim: createPest(kind, at, home), art, met: false, bubble: null, bubbleTxt: null };
  });
}

export function enterFloor(floor, via) {
  const date = todayStr();
  const layout = layoutFloor({ seed: floorSeed(date, floor, visitN++), floor });
  const oreOk = oreAllowed(gameState.delve, date, floor);
  const prevSec = run ? Math.round((performance.now() - run.enteredAt) / 1000) : 0, prevRocks = run ? run.broken : 0;
  run = { enteredAt: performance.now(), floor, layout, oreOk, broken: 0, ladderShown: false, chunks: [], carried: new Map(), stash: [], ore: 0, chunkN: 0, trail: null };
  buildRoom(floor, layout);
  spawnPests(layout);
  run.chest = null;
  if (DELVE_CHEST_FLOORS.includes(floor) && !gameState.delve.chests[floor]) {
    const mesh = makeChestMesh({ buoy: false });
    const at = chestSpot(layout.ladderAt, DELVE_HALF);
    mesh.position.copy(W(at.x, at.z)); mesh.position.y = FLOOR_Y; group.add(mesh);
    run.chest = { at, mesh };
  }
  gameState.delve = noteReach(gameState.delve, floor);
  if (oreOk) gameState.delve = markOreFloor(gameState.delve, date, floor);
  player.position.copy(W(layout.arrival.x, layout.arrival.z));
  player.rotation.y = 0;
  $w.nearDoor = null; ui.setDoorPrompt?.(null); snapCamera(); setSpaceVisible();
  trackEvent('delve_floor', { floor, via, stops: stopsOpen(gameState.delve).length, sec: prevSec, rocks: prevRocks });
  if (floor === 1) $w.firstHintBanner?.('delve_common', PEST_COPY.common.ico, PEST_COPY.common.title, PEST_COPY.common.line);
  $w.refreshQuestPanel?.();
}

export function leaveToFloor0(reason) {
  trackEvent('delve_exit', { floor: delveFloorNow(), reason, ore: run?.ore || 0 });
  clearRoom(); run = null;
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
  run.chunks.push({ id: `c${run.chunkN++}`, x: lx, z: lz, age: 0, ore, mesh, ring });
}

function showLadder() {
  run.ladderShown = true;
  const s = makeShaft(); s.position.copy(W(run.layout.ladderAt.x, run.layout.ladderAt.z)); s.position.y = FLOOR_Y; group.add(s);
  const lr = run.rockMeshes[run.layout.ladderRock]; if (lr) lr.visible = false;
  spawnSparkle(s.position.x, 0.6, s.position.z, 18);
  ui.toast?.('🪜 아래로 가는 길이 보여요');
}

export function tryDelveMine() {
  const i = nearestRock(2.4);
  if (i < 0) { ui.toast?.('가까운 바위가 없어요 ⛏️'); return; }
  const r = run.layout.rocks[i], m = run.rockMeshes[i];
  doPlayerAction(m.position.x, m.position.z);
  spawnDust(m.position.x, m.position.z, 8);
  m.userData.hp -= 1;
  if (m.userData.hp > 0) return;
  m.visible = false;
  run.broken++;
  if (r.vein && run.oreOk) dropChunk(r.x, r.z, rollOre(makeRng((Date.now() ^ (i * 2654435761)) >>> 0), oreOdds(run.floor, situation().weather)));
  if (!run.ladderShown && ladderRevealed({ broken: run.broken, hitLadderRock: i === run.layout.ladderRock })) showLadder();
}

const batAlive = () => run.pests.some(p => p.sim.kind === 'bat' && p.sim.state !== 'gone');

function pickUp(c) {
  run.chunks = run.chunks.filter(x => x !== c);
  for (const o of [c.mesh, c.ring]) { group.remove(o); disposeObj(o); }
  gameState.inventory[c.ore] = (gameState.inventory[c.ore] || 0) + 1;
  run.ore++;
  refreshInventoryUI();
  spawnFloatText(c.mesh.position.x, 1.4, c.mesh.position.z, `+1`, c.ore === 'gem' ? '#5ad0e0' : '#cfc8b8');
  questEvent('mine', 1);
  dexDiscover('ore', c.ore);
  if (batAlive() && c.age < RING_SEC) {
    gameState.delve = bumpCount(gameState.delve, 'grab');
    trackEvent('pest_counter', { pest: 'bat', method: 'grab', ok: 1 });
  }
  const j = jobFor(todayStr());
  if (gameState.delve.stage >= 8 && j.kind === 'ore' && run.floor >= j.floorMin) bumpTodayJob();
}

export function delvePrompt() {
  if (!run) {
    if (minerMesh && dist2D(minerMesh.position, player.position) < 1.8) {
      if (jobCard(gameState.delve, gameState.inventory, true, todayStr(), delveJobProgress())?.ready) return { nd: 'delve_job_claim', prompt: '⛏️ 광부 아저씨 · 받기' };
      const v = stepView(gameState.delve, gameState.inventory);
      if (v?.ready) return { nd: 'delve_miner_claim', prompt: '⛏️ 광부 아저씨 · 받기' };
      if (v) return { nd: 'delve_miner_talk', prompt: '⛏️ 광부 아저씨' };
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
    if (p.sim.kind === 'axolotl' && !['gone', 'flee'].includes(p.sim.state) && near(p.sim, TAP_R)) return { nd: 'delve_tap', prompt: PEST_COPY.axolotl.prompt };
    if (p.sim.kind === 'crab' && ['idle', 'approach'].includes(p.sim.state) && near(p.sim, BAIT_R) && (gameState.inventory.forage || 0) > 0) return { nd: 'delve_bait', prompt: PEST_COPY.crab.prompt };
  }
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
    group.remove(run.chest.mesh); disposeObj(run.chest.mesh); run.chest = null;
    gameState.delve = noteChest(gameState.delve, run.floor);
    refreshInventoryUI(); requestSave();
    ui.toast?.(`🧰 ${loot.name}`);
    trackEvent('delve_chest', { floor: run.floor, loot: loot.id });
    $w.refreshQuestPanel?.();
    return true;
  }
  if (nd === 'delve_miner_talk') {
    const v = stepView(gameState.delve, gameState.inventory);
    if (v) ui.toast?.(`⛏️ ${v.desc} (${v.progress}/${v.target})`);
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
    ui.toast?.('⛏️ 고맙네! 다음 일을 부탁하지');
    trackEvent('delve_step', { step: c.stepId, stage: c.delve.stage, sec: lineSec() });
    $w.refreshQuestPanel?.();
    return true;
  }
  if (nd === 'delve_lift_locked') { ui.toast?.('⛏️ 광부 아저씨에게 석탄 3개를 가져다줘요'); return true; }
  if (nd === 'delve_lift') {
    const targets = liftTargets(gameState.delve);
    const go = (floor) => { trackEvent('delve_enter', { floor, stops: targets.length - 1 }); enterFloor(floor, 'lift'); };
    const deepest = targets.at(-1);
    if (deepest === 1) { go(1); return true; }
    ui.showHintModal?.({
      ico: '🛗', title: '승강기', body: '어디로 갈까요?',
      ok: { label: `🛗 지하 ${deepest}층`, onClick: () => go(deepest) },
      alt: { label: '🪜 1층부터', onClick: () => go(1) },
    });
    return true;
  }
  if (nd === 'delve_up') { leaveToFloor0('ladder'); return true; }
  if (nd === 'delve_down') { enterFloor(run.floor + 1, 'ladder'); return true; }
  if (nd === 'delve_bottom') { ui.toast?.('🪜 여기가 가장 깊은 곳이에요'); return true; }
  if (nd === 'delve_tap') {
    const lp = L(player.position);
    for (const p of run.pests) {
      const r = tapPest(p.sim, lp);
      if (!r) continue;
      p.sim = r.pest;
      for (const e of r.events) {
        const c = run.carried.get(e.chunkId);
        if (!c) continue;
        run.carried.delete(e.chunkId); group.remove(c.mesh); disposeObj(c.mesh);
        dropChunk(e.x, e.z, c.ore);
      }
      gameState.delve = bumpCount(gameState.delve, 'tap');
      trackEvent('pest_counter', { pest: 'axolotl', method: 'tap', ok: r.events.length ? 1 : 0 });
      $w.refreshQuestPanel?.();
      return true;
    }
    return true;
  }
  if (nd === 'delve_bait') {
    const at = L(player.position);
    for (const p of run.pests) {
      const next = baitPest(p.sim, at);
      if (!next) continue;
      p.sim = next;
      gameState.inventory.forage -= 1; refreshInventoryUI();
      const b = makeBait(); b.position.copy(W(p.sim.x, p.sim.z + 0.5)); b.position.y = FLOOR_Y; group.add(b);
      const g = group; setTimeout(() => { g.remove(b); disposeObj(b); }, 6000);
      gameState.delve = bumpCount(gameState.delve, 'bait');
      trackEvent('pest_counter', { pest: 'crab', method: 'bait', ok: 1 });
      $w.refreshQuestPanel?.();
      return true;
    }
    return true;
  }
  if (nd === 'delve_dig') {
    const give = reclaimGive(run.stash);
    const got = Object.values(give).reduce((a, b) => a + b, 0);
    for (const [ore, n] of Object.entries(give)) gameState.inventory[ore] = (gameState.inventory[ore] || 0) + n;
    run.stash = [];
    refreshInventoryUI();
    spawnFloatText(player.position.x, 1.6, player.position.z, `+${got}`, '#ffe48a');
    gameState.delve = bumpCount(gameState.delve, 'reclaim');
    trackEvent('pest_counter', { pest: 'grub', method: 'reclaim', ok: 1 });
    if (gameState.delve.stage >= 8 && jobFor(todayStr()).kind === 'reclaim') bumpTodayJob();
    $w.refreshQuestPanel?.();
    return true;
  }
  return false;
}

function meetBanner(kind) {
  const c = PEST_COPY[kind];
  $w.firstHintBanner?.(`delve_${kind}`, c.ico, c.title, c.line);
  trackEvent('pest_meet', { pest: kind, floor: run.floor });
}

export function updateDelve(dt, t) {
  if (!run || !atMine) return;
  const lp = L(player.position);
  const ringOn = batAlive();
  for (const c of [...run.chunks]) {
    c.age += dt;
    c.ring.visible = ringOn && c.age < RING_SEC;
    if (c.ring.visible) c.ring.scale.setScalar(1 - (c.age / RING_SEC) * 0.6);
    if (canPick(c, lp)) pickUp(c);
  }
  for (const p of run.pests) {
    const world = { chunks: run.chunks.map(c => ({ id: c.id, x: c.x, z: c.z, age: c.age })), burrowAt: p.sim.home };
    const { pest, events } = stepPest(p.sim, dt, world);
    p.sim = pest;
    for (const e of events) {
      if (e.type === 'grab') {
        const c = run.chunks.find(x => x.id === e.chunkId);
        if (c) { run.chunks = run.chunks.filter(x => x !== c); group.remove(c.ring); disposeObj(c.ring); run.carried.set(c.id, c); p.grabAt = { x: c.x, z: c.z }; }
        if (!p.met) { p.met = true; meetBanner(pest.kind); }
      }
      if (e.type === 'stash') {
        const c = run.carried.get(e.chunkId);
        run.carried.delete(e.chunkId);
        if (c) {
          group.remove(c.mesh); disposeObj(c.mesh);
          if (pest.kind === 'grub') {
            run.stash.push(c);
            if (!run.trail) {
              const from = p.grabAt || { x: c.x, z: c.z }, pts = [];
              for (let k = 0; k <= 8; k++) pts.push([DELVE.x + from.x + (pest.home.x - from.x) * k / 8, DELVE.z + from.z + (pest.home.z - from.z) * k / 8]);
              run.trail = makeTrail(pts); run.trail.position.y = FLOOR_Y; group.add(run.trail);
            }
          }
        }
      }
    }
    p.art.g.position.copy(W(pest.x, pest.z)); p.art.g.position.y = FLOOR_Y + (p.art.hover || 0);
    p.art.g.visible = pest.state !== 'gone';
    const want = pest.state === 'carry' ? '💎' : pest.state === 'flee' ? '❗' : pest.state === 'eat' ? '😋' : null;
    if (p.bubbleTxt !== want) {
      if (p.bubble) { group.remove(p.bubble); disposeObj(p.bubble); }
      p.bubble = want ? emojiBubble(want, 0.9) : null;
      if (p.bubble) group.add(p.bubble);
      p.bubbleTxt = want;
    }
    if (p.bubble) p.bubble.position.set(p.art.g.position.x, p.art.g.position.y + 1.6, p.art.g.position.z);
    if (pest.carryId) { const c = run.carried.get(pest.carryId); if (c) c.mesh.position.copy(p.art.g.position).add(new THREE.Vector3(0, 0.5, 0)); }
  }
}
