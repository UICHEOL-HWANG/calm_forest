import { marketOpen } from './rules.js';
import { YARD_MAX_TRIES, YARD_STALL_SEC } from '../pond/yard-steps.js';

export const WEEKLY_MAX_TRIES = YARD_MAX_TRIES;
export const WEEKLY_STALL_SEC = YARD_STALL_SEC;
const TRIES = Object.freeze({ board: 'boardTries', market: 'marketTries' });

const left = (state, need, kept) => kept.has(need) || (state[TRIES[need]] | 0) < WEEKLY_MAX_TRIES;

export function guideNeed(state, now, kept = new Set()) {
  if (marketOpen(now) && state.seenMarket < 0 && left(state, 'market', kept)) return 'market';
  if (state.seenBoard < 0 && left(state, 'board', kept)) return 'board';
  return null;
}

export const countTry = (state, need) => ({ ...state, [TRIES[need]]: (state[TRIES[need]] | 0) + 1 });

export const guideStalled = (activeSec) => activeSec >= WEEKLY_STALL_SEC;

export function guideTarget({ need, inVillage, pastOnboarding, cameraFree, uiBusy, otherGuide }) {
  if (!need || !inVillage || !pastOnboarding || !cameraFree || uiBusy || otherGuide) return null;
  return need;
}

export function bannerDue({ open, seenMarket, arrow, gate, week, lastBannerWeek, cine }) {
  return !!open && seenMarket !== week && arrow !== 'market' && !!gate && !cine && lastBannerWeek !== week;
}
