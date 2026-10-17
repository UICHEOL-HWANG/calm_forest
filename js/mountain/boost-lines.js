import { PHYS } from './sled.js';

export const LINE_MAX = 60;
const PER_FRAME = 3;

export function stepLines(lines, dt, { active, diag, rnd = Math.random }) {
  const moved = lines
    .map(l => ({ ...l, r: l.r + l.sp * dt }))
    .filter(l => l.r < diag * 1.3);
  if (!active) return moved;
  const room = Math.max(0, LINE_MAX - moved.length);
  const born = Array.from({ length: Math.min(PER_FRAME, room) }, () => ({
    a: rnd() * Math.PI * 2,
    r: diag * (0.35 + rnd() * 0.3),
    len: 30 + rnd() * 60,
    sp: diag * (2.2 + rnd() * 1.5),
  }));
  return [...moved, ...born];
}

export function boostLeft(s) {
  const total = s.phys?.boostMs || PHYS.boostMs;
  return Math.max(0, Math.min(1, (s.boostLeftMs || 0) / total));
}
