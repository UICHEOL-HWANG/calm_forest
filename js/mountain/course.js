export const COURSE_V = 2;

const LENGTH = 330;
const AMP = 9;
const WAVES = 3;

export function centerX(z) {
  return Math.sin((z / LENGTH) * Math.PI * WAVES) * AMP;
}

const flags = Array.from({ length: 12 }, (_, i) => {
  const z = 25 + i * 25;
  return { z, x: centerX(z), half: 2.2 };
});

const OBSTACLE_SPEC = [
  [38, 0.8, 'snowball'], [63, -1.0, 'rock'], [88, 0.6, 'snowball'], [113, -0.9, 'rock'],
  [138, 1.0, 'snowball'], [163, -0.7, 'rock'], [188, 0.9, 'snowball'], [213, -1.0, 'rock'],
  [238, 0.7, 'snowball'], [263, -0.8, 'rock'], [288, 1.0, 'snowball'],
];

const obstacles = OBSTACLE_SPEC.map(([z, off, kind]) => ({ z, x: centerX(z) + off, r: 1.1, kind }));

export const OBSTACLE_BODY = Object.freeze({ rock: 0.8, snowball: 0.75 });

export function obstacleRadius(o) {
  return o.r * OBSTACLE_BODY[o.kind];
}

const ramps = [81, 181, 256].map(z => ({ z, x: centerX(z), half: 2.6 }));

const movers = [
  { kind: 'ball', z0: 120, v: 4, off: -4.2, r: 0.85 },
  { kind: 'ball', z0: 215, v: 3.5, off: -4.2, r: 0.85 },
  { kind: 'walker', z: 145, amp: 5, w: 1.1, ph: 0, r: 0.6 },
  { kind: 'walker', z: 232, amp: 4, w: 1.3, ph: 2, r: 0.6 },
];

export function moverPos(m, tMs) {
  const t = tMs / 1000;
  if (m.kind === 'ball') {
    const z = Math.min(LENGTH, m.z0 + m.v * t);
    return { z, x: centerX(z) + m.off, spin: (t * m.v) / m.r };
  }
  const a = t * m.w + m.ph;
  return { z: m.z, x: centerX(m.z) + Math.sin(a) * m.amp, face: Math.cos(a) };
}

export const COURSE = Object.freeze({ length: LENGTH, width: 14, flags, obstacles, ramps, movers });

export function minTimeMs(course = COURSE, maxSpeed = 16 * 1.5) {
  return Math.floor((course.length / maxSpeed) * 1000);
}
