import * as THREE from 'three';
import { spawnFloatText } from '../game.js';
import { Sound } from '../sound.js';
import { t } from '../i18n.js';
import { COURSE } from './course.js';
import { buildSledProps } from './sled-props.js';
import { spawnSnowBurst, spawnBoostTrail } from './sled-fx.js';
import { showChips } from './sled-hud.js';
import { sledPose } from './sled-view.js';
import { driftTier } from './sled-moves.js';
import { recordGhost, ghostAt, ghostGapMs, sledEvents, chipsFor } from './sled-extras.js';
import { spawnPet } from '../pet/render.js';
import { stageOf } from '../pet/rules.js';
import { updatePetAnim } from '../pet/art.js';
import { disposePremiumPet } from '../pet/art-premium.js';

const PET_SEAT = Object.freeze({ x: 0, y: 0.42, z: -0.62, scale: 1.3, hop: 0.45 });
const GHOST_LOOK = Object.freeze({ color: 0xbfe0ff, opacity: 0.35 });
const BOOST_EVENTS = new Set(['trickOk', 'drift', 'gust']);
const SHAKE_EVENTS = new Set(['mover', 'trickFail']);

export function sledProps(group) {
  if (!group.userData.sledProps) {
    const props = buildSledProps(THREE, COURSE);
    group.add(props.group);
    group.userData.sledProps = props;
  }
  return group.userData.sledProps;
}

function ghostMesh(group, sledMesh) {
  if (group.userData.sledGhost) return group.userData.sledGhost;
  const g = sledMesh.clone(true);
  g.traverse(o => {
    if (!o.material) return;
    o.material = o.material.clone();
    o.material.transparent = true;
    o.material.opacity = GHOST_LOOK.opacity;
    o.material.depthWrite = false;
    o.material.color?.lerp(new THREE.Color(GHOST_LOOK.color), 0.6);
  });
  g.visible = false;
  group.add(g);
  group.userData.sledGhost = g;
  return g;
}

export function openRide({ group, sledMesh, pet, ghost }) {
  const props = sledProps(group);
  props.update(0);
  const ghostObj = ghost ? ghostMesh(group, sledMesh) : null;
  const pet3d = pet ? spawnPet(THREE, pet.kind, stageOf(pet.works)) : null;
  if (pet3d) {
    pet3d.position.set(PET_SEAT.x, PET_SEAT.y, PET_SEAT.z);
    pet3d.scale.multiplyScalar(PET_SEAT.scale);
    sledMesh.add(pet3d);
  }
  return { props, ghost, ghostObj, pet3d, sledMesh, path: [], hop: 0, frame: 0 };
}

function react(ride, e, s, at) {
  if (BOOST_EVENTS.has(e)) {
    Sound.sledBoost();
    spawnSnowBurst(at.x, at.y + 0.3, at.z - 0.4, 14);
    ride.hop = Math.max(ride.hop, 1);
    if (e === 'trickOk') spawnFloatText(at.x, at.y + 2.2, at.z, '🌀', '#3a7aa8', 0.8);
  } else if (e === 'jump') {
    Sound.blip();
    ride.hop = Math.max(ride.hop, 1.2);
  } else if (e === 'combo') {
    Sound.starGood(s.combo);
  } else if (e === 'trickFail') {
    Sound.starMiss();
  } else if (e === 'shield') {
    Sound.starPerfect(2);
    ride.hop = 1.8;
    spawnSnowBurst(at.x, at.y + 0.5, at.z, 18);
    spawnFloatText(at.x, at.y + 2.2, at.z, '🛡️', '#3a7aa8', 0.8);
  } else if (e === 'mover') {
    Sound.build();
    spawnSnowBurst(at.x, at.y + 0.5, at.z + 0.6, 14);
    spawnFloatText(at.x, at.y + 2.2, at.z, '💥', '#d9534f', 0.8);
  }
}

function placeGhost(ride, s, yaw) {
  const g = ghostAt(ride.ghost, s.t);
  if (!ride.ghostObj) return;
  ride.ghostObj.visible = !!g;
  if (!g) return;
  const pose = sledPose({ ...s, z: g.z, x: g.x, y: g.y, air: g.y > 0, trick: false }, yaw);
  ride.ghostObj.position.set(pose.x, pose.y, pose.z);
  ride.ghostObj.rotation.set(pose.pitch, pose.yaw, 0);
}

function bouncePet(ride, dt) {
  if (!ride.pet3d) return;
  ride.hop = Math.max(0, ride.hop - dt * 2.2);
  const now = performance.now();
  ride.pet3d.position.y = PET_SEAT.y + Math.sin(Math.min(1, ride.hop) * Math.PI) * PET_SEAT.hop + Math.sin(now / 180) * 0.03;
  ride.pet3d.rotation.y = ride.hop > 1 ? (ride.hop - 1) * 10 : 0;
  updatePetAnim(ride.pet3d, now / 1000, ride.hop > 0);
}

export function rideTick(ride, prev, next, dt, at, yaw) {
  if (!ride) return [];
  ride.frame += 1;
  ride.path = recordGhost(ride.path, next);
  ride.props.update(next.t);
  const events = sledEvents(prev, next);
  events.forEach(e => react(ride, e, next, at));
  if (next.driftDir && driftTier(next) && ride.frame % 2 === 0) spawnBoostTrail(at.x, at.y, at.z, 1);
  placeGhost(ride, next, yaw);
  bouncePet(ride, dt);
  showChips(chipsFor(next, ghostGapMs(ride.ghost, next), t));
  return events.filter(e => SHAKE_EVENTS.has(e));
}

export function stopRide(ride) {
  if (!ride) return;
  if (ride.ghostObj) ride.ghostObj.visible = false;
  showChips([]);
}

export function closeRide(ride) {
  if (!ride) return;
  stopRide(ride);
  if (ride.pet3d) {
    ride.sledMesh.remove(ride.pet3d);
    disposePremiumPet(ride.pet3d);
    ride.pet3d = null;
  }
  ride.props.update(0);
}
