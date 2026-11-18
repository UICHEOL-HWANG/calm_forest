export const E7_ARMS = ['control', 'prefill'];
export const E7_STORE_KEY = 'cf_e7';

const isArm = (a) => E7_ARMS.includes(a);

export function armForE7(clientId) {
  const s = `e7-name:${clientId || ''}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15;
  return E7_ARMS[(h >>> 0) & 1];
}

export function decideE7({ clientId, newDevice = false, stored = null, dev = false, forced = null } = {}) {
  const hashed = armForE7(clientId);
  const out = (enrolled, arm, reason) => ({ hashed, enrolled, arm: enrolled ? arm : null, reason });
  if (dev && isArm(forced)) return out(true, forced, 'forced');
  if (dev) return out(false, null, 'dev');
  if (isArm(stored?.arm)) return out(true, stored.arm, 'device');
  if (!newDevice) return out(false, null, 'returning');
  return out(true, hashed, 'new');
}

export function parseE7Stored(raw) {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' && !Array.isArray(v) && isArm(v.arm) ? { arm: v.arm } : null;
  } catch { return null; }
}

export function e7UserProps(decision) {
  return decision?.enrolled && decision.reason !== 'forced' && isArm(decision.arm) ? { exp_name: decision.arm } : {};
}

export function e7SessionMark(decision) {
  const arm = e7UserProps(decision).exp_name;
  return arm ? `e7_${arm}` : null;
}

export function namePrefillOn(decision) {
  return !!(decision?.enrolled && decision.arm === 'prefill');
}
