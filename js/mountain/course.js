export const COURSE_V = 1;

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

export const COURSE = Object.freeze({ length: LENGTH, width: 14, flags, obstacles });

export function minTimeMs(course = COURSE, maxSpeed = 16 * 1.5) {
  return Math.floor((course.length / maxSpeed) * 1000);
}
