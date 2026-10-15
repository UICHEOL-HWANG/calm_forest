import { COURSE, centerX } from './course.js';
import { slopePoint } from './terrain.js';
import { SLED_DECK_TOP } from './sled-art.js';

export const SLED_CAM = Object.freeze({ up: 9, back: 10, lookAhead: 22, lookDrop: 0.5 });
export const SLED_LEAN = 0.35;
export const SLED_LIFT = 0.05;
export const SLED_SEAT = SLED_LIFT + SLED_DECK_TOP;

const TOP = slopePoint(0, 0), FOOT = slopePoint(COURSE.length, 0);
const RUN = FOOT.z - TOP.z;

export function facingYaw(dx, dz) {
  return Math.atan2(dx, dz);
}

export function sledYaw(steer) {
  return facingYaw(steer * SLED_LEAN, 1);
}

export function sledPitch() {
  return Math.atan2(TOP.y - FOOT.y, RUN);
}

export function sledCamTargets(s) {
  const p = slopePoint(s.z, s.x);
  const az = s.z + (SLED_CAM.lookAhead * COURSE.length) / RUN;
  const a = slopePoint(az, (s.x + centerX(az)) / 2);
  return {
    pos: { x: p.x, y: p.y + SLED_CAM.up, z: p.z - SLED_CAM.back },
    look: { x: a.x, y: a.y - SLED_CAM.lookDrop, z: a.z },
  };
}

export function sledPose(s, yaw) {
  const p = slopePoint(s.z, s.x);
  return { x: p.x, y: p.y + SLED_LIFT, z: p.z, pitch: sledPitch(), yaw };
}
