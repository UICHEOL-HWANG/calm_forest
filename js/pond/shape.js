import { POND_R } from '../data/pond.js';

const PADS = [[-0.8, -0.6], [0.9, 0.7], [0.2, -1.1]];
const REEDS = [[-1.8, 0.7], [-1.6, 1.0], [1.5, -1.4]];
const ISLE = Object.freeze({ x: 1.6, z: -1.2, r: 1.0 });
const STONES = [0, 1, 2, 3].map(i => [-0.2 + 0.5 * i, 0.2 - 0.38 * i]);
const ISLE_PAD = 0.4;
const LAP_SIZE = 8;
const LAP_STEP = 0.15;

const TAU = Math.PI * 2;
const rnd = (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
const ring = (n, R, fn) => Array.from({ length: n }, (_, i) => { const a = (i / n) * TAU; return fn(i, a, Math.cos(a) * R, Math.sin(a) * R); }).flat();

const PEBBLE = [0xd8d3ca, 0xccc6ba, 0xc3c1ba];
const BRICK = [0xb87862, 0xcd8f78];
const SAND = 0xd4c6a5, CHIP = 0xd8d2c6, CLAM = [0xd8d0c6, 0xd8aeb3], CORAL = [0xd58fa0, 0xd48770], CONCH = 0xd8be9d;
const CORAL_ARMS = [[0, 0, 0.44, 0], [0.1, 0.03, 0.32, -0.5], [-0.09, -0.04, 0.28, 0.5]];

function shellPiece(i, a, x0, z0) {
  const j = i >> 1, ry = rnd(i, 10) * 6, out = (rnd(i, 11) - 0.5) * 0.2;
  const x = x0 + Math.cos(a) * out, z = z0 + Math.sin(a) * out;
  if (i % 2) return { shape: 'chip', x, y: 0.04, z, ry, size: 0.08 + rnd(i, 12) * 0.04, color: CHIP };
  const kind = j % 4;
  if (kind === 1) return CORAL_ARMS.map(([dx, dz, h, lean]) => ({ shape: 'coral', x: x + dx, y: h / 2, z: z + dz, ry, h, lean, color: CORAL[j % 8 === 1 ? 1 : 0] }));
  if (kind === 3) return { shape: 'conch', x, y: 0.11, z, ry, color: CONCH };
  return { shape: 'clam', x, y: 0.02, z, ry, size: 0.23 + rnd(i, 13) * 0.05, color: CLAM[kind ? 1 : 0] };
}

const RIM = {
  rock(r) {
    return ring(Math.round(r * 7), r + 0.1, (i, a, x, z) => ({ x, z, size: 0.26 + (i % 3) * 0.05, alt: i % 2 === 1 }));
  },
  pebble(r) {
    return ring(Math.round(r * 18), r + 0.16, (i, a, x, z) => {
      const out = (i % 2 ? 0.16 : -0.1) + (rnd(i, 5) - 0.5) * 0.06;
      return { shape: 'pebble', x: x + Math.cos(a) * out, y: 0.05, z: z + Math.sin(a) * out, ry: rnd(i, 6) * 3, size: 0.14 + rnd(i, 4) * 0.08, color: PEBBLE[i % 3] };
    });
  },
  brick(r) {
    const R = r + 0.14, n = Math.round((TAU * R) / 0.52), len = (TAU * R) / n - 0.07;
    return ring(n, R, (i, a, x, z) => ({ shape: 'brick', x, y: 0.1, z, ry: Math.PI / 2 - a, len, color: BRICK[i % 2] }));
  },
  shell(r) {
    return [{ shape: 'sand', x: 0, y: 0.015, z: 0, ry: 0, inner: r - 0.08, outer: r + 0.55, color: SAND }, ...ring(Math.round(r * 7) * 2, r + 0.22, shellPiece)];
  },
};

export function rimPieces(r = POND_R, rim = 'rock') {
  return (Object.hasOwn(RIM, rim) ? RIM[rim] : RIM.rock)(r);
}

export function pondLayout(r = POND_R, stage = 1) {
  const k = r / POND_R;
  const scaled = ([x, z]) => [x * k, z * k];
  return {
    k, rocks: RIM.rock(r),
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
