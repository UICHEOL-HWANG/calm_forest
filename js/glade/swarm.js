export const KIDS = 4;
export const LIFE_SEC = 45;
export const LIT = 0.6;
export const LEADER_BUGS = 2;
export const PERFECT_BONUS = 2;
export const FIRST_DELAY = Object.freeze([40, 70]);
export const NEXT_DELAY = Object.freeze([90, 150]);
const BLINK_SPEED = 2.4, BLINK_GAP = 1.0;

export const delay = ([a, b], rnd) => a + (b - a) * rnd();

export function createSwarm(kindId, now) {
  return Object.freeze({ kindId, born: now, kids: Object.freeze(Array(KIDS).fill(true)), combo: 0, broken: false, caught: 0, done: false });
}

export const nextKid = (sw) => sw.kids.lastIndexOf(true);
export const kidsLeft = (sw) => sw.kids.filter(Boolean).length;
export const expired = (sw, now) => now - sw.born >= LIFE_SEC;
export const kidBright = (i, t) => Math.max(0, Math.sin(t * BLINK_SPEED - (KIDS - 1 - i) * BLINK_GAP)) ** 2;

const lands = ({ bright, chanceLit, chanceDim, rnd }) => rnd() < (bright > LIT ? chanceLit : chanceDim);

export function swingKid(sw, i, odds) {
  if (!sw.kids[i]) return { sw, hit: false, reason: 'gone' };
  if (!lands(odds)) return { sw, hit: false, reason: 'miss' };
  const inTurn = i === nextKid(sw);
  return {
    sw: Object.freeze({ ...sw, kids: Object.freeze(sw.kids.map((k, j) => (j === i ? false : k))), combo: inTurn ? sw.combo + 1 : 0, broken: sw.broken || !inTurn, caught: sw.caught + 1 }),
    hit: true,
    inTurn,
  };
}

export function swingLeader(sw, odds) {
  if (kidsLeft(sw) > 0) return { sw, hit: false, reason: 'guarded' };
  if (!lands(odds)) return { sw, hit: false, reason: 'miss' };
  return { sw: Object.freeze({ ...sw, done: true, caught: sw.caught + 1 }), hit: true, perfect: !sw.broken && sw.combo === KIDS };
}
