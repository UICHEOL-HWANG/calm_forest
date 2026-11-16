const KEY = 'cf_boot_n';
const MAX_STEPS = 100;

export function createBootTiming({ now = () => performance.now(), storage = null, prior = false } = {}) {
  const marks = [];
  let track = null;
  let done = false;
  let hidden = false;
  let launches = null;
  const at = (k) => marks.find(m => m[0] === k)?.[1];

  const mark = (k) => {
    if (done || at(k) !== undefined) return;
    marks.push([k, now()]);
    try { globalThis.performance?.mark?.(`cf_boot_${k}`); } catch {}
  };

  const firstRun = () => {
    if (launches === null) {
      let seen = null;
      try { seen = storage ? Number(storage.getItem(KEY)) || 0 : null; } catch {}
      if (seen !== null) { try { storage.setItem(KEY, String(seen + 1)); } catch {} }
      launches = seen === null ? -1 : seen === 0 && !prior ? 0 : seen + 1;
    }
    return launches < 0 ? -1 : launches === 0 ? 1 : 0;
  };

  const send = (reached) => {
    if (done || !track) return false;
    if (reached) done = true;
    else if (hidden) return false;
    else hidden = true;
    const last = marks[marks.length - 1];
    track('boot_timing', {
      first_run: firstRun(),
      reached: reached || `bg_${last?.[0] || 'none'}`,
      total_ms: Math.round(reached ? (last?.[1] ?? now()) : now()),
      world_ms: Math.round(at('W') ?? 0),
      steps: marks.map(([k, t]) => `${k}${Math.round(t / 100)}`).join(',').slice(0, MAX_STEPS),
    });
    return true;
  };

  return { mark, send, use: (fn) => { track = fn; } };
}

const store = () => { try { return localStorage; } catch { return null; } };

export function hasPriorData(storage) {
  try {
    for (let i = 0; i < (storage?.length || 0); i++) if (storage.key(i)?.startsWith('sb-')) return true;
  } catch {}
  return false;
}

const boot = typeof localStorage === 'undefined' ? null : store();

export const bootTiming = createBootTiming({ storage: boot, prior: hasPriorData(boot) });
