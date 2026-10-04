// =============================================================
//  🔭 천문대 — 마을 게이트 + 실내 홀
// =============================================================
import {
  $w, clayMat, colliders, disposeTree, firstHint, mergeGeos, obstacles, player, scene, setFogExempt,
  setSpaceVisible, snapCamera, solidBox, solidCircle, ui,
} from '../game.js';
import { trackEvent } from '../analytics.js';
import { OBSERVATORY, OBSERVATORY_GATE, OBSERVATORY_R } from '../data/places.js';
import { Sound } from '../sound.js';
import * as THREE from 'three';

export const OBSERVATORY_LIGHT = {
  hemi: 0.5, amb: 0.58, sun: 0.32, tint: 0xe8e5ff, sunTint: 0xfff1cf,
  player: 0.95, fog: 0x1a2552, near: 18, far: 46,
};

export let observatoryGateGroup = null, observatoryGateColliders = [];
let hallBuilt = false;

const box = (w, h, d, x, y, z, ry = 0) => {
  const b = new THREE.BoxGeometry(w, h, d);
  if (ry) b.rotateY(ry);
  return b.translate(x, y, z);
};

const cyl = (rt, rb, h, seg, x, y, z, ry = 0, openEnded = false) => {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, openEnded);
  if (ry) g.rotateY(ry);
  return g.translate(x, y, z);
};

function addPart(parts, key, ...geos) {
  const list = parts.get(key) || (parts.set(key, []), parts.get(key));
  list.push(...geos);
}

function meshParts(group, parts, mats, { castBody = null } = {}) {
  for (const [key, geos] of parts) {
    const mesh = new THREE.Mesh(geos.length > 1 ? mergeGeos(geos) : geos[0], mats[key]);
    mesh.receiveShadow = true;
    mesh.castShadow = key === castBody;
    group.add(mesh);
  }
}

function buildDomeGeo(r = 4.25) {
  const geo = new THREE.SphereGeometry(r, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const pos = geo.attributes.position;
  const keep = [];
  for (let i = 0; i < geo.index.count; i += 3) {
    const tri = [geo.index.getX(i), geo.index.getX(i + 1), geo.index.getX(i + 2)];
    const cut = tri.every(idx => Math.abs(pos.getX(idx)) < 0.42 && pos.getZ(idx) > 0.05);
    if (!cut) keep.push(...tri);
  }
  geo.setIndex(keep);
  geo.computeVertexNormals();
  return geo.translate(0, 4.6, 0);
}

function starGeo(x, y, z, s) {
  return new THREE.OctahedronGeometry(s, 0).translate(x, y, z);
}

export function spawnObservatoryGate() {
  const g = new THREE.Group();
  g.position.copy(OBSERVATORY_GATE);
  const mats = {
    base: clayMat(0xb9ae95, false),
    wall: clayMat(0xd8d0bc, false),
    dome: clayMat(0x2f3f6b, false),
    gold: clayMat(0xd9b45a, false),
    door: clayMat(0x1a2552, false),
    dark: clayMat(0x141a30, false),
    glass: new THREE.MeshStandardMaterial({ color: 0xffe4a3, emissive: 0xffd680, emissiveIntensity: 0.75, roughness: 0.45 }),
  };
  const parts = new Map();
  addPart(parts, 'base', cyl(5.8, 5.8, 0.45, 28, 0, 0.22, 0), cyl(5.45, 5.45, 0.55, 28, 0, 0.72, 0));
  addPart(parts, 'wall', cyl(4.2, 4.2, 3.35, 32, 0, 2.4, 0));
  addPart(parts, 'dome', buildDomeGeo());
  addPart(parts, 'gold', cyl(4.35, 4.35, 0.16, 32, 0, 4.45, 0), cyl(4.0, 4.0, 0.1, 32, 0, 5.65, 0));
  addPart(parts, 'dark', box(1.0, 1.5, 0.18, 0, 4.85, 3.54));
  addPart(parts, 'door', box(1.55, 2.25, 0.22, 0, 1.45, 4.12));
  for (let i = 0; i < 4; i++) addPart(parts, 'base', box(3.2 - i * 0.35, 0.14, 0.58, 0, 0.18 + i * 0.11, 5.05 + i * 0.5));
  for (const sx of [-1, 1]) {
    addPart(parts, 'glass', box(0.75, 0.7, 0.12, sx * 2.75, 2.7, 3.1, sx * 0.35));
    addPart(parts, 'gold', box(0.12, 1.7, 0.14, sx * 0.56, 4.95, 3.58), box(0.12, 1.7, 0.14, sx * 1.03, 4.95, 3.58));
  }
  for (let i = 0; i < 46; i++) {
    const a = i * 2.399963;
    const y = 4.78 + ((i * 37) % 78) / 100;
    const rr = Math.sqrt(Math.max(0.2, 4.0 * 4.0 - (y - 4.6) ** 2));
    addPart(parts, 'gold', starGeo(Math.cos(a) * rr, y, Math.sin(a) * rr, 0.055 + (i % 3) * 0.012));
  }
  meshParts(g, parts, mats, { castBody: 'wall' });
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

export function buildObservatoryHall() {
  const g = new THREE.Group();
  g.position.copy(OBSERVATORY);
  g.visible = false;
  const mats = {
    floor: clayMat(0x3a3550, false),
    wall: clayMat(0x27305a, false),
    gold: clayMat(0xd9b45a, false),
    white: clayMat(0xe7e4d7, false),
    wood: clayMat(0x7b5a3d, false),
    dark: clayMat(0x141a30, false),
  };
  mats.wall.side = THREE.DoubleSide;
  const parts = new Map();
  const R = OBSERVATORY_R, H = 3.2;
  addPart(parts, 'floor', cyl(R, R, 0.18, 36, 0, -0.09, 0));
  addPart(parts, 'wall', cyl(R, R, H, 36, 0, H / 2, 0, 0, true));
  addPart(parts, 'dark', cyl(R - 0.2, R - 0.2, 0.12, 36, 0, H + 0.2, -1.1, 0, true));
  addPart(parts, 'gold', cyl(R + 0.03, R + 0.03, 0.08, 36, 0, 0.05, 0), cyl(R + 0.03, R + 0.03, 0.08, 36, 0, H - 0.18, 0));
  addPart(parts, 'dark', box(2.3, 0.06, 1.05, 0, 0.02, R - 0.32));
  for (const rr of [1.8, 3.2]) addPart(parts, 'gold', new THREE.TorusGeometry(rr, 0.018, 6, 96).rotateX(Math.PI / 2).translate(0, 0.025, 0));
  addPart(parts, 'white', cyl(0.22, 0.32, 1.6, 12, 0, 0.9, -0.6), cyl(0.16, 0.16, 2.4, 16, 0, 1.85, -1.55, Math.PI / 2));
  addPart(parts, 'gold', cyl(0.34, 0.34, 0.12, 16, 0, 1.85, -2.85, Math.PI / 2));
  for (const sx of [-1, 1]) {
    addPart(parts, 'wood', box(0.55, 1.6, 1.2, sx * 4.2, 0.8, -2.1));
    for (let i = 0; i < 7; i++) addPart(parts, 'gold', box(0.42, 0.08, 0.14, sx * 4.2, 0.25 + i * 0.18, -2.55));
  }
  addPart(parts, 'wood', box(1.4, 0.18, 0.85, -2.6, 0.85, 2.0), box(0.18, 0.8, 0.18, -3.05, 0.4, 1.72), box(0.18, 0.8, 0.18, -2.15, 0.4, 2.28));
  for (let i = 0; i < 28; i++) {
    const a = i * 2.399963, rr = 4.95;
    addPart(parts, 'gold', starGeo(Math.cos(a) * rr, 1.0 + (i % 6) * 0.32, Math.sin(a) * rr, 0.035));
  }
  meshParts(g, parts, mats);
  const lamp = new THREE.PointLight(0xffe0a8, 0.9, 13);
  lamp.position.set(-2.6, 2.0, 2.0);
  g.add(lamp);
  scene.add(g);
  hallBuilt = true;
  return g;
}

export function ensureObservatoryHall() {
  if (!$w.observatoryGroup) $w.observatoryGroup = buildObservatoryHall();
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

export function exitObservatory() {
  $w.atObservatory = false; setFogExempt(player, false);
  if ($w.observatoryGroup) $w.observatoryGroup.visible = false;
  player.position.set(OBSERVATORY_GATE.x, 0, OBSERVATORY_GATE.z + 3.4);
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null;
  snapCamera(); setSpaceVisible();
  Sound.blip(); trackEvent('observatory_exit');
}

export function observatoryBuilt() {
  return hallBuilt;
}
