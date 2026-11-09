export function createGuide({ flow, steps, now, onStep = () => {}, onDone = () => {} }) {
  let i = 0, since = now(), live = steps.length > 0;
  return {
    total: steps.length,
    index: () => i,
    active: () => live,
    current: () => (live ? steps[i] : null),
    stop: () => { live = false; },
    tick(ctx) {
      while (live && steps[i].done(ctx)) {
        const t = now();
        onStep({ flow, step: i + 1, ms: Math.round(t - since) });
        since = t; i += 1;
        if (i >= steps.length) { live = false; onDone(); }
      }
    },
  };
}
