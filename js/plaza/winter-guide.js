import { YARD_MAX_TRIES } from '../pond/yard-steps.js';

export const FOUNTAIN_BANNER_MAX = YARD_MAX_TRIES;

export const bannerDue = ({ phase, open, reached, busy, tries }) =>
  phase === 'active' && !!open && !reached && !busy && (tries | 0) < FOUNTAIN_BANNER_MAX;

export const arrowWanted = ({ phase, open, reached, inVillage, busy, other }) =>
  phase === 'active' && !!open && !reached && !!inVillage && !busy && !other;
