import * as THREE from 'three';
import {
  $w, IS_MOBILE, SEASON, WEATHER, clayMat, doPlayerAction, gameState, giveReward, handAnchor, heldToolMesh, isNight,
  measureStowLen, player, refreshInventoryUI, requestSave, rollDifficulty, seaGroup, setSpaceVisible, settleDifficulty,
  snapCamera, spawnFloatText, spawnSparkle, trackDiffAbandon, ui, updateStowPose,
} from '../game.js';
import { trackEvent } from '../analytics.js';
import { Sound } from '../sound.js';
import { sendForageRun } from '../supabase-client.js';
import { MUDFLAT } from '../data/places.js';
import { MUDFLAT as MF, MUD_SPECIES, breathPhase, inBreathWindow, mudWindow, summarizeBag, tideFront } from '../forage/logic.js';
import { createMudRun, stepMudRun, digMudRun, nearestHole } from '../forage/mudflat-run.js';
import { forageRow, resultEventParams, startEventParams } from '../forage/run.js';
import { withTried } from '../forage/pick.js';
import { showForageResult } from '../forage/result-card.js';
import { HOE_DEFAULT, HOE_FACE, HOE_VARIANTS, buildHoe } from '../forage/hoe-art.js';
import { dressHoe, skinOf, tierLook } from '../forage/hoe-skins.js';
import { homiSkinOf } from '../cosmetics/homi-skin-rules.js';
import { homiEffects, homiState } from '../forage/homi.js';
import { buildShore } from '../forage/mudflat-shore.js';
import { buildSea, updateSea } from '../forage/mudflat-sea.js';
import { exitSea } from './sea.js';

export const mudflat = { active: false };

export const MUDFLAT_COPY = {
  title: '밀물이 들어왔어요', sub: '바구니에 {0}개를 담았어요', empty: '다음엔 꼭 담아 와요',
  dig: '⛏️ 캐기', out: '🚪 나가기', exit: '🚪 마을로 나가기', hint: '🫧 방울 올라오는 구간에서 캐기',
};

const EXIT = { x: 0, z: 14 };
const MUD_Z0 = -26, MUD_Z1 = 15;
const DIG_IMPACT_MS = 250;
const _camPos = new THREE.Vector3(), _camLook = new THREE.Vector3();

let eyeOn = false, speedMul = 1, hintUntil = 0;
const HINT_MS = 2500;
let group = null, sea = null, ring = null, prevTool = null, shovel = null;
let holeGeo = null, rimGeo = null, pitMat = null, rimMat = null, rimHot = null, bubbleGeo = null, bubbleMat = null, partGeo = null, partMat = null;
let run = null, ctx = null, startMs = 0, lastInputMs = 0, idleMs = 0, fpsN = 0, fpsSum = 0, resultCard = null;
let meshes = new Map(), bubbles = [], parts = [], flying = [], fading = [], pendingDig = null, hudT = 0;

const local = () => ({ x: player.position.x - MUDFLAT.x, z: player.position.z - MUDFLAT.z });

function instanced(geo, mat, n, place) {
  const m = new THREE.InstancedMesh(geo, mat, n);
  const o = new THREE.Object3D();
  for (let i = 0; i < n; i++) { place(o, i); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }
  m.instanceMatrix.needsUpdate = true;
  return m;
}

function buildMudflat() {
  group = new THREE.Group();
  group.position.copy(MUDFLAT).sub(seaGroup.position);
  const geo = new THREE.PlaneGeometry(64, MUD_Z1 - MUD_Z0 + 2, 64, 41);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, .035 * Math.sin(p.getX(i) * 1.3) * Math.cos(p.getY(i) * 1.1) + .02 * Math.random());
  geo.computeVertexNormals();
  const mud = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x8d6e52, roughness: .55, metalness: .05, flatShading: true }));
  mud.rotation.x = -Math.PI / 2; mud.position.z = (MUD_Z0 + MUD_Z1) / 2 + 1; mud.receiveShadow = true;
  group.add(mud);
  group.add(instanced(new THREE.BoxGeometry(1, .02, .07), clayMat(0x76593f), 70, o => {
    o.position.set(-20 + Math.random() * 40, .045, MUD_Z0 + 2 + Math.random() * (MUD_Z1 - MUD_Z0 - 4));
    o.rotation.set(0, (Math.random() - .5) * .4, 0); o.scale.set(1.2 + Math.random() * 2, 1, 1);
  }));
  group.add(instanced(new THREE.CircleGeometry(1, 16), new THREE.MeshStandardMaterial({ color: 0x9cc6d4, roughness: .15, metalness: .1, transparent: true, opacity: .7 }), 9, o => {
    const r = .5 + Math.random() * .8;
    o.position.set(-14 + Math.random() * 28, .06, -18 + Math.random() * 30); o.rotation.set(-Math.PI / 2, 0, 0); o.scale.set(r, r * (.6 + Math.random() * .5), 1);
  }));
  group.add(buildShore(THREE, clayMat, { z0: MUD_Z0, z1: MUD_Z1 }));
  const post = new THREE.Mesh(new THREE.CylinderGeometry(.12, .14, 1.4, 7), clayMat(0x8a5a3a)); post.position.set(EXIT.x + 1.4, .6, EXIT.z); group.add(post);
  sea = buildSea(THREE, { mobile: IS_MOBILE });
  group.add(sea.group);
  ring = new THREE.Mesh(new THREE.RingGeometry(.92, 1, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .95, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .08; ring.visible = false; group.add(ring);
  holeGeo = [1, 2, 3].map(d => new THREE.CircleGeometry(.1 + .05 * d, 14));
  rimGeo = [1, 2, 3].map(d => { const r = .1 + .05 * d; return new THREE.RingGeometry(r, r * 1.7, 14); });
  pitMat = clayMat(0x3a2a1c); rimMat = clayMat(0x6e5440); rimHot = clayMat(0xa58a62);
  bubbleGeo = new THREE.SphereGeometry(1, 8, 6);
  bubbleMat = new THREE.MeshStandardMaterial({ color: 0xf2f8ff, roughness: .2, transparent: true, opacity: .85 });
  partGeo = new THREE.SphereGeometry(1, 6, 5); partMat = clayMat(0x6e5440);
  seaGroup.add(group);
}

function addHole(h) {
  const g = new THREE.Group(); g.position.set(h.x, 0, h.z);
  const d = h.sp.depth - 1;
  const pit = new THREE.Mesh(holeGeo[d], pitMat); pit.rotation.x = -Math.PI / 2; pit.position.y = .062; g.add(pit);
  const rim = new THREE.Mesh(rimGeo[d], rimMat); rim.rotation.x = -Math.PI / 2; rim.position.y = .058; g.add(rim);
  if (h.sp.id === 'razor') { pit.scale.set(.55, 1.5, 1); rim.scale.set(.6, 1.4, 1); }
  group.add(g);
  meshes.set(h.id, { g, rim, h, lastBub: 0 });
}

function dropHole(id) {
  const m = meshes.get(id); if (!m) return;
  meshes.delete(id);
  fading.push({ g: m.g, t: 0 });
}

function buildItem(sp) {
  const g = new THREE.Group(), s = sp.id === 'scallop' ? .22 : sp.id === 'cockle' ? .17 : .15;
  if (sp.id === 'razor') {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(.055, .36, 4, 8), clayMat(0xd6c08e)); m.rotation.z = Math.PI / 2; g.add(m);
  } else if (sp.id === 'crab') {
    const b = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), clayMat(0xd9774f)); b.scale.set(1.3, .55, 1); g.add(b);
    [-1, 1].forEach(k => { const c = new THREE.Mesh(new THREE.SphereGeometry(s * .45, 8, 6), clayMat(0xd9774f)); c.position.set(k * s * 1.2, .02, s * .8); g.add(c); });
  } else if (sp.id === 'octo') {
    const h = new THREE.Mesh(new THREE.SphereGeometry(.2, 12, 10), clayMat(0xc9675a, false)); h.scale.set(1, 1.2, 1); h.position.y = .12; g.add(h);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, t = new THREE.Mesh(new THREE.CapsuleGeometry(.03, .22, 3, 6), clayMat(0xc9675a, false)); t.position.set(Math.cos(a) * .12, -.04, Math.sin(a) * .12); t.rotation.set(Math.sin(a) * .9, 0, -Math.cos(a) * .9); g.add(t); }
  } else {
    const top = { clam: 0xd8c8a8, cockle: 0xb89a78, scallop: 0xe79a72 }[sp.id], bot = { clam: 0x8a7a62, cockle: 0x6e5a44, scallop: 0xc0603e }[sp.id];
    const geo = new THREE.SphereGeometry(s, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const a = new THREE.Mesh(geo, clayMat(top)); a.scale.set(1, sp.id === 'scallop' ? .3 : .5, .85); g.add(a);
    const b = new THREE.Mesh(geo, clayMat(bot)); b.scale.set(1, sp.id === 'scallop' ? -.18 : -.4, .85); g.add(b);
  }
  return g;
}

function splash(x, z, n, up = 3) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(partGeo, partMat); m.scale.setScalar(.04 + Math.random() * .04);
    m.position.set(x, .15, z); group.add(m);
    const a = Math.random() * Math.PI * 2, s = .8 + Math.random() * 1.4;
    parts.push({ m, v: new THREE.Vector3(Math.cos(a) * s, up * (.6 + Math.random() * .6), Math.sin(a) * s), life: .7 });
  }
}

function holdShovel(on) {
  if (!handAnchor) return;
  if (on) {
    if (shovel) return;
    prevTool = heldToolMesh;
    if (heldToolMesh) handAnchor.remove(heldToolMesh);
    const q = new URLSearchParams(location.search), hoe = q.get('hoe'), face = parseFloat(q.get('hoeface'));
    const tier = homiState(gameState.sea.forage?.homi).tier, skin = homiSkinOf(gameState.cosmetics), look = skinOf(skin) || tierLook(tier);
    shovel = dressHoe(THREE, clayMat, buildHoe(THREE, clayMat, HOE_VARIANTS.includes(hoe) ? hoe : HOE_DEFAULT, Number.isFinite(face) ? face : HOE_FACE, look?.pal, look?.over), skin, tier);
    measureStowLen(shovel); updateStowPose();
    $w.heldToolMesh = shovel; handAnchor.add(shovel);
  } else {
    if (!shovel) return;
    handAnchor.remove(shovel); shovel = null;
    $w.heldToolMesh = prevTool; prevTool = null;
    if (heldToolMesh) handAnchor.add(heldToolMesh);
    updateStowPose();
  }
}

function clearRunVisuals() {
  for (const m of meshes.values()) group.remove(m.g);
  meshes = new Map();
  for (const b of bubbles) group.remove(b.m);
  for (const p of parts) group.remove(p.m);
  for (const f of flying) group.remove(f.m);
  for (const f of fading) group.remove(f.g);
  bubbles = []; parts = []; flying = []; fading = []; pendingDig = null;
  if (ring) ring.visible = false;
}

function startRun({ entry, prevMode }) {
  const diff = rollDifficulty('mudflat');
  const win = mudWindow(diff.ease);
  const forage = gameState.sea.forage || {};
  const plays = (forage.plays?.mudflat || 0) + 1;
  ctx = {
    mode: 'mudflat', runId: crypto.randomUUID(), attemptN: plays, firstTime: !forage.tried?.mudflat, entry, prevMode,
    night: isNight(), weather: WEATHER, season: SEASON, input: IS_MOBILE ? 'touch' : 'keys',
    orientation: innerWidth >= innerHeight ? 'landscape' : 'portrait', coinsBefore: gameState.inventory.coins || 0,
    diff, params: { win, breathS: null, tideS: MF.TIDE },
  };
  const eff = homiEffects(forage.homi);
  ctx.homi = { tier: eff.tier, engraves: eff.engraves };
  eyeOn = eff.eye; speedMul = eff.speed;
  gameState.sea = { ...gameState.sea, forage: { ...withTried(forage, 'mudflat'), plays: { ...(forage.plays || {}), mudflat: plays } } };
  requestSave();
  clearRunVisuals();
  player.position.set(MUDFLAT.x, 0, MUDFLAT.z + 7); player.rotation.y = Math.PI;
  run = createMudRun({ rnd: Math.random, win, player: local(), reach: eff.reach, missLimit: eff.missLimit });
  run.holes.forEach(addHole);
  startMs = performance.now(); lastInputMs = startMs; hintUntil = startMs + HINT_MS; idleMs = 0; fpsN = 0; fpsSum = 0;
  trackEvent('forage_start', startEventParams(ctx));
}

const summary = () => summarizeBag(MUD_SPECIES, run.bag);
const fpsAvg = () => (fpsN ? fpsSum / fpsN : null);

function finishRun() {
  const sum = summary();
  const dur = performance.now() - startMs;
  trackEvent('forage_result', resultEventParams({ ctx, summary: sum, good: run.good, bad: run.bad, endReason: 'tide', durationMs: dur }));
  const n = run.good + run.bad;
  settleDifficulty('mudflat', n ? run.good / n : 0);
  sendForageRun(forageRow({
    ctx, outcome: 'finish', endReason: 'tide', durationMs: dur, summary: sum, good: run.good, bad: run.bad,
    acts: run.acts, lostTide: run.lostTide, lostMiss: run.lostMiss, idleMs, fpsAvg: fpsAvg(),
  }));
  requestSave();
  ring.visible = false;
  ui.setSeaBtn?.(MUDFLAT_COPY.dig, '', true);
  resultCard = showForageResult({
    mode: 'mudflat', title: MUDFLAT_COPY.title,
    sub: sum.count ? MUDFLAT_COPY.sub.replace('{0}', sum.count) : MUDFLAT_COPY.empty,
    items: sum.items, coins: sum.coins, sellValue: sum.sellValue,
    onAgain: () => { resultCard = null; startRun({ entry: 'again', prevMode: 'mudflat' }); snapCamera(); },
    onHome: () => { resultCard = null; exitSea(); },
  });
}

function abandonRun(stage) {
  const sum = summary();
  const dur = performance.now() - startMs;
  trackDiffAbandon('mudflat', ctx.diff, stage, { run_id: ctx.runId });
  sendForageRun(forageRow({
    ctx, outcome: 'abandon', abandonStage: stage, endReason: 'exit', durationMs: dur, summary: sum, good: run.good, bad: run.bad,
    acts: run.acts, lostTide: run.lostTide, lostMiss: run.lostMiss, idleMs, fpsAvg: fpsAvg(),
  }));
}

export function enterMudflat(o = {}) {
  if (!group) buildMudflat();
  $w.atSea = true;
  mudflat.active = true;
  holdShovel(true);
  ui.setSeaMode?.(true);
  startRun({ entry: o.entry || 'pick', prevMode: o.prevMode ?? null });
  snapCamera(); setSpaceVisible();
}

export function leaveMudflat() {
  if (!mudflat.active) return;
  if (run && !run.over) abandonRun(run.good + run.bad ? 'dig' : 'look');
  resultCard?.close(); resultCard = null;
  clearRunVisuals();
  run = null; ctx = null;
  holdShovel(false);
  ui.setForageHud?.(null);
  mudflat.active = false;
}

function impact({ r }) {
  if (r.kind === 'none') return;
  const h = r.hole;
  splash(h.x, h.z, 7);
  if (r.kind === 'hit') {
    const sp = r.species;
    giveReward({ [sp.key]: 1, coins: sp.coin }, 'mudflat_dig', sp.id);
    refreshInventoryUI?.();
    const m = buildItem(sp); m.position.set(h.x, .05, h.z); group.add(m);
    flying.push({ m, t: 0, x: h.x, z: h.z });
    spawnFloatText(MUDFLAT.x + h.x, 1.4, MUDFLAT.z + h.z, `${sp.ico}+1`, '#fff', sp.rare ? 1.4 : 1);
    if (sp.rare) spawnSparkle(MUDFLAT.x + h.x, .8, MUDFLAT.z + h.z, 20);
    Sound.harvest?.();
    dropHole(h.id);
  } else {
    spawnFloatText(MUDFLAT.x + h.x, 1.2, MUDFLAT.z + h.z, '💨', '#fff');
    Sound.blip?.();
    if (r.gone) dropHole(h.id);
  }
}

export function mudflatHint() {
  return performance.now() < hintUntil ? MUDFLAT_COPY.hint : '';
}

export function mudflatSpeedMult() {
  return mudflat.active && run && !run.over ? speedMul : 1;
}

export function mudflatAction() {
  if (!run || run.over || resultCard || pendingDig) return;
  const now = performance.now();
  if (now - lastInputMs > 3000) idleMs += now - lastInputMs;
  lastInputMs = now;
  const p = local();
  const h = nearestHole(run, p);
  if (!h) { spawnFloatText(player.position.x, 2, player.position.z, '🤔', '#fff'); return; }
  const wx = MUDFLAT.x + h.x, wz = MUDFLAT.z + h.z;
  doPlayerAction(wx, wz, 'homi');
  pendingDig = { at: now + DIG_IMPACT_MS, r: digMudRun(run, p, now - startMs) };
}

export function clampMudflat(pos) {
  const front = tideFront(run ? run.t : 0);
  pos.x = Math.max(MUDFLAT.x - 14, Math.min(MUDFLAT.x + 14, pos.x));
  pos.z = Math.max(MUDFLAT.z + front + .45, Math.min(MUDFLAT.z + MUD_Z1 + 3, pos.z));
}

export function nearMudflatExit() {
  return Math.hypot(player.position.x - MUDFLAT.x - EXIT.x, player.position.z - MUDFLAT.z - EXIT.z) < 2.2;
}

function updateHoles(dt, near, t) {
  for (const m of meshes.values()) {
    if (breathPhase(m.h.phase) < .3 && t - m.lastBub > .11) {
      m.lastBub = t;
      const s = .05 + Math.random() * .035 + m.h.sp.depth * .012;
      const mesh = new THREE.Mesh(bubbleGeo, bubbleMat); mesh.scale.setScalar(s);
      mesh.position.set(m.h.x + (Math.random() - .5) * .2, .08, m.h.z + (Math.random() - .5) * .2); group.add(mesh);
      bubbles.push({ m: mesh, life: 0, s });
    }
    m.rim.material = m.h === near ? rimHot : rimMat;
    if (eyeOn && m.h.sp.rare && t - (m.lastGlint ?? -9) > 1.1) { m.lastGlint = t; spawnSparkle(MUDFLAT.x + m.h.x, .35, MUDFLAT.z + m.h.z, 5); }
  }
  for (const f of fading) { f.t += dt; f.g.scale.setScalar(Math.max(.01, 1 - f.t / .6)); }
  fading = fading.filter(f => { if (f.t >= .6) { group.remove(f.g); return false; } return true; });
  for (const bb of bubbles) { bb.life += dt; bb.m.position.y += dt * .7; bb.m.scale.setScalar(bb.s * Math.max(.05, 1 - bb.life / .7)); }
  bubbles = bubbles.filter(bb => { if (bb.life > .7) { group.remove(bb.m); return false; } return true; });
}

function updateRing(near) {
  if (!near || !run || run.over) { ring.visible = false; return; }
  const b = breathPhase(near.phase), r = .1 + .05 * near.sp.depth;
  const lead = b > .55 ? (1 - b) / .45 : b < run.win ? 0 : 1;
  ring.visible = true;
  ring.position.set(near.x, .08, near.z);
  ring.scale.setScalar(r * 1.9 + lead * 1.1);
  ring.material.color.set(b < run.win ? 0xb6ff9e : 0xffffff);
  ring.material.opacity = b >= run.win && b <= .55 ? .25 : .95;
}

function updateFx(dt) {
  for (const p of parts) { p.life -= dt; p.v.y -= 9 * dt; p.m.position.addScaledVector(p.v, dt); if (p.m.position.y < .05) { p.m.position.y = .05; p.v.set(0, 0, 0); } }
  parts = parts.filter(p => { if (p.life <= 0) { group.remove(p.m); return false; } return true; });
  const { x: px, z: pz } = local();
  for (const f of flying) {
    f.t += dt;
    if (f.t < .55) { const k = f.t / .55; f.m.position.set(f.x, .05 + Math.sin(k * Math.PI * .5) * 1.1, f.z); f.m.rotation.y += dt * 9; }
    else { const k = Math.min(1, (f.t - .55) / .35); f.m.position.set(f.x + (px - f.x) * k, 1.15 + .2 * k, f.z + (pz - f.z) * k); f.m.scale.setScalar(1 - k * .7); }
  }
  flying = flying.filter(f => { if (f.t >= .9) { group.remove(f.m); return false; } return true; });
}

export function updateMudflat(dt, t) {
  if (!group || !mudflat.active) return;
  if (dt > 0) { fpsN += 1; fpsSum += Math.min(120, 1 / dt); }
  if (run && !run.over && !resultCard) {
    const res = stepMudRun(run, dt, local());
    res.spawned.forEach(addHole);
    res.gone.forEach(g => dropHole(g.id));
    if (res.over) finishRun();
  }
  if (pendingDig && performance.now() >= pendingDig.at) { const d = pendingDig; pendingDig = null; impact(d); }
  const front = tideFront(run ? run.t : 0);
  updateSea(sea, t, front);
  const near = run && !run.over ? nearestHole(run, local()) : null;
  updateHoles(dt, near, t);
  updateRing(near);
  updateFx(dt);
  hudT -= dt;
  if (hudT <= 0 && run) {
    hudT = .1;
    const left = Math.max(0, run.tide - run.t);
    ui.setForageHud?.({ left, total: run.tide, count: run.good, late: left < 15 });
    const atExit = nearMudflatExit();
    ui.setSeaBtn?.(atExit ? MUDFLAT_COPY.out : MUDFLAT_COPY.dig, atExit ? 'door' : near && inBreathWindow(near.phase, run.win) ? 'go' : '', !!resultCard);
  }
}

let camOverride = null;
export function setMudflatCam(o) { camOverride = o || null; return camOverride; }

export function mudflatCamera(camera, look, dt) {
  if (camOverride) {
    const { x = 0, y = 1.6, z = 3.2, ly = .9, fov = 42 } = camOverride;
    if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    camera.position.set(player.position.x + x, y, player.position.z + z);
    look.set(player.position.x, ly, player.position.z);
    camera.lookAt(look);
    return;
  }
  const tall = camera.aspect < 1, fov = tall ? 60 : 42, k = tall ? 1.35 : innerHeight < 500 ? .8 : 1;
  if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  const f = 1 - Math.pow(0.002, dt);
  camera.position.lerp(_camPos.set(player.position.x, 6.4 * k, player.position.z + 8.6 * k), f);
  look.lerp(_camLook.set(player.position.x, .3, player.position.z - 4.2), f);
  camera.lookAt(look);
}

export function mudflatDebug() {
  return { active: mudflat.active, holes: run ? run.holes.length : 0, meshes: meshes.size, t: run ? run.t : 0, good: run?.good ?? 0, bad: run?.bad ?? 0, over: !!run?.over, result: !!resultCard, run };
}
