import { modalQueue } from './modal-queue.js';

export const NUDGE_QUIET_MS = 14 * 60 * 1000;
export const NUDGE_CAP_KEY = 'cf_nudge_cap';

export const startNudgeClock = (rec, now) => rec?.first ? rec : Object.freeze({ first: now, shown: rec?.shown ?? 0 });
export const nudgeAllowed = (rec, now) => !rec?.first || now - rec.first >= NUDGE_QUIET_MS || (rec.shown ?? 0) < 1;
export const noteNudge = (rec, now) => Object.freeze({ first: rec?.first ?? now, shown: (rec?.shown ?? 0) + 1 });

function readCap() {
  try {
    const v = JSON.parse(localStorage.getItem(NUDGE_CAP_KEY) || 'null');
    return v && Number.isFinite(v.first) ? v : null;
  } catch { return null; }
}
function writeCap(rec) {
  try { localStorage.setItem(NUDGE_CAP_KEY, JSON.stringify(rec)); } catch { return; }
}

export const touchNudgeClock = (now = Date.now()) => writeCap(startNudgeClock(readCap(), now));

export function queueLoginNudge(trigger, ui, queue = modalQueue) {
  if (ui?.isGuestNow?.() === false) return false;
  return queue.request({
    kind: 'nudge', key: 'nudge',
    ready: () => nudgeAllowed(readCap(), Date.now()),
    show: () => {
      if (ui?.isGuestNow?.() === false) return;
      writeCap(noteNudge(readCap(), Date.now()));
      ui?.loginNudge?.(trigger);
    },
  });
}
