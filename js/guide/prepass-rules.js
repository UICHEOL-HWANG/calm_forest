import { BUILD_STAGES } from '../house-cost.js';
import { shortfall, shortParts } from './story-steps.js';
import { BRIDGE_COST } from '../world/bridge.js';
import { farmStageInfo } from '../farm-stage.js';

export const PREPASS_CAPS = Object.freeze({ wood: 10, stone: 6, coal: 1, coins: 40 });
export const CAFE_CAPS = Object.freeze({ crop: 3, forage: 3, fish: 2, egg: 2, flour: 2, juice: 1 });
export const PREPASS_DAILY_CAP = 30;
export const dayCount = (rec, day) => (rec?.d === day ? rec.n || 0 : 0);
export const bumpDay = (rec, day) => ({ d: day, n: dayCount(rec, day) + 1 });
export const REPEAT_SLOTS = Object.freeze(['farm_rush', 'craft_rush', 'daily_double', 'sell_bonus']);
const HOUSE_DONE = 3;
const ARMS = ['ad', 'control'];

export function houseShort(houseStage, inv) {
  const next = BUILD_STAGES.find(s => s.stage === (houseStage || 0) + 1);
  if (!next) return null;
  const list = shortfall(next.cost, inv);
  return list.length ? { slot: `house${next.stage}`, stage: next.stage, list } : null;
}

export function prepassGrant(list, caps = PREPASS_CAPS) {
  const out = {};
  for (const r of list || []) {
    const cap = caps[r.k];
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

export function bridgeShort(inv) {
  const list = shortfall(BRIDGE_COST, inv);
  return list.length ? { slot: 'bridge', ico: '🌉', verb: '다리 고치기', list } : null;
}

export function farmStageShort(stage, inv) {
  const info = farmStageInfo(stage, inv);
  if (info.maxed) return null;
  const list = shortfall(info.next.cost, inv);
  return list.length ? { slot: `farm${info.next.stage}`, ico: '📐', verb: '밭 넓히기', list } : null;
}

export function shortAdParts(give, lang) {
  const parts = ['광고 보고', ' '];
  shortParts(Object.entries(give).map(([k, more]) => ({ k, more }))).forEach((p, i) => {
    if (i) parts.push(' · ');
    parts.push(`${p.ico} ${p.more}`);
    if (lang !== 'en') parts.push('개');
  });
  parts.push(' ', '받기');
  return parts;
}

export function nearestShortSpot(spots, pos, near) {
  let best = null, bd = near;
  for (const sp of spots || []) {
    if (sp.active && !sp.active()) continue;
    const d = Math.hypot(sp.at.x - pos.x, sp.at.z - pos.z);
    if (d >= bd) continue;
    const sh = sp.short();
    if (!sh) continue;
    best = { spot: sp, sh }; bd = d;
  }
  return best;
}
