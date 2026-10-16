export const LEGACY_FIRST_DAY = '2000-01-01';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function resolveFirstDay(saved) {
  return typeof saved === 'string' && DAY_RE.test(saved) ? saved : LEGACY_FIRST_DAY;
}

export function ensureFirstDay(current, today) {
  return typeof current === 'string' && DAY_RE.test(current) ? current : today;
}

export function isMountainOpen(firstDay, today) {
  return typeof firstDay === 'string' && DAY_RE.test(firstDay) && today > firstDay;
}

export function daysSinceUnlock(firstDay, today) {
  if (firstDay === LEGACY_FIRST_DAY || typeof firstDay !== 'string' || !DAY_RE.test(firstDay)) return null;
  const first = Date.parse(firstDay), now = Date.parse(today);
  return Number.isFinite(first) && Number.isFinite(now) ? Math.max(0, Math.round((now - first) / 86400000) - 1) : null;
}
