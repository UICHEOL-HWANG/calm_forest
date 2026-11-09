import * as THREE from 'three';
import { PORT } from '../data/places.js';
import { ISLAND, VILLAGE_DOCK, WALK_R } from './data.js';
import { tubBoat } from './models.js';

export const port = { active: false };
const env = {};
let group = null, boat = null, justLeft = false;
const P = { phase: 'sail', dir: 1, fast: false, heading: -Math.PI / 2, speed: 0, moved: 0, fishing: null, trip: null };
const W = (x, z, y = 0) => new THREE.Vector3(PORT.x + x, y, PORT.z + z);

export function bindPortEnv(e) { Object.assign(env, e); }

function buildPort() {
  group = new THREE.Group(); group.name = 'port'; env.scene.add(group);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(300, 180), new THREE.MeshLambertMaterial({ color: 0x4fb3c9 }));
  sea.rotation.x = -Math.PI / 2; sea.position.copy(W(20, 0, -0.02)); group.add(sea);
  boat = tubBoat(); group.add(boat);
}

function seatPlayer() { env.player.position.set(boat.position.x, 0.34, boat.position.z); }

export function enterPort(o = {}) {
  if (port.active) return;
  if (!group) buildPort();
  env.$w.atSea = true;
  port.active = true;
  group.visible = true;
  Object.assign(P, { phase: 'sail', dir: 1, fast: !!o.fast, heading: -Math.PI / 2, speed: 0, moved: 0, fishing: null,
    trip: { t0: performance.now(), caught: 0, quests: 0, via: o.fast ? 'fast' : 'sail' } });
  boat.position.copy(W(VILLAGE_DOCK.x, VILLAGE_DOCK.z)); boat.rotation.y = P.heading;
  seatPlayer();
  env.ui.setSeaMode?.(true);
  env.snapCamera(); env.setSpaceVisible();
}

export function leavePort() {
  if (!port.active) return;
  env.player.position.y = 0;
  port.active = false;
  justLeft = true;
  if (group) group.visible = false;
}

export function leftPort() { const was = justLeft; justLeft = false; return was; }

export function portOwnsMovement() { return port.active && P.phase === 'sail'; }

export function clampPort(pos) {
  const cx = PORT.x + ISLAND.x, cz = PORT.z + ISLAND.z;
  const dx = pos.x - cx, dz = pos.z - cz, d = Math.hypot(dx, dz);
  const lx = pos.x - PORT.x, lz = pos.z - PORT.z;
  const onPier = lx >= 21.9 && lx <= 26.5 && Math.abs(lz) <= 0.75;
  if (!onPier && d > WALK_R) { pos.x = cx + (dx / d) * WALK_R; pos.z = cz + (dz / d) * WALK_R; }
}

const _v = new THREE.Vector3();
export function portCamera(camera, look, dt) {
  const tall = camera.aspect < 1, low = !tall && innerHeight < 500;
  const fov = tall ? 60 : low ? 30 : 36;
  if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  const t = P.phase === 'sail' ? boat.position : env.player.position;
  const off = P.phase === 'island' ? (low ? [17, 11.5] : [20, 13]) : (low ? [14, 9.8] : [16.5, 11.5]);
  look.lerp(_v.set(t.x, 0, t.z), Math.min(1, dt * 4));
  camera.position.lerp(_v.set(look.x, off[0], look.z + off[1]), Math.min(1, dt * 3));
  camera.lookAt(look);
}

export function updatePort(dt, t) {}
export function portAction() {}
export function portPrompt() { return { nd: null, prompt: '' }; }
