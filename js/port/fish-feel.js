const smooth = u => u * u * (3 - 2 * u);
const easeOut = u => 1 - Math.pow(1 - u, 3);
const lerp = (a, b, u) => a + (b - a) * u;
const clamp01 = u => Math.max(0, Math.min(1, u));
const seg = (t, a, b) => clamp01((t - a) / (b - a));

export const REST_ELEV = 2.3;
export const SHOULDER = { armR: [-2.4, 0, 0.3], armL: [-0.4, 0, 0], side: 0.5 };

export function gripArms(armUp = 0) {
  return { armR: [-0.6 - armUp, 0.1, 0.08], armL: [-0.55 - armUp, -0.45, 0.3] };
}

export function withHold(pose, k) {
  const g = gripArms(pose.armUp ?? 0), u = clamp01(k);
  const mix = (a, b) => a.map((v, i) => lerp(v, b[i], u));
  return { ...pose, armR: mix(g.armR, SHOULDER.armR), armL: mix(g.armL, SHOULDER.armL), side: lerp(0, SHOULDER.side, u) };
}

export const REST_POSE = withHold({ elev: REST_ELEV, armUp: 0, lean: 0, tip: 0.05 }, 1);
export const WAIT_ELEV = 0.22;
export const DROP_WIND = 0.16, DROP_FLICK = 0.15, DROP_SETTLE = 0.4;
export const DROP_REL = DROP_WIND + DROP_FLICK * 0.6;
export const DROP_END = DROP_WIND + DROP_FLICK + DROP_SETTLE;
export const DROP_FLIGHT = 0.42;
export const LAND_FLOP = 0.7;
export const REEL_TIME = 0.5;

export function dropPose(t) {
  if (t < DROP_WIND) {
    const u = smooth(t / DROP_WIND);
    return withHold({ elev: lerp(REST_ELEV, 2.6, u), lean: -0.1 * u, armUp: 0.7, tip: 0.15 * u }, 1);
  }
  if (t < DROP_WIND + DROP_FLICK) {
    const u = (t - DROP_WIND) / DROP_FLICK, e = u * u;
    return withHold({ elev: lerp(2.6, -0.05, e), lean: lerp(-0.1, 0.12, e), armUp: lerp(0.7, 0.1, e), tip: -0.7 * Math.sin(u * Math.PI) }, 1 - smooth(u));
  }
  const u = seg(t, DROP_WIND + DROP_FLICK, DROP_END), d = Math.exp(-5 * u);
  return withHold({ elev: lerp(-0.05, WAIT_ELEV, easeOut(u)) + Math.sin(u * 13) * 0.08 * d, lean: 0.1 * d, armUp: 0.1 * d, tip: Math.sin(u * 20) * 0.3 * d }, 0);
}

export function waitPose(time, bite, twitch = 0) {
  const tug = bite ? Math.max(0, Math.sin(time * 18)) * 0.16 : 0;
  return { elev: WAIT_ELEV - tug + twitch * 0.35 + Math.sin(time * 1.6) * 0.02, lean: bite ? 0.06 : 0, armUp: twitch * 0.2, tip: 0.1 + tug * 2.2 + twitch * 0.4 };
}

export function bobberDip(time, bite) {
  if (!bite) return Math.sin(time * 2.4) * 0.03;
  return -0.14 - Math.max(0, Math.sin(time * 18)) * 0.1;
}

export const LIFT_END = 1.05;

export function liftPose(time) {
  const t = Math.max(0, time);
  const up = easeOut(seg(t, 0, 0.26)), down = smooth(seg(t, 0.62, 1.05));
  const elev = lerp(lerp(WAIT_ELEV, 2.25, up), REST_ELEV, down);
  const fish = t < 0.08 ? { phase: 'water', k: t / 0.08 } : { phase: 'land', k: seg(t, 0.08, 0.72), over: true };
  return { pose: withHold({ elev, lean: lerp(-0.26 * up, 0, down), armUp: lerp(0.95 * up, 0, down), tip: lerp(0.5 * up, 0, down) - 0.4 * Math.sin(seg(t, 0.2, 0.5) * Math.PI) }, down), fish };
}

export const CAST_MIN = 2.2, CAST_MAX = 3;

export function castTarget(spot, from, facing) {
  const dx = spot.x - from.x, dz = spot.z - from.z, d = Math.hypot(dx, dz);
  const [ux, uz] = d < 1.4 ? [Math.sin(facing), Math.cos(facing)] : [dx / d, dz / d];
  const r = Math.max(CAST_MIN, Math.min(CAST_MAX, d));
  return { x: from.x + ux * r, z: from.z + uz * r };
}

export function bezierPoint(a, c, b, k) {
  const u = clamp01(k), v = 1 - u;
  return { x: v * v * a.x + 2 * v * u * c.x + u * u * b.x, y: v * v * a.y + 2 * v * u * c.y + u * u * b.y, z: v * v * a.z + 2 * v * u * c.z + u * u * b.z };
}
