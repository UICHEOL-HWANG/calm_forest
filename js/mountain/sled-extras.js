import { COURSE, COURSE_V } from './course.js';
import { PHYS_V } from './sled.js';
import { COMBO, driftTier } from './sled-moves.js';
import { DAILY_REWARD_CAP } from './save.js';

export const GHOST_V = `c${COURSE_V}p${PHYS_V}`;
export const GHOST_STEP_MS = 100;
const GHOST_MAX_PTS = 1200;
const GHOST_X_MAX = 3000;
const GHOST_Y_MAX = 2000;

export function recordGhost(path, s, lift = s.y || 0) {
  if (path.length * GHOST_STEP_MS > s.t) return path;
  return [...path, [Math.round(s.z * 10), Math.round(s.x * 100), Math.round(Math.max(0, lift) * 100)]];
}

const lerp = (a, b, k) => a + (b - a) * k;

export function ghostAt(ghost, tMs) {
  if (!ghost) return null;
  const f = tMs / GHOST_STEP_MS, i = Math.floor(f);
  if (i > ghost.pts.length - 1) return null;
  const a = ghost.pts[i], b = ghost.pts[Math.min(i + 1, ghost.pts.length - 1)], k = f - i;
  return { z: lerp(a[0], b[0], k) / 10, x: lerp(a[1], b[1], k) / 100, y: lerp(a[2], b[2], k) / 100 };
}

export function ghostGapMs(ghost, s) {
  if (!ghost) return null;
  const zt = s.z * 10;
  const k = ghost.pts.findIndex(p => p[0] >= zt);
  if (k < 0) return null;
  if (k === 0) return s.t;
  const a = ghost.pts[k - 1][0], b = ghost.pts[k][0];
  const at = (k - 1 + (b > a ? (zt - a) / (b - a) : 1)) * GHOST_STEP_MS;
  return Math.round(s.t - at);
}

export function validGhost(g) {
  if (!g || typeof g !== 'object' || g.v !== GHOST_V) return false;
  if (!Number.isInteger(g.t) || g.t <= 0 || !Array.isArray(g.pts)) return false;
  if (g.pts.length < 1 || g.pts.length > GHOST_MAX_PTS || g.t > (g.pts.length + 1) * GHOST_STEP_MS) return false;
  const zMax = COURSE.length * 10 + 50;
  return g.pts.every(p => Array.isArray(p) && p.length === 3 && p.every(Number.isInteger)
    && p[0] >= 0 && p[0] <= zMax && Math.abs(p[1]) <= GHOST_X_MAX && p[2] >= 0 && p[2] <= GHOST_Y_MAX);
}

export function sledEvents(a, b) {
  const up = (k, name) => ((b[k]?.length ?? b[k]) > (a[k]?.length ?? a[k]) ? [name] : []);
  return [
    ...up('jumps', 'jump'), ...up('tricksOk', 'trickOk'), ...up('tricksFail', 'trickFail'),
    ...up('driftsAt', 'drift'), ...up('gustsAt', 'gust'), ...up('shieldUsed', 'shield'),
    ...up('moverHitIds', 'mover'), ...up('combo', 'combo'),
  ];
}

export function chipsFor(s, gapMs, t) {
  const chips = [];
  if (gapMs !== null && gapMs !== undefined) {
    const sign = gapMs <= 0 ? '−' : '+';
    chips.push([`👻 ${sign}${(Math.abs(gapMs) / 1000).toFixed(1)}${t('초')}`, gapMs <= 0 ? 'ahead' : 'behind']);
  }
  const tier = s.driftDir ? driftTier(s) : 0;
  if (tier === 2) chips.push([t('🟠 드리프트'), 'orange']);
  else if (tier === 1) chips.push([t('🔵 드리프트'), 'blue']);
  if (s.combo > 0) chips.push([`${t('🚩 연속')} ${s.combo}/${COMBO.n}`, '']);
  if (s.air) chips.push([s.trick ? t(s.spin >= 1 ? '🌀 한 바퀴!' : '🌀 도는 중') : t('🛫 지금 누르면 회전'), '']);
  if (s.shield > s.shieldUsed) chips.push([t('🛡️ 방패'), '']);
  return chips;
}

const secs = ms => (ms / 1000).toFixed(2);

export function resultBar({ timeMs, best, newBest, coins, leftToday, flags }) {
  const left = Math.max(0, Math.min(DAILY_REWARD_CAP, leftToday));
  const chips = [
    `🚩 ${flags}/${COURSE.flags.length}`,
    ...(coins > 0 ? [`🪙 +${coins}`] : []),
    ...(newBest ? [] : [`🏆 ${secs(best)}`]),
  ];
  return { icon: newBest ? '🏆' : '🏁', time: secs(timeMs), gold: !!newBest, chips, dots: '●'.repeat(left) + '○'.repeat(DAILY_REWARD_CAP - left), left };
}
