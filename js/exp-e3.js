export const E3_ARMS = ['off', 'on'];
export const E3_STORE_KEY = 'cf_e3';

const isArm = (a) => E3_ARMS.includes(a);

export function armForE3(clientId) {
  const s = `e3:${clientId || ''}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15;
  return E3_ARMS[(h >>> 0) & 1];
}

export function decideE3({ clientId, newDevice = false, stored = null, dev = false, forced = null } = {}) {
  const hashed = armForE3(clientId);
  const out = (enrolled, arm, reason) => ({ hashed, enrolled, arm: enrolled ? arm : null, reason });
  if (dev && isArm(forced)) return out(true, forced, 'forced');
  if (dev) return out(false, null, 'dev');
  if (isArm(stored?.arm)) return out(true, stored.arm, 'device');
  if (!newDevice) return out(false, null, 'returning');
  return out(true, hashed, 'new');
}

export function parseE3Stored(raw) {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' && !Array.isArray(v) && isArm(v.arm) ? { arm: v.arm } : null;
  } catch { return null; }
}

export function e3UserProps(decision) {
  return decision?.enrolled && decision.reason !== 'forced' && isArm(decision.arm) ? { exp_space: decision.arm } : {};
}

export function spaceLinkOn(decision) {
  return !(decision?.enrolled && decision.arm === 'off');
}

export function e3SessionMark(decision) {
  const arm = e3UserProps(decision).exp_space;
  return arm ? `e3_${arm}` : null;
}
