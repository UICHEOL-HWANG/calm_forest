export const GAP = 8;
export const CARD_W = 344;
export const CHIP_INTRO_GAP_MS = 10000;
export const CHIP_INTRO_MS = 8000;
export const CHIP_INTRO_COPY = Object.freeze({ old: '의뢰는 여기서 볼 수 있어요', q: '첫 의뢰가 왔어요', a: '주민과 친해지면 선물이 와요' });
export const CHIP_INTRO_KEYS = Object.freeze({ old: 'chipOld', q: 'chipQ', a: 'chipA' });

export function chipIntroNext({ hints, shown, now, lastAt, busy }) {
  if (busy || now - lastAt < CHIP_INTRO_GAP_MS) return null;
  const seenQ = !!(hints.chipQ || hints.chipOld), seenA = !!(hints.chipA || hints.chipOld);
  if (!seenQ && shown.q) return hints.chipNew ? 'q' : 'old';
  return !seenA && shown.a ? 'a' : null;
}

const clamp01 = (n) => Math.max(0, Math.min(1, n || 0));
const ratio = (q) => clamp01(q.pct != null ? q.pct : (q.target ? q.progress / q.target : 0));
const badgeOf = (q) => (q.target ? `${Math.min(q.progress || 0, q.target)}/${q.target}` : '');

export function chipState({ list, tracker, unread }) {
  const lead = list[0];
  return {
    q: { show: !!lead, pct: lead ? ratio(lead) : 0, badge: lead ? badgeOf(lead) : '' },
    a: { show: !!tracker, pct: tracker && !tracker.start ? clamp01(tracker.pct) : 0, dot: (unread || 0) > 0 },
  };
}

export function snapshot(list, tracker) {
  return {
    q: Object.fromEntries(list.map(q => [q.id || q.title, ratio(q)])),
    a: tracker && !tracker.start ? { [tracker.npc]: tracker.value ?? tracker.pct ?? 0 } : {},
  };
}

const rose = (prev, next) => Object.keys(next).some(id => id in prev && next[id] > prev[id]);

export function progressed(prev, next) {
  if (!prev) return [];
  return ['q', 'a'].filter(k => rose(prev[k] || {}, next[k] || {}));
}

export function sheetTab(open, state) {
  if (!open) return null;
  if (state[open]?.show) return open;
  const other = open === 'q' ? 'a' : 'q';
  return state[other]?.show ? other : null;
}

export function sheetPlacement({ vw, vh, joy, tools }) {
  const dimBottom = joy ? vh - joy.top + GAP : 0;
  if (vw <= vh) {
    const bottom = dimBottom || GAP;
    return { left: GAP, width: vw - 2 * GAP, bottom, maxHeight: vh - bottom - GAP, dimBottom };
  }
  const lo = joy ? joy.right + GAP : GAP;
  const hi = tools ? tools.left - GAP : vw - GAP;
  const width = Math.min(CARD_W, hi - lo);
  const left = Math.min(Math.max(Math.round((vw - width) / 2), lo), hi - width);
  return { left, width, bottom: GAP, maxHeight: vh - 2 * GAP, dimBottom };
}
