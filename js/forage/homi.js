import { MUDFLAT } from './logic.js';

export const HOMI_REACH = 1.8;
export const HOMI_MISS_SPARE = MUDFLAT.MISS_LIMIT + 1;
export const HOMI_FEET = 1.15;

export const HOMI_TIERS = Object.freeze([
  { tier: 0, name: '대장간 호미', slots: 0, base: null, coin: 0, ico: 'homi' },
  { tier: 1, name: '길쭉 자루 호미', slots: 1, base: 'reach', coin: 90, ico: 'homi_long', desc: '손 닿는 거리가 늘어나요' },
  { tier: 2, name: '눈 밝은 호미', slots: 2, base: 'eye', coin: 140, ico: 'homi_eye', desc: '낙지 구멍이 반짝여요' },
]);

export const HOMI_ENGRAVES = Object.freeze([
  { id: 'reach', name: '긴 자루', desc: '조금 멀리서도 캘 수 있어요', cost: { mf_clam: 6 }, ico: 'homi_opt_reach' },
  { id: 'eye', name: '눈썰미', desc: '낙지 구멍이 반짝여요', cost: { mf_cockle: 4, mf_razor: 2 }, ico: 'homi_opt_eye' },
  { id: 'spare', name: '헛손질 한 번', desc: '구멍이 한 번 더 버텨요', cost: { mf_crab: 8 }, ico: 'homi_opt_spare' },
  { id: 'feet', name: '가벼운 발', desc: '갯벌에서 조금 더 빨리 걸어요', cost: { mf_clam: 4, mf_crab: 4 }, ico: 'homi_opt_feet' },
]);

const ENGRAVE_IDS = HOMI_ENGRAVES.map(e => e.id);
const MAX_TIER = HOMI_TIERS.length - 1;

export function homiBase(tier) {
  return HOMI_TIERS.slice(1, tier + 1).map(t => t.base);
}

export function homiState(raw) {
  const tier = Math.max(0, Math.min(MAX_TIER, Math.floor(Number(raw?.tier) || 0)));
  const owned = [...new Set((Array.isArray(raw?.owned) ? raw.owned : []).filter(id => ENGRAVE_IDS.includes(id)))];
  const base = homiBase(tier), used = new Set();
  const slots = Array.from({ length: HOMI_TIERS[tier].slots }, (_, i) => {
    const id = Array.isArray(raw?.slots) ? raw.slots[i] : null;
    if (!owned.includes(id) || base.includes(id) || used.has(id)) return null;
    used.add(id);
    return id;
  });
  return { tier, owned, slots };
}

const fail = msg => ({ ok: false, msg });
const covers = (inv, cost) => Object.entries(cost).every(([k, n]) => (inv?.[k] || 0) >= n);

export function buyTier(state, inv, tier) {
  const s = homiState(state), next = HOMI_TIERS[tier];
  if (!next || tier !== s.tier + 1) return fail(tier <= s.tier ? '이미 가진 호미예요' : '앞 단계 호미를 먼저 사야 해요');
  if (!covers(inv, { coins: next.coin })) return fail('코인이 부족해요');
  const base = homiBase(tier);
  const dropped = s.owned.filter(id => base.includes(id));
  const refund = dropped.reduce((acc, id) => {
    Object.entries(HOMI_ENGRAVES.find(e => e.id === id).cost).forEach(([k, n]) => { acc[k] = (acc[k] || 0) + n; });
    return acc;
  }, {});
  const upgraded = homiState({ ...s, tier, owned: s.owned.filter(id => !base.includes(id)) });
  return { ok: true, state: upgraded, spent: { coins: next.coin }, refund, name: next.name };
}

export function buyEngrave(state, inv, id) {
  const s = homiState(state), e = HOMI_ENGRAVES.find(x => x.id === id);
  if (!e) return fail('없는 각인이에요');
  if (s.owned.includes(id)) return fail('이미 가진 각인이에요');
  if (!HOMI_TIERS[s.tier].slots) return fail('각인 칸이 없어요');
  if (homiBase(s.tier).includes(id)) return fail('이 호미에 이미 들어 있는 효과예요');
  if (!covers(inv, e.cost)) return fail('재료가 부족해요');
  return { ok: true, state: homiState({ ...s, owned: [...s.owned, id] }), spent: { ...e.cost }, name: e.name };
}

export function equipEngrave(state, slot, id) {
  const s = homiState(state);
  if (!Number.isInteger(slot) || slot < 0 || slot >= s.slots.length) return fail('각인 칸이 없어요');
  if (id !== null && !s.owned.includes(id)) return fail('아직 없는 각인이에요');
  if (id !== null && homiBase(s.tier).includes(id)) return fail('이 호미에 이미 들어 있는 효과예요');
  const slots = s.slots.map((x, i) => (i === slot ? id : x === id ? null : x));
  return { ok: true, state: homiState({ ...s, slots }) };
}

export function homiEffects(state) {
  const s = homiState(state);
  const on = new Set([...homiBase(s.tier), ...s.slots.filter(Boolean)]);
  return {
    reach: on.has('reach') ? HOMI_REACH : MUDFLAT.REACH,
    eye: on.has('eye'),
    missLimit: on.has('spare') ? HOMI_MISS_SPARE : MUDFLAT.MISS_LIMIT,
    speed: on.has('feet') ? HOMI_FEET : 1,
    tier: s.tier,
    engraves: s.slots.filter(Boolean),
  };
}
