import * as THREE from 'three';
import { $w, player, scene, camera, ui, snapCamera, setSpaceVisible, setFogExempt, firstHint, todayStr, gameState, obstacles, solidCircle, setCameraRig, requestSave, mgView } from '../game.js';
import { trackEvent } from '../analytics.js';
import { Sound, setBGMTheme } from '../sound.js';
import { MOUNTAIN, MOUNTAIN_GATE } from '../data/places.js';
import { isMountainOpen } from '../mountain/unlock.js';
import { buildGateArt } from '../mountain/gate-art.js';
import { createReveal } from '../mountain/reveal.js';
import { buildMountainSpace, pathY } from '../mountain/terrain.js';
import { CLIMB_PATH, nearestOnPath } from '../mountain/climb.js';
import { duelActive } from './night-visit.js';
import { inVillage2 } from './doors.js';

const PLAZA = { x: 4, z: 28, r: 9 };
export const MOUNTAIN_EXIT_LOCAL = { x: 4, z: 36 };
let reveal = null;

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
  $w.atMountain = false;
  setFogExempt(player, false);
  if ($w.mountainGroup) $w.mountainGroup.visible = false;
  setCameraRig(null);
  player.position.set(MOUNTAIN_GATE.x, 0, MOUNTAIN_GATE.z + 4);
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null;
  snapCamera(); setSpaceVisible(); setBGMTheme('main');
  trackEvent('mountain_exit');
}

export function clampToMountain(p) {
  const lx = p.x - MOUNTAIN.x, lz = p.z - MOUNTAIN.z;
  if (Math.hypot(lx - PLAZA.x, lz - PLAZA.z) <= PLAZA.r) { p.y = 0; return; }
  const n = nearestOnPath({ x: lx, z: lz });
  const a = CLIMB_PATH[n.seg], b = CLIMB_PATH[n.seg + 1];
  const segLen = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  const k = Math.hypot(n.x - a.x, n.z - a.z) / segLen;
  p.y = pathY(n.seg) + (pathY(n.seg + 1) - pathY(n.seg)) * k;
  if (n.dist <= 1.5) return;
  const s = 1.5 / n.dist;
  p.x = MOUNTAIN.x + n.x + (lx - n.x) * s;
  p.z = MOUNTAIN.z + n.z + (lz - n.z) * s;
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
  if (reveal || mgView || duelActive || !inVillage2()) return;
  if (!mountainOpen() || gameState.hintsSeen?.mountainReveal || $w.atMountain) return;
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

export function updateMountain(dt) {
  if (reveal && !reveal.update(dt)) reveal = null;
}
