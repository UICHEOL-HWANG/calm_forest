import * as THREE from 'three';
import { createRope, resetRope, stepRope, buoyFlight } from '../sea-feel.js';
import { seaRodRest, seaRodTip } from '../spaces/sea.js';
import { REST_POSE, WAIT_ELEV, withHold, dropPose, waitPose, bobberDip, liftPose, LIFT_END, bezierPoint, castTarget, DROP_REL, DROP_END, DROP_FLIGHT, LAND_FLOP, REEL_TIME } from './fish-feel.js';
import { catchMesh, disposeCatch } from './catch-models.js';
import { part, mergedMesh } from '../vertex-merge.js';

const N = 16, OVER_Y = 3.9, WATER_Y = 0, DECK_Y = 0.42;
const S = { st: null, t: 0, stow: 1, twitch: 0, yaw: 0, onLanded: null, landFrom: null };
const over = new THREE.Vector3(), tip = new THREE.Vector3(), target = new THREE.Vector3(), deck = new THREE.Vector3(), reelFrom = new THREE.Vector3(), lineEnd = new THREE.Vector3();
let root = null, buoy = null, line = null, rope = null, fish = null;

export function initFishing(group) {
  root = group;
  buoy = new THREE.Group();
  buoy.add(mergedMesh([
    part(new THREE.SphereGeometry(0.13, 9, 7), 0xef8a4a, { scale: [1, 1.25, 1] }),
    part(new THREE.CylinderGeometry(0.125, 0.125, 0.07, 9), 0xf4efe6),
  ]));
  buoy.visible = false; root.add(buoy);
  const geo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: N }, () => new THREE.Vector3()));
  line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xf6f2e4 }));
  line.frustumCulled = false; line.visible = false; root.add(line);
  rope = createRope(N, { x: 0, y: 0, z: 0 });
}

export const fishingState = () => S.st;
export const castSpot = () => target;
export const fishingBusy = () => S.st === 'drop' || S.st === 'lift' || S.st === 'land' || S.st === 'reel';

export function castLine(spotPos, from, facing) {
  const t = castTarget(spotPos, from, facing);
  S.st = 'drop'; S.t = 0; S.twitch = 0; S.stow = 0;
  target.set(t.x, WATER_Y, t.z);
  S.yaw = Math.atan2(t.x - from.x, t.z - from.z);
  buoy.visible = false; line.visible = false;
}

export function twitchRod() { S.twitch = 1; }

export function hookFish(kind, boatPos, onLanded) {
  S.st = 'lift'; S.t = 0; S.onLanded = onLanded; S.landFrom = null;
  fish = catchMesh(kind); fish.position.copy(buoy.position); root.add(fish);
  const dx = target.x - boatPos.x, dz = target.z - boatPos.z, d = Math.hypot(dx, dz) || 1, side = -0.78;
  deck.set(boatPos.x + dx / d * side, DECK_Y, boatPos.z + dz / d * side);
  over.set(boatPos.x - dx / d * 0.7, OVER_Y, boatPos.z - dz / d * 0.7);
  buoy.visible = false;
}

export function reelIn() {
  if (!buoy.visible) return clearFishing();
  S.st = 'reel'; S.t = 0; reelFrom.copy(buoy.position);
}

export function clearFishing() {
  S.st = null; S.t = 0;
  if (buoy) buoy.visible = false;
  if (line) line.visible = false;
  if (fish) { root.remove(fish); disposeCatch(fish); fish = null; }
}

function stepLine(dt, end, slack) {
  if (!seaRodTip(tip)) return;
  if (!line.visible) { resetRope(rope, tip); line.visible = true; }
  stepRope(rope, tip, end, slack, Math.min(dt, 0.05));
  const pts = line.geometry.attributes.position.array;
  for (let i = 0; i < N; i++) { const p = rope[i].p; if (p.y < WATER_Y - 0.05) p.y = WATER_Y - 0.05; pts[i * 3] = p.x; pts[i * 3 + 1] = p.y; pts[i * 3 + 2] = p.z; }
  line.geometry.attributes.position.needsUpdate = true;
}

function dropTick(dt) {
  seaRodRest(S.yaw, dropPose(S.t));
  if (S.t < DROP_REL) return;
  seaRodTip(tip);
  if (!buoy.visible) { buoy.visible = true; buoy.userData.from = tip.clone(); }
  const f = buoyFlight(buoy.userData.from, target, DROP_FLIGHT, S.t - DROP_REL, 10);
  buoy.position.set(f.x, Math.max(WATER_Y, f.y), f.z);
  stepLine(dt, buoy.position, 1.05);
  if (S.t >= Math.max(DROP_END, DROP_REL + DROP_FLIGHT)) { S.st = 'wait'; S.t = 0; }
}

function waitTick(dt, time, bite) {
  S.twitch = Math.max(0, S.twitch - dt * 4);
  seaRodRest(S.yaw, waitPose(time, bite, S.twitch));
  buoy.position.set(target.x, WATER_Y + bobberDip(time, bite), target.z);
  lineEnd.set(buoy.position.x, buoy.position.y + 0.08, buoy.position.z);
  stepLine(dt, lineEnd, bite ? 1.0 : 1.08);
}

function liftTick(dt, time) {
  const { pose, fish: f } = liftPose(S.t);
  seaRodRest(S.yaw, pose);
  seaRodTip(tip);
  if (f.phase === 'water') {
    fish.position.set(target.x + Math.sin(time * 40) * 0.06, WATER_Y - 0.12, target.z + Math.cos(time * 33) * 0.06);
    fish.rotation.set(-Math.PI / 2 + 0.4, time * 9, 0);
  } else {
    if (!S.landFrom) S.landFrom = fish.position.clone();
    const p = bezierPoint(S.landFrom, over, deck, f.k);
    fish.position.set(p.x, p.y, p.z);
    fish.rotation.set(-Math.PI / 2 * (1 - f.k), f.k * Math.PI * 1.5, 0);
  }
  if (fish.userData.tail) fish.userData.tail.rotation.y = Math.sin(time * 30) * 0.5;
  lineEnd.copy(fish.position);
  if (f.phase === 'land' && f.k > 0.85) line.visible = false;
  else stepLine(dt, lineEnd, 1.0);
  if (S.t >= LIFT_END) { S.st = 'land'; S.t = 0; line.visible = false; }
}

function landTick(time) {
  seaRodRest(S.yaw, REST_POSE);
  const k = Math.min(1, S.t / LAND_FLOP), hop = Math.abs(Math.sin(S.t * 14)) * 0.12 * (1 - k);
  fish.position.set(deck.x, DECK_Y + hop, deck.z);
  fish.rotation.set(0, fish.rotation.y, Math.PI / 2 + Math.sin(time * 22) * 0.6 * (1 - k));
  if (S.t >= LAND_FLOP) { const cb = S.onLanded; const at = fish.position.clone(); clearFishing(); cb?.(at); }
}

function reelTick(dt) {
  const k = Math.min(1, S.t / REEL_TIME), e = k * k * (3 - 2 * k);
  seaRodRest(S.yaw, withHold({ elev: WAIT_ELEV + (REST_POSE.elev - WAIT_ELEV) * e }, e));
  seaRodTip(tip);
  buoy.position.lerpVectors(reelFrom, tip, k * k);
  stepLine(dt, buoy.position, 1.0);
  if (k >= 1) clearFishing();
}

export function tickFishing(dt, time, { yaw, bite, aimYaw, ready = true }) {
  if (!root) return;
  if (aimYaw != null) S.yaw = aimYaw;
  S.t += dt;
  if (S.st === 'drop') return dropTick(dt);
  if (S.st === 'wait') return waitTick(dt, time, bite);
  if (S.st === 'lift') return liftTick(dt, time);
  if (S.st === 'land') return landTick(time);
  if (S.st === 'reel') return reelTick(dt);
  S.stow = ready ? Math.max(0, S.stow - dt * STOW_SPEED) : Math.min(1, S.stow + dt * STOW_SPEED);
  seaRodRest(yaw, { ...REST_POSE, stow: smoothStow(S.stow) });
}

const STOW_SPEED = 3;
const smoothStow = u => u * u * (3 - 2 * u);
export const rodStow = () => S.stow;
