import { YARD_MAX_TRIES } from '../pond/yard-steps.js';

export const CONCERT_MAX_TRIES = YARD_MAX_TRIES;

export const guideNeed = (state, counted = false) => !state.tutorial && !state.seen && state.notes === 0
  && (counted || (state.guideTries | 0) < CONCERT_MAX_TRIES);

export function guideTarget({ need, inVillage, pastOnboarding, cameraFree, uiBusy, otherGuide }) {
  return !!need && inVillage && pastOnboarding && cameraFree && !uiBusy && !otherGuide;
}
