import { PLAZA_SEASONS } from '../data/plaza.js';

const kstMs = (day) => Date.parse(`${day}T00:00:00+09:00`);
const LOCAL = typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

export const SEASON_OVERRIDE = LOCAL ? new URLSearchParams(location.search).get('plazaSeason') : null;

export function pickSeason(nowMs, overrideId = null, list = PLAZA_SEASONS) {
  if (overrideId) return list.find(s => s.id === overrideId) || { ...list[list.length - 1], id: overrideId };
  const opened = list.filter(s => kstMs(s.opensKst) <= nowMs);
  return opened.length ? opened[opened.length - 1] : list[0];
}

export function datePhase(def, nowMs) {
  if (nowMs < kstMs(def.opensKst)) return 'before';
  return nowMs < kstMs(def.closesKst) ? 'active' : 'after';
}
