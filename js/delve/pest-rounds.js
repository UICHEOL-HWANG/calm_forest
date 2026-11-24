import { tacticOf, submerged, arrived, clawUp } from './pests.js';
import { PEST_BADGE } from './badge-math.js';

const HEARTLESS = ['mimic', 'hide', 'gone', 'sleep'];
const NOTICING = ['lurk', 'approach', 'feint', 'doze'];

export const heartCount = s => (HEARTLESS.includes(s.state) || submerged(s) ? 0 : Math.max(0, s.grit || 0));

export const noticed = (prev, next) => !NOTICING.includes(prev) && ['lurk', 'approach'].includes(next);

export function streakCues(prevCur, step) {
  if (!step.cur) return prevCur >= 2 ? ['comboBreak'] : [];
  return [`combo${Math.min(step.cur, 3)}`, ...(step.bonus ? ['bonus'] : [])];
}

const NO_CUES = Object.freeze([]);

export function tacticCues(prev, next) {
  const dive = submerged(next) && !submerged(prev);
  const notice = !dive && ((submerged(prev) && !submerged(next) && next.state === 'lurk') || noticed(prev.state, next.state));
  const feint = next.state === 'feint' && prev.state !== 'feint';
  const rumble = next.kind === 'mole' && !!tacticOf(next).decoys && arrived(next) && !arrived(prev);
  if (!dive && !notice && !feint && !rumble) return NO_CUES;
  return [dive && 'dive', notice && 'notice', feint && 'feint', rumble && 'rumble'].filter(Boolean);
}

export const BADGE_CLAW = ['❗', 'stop'];
export const BADGE_BAIT = ['🍄', 'wait'];
export const BADGE_PEEK = ['👁️', 'carry'];

export function badgeFor(s, peeking = false) {
  if (submerged(s)) return null;
  if (s.kind === 'crab' && s.state === 'lurk' && tacticOf(s).claw) return clawUp(s.lt || 0, s) ? BADGE_CLAW : BADGE_BAIT;
  if (s.state === 'doze' && peeking) return BADGE_PEEK;
  return PEST_BADGE[s.state] || null;
}
