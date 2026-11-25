import { STREAK_BONUS } from '../data/delve.js';

export const newStreak = () => ({ cur: 0, best: 0 });

export function streakStep(s, ok) {
  if (!ok) return { cur: 0, best: s.best, bonus: false };
  const cur = s.cur + 1;
  return { cur, best: Math.max(s.best, cur), bonus: cur % STREAK_BONUS === 0 };
}
