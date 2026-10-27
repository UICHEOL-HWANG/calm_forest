import * as THREE from 'three';
import {
  $w, IS_MOBILE, SEASON, WEATHER, clayMat, gameState, giveReward, heldToolMesh, isNight,
  player, refreshInventoryUI, requestSave, rollDifficulty, seaGroup, setSpaceVisible, settleDifficulty,
  snapCamera, spawnFloatText, spawnSparkle, trackDiffAbandon, ui,
} from '../game.js';
import { trackEvent } from '../analytics.js';
import { Sound } from '../sound.js';
import { sendForageRun } from '../supabase-client.js';
import { DIVE } from '../data/places.js';
import { DIVE as DV, DIVE_SPECIES, airNeeded, diveBreath, summarizeBag } from '../forage/logic.js';
import { DIVE_AREA, ascendDive, createDiveRun, diveDepthAt, nearestDiveItem, pressDive, stepDiveRun } from '../forage/dive-run.js';
import { DIVE_FLOOR, buildDiveItem, buildDiveScene, updateDiveScene } from '../forage/dive-scene.js';
import { forageRow, resultEventParams, startEventParams } from '../forage/run.js';
import { withTried } from '../forage/pick.js';
import { showForageResult } from '../forage/result-card.js';
import { buildShore } from '../forage/mudflat-shore.js';
import { swim } from '../forage/swim-pose.js';
import { exitSea } from './sea.js';

export const dive = { active: false };

export const DIVE_COPY = {
  title: '잠수를 마쳤어요', sub: '망태기에 {0}개를 담았어요', empty: '다음엔 꼭 주워 와요',
  dive: '🤿 잠수', pick: '✋ 줍기', up: '⬆️ 떠오르기', out: '🚪 나가기', exit: '🚪 마을로 나가기',
  hint: '🤿 잠수해서 바닥의 보물을 주워요', air: '🫧 숨',
};

const HINT_MS = 2500, SPEED = .55, EXIT_Z = 4.2, UNDER_Z = -4, CAM_UNDER_Z = 0;
const DEEP = new THREE.Color(0x2a7aa0);
const _camPos = new THREE.Vector3(), _camLook = new THREE.Vector3(), _v = new THREE.Vector3();

let group = null, scene = null, prevToolVis = true;
let run = null, ctx = null, startMs = 0, lastInputMs = 0, idleMs = 0, fpsN = 0, fpsSum = 0, resultCard = null, hintUntil = 0;
let meshes = new Map(), flying = [], bubbles = [], bubbleGeo = null, bubbleMat = null, hudT = 0, lastX = 0, lastZ = 0;

const local = () => ({ x: player.position.x - DIVE.x, z: player.position.z - DIVE.z });

function buildDive() {
  group = new THREE.Group();
  group.position.copy(DIVE).sub(seaGroup.position);
  scene = buildDiveScene(THREE, clayMat, IS_MOBILE);
  group.add(scene.group);
  group.add(buildShore(THREE, clayMat, { z0: DIVE_FLOOR.Z0, z1: DIVE_FLOOR.Z1 - 4, seed: 31 }));
  bubbleGeo = new THREE.SphereGeometry(1, 8, 6);
  bubbleMat = new THREE.MeshStandardMaterial({ color: 0xc6e2ee, roughness: .1, transparent: true, opacity: .7 });
  seaGroup.add(group);
}

function addItem(it) {
  const m = buildDiveItem(THREE, clayMat, it.sp);
  m.position.set(it.x, -it.d + .08, it.z);
  group.add(m);
  meshes.set(it.id, { m, it });
}

function syncItems() {
  const ids = new Set(run.items.map(i => i.id));
  for (const [id, e] of meshes) if (!ids.has(id)) { group.remove(e.m); meshes.delete(id); }
  run.items.forEach(it => { if (!meshes.has(it.id)) addItem(it); });
}

function clearVisuals() {
  for (const e of meshes.values()) group.remove(e.m);
  for (const f of flying) group.remove(f.m);
  for (const b of bubbles) group.remove(b.m);
  meshes = new Map(); flying = []; bubbles = [];
}

function bubble(x, y, z, s, vy = 1.4, life = 1.6) {
  if (bubbles.length > 40) return;
  const m = new THREE.Mesh(bubbleGeo, bubbleMat);
  m.scale.setScalar(s); m.position.set(x, y, z); group.add(m);
  bubbles.push({ m, vy, life });
}

function startRun({ entry, prevMode }) {
  const diff = rollDifficulty('dive');
  const breath = diveBreath(diff.ease);
  const forage = gameState.sea.forage || {};
  const plays = (forage.plays?.dive || 0) + 1;
  ctx = {
    mode: 'dive', runId: crypto.randomUUID(), attemptN: plays, firstTime: !forage.tried?.dive, entry, prevMode,
    night: isNight(), weather: WEATHER, season: SEASON, input: IS_MOBILE ? 'touch' : 'keys',
    orientation: innerWidth >= innerHeight ? 'landscape' : 'portrait', coinsBefore: gameState.inventory.coins || 0,
    diff, params: { win: null, breathS: breath, tideS: null },
  };
  gameState.sea = { ...gameState.sea, forage: { ...withTried(forage, 'dive'), plays: { ...(forage.plays || {}), dive: plays } } };
  requestSave();
  clearVisuals();
  player.position.set(DIVE.x, DIVE_AREA.SURF_Y, DIVE.z + 1); player.rotation.y = Math.PI;
  lastX = player.position.x; lastZ = player.position.z;
  run = createDiveRun({ rnd: Math.random, breath });
  run.items.forEach(addItem);
  startMs = performance.now(); lastInputMs = startMs; hintUntil = startMs + HINT_MS; idleMs = 0; fpsN = 0; fpsSum = 0;
  trackEvent('forage_start', startEventParams(ctx));
}

const summary = () => summarizeBag(DIVE_SPECIES, run.bag);
const fpsAvg = () => (fpsN ? fpsSum / fpsN : null);
const rowOf = (outcome, endReason, extra = {}) => forageRow({
  ctx, outcome, endReason, durationMs: performance.now() - startMs, summary: summary(), good: run.good, bad: run.bad,
  dives: run.legs, picks: run.picks, idleMs, fpsAvg: fpsAvg(), ...extra,
});

function finishRun() {
  const sum = summary();
  trackEvent('forage_result', resultEventParams({ ctx, summary: sum, good: run.good, bad: run.bad, endReason: 'dives', durationMs: performance.now() - startMs }));
  settleDifficulty('dive', (DV.DIVES - run.bad) / DV.DIVES);
  sendForageRun(rowOf('finish', 'dives'));
  requestSave();
  ui.setSeaBtn?.(DIVE_COPY.dive, '', true);
  resultCard = showForageResult({
    mode: 'dive', title: DIVE_COPY.title,
    sub: sum.count ? DIVE_COPY.sub.replace('{0}', sum.count) : DIVE_COPY.empty,
    items: sum.items, coins: sum.coins, sellValue: sum.sellValue,
    onAgain: () => { resultCard = null; startRun({ entry: 'again', prevMode: 'dive' }); snapCamera(); },
    onHome: () => { resultCard = null; exitSea(); },
  });
}

export function enterDive(o = {}) {
  if (dive.active) return;
  if (!group) buildDive();
  $w.atSea = true;
  dive.active = true;
  swim.on = true;
  if (heldToolMesh) { prevToolVis = heldToolMesh.visible; heldToolMesh.visible = false; }
  ui.setSeaMode?.(true);
  startRun({ entry: o.entry || 'pick', prevMode: o.prevMode ?? null });
  snapCamera(); setSpaceVisible();
}

export function leaveDive() {
  if (!dive.active) return;
  if (run && !run.over) {
    const stage = run.dives || run.state !== 'surface' ? 'dive' : 'look';
    trackDiffAbandon('dive', ctx.diff, stage, { run_id: ctx.runId });
    sendForageRun(rowOf('abandon', 'exit', { abandonStage: stage }));
  }
  resultCard?.close(); resultCard = null;
  clearVisuals();
  run = null; ctx = null;
  swim.on = false; swim.moving = false; swim.surface = false;
  if (heldToolMesh) heldToolMesh.visible = prevToolVis;
  player.position.y = 0;
  ui.setForageHud?.(null);
  dive.active = false;
}

export const diveSpeedMult = () => (dive.active ? SPEED : 1);

export function diveDebug() {
  return { active: dive.active, run, ctx, items: meshes.size };
}

export function diveHint() {
  return performance.now() < hintUntil ? DIVE_COPY.hint : '';
}

export function nearDiveExit() {
  return !!run && run.state === 'surface' && local().z > EXIT_Z;
}

export function diveAction() {
  if (!run || run.over || resultCard) return;
  const now = performance.now();
  if (now - lastInputMs > 3000) idleMs += now - lastInputMs;
  lastInputMs = now;
  const p = local();
  if (run.state === 'swim' && !nearestDiveItem(run, p)) { ascendDive(run); return; }
  const r = pressDive(run, p, now - startMs);
  if (r.kind === 'dive') { Sound.blip?.(); for (let i = 0; i < 6; i++) bubble(p.x + (Math.random() - .5), DIVE_AREA.SURF_Y + .3, p.z, .07, .8, .6); return; }
  if (r.kind !== 'pick') return;
  const it = r.item, e = meshes.get(it.id);
  meshes.delete(it.id);
  player.rotation.y = Math.atan2(it.x - p.x, it.z - p.z);
  if (e) flying.push({ m: e.m, t: 0, from: e.m.position.clone() });
  giveReward({ [it.sp.key]: 1, coins: it.sp.coin }, 'dive_pick', it.sp.id);
  refreshInventoryUI?.();
  spawnFloatText(DIVE.x + it.x, run.y + 1.6, DIVE.z + it.z, it.sp.rare ? `✨${it.sp.ico}` : `${it.sp.ico}+1`, '#fff', it.sp.rare ? 1.4 : 1);
  if (it.sp.rare) spawnSparkle(DIVE.x + it.x, run.y + .8, DIVE.z + it.z, 20);
  Sound.harvest?.();
  syncItems();
}

export function clampDive(pos) {
  pos.x = Math.max(DIVE.x + DIVE_AREA.X0, Math.min(DIVE.x + DIVE_AREA.X1, pos.x));
  const under = run && run.state !== 'surface';
  pos.z = Math.max(DIVE.z + DIVE_AREA.Z0, Math.min(DIVE.z + (under ? UNDER_Z : EXIT_Z + 1.2), pos.z));
}

function updateFx(dt, t) {
  const pl = local();
  for (const f of flying) {
    f.t += dt;
    const k = Math.min(1, f.t / .5);
    f.m.position.lerpVectors(f.from, _v.set(pl.x, run ? run.y + .6 : 0, pl.z), k);
    f.m.scale.setScalar(1 - k * .7);
  }
  flying = flying.filter(f => { if (f.t >= .5) { group.remove(f.m); return false; } return true; });
  for (const b of bubbles) { b.life -= dt; b.m.position.y += b.vy * dt; b.m.position.x += Math.sin(t * 6 + b.m.id) * dt * .2; }
  bubbles = bubbles.filter(b => { if (b.life <= 0 || b.m.position.y > .1) { group.remove(b.m); return false; } return true; });
  for (const e of meshes.values()) if (e.m.userData.glow) e.m.userData.glow.material.emissiveIntensity = .6 + .4 * Math.sin(t * 3 + e.it.ph);
}

function updateHud(near) {
  const left = run.state === 'surface' ? run.breath : run.air * run.breath;
  const low = run.state !== 'surface' && run.air < airNeeded(-run.y, DV.ASCEND, run.breath) + .08;
  const count = Object.values(run.bag).reduce((a, n) => a + n, 0) + run.carry.length;
  ui.setForageHud?.({ label: `${DIVE_COPY.air} · ${Math.min(DV.DIVES, run.dives + (run.state === 'surface' ? 0 : 1))}/${DV.DIVES}`, left, total: run.breath, count, late: low });
  const atExit = nearDiveExit();
  const moving = run.state === 'descend' || run.state === 'ascend';
  const label = atExit ? DIVE_COPY.out : run.state === 'surface' ? DIVE_COPY.dive : near ? DIVE_COPY.pick : DIVE_COPY.up;
  ui.setSeaBtn?.(label, atExit ? 'door' : moving ? 'wait' : near || run.state === 'surface' ? 'go' : '', !!resultCard);
}

export function updateDive(dt, t) {
  if (!group || !dive.active) return;
  if (dt > 0) { fpsN += 1; fpsSum += Math.min(120, 1 / dt); }
  const moved = Math.hypot(player.position.x - lastX, player.position.z - lastZ);
  swim.moving = dt > 0 && moved / dt > .4;
  lastX = player.position.x; lastZ = player.position.z;
  if (run && !run.over && !resultCard) {
    const ev = stepDiveRun(run, dt, local(), performance.now() - startMs);
    if (ev.outOfAir) spawnFloatText(player.position.x, run.y + 1.8, player.position.z, '😮‍💨', '#fff');
    if (ev.surfaced) {
      const got = run.legs[run.legs.length - 1]?.[4] || 0;
      if (got) spawnFloatText(player.position.x, DIVE_AREA.SURF_Y + 2.2, player.position.z, `🧺+${got}`, '#fff', 1.3);
      for (let i = 0; i < 8; i++) bubble(local().x + Math.random() - .5, DIVE_AREA.SURF_Y + 1, local().z + Math.random() - .5, .08, .6, .6);
    }
    if (run.state !== 'surface' && Math.random() < dt * 3) bubble(local().x + .3, run.y + 1.4, local().z + .3, .05 + Math.random() * .04);
    if (ev.over) finishRun();
  }
  swim.surface = !run || run.state === 'surface';
  if (run) player.position.y = run.state === 'surface' ? DIVE_AREA.SURF_Y + Math.sin(t * 2.4) * .09 : run.y;
  const near = run && run.state === 'swim' ? nearestDiveItem(run, local()) : null;
  updateDiveScene(scene, t, { x: _camPos.x - DIVE.x, z: _camPos.z - DIVE.z });
  updateFx(dt, t);
  hudT -= dt;
  if (hudT <= 0 && run) { hudT = .1; updateHud(near); }
}

export function diveCamera(camera, look, dt) {
  const under = run && run.state !== 'surface';
  const tall = camera.aspect < 1, fov = tall ? 60 : 46, k = tall ? 1.35 : innerHeight < 500 ? .85 : 1;
  if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  const f = 1 - Math.pow(.002, dt);
  _camPos.set(player.position.x, player.position.y + (under ? 1.9 : 4.2) * k, player.position.z + (under ? 6.4 : 7.5) * k);
  if (under) {
    _camPos.z = Math.min(_camPos.z, DIVE.z + CAM_UNDER_Z);
    _camPos.y = Math.max(DIVE.y - diveDepthAt(_camPos.x - DIVE.x, _camPos.z - DIVE.z) + 1.6, Math.min(DIVE.y - .9, _camPos.y));
  }
  camera.position.lerp(_camPos, f);
  look.lerp(_camLook.set(player.position.x, player.position.y + (under ? .3 : .2), player.position.z - 3), f);
  camera.lookAt(look);
}

export function diveAtmosphere(scn, camera) {
  if (!dive.active || camera.position.y > DIVE.y - .05) return;
  scn.background = DEEP;
  scn.fog.color.copy(DEEP); scn.fog.near = 1.5; scn.fog.far = 20;
}
