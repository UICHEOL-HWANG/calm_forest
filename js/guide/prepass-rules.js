import { BUILD_STAGES } from '../house-cost.js';
import { shortfall } from './story-steps.js';

export const PREPASS_CAPS = Object.freeze({ wood: 10, stone: 6, coal: 1, coins: 40 });
export const REPEAT_SLOTS = Object.freeze(['farm_rush', 'craft_rush', 'daily_double', 'sell_bonus']);
const HOUSE_DONE = 3;
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

export function repeatOpen(houseStage) {
  return (houseStage || 0) >= HOUSE_DONE;
}

export function sellBonus(gain) {
  const g = Number(gain);
  if (!(g > 0)) return 0;
  return Math.min(PREPASS_CAPS.coins, Math.max(1, Math.round(g * 0.5)));
}

export function rushSlots(slots, pick, yesterday) {
  return (slots || []).map(sl => (pick(sl) ? { ...sl, day: yesterday, rushed: true } : sl));
}

export function rushTargets(plots) {
  return (plots || []).filter(p => p.state === 'growing' && p.cropType);
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
