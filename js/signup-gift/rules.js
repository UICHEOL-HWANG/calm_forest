export const NUDGE_TRIGGERS = Object.freeze(['harvest', 'house']);

export function takeNudge(flags, trigger) {
  const prev = flags && typeof flags === 'object' ? flags : {};
  if (!NUDGE_TRIGGERS.includes(trigger) || prev[trigger]) return { fire: false, flags: prev };
  return { fire: true, flags: { ...prev, [trigger]: 1 } };
}
