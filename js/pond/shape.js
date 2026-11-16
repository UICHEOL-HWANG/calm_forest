import { POND_R } from '../data/pond.js';

const PADS = [[-0.8, -0.6], [0.9, 0.7], [0.2, -1.1]];
const REEDS = [[-1.8, 0.7], [-1.6, 1.0], [1.5, -1.4]];
const ISLE = Object.freeze({ x: 1.6, z: -1.2, r: 1.0 });
const STONES = [0, 1, 2, 3].map(i => [-0.2 + 0.5 * i, 0.2 - 0.38 * i]);
const ISLE_PAD = 0.4;
const LAP_SIZE = 8;
const LAP_STEP = 0.15;

export function pondLayout(r = POND_R, stage = 1) {
  const k = r / POND_R, n = Math.round(r * 7);
  const scaled = ([x, z]) => [x * k, z * k];
  const rocks = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return { x: Math.cos(a) * (r + 0.1), z: Math.sin(a) * (r + 0.1), size: 0.26 + (i % 3) * 0.05, alt: i % 2 === 1 };
  });
  return {
    k, rocks,
    pads: PADS.map(scaled),
    lotus: scaled(PADS[1]),
    reeds: REEDS.map(scaled),
    isle: stage >= 3 ? ISLE : null,
    stones: stage >= 3 ? STONES : [],
    gatherZ: r * 0.55,
  };
}

export function swimLane(i, k = 1) {
  const lap = Math.floor(i / LAP_SIZE) * LAP_STEP;
  return {
    rx: (1.15 - (i % 4) * 0.12 + lap) * k,
    rz: (0.9 - (i % 4) * 0.1 + lap) * k,
    cx: ((i % 4) - 1.5) * 0.15 * k,
    cz: (i % 2 ? 0.2 : -0.2) * k,
    speed: (i % 2 ? -1 : 1) * (0.35 + (i % 5) * 0.05),
    phase: i * 1.5,
  };
}

export function keepOff(x, z, isle) {
  if (!isle) return [x, z];
  const dx = x - isle.x, dz = z - isle.z, d = Math.hypot(dx, dz), min = isle.r + ISLE_PAD;
  if (d >= min) return [x, z];
  if (d < 1e-6) return [isle.x + min, isle.z];
  return [isle.x + (dx / d) * min, isle.z + (dz / d) * min];
}
