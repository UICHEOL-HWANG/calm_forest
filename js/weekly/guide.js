import { marketOpen } from './rules.js';

export function guideNeed(state, now) {
  if (marketOpen(now) && state.seenMarket !== state.week) return 'market';
  if (state.seenBoard !== state.week) return 'board';
  return null;
}

export function guideTarget({ need, inVillage, pastOnboarding, cameraFree, uiBusy, otherGuide }) {
  if (!need || !inVillage || !pastOnboarding || !cameraFree || uiBusy || otherGuide) return null;
  return need;
}

export function bannerDue({ target, week, lastBannerWeek, cine }) {
  return target === 'market' && !cine && lastBannerWeek !== week;
}
