import { ANIMALS, heldGroup, player, playerAnchor, setCameraRig, snapCamera } from '../game.js';
import { SEAT, bodyROf, seatCamera, seatPose } from './seat-rules.js';

const EASE = 5;
const STAND_GAP = 0.9;
const LOOK_AHEAD = 6;

let seat = null;

function rig(camera, dt) {
  if (!seat) return;
  const to = seatCamera(seat.table, camera.aspect);
  const k = seat.snap ? 1 : 1 - Math.exp(-EASE * dt);
  seat.snap = false;
  const c = seat.cam;
  for (const key of ['pos', 'look']) for (const a of ['x', 'y', 'z']) c[key][a] += (to[key][a] - c[key][a]) * k;
  camera.position.set(c.pos.x, c.pos.y, c.pos.z);
  camera.lookAt(c.look.x, c.look.y, c.look.z);
}

export const seated = () => !!seat;
export const seatTable = () => seat?.table ?? null;

export function sitAt(table, character, camera) {
  const pose = seatPose(table, table.shape, bodyROf(character, ANIMALS), 'guest');
  const dir = camera.getWorldDirection(camera.position.clone());
  const cam = {
    pos: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
    look: { x: camera.position.x + dir.x * LOOK_AHEAD, y: camera.position.y + dir.y * LOOK_AHEAD, z: camera.position.z + dir.z * LOOK_AHEAD },
  };
  seat = { table, pose, cam, snap: false };
  holdSeat();
  setCameraRig(rig);
}

export function holdSeat() {
  if (!seat) return;
  player.position.set(seat.pose.x, 0, seat.pose.z);
  player.rotation.y = seat.pose.ry;
  playerAnchor.position.y = SEAT.y;
  playerAnchor.rotation.x = SEAT.lean;
  if (heldGroup) heldGroup.visible = false;
}

export function snapSeatCamera() {
  if (seat) seat.snap = true;
}

export function standUp() {
  if (!seat) return;
  const { pose } = seat;
  seat = null;
  setCameraRig(null);
  playerAnchor.position.y = 0;
  playerAnchor.rotation.x = 0;
  if (heldGroup) heldGroup.visible = true;
  player.position.set(pose.x, 0, pose.z + STAND_GAP);
  snapCamera();
}
