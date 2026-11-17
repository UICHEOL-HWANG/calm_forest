import { BUILD_STAGES } from '../house-cost.js';
import { shortfall, shortParts } from './story-steps.js';
import { BRIDGE_COST } from '../world/bridge.js';
import { farmStageInfo } from '../farm-stage.js';
import { pondStageInfo } from '../pond/stage.js';

export const PREPASS_CAPS = Object.freeze({ wood: 10, stone: 6, coal: 1, coins: 40 });
export const CAFE_CAPS = Object.freeze({ crop: 3, forage: 3, fish: 2, egg: 2, flour: 2, juice: 1 });
export const PREPASS_DAILY_CAP = 30;
export const SLOT_CAPS = Object.freeze({
  sell_bonus: 5, farm_rush: 3, craft_rush: 2,
  affinity_heart: 1, concert_play: 1, weekly_ticket: 3,
  orchard_grow: 1, forge_rush: 1,
  quest_reroll: 1, drop_reroll_mine: 1, drop_reroll_firefly: 1,
  restaurant_double: 1, bait_box: 1,
  fountain_short: 2, fountain_double: 2,
});
const WEEKLY_SLOTS = Object.freeze(['weekly_ticket']);
export const AD_PARTS = Object.freeze({
  affinity_heart: ['광고 보고', ' ', '하트 +1'],
  concert_play: ['광고 보고', ' ', '한 번 더'],
  weekly_ticket: ['광고 보고', ' ', '티켓 +1'],
  orchard_grow: ['광고 보고', ' ', '하루 당기기'],
  forge_rush: ['광고 보고', ' ', '바로 완성'],
  quest_reroll: ['광고 보고', ' ', '의뢰 바꾸기'],
  drop_reroll_mine: ['광고 보고', ' ', '한 번 더 뽑기'],
  drop_reroll_firefly: ['광고 보고', ' ', '한 번 더 뽑기'],
  restaurant_double: ['광고 보고', ' ', '코인 2배'],
  bait_box: ['광고 보고', ' ', '🪱 2', ' ', '미끼 받기'],
  fountain_short: ['광고 보고', ' ', '재료 채우기'],
  fountain_double: ['광고 보고', ' ', '한 번 더 받기'],
});
const AD_QUIET_KEYS = Object.freeze(['tutorial', 'coaching', 'spotlight', 'e1', 'cutscene', 'charSelect', 'modalQueue']);
export const adQuiet = (s = {}) => AD_QUIET_KEYS.some(k => !!s[k]);
export const dayCount = (rec, day) => (rec?.d === day ? rec.n || 0 : 0);
const periodOf = (slot, at) => (WEEKLY_SLOTS.includes(slot) ? `w${at.week}` : at.day);
const slotUsed = (rec, slot, at) => { const e = rec?.s?.[slot]; return e && e.p === periodOf(slot, at) ? e.n || 0 : 0; };
export const slotLeft = (rec, slot, at) => (slot in SLOT_CAPS ? Math.max(0, SLOT_CAPS[slot] - slotUsed(rec, slot, at)) : Infinity);
export function bumpDay(rec, day, slot, at = { day }) {
  const base = { d: day, n: dayCount(rec, day) + 1 };
  const s = slot in SLOT_CAPS ? { ...(rec?.s || {}), [slot]: { p: periodOf(slot, at), n: slotUsed(rec, slot, at) + 1 } } : rec?.s;
  return s ? { ...base, s } : base;
}
export const REPEAT_SLOTS = Object.freeze(['farm_rush', 'craft_rush', 'daily_double', 'sell_bonus', 'pond_feed_more', 'table_bite_more']);
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

export function pondStageShort(stage, inv) {
  const info = pondStageInfo(stage, inv, 0);
  if (info.maxed) return null;
  const { coins, ...materials } = info.next.cost;
  const list = shortfall(materials, inv);
  return list.length ? { slot: `pond${info.next.stage}`, ico: '🌊', verb: '연못 넓히기', list } : null;
}

export function shortAdParts(give, lang) {
  const en = lang === 'en';
  const parts = ['광고 보고', en ? ' for ' : ' '];
  shortParts(Object.entries(give).map(([k, more]) => ({ k, more }))).forEach((p, i) => {
    if (i) parts.push(' · ');
    parts.push(`${p.ico} ${p.more}`);
    if (!en) parts.push('개');
  });
  if (!en) parts.push(' ', '받기');
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
