import * as THREE from 'three';
import { $w, player, scene, camera, ui, snapCamera, setSpaceVisible, setFogExempt, firstHint, todayStr, gameState, obstacles, solidCircle, setCameraRig, requestSave, mgView, rollDifficulty } from '../game.js';
import { trackEvent } from '../analytics.js';
import { Sound, setBGMTheme } from '../sound.js';
import { MOUNTAIN, MOUNTAIN_GATE } from '../data/places.js';
import { isMountainOpen } from '../mountain/unlock.js';
import { buildGateArt } from '../mountain/gate-art.js';
import { createReveal } from '../mountain/reveal.js';
import { buildMountainSpace, pathY, slopePoint, acornY } from '../mountain/terrain.js';
import { CLIMB_PATH, PLAZA, clampLocal, ACORNS, CLIMB_START, collectAcorns, atSummit } from '../mountain/climb.js';
import { createSled, stepSled, tryBoost } from '../mountain/sled.js';
import { COURSE } from '../mountain/course.js';
import { sledBegin, sledSettle, sledAbandon, sledState } from '../mountain/sled-run.js';
import { bindSledInput, steerFrom } from '../mountain/sled-input.js';
import { showCountdown, clearCountdown, showRunHud, showResult, hideSledHud, boostButton } from '../mountain/sled-hud.js';
import { duelActive } from './night-visit.js';
import { inVillage2 } from './doors.js';

export const MOUNTAIN_EXIT_LOCAL = { x: 4, z: 36 };
let reveal = null;
let run = null;

const GO_CLEAR_MS = 800;

const newRunId = () => crypto.randomUUID?.()
  || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => { const r = Math.random() * 16 | 0; return (ch === 'x' ? r : (r & 3) | 8).toString(16); });

export function sledActive() {
  return !!run && (run.phase === 'countdown' || run.phase === 'sled');
}

export function mountainOpen() {
  return isMountainOpen(gameState.firstDay, todayStr());
}

export function spawnMountainGate() {
  const art = buildGateArt(THREE);
  art.position.copy(MOUNTAIN_GATE);
  scene.add(art);
  solidCircle(MOUNTAIN_GATE.x - 1.6, MOUNTAIN_GATE.z, 0.4);
  solidCircle(MOUNTAIN_GATE.x + 1.6, MOUNTAIN_GATE.z, 0.4);
  obstacles.push({ x: MOUNTAIN_GATE.x, z: MOUNTAIN_GATE.z - 2.6, r: 2.0 });
}

function ensureMountainSpace() {
  if (!$w.mountainGroup) {
    const g = buildMountainSpace(THREE);
    g.position.copy(MOUNTAIN);
    g.visible = false;
    scene.add(g);
    $w.mountainGroup = g;
  }
  return $w.mountainGroup;
}

export function enterMountain() {
  if (!mountainOpen()) { ui.toast?.('🏔️ 내일 열려요', 2200); return; }
  $w.atMountain = true;
  setFogExempt(player, true);
  ensureMountainSpace().visible = true;
  player.position.set(MOUNTAIN.x + PLAZA.x, 0, MOUNTAIN.z + PLAZA.z);
  player.rotation.y = Math.PI;
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null;
  snapCamera(); setSpaceVisible();
  firstHint('mountain', '🏔️', '🏔️ 설산', '🏔️ 뒤 능선길로 올라 정상에서 썰매를 타요. 나갈 땐 남쪽 문');
  setBGMTheme('main'); Sound.blip();
  const first = !gameState.hintsSeen?.mountainVisited;
  gameState.hintsSeen = { ...(gameState.hintsSeen || {}), mountainVisited: true };
  requestSave();
  trackEvent('mountain_enter', { first: first ? 1 : 0 });
}

export function exitMountain() {
  abandonRun();
  $w.atMountain = false;
  setFogExempt(player, false);
  if ($w.mountainGroup) $w.mountainGroup.visible = false;
  setCameraRig(null);
  player.position.set(MOUNTAIN_GATE.x, 0, MOUNTAIN_GATE.z + 4);
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null;
  snapCamera(); setSpaceVisible(); setBGMTheme('main');
  Sound.blip();
  trackEvent('mountain_exit');
}

export function clampToMountain(p) {
  if (sledActive()) return;
  const c = clampLocal({ x: p.x - MOUNTAIN.x, z: p.z - MOUNTAIN.z }, PLAZA);
  p.x = MOUNTAIN.x + c.x;
  p.z = MOUNTAIN.z + c.z;
  p.y = c.onPath ? pathY(c.seg) + (pathY(c.seg + 1) - pathY(c.seg)) * c.k : 0;
}

export function mountainAction(nearDoor) {
  if (nearDoor === 'mountain') return enterMountain();
  if (nearDoor === 'mountainexit') return exitMountain();
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

function daysSinceUnlock() {
  const first = Date.parse(gameState.firstDay);
  const now = Date.parse(todayStr());
  return Number.isFinite(first) && Number.isFinite(now) ? Math.max(0, Math.round((now - first) / 86400000) - 1) : null;
}

function setAcornVisible(i, on) {
  const mesh = $w.mountainGroup?.userData.acorns;
  if (!mesh) return;
  const m = new THREE.Matrix4().compose(new THREE.Vector3(ACORNS[i].x, acornY(i), ACORNS[i].z), new THREE.Quaternion(), new THREE.Vector3().setScalar(on ? 1 : 0));
  mesh.setMatrixAt(i, m);
  mesh.instanceMatrix.needsUpdate = true;
}

function startClimb() {
  ACORNS.forEach((_, i) => setAcornVisible(i, true));
  run = { phase: 'climb', runId: newRunId(), diff: null, taken: Array(ACORNS.length).fill(false), climbStart: performance.now(), frames: 0, frameMs: 0 };
}

function ctxOf() {
  return {
    runId: run.runId, diff: run.diff,
    acornsAvailable: ACORNS.length, acornsCollected: run.taken.filter(Boolean).length,
    climbMs: run.climbMs ?? Math.round(performance.now() - run.climbStart),
    daysSinceUnlock: daysSinceUnlock(),
    input: run.input ? run.input.input() : 'keys',
    orientation: innerWidth < innerHeight ? 'portrait' : 'landscape',
  };
}

function courseFor(diff) {
  const k = 2 - (diff?.ease ?? 1);
  return { ...COURSE, obstacles: COURSE.obstacles.map(o => ({ ...o, r: o.r * k })) };
}

const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3();

function sledCamera(cam, dt) {
  const s = run.sled;
  const p = slopePoint(s.z, s.x);
  const ahead = slopePoint(Math.min(s.z + 18, COURSE.length), s.x);
  const k = 1 - Math.pow(0.02, dt);
  camPos.lerp(_a.set(MOUNTAIN.x + p.x, MOUNTAIN.y + p.y + 4.2, MOUNTAIN.z + p.z - 7), k);
  camLook.lerp(_b.set(MOUNTAIN.x + ahead.x, MOUNTAIN.y + ahead.y - 2, MOUNTAIN.z + ahead.z), k);
  cam.position.copy(camPos);
  cam.lookAt(camLook);
}

function rideSlope(steer) {
  const p = slopePoint(run.sled.z, run.sled.x);
  player.position.set(MOUNTAIN.x + p.x, MOUNTAIN.y + p.y, MOUNTAIN.z + p.z);
  player.rotation.y = steer * 0.3;
}

function boost() {
  if (run?.phase === 'sled') run.sled = tryBoost(run.sled);
}

function startSled() {
  run.climbMs = Math.round(performance.now() - run.climbStart);
  run.diff = rollDifficulty('sled');
  run.course = courseFor(run.diff);
  run.sled = createSled(run.taken.filter(Boolean).length);
  run.phase = 'countdown';
  run.count = 3;
  run.countT = 0;
  run.input = bindSledInput(document.body, boost);
  document.body.classList.add('sled-run');
  boostButton().onclick = boost;
  sledBegin(ctxOf());
  const p = slopePoint(0, run.sled.x);
  camPos.set(MOUNTAIN.x + p.x, MOUNTAIN.y + p.y + 4.2, MOUNTAIN.z + p.z - 7);
  camLook.set(MOUNTAIN.x + p.x, MOUNTAIN.y + p.y, MOUNTAIN.z + p.z + 10);
  rideSlope(0);
  setCameraRig(sledCamera);
  showCountdown(3);
  showRunHud({ timeMs: 0, acorns: run.sled.acorns });
}

function closeRun() {
  hideSledHud();
  document.body.classList.remove('sled-run');
  run = null;
}

function finishSled() {
  const fpsAvg = run.frames ? Math.round(1000 / (run.frameMs / run.frames)) : null;
  const res = sledSettle(run.sled, ctxOf(), { fpsAvg });
  run.input.dispose();
  setCameraRig(null);
  run.phase = 'result';
  player.position.set(MOUNTAIN.x + PLAZA.x, 0, MOUNTAIN.z + PLAZA.z);
  player.rotation.y = Math.PI;
  snapCamera();
  showResult({ ...res, best: sledState().best ?? res.timeMs, flags: run.sled.flagsPassed }, closeRun);
}

export function abandonRun() {
  if (!run) return;
  if (run.phase === 'climb') sledAbandon('climb', ctxOf(), null);
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
    next.forEach((v, i) => { if (v && !run.taken[i]) { setAcornVisible(i, false); Sound.harvest(); } });
    run.taken = next;
    if (atSummit(local)) startSled();
  } else if (run.phase === 'countdown') {
    run.countT += dt;
    if (run.countT >= 1) {
      run.count -= 1;
      run.countT = 0;
      showCountdown(run.count);
      if (run.count <= 0) run.phase = 'sled';
    }
    rideSlope(0);
  } else if (run.phase === 'sled') {
    run.frames += 1;
    run.frameMs += dt * 1000;
    const steer = steerFrom(run.input.read());
    run.sled = stepSled(run.sled, Math.min(50, dt * 1000), steer, run.course);
    rideSlope(steer);
    if (run.sled.t >= GO_CLEAR_MS) clearCountdown();
    showRunHud({ timeMs: run.sled.t, acorns: run.sled.acorns });
    if (run.sled.finished) finishSled();
  }
}
