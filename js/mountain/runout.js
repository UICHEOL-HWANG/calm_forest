import { CAMP } from './camp-layout.js';

export const RUNOUT_STOP_Z = CAMP.finish.z + 3.2;
export const RUNOUT_MIN_S = 0.8;
const RUNOUT_MAX_S = 3;
const DRIFT_RATE = 1.5;

export function createRunout({ x, z, v }) {
  const dist = Math.max(0.3, RUNOUT_STOP_Z - z);
  const v0 = Math.min(Math.max(v, (2 * dist) / RUNOUT_MAX_S), (2 * dist) / RUNOUT_MIN_S);
  const z0 = Math.min(z, RUNOUT_STOP_Z - 0.3);
  return Object.freeze({ x, z: z0, z0, v: v0, a: (v0 * v0) / (2 * dist), done: false });
}

export function stepRunout(r, dt) {
  if (r.done) return r;
  const v = Math.max(0, r.v - r.a * dt);
  const z = r.z + ((r.v + v) / 2) * dt;
  const x = r.x + (CAMP.finish.x - r.x) * Math.min(1, dt * DRIFT_RATE);
  if (v === 0 || z >= RUNOUT_STOP_Z) return Object.freeze({ ...r, x, z: RUNOUT_STOP_Z, v: 0, done: true });
  return Object.freeze({ ...r, x, z, v });
}

export function stopTurn(r) {
  const k = Math.min(1, Math.max(0, (r.z - r.z0) / (RUNOUT_STOP_Z - r.z0)));
  return 1 - (1 - k) * (1 - k);
}
