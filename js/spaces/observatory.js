// =============================================================
//  🔭 천문대 — 마을 게이트 + 실내 홀
// =============================================================
import {
  $w, Input, clayMat, colliders, disposeTree, firstHint, mergeGeos, obstacles, player, playerAnchor, scene, setFogExempt,
  setSpaceVisible, snapCamera, solidBox, solidCircle, ui,
} from '../game.js';
import { trackEvent } from '../analytics.js';
import { OBSERVATORY, OBSERVATORY_GATE, OBSERVATORY_R } from '../data/places.js';
import { Sound } from '../sound.js';
import { buildObservatoryExterior } from '../observatory/exterior.js';
import { HALL_SOLIDS, TELESCOPE, buildObservatoryInterior } from '../observatory/interior.js';
import * as THREE from 'three';

export const OBSERVATORY_LIGHT = {
  hemi: 0.5, amb: 0.58, sun: 0.32, tint: 0xe8e5ff, sunTint: 0xfff1cf,
  player: 0.95, fog: 0x1a2552, near: 18, far: 46,
};

export let observatoryGateGroup = null, observatoryGateColliders = [];
let hallBuilt = false;
let lookState = null;

export const TELESCOPE_EYE = TELESCOPE.eye;
export const TELESCOPE_SPOT = { x: TELESCOPE_EYE.x, z: TELESCOPE_EYE.z + 0.5, r: 1.1 };


export function spawnObservatoryGate() {
  const g = buildObservatoryExterior(mergeGeos);
  g.position.copy(OBSERVATORY_GATE);
  scene.add(g);
  obstacles.push({ x: OBSERVATORY_GATE.x, z: OBSERVATORY_GATE.z, r: 5.9 });
  observatoryGateColliders.push(solidCircle(OBSERVATORY_GATE.x, OBSERVATORY_GATE.z, 5.7));
  return g;
}

export function refreshObservatoryGate() {
  if (observatoryGateGroup) {
    scene.remove(observatoryGateGroup); disposeTree(observatoryGateGroup);
    for (const c of observatoryGateColliders) { const i = colliders.indexOf(c); if (i >= 0) colliders.splice(i, 1); }
    const oi = obstacles.findIndex(o => o.x === OBSERVATORY_GATE.x && o.z === OBSERVATORY_GATE.z);
    if (oi >= 0) obstacles.splice(oi, 1);
  }
  observatoryGateColliders = [];
  observatoryGateGroup = spawnObservatoryGate();
}

// 🎥 The hall is small and the door is at the south edge, so a camera that just follows the
//    player leaves the bottom half of the screen empty. Pull the focus most of the way to the centre.
const CAM_PULL = 0.4;
export function observatoryCamFocus(pos, out) {
  return out.set(OBSERVATORY.x + (pos.x - OBSERVATORY.x) * CAM_PULL, pos.y, OBSERVATORY.z + (pos.z - OBSERVATORY.z) * CAM_PULL);
}

export function buildObservatoryHall() {
  const g = buildObservatoryInterior(mergeGeos, OBSERVATORY_R);
  g.position.copy(OBSERVATORY);
  g.visible = false;
  scene.add(g);
  hallBuilt = true;
  return g;
}

let hallColliders = null;   // 홀은 다시 빌드하지 않으니 가구 충돌체도 한 번만 등록
export function ensureObservatoryHall() {
  if (!$w.observatoryGroup) $w.observatoryGroup = buildObservatoryHall();
  hallColliders ??= HALL_SOLIDS.map(s => s.r !== undefined
    ? solidCircle(OBSERVATORY.x + s.x, OBSERVATORY.z + s.z, s.r)
    : solidBox(OBSERVATORY.x + s.x1, OBSERVATORY.z + s.z1, OBSERVATORY.x + s.x2, OBSERVATORY.z + s.z2));
  return $w.observatoryGroup;
}

export function enterObservatory() {
  $w.atObservatory = true; setFogExempt(player, true);
  const hall = ensureObservatoryHall();
  hall.visible = true;
  player.position.set(OBSERVATORY.x, 0, OBSERVATORY.z + OBSERVATORY_R - 2.0);
  player.rotation.y = Math.PI;
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null;
  snapCamera(); setSpaceVisible();
  firstHint('observatory', '🔭', '천문대', '망원경으로 별자리를 이어 보는 곳이에요. 나갈 땐 남쪽 문');
  Sound.blip(); trackEvent('observatory_enter');
}

function resetLookPose() {
  if (!lookState) return;
  playerAnchor.rotation.x = lookState.anchorX;
  player.position.y = 0;
  if (lookState.ownsLock) document.body.classList.remove('menu-open');
  lookState = null;
}

async function openStarView() {
  const session = lookState;
  try {
    const mod = await import('../observatory/ui.js');
    if (lookState !== session) return;
    await mod.openStarView?.({ onClose: resetLookPose });
  } catch {
    ui.toast?.('🔭 별보기 준비 중이에요', 1600);
    resetLookPose();
  }
}

export function startObservatoryLook() {
  if (lookState) return;
  Input.setAnalog(0, 0);
  lookState = { t: 0, duration: 0.7, opened: false, anchorX: playerAnchor.rotation.x };
  lookState.ownsLock = !document.body.classList.contains('menu-open');
  document.body.classList.add('menu-open');
  player.position.set(OBSERVATORY.x + TELESCOPE_EYE.x, 0.18, OBSERVATORY.z + TELESCOPE_EYE.z);
  player.rotation.y = TELESCOPE_EYE.yaw;
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null;
  Sound.blip();
  trackEvent('star_start', { constellation: 'big_dipper' });
}

export function updateObservatory(dt, t) {
  if (!lookState) return;
  player.position.set(OBSERVATORY.x + TELESCOPE_EYE.x, 0.18, OBSERVATORY.z + TELESCOPE_EYE.z);
  player.rotation.y = TELESCOPE_EYE.yaw;
  lookState.t = Math.min(lookState.duration, lookState.t + dt);
  const k = Math.min(1, lookState.t / lookState.duration);
  playerAnchor.rotation.x = -0.5 * k;
  $w.armWristK = 0;
  if (!lookState.opened && k >= 1) {
    lookState.opened = true;
    openStarView();
  }
}

export function exitObservatory() {
  resetLookPose();
  $w.atObservatory = false; setFogExempt(player, false);
  if ($w.observatoryGroup) $w.observatoryGroup.visible = false;
  player.position.set(OBSERVATORY_GATE.x, 0, OBSERVATORY_GATE.z + 6.8);
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null;
  snapCamera(); setSpaceVisible();
  Sound.blip(); trackEvent('observatory_exit');
}

export function observatoryBuilt() {
  return hallBuilt;
}
