export const BADGE_TONE = { wait: '#f2a23c', carry: '#e95f4e', stop: '#62c486' };

export const PEST_BADGE = {
  lurk: ['👀', 'wait'], approach: ['👀', 'wait'], feint: ['👀', 'wait'], carry: ['💎', 'carry'],
  flee: ['❗', 'stop'], eat: ['🍄', 'stop'], sleep: ['💤', 'stop'], doze: ['💤', 'stop'], away: ['🌙', 'stop'], lost: ['❓', 'stop'],
};

export const BADGE_POP_SEC = 0.22;
export const BADGE_BOB = { amp: 0.05, period: 1.4 };

export function badgePop(age) {
  if (age >= BADGE_POP_SEC) return 1;
  const k = Math.max(0, age) / BADGE_POP_SEC;
  return k < 0.68 ? (k / 0.68) * 1.15 : 1.15 - ((k - 0.68) / 0.32) * 0.15;
}

export function badgeBob(t) {
  return Math.sin((t / BADGE_BOB.period) * Math.PI * 2) * BADGE_BOB.amp;
}

export const HEARTS_SIZE = [1.12, 0.425];
export const GIFT_SIZE = 1.15;
export const HEARTS_GAP = 0.04;

export function heartsCenterY(badgeScale) {
  return badgeScale ? -(badgeScale / 2 + HEARTS_GAP) / HEARTS_SIZE[1] : 0.5;
}
