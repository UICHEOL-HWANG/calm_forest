import { BUILD_STAGES } from '../house-cost.js';
import { shortfall } from './story-steps.js';

export const PREPASS_CAPS = Object.freeze({ wood: 10, stone: 6, coal: 1, coins: 40 });
export const PREPASS_DAILY = 3;
const ARMS = ['ad', 'control'];

export function houseShort(houseStage, inv) {
  const next = BUILD_STAGES.find(s => s.stage === (houseStage || 0) + 1);
  if (!next) return null;
  const list = shortfall(next.cost, inv);
  return list.length ? { slot: `house${next.stage}`, stage: next.stage, list } : null;
}

export function prepassGrant(list) {
  const out = {};
  for (const r of list || []) {
    const cap = PREPASS_CAPS[r.k];
    if (cap && r.more > 0) out[r.k] = Math.min(r.more, cap);
  }
  return out;
}

export function sanitizePrepass(v) {
  if (!v || typeof v !== 'object') return { date: null, n: 0, used: {} };
  const used = {};
  for (const [k, on] of Object.entries(v.used || {})) if (on === true) used[k] = true;
  const n = Math.max(0, Math.min(PREPASS_DAILY, Math.floor(Number(v.n) || 0)));
  return { date: typeof v.date === 'string' ? v.date : null, n, used };
}

export function prepassCan(s, slot, today) {
  if (s.used[slot]) return false;
  return s.date !== today || s.n < PREPASS_DAILY;
}

export function prepassUse(s, slot, today) {
  const n = s.date === today ? s.n + 1 : 1;
  return { date: today, n, used: { ...s.used, [slot]: true } };
}

export function prepassArm(clientId, platform) {
  const key = `prepass-v1:${platform || 'web'}:${clientId || ''}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  return ARMS[(hash >>> 0) & 1];
}
