import * as THREE from 'three';
import { $w, WEATHER, player, scene, camera, ui, snapCamera, setSpaceVisible, setFogExempt, firstHint, todayStr, gameState, obstacles, setCameraRig, requestSave, mgView, rollDifficulty, spawnFloatText, spawnSparkle, spawnConfetti, triggerMoment } from '../game.js';
import { trackEvent } from '../analytics.js';
import { Sound, setBGMTheme } from '../sound.js';
import { MOUNTAIN, MOUNTAIN_GATE, MOUNTAIN_LANDMARK, MOUNTAIN_LANDMARK_R } from '../data/places.js';
import { daysSinceUnlock, isMountainOpen } from '../mountain/unlock.js';
import { buildLandmark, landmarkStop } from '../mountain/landmark.js';
import { createReveal } from '../mountain/reveal.js';
import { pathHeight, slopePoint, acornY, terrainHeight, SLOPE_M_PER_UNIT } from '../mountain/terrain.js';
import { buildMountainSpace, paintInterior, followCamera, poseObstacles, obstacleScales } from '../mountain/interior-art.js';
import { applyLook } from '../mountain/interior-look.js';
import { MOUNTAIN_THEMES, THEME_CHECK_S, mountainLook } from '../mountain/theme.js';
import { CLIMB_PATH, PLAZA, clampLocal, ACORNS, CLIMB_START, collectAcorns } from '../mountain/climb.js';
import { buildCamp } from '../mountain/camp-art.js';
import { CAMP, START_SPOT, atHut, pushOutProps, YARD, DOOR_SPOT, DOOR_R, clampSummit } from '../mountain/camp-layout.js';
import { createRunout, stepRunout, stopTurn } from '../mountain/runout.js';
import { createKeeperBubble } from '../mountain/keeper-bubble.js';
import { createSled, stepSled, tryBoost } from '../mountain/sled.js';
import { COURSE } from '../mountain/course.js';
import { SLED_SEAT, SLED_LIFT, sledYaw, sledCamTargets, sledPose, decayShake, shakeOffset } from '../mountain/sled-view.js';
import { spawnSnowBurst } from '../mountain/sled-fx.js';
import { setSledSkin } from '../mountain/sled-art.js';
import { sledBegin, sledSettle, sledAbandon, sledState } from '../mountain/sled-run.js';
import { bindSledInput, initialInput, worldSteer } from '../mountain/sled-input.js';
import { isTouchDevice } from '../touch-sim.js';
import { showCountdown, clearCountdown, showRunHud, showResult, hideSledHud, boostButton } from '../mountain/sled-hud.js';
import { duelActive } from './night-visit.js';
import { inVillage2 } from './doors.js';

export const MOUNTAIN_EXIT_LOCAL = { x: 0, z: 83 };
let reveal = null;
let run = null;
let keeperBubble = null;
const START_R = 1.6;
const CHEER_S = 1.3;
const SPRAY_S = 0.07;
const STOP_SIDE = Math.PI / 2;
let look = null;
let lookT = 0;
let fallT = 0;
const skies = {};
const _sunAt = new THREE.Vector3();
const _camLocal = { x: 0, y: 0, z: 0 };

const GO_CLEAR_MS = 800;

const newRunId = () => crypto.randomUUID?.()
  || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => { const r = Math.random() * 16 | 0; return (ch === 'x' ? r : (r & 3) | 8).toString(16); });

export function sledActive() {
  return !!run && (run.phase === 'countdown' || run.phase === 'sled' || run.phase === 'runout' || run.phase === 'cheer');
}

export function sledStartReady() {
  if (!$w.atMountain || run?.phase !== 'hut') return false;
  return Math.hypot(player.position.x - MOUNTAIN.x - START_SPOT.x, player.position.z - MOUNTAIN.z - START_SPOT.z) < START_R;
}

export function mountainOpen() {
  return isMountainOpen(gameState.firstDay, todayStr());
}

export function spawnMountainGate() {
  const art = buildLandmark(THREE);
  art.position.copy(MOUNTAIN_LANDMARK);
  scene.add(art);
  obstacles.push({ x: MOUNTAIN_LANDMARK.x, z: MOUNTAIN_LANDMARK.z, r: MOUNTAIN_LANDMARK_R });
}

export function clampToLandmark(p) {
  const s = landmarkStop(p.x - MOUNTAIN_LANDMARK.x, p.z - MOUNTAIN_LANDMARK.z);
  p.x = MOUNTAIN_LANDMARK.x + s.x; p.z = MOUNTAIN_LANDMARK.z + s.z;
}

function ensureMountainSpace() {
  if (!$w.mountainGroup) {
    const g = buildMountainSpace(THREE);
    g.add(buildCamp(THREE));
    keeperBubble = createKeeperBubble(THREE, g, { ...CAMP.keeper, y: CAMP.deck.y });
    g.position.copy(MOUNTAIN);
    g.visible = false;
    scene.add(g);
    $w.mountainGroup = g;
  }
  return $w.mountainGroup;
}

export function enterMountain() {
  if (!mountainOpen()) { ui.toast?.('🏔️ 내일 열려요', 2200); return; }
  look = null;
  $w.atMountain = true;
  setFogExempt(player, true);
  ensureMountainSpace().visible = true;
  player.position.set(MOUNTAIN.x + PLAZA.x, 0, MOUNTAIN.z + PLAZA.z);
  player.rotation.y = Math.PI;
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null;
  snapCamera(); setSpaceVisible();
  firstHint('mountain', '🏔️', '🏔️ 설산', '🏔️ 뒤쪽 능선길로 올라가 정상에서 썰매를 타요');
  setBGMTheme('main'); Sound.blip();
  const first = !gameState.hintsSeen?.mountainVisited;
  gameState.hintsSeen = { ...(gameState.hintsSeen || {}), mountainVisited: true };
  requestSave();
  trackEvent('mountain_enter', { first: first ? 1 : 0 });
}

export function mountainReturnPos() {
  return { x: MOUNTAIN_GATE.x, z: MOUNTAIN_GATE.z + 4 };
}

export function exitMountain() {
  abandonRun();
  $w.atMountain = false;
  look = null;
  setFogExempt(player, false);
  if ($w.mountainGroup) $w.mountainGroup.visible = false;
  setCameraRig(null);
  const back = mountainReturnPos();
  player.position.set(back.x, 0, back.z);
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null;
  snapCamera(); setSpaceVisible(); setBGMTheme('main');
  Sound.blip();
  trackEvent('mountain_exit');
}

function skyTexture(key) {
  if (skies[key] || typeof document === 'undefined') return skies[key] || null;
  const th = MOUNTAIN_THEMES[key];
  const css = h => `#${h.toString(16).padStart(6, '0')}`;
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, css(th.skyTop)); grad.addColorStop(0.75, css(th.skyBot)); grad.addColorStop(1, css(th.skyBot));
  g.fillStyle = grad; g.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  skies[key] = tex;
  return tex;
}

function refreshLook(ud) {
  const next = mountainLook({ timeOfDay: gameState.timeOfDay, weather: WEATHER });
  if (next.key !== look?.key) paintInterior(THREE, ud, MOUNTAIN_THEMES[next.key]);
  ud.snowfall.visible = next.snowfall;
  look = next;
}

export function mountainLookFrame(env, dt) {
  const g = $w.mountainGroup;
  if (!g) return;
  const ud = g.userData;
  lookT -= dt;
  if (!look || lookT <= 0) { lookT = THEME_CHECK_S; refreshLook(ud); }
  fallT += dt;
  _camLocal.x = camera.position.x - g.position.x;
  _camLocal.y = camera.position.y - g.position.y;
  _camLocal.z = camera.position.z - g.position.z;
  followCamera(ud, _camLocal, fallT);
  applyLook({ ...env, target: _sunAt.copy(player.position) }, MOUNTAIN_THEMES[look.key], skyTexture(look.key));
}

export function clampToMountain(p) {
  if (sledActive()) return;
  const c = clampSummit({ x: p.x - MOUNTAIN.x, z: p.z - MOUNTAIN.z }, q => clampLocal(q, PLAZA));
  const q = pushOutProps(c);
  p.x = MOUNTAIN.x + q.x;
  p.z = MOUNTAIN.z + q.z;
  p.y = c.yard ? CAMP.deck.y : c.onPath ? pathHeight(c.seg, c.k) : 0;
}

export function hutDoorReady() {
  if (!$w.atMountain || sledActive()) return false;
  return Math.hypot(player.position.x - MOUNTAIN.x - DOOR_SPOT.x, player.position.z - MOUNTAIN.z - DOOR_SPOT.z) < DOOR_R;
}

export function mountainAction(nearDoor) {
  if (nearDoor === 'mountain') return enterMountain();
  if (nearDoor === 'mountainexit') return exitMountain();
  if (nearDoor === 'sledstart' && run?.phase === 'hut') return startSled();
}

export function mountainMinimapMarks(marks) {
  marks.push({ x: MOUNTAIN.x + MOUNTAIN_EXIT_LOCAL.x, z: MOUNTAIN.z + MOUNTAIN_EXIT_LOCAL.z, c: '#c8905a', kind: 'exit' });
  const top = CLIMB_PATH.at(-1);
  marks.push({ x: MOUNTAIN.x + top.x, z: MOUNTAIN.z + top.z, c: '#f6f8fb', kind: 'summit' });
}

export function maybeRevealMountain() {
  if (reveal || gameState.hintsSeen?.mountainReveal) return;
  if (mgView || duelActive || ui.anyModalOpen?.() || ui.coachActive?.() || !inVillage2()) return;
  if (!mountainOpen()) return;
  gameState.hintsSeen = { ...(gameState.hintsSeen || {}), mountainReveal: true };
  requestSave();
  reveal = createReveal({
    THREE, scene, camera, setCameraRig,
    from: new THREE.Vector3(player.position.x, 1.2, player.position.z),
    at: new THREE.Vector3(player.position.x, 30, player.position.z - 150),
    durationMs: 3000,
  });
  reveal.start();
  ui.toast?.('🏔️ 설산이 열렸어요!', 2600);
  trackEvent('mountain_reveal');
}

function setAcornVisible(i, on) {
  const mesh = $w.mountainGroup?.userData.acorns;
  if (!mesh) return;
  const m = new THREE.Matrix4().compose(new THREE.Vector3(ACORNS[i].x, acornY(i), ACORNS[i].z), new THREE.Quaternion(), new THREE.Vector3().setScalar(on ? 1 : 0));
  mesh.setMatrixAt(i, m);
  mesh.instanceMatrix.needsUpdate = true;
}

function pickAcornFx(i) {
  const x = MOUNTAIN.x + ACORNS[i].x, y = MOUNTAIN.y + acornY(i), z = MOUNTAIN.z + ACORNS[i].z;
  spawnSparkle(x, y, z, 9);
  spawnFloatText(x, y + 1, z, '🌰', '#8a5a2b', 0.8);
}

function startClimb() {
  ACORNS.forEach((_, i) => setAcornVisible(i, true));
  run = { phase: 'climb', runId: newRunId(), diff: null, taken: Array(ACORNS.length).fill(false), climbStart: performance.now(), frames: 0, frameMs: 0 };
}

function sledSkin() {
  return gameState.mountain?.hut?.sled || 'basic';
}

function ctxOf() {
  return {
    runId: run.runId, diff: run.diff, sledSkin: sledSkin(),
    acornsAvailable: ACORNS.length, acornsCollected: run.taken.filter(Boolean).length,
    climbMs: run.climbMs ?? Math.round(performance.now() - run.climbStart),
    idleMs: run.idleMs ?? (run.phase === 'hut' ? Math.round(performance.now() - run.hutAt) : null),
    daysSinceUnlock: daysSinceUnlock(gameState.firstDay, todayStr()),
    input: run.input ? run.input.input() : initialInput(isTouchDevice()),
    orientation: innerWidth < innerHeight ? 'portrait' : 'landscape',
  };
}

function courseFor(diff) {
  const k = 2 - (diff?.ease ?? 1);
  return { ...COURSE, obstacles: COURSE.obstacles.map(o => ({ ...o, r: o.r * k })) };
}

const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _shake = new THREE.Vector3();
const LEAN_RATE = 8;

const toWorld = (v, q) => v.set(MOUNTAIN.x + q.x, MOUNTAIN.y + q.y, MOUNTAIN.z + q.z);

function sledCamera(cam, dt) {
  const t = sledCamTargets(run.sled);
  const k = 1 - Math.pow(0.02, dt);
  camPos.lerp(toWorld(_a, t.pos), k);
  camLook.lerp(toWorld(_b, t.look), k);
  run.shake = decayShake(run.shake, dt);
  const off = shakeOffset(run.shake, performance.now() / 1000);
  cam.position.copy(camPos).add(_shake.set(off.x, off.y, 0));
  cam.lookAt(camLook);
}

function showObstacles(course, hidden = []) {
  const geo = $w.mountainGroup?.userData.obstacles.geometry;
  if (geo) poseObstacles(geo, obstacleScales(course, hidden));
}

function burstObstacle(i) {
  const o = run.course.obstacles[i];
  const p = slopePoint(o.z, o.x);
  const x = MOUNTAIN.x + p.x, y = MOUNTAIN.y + p.y, z = MOUNTAIN.z + p.z;
  showObstacles(run.course, run.sled.hitIds);
  spawnSnowBurst(x, y + 0.5, z, 14);
  Sound.build();
  run.shake = 1;
  spawnFloatText(x, y + 2, z, '💥', '#d9534f', 0.8);
}

function showSled(on) {
  const sled = $w.mountainGroup?.userData.sled;
  if (sled) sled.visible = on;
}

function placeSled(yaw) {
  const sled = $w.mountainGroup?.userData.sled;
  if (!sled) return;
  const pose = sledPose(run.sled, yaw);
  sled.position.set(pose.x, pose.y, pose.z);
  sled.rotation.set(pose.pitch, pose.yaw, 0);
}

function rideSlope(steer, dt) {
  const p = slopePoint(run.sled.z, run.sled.x);
  run.yaw += (sledYaw(steer) - run.yaw) * Math.min(1, dt * LEAN_RATE);
  player.position.set(MOUNTAIN.x + p.x, MOUNTAIN.y + p.y + SLED_SEAT, MOUNTAIN.z + p.z);
  player.rotation.y = run.yaw;
  placeSled(run.yaw);
}

function boost() {
  if (run?.phase === 'sled') run.sled = tryBoost(run.sled);
}

function arriveHut() {
  run.phase = 'hut';
  run.climbMs = Math.round(performance.now() - run.climbStart);
  run.hutAt = performance.now();
  keeperBubble?.arrive();
  Sound.blip();
  ui.toast?.('🏠 정상 산장에 도착했어요', 2200);
  trackEvent('mountain_hut', { run_id: run.runId, climb_ms: run.climbMs, acorns: run.taken.filter(Boolean).length });
}

function startSled() {
  run.idleMs = Math.round(performance.now() - run.hutAt);
  keeperBubble?.hide();
  $w.nearDoor = null; ui.setDoorPrompt?.(null);
  run.diff = rollDifficulty('sled');
  run.course = courseFor(run.diff);
  run.shake = 0;
  showObstacles(run.course);
  run.sled = createSled(run.taken.filter(Boolean).length);
  run.phase = 'countdown';
  run.count = 3;
  run.countT = 0;
  run.input = bindSledInput(document.body, boost, { initial: initialInput(isTouchDevice()) });
  document.body.classList.add('sled-run');
  boostButton().onclick = boost;
  sledBegin(ctxOf());
  camPos.copy(camera.position);
  camLook.copy(player.position);
  run.yaw = sledYaw(0);
  rideSlope(0, 0);
  setSledSkin($w.mountainGroup.userData.sled, THREE, sledSkin());
  showSled(true);
  setCameraRig(sledCamera);
  showCountdown(3);
  showRunHud({ timeMs: 0, acorns: run.sled.acorns });
}

function closeRun() {
  keeperBubble?.hide();
  showSled(false);
  showObstacles(COURSE);
  hideSledHud();
  document.body.classList.remove('sled-run');
  run = null;
}

function finishSled() {
  const fpsAvg = run.frames ? Math.round(1000 / (run.frameMs / run.frames)) : null;
  run.result = sledSettle(run.sled, ctxOf(), { fpsAvg });
  run.input.dispose();
  setCameraRig(null);
  clearCountdown();
  const p = slopePoint(run.sled.z, run.sled.x);
  run.runout = createRunout({ x: p.x, z: p.z, v: run.sled.speed * SLOPE_M_PER_UNIT });
  run.sprayT = 0;
  run.phase = 'runout';
  Sound.complete();
  const f = CAMP.finish;
  [-1, 1].forEach(s => spawnConfetti(MOUNTAIN.x + f.x + s * f.half, MOUNTAIN.y + terrainHeight(f.x, f.z) + 3.4, MOUNTAIN.z + f.z));
}

function rideRunout(dt) {
  run.runout = stepRunout(run.runout, dt);
  const { x, z } = run.runout, y = terrainHeight(x, z);
  const yaw = sledYaw(0) + stopTurn(run.runout) * STOP_SIDE;
  player.position.set(MOUNTAIN.x + x, MOUNTAIN.y + y + SLED_SEAT, MOUNTAIN.z + z);
  player.rotation.y = yaw;
  const sled = $w.mountainGroup?.userData.sled;
  if (sled) { sled.position.set(x, y + SLED_LIFT, z); sled.rotation.set(0, yaw, 0); }
  run.sprayT -= dt;
  if (run.sprayT <= 0 && run.runout.v > 0.4) {
    run.sprayT = SPRAY_S;
    spawnSnowBurst(MOUNTAIN.x + x - 0.6, MOUNTAIN.y + y + 0.2, MOUNTAIN.z + z + 0.3, 4);
  }
  if (run.runout.done) celebrate(x, y, z, yaw);
}

function celebrate(x, y, z, yaw) {
  run.phase = 'cheer';
  run.cheerT = CHEER_S;
  player.position.set(MOUNTAIN.x + x + Math.cos(yaw) * 0.9, MOUNTAIN.y + y, MOUNTAIN.z + z - Math.sin(yaw) * 0.9);
  player.rotation.y = 0;
  triggerMoment(true);
  if (run.result.newBest) {
    spawnConfetti(player.position.x, player.position.y + 1.6, player.position.z);
    spawnFloatText(player.position.x, player.position.y + 2.4, player.position.z, '🏆', '#e0a62a', 1);
  }
}

function showFinish() {
  const res = run.result;
  run.phase = 'result';
  player.position.y = MOUNTAIN.y;
  showResult({ ...res, best: sledState().best ?? res.timeMs, flags: run.sled.flagsPassed }, () => { showSled(false); closeRun(); });
}

export function abandonRun() {
  if (!run) return;
  if (run.phase === 'climb' || run.phase === 'hut') sledAbandon(run.phase, ctxOf(), null);
  else if (run.phase === 'countdown' || run.phase === 'sled') {
    sledAbandon('sled', ctxOf(), run.sled);
    run.input?.dispose();
    setCameraRig(null);
  }
  closeRun();
}

export function updateMountain(dt) {
  if (reveal) {
    if (!inVillage2()) { reveal.finish(); reveal = null; }
    else if (!reveal.update(dt)) reveal = null;
  }
  if (!$w.atMountain) return;
  const local = { x: player.position.x - MOUNTAIN.x, z: player.position.z - MOUNTAIN.z };
  if (!run && Math.hypot(local.x - CLIMB_START.x, local.z - CLIMB_START.z) < 2) startClimb();
  if (!run) return;
  if (run.phase === 'climb') {
    const next = collectAcorns(local, run.taken);
    next.forEach((v, i) => { if (v && !run.taken[i]) { setAcornVisible(i, false); Sound.harvest(); pickAcornFx(i); } });
    run.taken = next;
    if (atHut(local)) arriveHut();
  } else if (run.phase === 'hut') {
    keeperBubble?.update(dt, performance.now() / 1000, Math.hypot(local.x - CAMP.keeper.x, local.z - CAMP.keeper.z), CAMP.deck.y);
  } else if (run.phase === 'runout') {
    rideRunout(dt);
  } else if (run.phase === 'cheer') {
    run.cheerT -= dt;
    if (run.cheerT <= 0) showFinish();
  } else if (run.phase === 'countdown') {
    run.countT += dt;
    if (run.countT >= 1) {
      run.count -= 1;
      run.countT = 0;
      showCountdown(run.count);
      if (run.count <= 0) run.phase = 'sled';
    }
    rideSlope(0, dt);
  } else if (run.phase === 'sled') {
    run.frames += 1;
    run.frameMs += dt * 1000;
    const steer = worldSteer(run.input.read());
    const hitsBefore = run.sled.hitIds.length;
    run.sled = stepSled(run.sled, Math.min(50, dt * 1000), steer, run.course);
    run.sled.hitIds.slice(hitsBefore).forEach(burstObstacle);
    rideSlope(steer, dt);
    if (run.sled.t >= GO_CLEAR_MS) clearCountdown();
    showRunHud({ timeMs: run.sled.t, acorns: run.sled.acorns });
    if (run.sled.finished) finishSled();
  }
}
