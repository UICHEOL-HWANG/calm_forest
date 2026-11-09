import * as THREE from 'three';
import { PORT_PIER } from '../data/places.js';
import { tubBoat } from './models.js';
import { scene, clayMat, solidCircle, makeSignpost } from '../game.js';
import { addGateWalk } from '../spaces/gate-cue.js';
import { makeWalk } from '../spaces/gate-walk.js';
import { coveSolid } from '../spaces/sea.js';

export let portPierBoat = null;

export function spawnPortPier() {
  const g = new THREE.Group(); scene.add(g);
  const { ax, az, bx, bz, boat } = PORT_PIER;
  const len = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bx - ax, bz - az);
  const deck = new THREE.Group(); deck.position.set(ax, 0, az); deck.rotation.y = ang; g.add(deck);
  for (let d = 0.3; d < len; d += 0.62) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 0.54), clayMat(d > len - 1.2 ? 0xc46a4a : 0xb98a5a));
    plank.position.set(0, 0.32, d); plank.receiveShadow = true; deck.add(plank);
  }
  for (let d = 0.6; d < len; d += 2) for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.8, 6), clayMat(0x6e4a2c));
    post.position.set(s * 0.6, 0.15, d); deck.add(post);
  }
  portPierBoat = tubBoat(); portPierBoat.position.set(boat.x, 0.18, boat.z); portPierBoat.rotation.y = boat.ry; g.add(portPierBoat);
  const sign = makeSignpost('⛵ 포구 섬', ax + 1.6, az + 1.5); g.add(sign);
  solidCircle(boat.x, boat.z, 0.8);
  addGateWalk(g, 'port', { water: coveSolid(), color: 0xffc94a, ringR: 0.85, walk: makeWalk({ ax, az, bx, bz, hw: 0.6, y: 0.36 }) });
}

export function nearPortPier(p) {
  return Math.hypot(p.x - PORT_PIER.end.x, p.z - PORT_PIER.end.z) < 1.6;
}
