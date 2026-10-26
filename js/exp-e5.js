export const E5_ARMS = ['control', 'guest_first'];
export const E5_STORE_KEY = 'cf_e5';
export const E5_START_MS = Date.parse('2026-10-31T00:00:00+09:00');

export const E5_COPY = {
  guest: '🌱 바로 시작하기',
  sub: '가입 없이 바로 놀 수 있어요',
  note: '이메일로 시작하면 어느 기기에서든 저장이 이어져요.',
};

const isArm = (a) => E5_ARMS.includes(a);

export function armForE5(clientId) {
  const s = `e5:${clientId || ''}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15;
  return E5_ARMS[(h >>> 0) & 1];
}

export function decideE5({ clientId, newDevice = false, stored = null, inApp = false, platform = 'web', now = Date.now(), dev = false, forced = null } = {}) {
  const hashed = armForE5(clientId);
  const out = (enrolled, arm, reason) => ({ hashed, enrolled, arm: enrolled ? arm : null, reason });
  if (dev && isArm(forced)) return out(true, forced, 'forced');
  if (dev) return out(false, null, 'dev');
  if (platform !== 'web') return out(false, null, 'platform');
  if (isArm(stored?.arm)) return out(true, stored.arm, 'device');
  if (!inApp) return out(false, null, 'not_inapp');
  if (now < E5_START_MS) return out(false, null, 'not_started');
  if (!newDevice) return out(false, null, 'returning');
  return out(true, hashed, 'new');
}

export function parseE5Stored(raw) {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' && !Array.isArray(v) && isArm(v.arm) ? { arm: v.arm } : null;
  } catch { return null; }
}

export function e5UserProps(decision) {
  return decision?.enrolled && decision.reason !== 'forced' && isArm(decision.arm) ? { exp_login: decision.arm } : {};
}

export function guestFirst(decision) {
  return !!(decision?.enrolled && decision.arm === 'guest_first');
}
