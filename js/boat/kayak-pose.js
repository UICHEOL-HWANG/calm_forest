export const KAYAK = { armX: -0.55, swing: 0.75, spread: 0.2, twist: 0.35, lean: 0.12, w: 5.5, len: 3.0, fpAhead: 1.1, fpDrop: 0.12 };

export function kayakStroke(t, fast) {
  const s = Math.sin(t * KAYAK.w * (fast ? 2 : 1));
  return {
    R: [KAYAK.armX + KAYAK.swing * s, 0, KAYAK.spread],
    L: [KAYAK.armX - KAYAK.swing * s, 0, -KAYAK.spread],
    twist: KAYAK.twist * s,
    lean: KAYAK.lean,
    bob: Math.abs(s) * 0.05,
  };
}

export function kayakStun(k) {
  const x = KAYAK.armX - 0.9 * k;
  return { R: [x, 0, KAYAK.spread + 0.25 * k], L: [x, 0, -KAYAK.spread - 0.25 * k], twist: 0 };
}
