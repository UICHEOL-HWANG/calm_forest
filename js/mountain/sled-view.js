import { COURSE, centerX } from './course.js';
import { slopePoint } from './terrain.js';
import { SLED_DECK_TOP, deckTopOf } from './sled-art.js';
import { JUMP } from './sled-moves.js';
import { RAMP_SHAPE, RAMP_TOP, rampAt } from './ramp-lift.js';

export const SLED_CAM = Object.freeze({ up: 4.2, back: 4, lookAhead: 9.5, lookDrop: 0 });
export const SLED_FOV = Object.freeze({ base: 46, max: 56, gain: 18 });
export const SLED_SHAKE = Object.freeze({ ms: 350, amp: 0.3, freq: 47 });
export const SLED_LEAN = 0.35;
export const SLED_LIFT = 0.05;
export const SLED_SEAT = SLED_LIFT + SLED_DECK_TOP;

export function sledSeat(id) {
  return SLED_LIFT + deckTopOf(id);
}

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

export function sledLift(s, course = COURSE) {
  if (!s.air) return rampAt(course, s.z, s.x).lift;
  const fade = Math.min(1, Math.max(0, ((s.vy || 0) + JUMP.vy) / (2 * JUMP.vy)));
  return (s.y || 0) + RAMP_TOP * fade;
}

export function sledCamTargets(s) {
  const p = slopePoint(s.z, s.x);
  const air = sledLift(s);
  const az = s.z + (SLED_CAM.lookAhead * COURSE.length) / RUN;
  const a = slopePoint(az, s.x * 0.85 + centerX(az) * 0.15);
  return {
    pos: { x: p.x, y: p.y + SLED_CAM.up + air * 0.6, z: p.z - SLED_CAM.back },
    look: { x: a.x, y: a.y - SLED_CAM.lookDrop + air * 0.4, z: a.z },
  };
}

export function sledFov(speed, baseSpeed) {
  return Math.min(SLED_FOV.max, SLED_FOV.base + Math.max(0, speed / baseSpeed - 1) * SLED_FOV.gain);
}

export const RUNOUT_CAM = Object.freeze({ orbitS: 1.2, endR: 7.4, endUp: 3.6, endAng: Math.PI - Math.atan2(2.5, 7), lookUp: 0.8 });

export function runoutCamTargets(p, t) {
  const u = Math.min(1, Math.max(0, t / RUNOUT_CAM.orbitS));
  const k = u * u * (3 - 2 * u);
  const ang = RUNOUT_CAM.endAng * k;
  const r = SLED_CAM.back + (RUNOUT_CAM.endR - SLED_CAM.back) * k;
  const up = SLED_CAM.up + (RUNOUT_CAM.endUp - SLED_CAM.up) * k;
  return {
    pos: { x: p.x + Math.sin(ang) * r, y: p.y + up, z: p.z - Math.cos(ang) * r },
    look: { x: p.x, y: p.y + RUNOUT_CAM.lookUp, z: p.z },
  };
}

export function sledPose(s, yaw, lift = sledLift(s)) {
  const p = slopePoint(s.z, s.x);
  const flip = s.trick ? -Math.min(1, s.spin || 0) * Math.PI * 2 : 0;
  const onDeck = !s.air && rampAt(COURSE, s.z, s.x).deck;
  const pitch = s.air ? sledPitch() * 0.3 : onDeck ? RAMP_SHAPE.tilt : sledPitch();
  return { x: p.x, y: p.y + SLED_LIFT + lift, z: p.z, pitch, yaw, flip };
}

export function decayShake(v, dt) {
  return Math.max(0, v - (dt * 1000) / SLED_SHAKE.ms);
}

export function shakeOffset(v, t) {
  const a = SLED_SHAKE.amp * v * v;
  return { x: a ? Math.sin(t * SLED_SHAKE.freq) * a : 0, y: a ? Math.cos(t * SLED_SHAKE.freq * 1.3) * a : 0 };
}
