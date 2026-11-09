export function createGuide({ flow, steps, now, onStep = () => {}, onDone = () => {} }) {
  let i = 0, since = now(), live = steps.length > 0, first = true;
  return {
    total: steps.length,
    index: () => i,
    active: () => live,
    current: () => (live ? steps[i] : null),
    stop: () => { live = false; },
    tick(ctx) {
      const silent = first;
      first = false;
      while (live && steps[i].done(ctx)) {
        const t = now();
        if (!silent) onStep({ flow, step: i + 1, ms: Math.round(t - since) });
        since = t; i += 1;
        if (i >= steps.length) { live = false; onDone(); }
      }
    },
  };
}
