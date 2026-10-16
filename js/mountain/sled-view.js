import { COURSE, centerX } from './course.js';
import { slopePoint } from './terrain.js';
import { SLED_DECK_TOP } from './sled-art.js';

export const SLED_CAM = Object.freeze({ up: 9, back: 10, lookAhead: 22, lookDrop: 0.5 });
export const SLED_SHAKE = Object.freeze({ ms: 350, amp: 0.3, freq: 47 });
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

export function decayShake(v, dt) {
  return Math.max(0, v - (dt * 1000) / SLED_SHAKE.ms);
}

export function shakeOffset(v, t) {
  const a = SLED_SHAKE.amp * v * v;
  return { x: a ? Math.sin(t * SLED_SHAKE.freq) * a : 0, y: a ? Math.cos(t * SLED_SHAKE.freq * 1.3) * a : 0 };
}
