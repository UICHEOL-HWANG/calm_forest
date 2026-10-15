export const COURSE_V = 1;

const LENGTH = 330;
const AMP = 9;
const WAVES = 3;

export function centerX(z) {
  return Math.sin((z / LENGTH) * Math.PI * WAVES) * AMP;
}

const flags = Array.from({ length: 12 }, (_, i) => {
  const z = 25 + i * 25;
  return { z, x: centerX(z), half: 3 };
});

const OBSTACLE_SPEC = [
  [38, 3.2, 'snowball'], [63, -3.4, 'rock'], [88, 2.8, 'snowball'], [113, -3.0, 'rock'],
  [138, 3.6, 'snowball'], [163, -2.6, 'rock'], [188, 3.0, 'snowball'], [213, -3.4, 'rock'],
  [238, 2.6, 'snowball'], [263, -3.2, 'rock'], [288, 3.4, 'snowball'],
];

const obstacles = OBSTACLE_SPEC.map(([z, off, kind]) => ({ z, x: centerX(z) + off, r: 1.1, kind }));

export const COURSE = Object.freeze({ length: LENGTH, width: 14, flags, obstacles });

export function minTimeMs(course = COURSE, maxSpeed = 16 * 1.5) {
  return Math.floor((course.length / maxSpeed) * 1000);
}
