export const E6_ARMS = ['old', 'new'];
export const E6_STORE_KEY = 'cf_e6';
export const E6_OLD_SHARE = 20;

const isArm = (a) => E6_ARMS.includes(a);

export function armForE6(clientId) {
  const s = `e6-guide:${clientId || ''}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15;
  return (h >>> 0) % 100 < E6_OLD_SHARE ? 'old' : 'new';
}

export function decideE6({ clientId, newDevice = false, stored = null, dev = false, forced = null } = {}) {
  const hashed = armForE6(clientId);
  const out = (enrolled, arm, reason) => ({ hashed, enrolled, arm: enrolled ? arm : null, reason });
  if (dev && isArm(forced)) return out(true, forced, 'forced');
  if (dev) return out(false, null, 'dev');
  if (isArm(stored?.arm)) return out(true, stored.arm, 'device');
  if (!newDevice) return out(false, null, 'returning');
  return out(true, hashed, 'new');
}

export function parseE6Stored(raw) {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' && !Array.isArray(v) && isArm(v.arm) ? { arm: v.arm } : null;
  } catch { return null; }
}

export function e6UserProps(decision) {
  return decision?.enrolled && decision.reason !== 'forced' && isArm(decision.arm) ? { exp_guide: decision.arm } : {};
}

export function guideRevampOn(decision) {
  return !(decision?.enrolled && decision.arm === 'old');
}

export function e6SessionMark(decision) {
  const arm = e6UserProps(decision).exp_guide;
  return arm ? `e6_${arm}` : null;
}
