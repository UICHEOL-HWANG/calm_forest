// js/plaza/rules.js
// =============================================================
//  🌾 수확제 광장 — 순수 계산(게임 상태·DOM·네트워크 없음). tests/plaza-rules.test.mjs
// =============================================================
import { PLAZA_TIERS, PLAZA_OPENS_KST, PLAZA_LEAF_COINS, PLAZA, PLAZA_R, PLAZA_PATH } from '../data/plaza.js';

const MAX_VISUAL = 4;   // 0 = 없음, 1~3 = 공사 단계, 4 = 완공
const TIER_IDS = new Set(PLAZA_TIERS.map(t => t.id));

export function tierOf(total) {
  const t = PLAZA_TIERS.find(x => total >= x.min);
  return t ? t.id : null;
}

export function nextTier(total) {
  const up = [...PLAZA_TIERS].reverse().find(x => total < x.min);
  return up ? { id: up.id, left: up.min - total } : null;
}

export function seasonPhase(p, nowMs) {
  if (!p || !p.starts_at || !p.ends_at) return 'before';
  if (nowMs < Date.parse(p.starts_at)) return 'before';
  if (nowMs >= Date.parse(p.ends_at)) return 'after';
  return 'active';
}

export function donateMax(have, todayLeft, itemLeft) {
  return Math.max(0, Math.min(have | 0, todayLeft | 0, itemLeft | 0));
}

export function currentItems(p) {
  if (!p || p.completed) return [];
  return p.items.filter(i => i.stage === p.stage)
    .map(({ item, have, need }) => ({ item, have, need }))
    .sort((a, b) => a.item.localeCompare(b.item));
}

const clampStage = (n) => Math.max(0, Math.min(MAX_VISUAL, Number.isInteger(n) ? n : 0));

export function visualStage(p, cachedStage) {
  if (!p) return clampStage(cachedStage);
  if (p.started === false) return 0;
  if (p.completed) return MAX_VISUAL;
  return clampStage(p.stage);
}

export function leafToCoins(n) {
  return Number.isInteger(n) && n > 0 ? n * PLAZA_LEAF_COINS : 0;
}

export function plazaDefault() {
  return { lastStage: 0, claimed: {}, invited: '', converted: {}, seen: {} };
}

const plainObj = (o) => (o && typeof o === 'object' && !Array.isArray(o) ? o : {});
const onlyTrue = (o) => Object.fromEntries(Object.entries(plainObj(o)).filter(([, v]) => v === true));

export function restorePlaza(saved) {
  if (!saved || typeof saved !== 'object') return plazaDefault();
  return {
    lastStage: clampStage(saved.lastStage),
    claimed: Object.fromEntries(Object.entries(plainObj(saved.claimed)).filter(([, v]) => TIER_IDS.has(v))),
    invited: typeof saved.invited === 'string' ? saved.invited : '',
    converted: onlyTrue(saved.converted),
    seen: onlyTrue(saved.seen),
  };
}

export function siteOpen(nowMs) {
  return nowMs >= Date.parse(`${PLAZA_OPENS_KST}T00:00:00+09:00`);
}

export function plazaBlocks(x, z, pad = 2) {
  if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA_R + pad) return true;
  return PLAZA_PATH.some(([px, pz]) => Math.hypot(x - px, z - pz) < 1.4);
}
