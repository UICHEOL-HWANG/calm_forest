export const COLD = Object.freeze({
  max: 100,
  rate: Object.freeze({ day: 0.6, dusk: 0.8, night: 1.2, snow: 1.2 }),
  shiverAt: 60, slowAt: 80, slowMult: 0.75,
  fireR: 3, fireRate: 5, cafeRate: 8, warmS: 40,
  climbBase: 1.5, climbGain: 6.0,
});

export const COLD_START = Object.freeze({ v: 0, warmT: 0 });

export function stepCold(s, dt, { key, nearFire, inCafe, frozen, climb = null }) {
  if (frozen) return s;
  const drop = inCafe ? COLD.cafeRate : nearFire ? COLD.fireRate : 0;
  const height = climb == null ? 1 : COLD.climbBase + COLD.climbGain * climb;
  const rise = drop > 0 || s.warmT > 0 ? 0 : (COLD.rate[key] ?? COLD.rate.day) * height;
  const v = Math.min(COLD.max, Math.max(0, s.v + (rise - drop) * dt));
  return { ...s, v, warmT: Math.max(0, s.warmT - dt) };
}

export function drinkWarm(s) {
  return { ...s, v: 0, warmT: COLD.warmS };
}

export function coldStage(v) {
  return v >= COLD.slowAt ? 'slow' : v >= COLD.shiverAt ? 'shiver' : 'ok';
}

export function coldSpeedMult(v) {
  return v >= COLD.slowAt ? COLD.slowMult : 1;
}

export function noticeCold(prev, next, seenHint) {
  return {
    hint: !seenHint && prev.v < COLD.shiverAt && next.v >= COLD.shiverAt,
    slow: prev.v < COLD.slowAt && next.v >= COLD.slowAt,
  };
}
