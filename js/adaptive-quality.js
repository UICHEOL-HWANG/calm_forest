export const QUALITY_STEPS = Object.freeze([
  Object.freeze({ dpr: 1.5, bloom: true }),
  Object.freeze({ dpr: 1.0, bloom: true }),
  Object.freeze({ dpr: 1.0, bloom: false }),
]);

const GAP_MS = 1000;

export function createQualityGovernor({ windowMs = 4000, minFps = 30, warmupMs = 0 } = {}) {
  const maxLevel = QUALITY_STEPS.length - 1;
  let level = 0;
  let last = null;
  let dts = [];
  let active = 0;
  let warm = 0;

  return {
    level: () => level,
    frame(now) {
      const dt = last == null ? null : now - last;
      last = now;
      if (level >= maxLevel || dt == null || dt <= 0 || dt > GAP_MS) return null;
      if (warm < warmupMs) { warm += dt; return null; }
      dts.push(dt);
      active += dt;
      if (active < windowMs) return null;
      const sorted = [...dts].sort((a, b) => a - b);
      const p90 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))];
      dts = [];
      active = 0;
      if (1000 / p90 >= minFps) return null;
      level += 1;
      return level;
    },
  };
}
